/**
 * Rota para busca de prestadores que oferecem serviços específicos
 * e têm disponibilidade para atender no período solicitado
 *
 * Inclui suporte a fusos horários e manipulação avançada de datas
 *
 * Versão atualizada com cálculo avançado de slots livres que
 * considera corretamente bloqueios e agendamentos existentes
 */

import { Router } from "express"
import { storage } from "../storage"
import { z } from "zod"
import {
	timeToMinutes,
	minutesToTime,
	getDayOfWeek,
	doTimeSlotsOverlap,
	convertToProviderTimezone,
} from "../utils/date-time-utils"

/**
 * Encontra intervalos livres considerando slots ocupados
 * @param availStart Início da disponibilidade em minutos
 * @param availEnd Fim da disponibilidade em minutos
 * @param busySlots Array de slots ocupados {start, end} em minutos
 * @returns Array de slots livres {start, end} em minutos
 */
function getFreeSlots(
	availStart: number,
	availEnd: number,
	busySlots: { start: number; end: number }[]
): { start: number; end: number }[] {
	// Ordena slots ocupados por horário de início
	const sortedBusySlots = [...busySlots].sort((a, b) => a.start - b.start)

	const freeSlots = []
	let current = availStart

	// Percorre slots ocupados e encontra espaços entre eles
	for (const busy of sortedBusySlots) {
		if (busy.start > current) {
			freeSlots.push({
				start: current,
				end: Math.min(busy.start, availEnd),
			})
		}
		current = Math.max(current, busy.end)
	}

	// Adiciona último slot livre se houver tempo após o último ocupado
	if (current < availEnd) {
		freeSlots.push({ start: current, end: availEnd })
	}

	return freeSlots
}

const router = Router()

// Esquema de validação com Zod
const searchSchema = z.object({
	serviceIds: z
		.string()
		.min(1, "ID do serviço é obrigatório")
		.transform((val) =>
			val.split(",").map((id) => {
				const num = parseInt(id.trim())
				if (isNaN(num)) throw new Error("IDs de serviço inválidos")
				return num
			})
		),
	date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar no formato YYYY-MM-DD")
		.optional(),
	categoryId: z
		.string()
		.optional()
		.transform((val) => {
			if (!val) return undefined
			const num = parseInt(val)
			if (isNaN(num)) throw new Error("ID de categoria inválido")
			return num
		}),
	nicheId: z
		.string()
		.optional()
		.transform((val) => {
			if (!val) return undefined
			const num = parseInt(val)
			if (isNaN(num)) throw new Error("ID de nicho inválido")
			return num
		}),
	minRating: z
		.string()
		.optional()
		.transform((val) => {
			if (!val) return 0
			const num = parseFloat(val)
			if (isNaN(num) || num < 0 || num > 5)
				throw new Error("Avaliação deve ser entre 0 e 5")
			return num
		})
		.default("0"),
	timezone: z.string().optional().default("America/Sao_Paulo"),
})

/**
 * Rota para buscar prestadores que oferecem serviços específicos
 * GET /api/providers/service-search?serviceIds=1,2,3&date=2023-04-01&categoryId=5&nicheId=3
 */
router.get("/", async (req, res) => {
	try {
		// Verificar parâmetros básicos antes da validação completa
		if (!req.query.serviceIds || req.query.serviceIds === "") {
			return res
				.status(400)
				.json({ error: "ID do serviço é obrigatório" })
		}

		try {
			// Validar parâmetros de entrada com Zod
			const parsedQuery = await searchSchema.parseAsync(req.query)
			const {
				serviceIds,
				date,
				categoryId,
				nicheId,
				minRating,
				timezone,
			} = parsedQuery

			console.log(
				`Buscando prestadores para serviços: ${serviceIds.join(",")}`
			)

			// 1. Buscar informações dos serviços (duração, etc)
			const servicesInfo = await getServicesInfo(serviceIds)
			const totalDuration = servicesInfo.reduce(
				(sum, service) => sum + service.duration,
				0
			)

			console.log(
				`Duração total dos serviços: ${totalDuration} minutos (${Math.round(
					totalDuration / 60
				)} horas)`
			)

			// Verificar se a duração total é razoável para um único dia
			const MAX_DURATION_PER_DAY = 600 // 10 horas é o máximo razoável para um dia
			console.log(
				`Verificando se duração total (${totalDuration}) excede limite diário (${MAX_DURATION_PER_DAY})`
			)
			if (totalDuration > MAX_DURATION_PER_DAY && date) {
				console.log(
					`ALERTA: Duração total excede limite diário permitido (${MAX_DURATION_PER_DAY} minutos)`
				)
				return res.status(400).json({
					error: "Duração total dos serviços excede o limite diário",
					details: `A duração total dos serviços selecionados é de ${totalDuration} minutos (${Math.round(
						totalDuration / 60
					)} horas), que excede o limite máximo diário de ${MAX_DURATION_PER_DAY} minutos (${
						MAX_DURATION_PER_DAY / 60
					} horas).`,
					serviceDetails: servicesInfo.map((s) => ({
						id: s.id,
						name: s.name,
						duration: s.duration,
						durationFormatted: `${Math.floor(s.duration / 60)}h${
							s.duration % 60 > 0 ? ` ${s.duration % 60}min` : ""
						}`,
					})),
					totalDuration,
					maxDurationPerDay: MAX_DURATION_PER_DAY,
				})
			}

			// 2. Buscar todos os prestadores ativos
			const allUsers = await storage.getUsers()
			const activeProviders = allUsers.filter(
				(p) => p?.userType === "provider" && p.isActive !== false
			)
			console.log(
				`Total de prestadores ativos: ${activeProviders.length}`
			)

			// 3. Filtrar por categoria/nicho se fornecidos
			let filteredProviders = [...activeProviders]
			if (categoryId || nicheId) {
				filteredProviders = await filterProvidersByCategoryOrNiche(
					filteredProviders,
					categoryId,
					nicheId
				)
				console.log(
					`Prestadores filtrados por categoria/nicho: ${filteredProviders.length}`
				)
			}

			// 4. Filtrar prestadores que oferecem todos os serviços solicitados
			const providersWithServices = await filterProvidersByServices(
				filteredProviders,
				serviceIds,
				servicesInfo,
				minRating
			)
			console.log(
				`Prestadores que oferecem todos os serviços: ${providersWithServices.length}`
			)

			// 5. Verificar disponibilidade na data selecionada
			let providersWithAvailability = [...providersWithServices]
			if (date) {
				// Obter dia da semana com base no fuso horário correto
				const dayOfWeek = getDayOfWeek(date, timezone)
				console.log(
					`Dia da semana para data ${date} no fuso ${timezone}: ${dayOfWeek}`
				)

				providersWithAvailability = await checkProvidersAvailability(
					providersWithServices,
					date,
					dayOfWeek,
					totalDuration,
					timezone
				)
				console.log(
					`Prestadores com disponibilidade na data ${date}: ${providersWithAvailability.length}`
				)
			}

			// Ordenar por avaliação
			const sortedProviders = providersWithAvailability.sort(
				(a, b) => (b.settings?.rating || 0) - (a.settings?.rating || 0)
			)

			// Formatar resposta de acordo com o esperado pelo front-end
			const formattedProviders = sortedProviders.map((provider) => ({
				provider: {
					id: provider.id,
					name: provider.name,
					email: provider.email,
					profileImage: provider.profileImage,
					userType: provider.userType,
					phone: provider.phone,
					address: provider.address,
					isActive: provider.isActive,
					isVerified: provider.isVerified,
					createdAt: provider.createdAt,
				},
				services: provider.serviceDurations,
				totalDuration: provider.totalServiceDuration,
				rating: provider.settings?.rating || 0,
				// Se for necessário incluir horários disponíveis (isso seria uma consulta adicional)
				// availableSlots: []
			}))

			res.json({
				providers: formattedProviders,
				totalResults: formattedProviders.length,
				filters: {
					serviceIds,
					date: date || null,
					categoryId: categoryId || null,
					nicheId: nicheId || null,
					minRating,
					totalDuration,
				},
			})
		} catch (error) {
			console.error("Erro na validação dos parâmetros:", error)
			return res.status(400).json({
				error: "Erro na validação dos parâmetros",
				details: error instanceof Error ? error.message : String(error),
			})
		}
	} catch (error) {
		console.error("Erro na pesquisa de prestadores por serviço:", error)
		res.status(500).json({
			error: "Erro ao buscar prestadores",
			details: error instanceof Error ? error.message : String(error),
		})
	}
})

// Funções auxiliares

/**
 * Busca informações detalhadas sobre os serviços solicitados
 */
async function getServicesInfo(
	serviceIds: number[]
): Promise<Array<{ id: number; duration: number; name: string }>> {
	const servicesInfo = await Promise.all(
		serviceIds.map(async (id) => {
			try {
				// Verificar template primeiro
				const serviceTemplate = await storage.getServiceTemplate(id)
				if (serviceTemplate) {
					return {
						id,
						duration: serviceTemplate.duration || 60,
						name: serviceTemplate.name || `Serviço ${id}`,
					}
				}

				// Verificar serviço legado
				const service = await storage.getService(id)
				if (service) {
					return {
						id,
						duration: service.duration || 60,
						name: service.name || `Serviço ${id}`,
					}
				}

				// Se não encontrar, usar valores padrão
				console.warn(
					`Serviço ${id} não encontrado, usando valores padrão`
				)
				return { id, duration: 60, name: `Serviço ${id}` }
			} catch (error) {
				console.error(
					`Erro ao buscar informações do serviço ${id}:`,
					error
				)
				return { id, duration: 60, name: `Serviço ${id}` }
			}
		})
	)
	return servicesInfo
}

/**
 * Filtra prestadores por categoria ou nicho
 */
async function filterProvidersByCategoryOrNiche(
	providers: any[],
	categoryId?: number,
	nicheId?: number
): Promise<any[]> {
	if (!categoryId && !nicheId) return providers

	// Se tiver nicheId, buscar todas as categorias deste nicho
	let categoryIds: number[] = []
	if (nicheId) {
		const categoriesInNiche = await storage.getCategoriesByNicheId(nicheId)
		categoryIds = categoriesInNiche.map((cat) => cat.id)
	} else if (categoryId) {
		categoryIds = [categoryId]
	}

	const results = await Promise.all(
		providers.map(async (provider) => {
			try {
				// Buscar serviços do prestador
				const providerServices =
					await storage.getProviderServicesByProviderId(provider.id)

				for (const ps of providerServices) {
					// Verificar service template
					const serviceTemplate = await storage.getServiceTemplate(
						ps.serviceId
					)
					if (
						serviceTemplate &&
						categoryIds.includes(serviceTemplate.categoryId)
					) {
						return provider
					}

					// Verificar serviço legado
					const service = await storage.getService(ps.serviceId)
					if (service && categoryIds.includes(service.categoryId)) {
						return provider
					}
				}
				return null
			} catch (error) {
				console.error(
					`Erro ao filtrar prestador ${provider.id} por categoria/nicho:`,
					error
				)
				return null
			}
		})
	)

	return results.filter((p) => p !== null)
}

/**
 * Filtra prestadores que oferecem todos os serviços solicitados
 */
async function filterProvidersByServices(
	providers: any[],
	serviceIds: number[],
	servicesInfo: Array<{ id: number; duration: number; name: string }>,
	minRating: number
): Promise<any[]> {
	const results: Array<any> = []
	for (const provider of providers) {
		try {
			if (provider.id === 2) {
				console.log("AQUI")
			}
			// Buscar todos os serviços do prestador
			const allServices = await storage.getProviderServicesByProviderId(
				provider.id
			)

			// Extrair IDs de serviços oferecidos
			const offeredServiceIds = new Set(
				allServices.map((s) => s.serviceId)
			)

			// Verificar se todos os serviços solicitados são oferecidos
			const missingServices = serviceIds.filter(
				(id) => !offeredServiceIds.has(id)
			)
			if (missingServices.length > 0) {
				console.log(
					`Prestador ${
						provider.id
					} não oferece todos os serviços solicitados. Faltando: ${missingServices.join(
						","
					)}`
				)
				continue
			}

			// Calcular duração total para este prestador
			let totalDuration = 0
			const durations = []

			for (const serviceId of serviceIds) {
				const service = allServices.find(
					(s) => s.serviceId === serviceId
				)
				if (service) {
					const duration = service.duration || 30
					totalDuration += duration

					// Encontrar nome do serviço nas informações gerais
					const serviceInfo = servicesInfo.find(
						(s) => s.id === serviceId
					)
					const serviceName =
						service.name ||
						serviceInfo?.name ||
						`Serviço ${serviceId}`

					durations.push({
						id: serviceId,
						duration,
						name: serviceName,
					})
				}
			}

			// Verificar avaliação mínima
			const settings = await storage.getProviderSettings(provider.id)
			if (
				minRating > 0 &&
				(!settings?.rating || settings.rating < minRating)
			) {
				continue
			}

			results.push({
				...provider,
				totalServiceDuration: totalDuration,
				serviceDurations: durations,
				settings,
			})
		} catch (error) {
			console.error(`Erro ao processar prestador ${provider.id}:`, error)
			continue
		}
	}

	return results
}

/**
 * Verifica disponibilidade dos prestadores para a data e duração especificadas,
 * levando em consideração o fuso horário.
 */
async function checkProvidersAvailability(
	providers: any[],
	date: string,
	dayOfWeek: number,
	totalDuration: number,
	timezone: string = "America/Sao_Paulo"
): Promise<any[]> {
	const results = await Promise.all(
		providers.map(async (provider) => {
			try {
				// Obter timezone do prestador (se tiver) ou usar o padrão
				const providerTimezone = provider.timezone || timezone
				console.log(
					`Verificando disponibilidade do prestador ${provider.id} usando timezone: ${providerTimezone}`
				)

				// 1. Verificar disponibilidade específica para esta data (substitui a programação regular)
				let dateSpecificAvailability =
					await storage.getAvailabilityByDate(provider.id, date)

				// 2. Se não houver disponibilidade específica para esta data, usar a disponibilidade regular do dia da semana
				let dayAvailability
				if (
					dateSpecificAvailability &&
					dateSpecificAvailability.length > 0
				) {
					console.log(
						`Usando disponibilidade específica para data ${date} do prestador ${provider.id}`
					)
					dayAvailability = dateSpecificAvailability
				} else {
					dayAvailability = await storage.getAvailabilityByDay(
						provider.id,
						dayOfWeek
					)
					// Garantir que sempre temos um array
					if (!Array.isArray(dayAvailability)) {
						dayAvailability = dayAvailability
							? [dayAvailability]
							: []
					}
				}

				// Verificar existência de pelo menos um período disponível
				if (dayAvailability.length === 0) {
					console.log(
						`Prestador ${provider.id} não tem disponibilidade para o dia ${dayOfWeek}`
					)
					return null
				}

				// Buscar agendamentos e bloqueios
				console.log(
					`Buscando agendamentos e bloqueios para o prestador ${provider.id} na data ${date}`
				)

				// 1. Buscar agendamentos para a data específica
				let existingAppointments: any = []
				try {
					const appointments = await storage.getAppointmentsByProviderId(provider.id)

					// Filtrar agendamentos para a data especificada e não cancelados
					existingAppointments = Array.isArray(appointments)
						? appointments.filter((app) => {
								try {
									if (!app || !app.date) return false

									let appDate = ""
									try {
										appDate = convertToProviderTimezone(
											app.date,
											providerTimezone
										).toISODate()
									} catch (dateError) {
										console.error(
											`Erro ao converter data do agendamento: ${dateError.message}`
										)
										// Tentar usar a data diretamente em caso de erro
										appDate = app.date
									}

									const isMatchingDate = appDate === date
									const isActiveAppointment =
										app.status !== "canceled" &&
										app.status !== "no_show"

									if (isMatchingDate) {
										console.log(
											`Agendamento ${
												app.id
											} do prestador ${
												provider.id
											} para a data ${date}: status=${
												app.status
											}, horário=${
												app.startTime || app.start_time
											}-${app.endTime || app.end_time}`
										)
									}

									return isMatchingDate && isActiveAppointment
								} catch (error) {
									console.error(
										`Erro ao processar agendamento:`,
										error
									)
									return false
								}
						  })
						: []

					console.log(
						`Encontrados ${existingAppointments.length} agendamentos para o prestador ${provider.id} na data ${date}`
					)
				} catch (error) {
					console.error(
						`Erro ao buscar agendamentos do prestador ${provider.id}:`,
						error
					)
					existingAppointments = [] // Em caso de erro, assume que não há agendamentos
				}

				// 2. Buscar bloqueios de horário para a data específica
				let blockedSlots: any = []
				try {
					const result = await storage.getBlockedTimeSlotsByDate(
						provider.id,
						date
					)
					blockedSlots = Array.isArray(result) ? result : []
					console.log(
						`Encontrados ${blockedSlots.length} bloqueios para o prestador ${provider.id} na data ${date}`
					)
				} catch (error) {
					console.error(
						`Erro ao buscar bloqueios do prestador ${provider.id}:`,
						error
					)
					blockedSlots = [] // Em caso de erro, assume que não há bloqueios
				}

				// 3. Converter agendamentos para blocos de tempo ocupados
				const appointmentBlocks = existingAppointments
					.map((app) => {
						try {
							const startTime =
								app.startTime || app.start_time || ""
							const endTime = app.endTime || app.end_time || ""

							if (!startTime || !endTime) {
								console.warn(
									`Agendamento ${app.id} com horários inválidos: start=${startTime}, end=${endTime}`
								)
								return null
							}

							return {
								start: timeToMinutes(startTime),
								end: timeToMinutes(endTime),
							}
						} catch (error) {
							console.error(
								"Erro ao converter horários do agendamento:",
								error
							)
							return null
						}
					})
					.filter((block) => block !== null)

				// 4. Converter bloqueios para blocos de tempo ocupados
				const blockSlotBlocks = Array.isArray(blockedSlots)
					? blockedSlots
							.filter(
								(slot) =>
									slot &&
									(slot.startTime || slot.start_time) &&
									(typeof slot.startTime === "string" ||
										typeof slot.start_time === "string") &&
									(slot.endTime || slot.end_time) &&
									(typeof slot.endTime === "string" ||
										typeof slot.end_time === "string")
							)
							.map((slot) => {
								try {
									const startTime =
										slot.startTime || slot.start_time || ""
									const endTime =
										slot.endTime || slot.end_time || ""

									if (!startTime || !endTime) {
										console.warn(
											`Slot bloqueado com horários inválidos: start=${startTime}, end=${endTime}`
										)
										return null
									}

									return {
										start: timeToMinutes(startTime),
										end: timeToMinutes(endTime),
									}
								} catch (error) {
									console.error(
										"Erro ao converter horários do slot bloqueado:",
										error
									)
									return null
								}
							})
							.filter((block) => block !== null)
					: []

				// 5. Unificar blocos ocupados de agendamentos e bloqueios
				const occupiedBlocks = [
					...appointmentBlocks,
					...blockSlotBlocks,
				]

				// 6. Verificar disponibilidade para cada período do dia
				let hasAnyAvailableSlot = false

				for (const avail of dayAvailability) {
					if (!avail?.startTime || !avail?.endTime) continue

					const availStart = timeToMinutes(avail.startTime)
					const availEnd = timeToMinutes(avail.endTime)

					// Verificar se o período total é longo o suficiente
					if (availEnd - availStart < totalDuration) {
						console.log(
							`Período ${avail.startTime}-${avail.endTime} muito curto para duração de ${totalDuration} minutos`
						)
						continue // Período muito curto
					}

					// Obter slots livres usando o algoritmo avançado
					const freeSlots = getFreeSlots(
						availStart,
						availEnd,
						occupiedBlocks
					)

					console.log(
						`Prestador ${provider.id}: Analisando ${freeSlots.length} slots livres para data ${date}`
					)
					for (const slot of freeSlots) {
						console.log(
							`  Slot livre: ${minutesToTime(
								slot.start
							)}-${minutesToTime(slot.end)} (duração: ${
								slot.end - slot.start
							} minutos)`
						)
					}

					// Verificar se algum dos slots livres tem duração suficiente
					const hasLongEnoughSlot = freeSlots.some((slot) => {
						const isLongEnough =
							slot.end - slot.start >= totalDuration
						if (isLongEnough) {
							console.log(
								`Prestador ${
									provider.id
								}: Encontrado slot adequado de ${minutesToTime(
									slot.start
								)}-${minutesToTime(
									slot.end
								)} para duração ${totalDuration} minutos`
							)
						}
						return isLongEnough
					})

					if (hasLongEnoughSlot) {
						hasAnyAvailableSlot = true
						break
					}
				}

				if (hasAnyAvailableSlot) {
					console.log(
						`Prestador ${provider.id} TEM disponibilidade para a data ${date} e duração ${totalDuration} minutos`
					)
					return provider
				}

				// Se não encontrou slots livres
				console.log(
					`Prestador ${provider.id} não tem slots disponíveis para a duração ${totalDuration} na data ${date}`
				)
				return null
			} catch (error) {
				console.error(
					`Erro ao verificar disponibilidade do prestador ${provider.id}:`,
					error
				)
				return null
			}
		})
	)

	return results.filter((p) => p !== null)
}

export default router
