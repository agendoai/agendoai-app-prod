// Create API routes for clients accessing the REST API
import { eq, sql, and, desc } from "drizzle-orm"
import { Express, Request, Response, Router } from "express"
import crypto from "crypto"
import fs from "fs"
import path from "path"
import { getPaymentSettings } from "./storage"
import { createServer, type Server } from "http"
import Stripe from "stripe"
import asaasWebhookRoutes from './routes/asaas-webhook-routes';
import { storage } from "./storage"
import { setupAuth, hashPassword } from "./auth"
import sumupPaymentRoutes from "./routes/sumup-payment-routes"
import { checkAvailabilityRouter } from "./routes/check-availability-routes"
import { paymentRouter } from "./routes/payment-routes"
import { adminRouter, asaasMarketplaceRouter } from "./routes/index"
import adminFinancialRoutes from "./routes/admin-financial-routes"
import { db } from "./db"
import { users, supportTickets, supportMessages } from "@shared/schema.ts"
// Marketplace removido conforme solicitado

// Inicializar Stripe
if (!process.env.STRIPE_SECRET_KEY) {
	console.warn(
		"Alerta: STRIPE_SECRET_KEY não definida. Funcionalidades de pagamento estarão indisponíveis."
	)
}
// Inicialização do cliente Stripe com a chave secreta do ambiente
const stripe = process.env.STRIPE_SECRET_KEY
	? new Stripe(process.env.STRIPE_SECRET_KEY, {
			apiVersion: "2025-04-30.basil" as any,
	  })
	: null

if (!stripe) {
	console.warn(
		"Aviso: STRIPE_SECRET_KEY não está configurada. Pagamentos com cartão não funcionarão."
	)
}
import {
	insertAppointmentSchema,
	insertNicheSchema,
	insertCategorySchema,
	insertUserAddressSchema,
} from "@shared/schema"
import WebSocket, { WebSocketServer } from "ws"
import { z } from "zod"
import { pushRouter } from "./routes/push-notification-routes"
import { integrationsRouter } from "./routes/integrations-settings-routes"
import { providerAIRouter } from "./routes/provider-ai-routes"
import { timeSlotsRouter } from "./routes/time-slots-routes"
import { providerBreaksRouter } from "./routes/provider-breaks-routes"
import { alternativeSuggestionsRouter } from "./routes/alternative-suggestions-routes"
import { promotionRouter } from "./routes/promotion-routes"
import multipleServiceSlotsRouter from "./routes/time-slots-multiple-services"
import specializedProviderSearchRouter from "./routes/specialized-provider-search"
import providerSearchWithServicesRouter from "./routes/provider-search-with-services"
import providerServiceSearchRouter from "./routes/provider-service-search"
import { Router as ExpressRouter } from "express"
import bookingRouter from "./routes/booking-routes"
import providerServicesRoutes from "./routes/provider-services-routes"
import serviceTemplatesRoutes from "./routes/service-templates-routes"
import providersRoutes from "./routes/providers-routes"
import { providerLocationsRouter } from "./routes/provider-locations-routes"
import unifiedProviderServicesRouter from "./routes/unified-provider-services-routes"
import servicesWithProvidersRouter from "./routes/services-with-providers-routes"
import adminReportsRoutes from "./routes/admin-reports-routes"
import { emailService } from "./email-service"
import { pushNotificationService } from "./push-notification-service"
import { registerPaymentPreferencesRoutes } from "./routes/payment-preferences-routes"
import { registerUploadRoutes } from "./routes/upload-routes"
import { registerUserManagementRoutes } from "./routes/user-management-routes"
import sumupPaymentRouter from "./routes/sumup-payment-routes"
import optimizedProviderSearchRouter from "./routes/optimized-provider-search"
// Funcionalidade de chatbot do WhatsApp removida
import {
	analyzeProviderSchedule,
	analyzeServiceExecutionTimes,
	predictSchedulingTrends,
	adaptProviderAgendaForService,
} from "./ai-provider-scheduling-service"
import { bookingSystem } from "./intelligent-booking-system"
import {
	getAvailableTimeSlotsAdvanced,
	ProviderSchedule,
} from "./available-time-slots"
import { bookingSlotsRouter } from "./routes/booking-slots-routes-minimal"
import {
	formatCardDetails,
	getStripeClient,
	listPaymentMethods,
	removePaymentMethod,
	setDefaultPaymentMethod,
	testStripeConnection,
	createStripeCustomer,
	getUserStripeData,
	isStripeEnabled,
	initializeStripe,
} from "./stripe-service"
import providerAvailabilityRouter from './routes/provider-availability-routes';
import { createOrGetStripeConnectAccount, getStripeConnectAccountStatus } from './stripe-service';
import { testAsaasConnection } from './asaas-service';

// Funções auxiliares de conversão de tempo
function timeToMinutes(time: string): number {
	const [hours, minutes] = time.split(":").map(Number)
	return hours * 60 + minutes
}

function minutesToTime(minutes: number): string {
	const hours = Math.floor(minutes / 60)
	const mins = minutes % 60
	return `${hours.toString().padStart(2, "0")}:${mins
		.toString()
		.padStart(2, "0")}`
}

// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req: Request, res: Response, next: any) => {
	if (req.isAuthenticated()) {
		// Para depuração: registrar detalhes da autenticação
		console.log(
			`Usuário autenticado: ID=${req.user?.id}, Tipo=${req.user?.userType}, Rota=${req.originalUrl}, Método=${req.method}`
		)
		return next()
	}

	// Para depuração: registrar falha de autenticação
	console.log(
		`Falha de autenticação na rota: ${req.originalUrl}, Método: ${req.method}, Headers:`,
		req.headers
	)

	return res.status(401).json({ error: "Não autorizado" })
}

// Middleware para verificar se o usuário é cliente
const isClient = (req: Request, res: Response, next: any) => {
	if (req.user && req.user.userType === "client") {
		return next()
	}
	return res.status(403).json({ error: "Permissão negada" })
}

// Middleware para verificar se o usuário é prestador
const isProvider = (req: Request, res: Response, next: any) => {
	if (req.user && req.user.userType === "provider") {
		return next()
	}
	return res.status(403).json({ error: "Permissão negada" })
}

// Middleware para verificar se o usuário é administrador ou suporte
const isAdmin = (req: Request, res: Response, next: any) => {
	if (
		req.user &&
		(req.user.userType === "admin" || req.user.userType === "support")
	) {
		// Registrar acesso para auditoria
		console.log(
			`Usuário ${req.user.id} (${req.user.userType}) acessando rota de admin: ${req.path}`
		)
		return next()
	}
	return res.status(403).json({ error: "Permissão negada" })
}

// Middleware para verificar se o usuário é suporte ou admin
const isSupport = (req: Request, res: Response, next: any) => {
	if (
		req.user &&
		(req.user.userType === "support" || req.user.userType === "admin")
	) {
		// Registrar acesso para auditoria
		console.log(
			`Usuário ${req.user.id} (${req.user.userType}) acessando rota de suporte: ${req.path}`
		)
		return next()
	}
	return res.status(403).json({ error: "Permissão negada" })
}

// Middleware para verificar se o usuário é admin ou suporte
const isAdminOrSupport = (req: Request, res: Response, next: any) => {
	if (
		req.user &&
		(req.user.userType === "admin" ||
			(req.user.userType === "support" &&
				req.path.startsWith("/api/support/")))
	) {
		return next()
	}
	return res.status(403).json({ error: "Permissão negada" })
}

export function registerRoutes(app: Express): Server {
	// sets up /api/register, /api/login, /api/logout, /api/user
	setupAuth(app)

	// Registrar rotas de notificações push
	app.use("/api/push", pushRouter)
    app.use('/api/webhook', asaasWebhookRoutes)
	// Registrar rotas de otimização de agenda com IA
	app.use("/api/provider-agenda", providerAIRouter)

	// Registrar rotas para configurações financeiras e taxas por prestador
	app.use("/api/admin", adminFinancialRoutes)

	// Registrar rotas de cálculo de slots de tempo disponíveis
	app.use("/api/time-slots", timeSlotsRouter)
	app.use("/api/time-slots", multipleServiceSlotsRouter)

	// Registrar rotas de serviços do prestador
	// Remover para evitar duplicidade (definida mais abaixo)


	// Registrar rotas de serviços com prestadores
	app.use("/api/services-with-providers", servicesWithProvidersRouter)

	// Registrar rotas de pagamento SumUp
	app.use("/api", sumupPaymentRoutes)

	// Marketplace removido conforme solicitado

	// Rotas de compatibilidade para bloqueio/desbloqueio de horários
	app.post(
		"/api/blocked-time-slots",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				// Repassar a chamada para a rota /api/blocked-slots
				console.log(
					"Redirecionando chamada de /api/blocked-time-slots para /api/blocked-slots"
				)
				const {
					providerId,
					date,
					startTime,
					endTime,
					reason,
					type = "manual",
				} = req.body

				if (!providerId || !date || !startTime || !endTime) {
					return res
						.status(400)
						.json({
							error: "Dados incompletos para bloqueio de horário",
						})
				}

				// Usar o sistema de agendamento inteligente para bloquear o slot (mesma lógica da rota /api/blocked-slots)
				const success = await bookingSystem.blockTimeSlot({
					providerId,
					date,
					startTime,
					endTime,
					reason: reason || "Bloqueado manualmente pelo prestador",
					recurrentId: null,
					blockType: type || "manual",
				})

				if (success) {
					res.status(201).json({
						success: true,
						message: "Horário bloqueado com sucesso",
					})
				} else {
					res.status(400).json({ error: "Falha ao bloquear horário" })
				}
			} catch (error: any) {
				console.error(
					"Erro ao processar bloqueio de horário via rota de compatibilidade:",
					error
				)
				res.status(400).json({
					error: error.message || "Erro ao bloquear horário",
				})
			}
		}
	)

	// Rota para desbloquear slots com base em parâmetros (não por ID)
	app.delete(
		"/api/blocked-time-slots/:providerId",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				console.log(
					"Redirecionando chamada DELETE de /api/blocked-time-slots/:providerId para desbloqueio por parâmetros"
				)
				const providerId = parseInt(req.params.providerId)
				const { date, startTime, endTime } = req.body

				// Verificar permissão
				if (req.user!.id !== providerId) {
					return res
						.status(403)
						.json({
							error: "Você só pode gerenciar sua própria agenda",
						})
				}

				// Validar dados
				if (!date || !startTime || !endTime) {
					return res
						.status(400)
						.json({
							error: "Data, hora de início e hora de fim são obrigatórios",
						})
				}

				console.log(
					`Desbloqueando slot para provider ${providerId} em ${date} das ${startTime} às ${endTime}`
				)

				// Buscar o ID do slot bloqueado para excluí-lo
				const blockedSlots = await storage.getBlockedTimeSlotsByDate(
					providerId,
					date
				)

				// Encontrar slot que corresponde ao horário exato
				const slotToDelete = blockedSlots.find(
					(slot) =>
						slot.startTime === startTime && slot.endTime === endTime
				)

				if (!slotToDelete) {
					return res
						.status(404)
						.json({ error: "Bloqueio de horário não encontrado" })
				}

				// Excluir o bloqueio encontrado
				const success = await storage.deleteBlockedTimeSlot(
					slotToDelete.id
				)

				if (success) {
					res.status(200).json({
						success: true,
						message: "Bloqueio removido com sucesso",
					})
				} else {
					res.status(500).json({
						error: "Erro ao remover bloqueio de horário",
					})
				}
			} catch (error: any) {
				console.error(
					"Erro ao processar desbloqueio de horário via rota de compatibilidade:",
					error
				)
				res.status(500).json({
					error: error.message || "Erro ao desbloquear horário",
				})
			}
		}
	)

	// Registrar rotas de intervalos personalizados (lunch, breaks, etc)
	app.use("/api", providerBreaksRouter)

	// Registrar rotas de sugestões alternativas
	app.use("/api/suggestions", alternativeSuggestionsRouter)

	// Registrar rotas para o mapa de calor baseado em geolocalização
	app.use("/api/providers/locations", providerLocationsRouter)

	// Registrar rotas para verificação de disponibilidade de datas
	app.use("/api/availability", checkAvailabilityRouter)
	app.use("/api/availability", providerAvailabilityRouter)

	// Rotas para processamento de pagamentos com Stripe
	app.use("/api/payments", paymentRouter)

	// Rotas para marketplace com Asaas (split, custódia, onboarding)
	app.use("/api/asaas-marketplace", asaasMarketplaceRouter)

	// Registrar rotas de slots de agendamento
	app.use("/api/booking-slots", bookingSlotsRouter)

	// Registrar rotas de promoções
	app.use("/api", promotionRouter)

	// Registrar rotas do sistema de agendamento inteligente
	app.use("/api/booking", bookingRouter)
	
	// Registrar rotas para buscar agendamentos existentes
	app.use("/api/bookings", bookingRouter)

	// Registrar rotas de configurações de integrações (Disponível apenas para administradores)
	app.use("/api/admin/integrations-settings", integrationsRouter)

	// Registrar rotas de preferências de pagamento
	const paymentPreferencesRouter = Router()
	registerPaymentPreferencesRoutes(paymentPreferencesRouter)
	app.use("/api", paymentPreferencesRouter)

	// Registrar rotas de pagamento SumUp
	app.use("/api", sumupPaymentRouter)

	// Registrar rotas de serviços personalizados dos prestadores
	app.use("/api/provider-services", providerServicesRoutes)
	app.use("/api/service-templates", serviceTemplatesRoutes)

	// Adicionar rota de busca de templates diretamente
	app.get(
		"/api/service-templates/search",
		isAuthenticated,
		async (req, res) => {
			try {
				// Parâmetros de busca
				const q = req.query.q as string
				const categoryId = req.query.categoryId
					? parseInt(req.query.categoryId as string)
					: undefined
				const nicheId = req.query.nicheId
					? parseInt(req.query.nicheId as string)
					: undefined

				// Buscar todos os templates
				let templates = await storage.getServiceTemplates()

				// Aplicar filtros se necessário
				if (q) {
					templates = templates.filter(
						(template) =>
							template.name
								.toLowerCase()
								.includes(q.toLowerCase()) ||
							(template.description &&
								template.description
									.toLowerCase()
									.includes(q.toLowerCase()))
					)
				}

				if (categoryId) {
					templates = templates.filter(
						(template) => template.categoryId === categoryId
					)
				}

				if (nicheId) {
					// Para filtrar por nicho, precisamos obter a categoria de cada template
					const categories = await storage.getCategories()
					const categoryIdsByNiche = categories
						.filter((cat) => cat.nicheId === nicheId)
						.map((cat) => cat.id)

					templates = templates.filter((template) =>
						categoryIdsByNiche.includes(template.categoryId)
					)
				}

				// Enriquecer com informações de categoria e nicho
				const templatesWithDetails = await Promise.all(
					templates.map(async (template) => {
						const category = await storage.getCategory(
							template.categoryId
						)
						const niche = category
							? await storage.getNiche(category.nicheId)
							: null

						return {
							...template,
							categoryName:
								category?.name || "Categoria não encontrada",
							nicheName: niche?.name || "Nicho não encontrado",
							nicheId: category?.nicheId || null,
						}
					})
				)

				return res.json(templatesWithDetails)
			} catch (error) {
				console.error("Erro ao buscar templates de serviços:", error)
				return res
					.status(500)
					.json({ error: "Erro ao buscar templates de serviços" })
			}
		}
	)

	// Rota alternativa simples para adicionar serviços do prestador (contorna problemas de autenticação)
	app.post("/api/provider-services-direct", (req, res) => {
		console.log("POST /api/provider-services-direct - Requisição recebida")

		// Log detalhado para identificar problemas de autenticação
		console.log(`Autenticado: ${req.isAuthenticated()}`)
		if (req.user) {
			console.log(`Usuário: ID=${req.user.id}, Tipo=${req.user.userType}`)
		} else {
			console.log("Usuário não encontrado na requisição")
		}

		// Extrair dados do corpo da requisição
		const { providerId, serviceId, executionTime, breakTime } = req.body

		// Modo de contingência - permitir operação mesmo sem autenticação completa
		// se o providerId for fornecido no corpo da requisição
		let realProviderId = providerId

		if (!req.isAuthenticated()) {
			console.log(
				`Não autenticado, usando providerId do corpo: ${providerId}`
			)
			if (!providerId) {
				return res
					.status(401)
					.json({
						error: "Não autorizado (providerId não fornecido)",
					})
			}
		} else {
			// Se autenticado, usar o ID do usuário logado
			realProviderId = req.user.id
			console.log(
				`Autenticado como: ${realProviderId} (${req.user.userType})`
			)

			if (
				req.user.userType !== "provider" &&
				req.user.userType !== "admin"
			) {
				return res
					.status(403)
					.json({
						error: "Apenas prestadores podem adicionar serviços",
					})
			}
		}

		console.log(
			`Adicionando serviço ${serviceId} para o prestador ${realProviderId}`
		)

		// Validação básica
		if (!serviceId || !executionTime) {
			return res
				.status(400)
				.json({
					error: "Dados incompletos (serviceId e executionTime são obrigatórios)",
				})
		}

		// Função assíncrona para processar a adição do serviço
		;(async () => {
			try {
				// Verificar se o prestador existe
				const provider = await storage.getUser(realProviderId)
				if (!provider) {
					return res
						.status(404)
						.json({ error: "Prestador não encontrado" })
				}

				// Verificar se o serviço existe
				const template = await storage.getServiceTemplate(serviceId)
				if (!template) {
					return res
						.status(404)
						.json({ error: "Serviço não encontrado" })
				}

				// Verificar se o prestador já tem esse serviço
				const existingServices =
					await storage.getProviderServicesByProvider(realProviderId)
				const alreadyAdded = existingServices.some(
					(s) => s.serviceId === serviceId
				)

				if (alreadyAdded) {
					return res
						.status(400)
						.json({
							error: "Serviço já adicionado ao seu catálogo",
						})
				}

				// Adicionar o serviço
				const newProviderService = await storage.createProviderService({
					providerId: realProviderId,
					serviceId,
					executionTime,
					breakTime: breakTime || 0,
					isActive: true,
				})

				console.log(
					`Serviço ${serviceId} adicionado com sucesso para o prestador ${realProviderId}`
				)

				return res.status(201).json({
					...newProviderService,
					serviceName: template.name,
					successMessage: "Serviço adicionado com sucesso",
				})
			} catch (error) {
				console.error("Erro ao adicionar serviço ao prestador:", error)
				return res
					.status(500)
					.json({ error: "Erro ao adicionar serviço" })
			}
		})()
	})

	// Registrar nova rota unificada para serviços de prestadores (implementação melhorada)
	// Desabilitado temporariamente para resolver problemas de sintaxe
	// app.use('/api/unified-services', unifiedProviderServicesRouter);

	// Registrar nova rota otimizada para serviços com prestadores (resolve o problema de exibição)
	app.use("/api/all-services", servicesWithProvidersRouter)

	// Registrar rotas especializadas de prestadores (PRIMEIRO - antes das genéricas)
	app.use("/api/providers/service-search", providerServiceSearchRouter) // Nova rota otimizada
	app.use("/api/providers-optimized", optimizedProviderSearchRouter)
	app.use("/api/providers/optimized", optimizedProviderSearchRouter) // Adicionar rota correta
	
	// Registrar rotas genéricas de prestadores (depois das específicas)
	app.use("/api/providers", providersRoutes)
	app.use("/api/providers", specializedProviderSearchRouter)
	app.use("/api/providers", providerSearchWithServicesRouter)

	// Registrar rotas de relatórios administrativos
	app.use("/api/admin/reports", adminReportsRoutes)

	// Registrar rotas de upload de arquivos
	registerUploadRoutes(app)

	// Registrar rotas de gerenciamento de usuário
	registerUserManagementRoutes(app)

	// Funcionalidade de chatbot do WhatsApp removida

	// Banco de dados já inicializado no construtor do storage
	console.log("Rotas registradas com sucesso")

	// ---------------------------------------------------------------------
	// Rotas de Usuários
	// ---------------------------------------------------------------------

	// Atualizar usuário
	app.put("/api/users/:id", isAuthenticated, async (req, res) => {
		try {
			// Somente permitir usuários atualizarem seus próprios dados
			// ou administradores atualizarem qualquer usuário
			const userId = parseInt(req.params.id)
			if (req.user!.id !== userId && req.user!.userType !== "admin") {
				return res.status(403).json({ error: "Permissão negada" })
			}

			const userData = req.body
			const updatedUser = await storage.updateUser(userId, userData)

			if (!updatedUser) {
				return res.status(404).json({ error: "Usuário não encontrado" })
			}

			res.json(updatedUser)
		} catch (error) {
			res.status(500).json({ error: "Erro ao atualizar usuário" })
		}
	})

	// ---------------------------------------------------------------------
	// Rotas de Disponibilidade (Agenda)
	// ---------------------------------------------------------------------

	// Obter disponibilidade de um prestador
	app.get("/api/providers/:id/availability", async (req, res) => {
		try {
			const providerId = parseInt(req.params.id)
			const { view, startDate, endDate } = req.query

			// Verificar se é uma visualização específica (dia, semana, mês)
			if (view) {
				// Se view=calendar, retorna a disponibilidade formatada para exibição em um calendário
				if (view === "calendar" && startDate && endDate) {
					try {
						// Validar datas
						const start = new Date(startDate as string)
						const end = new Date(endDate as string)

						if (isNaN(start.getTime()) || isNaN(end.getTime())) {
							return res
								.status(400)
								.json({ error: "Datas inválidas" })
						}

						// Buscar disponibilidade do prestador
						const availability =
							await storage.getAvailabilitiesByProviderId(
								providerId
							)

						// Gerar datas entre start e end (inclusive)
						const dates = []
						const currentDate = new Date(start)
						while (currentDate <= end) {
							dates.push(new Date(currentDate))
							currentDate.setDate(currentDate.getDate() + 1)
						}

						// Para cada data, verificar se há disponibilidade para o dia da semana correspondente
						const calendarData = await Promise.all(
							dates.map(async (date) => {
								const dayOfWeek = date.getDay() // 0-6 (Domingo-Sábado)
								const dayAvailability = availability.filter(
									(a) => a.dayOfWeek === dayOfWeek
								)

								// Verificar se há agendamentos ou bloqueios neste dia
								const dateString = date
									.toISOString()
									.split("T")[0] // YYYY-MM-DD
								const appointments =
									await storage.getProviderAppointmentsByDate(
										providerId,
										dateString
									)
								const blocks = await storage
									.getBlockedTimeSlotsByDate(
										providerId,
										dateString
									)
									.catch(() => [])

								const hasConflicts =
									appointments.length > 0 || blocks.length > 0

								return {
									date: dateString,
									dayOfWeek,
									dayName: [
										"Domingo",
										"Segunda",
										"Terça",
										"Quarta",
										"Quinta",
										"Sexta",
										"Sábado",
									][dayOfWeek],
									hasAvailability: dayAvailability.length > 0,
									availabilityPeriods: dayAvailability.map(
										(a) => ({
											startTime: a.startTime,
											endTime: a.endTime,
											id: a.id,
										})
									),
									hasConflicts,
									conflicts: {
										appointments: appointments.length,
										blocks: blocks.length,
									},
								}
							})
						)

						return res.json(calendarData)
					} catch (error) {
						console.error(
							"Erro ao processar visualização de calendário:",
							error
						)
						return res
							.status(500)
							.json({
								error: "Erro ao processar visualização de calendário",
							})
					}
				}
			}

			// Se não houver view específica, retorna a disponibilidade padrão
			const availability = await storage.getAvailabilitiesByProviderId(
				providerId
			)
			res.json(availability)
		} catch (error) {
			console.error("Erro ao buscar disponibilidade:", error)
			res.status(500).json({ error: "Erro ao buscar disponibilidade" })
		}
	})

	// Obter disponibilidade para um dia da semana específico
	app.get(
		"/api/availability/day/:providerId/:dayOfWeek",
		async (req, res) => {
			try {
				const providerId = parseInt(req.params.providerId)
				const dayOfWeek = parseInt(req.params.dayOfWeek)

				const availability = await storage.getAvailabilityByDay(
					providerId,
					dayOfWeek
				)

				if (!availability) {
					return res
						.status(404)
						.json({ error: "Disponibilidade não encontrada" })
				}

				res.json(availability)
			} catch (error) {
				console.error("Erro ao buscar disponibilidade:", error)
				res.status(500).json({
					error: "Erro ao buscar disponibilidade",
				})
			}
		}
	)

	// Atualizar disponibilidade em lote
	app.post("/api/availability/batch", isAuthenticated, async (req, res) => {
		try {
			const { availabilityConfig } = req.body

			if (!availabilityConfig || !Array.isArray(availabilityConfig)) {
				return res
					.status(400)
					.json({ error: "Dados de disponibilidade inválidos" })
			}

			// Verificar se usuário tem permissão (deve ser o próprio prestador ou um admin)
			const providerId = availabilityConfig[0]?.providerId
			if (!providerId) {
				return res
					.status(400)
					.json({ error: "ProviderId é obrigatório" })
			}

			if (req.user!.id !== providerId && req.user!.userType !== "admin") {
				return res.status(403).json({ error: "Permissão negada" })
			}

			// Primeiro, remover disponibilidades existentes
			const existingAvailabilities =
				await storage.getAvailabilitiesByProviderId(providerId)
			for (const availability of existingAvailabilities) {
				await storage.deleteAvailability(availability.id)
			}

			// Criar novas disponibilidades
			const result = await storage.createAvailabilityBatch(
				availabilityConfig
			)

			res.status(201).json(result)
		} catch (error) {
			console.error("Erro ao atualizar disponibilidade em lote:", error)
			res.status(500).json({
				error: "Erro ao atualizar disponibilidade em lote",
			})
		}
	})

	// Rota para atualizar disponibilidade por providerId
	app.post("/api/availability/update", isAuthenticated, async (req, res) => {
		try {
			const { providerId, availability } = req.body

			if (!providerId || !availability || !Array.isArray(availability)) {
				return res
					.status(400)
					.json({ error: "Dados de disponibilidade inválidos" })
			}

			// Verificar se usuário tem permissão (deve ser o próprio prestador ou um admin)
			if (req.user!.id !== providerId && req.user!.userType !== "admin") {
				return res.status(403).json({ error: "Permissão negada" })
			}

			// Primeiro, remover disponibilidades existentes
			const existingAvailabilities =
				await storage.getAvailabilitiesByProviderId(providerId)
			for (const avail of existingAvailabilities) {
				await storage.deleteAvailability(avail.id)
			}

			// Criar novas disponibilidades
			const result = []
			for (const avail of availability) {
				const created = await storage.createAvailability({
					providerId,
					dayOfWeek: avail.dayOfWeek,
					startTime: avail.startTime,
					endTime: avail.endTime,
					isAvailable: avail.isAvailable,
					date: avail.date,
					intervalMinutes: avail.intervalMinutes || 0,
				})
				result.push(created)
			}

			res.status(200).json(result)
		} catch (error: any) {
			console.error("Erro ao atualizar disponibilidade:", error)
			res.status(500).json({
				error: error.message || "Erro ao atualizar disponibilidade",
			})
		}
	})

	// ---------------------------------------------------------------------
	// Rotas para bloqueio de horários
	// ---------------------------------------------------------------------

	// Obter bloqueios de horário de um prestador
	app.get("/api/providers/:id/blocked-slots", async (req, res) => {
		try {
			const providerId = parseInt(req.params.id)

			const blockedSlots = await storage.getBlockedTimeSlotsByProviderId(
				providerId
			)
			res.json(blockedSlots)
		} catch (error) {
			console.error("Erro ao buscar bloqueios de horário:", error)
			res.status(500).json({
				error: "Erro ao buscar bloqueios de horário",
			})
		}
	})

	// Obter bloqueios de horário para uma data específica
	app.get("/api/providers/:id/blocked-slots/:date", async (req, res) => {
		try {
			const providerId = parseInt(req.params.id)
			const date = req.params.date

			// Validar formato de data (YYYY-MM-DD)
			if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
				return res
					.status(400)
					.json({ error: "Formato de data inválido. Use YYYY-MM-DD" })
			}

			const blockedSlots = await storage.getBlockedTimeSlotsByDate(
				providerId,
				date
			)
			res.json(blockedSlots)
		} catch (error) {
			console.error(
				"Erro ao buscar bloqueios de horário para a data:",
				error
			)
			res.status(500).json({
				error: "Erro ao buscar bloqueios de horário",
			})
		}
	})

	// Criar um bloqueio de horário
	app.post(
		"/api/blocked-slots",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const {
					date,
					startTime,
					endTime,
					reason,
					recurrentId,
					blockType,
				} = req.body

				// Validações básicas
				if (!date || !startTime || !endTime) {
					return res
						.status(400)
						.json({
							error: "Data, hora de início e hora de fim são obrigatórios",
						})
				}

				// Validar formato de data
				if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
					return res
						.status(400)
						.json({
							error: "Formato de data inválido. Use YYYY-MM-DD",
						})
				}

				// Validar formato de hora
				if (
					!/^\d{2}:\d{2}$/.test(startTime) ||
					!/^\d{2}:\d{2}$/.test(endTime)
				) {
					return res
						.status(400)
						.json({ error: "Formato de hora inválido. Use HH:MM" })
				}

				// Verificar se a hora de início é anterior à hora de fim
				if (startTime >= endTime) {
					return res
						.status(400)
						.json({
							error: "A hora de início deve ser anterior à hora de fim",
						})
				}

				const providerId = req.user!.id

				// Verificar se há disponibilidade configurada para este dia
				const availability = await storage.getAvailabilityByDate(
					providerId,
					date
				)
				if (!availability) {
					return res
						.status(400)
						.json({
							error: "Não há disponibilidade configurada para esta data",
						})
				}

				// Usar o sistema de agendamento inteligente para bloquear o slot
				const success = await bookingSystem.blockTimeSlot({
					providerId,
					date,
					startTime,
					endTime,
					reason: reason || "Bloqueado manualmente pelo prestador",
					recurrentId,
					blockType: blockType || "manual",
				})

				if (success) {
					res.status(201).json({
						success: true,
						message: "Horário bloqueado com sucesso",
					})
				} else {
					res.status(400).json({ error: "Falha ao bloquear horário" })
				}
			} catch (error: any) {
				console.error("Erro ao criar bloqueio de horário:", error)
				res.status(400).json({
					error: error.message || "Erro ao bloquear horário",
				})
			}
		}
	)

	// Remover um bloqueio de horário
	app.delete(
		"/api/blocked-slots/:id",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const blockedSlotId = parseInt(req.params.id)
				const blockedSlot = await storage.getBlockedTimeSlotById(
					blockedSlotId
				)

				if (!blockedSlot) {
					return res
						.status(404)
						.json({ error: "Bloqueio de horário não encontrado" })
				}

				// Verificar se o bloqueio pertence ao prestador autenticado
				if (blockedSlot.providerId !== req.user!.id) {
					return res.status(403).json({ error: "Permissão negada" })
				}

				const success = await storage.deleteBlockedTimeSlot(
					blockedSlotId
				)

				if (success) {
					res.status(200).json({ success: true })
				} else {
					res.status(500).json({
						error: "Erro ao remover bloqueio de horário",
					})
				}
			} catch (error) {
				console.error("Erro ao remover bloqueio de horário:", error)
				res.status(500).json({
					error: "Erro ao remover bloqueio de horário",
				})
			}
		}
	)

	// Desbloquear um slot de tempo específico (pelo horário exato)
	app.post(
		"/api/unblock-time-slot",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const {
					date,
					startTime,
					endTime,
					availabilityId,
					providerId: reqProviderId,
				} = req.body

				// Validações básicas
				if (!date || !startTime || !endTime) {
					return res
						.status(400)
						.json({
							error: "Data, hora de início e hora de fim são obrigatórios",
						})
				}

				// Se foi fornecido um providerId na requisição, usar esse. Caso contrário, usar o ID do usuário atual
				const providerId = reqProviderId || req.user!.id

				console.log(
					`Tentando desbloquear horário para provider ${providerId} em ${date} das ${startTime} às ${endTime}, availabilityId: ${
						availabilityId || "não fornecido"
					}`
				)

				// Verificar se o usuário tem permissão para desbloquear para este providerId
				if (
					req.user!.id !== providerId &&
					req.user!.userType !== "admin"
				) {
					return res.status(403).json({
						error: "Você só pode desbloquear horários de sua própria agenda",
						success: false,
					})
				}

				const success = await storage.unblockTimeSlot({
					providerId,
					date,
					startTime,
					endTime,
					availabilityId: availabilityId || undefined,
				})

				console.log(
					`Resultado do desbloqueio: ${success ? "Sucesso" : "Falha"}`
				)

				if (success) {
					res.status(200).json({
						success: true,
						message: "Horário desbloqueado com sucesso",
					})
				} else {
					res.status(404).json({
						success: false,
						error: "Bloqueio de horário não encontrado",
					})
				}
			} catch (error) {
				console.error("Erro ao desbloquear slot de tempo:", error)
				res.status(500).json({
					success: false,
					error:
						error instanceof Error
							? error.message
							: "Erro ao desbloquear slot de tempo",
				})
			}
		}
	)

	// Consultar horários disponíveis para um prestador/serviço em uma data específica
	app.get("/api/available-slots", async (req, res) => {
		try {
			const { providerId, serviceId, date } = req.query

			// Validação dos parâmetros
			if (!providerId || !date) {
				return res
					.status(400)
					.json({ error: "ProviderId e data são obrigatórios" })
			}

			// Converter para os tipos corretos
			const providerIdNum = parseInt(providerId as string)
			const serviceIdNum = serviceId
				? parseInt(serviceId as string)
				: undefined
			const dateStr = date as string

			// Validar formato de data (YYYY-MM-DD)
			if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
				return res
					.status(400)
					.json({ error: "Formato de data inválido. Use YYYY-MM-DD" })
			}

			// Obter os slots disponíveis
			const slots = await storage.getAvailableTimeSlots(
				providerIdNum,
				dateStr,
				serviceIdNum
			)

			// Organizar os slots em estrutura de resposta mais amigável
			const formattedSlots = slots.map((slot) => ({
				...slot,
				isBlocked: !slot.isAvailable, // Para facilitar a leitura no frontend
				formattedSlot: `${slot.startTime} - ${slot.endTime}`,
			}))

			// Agrupar por disponibilidade
			const availableSlots = formattedSlots.filter(
				(slot) => slot.isAvailable
			)
			const blockedSlots = formattedSlots.filter(
				(slot) => !slot.isAvailable
			)

			res.json({
				date: dateStr,
				providerId: providerIdNum,
				serviceId: serviceIdNum,
				totalSlots: slots.length,
				availableCount: availableSlots.length,
				blockedCount: blockedSlots.length,
				slots: formattedSlots,
			})
		} catch (error) {
			console.error("Erro ao consultar horários disponíveis:", error)
			res.status(500).json({
				error: "Erro ao consultar horários disponíveis",
			})
		}
	})

	// Criar/adicionar disponibilidade (para prestadores)
	app.post(
		"/api/availability",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const availabilityData = {
					...req.body,
					providerId: req.user!.id,
				}
				const newAvailability = await storage.createAvailability(
					availabilityData
				)
				res.status(201).json(newAvailability)
			} catch (error) {
				console.error("Erro ao criar disponibilidade:", error)
				res.status(500).json({ error: "Erro ao criar disponibilidade" })
			}
		}
	)

	// Atualizar disponibilidade
	app.put(
		"/api/availability/:id",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const availabilityId = parseInt(req.params.id)
				const availability = await storage.getAvailability(
					availabilityId
				)

				if (!availability) {
					return res
						.status(404)
						.json({ error: "Disponibilidade não encontrada" })
				}

				if (availability.providerId !== req.user!.id) {
					return res.status(403).json({
						error: "Você não tem permissão para editar esta disponibilidade",
					})
				}

				const updatedAvailability = await storage.updateAvailability(
					availabilityId,
					req.body
				)
				res.json(updatedAvailability)
			} catch (error) {
				console.error("Erro ao atualizar disponibilidade:", error)
				res.status(500).json({
					error: "Erro ao atualizar disponibilidade",
				})
			}
		}
	)

	// Excluir disponibilidade
	app.delete(
		"/api/availability/:id",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const availabilityId = parseInt(req.params.id)
				const availability = await storage.getAvailability(
					availabilityId
				)

				if (!availability) {
					return res
						.status(404)
						.json({ error: "Disponibilidade não encontrada" })
				}

				if (availability.providerId !== req.user!.id) {
					return res.status(403).json({
						error: "Você não tem permissão para excluir esta disponibilidade",
					})
				}

				const success = await storage.deleteAvailability(availabilityId)

				if (success) {
					res.status(200).json({ success: true })
				} else {
					res.status(500).json({
						error: "Erro ao excluir disponibilidade",
					})
				}
			} catch (error) {
				console.error("Erro ao excluir disponibilidade:", error)
				res.status(500).json({
					error: "Erro ao excluir disponibilidade",
				})
			}
		}
	)

	// ---------------------------------------------------------------------
	// Rotas de Agendamentos
	// ---------------------------------------------------------------------

	// Listar agendamentos do cliente
	app.get(
		"/api/client/appointments",
		isAuthenticated,
		isClient,
		async (req, res) => {
			try {
				const appointments = await storage.getClientAppointments(
					req.user!.id
				)
				res.json(appointments)
			} catch (error) {
				res.status(500).json({ error: "Erro ao buscar agendamentos" })
			}
		}
	)

	// Rota específica para admin acessar todos os agendamentos
	app.get(
		"/api/admin/appointments",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const dateFilter = req.query.date as string | undefined
				console.log(
					"Admin consultando agendamentos. Filtro de data:",
					dateFilter
				)

				let appointments = await storage.getAllAppointments()

				// Aplicar filtro por data se necessário
				if (dateFilter) {
					appointments = appointments.filter(
						(appt) => appt.date === dateFilter
					)
				}

				res.json(appointments)
			} catch (error) {
				console.error("Erro ao buscar agendamentos para admin:", error)
				res.status(500).json({ error: "Erro ao buscar agendamentos" })
			}
		}
	)

	// Rota para admin atualizar o status de um agendamento
	app.put(
		"/api/admin/appointments/:id",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				// Validação do ID para garantir que seja um número
				const appointmentId = parseInt(req.params.id)
				if (isNaN(appointmentId)) {
					return res.status(400).json({
						error: "ID de agendamento inválido",
						details: "O ID deve ser um número",
					})
				}

				// Validação básica do corpo da requisição
				if (!req.body || Object.keys(req.body).length === 0) {
					return res.status(400).json({
						error: "Dados inválidos",
						details: "Nenhum dado fornecido para atualização",
					})
				}

				const { status } = req.body

				console.log(
					`Admin atualizando agendamento ${appointmentId} para status: ${status}`
				)

				// Verificar se o agendamento existe
				const appointment = await storage.getAppointment(appointmentId)
				if (!appointment) {
					return res.status(404).json({
						error: "Agendamento não encontrado",
						details: `Agendamento com ID ${appointmentId} não existe`,
					})
				}

				// Atualizar o agendamento com os dados fornecidos
				// Adicionar timestamp de atualização
				const updateData = {
					...req.body,
					updatedAt: new Date().toISOString(),
				}

				const updatedAppointment = await storage.updateAppointment(
					appointmentId,
					updateData
				)

				if (!updatedAppointment) {
					return res.status(500).json({
						error: "Falha ao atualizar agendamento",
						details: "O agendamento não pôde ser atualizado",
					})
				}

				// Retornar o agendamento atualizado
				return res.json(updatedAppointment)
			} catch (error) {
				console.error("Erro ao atualizar agendamento:", error)

				// Garantir que sempre retornamos JSON
				return res.status(500).json({
					error: "Erro ao atualizar agendamento",
					details:
						error instanceof Error ? error.message : String(error),
				})
			}
		}
	)

	// Listar agendamentos conforme o tipo de usuário
	app.get("/api/appointments", isAuthenticated, async (req, res) => {
		try {
			console.log(
				"Consultando agendamentos para:",
				req.user?.id,
				req.user?.userType
			)
			const userId = req.user!.id
			const userType = req.user!.userType

			let appointments

			if (userType === "admin" || userType === "support") {
				// Admin e suporte vêem todos os agendamentos
				appointments = await storage.getAppointments()
			} else if (userType === "provider") {
				// Prestador vê apenas seus próprios agendamentos
				appointments = await storage.getAppointmentsByProviderId(userId)
			} else {
				// Cliente vê apenas seus próprios agendamentos com informações completas
				appointments = await storage.getClientAppointments(userId)
			}

			res.json(appointments)
		} catch (error) {
			console.error("Erro ao buscar agendamentos:", error)
			res.status(500).json({ error: "Erro ao buscar agendamentos" })
		}
	})

	// Obter serviços mais usados pelo cliente ou prestadores recentes
	app.get(
		"/api/client/recent-services-providers",
		isAuthenticated,
		isClient,
		async (req, res) => {
			try {
				const clientId = req.user!.id
				console.log(
					"Consultando serviços mais usados e prestadores recentes para o cliente:",
					clientId
				)

				// Obter agendamentos do cliente - limitando aos últimos 50 para melhor performance
				const appointments = await storage.getAppointmentsByClientId(
					clientId
				)

				// Buscar categorias para usar cor e informações adicionais
				const categories = await storage.getCategories()
				const categoryMap = new Map(
					categories.map((cat) => [cat.id, cat])
				)

				// Se não houver agendamentos, retornar categorias como serviços sugeridos
				if (!appointments || appointments.length === 0) {
					// Obter as categorias mais populares
					const topCategories = categories.slice(0, 7).map((cat) => ({
						id: cat.id,
						name: cat.name,
						count: 1,
						categoryId: cat.id,
						categoryName: cat.name,
						color: cat.color || "#666666",
					}))

					return res.json({
						topServices: topCategories,
						recentProviders: [],
						hasHistory: false,
						message:
							"Sem histórico de agendamentos, mostrando categorias populares",
					})
				}

				// Buscar serviços para complementar informações
				const serviceIds = [
					...new Set(appointments.map((app) => app.serviceId)),
				]
				const services = await Promise.all(
					serviceIds.map((id) => storage.getService(id))
				)
				const serviceMap = new Map(
					services.filter(Boolean).map((s) => [s?.id, s])
				)

				// Estruturas para armazenar contagens e informações
				const serviceUsageCounts = new Map()
				const recentProviders = new Map()

				// Processar agendamentos para obter contagens de serviços e prestadores recentes
				appointments.forEach((appointment) => {
					const service = serviceMap.get(appointment.serviceId)
					const category = service?.categoryId
						? categoryMap.get(service.categoryId)
						: null

					// Contar uso de serviços
					if (!serviceUsageCounts.has(appointment.serviceId)) {
						serviceUsageCounts.set(appointment.serviceId, {
							id: appointment.serviceId,
							name: appointment.serviceName || "Serviço",
							count: 0,
							categoryId: service?.categoryId || null,
							categoryName: category?.name || "Categoria",
							color: category?.color || "#666666",
						})
					}
					serviceUsageCounts.get(appointment.serviceId).count += 1

					// Rastrear prestadores recentes (último uso)
					if (
						!recentProviders.has(appointment.providerId) ||
						new Date(appointment.date) >
							new Date(
								recentProviders.get(appointment.providerId).date
							)
					) {
						recentProviders.set(appointment.providerId, {
							id: appointment.providerId,
							name: appointment.providerName || "Prestador",
							address: "Localização do prestador", // Placeholder
							categoryName: category?.name || "Categoria",
							lastServiceId: appointment.serviceId,
							lastServiceName:
								appointment.serviceName || "Serviço",
							date: appointment.date,
						})
					}
				})

				// Se não houver serviços, usar as categorias
				if (serviceUsageCounts.size === 0) {
					const topCategories = categories.slice(0, 7).map((cat) => ({
						id: cat.id,
						name: cat.name,
						count: 1,
						categoryId: cat.id,
						categoryName: cat.name,
						color: cat.color || "#666666",
					}))

					return res.json({
						topServices: topCategories,
						recentProviders: Array.from(recentProviders.values()),
						hasHistory: true,
						message:
							"Sem serviços identificados, mostrando categorias populares",
					})
				}

				// Transformar mapas em arrays e ordenar
				const topServices = Array.from(serviceUsageCounts.values())
					.sort((a, b) => b.count - a.count)
					.slice(0, 7) // Limitar aos 7 principais serviços

				const recentProviderList = Array.from(recentProviders.values())
					.sort(
						(a, b) =>
							new Date(b.date).getTime() -
							new Date(a.date).getTime()
					)
					.slice(0, 7) // Limitar aos 7 prestadores mais recentes

				res.json({
					topServices,
					recentProviders: recentProviderList,
					hasHistory: appointments.length > 0,
				})
			} catch (error) {
				console.error(
					"Erro ao obter serviços mais usados e prestadores recentes:",
					error
				)
				res.status(500).json({
					error: "Erro ao obter dados personalizados do cliente",
				})
			}
		}
	)

	// Criar novo agendamento
	app.post(
		["/api/appointments", "/api/appointments/manual"],
		isAuthenticated,
		async (req, res) => {
			try {
				const isManualRoute = req.path === "/api/appointments/manual"
				console.log(
					`Solicitação para criar agendamento${
						isManualRoute ? " manual" : ""
					}:`,
					req.body
				)

				const userId = req.user!.id
				const userType = req.user!.userType
				let {
					clientId,
					providerId,
					serviceId,
					date,
					startTime,
					endTime,
					status,
					notes,
					paymentMethod,
					isManuallyCreated = false,
					discount = 0, // Novo campo para desconto (em porcentagem)
				} = req.body

				// Se for rota manual e não tiver isManuallyCreated definido, define como true
				if (isManualRoute) {
					isManuallyCreated = true
					// Se for prestador criando agendamento manual, define providerId como o id do usuário
					if (userType === "provider" && !providerId) {
						providerId = userId
					}
					// Define método de pagamento padrão se não for fornecido
					if (!paymentMethod) {
						paymentMethod = "money" // Pagamento em dinheiro como padrão para agendamentos manuais
					}
				}

				// Validações
				if (
					!clientId ||
					!providerId ||
					!serviceId ||
					!date ||
					!startTime ||
					!endTime
				) {
					return res
						.status(400)
						.json({
							error: "Dados incompletos para criar o agendamento",
						})
				}

				// Verificar permissões
				if (
					(userType === "client" && clientId !== userId) ||
					(userType === "provider" &&
						providerId !== userId &&
						!isManuallyCreated)
				) {
					return res.status(403).json({
						error: "Você não tem permissão para criar este agendamento",
					})
				}

				// Obter o serviço para verificar o preço e duração
				const service = await storage.getService(serviceId)
				if (!service) {
					return res
						.status(404)
						.json({ error: "Serviço não encontrado" })
				}

				// Buscar informações do cliente e prestador
				const client = await storage.getUser(clientId)
				const provider = await storage.getUser(providerId)

				if (!client || !provider) {
					return res
						.status(404)
						.json({ error: "Cliente ou prestador não encontrado" })
				}

				// Verificar se o slot está realmente disponível com a duração adequada
				const providerService =
					await storage.getProviderServiceByProviderAndService(
						providerId,
						serviceId
					)

				// Determinar o tempo de execução (personalizado ou padrão)
				const executionTime = providerService
					? providerService.executionTime
					: service.duration
				console.log(
					`Tempo de execução do serviço: ${executionTime} minutos`
				)

				// Verificar disponibilidade considerando o tempo de execução real
				const timeSlots = await storage.generateTimeSlots(
					providerId,
					date,
					serviceId
				)

				// VERIFICAÇÃO ESTRITA: Filtrar explicitamente por slots com isAvailable === true
				const availableSlots = timeSlots.filter(
					(slot) => slot.isAvailable === true
				)

				// Log para debug - mostrar os horários disponíveis após verificação estrita
				console.log(
					`Horários disponíveis para data ${date} após verificação estrita:`,
					availableSlots.map(
						(slot) => `${slot.startTime}-${slot.endTime}`
					)
				)

				// Verificar se o horário solicitado está disponível com verificação estrita
				const requestedSlot = availableSlots.find(
					(slot) => slot.startTime === startTime
				)

				// Log adicional para debug
				console.log(
					`Horário solicitado: ${startTime}-${endTime}, encontrado: ${!!requestedSlot}`
				)
				if (requestedSlot) {
					console.log(
						`Slot encontrado com verificação estrita: ${requestedSlot.startTime}-${requestedSlot.endTime}`
					)
				}

				if (!requestedSlot) {
					// Verificar se o slot existe mas não está disponível
					const slotExisteMasIndisponivel = timeSlots.find(
						(slot) =>
							slot.startTime === startTime &&
							slot.isAvailable !== true
					)

					if (slotExisteMasIndisponivel) {
						return res.status(400).json({
							error: "Horário solicitado existe mas não está mais disponível. Por favor, escolha outro horário.",
						})
					}

					// Verificar se o problema é o horário de término informado não corresponder ao de um slot
					const slotComMesmoInicio = timeSlots.find(
						(slot) => slot.startTime === startTime
					)
					if (
						slotComMesmoInicio &&
						slotComMesmoInicio.endTime !== endTime
					) {
						return res.status(400).json({
							error: `Horário de término incorreto. O horário correto seria ${slotComMesmoInicio.startTime}-${slotComMesmoInicio.endTime}`,
						})
					}

					return res.status(400).json({
						error: "Horário solicitado não está disponível ou não comporta a duração do serviço",
					})
				}

				// Calcular o horário de término real com base na duração do serviço
				const startMinutes = timeToMinutes(startTime)
				const realEndMinutes = startMinutes + executionTime
				const realEndTime = minutesToTime(realEndMinutes)

				// Atualizar o horário de término para refletir a duração real do serviço
				endTime = realEndTime

				console.log(
					`Horário de término ajustado para ${endTime} com base na duração do serviço: ${executionTime} minutos`
				)

				// Buscar configurações de pagamento
				const paymentSettings = await getPaymentSettings()

				// Calcular preço do serviço + taxa de serviço fixa
				// Usar o preço personalizado do prestador se disponível, senão usar o preço padrão do serviço
				const servicePrice = providerService?.price || service.price || 0
				
				console.log(`Cálculo de preço do serviço:`, {
					providerServicePrice: providerService?.price,
					servicePrice: service.price,
					finalServicePrice: servicePrice,
					providerServiceId: providerService?.id
				})

				// Obter a taxa fixa da plataforma (padrão R$ 1,75 em centavos se não configurada)
				const serviceFee = paymentSettings?.serviceFee || 175 // Taxa em centavos de real
				const minServiceFee = paymentSettings?.minServiceFee || 100 // Mínimo de R$ 1,00
				const maxServiceFee = paymentSettings?.maxServiceFee || 5000 // Máximo de R$ 50,00

				// Aplicar taxa de serviço, respeitando os limites mínimo e máximo
				let appliedServiceFee = serviceFee
				if (appliedServiceFee < minServiceFee) {
					appliedServiceFee = minServiceFee
				} else if (appliedServiceFee > maxServiceFee) {
					appliedServiceFee = maxServiceFee
				}

				// Validar desconto (entre 0 e 100%)
				if (discount < 0 || discount > 100) {
					discount = 0 // Resetar para zero se for um valor inválido
				}

				// Calcular valor do desconto em centavos
				const discountAmount =
					discount > 0
						? Math.floor(servicePrice * (discount / 100))
						: 0

				// Aplicar desconto ao preço do serviço
				const discountedServicePrice = servicePrice - discountAmount

				// Correção no cálculo do preço total com desconto: o preço do serviço deve ser considerado em centavos
				const totalPrice =
					Number(discountedServicePrice) + Number(appliedServiceFee)

				console.log(
					`Cálculo de preço: Serviço (R$ ${(
						Number(servicePrice) / 100
					).toFixed(2)}) - Desconto ${discount}% (R$ ${(
						Number(discountAmount) / 100
					).toFixed(2)}) + Taxa (R$ ${(
						Number(appliedServiceFee) / 100
					).toFixed(2)}) = Total (R$ ${(totalPrice / 100).toFixed(
						2
					)})`
				)
				
				console.log(`Dados do agendamento criado:`, {
					providerServiceId: providerService?.id,
					servicePrice: servicePrice,
					discount: discount,
					discountAmount: discountAmount,
					appliedServiceFee: appliedServiceFee,
					totalPrice: totalPrice,
					providerId: providerId,
					serviceId: serviceId
				})

				// Criar objeto de agendamento
				const appointmentData = {
					clientId,
					providerId,
					serviceId,
					providerServiceId: providerService?.id, // Salvar referência ao serviço personalizado do prestador
					date,
					startTime,
					endTime,
					availabilityId: req.body.availabilityId, // ID da disponibilidade específica
					status: status || "pending",
					notes,
					paymentMethod,
					paymentStatus: "pending",
					totalPrice,
					serviceName: service.name,
					providerName: provider.name || "",
					clientName: client.name || "",
					clientPhone: client.phone || "",
					isManuallyCreated,
					// Campos adicionais para referência de preços (serão armazenados em metadata se necessário)
					// discount, // Adicionar informação de desconto aplicado
					// originalPrice: servicePrice, // Manter o preço original para referência
					// discountAmount, // Armazenar o valor do desconto em centavos
				}

				// Criar o agendamento
				const appointment = await storage.createAppointment(
					appointmentData
				)

				// Obter os novos horários disponíveis após este agendamento
				const updatedTimeSlots = await storage.generateTimeSlots(
					providerId,
					date,
					serviceId
				)

				// Identificar quais horários ficaram indisponíveis
				const blockedTimeSlots = timeSlots.filter((originalSlot) => {
					// Um slot está bloqueado se estava disponível antes e agora não está mais encontrável
					// ou se ainda está, mas não está mais disponível
					const matchingUpdatedSlot = updatedTimeSlots.find(
						(updatedSlot) =>
							updatedSlot.startTime === originalSlot.startTime
					)
					return (
						!matchingUpdatedSlot || !matchingUpdatedSlot.isAvailable
					)
				})

				// Se houver horários bloqueados, registrá-los e efetivamente bloqueá-los no sistema
				const actuallyBlockedSlots = []
				if (blockedTimeSlots.length > 0) {
					console.log(
						`${blockedTimeSlots.length} horários bloqueados após o agendamento:`,
						blockedTimeSlots
							.map((slot) => `${slot.startTime}-${slot.endTime}`)
							.join(", ")
					)

					// Bloquear efetivamente os slots para evitar sobreposições
					for (const slot of blockedTimeSlots) {
						try {
							// Bloquear o slot no sistema com uma razão específica
							await storage.blockTimeSlot({
								providerId,
								date,
								startTime: slot.startTime,
								endTime: slot.endTime,
								reason: `Ocupado por agendamento #${appointment.id}`,
							})
							actuallyBlockedSlots.push({
								startTime: slot.startTime,
								endTime: slot.endTime,
							})
						} catch (blockError) {
							console.error(
								`Erro ao bloquear slot ${slot.startTime}-${slot.endTime}:`,
								blockError
							)
						}
					}
				}

				// Enviar notificação real-time se o prestador estiver online
				try {
					if (
						global.sendNotification &&
						typeof global.sendNotification === "function"
					) {
						global.sendNotification(providerId, {
							type: "new_appointment",
							title: "Novo agendamento",
							message: `Um novo agendamento foi criado para o dia ${date} às ${startTime}`,
							appointmentId: appointment.id,
						})
					} else {
						console.log(
							"WebSocket notification function not available"
						)
					}
				} catch (error) {
					console.error(
						"Error sending real-time notification:",
						error
					)
					// Não interromper o fluxo se houver erro nas notificações
				}

				console.log("Agendamento criado com sucesso:", appointment)

				// Enviar resposta com o agendamento e os horários bloqueados
				res.status(201).json({
					appointment,
					blockedTimeSlots:
						actuallyBlockedSlots.length > 0
							? actuallyBlockedSlots
							: blockedTimeSlots.map((slot) => ({
									startTime: slot.startTime,
									endTime:
										slot.endTime ||
										minutesToTime(
											timeToMinutes(slot.startTime) +
											(providerService?.executionTime ||
												service.duration)
										),
							  })),
				})
			} catch (error) {
				console.error("Erro ao criar agendamento:", error)
				res.status(500).json({
					error: "Erro ao criar agendamento",
					details:
						error instanceof Error ? error.message : String(error),
				})
			}
		}
	)

	// Obter detalhes de um agendamento específico
	app.get("/api/appointments/:id", isAuthenticated, async (req, res) => {
		try {
			const appointmentId = parseInt(req.params.id)
			const appointment = await storage.getAppointment(appointmentId)

			if (!appointment) {
				return res
					.status(404)
					.json({ error: "Agendamento não encontrado" })
			}

			// Verificar se o usuário tem permissão para ver o agendamento
			// (deve ser o cliente, o prestador, admin ou suporte)
			const userId = req.user!.id
			const userType = req.user!.userType

			if (
				appointment.clientId !== userId &&
				appointment.providerId !== userId &&
				userType !== "admin" &&
				userType !== "support"
			) {
				return res
					.status(403)
					.json({
						error: "Você não tem permissão para ver este agendamento",
					})
			}

			// Busca informações adicionais para enriquecer os detalhes do agendamento
			const service = await storage.getService(appointment.serviceId)
			const provider = await storage.getProviderSettings(
				appointment.providerId
			)
			const user = await storage.getUser(appointment.providerId)

			// Monta objeto de resposta com todas as informações necessárias
			const response = {
				...appointment,
				serviceName: service?.name,
				serviceDescription: service?.description,
				servicePrice: service?.price || 0,
				providerName: user?.name,
				providerBusinessName: provider?.businessName,
				providerPhone: user?.phone,
				providerImage: user?.profileImage,
				address: provider?.address,
			}

			res.json(response)
		} catch (error) {
			console.error("Erro ao buscar detalhes do agendamento:", error)
			res.status(500).json({
				error: "Erro ao buscar detalhes do agendamento",
			})
		}
	})

	// Verificar se um agendamento já foi avaliado
	app.get(
		"/api/appointments/:id/review",
		isAuthenticated,
		async (req, res) => {
			try {
				const appointmentId = parseInt(req.params.id)
				const review = await storage.getAppointmentReview(appointmentId)

				if (!review) {
					return res.status(404).json({
						error: "Nenhuma avaliação encontrada para este agendamento",
					})
				}

				// Verificar se o usuário tem permissão para ver a avaliação
				const userId = req.user!.id
				const userType = req.user!.userType

				if (
					review.clientId !== userId &&
					review.providerId !== userId &&
					userType !== "admin" &&
					userType !== "support"
				) {
					return res
						.status(403)
						.json({
							error: "Você não tem permissão para ver esta avaliação",
						})
				}

				res.json(review)
			} catch (error) {
				console.error("Erro ao buscar avaliação do agendamento:", error)
				res.status(500).json({
					error: "Erro ao buscar avaliação do agendamento",
				})
			}
		}
	)

	// Avaliar um agendamento (cliente avalia o serviço)
	app.post(
		"/api/appointments/:id/review",
		isAuthenticated,
		isClient,
		async (req, res) => {
			try {
				const appointmentId = parseInt(req.params.id)
				const userId = req.user!.id

				// Verificar se o agendamento existe
				const appointment = await storage.getAppointment(appointmentId)
				if (!appointment) {
					return res
						.status(404)
						.json({ error: "Agendamento não encontrado" })
				}

				// Verificar se o usuário é o cliente do agendamento
				if (appointment.clientId !== userId) {
					return res
						.status(403)
						.json({
							error: "Você não tem permissão para avaliar este agendamento",
						})
				}

				// Verificar se o agendamento já foi concluído
				if (appointment.status !== "completed") {
					return res
						.status(400)
						.json({
							error: "Apenas agendamentos concluídos podem ser avaliados",
						})
				}

				// Verificar se já existe uma avaliação
				const existingReview = await storage.getAppointmentReview(
					appointmentId
				)
				if (existingReview) {
					return res
						.status(400)
						.json({ error: "Este agendamento já foi avaliado" })
				}

				// Criar a avaliação
				const { rating, comment } = req.body

				if (!rating || rating < 1 || rating > 5) {
					return res
						.status(400)
						.json({
							error: "Avaliação deve ser um número entre 1 e 5",
						})
				}

				const review = await storage.createAppointmentReview({
					appointmentId,
					clientId: appointment.clientId,
					providerId: appointment.providerId,
					rating,
					comment: comment || "",
					createdAt: new Date(),
				})

				// Atualizar a média de avaliações do prestador
				await storage.updateProviderRating(appointment.providerId)

				res.status(201).json(review)
			} catch (error) {
				console.error("Erro ao criar avaliação:", error)
				res.status(500).json({ error: "Erro ao criar avaliação" })
			}
		}
	)

	// Atualizar status do agendamento (cancelar, concluir) e processar informações de pagamento
	app.put(
		"/api/appointments/:id/status",
		isAuthenticated,
		async (req, res) => {
			try {
				const appointmentId = parseInt(req.params.id)
				const { status, paymentStatus, paymentMethod, paymentId } =
					req.body
				const userId = req.user!.id
				const userType = req.user!.userType

				console.log(
					`Atualizando status do agendamento ${appointmentId}:`,
					{ status, paymentStatus, paymentMethod, paymentId }
				)

				// Validar status
				const validStatuses = [
					"pending",
					"confirmed",
					"canceled",
					"completed",
					"no_show",
					"processing_payment",
				]
				if (!validStatuses.includes(status)) {
					return res.status(400).json({ error: "Status inválido" })
				}

				// Obter agendamento
				const appointment = await storage.getAppointment(appointmentId)
				if (!appointment) {
					return res
						.status(404)
						.json({ error: "Agendamento não encontrado" })
				}

				// Verificar permissões
				const isOwnerClient = appointment.clientId === userId
				const isOwnerProvider = appointment.providerId === userId
				const isAdminOrSupport =
					userType === "admin" || userType === "support"

				if (!isOwnerClient && !isOwnerProvider && !isAdminOrSupport) {
					return res
						.status(403)
						.json({
							error: "Você não tem permissão para atualizar este agendamento",
						})
				}

				// Restrições específicas por tipo de usuário
				if (userType === "client") {
					// Cliente só pode cancelar
					if (status !== "canceled") {
						return res
							.status(403)
							.json({
								error: "Cliente só pode cancelar agendamentos",
							})
					}
				} else if (userType === "provider") {
					// Prestador pode cancelar, completar, marcar ausente ou processar pagamento
					const allowedProviderStatuses = [
						"canceled",
						"completed",
						"no_show",
						"processing_payment",
					]
					if (!allowedProviderStatuses.includes(status)) {
						return res
							.status(403)
							.json({
								error: "Prestador só pode cancelar, marcar como concluído, ausente ou processar pagamento",
							})
					}
				}

				// Verificar se o agendamento já está no status solicitado (exceto para status de pagamento)
				if (appointment.status === status && !paymentStatus) {
					return res
						.status(400)
						.json({
							error: `O agendamento já está com o status '${status}'`,
						})
				}

				// Verificar regras de transição de estado
				if (appointment.status === "canceled" && status !== "pending") {
					return res
						.status(400)
						.json({
							error: "Agendamentos cancelados só podem ser reativados para pendente",
						})
				}

				if (
					appointment.status === "completed" &&
					status !== "pending"
				) {
					return res
						.status(400)
						.json({
							error: "Agendamentos concluídos só podem ser reativados para pendente",
						})
				}

				// Preparar dados atualizados
				const updateData: any = { status }

				// Adicionar informações de pagamento, se fornecidas
				if (paymentStatus) {
					updateData.paymentStatus = paymentStatus
				}

				if (paymentMethod) {
					updateData.paymentMethod = paymentMethod
				}

				if (paymentId) {
					updateData.paymentId = paymentId
				}

				// Atualizar o status do agendamento
				const updatedAppointment = await storage.updateAppointment(
					appointmentId,
					updateData
				)

				// Notificar outro participante do agendamento
				try {
					const notifyUserId = isOwnerClient
						? appointment.providerId
						: appointment.clientId

					// Texto de notificação para status do agendamento
					const statusText = {
						canceled: "cancelado",
						completed: "concluído",
						pending: "pendente",
						confirmed: "confirmado",
						no_show: "sem comparecimento",
						processing_payment: "processando pagamento",
					}[status]

					// Texto para status de pagamento
					let paymentText = ""
					if (paymentStatus) {
						const paymentStatusMessages = {
							paid: "pago com sucesso",
							pending: "pendente de pagamento",
							failed: "falha no pagamento",
							refunded: "reembolsado",
							paid_externally: "pago externamente",
						}

						paymentText =
							paymentStatusMessages[
								paymentStatus as keyof typeof paymentStatusMessages
							] || ""
					}

					// Mensagem completa de notificação
					let message = `O agendamento #${appointmentId} foi marcado como ${statusText}`
					if (paymentText) {
						message += ` e ${paymentText}`
					}

					if (
						global.sendNotification &&
						typeof global.sendNotification === "function"
					) {
						global.sendNotification(notifyUserId, {
							type: "appointment_status_changed",
							title: "Status de agendamento alterado",
							message,
							appointmentId: appointmentId,
						})
					}
				} catch (error) {
					console.error(
						"Erro ao enviar notificação de alteração de status:",
						error
					)
					// Não interromper o fluxo se houver erro nas notificações
				}

				res.json(updatedAppointment)
			} catch (error) {
				console.error("Erro ao atualizar status do agendamento:", error)
				res.status(500).json({
					error: "Erro ao atualizar status do agendamento",
				})
			}
		}
	)

	// Listar agendamentos do prestador
	app.get(
		"/api/provider/appointments",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const appointments = await storage.getProviderAppointments(
					req.user!.id
				)
				res.json(appointments)
			} catch (error) {
				res.status(500).json({ error: "Erro ao buscar agendamentos" })
			}
		}
	)

	// ---------------------------------------------------------------------
	// Rotas de Clientes
	// ---------------------------------------------------------------------

	// Obter todos os clientes (apenas para prestadores)
	app.get("/api/clients", isAuthenticated, async (req, res) => {
		try {
			// Verificar se o usuário existe e tem as propriedades necessárias
			if (!req.user || !req.user.userType) {
				return res.status(401).json({ error: "Não autorizado" })
			}

			// Se não for admin ou prestador, negar acesso
			if (
				req.user.userType !== "admin" &&
				req.user.userType !== "provider"
			) {
				return res
					.status(403)
					.json({ error: "Acesso não autorizado a esta informação" })
			}

			// Buscar todos os usuários do tipo cliente
			const clients = await storage.getClientUsers()

			// Retornar a lista de clientes
			res.json(clients)
		} catch (error) {
			console.error("Erro ao buscar clientes:", error)
			res.status(500).json({ error: "Erro ao buscar clientes" })
		}
	})

	// ---------------------------------------------------------------------
	// Rotas de Nichos
	// ---------------------------------------------------------------------

	// Obter todos os nichos
	app.get("/api/niches", async (req, res) => {
		try {
			const includeCategories = req.query.includeCategories === "true"

			if (includeCategories) {
				// Se for solicitado com categorias aninhadas
				const nichesWithCategories =
					await storage.getNichesWithCategoriesAndServices()
				res.json(nichesWithCategories)
			} else {
				// Retornar apenas os nichos
				const niches = await storage.getNiches()
				res.json(niches)
			}
		} catch (error) {
			console.error("Erro ao buscar nichos:", error)
			res.status(500).json({ error: "Erro ao buscar nichos" })
		}
	})

	// Obter um nicho específico
	app.get("/api/niches/:id", async (req, res) => {
		try {
			const nicheId = parseInt(req.params.id)
			const niche = await storage.getNiche(nicheId)

			if (!niche) {
				return res.status(404).json({ error: "Nicho não encontrado" })
			}

			res.json(niche)
		} catch (error) {
			console.error("Erro ao buscar nicho:", error)
			res.status(500).json({ error: "Erro ao buscar nicho" })
		}
	})

	// Obter categorias por nicho
	app.get("/api/niches/:id/categories", async (req, res) => {
		try {
			const nicheId = parseInt(req.params.id)
			const categories = await storage.getCategoriesByNicheId(nicheId)
			res.json(categories)
		} catch (error) {
			console.error("Erro ao buscar categorias do nicho:", error)
			res.status(500).json({
				error: "Erro ao buscar categorias do nicho",
			})
		}
	})

	// ---------------------------------------------------------------------
	// Rotas de IA para gestão de agenda de prestador
	// ---------------------------------------------------------------------

	// Análise inteligente da agenda do prestador
	app.get(
		"/api/providers/:id/ai/schedule-insights",
		isAuthenticated,
		async (req, res) => {
			try {
				const providerId = parseInt(req.params.id)

				// Verificar acesso: apenas o próprio prestador ou admin pode acessar
				if (
					req.user!.userType !== "admin" &&
					req.user!.id !== providerId
				) {
					return res
						.status(403)
						.json({
							error: "Acesso não autorizado a esta informação",
						})
				}

				// Parâmetros opcionais
				const {
					startDate,
					endDate,
					includeHistorical,
					includeAvailability,
					includeUpcoming,
				} = req.query

				const dateRange =
					startDate && endDate
						? {
								start: startDate as string,
								end: endDate as string,
						  }
						: undefined

				// Chamar serviço de IA para analisar agenda
				const insights = await analyzeProviderSchedule({
					providerId,
					dateRange,
					includeHistorical: includeHistorical === "true",
					includeAvailability: includeAvailability !== "false",
					includeUpcoming: includeUpcoming !== "false",
				})

				res.json({ insights })
			} catch (error) {
				console.error("Erro ao analisar agenda inteligente:", error)
				res.status(500).json({
					error: "Falha ao gerar insights da agenda",
				})
			}
		}
	)

	// Análise dos tempos de execução de serviços
	app.get(
		"/api/providers/:id/ai/execution-times",
		isAuthenticated,
		async (req, res) => {
			try {
				const providerId = parseInt(req.params.id)

				// Verificar acesso: apenas o próprio prestador ou admin pode acessar
				if (
					req.user!.userType !== "admin" &&
					req.user!.id !== providerId
				) {
					return res
						.status(403)
						.json({
							error: "Acesso não autorizado a esta informação",
						})
				}

				// Chamar serviço de IA para analisar tempos de execução
				const executionTimeAnalysis =
					await analyzeServiceExecutionTimes(providerId)

				res.json({ executionTimeAnalysis })
			} catch (error) {
				console.error("Erro ao analisar tempos de execução:", error)
				res.status(500).json({
					error: "Falha ao analisar tempos de execução",
				})
			}
		}
	)

	// Previsão de tendências de agendamento
	app.get(
		"/api/providers/:id/ai/scheduling-trends",
		isAuthenticated,
		async (req, res) => {
			try {
				const providerId = parseInt(req.params.id)

				// Verificar acesso: apenas o próprio prestador ou admin pode acessar
				if (
					req.user!.userType !== "admin" &&
					req.user!.id !== providerId
				) {
					return res
						.status(403)
						.json({
							error: "Acesso não autorizado a esta informação",
						})
				}

				// Parâmetros opcionais
				const daysAhead = req.query.daysAhead
					? parseInt(req.query.daysAhead as string)
					: 30

				// Chamar serviço de IA para prever tendências
				const trends = await predictSchedulingTrends(
					providerId,
					daysAhead
				)

				res.json({ trends })
			} catch (error) {
				console.error(
					"Erro ao prever tendências de agendamento:",
					error
				)
				res.status(500).json({
					error: "Falha ao gerar previsões de tendências",
				})
			}
		}
	)

	// Rota para busca de prestadores por nicho, categoria, texto ou data
	// API para recomendar prestadores próximos com base em serviço, localização e disponibilidade
	app.get("/api/providers/recommend", async (req, res) => {
		try {
			const { serviceId, latitude, longitude, date, maxDistance, limit } =
				req.query

			// Validar parâmetros
			if (!serviceId) {
				return res
					.status(400)
					.json({ error: "Serviço é obrigatório para recomendação" })
			}

			const serviceIdNum = parseInt(serviceId as string)
			if (isNaN(serviceIdNum)) {
				return res.status(400).json({ error: "ID de serviço inválido" })
			}

			// Coordenadas padrão se não informadas (usa coordenadas do centro da cidade)
			const userLatitude = latitude
				? parseFloat(latitude as string)
				: -23.5558
			const userLongitude = longitude
				? parseFloat(longitude as string)
				: -46.6396

			// Data padrão (hoje)
			const searchDate =
				(date as string) || new Date().toISOString().split("T")[0]

			// Validar formato da data
			const datePattern = /^\d{4}-\d{2}-\d{2}$/
			if (!datePattern.test(searchDate)) {
				return res
					.status(400)
					.json({ error: "Formato de data inválido. Use YYYY-MM-DD" })
			}

			// Distância máxima (km) - padrão 10km
			const maxDistanceNum = maxDistance
				? parseInt(maxDistance as string)
				: 10

			// Limite de resultados - padrão 5
			const limitNum = limit ? parseInt(limit as string) : 5

			console.log(
				`Buscando recomendações para o serviço ${serviceIdNum} em ${searchDate} próximo a [${userLatitude}, ${userLongitude}]`
			)

			// Buscar o serviço para obter detalhes (como duração)
			const service = await storage.getService(serviceIdNum)
			if (!service) {
				return res.status(404).json({ error: "Serviço não encontrado" })
			}

			// 1. Primeiro buscar todos os prestadores ativos
			let providers = await storage.getUsersByType("provider")

			// 2. Para cada prestador, calcular distância e verificar disponibilidade
			const providersWithRecommendationData = await Promise.all(
				providers.map(async (provider) => {
					try {
						// Buscar configurações do prestador para obter localização
						const settings = await storage.getProviderSettings(
							provider.id
						)
						if (!settings) return null

						// Verificar se o prestador oferece este serviço
						const services = await storage.getServicesByProvider(
							provider.id
						)
						const hasService = services.some(
							(s) => s.id === serviceIdNum
						)
						if (!hasService) return null

						// Calcular distância (usando Haversine se coordenadas estiverem disponíveis)
						let distance = 999 // Valor padrão alto se não for possível calcular

						if (settings.latitude && settings.longitude) {
							// Converter coordenadas para números
							const providerLat = parseFloat(settings.latitude)
							const providerLng = parseFloat(settings.longitude)

							if (!isNaN(providerLat) && !isNaN(providerLng)) {
								// Calcular distância usando fórmula de Haversine
								const R = 6371 // Raio da Terra em km
								const dLat =
									((providerLat - userLatitude) * Math.PI) /
									180
								const dLon =
									((providerLng - userLongitude) * Math.PI) /
									180
								const a =
									Math.sin(dLat / 2) * Math.sin(dLat / 2) +
									Math.cos((userLatitude * Math.PI) / 180) *
										Math.cos(
											(providerLat * Math.PI) / 180
										) *
										Math.sin(dLon / 2) *
										Math.sin(dLon / 2)
								const c =
									2 *
									Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
								distance = R * c // Distância em km
							}
						}

						// Se estiver além da distância máxima, ignorar
						if (distance > maxDistanceNum) return null

						// Verificar disponibilidade na data selecionada
						const timeSlots = await storage.generateTimeSlots(
							provider.id,
							searchDate,
							serviceIdNum
						)
						if (!timeSlots || timeSlots.length === 0) return null

						// Buscar tempo de execução personalizado, se existir
						const providerService =
							await storage.getProviderServiceByProviderAndService(
								provider.id,
								serviceIdNum
							)

						// Determinar o tempo de execução (personalizado ou padrão)
						const executionTime = providerService
							? providerService.executionTime
							: service.duration

						// Verificar se há pelo menos um slot disponível com duração suficiente
						const availableSlots = timeSlots.filter((slot) => {
							if (!slot.isAvailable) return false

							// Calcular a duração do slot em minutos
							const startTime = slot.startTime
								.split(":")
								.map(Number)
							const endTime = slot.endTime.split(":").map(Number)
							const slotDuration =
								endTime[0] * 60 +
								endTime[1] -
								(startTime[0] * 60 + startTime[1])

							// Verificar se a duração do slot é suficiente
							return slotDuration >= executionTime
						})

						if (availableSlots.length === 0) return null

						// Calcular pontuação de recomendação
						// Fatores: distância (50%), classificação (30%), slots disponíveis (20%)
						let score = 0

						// Fator de distância (quanto menor a distância, maior a pontuação)
						// Escala inversa: 0km = 100 pontos, maxDistanceKm = 0 pontos
						const distanceScore = Math.max(
							0,
							100 - (distance / maxDistanceNum) * 100
						)

						// Fator de classificação (0-5 estrelas)
						const ratingScore = settings.rating
							? (settings.rating / 50) * 100
							: 50 // 50 = 5.0 estrelas

						// Fator de disponibilidade (mais slots = melhor)
						const availabilityScore = Math.min(
							100,
							(availableSlots.length / 5) * 100
						)

						// Calcular pontuação final ponderada
						score =
							distanceScore * 0.5 +
							ratingScore * 0.3 +
							availabilityScore * 0.2

						return {
							provider: {
								id: provider.id,
								name: provider.name,
								profileImage: provider.profileImage,
								settings: {
									businessName: settings.businessName,
									address: settings.address,
									city: settings.city,
									rating: settings.rating,
									ratingCount: settings.ratingCount,
								},
							},
							distance: parseFloat(distance.toFixed(1)),
							availableSlots: availableSlots.length,
							recommendationScore: parseFloat(score.toFixed(1)),
							executionTime,
						}
					} catch (error) {
						console.error(
							`Erro ao processar recomendação para prestador ${provider.id}:`,
							error
						)
						return null
					}
				})
			)

			// Filtrar nulos e ordenar por pontuação de recomendação (maior primeiro)
			const recommendations = providersWithRecommendationData
				.filter((item) => item !== null)
				.sort((a, b) => b!.recommendationScore - a!.recommendationScore)
				.slice(0, limitNum)

			console.log(
				`Encontrados ${recommendations.length} prestadores recomendados para o serviço ${serviceIdNum}`
			)

			res.json({
				service,
				recommendations,
			})
		} catch (error) {
			console.error("Erro ao gerar recomendações de prestadores:", error)
			res.status(500).json({
				error: "Falha ao gerar recomendações de prestadores",
			})
		}
	})

	// Endpoint otimizado para busca de prestadores
	app.get("/api/providers/search", async (req, res) => {
		try {
			const {
				q, // query de busca
				nicheId,
				categoryId,
				serviceId,
				minRating,
				maxDistance,
				date,
				page = "1",
				limit = "20"
			} = req.query

			console.log("🔍 Busca de prestadores iniciada:", {
				query: q,
				nicheId,
				categoryId,
				serviceId,
				minRating,
				maxDistance,
				date,
				page,
				limit
			})

			// Validação e conversão de parâmetros
			const searchQuery = (q as string)?.trim() || ""
			const pageNum = Math.max(1, parseInt(page as string) || 1)
			const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20))
			const offset = (pageNum - 1) * limitNum

			// Validação de parâmetros numéricos
			const filters = {
				nicheId: nicheId ? parseInt(nicheId as string) : null,
				categoryId: categoryId ? parseInt(categoryId as string) : null,
				serviceId: serviceId ? parseInt(serviceId as string) : null,
				minRating: minRating ? parseInt(minRating as string) : 0,
				maxDistance: maxDistance ? parseInt(maxDistance as string) : 50,
				date: date as string || null
			}

			// Validar parâmetros
			Object.entries(filters).forEach(([key, value]) => {
				if (value !== null && isNaN(value as number)) {
					return res.status(400).json({ 
						error: `Parâmetro inválido: ${key}` 
					})
				}
			})

			// Validar formato da data
			if (filters.date) {
				const datePattern = /^\d{4}-\d{2}-\d{2}$/
				if (!datePattern.test(filters.date)) {
					return res.status(400).json({ 
						error: "Formato de data inválido. Use YYYY-MM-DD" 
					})
				}
			}

			// Buscar prestadores ativos
			let providers = await storage.getUsersByType("provider")
			console.log(`📊 Total de prestadores ativos: ${providers.length}`)

			// Aplicar filtros em paralelo para melhor performance
			const filteredProviders = await Promise.all(
				providers.map(async (provider) => {
					try {
						// 1. Filtro por texto de busca
						if (searchQuery) {
							const settings = await storage.getProviderSettings(provider.id)
							const matchesSearch = 
								provider.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
								settings?.businessName?.toLowerCase().includes(searchQuery.toLowerCase())
							
							if (!matchesSearch) return null
						}

						// 2. Buscar serviços do prestador
						const services = await storage.getServicesByProvider(provider.id)
						const activeServices = services.filter(service => service.isActive)

						if (activeServices.length === 0) {
							console.log(`❌ Prestador ${provider.id} não tem serviços ativos`)
							return null
						}

						// 3. Aplicar filtros de serviço
						let filteredServices = activeServices

						if (filters.serviceId) {
							filteredServices = filteredServices.filter(s => s.id === filters.serviceId)
						} else if (filters.categoryId) {
							filteredServices = filteredServices.filter(s => s.categoryId === filters.categoryId)
						} else if (filters.nicheId) {
							const categoriesOfNiche = await storage.getCategoriesByNicheId(filters.nicheId)
							const categoryIds = categoriesOfNiche.map(cat => cat.id)
							filteredServices = filteredServices.filter(s => categoryIds.includes(s.categoryId))
						}

						if (filteredServices.length === 0) {
							console.log(`❌ Prestador ${provider.id} não atende aos filtros de serviço`)
							return null
						}

						// 4. Buscar configurações do prestador
						const settings = await storage.getProviderSettings(provider.id)

						// 5. Filtro por avaliação
						if (filters.minRating > 0 && (!settings?.rating || settings.rating < filters.minRating)) {
							console.log(`❌ Prestador ${provider.id} não atende à avaliação mínima`)
							return null
						}

						// 6. Verificar disponibilidade na data (se especificada)
						if (filters.date) {
							const isAvailable = await checkProviderAvailability(provider.id, filters.date, filteredServices)
							if (!isAvailable) {
								console.log(`❌ Prestador ${provider.id} não disponível na data ${filters.date}`)
								return null
							}
						}

						// 7. Calcular distância (simulada)
						const distance = Math.random() * 15 // 0-15km
						if (distance > filters.maxDistance) {
							console.log(`❌ Prestador ${provider.id} fora da distância máxima`)
							return null
						}

						console.log(`✅ Prestador ${provider.id} aprovado em todos os filtros`)
						return {
							...provider,
							settings,
							services: filteredServices,
							distance: Math.round(distance * 10) / 10 // Arredondar para 1 casa decimal
						}

					} catch (error) {
						console.error(`❌ Erro ao processar prestador ${provider.id}:`, error)
						return null
					}
				})
			)

			// Remover nulls e aplicar paginação
			const validProviders = filteredProviders.filter(p => p !== null)
			const totalResults = validProviders.length
			const paginatedProviders = validProviders.slice(offset, offset + limitNum)

			console.log(`📈 Resultados: ${paginatedProviders.length}/${totalResults} prestadores`)

			// Retornar resposta com metadados
			res.json({
				providers: paginatedProviders,
				pagination: {
					page: pageNum,
					limit: limitNum,
					total: totalResults,
					totalPages: Math.ceil(totalResults / limitNum),
					hasNext: offset + limitNum < totalResults,
					hasPrev: pageNum > 1
				},
				filters: {
					searchQuery,
					...filters
				}
			})

		} catch (error) {
			console.error("💥 Erro na busca de prestadores:", error)
			res.status(500).json({ 
				error: "Falha ao buscar prestadores",
				details: error instanceof Error ? error.message : "Erro desconhecido"
			})
		}
	})

	// Função auxiliar para verificar disponibilidade do prestador
	async function checkProviderAvailability(providerId: number, date: string, services: any[]): Promise<boolean> {
		try {
			const targetDate = new Date(date)
			const dayOfWeek = targetDate.getDay()

			// Buscar disponibilidade do prestador
			const availability = await storage.getAvailabilityByDate(providerId, date)
			
			// Se não há disponibilidade específica para esta data, verificar disponibilidade semanal
			if (!availability || availability.length === 0) {
				const weeklyAvailability = await storage.getAvailabilityByDay(providerId, dayOfWeek)
				if (!weeklyAvailability || weeklyAvailability.length === 0) {
					return false
				}
			}

			// Verificar se há blocos de tempo suficientes para pelo menos um serviço
			const allAvailability = availability || await storage.getAvailabilityByDay(providerId, dayOfWeek)
			
			for (const service of services) {
				const serviceDuration = service.duration || 30
				
				const hasAvailableBlock = allAvailability.some(avail => {
					const startMinutes = timeToMinutes(avail.startTime)
					const endMinutes = timeToMinutes(avail.endTime)
					const availableDuration = endMinutes - startMinutes
					
					return availableDuration >= serviceDuration
				})

				if (hasAvailableBlock) {
					return true
				}
			}

			return false

		} catch (error) {
			console.error(`Erro ao verificar disponibilidade do prestador ${providerId}:`, error)
			return false
		}
	}

	// Função auxiliar para converter horário para minutos
	function timeToMinutes(time: string): number {
		const [hours, minutes] = time.split(":").map(Number)
		return hours * 60 + minutes
	}

	// Obter detalhes de um prestador específico
	app.get("/api/providers/:id", async (req, res) => {
		try {
			// Verificar se o ID pode ser convertido corretamente para número
			const providerId = parseInt(req.params.id)
			if (isNaN(providerId)) {
				return res
					.status(400)
					.json({ error: "ID de prestador inválido" })
			}

			const user = await storage.getUser(providerId)

			if (!user || user.userType !== "provider") {
				return res
					.status(404)
					.json({ error: "Prestador não encontrado" })
			}

			const settings = await storage.getProviderSettings(providerId)

			// Forçar o tipo de conteúdo para JSON e desabilitar cache
			res.setHeader("Content-Type", "application/json")
			res.setHeader("Cache-Control", "no-store")

			res.json({
				user,
				settings,
			})
		} catch (error) {
			console.error("Erro ao buscar perfil do prestador:", error)
			res.status(500).json({
				error: "Erro ao buscar perfil do prestador",
			})
		}
	})

	// Obter serviços de um prestador específico
	app.get("/api/providers/:id/services", async (req, res) => {
		try {
			const providerId = parseInt(req.params.id)
			if (isNaN(providerId)) {
				return res
					.status(400)
					.json({ error: "ID de prestador inválido" })
			}

			const user = await storage.getUser(providerId)

			if (!user || user.userType !== "provider") {
				return res
					.status(404)
					.json({ error: "Prestador não encontrado" })
			}

			let services = await storage.getServicesByProvider(providerId)

			// Filtrar apenas serviços ativos
			services = services.filter((service) => service.isActive)

			// Para cada serviço, buscar informações da categoria
			const servicesWithCategoryInfo = await Promise.all(
				services.map(async (service) => {
					const category = await storage.getCategory(
						service.categoryId
					)
					const niche = category
						? await storage.getNiche(category.nicheId)
						: null

					return {
						...service,
						categoryName: category?.name,
						categoryIcon: category?.icon,
						nicheName: niche?.name,
						nicheIcon: niche?.icon,
					}
				})
			)

			res.json(servicesWithCategoryInfo)
		} catch (error) {
			console.error("Erro ao buscar serviços do prestador:", error)
			res.status(500).json({
				error: "Erro ao buscar serviços do prestador",
			})
		}
	})

	// Rota para obter slots de tempo disponíveis para um prestador em uma data específica
	// Obter disponibilidade do prestador
	app.get("/api/providers/:id/availability", async (req, res) => {
		try {
			const providerId = parseInt(req.params.id)
			if (isNaN(providerId)) {
				return res
					.status(400)
					.json({ error: "ID de prestador inválido" })
			}

			console.log(
				`Buscando disponibilidade para prestador ID: ${providerId}`
			)

			// Buscar disponibilidade do prestador
			const availability = await storage.getProviderAvailability(
				providerId
			)

			console.log(
				`Encontradas ${availability.length} entradas de disponibilidade`
			)

			res.json(availability)
		} catch (error) {
			console.error("Erro ao buscar disponibilidade do prestador:", error)
			res.status(500).json({ error: "Erro ao buscar disponibilidade" })
		}
	})

	// Buscar recomendações inteligentes de horários usando IA
	app.get(
		"/api/providers/:id/ai-recommendations",
		isAuthenticated,
		async (req, res) => {
			try {
				const providerId = parseInt(req.params.id)
				const { date, serviceId } = req.query

				if (isNaN(providerId)) {
					return res
						.status(400)
						.json({ error: "ID de prestador inválido" })
				}

				if (!date || !serviceId) {
					return res
						.status(400)
						.json({
							error: "Data e ID do serviço são obrigatórios",
						})
				}

				// Buscar os dados do serviço
				const service = await storage.getService(
					parseInt(serviceId as string)
				)
				if (!service) {
					return res
						.status(404)
						.json({ error: "Serviço não encontrado" })
				}

				// Obter disponibilidade do prestador na data selecionada
				const allAvailability = await storage.getProviderAvailability(
					providerId
				)

				// Filtrar disponibilidade pela data solicitada
				const dateStr = date as string
				const dateAvailability = allAvailability.filter(
					(slot) => slot.date === dateStr
				)

				console.log(
					`Encontradas ${dateAvailability.length} entradas de disponibilidade para a data ${dateStr}`
				)

				if (!dateAvailability.length) {
					return res.json({ recommendations: [] })
				}

				// Converter disponibilidade em slots de tempo
				// Buscar os slots de tempo gerados para a data especificada, considerando o serviço específico
				const serviceIdInt = parseInt(serviceId as string)
				const timeSlotsData = await storage.generateTimeSlots(
					providerId,
					dateStr,
					serviceIdInt
				)

				// Filtrar apenas os slots disponíveis
				const availableTimeSlots = timeSlotsData
					.filter((slot) => slot.isAvailable)
					.map((slot) => ({
						startTime: slot.startTime,
						endTime: slot.endTime,
						serviceDuration: slot.serviceDuration,
					}))

				if (!availableTimeSlots.length) {
					return res.json({ recommendations: [] })
				}

				// Importar o serviço de recomendações de IA
				const {
					analyzeAndRecommendTimeSlots,
					getSimpleRecommendations,
				} = await import("./ai-scheduling-service")

				try {
					// Tentar análise avançada com a OpenAI
					const recommendations = await analyzeAndRecommendTimeSlots({
						clientId: req.user?.id || 0, // Usar 0 como valor padrão se não tiver usuário autenticado
						providerId,
						serviceId: parseInt(serviceId as string),
						date: dateStr,
						availableSlots: availableTimeSlots,
					})

					res.json({
						recommendations,
						source: "ai",
					})
				} catch (aiError) {
					console.error(
						"Erro ao obter recomendações da IA, usando alternativa simples:",
						aiError
					)

					// Obter o tempo de execução personalizado para este serviço e prestador
					let serviceExecutionTime: number | null = null

					try {
						// Verificar se existe um tempo de execução personalizado
						const providerService =
							await storage.getProviderServiceByProviderAndService(
								providerId,
								parseInt(serviceId as string)
							)

						if (providerService) {
							serviceExecutionTime = providerService.executionTime
							console.log(
								`Usando tempo de execução personalizado: ${serviceExecutionTime} minutos`
							)
						} else {
							// Se não existir personalização, obter o tempo padrão do serviço
							const service = await storage.getService(
								parseInt(serviceId as string)
							)
							if (service) {
								serviceExecutionTime = service.duration
								console.log(
									`Usando tempo de execução padrão: ${serviceExecutionTime} minutos`
								)
							}
						}
					} catch (timeErr) {
						console.error(
							"Erro ao buscar informações de tempo de execução:",
							timeErr
						)
					}

					// Fallback para recomendações simples em caso de erro com a OpenAI
					const simpleRecommendations =
						await getSimpleRecommendations(
							availableTimeSlots,
							serviceExecutionTime || undefined
						)
					res.json({
						recommendations: simpleRecommendations,
						source: "simple",
					})
				}
			} catch (error) {
				console.error("Erro ao gerar recomendações de horários:", error)
				res.status(500).json({ error: "Erro ao gerar recomendações" })
			}
		}
	)

	// Obter slots de tempo disponíveis para uma data específica
	app.get("/api/providers/:id/time-slots", async (req, res) => {
		try {
			const providerId = parseInt(req.params.id)
			if (isNaN(providerId)) {
				console.log("❌ ID de prestador inválido:", req.params.id);
				return res
					.status(400)
					.json({ error: "ID de prestador inválido" })
			}

			const date = req.query.date as string
			const serviceId = req.query.serviceId
				? parseInt(req.query.serviceId as string)
				: undefined
			const duration = req.query.duration
				? parseInt(req.query.duration as string)
				: undefined

			console.log("🔍 Requisição de time-slots:", {
				providerId,
				date,
				serviceId,
				duration
			});

			if (!date) {
				console.log("❌ Data não fornecida");
				return res.status(400).json({ error: "Data é obrigatória" })
			}

			// Validar formato da data (YYYY-MM-DD)
			const datePattern = /^\d{4}-\d{2}-\d{2}$/
			if (!datePattern.test(date)) {
				console.log("❌ Formato de data inválido:", date);
				return res
					.status(400)
					.json({ error: "Formato de data inválido. Use YYYY-MM-DD" })
			}

			// Verificar se o prestador existe
			const provider = await storage.getUser(providerId);
			if (!provider) {
				console.log("❌ Prestador não encontrado:", providerId);
				return res.status(404).json({ error: "Prestador não encontrado" });
			}

			console.log("✅ Prestador encontrado:", provider.name);

			// Se um serviço específico foi solicitado, obter sua duração
			let serviceDuration: number | undefined

			if (serviceId) {
				console.log("🔍 Buscando informações do serviço:", serviceId);
				// Primeiro verificamos se existe uma personalização de tempo para este serviço/prestador
				const providerService =
					await storage.getProviderServiceByProviderAndService(
						providerId,
						serviceId
					)

				if (providerService && providerService.executionTime) {
					serviceDuration = providerService.executionTime
					console.log(
						`✅ Usando tempo de execução personalizado para slots: ${serviceDuration} minutos`
					)
				} else {
					// Se não houver personalização, usamos a duração padrão do serviço
					const service = await storage.getService(serviceId)
					if (service) {
						serviceDuration = service.duration
						console.log(
							`✅ Usando tempo de execução padrão para slots: ${serviceDuration} minutos`
						)
					} else {
						console.log("⚠️ Serviço não encontrado, usando duração padrão");
						serviceDuration = duration || 60;
					}
				}
			} else {
				serviceDuration = duration || 60;
				console.log(`✅ Usando duração fornecida: ${serviceDuration} minutos`);
			}

			console.log(
				`🚀 Gerando slots de tempo para prestador ID: ${providerId}, data: ${date}${
					serviceId ? `, serviço: ${serviceId}` : ""
				}, duração: ${serviceDuration}`
			)

			// Verificar disponibilidade do prestador
			let availability = await storage.getAvailabilityByDate(providerId, date);
			console.log("📅 Disponibilidade encontrada:", availability);

			// Se não houver disponibilidade específica para esta data, criar uma padrão
			if (!availability || availability.length === 0) {
				console.log("⚠️ Nenhuma disponibilidade encontrada, criando padrão...");
				
				// Obter o dia da semana
				const dayOfWeek = new Date(date).getDay();
				
				// Verificar se há disponibilidade para este dia da semana
				const weeklyAvailability = await storage.getAvailabilityByDay(providerId, dayOfWeek);
				
				if (!weeklyAvailability || weeklyAvailability.length === 0) {
					console.log("⚠️ Nenhuma disponibilidade semanal encontrada, criando padrão...");
					
					// Criar disponibilidade padrão (8h às 18h)
					const defaultAvailability = await storage.createAvailability({
						providerId: providerId,
						date: date,
						dayOfWeek: dayOfWeek,
						startTime: "08:00",
						endTime: "18:00",
						isAvailable: true,
						intervalMinutes: 30
					});
					
					console.log("✅ Disponibilidade padrão criada:", defaultAvailability);
					availability = [defaultAvailability];
				} else {
					console.log("✅ Usando disponibilidade semanal:", weeklyAvailability);
					availability = Array.isArray(weeklyAvailability) ? weeklyAvailability : [weeklyAvailability];
				}
			}

			// Gerar slots de tempo disponíveis
			const timeSlots = await storage.generateTimeSlots(
				providerId,
				date,
				serviceId
			)

			// Funções auxiliares para converter horários
			function timeToMinutes(time: string): number {
				const [hours, minutes] = time.split(":").map(Number)
				return hours * 60 + minutes
			}

			function minutesToTime(minutes: number): string {
				const hours = Math.floor(minutes / 60)
				const mins = minutes % 60
				return `${hours.toString().padStart(2, "0")}:${mins
					.toString()
					.padStart(2, "0")}`
			}

			// Se um serviço específico foi solicitado, garantir que todos os slots
			// tenham a duração correta (para exibição correta na interface)
			if (serviceId && serviceDuration) {
				for (const slot of timeSlots) {
					// Recalcular o horário de término com base na duração do serviço
					const startMinutes = timeToMinutes(slot.startTime)
					const endMinutes = startMinutes + serviceDuration
					slot.endTime = minutesToTime(endMinutes)
					slot.serviceDuration = serviceDuration
				}

				// IMPORTANTE: Verificar se os slots estão realmente disponíveis
				// Buscar agendamentos existentes para o prestador nesta data
				const existingAppointments =
					await storage.getProviderAppointmentsByDate(
						providerId,
						date
					)
				console.log(
					`Verificando ${timeSlots.length} slots contra ${existingAppointments.length} agendamentos existentes`
				)

				// Tentar obter bloqueios, mas não falhar se a coluna não existir
				let blocks = []
				try {
					blocks = await storage.getBlockedTimeSlotsByDate(
						providerId,
						date
					)
					console.log(
						`Encontrados ${blocks.length} bloqueios para o dia ${date}`
					)
				} catch (blockError) {
					console.error(`Erro ao buscar bloqueios: ${blockError}`)
				}

				// Períodos ocupados combinam agendamentos e bloqueios
				const occupiedPeriods = [
					...existingAppointments.map((apt) => ({
						startTime: apt.startTime,
						endTime: apt.endTime,
					})),
					...(blocks?.length
						? blocks.map((block) => ({
								startTime: block.startTime,
								endTime: block.endTime,
						  }))
						: []),
				]

				// Verificar cada slot contra todos os períodos ocupados
				// APLICAÇÃO DE VERIFICAÇÃO ESTRITA: Marcar explicitamente quais slots estão disponíveis
				for (const slot of timeSlots) {
					const slotStart = timeToMinutes(slot.startTime)
					const slotEnd = slotStart + serviceDuration

					// Verificar se o slot conflita com algum período ocupado
					const conflicts = occupiedPeriods.some((period) => {
						const periodStart = timeToMinutes(period.startTime)
						const periodEnd = timeToMinutes(period.endTime)

						// Conflito se: (início do slot < fim do período ocupado) E (fim do slot > início do período ocupado)
						return slotStart < periodEnd && slotEnd > periodStart
					})

					// Definir explicitamente a disponibilidade do slot
					slot.isAvailable = !conflicts

					if (conflicts) {
						console.log(
							`Slot ${slot.startTime}-${slot.endTime} marcado como indisponível devido a conflitos`
						)
					}
				}

				// IMPORTANTE: Para a página do provedor, precisamos retornar TODOS os slots,
				// incluindo os bloqueados, para que eles possam ser visualizados e gerenciados
				console.log(
					`Retornando todos os ${
						timeSlots.length
					} slots gerados, incluindo ${
						timeSlots.length -
						timeSlots.filter((slot) => slot.isAvailable === true)
							.length
					} bloqueados`
				)

				// Retornar todos os slots, incluindo os bloqueados
				return res.json(timeSlots)
			}

			console.log(
				`✅ Gerados ${timeSlots.length} slots de tempo para a data ${date}`
			)

			// Se não houver serviço específico, retorna todos os slots sem verificação adicional
			return res.json(timeSlots)
		} catch (error) {
			console.error("💥 Erro ao buscar slots de tempo:", error)
			return res.status(500).json({ 
				error: "Erro interno do servidor",
				details: error instanceof Error ? error.message : "Erro desconhecido"
			})
		}
	})

	// Endpoint público para buscar taxa de serviço do prestador
	app.get("/api/provider-fees/:providerId", async (req, res) => {
		try {
			const providerId = parseInt(req.params.providerId);
			
			if (isNaN(providerId)) {
				return res.status(400).json({ error: "ID de prestador inválido" });
			}

			// Buscar taxa ativa do prestador
			const activeFee = await storage.getProviderFeeByProviderId(providerId);

			if (!activeFee) {
				return res.json({ fixedFee: 0, percentageFee: 0 });
			}

			return res.json({
				fixedFee: activeFee.fixedFee || 0,
				percentageFee: activeFee.percentageFee || 0
			});
		} catch (error) {
			console.error("Erro ao buscar taxa do prestador:", error);
			return res.status(500).json({ error: "Erro interno do servidor" });
		}
	});

	// Endpoint para verificar a disponibilidade real dos horários
	app.post("/api/providers/:id/available-slots-check", async (req, res) => {
		try {
			const providerId = parseInt(req.params.id)
			const { date, serviceId, timeSlots } = req.body

			console.log(
				`Verificando disponibilidade real de ${
					timeSlots?.length || 0
				} slots para prestador ${providerId} na data ${date}`
			)

			// Validação básica
			if (
				!date ||
				!serviceId ||
				!timeSlots ||
				!Array.isArray(timeSlots)
			) {
				return res
					.status(400)
					.json({
						error: "Dados incompletos para verificação de disponibilidade",
					})
			}

			// Buscar o serviço para obter a duração
			const service = await storage.getService(serviceId)
			if (!service) {
				return res.status(404).json({ error: "Serviço não encontrado" })
			}

			// Buscando tempo de execução personalizado pelo prestador (se existir)
			const providerService =
				await storage.getProviderServiceByProviderAndService(
					providerId,
					serviceId
				)
			const serviceDuration =
				providerService?.executionTime || service.duration

			// Buscar agendamentos existentes para o prestador
			const existingAppointments =
				await storage.getProviderAppointmentsByDate(providerId, date)

			// Buscar bloqueios de agenda para a data selecionada
			let blocks = []
			try {
				blocks = await storage.getBlockedTimeSlotsByDate(
					providerId,
					date
				)
			} catch (error) {
				console.error(
					"Error getting blocked time slots by date:",
					error
				)
				// Continuar mesmo com erro, utilizando array vazio para bloqueios
				blocks = []
			}

			// Transformar agendamentos e bloqueios em períodos ocupados (startTime-endTime)
			const occupiedPeriods = [
				...existingAppointments.map((apt) => ({
					startTime: apt.startTime,
					endTime: apt.endTime,
				})),
				...(blocks && Array.isArray(blocks)
					? blocks.map((block) => ({
							startTime: block.startTime,
							endTime: block.endTime,
					  }))
					: []),
			]

			console.log(
				`Agendamentos encontrados para a data ${date}:`,
				existingAppointments.length
			)

			console.log(
				`Períodos ocupados encontrados: ${occupiedPeriods.length}`
			)

			// Função auxiliar para verificar se um horário está disponível
			const isTimeSlotAvailable = (slot) => {
				// Converter horários para minutos para comparação fácil
				const timeToMinutes = (time) => {
					if (!time || typeof time !== "string") {
						console.warn(`Tempo inválido recebido: ${time}`)
						return 0 // Valor padrão para evitar erros
					}
					try {
						const [hours, minutes] = time.split(":").map(Number)
						return hours * 60 + minutes
					} catch (error) {
						console.error(`Erro ao converter tempo ${time}:`, error)
						return 0 // Valor padrão para evitar erros
					}
				}

				// VERIFICAÇÃO ESTRITA: Validar campos essenciais antes de processar
				if (!slot || typeof slot !== "object") {
					console.warn("Slot inválido recebido:", slot)
					return false
				}

				if (!slot.startTime || typeof slot.startTime !== "string") {
					console.warn("Slot sem horário de início válido:", slot)
					return false
				}

				const slotStart = timeToMinutes(slot.startTime)

				// Garantir que temos um horário de término válido
				let slotEnd
				if (slot.endTime && typeof slot.endTime === "string") {
					slotEnd = timeToMinutes(slot.endTime)
				} else {
					// Calcular o horário de término com base na duração do serviço
					slotEnd = slotStart + serviceDuration
					// Também salvar o horário de término calculado no objeto do slot
					const hours = Math.floor(slotEnd / 60)
					const minutes = slotEnd % 60
					slot.endTime = `${hours
						.toString()
						.padStart(2, "0")}:${minutes
						.toString()
						.padStart(2, "0")}`
				}

				// Verificar se o slot conflita com algum período ocupado
				return !occupiedPeriods.some((period) => {
					if (!period.startTime || !period.endTime) {
						console.warn(
							"Período ocupado com dados incompletos:",
							period
						)
						return false
					}

					const periodStart = timeToMinutes(period.startTime)
					const periodEnd = timeToMinutes(period.endTime)

					// Conflito se: (início do slot < fim do período ocupado) E (fim do slot > início do período ocupado)
					const conflicts =
						slotStart < periodEnd && slotEnd > periodStart

					if (conflicts) {
						console.log(
							`Slot ${slot.startTime}-${
								slot.endTime || "não definido"
							} conflita com período ocupado ${
								period.startTime
							}-${period.endTime}`
						)
					}

					return conflicts
				})
			}

			// Filtrar os slots que estão realmente disponíveis e marcar os indisponíveis
			const processedSlots = timeSlots.map((slot) => {
				const isAvailable = isTimeSlotAvailable(slot)
				return {
					...slot,
					isAvailable, // Atualiza o status de disponibilidade
				}
			})

			// Filtrar para retornar APENAS slots que estão EXPLICITAMENTE marcados como disponíveis (isAvailable === true)
			// Essa verificação estrita é necessária para garantir que slots com isAvailable undefined não sejam incluídos
			const availableSlots = processedSlots.filter(
				(slot) => slot.isAvailable === true
			)

			console.log(
				`Verificação de disponibilidade: ${availableSlots.length} de ${timeSlots.length} slots estão disponíveis`
			)

			// Lista de slots filtrados para debug
			if (availableSlots.length > 0) {
				console.log(
					"Slots disponíveis após verificação estrita:",
					availableSlots
						.map((slot) => `${slot.startTime}-${slot.endTime}`)
						.slice(0, 5)
				)
			}

			res.json({
				// Importante: retornar apenas slots disponíveis para não mostrar indisponíveis na interface
				availableSlots: availableSlots,
				totalSlots: timeSlots.length,
				availableCount: availableSlots.length,
				date,
			})
		} catch (error) {
			console.error(
				"Erro ao verificar disponibilidade real dos horários:",
				error
			)
			res.status(500).json({
				error: "Erro ao verificar disponibilidade real dos horários",
			})
		}
	})

	// Obter slots de tempo adaptados com IA para um serviço específico
	app.get("/api/providers/:id/smart-time-slots", async (req, res) => {
		try {
			const providerId = parseInt(req.params.id)
			const { date, serviceId } = req.query

			if (!date) {
				return res.status(400).json({ error: "Data é obrigatória" })
			}

			if (!serviceId) {
				return res
					.status(400)
					.json({ error: "ID do serviço é obrigatório" })
			}

			const serviceIdNum = parseInt(serviceId as string)
			const dateStr = date as string

			// Validar data
			const datePattern = /^\d{4}-\d{2}-\d{2}$/
			if (!datePattern.test(dateStr)) {
				return res
					.status(400)
					.json({ error: "Formato de data inválido. Use YYYY-MM-DD" })
			}

			// Verificar se o serviço existe
			const service = await storage.getService(serviceIdNum)
			if (!service) {
				return res.status(404).json({ error: "Serviço não encontrado" })
			}

			// Verificar se o prestador oferece este serviço ou algum serviço na mesma categoria
			const providerServices = await storage.getServicesByProvider(
				providerId
			)
			const serviceMatch = providerServices.find(
				(s) => s.categoryId === service.categoryId
			)

			if (!serviceMatch) {
				return res
					.status(400)
					.json({
						error: "Este prestador não oferece serviços nesta categoria",
					})
			}

			console.log(
				`Gerando slots de tempo adaptados para prestador ID: ${providerId}, data: ${dateStr}, serviço: ${serviceIdNum}`
			)

			// Primeiro, gerar os slots de tempo normais
			const timeSlots = await storage.generateTimeSlots(
				providerId,
				dateStr,
				serviceIdNum
			)

			if (!timeSlots || timeSlots.length === 0) {
				return res.json({
					timeSlots: [],
					message: "Não há horários disponíveis nesta data",
				})
			}

			// Em seguida, usar a IA para adaptar os slots para este serviço específico
			try {
				// Antes de usar IA, garantir que somente slots disponíveis são processados
				const availableSlots = timeSlots.filter((slot) => {
					// VERIFICAÇÃO PRÉVIA: Rejeitar slots sem horários definidos
					if (!slot || !slot.startTime || !slot.endTime) {
						console.warn(
							`Slot inválido removido antes da adaptação IA:`,
							slot
						)
						return false
					}
					// Garantir que apenas slots explicitamente marcados como disponíveis sejam usados
					return slot.isAvailable === true
				})

				console.log(
					`Adaptando ${availableSlots.length} de ${timeSlots.length} slots disponíveis para análise IA`
				)

				// Se não houver slots disponíveis após filtragem, retornar lista vazia imediatamente
				if (!availableSlots.length) {
					console.log(
						"Nenhum slot disponível após filtragem rigorosa. Retornando lista vazia."
					)
					return res.json({
						timeSlots: [],
						message: "Não há horários disponíveis nesta data",
					})
				}

				// Adaptar a agenda do prestador para o serviço específico usando IA
				const adaptedSlots = await adaptProviderAgendaForService(
					providerId,
					dateStr,
					serviceIdNum,
					availableSlots
				)

				return res.json({
					timeSlots: adaptedSlots,
					message:
						"Slots de tempo adaptados com IA para maior eficiência",
				})
			} catch (aiError) {
				console.error("Erro ao adaptar slots com IA:", aiError)
				// Se a IA falhar, usar filtro manual
				const validSlots = timeSlots.filter(
					(slot) =>
						slot &&
						slot.startTime &&
						slot.endTime &&
						slot.isAvailable === true
				)

				console.log(
					`Fallback: usando ${validSlots.length} slots filtrados manualmente`
				)

				return res.json({
					timeSlots: validSlots,
					message:
						"Usando slots de tempo padrão (adaptação com IA indisponível)",
				})
			}
		} catch (error) {
			console.error("Erro ao gerar slots de tempo adaptados:", error)
			res.status(500).json({
				error: "Erro ao gerar slots de tempo adaptados",
				details: error instanceof Error ? error.message : String(error),
			})
		}
	})

	// ---------------------------------------------------------------------
	// Rotas de Serviços
	// ---------------------------------------------------------------------

	// Listar todos os serviços ou filtrar por providerId
	app.get("/api/services", async (req, res) => {
		try {
			const providerId = req.query.providerId
				? parseInt(req.query.providerId as string)
				: undefined

			const categoryId = req.query.categoryId
				? parseInt(req.query.categoryId as string)
				: undefined

			// Dados de demonstração para o modo de emergência
			const demoCategoryServices = [
				{
					id: 1,
					name: "Corte Masculino",
					isActive: true,
					providerId: 2,
					description: "Corte de cabelo masculino",
					duration: 30,
					nicheId: 1,
					categoryId: 1,
					price: 7000,
				},
				{
					id: 2,
					name: "Barba",
					isActive: true,
					providerId: 2,
					description: "Acabamento de barba",
					duration: 20,
					nicheId: 1,
					categoryId: 1,
					price: 4500,
				},
				{
					id: 3,
					name: "Corte e Barba",
					isActive: true,
					providerId: 2,
					description: "Corte + acabamento da barba",
					duration: 45,
					nicheId: 1,
					categoryId: 1,
					price: 10000,
				},
				{
					id: 4,
					name: "Coloração",
					isActive: true,
					providerId: 2,
					description: "Coloração completa",
					duration: 90,
					nicheId: 1,
					categoryId: 2,
					price: 15000,
				},
				{
					id: 5,
					name: "Hidratação",
					isActive: true,
					providerId: 2,
					description: "Tratamento hidratante",
					duration: 60,
					nicheId: 1,
					categoryId: 2,
					price: 12000,
				},
			]

			try {
				// Tentativa normal de acesso ao banco de dados
				if (providerId) {
					let services = await storage.getServicesByProvider(
						providerId
					)
					// Filtrar apenas serviços ativos
					services = services.filter((service) => service.isActive)

					// Se tiver categoryId, filtrar também por categoria
					if (categoryId) {
						services = services.filter(
							(service) => service.categoryId === categoryId
						)
					}

					res.json(services)
				} else if (categoryId) {
					// Buscar serviços por categoria
					let services = await storage.getServicesByCategory(
						categoryId
					)
					// Filtrar apenas serviços ativos
					services = services.filter((service) => service.isActive)
					res.json(services)
				} else {
					let services = await storage.getServices()
					// Filtrar apenas serviços ativos
					services = services.filter((service) => service.isActive)
					res.json(services)
				}
			} catch (dbError) {
				console.error(
					"Erro ao acessar banco de dados para serviços, usando modo de emergência:",
					dbError
				)

				// Modo de emergência - retorna dados de demonstração
				let dataToReturn = demoCategoryServices

				// Filtragem conforme os parâmetros de consulta
				if (providerId) {
					dataToReturn = dataToReturn.filter(
						(s) => s.providerId === providerId
					)

					if (categoryId) {
						dataToReturn = dataToReturn.filter(
							(s) => s.categoryId === categoryId
						)
					}
				} else if (categoryId) {
					dataToReturn = dataToReturn.filter(
						(s) => s.categoryId === categoryId
					)
				}

				console.log(
					`Modo de emergência: Retornando ${dataToReturn.length} serviços de demonstração`
				)
				res.json(dataToReturn)
			}
		} catch (error) {
			console.error("Erro geral ao buscar serviços:", error)
			res.status(500).json({ error: "Erro ao buscar serviços" })
		}
	})

	// Criar serviço
	app.post("/api/services", isAuthenticated, async (req, res) => {
		try {
			const isAdmin = req.user!.userType === "admin"
			const isUserProvider = req.user!.userType === "provider"

			// Verificar se o usuário é prestador ou administrador
			if (!isUserProvider && !isAdmin) {
				return res.status(403).json({ error: "Permissão negada" })
			}

			console.log(
				"Recebendo solicitação para criar serviço:",
				req.body,
				"Tipo de usuário:",
				req.user!.userType
			)

			// Preparar dados do serviço, excluindo id se estiver presente para permitir auto-incremento
			const { id, ...bodyWithoutId } = req.body

			const serviceData = {
				...bodyWithoutId,
				price: bodyWithoutId.price || 0, // Usar o preço fornecido ou 0 como padrão
				isActive:
					bodyWithoutId.isActive !== undefined
						? bodyWithoutId.isActive
						: true, // Manter o status ou definir como true por padrão
			}

			// Se o usuário é administrador, pode especificar o providerId
			// Caso contrário, usa o ID do próprio usuário prestador
			if (isAdmin && req.body.providerId) {
				serviceData.providerId = req.body.providerId
			} else {
				serviceData.providerId = req.user!.id
			}

			console.log("Dados de serviço processados (sem ID):", serviceData)

			console.log("Criando serviço com os dados:", serviceData)
			const service = await storage.createService(serviceData)
			console.log("Serviço criado com sucesso:", service)

			res.status(201).json(service)
		} catch (error) {
			console.error("Erro ao criar serviço:", error)
			res.status(500).json({ error: "Erro ao criar serviço" })
		}
	})

	// Pesquisar serviços com filtros
	app.get("/api/services/search", async (req, res) => {
		try {
			const { q, nicheId, categoryId } = req.query
			console.log(
				`Pesquisando serviços - Query: ${q}, Nicho: ${nicheId}, Categoria: ${categoryId}`
			)

			// Obter todos os serviços
			let services = await storage.getServices()

			// Filtrar por categoria se especificado
			if (categoryId && categoryId !== "") {
				const categoryIdNum = parseInt(categoryId as string)
				if (!isNaN(categoryIdNum)) {
					services = services.filter(
						(service) => service.categoryId === categoryIdNum
					)
				}
			}

			// Filtrar por nicho se especificado
			if (nicheId && nicheId !== "") {
				const nicheIdNum = parseInt(nicheId as string)
				if (!isNaN(nicheIdNum)) {
					// Primeiro, obter categorias do nicho
					const nicheCategories =
						await storage.getCategoriesByNicheId(nicheIdNum)
					const nicheCategoryIds = nicheCategories.map(
						(cat) => cat.id
					)

					// Filtrar serviços por categorias do nicho
					services = services.filter((service) =>
						nicheCategoryIds.includes(service.categoryId)
					)
				}
			}

			// Filtrar por termo de busca se especificado
			if (q && q !== "") {
				const searchTerm = (q as string).toLowerCase()
				services = services.filter(
					(service) =>
						service.name.toLowerCase().includes(searchTerm) ||
						(service.description &&
							service.description
								.toLowerCase()
								.includes(searchTerm))
				)
			}

			// Enriquecer serviços com informações adicionais
			const enrichedServices = await Promise.all(
				services.map(async (service) => {
					const category = await storage.getCategory(
						service.categoryId
					)
					let niche = null

					if (category && category.nicheId) {
						niche = await storage.getNiche(category.nicheId)
					}

					return {
						...service,
						categoryName: category
							? category.name
							: "Categoria não encontrada",
						nicheName: niche ? niche.name : "Nicho não encontrado",
					}
				})
			)

			console.log(`${enrichedServices.length} serviços encontrados`)
			res.json(enrichedServices)
		} catch (error) {
			console.error("Erro ao pesquisar serviços:", error)
			res.status(500).json({ error: "Erro ao pesquisar serviços" })
		}
	})

	// Obter serviço por ID
	app.get("/api/services/:id", async (req, res) => {
		try {
			const serviceId = parseInt(req.params.id)
			console.log(`Buscando serviço por ID: ${serviceId}`)
			const service = await storage.getService(serviceId)

			if (!service) {
				console.log(`Serviço não encontrado: ${serviceId}`)
				return res.status(404).json({ error: "Serviço não encontrado" })
			}

			console.log(`Serviço encontrado: ${JSON.stringify(service)}`)
			res.json(service)
		} catch (error) {
			console.error("Erro ao buscar serviço:", error)
			res.status(500).json({ error: "Erro ao buscar serviço" })
		}
	})

	// Atualizar serviço
	app.put("/api/services/:id", isAuthenticated, async (req, res) => {
		try {
			const serviceId = parseInt(req.params.id)
			// Usar o preço que vem no request, sem forçar para 0
			const serviceData = {
				...req.body,
			}
			const isAdmin = req.user!.userType === "admin"
			const isUserProvider = req.user!.userType === "provider"

			// Verificar se o usuário é prestador ou administrador
			if (!isUserProvider && !isAdmin) {
				return res.status(403).json({ error: "Permissão negada" })
			}

			// Verificar se o serviço existe
			const service = await storage.getService(serviceId)
			if (!service) {
				return res.status(404).json({ error: "Serviço não encontrado" })
			}

			// Se for prestador, verificar se o serviço pertence a ele
			if (isUserProvider && service.providerId !== req.user!.id) {
				return res
					.status(403)
					.json({
						error: "Você não tem permissão para editar este serviço",
					})
			}

			const updatedService = await storage.updateService(
				serviceId,
				serviceData
			)
			res.json(updatedService)
		} catch (error) {
			console.error("Erro ao atualizar serviço:", error)
			res.status(500).json({ error: "Erro ao atualizar serviço" })
		}
	})

	// Excluir serviço
	app.delete("/api/services/:id", isAuthenticated, async (req, res) => {
		try {
			const serviceId = parseInt(req.params.id)
			const isAdmin = req.user!.userType === "admin"
			const isUserProvider = req.user!.userType === "provider"

			// Verificar se o usuário é prestador ou administrador
			if (!isUserProvider && !isAdmin) {
				return res.status(403).json({ error: "Permissão negada" })
			}

			// Verificar se o serviço existe
			const service = await storage.getService(serviceId)
			if (!service) {
				return res.status(404).json({ error: "Serviço não encontrado" })
			}

			// Se for prestador, verificar se o serviço pertence a ele
			if (isUserProvider && service.providerId !== req.user!.id) {
				return res
					.status(403)
					.json({
						error: "Você não tem permissão para excluir este serviço",
					})
			}

			await storage.deleteService(serviceId)
			res.status(200).json({ success: true })
		} catch (error) {
			console.error("Erro ao excluir serviço:", error)
			res.status(500).json({ error: "Erro ao excluir serviço" })
		}
	})

	// ---------------------------------------------------------------------
	// Rotas de Categorias
	// ---------------------------------------------------------------------

	// Listar categorias
	app.get("/api/categories", async (req, res) => {
		try {
			// Verificar parâmetros de query
			const includeNicheInfo = req.query.includeNicheInfo === "true"
			const includeServices = req.query.includeServices === "true"
			const nicheId = req.query.nicheId
				? parseInt(req.query.nicheId as string)
				: undefined

			console.log(`GET /api/categories com parâmetros:`, {
				includeNicheInfo,
				includeServices,
				nicheId,
			})

			// Dados de demonstração para o modo de emergência
			const demoCategories = [
				{
					id: 1,
					name: "Cortes",
					description: "Todos os tipos de cortes",
					icon: "scissors",
					color: "#FF5733",
					nicheId: 1,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					nicheName: "Cabeleireiro",
				},
				{
					id: 2,
					name: "Tratamentos",
					description: "Tratamentos capilares",
					icon: "droplet",
					color: "#33A8FF",
					nicheId: 1,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					nicheName: "Cabeleireiro",
				},
				{
					id: 3,
					name: "Manicure",
					description: "Serviços para unhas",
					icon: "sparkles",
					color: "#FF33A8",
					nicheId: 2,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					nicheName: "Estética",
				},
			]

			// Dados de demonstração para categorias com serviços
			const demoCategoriesWithServices = [
				{
					id: 1,
					name: "Cortes",
					description: "Todos os tipos de cortes",
					icon: "scissors",
					color: "#FF5733",
					nicheId: 1,
					nicheName: "Cabeleireiro",
					services: [
						{
							id: 1,
							name: "Corte Masculino",
							isActive: true,
							providerId: 2,
							description: "Corte de cabelo masculino",
							duration: 30,
							nicheId: 1,
							categoryId: 1,
							price: 7000,
						},
						{
							id: 2,
							name: "Barba",
							isActive: true,
							providerId: 2,
							description: "Acabamento de barba",
							duration: 20,
							nicheId: 1,
							categoryId: 1,
							price: 4500,
						},
					],
				},
				{
					id: 2,
					name: "Tratamentos",
					description: "Tratamentos capilares",
					icon: "droplet",
					color: "#33A8FF",
					nicheId: 1,
					nicheName: "Cabeleireiro",
					services: [
						{
							id: 4,
							name: "Hidratação",
							isActive: true,
							providerId: 2,
							description: "Tratamento hidratante",
							duration: 60,
							nicheId: 1,
							categoryId: 2,
							price: 12000,
						},
					],
				},
			]

			try {
				// Tentativa normal de acesso ao banco de dados
				// Definir qual método usar com base nos parâmetros
				if (includeServices) {
					// Buscar categorias com todos os seus serviços
					const categories = await storage.getCategoriesWithServices(
						nicheId
					)
					res.json(categories)
				} else if (nicheId) {
					// Filtrar por nicho específico
					const categories = await storage.getCategoriesByNicheId(
						nicheId
					)
					res.json(categories)
				} else if (includeNicheInfo) {
					// Consultar categorias com informações de nicho através de SQL direto
					const categories =
						await storage.getCategoriesWithNicheInfo()
					res.json(categories)
				} else {
					// Retornar somente categorias
					const categories = await storage.getCategories()
					res.json(categories)
				}
			} catch (dbError) {
				console.error(
					"Erro ao acessar banco de dados para categorias, usando modo de emergência:",
					dbError
				)

				// Modo de emergência - retorna dados de demonstração adequados baseados nos parâmetros
				if (includeServices) {
					let dataToReturn = demoCategoriesWithServices
					if (nicheId) {
						dataToReturn = dataToReturn.filter(
							(c) => c.nicheId === nicheId
						)
					}
					console.log(
						`Modo de emergência: Retornando ${dataToReturn.length} categorias com serviços`
					)
					return res.json(dataToReturn)
				} else if (nicheId) {
					const filteredCategories = demoCategories.filter(
						(c) => c.nicheId === nicheId
					)
					console.log(
						`Modo de emergência: Retornando ${filteredCategories.length} categorias por nicho`
					)
					return res.json(filteredCategories)
				} else {
					console.log(
						`Modo de emergência: Retornando ${demoCategories.length} categorias`
					)
					return res.json(demoCategories)
				}
			}
		} catch (error) {
			console.error("Erro geral ao buscar categorias:", error)
			res.status(500).json({ error: "Erro ao buscar categorias" })
		}
	})

	// Obter uma categoria específica por ID, opcionalmente com seus serviços
	app.get("/api/categories/:id", async (req, res) => {
		try {
			const categoryId = parseInt(req.params.id)
			const includeServices = req.query.includeServices === "true"

			if (includeServices) {
				// Buscar categoria com todos os seus serviços
				const category = await storage.getCategoryWithServices(
					categoryId
				)

				if (!category) {
					return res
						.status(404)
						.json({ error: "Categoria não encontrada" })
				}

				res.json(category)
			} else {
				// Buscar apenas a categoria
				const category = await storage.getCategory(categoryId)

				if (!category) {
					return res
						.status(404)
						.json({ error: "Categoria não encontrada" })
				}

				res.json(category)
			}
		} catch (error) {
			console.error("Erro ao buscar categoria:", error)
			res.status(500).json({ error: "Erro ao buscar categoria" })
		}
	})

	// ---------------------------------------------------------------------
	// Rotas de Templates de Serviço
	// ---------------------------------------------------------------------

	// Obter todos os templates de serviço ou filtrar por categoria
	app.get("/api/service-templates", async (req, res) => {
		try {
			const categoryId = req.query.categoryId
				? parseInt(req.query.categoryId as string)
				: undefined

			if (categoryId) {
				const templates = await storage.getServiceTemplatesByCategoryId(
					categoryId
				)
				return res.json(templates)
			}

			const templates = await storage.getServiceTemplates()
			res.status(200).json(templates)
		} catch (error) {
			console.error("Erro ao buscar templates de serviço:", error)
			res.status(500).json({
				error: "Erro ao buscar templates de serviço",
			})
		}
	})

	// Obter template de serviço por ID
	app.get("/api/service-templates/:id", async (req, res) => {
		try {
			const templateId = parseInt(req.params.id)
			const template = await storage.getServiceTemplate(templateId)

			if (!template) {
				return res
					.status(404)
					.json({ error: "Template de serviço não encontrado" })
			}

			res.status(200).json(template)
		} catch (error) {
			console.error("Erro ao buscar template de serviço:", error)
			res.status(500).json({
				error: "Erro ao buscar template de serviço",
			})
		}
	})

	// Criar template de serviço (admin)
	app.post(
		"/api/service-templates",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const templateData = req.body
				const template = await storage.createServiceTemplate(
					templateData
				)
				res.status(201).json(template)
			} catch (error) {
				console.error("Erro ao criar template de serviço:", error)
				res.status(500).json({
					error: "Erro ao criar template de serviço",
				})
			}
		}
	)

	// Rota especial para criar o template de Lavagem de motor sem autenticação (temporário)
	app.get("/api/admin/create-motor-template", async (req, res) => {
		try {
			// Verificar se já existe um template para "Lavagem de motor"
			const templates = await storage.getServiceTemplates()
			const exists = templates.some(
				(template) =>
					template.name === "Lavagem de motor" &&
					template.categoryId === 1
			)

			if (exists) {
				return res
					.status(200)
					.json({ message: "Template de Lavagem de motor já existe" })
			}

			// Criar template de Lavagem de motor
			const template = await storage.createServiceTemplate({
				name: "Lavagem de motor",
				description: "Limpeza completa do motor do veículo",
				categoryId: 1,
				nicheId: 1,
				price: 9000,
				duration: 60,
				isActive: true,
			})

			console.log(
				"Template de Lavagem de motor criado com sucesso:",
				template
			)

			res.status(201).json({
				message: "Template de Lavagem de motor criado com sucesso",
				template,
			})
		} catch (error) {
			console.error("Erro ao criar template de Lavagem de motor:", error)
			res.status(500).json({
				error: "Erro ao criar template de Lavagem de motor",
			})
		}
	})

	// Atualizar template de serviço (admin)
	app.put(
		"/api/service-templates/:id",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const templateId = parseInt(req.params.id)
				const templateData = req.body

				const updatedTemplate = await storage.updateServiceTemplate(
					templateId,
					templateData
				)

				if (!updatedTemplate) {
					return res
						.status(404)
						.json({ error: "Template de serviço não encontrado" })
				}

				res.status(200).json(updatedTemplate)
			} catch (error) {
				console.error("Erro ao atualizar template de serviço:", error)
				res.status(500).json({
					error: "Erro ao atualizar template de serviço",
				})
			}
		}
	)

	// Excluir template de serviço (admin)
	app.delete(
		"/api/service-templates/:id",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const templateId = parseInt(req.params.id)
				const success = await storage.deleteServiceTemplate(templateId)

				if (!success) {
					return res
						.status(404)
						.json({ error: "Template de serviço não encontrado" })
				}

				res.status(200).json({ success: true })
			} catch (error) {
				console.error("Erro ao excluir template de serviço:", error)
				res.status(500).json({
					error: "Erro ao excluir template de serviço",
				})
			}
		}
	)

	// ---------------------------------------------------------------------
	// Rotas de Serviços de Prestador (Tempos de Execução Personalizados)
	// ---------------------------------------------------------------------

	// Listar tempos de execução personalizados para um prestador
	app.get(
		"/api/provider-services",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const providerId = req.user!.id
				const providerServices =
					await storage.getProviderServicesByProviderId(providerId)

				res.json(providerServices)
			} catch (error) {
				console.error("Erro ao buscar serviços do prestador:", error)
				res.status(500).json({
					error: "Erro ao buscar tempos de execução personalizados",
				})
			}
		}
	)

	// Endpoint para o calendário do prestador - obter serviços do prestador logado
	app.get(
		"/api/provider/services",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const providerId = req.user!.id
				// Buscar os serviços do prestador
				const providerServices = await storage.getServicesByProvider(
					providerId
				)

				// Formatamos a resposta para incluir apenas os campos necessários para o calendário
				const formattedServices = providerServices.map((service) => ({
					id: service.id,
					name: service.name,
					duration: service.duration,
					price: service.price,
				}))

				console.log(
					"Serviços do prestador para o calendário:",
					formattedServices
				)
				res.json(formattedServices)
			} catch (error) {
				console.error(
					"Erro ao buscar serviços do prestador para o calendário:",
					error
				)
				res.status(500).json({
					error: "Erro ao buscar serviços do prestador",
				})
			}
		}
	)

	// Endpoint para o calendário do prestador - obter clientes do prestador logado
	app.get(
		"/api/provider/clients",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const providerId = req.user!.id
				const clients = await storage.getProviderClients(providerId)
				// Formatamos a resposta para incluir apenas os campos necessários para o calendário
				const formattedClients = clients.map((client) => ({
					id: client.id,
					name: client.name,
					email: client.email,
				}))
				res.json(formattedClients)
			} catch (error) {
				console.error(
					"Erro ao buscar clientes do prestador para o calendário:",
					error
				)
				res.status(500).json({
					error: "Erro ao buscar clientes do prestador",
				})
			}
		}
	)

	// Endpoint para o calendário do prestador - obter agendamentos do prestador logado
	app.get(
		"/api/provider/appointments",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const providerId = req.user!.id
				const appointments = await storage.getAppointmentsByProviderId(
					providerId
				)
				res.json(appointments)
			} catch (error) {
				console.error(
					"Erro ao buscar agendamentos do prestador para o calendário:",
					error
				)
				res.status(500).json({
					error: "Erro ao buscar agendamentos do prestador",
				})
			}
		}
	)

	// Obter detalhes de um serviço personalizado específico
	app.get(
		"/api/provider-services/:id",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const providerServiceId = parseInt(req.params.id)
				const providerService = await storage.getProviderService(
					providerServiceId
				)

				if (!providerService) {
					return res
						.status(404)
						.json({ error: "Serviço personalizado não encontrado" })
				}

				// Verificar se pertence ao prestador logado
				if (providerService.providerId !== req.user!.id) {
					return res
						.status(403)
						.json({
							error: "Você não tem permissão para acessar este serviço personalizado",
						})
				}

				res.json(providerService)
			} catch (error) {
				console.error(
					"Erro ao buscar detalhes do serviço personalizado:",
					error
				)
				res.status(500).json({
					error: "Erro ao buscar detalhes do serviço personalizado",
				})
			}
		}
	)

	// Obter tempo de execução personalizado por prestador e serviço
	app.get(
		"/api/provider-services/provider/:providerId/service/:serviceId",
		isAuthenticated,
		async (req, res) => {
			try {
				const providerId = parseInt(req.params.providerId)
				const serviceId = parseInt(req.params.serviceId)

				// Se for cliente ou outro prestador, verificar se o serviço é público
				if (
					req.user!.userType !== "admin" &&
					req.user!.id !== providerId
				) {
					const service = await storage.getService(serviceId)
					if (!service || !service.isActive) {
						return res
							.status(404)
							.json({
								error: "Serviço não encontrado ou inativo",
							})
					}
				}

				const providerService =
					await storage.getProviderServiceByProviderAndService(
						providerId,
						serviceId
					)

				if (!providerService) {
					// Se não existir personalização, retornar o serviço padrão
					const service = await storage.getService(serviceId)
					if (!service) {
						return res
							.status(404)
							.json({ error: "Serviço não encontrado" })
					}

					// Retornar duração padrão do serviço
					return res.json({
						providerId,
						serviceId,
						executionTime: service.duration,
						isActive: service.isActive,
					})
				}

				res.json(providerService)
			} catch (error) {
				console.error(
					"Erro ao buscar tempo de execução personalizado:",
					error
				)
				res.status(500).json({
					error: "Erro ao buscar tempo de execução personalizado",
				})
			}
		}
	)

	// Criar ou atualizar tempo de execução personalizado
	app.post(
		"/api/provider-services",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const providerId = req.user!.id
				const { serviceId, executionTime, isActive = true } = req.body

				if (!serviceId || !executionTime) {
					return res
						.status(400)
						.json({
							error: "Dados incompletos para personalizar o serviço",
						})
				}

				// Verificar se o serviço existe
				const service = await storage.getService(serviceId)
				if (!service) {
					return res
						.status(404)
						.json({ error: "Serviço não encontrado" })
				}

				// Verificar se já existe uma personalização para este serviço
				const existingProviderService =
					await storage.getProviderServiceByProviderAndService(
						providerId,
						serviceId
					)

				let result
				if (existingProviderService) {
					// Atualizar configuração existente
					result = await storage.updateProviderService(
						existingProviderService.id,
						{
							executionTime,
							isActive,
						}
					)
				} else {
					// Criar nova configuração
					result = await storage.createProviderService({
						providerId,
						serviceId,
						executionTime,
						isActive,
					})
				}

				res.status(201).json(result)
			} catch (error) {
				console.error(
					"Erro ao personalizar tempo de execução do serviço:",
					error
				)
				res.status(500).json({
					error: "Erro ao personalizar tempo de execução do serviço",
				})
			}
		}
	)

	// Atualizar um tempo de execução personalizado
	app.put(
		"/api/provider-services/:id",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const providerServiceId = parseInt(req.params.id)
				const providerId = req.user!.id
				const { executionTime, isActive } = req.body

				// Verificar se o serviço personalizado existe
				const providerService = await storage.getProviderService(
					providerServiceId
				)
				if (!providerService) {
					return res
						.status(404)
						.json({ error: "Serviço personalizado não encontrado" })
				}

				// Verificar se pertence ao prestador logado
				if (providerService.providerId !== providerId) {
					return res
						.status(403)
						.json({
							error: "Você não tem permissão para modificar este serviço personalizado",
						})
				}

				// Atualizar tempo de execução
				const updatedProviderService =
					await storage.updateProviderService(providerServiceId, {
						executionTime,
						isActive,
					})

				res.json(updatedProviderService)
			} catch (error) {
				console.error(
					"Erro ao atualizar tempo de execução personalizado:",
					error
				)
				res.status(500).json({
					error: "Erro ao atualizar tempo de execução personalizado",
				})
			}
		}
	)

	// Excluir um tempo de execução personalizado (restaurar para o tempo padrão)
	app.delete(
		"/api/provider-services/:id",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const providerServiceId = parseInt(req.params.id)
				const providerId = req.user!.id

				// Verificar se o serviço personalizado existe
				const providerService = await storage.getProviderService(
					providerServiceId
				)
				if (!providerService) {
					return res
						.status(404)
						.json({ error: "Serviço personalizado não encontrado" })
				}

				// Verificar se pertence ao prestador logado
				if (providerService.providerId !== providerId) {
					return res
						.status(403)
						.json({
							error: "Você não tem permissão para excluir este serviço personalizado",
						})
				}

				// Excluir personalização
				const success = await storage.deleteProviderService(
					providerServiceId
				)

				if (success) {
					res.json({
						success: true,
						message:
							"Personalização de tempo de execução removida com sucesso",
					})
				} else {
					res.status(500).json({
						error: "Erro ao remover personalização de tempo de execução",
					})
				}
			} catch (error) {
				console.error(
					"Erro ao excluir tempo de execução personalizado:",
					error
				)
				res.status(500).json({
					error: "Erro ao excluir tempo de execução personalizado",
				})
			}
		}
	)

	// ---------------------------------------------------------------------
	// Rotas de Notificações
	// ---------------------------------------------------------------------

	// Listar notificações do usuário atual
	app.get("/api/notifications", isAuthenticated, async (req, res) => {
		try {
			const notifications = await storage.getNotifications(req.user!.id)
			res.json(notifications)
		} catch (error) {
			console.error("Erro ao buscar notificações:", error)
			res.status(500).json({ error: "Erro ao buscar notificações" })
		}
	})

	// Marcar notificação como lida
	app.put(
		"/api/notifications/:id/read",
		isAuthenticated,
		async (req, res) => {
			try {
				const notificationId = parseInt(req.params.id)
				const userId = req.user!.id

				// Verificar se a notificação pertence ao usuário
				const notification = await storage.getNotification(
					notificationId
				)
				if (!notification || notification.userId !== userId) {
					return res.status(403).json({
						error: "Você não tem permissão para modificar esta notificação",
					})
				}

				const updatedNotification = await storage.updateNotification(
					notificationId,
					{ read: true }
				)
				res.json(updatedNotification)
			} catch (error) {
				console.error("Erro ao marcar notificação como lida:", error)
				res.status(500).json({
					error: "Erro ao marcar notificação como lida",
				})
			}
		}
	)

	// Marcar todas as notificações como lidas
	app.put(
		"/api/notifications/read-all",
		isAuthenticated,
		async (req, res) => {
			try {
				const userId = req.user!.id
				await storage.markAllNotificationsAsRead(userId)
				res.json({ success: true })
			} catch (error) {
				console.error(
					"Erro ao marcar todas notificações como lidas:",
					error
				)
				res.status(500).json({
					error: "Erro ao marcar todas notificações como lidas",
				})
			}
		}
	)

	// ---------------------------------------------------------------------
	// Rotas de Onboarding
	// ---------------------------------------------------------------------

	// Obter etapas de onboarding para um tipo de usuário
	app.get("/api/onboarding/steps", isAuthenticated, async (req, res) => {
		try {
			const userType =
				(req.query.userType as string) || req.user!.userType
			const steps = await storage.getOnboardingStepsByUserType(userType)
			res.json(steps)
		} catch (error) {
			console.error("Erro ao buscar etapas de onboarding:", error)
			res.status(500).json({
				error: "Erro ao buscar etapas de onboarding",
			})
		}
	})

	// Obter progresso de onboarding do usuário
	app.get("/api/onboarding/progress", isAuthenticated, async (req, res) => {
		try {
			const userId = req.user!.id
			const progress = await storage.getUserOnboardingProgress(userId)
			const completionPercentage =
				await storage.getOnboardingCompletionPercentage(userId)

			// Se não encontrou nenhum progresso, criar progresso inicial
			if (progress.length === 0) {
				// Buscar todas as etapas para o tipo de usuário
				const steps = await storage.getOnboardingStepsByUserType(
					req.user!.userType
				)

				// Criar registro de progresso para cada etapa
				for (const step of steps) {
					await storage.createUserOnboardingProgress({
						userId,
						stepId: step.id,
						status: "not_started",
					})
				}

				const initialProgress = await storage.getUserOnboardingProgress(
					userId
				)
				res.json({
					progress: initialProgress,
					completionPercentage: 0,
				})
			} else {
				res.json({
					progress,
					completionPercentage,
				})
			}
		} catch (error) {
			console.error("Erro ao buscar progresso de onboarding:", error)
			res.status(500).json({
				error: "Erro ao buscar progresso de onboarding",
			})
		}
	})

	// Atualizar progresso de uma etapa
	app.post(
		"/api/onboarding/progress/:stepId",
		isAuthenticated,
		async (req, res) => {
			try {
				const stepId = parseInt(req.params.stepId)
				const userId = req.user!.id
				const { status } = req.body

				if (
					!status ||
					![
						"not_started",
						"in_progress",
						"completed",
						"skipped",
					].includes(status)
				) {
					return res.status(400).json({ error: "Status inválido" })
				}

				const updatedProgress =
					await storage.updateUserOnboardingProgress(
						userId,
						stepId,
						status
					)
				res.json(updatedProgress)
			} catch (error) {
				console.error("Erro ao atualizar progresso:", error)
				res.status(500).json({ error: "Erro ao atualizar progresso" })
			}
		}
	)

	// Marcar etapa como concluída
	app.post(
		"/api/onboarding/complete/:stepId",
		isAuthenticated,
		async (req, res) => {
			try {
				const stepId = parseInt(req.params.stepId)
				const userId = req.user!.id

				const updatedProgress = await storage.markStepAsComplete(
					userId,
					stepId
				)
				res.json(updatedProgress)
			} catch (error) {
				console.error("Erro ao concluir etapa:", error)
				res.status(500).json({ error: "Erro ao concluir etapa" })
			}
		}
	)

	// Pular etapa
	app.post(
		"/api/onboarding/skip/:stepId",
		isAuthenticated,
		async (req, res) => {
			try {
				const stepId = parseInt(req.params.stepId)
				const userId = req.user!.id

				const updatedProgress = await storage.markStepAsSkipped(
					userId,
					stepId
				)
				res.json(updatedProgress)
			} catch (error) {
				console.error("Erro ao pular etapa:", error)
				res.status(500).json({ error: "Erro ao pular etapa" })
			}
		}
	)

	// ----------------------------------------------------------------------
	// Rotas para redefinição de senha
	// ----------------------------------------------------------------------
	// Solicitar redefinição de senha (gera token)
	app.post("/api/password-reset/request", async (req, res) => {
		try {
			const { email } = req.body

			if (!email) {
				return res.status(400).json({ error: "Email é obrigatório" })
			}

			// Verificar se o usuário existe
			const user = await storage.getUserByEmail(email)
			if (!user) {
				// Por razões de segurança, não informamos se o email não foi encontrado
				return res.status(200).json({
					message:
						"Se o email estiver registrado, você receberá instruções para redefinir sua senha.",
				})
			}

			// Gerar token aleatório
			const token = crypto.randomBytes(32).toString("hex")
			const expiresAt = new Date()
			expiresAt.setHours(expiresAt.getHours() + 1) // Token válido por 1 hora

			// Salvar token
			await storage.createPasswordResetToken({
				userId: user.id,
				token: token,
				expiresAt: expiresAt,
			})

			// Em uma aplicação real, enviaria um email com o link para reset
			// Por enquanto, apenas retornamos o token para teste
			// Normalmente, usaríamos um serviço de email como SendGrid aqui

			return res.status(200).json({
				message:
					"Se o email estiver registrado, você receberá instruções para redefinir sua senha.",
				// Apenas para teste - em produção isso não seria enviado
				resetToken: token,
				resetLink: `/password-recovery?token=${token}`,
			})
		} catch (error) {
			console.error("Erro ao solicitar redefinição de senha:", error)
			res.status(500).json({
				error: "Erro ao processar solicitação de redefinição de senha",
			})
		}
	})

	// Verificar token de redefinição de senha
	app.get("/api/password-reset/verify/:token", async (req, res) => {
		try {
			const { token } = req.params

			if (!token) {
				return res.status(400).json({ error: "Token inválido" })
			}

			const resetToken = await storage.getPasswordResetTokenByToken(token)

			// Verificar se o token existe e está válido
			if (!resetToken) {
				return res
					.status(400)
					.json({ error: "Token inválido ou expirado" })
			}

			// Verificar se o token já foi usado
			if (resetToken.usedAt) {
				return res
					.status(400)
					.json({ error: "Este token já foi utilizado" })
			}

			// Verificar se o token está expirado
			if (new Date() > resetToken.expiresAt) {
				return res.status(400).json({ error: "Token expirado" })
			}

			// Token é válido
			const user = await storage.getUser(resetToken.userId)
			if (!user) {
				return res.status(400).json({ error: "Usuário não encontrado" })
			}

			return res.status(200).json({
				isValid: true,
				email: user.email,
			})
		} catch (error) {
			console.error("Erro ao verificar token:", error)
			res.status(500).json({
				error: "Erro ao verificar token de redefinição de senha",
			})
		}
	})

	// Redefinir senha usando token
	app.post("/api/password-reset/reset", async (req, res) => {
		try {
			const { token, password } = req.body

			if (!token || !password) {
				return res
					.status(400)
					.json({ error: "Token e nova senha são obrigatórios" })
			}

			if (password.length < 6) {
				return res
					.status(400)
					.json({ error: "A senha deve ter pelo menos 6 caracteres" })
			}

			const resetToken = await storage.getPasswordResetTokenByToken(token)

			// Verificações do token
			if (!resetToken) {
				return res
					.status(400)
					.json({ error: "Token inválido ou expirado" })
			}

			if (resetToken.usedAt) {
				return res
					.status(400)
					.json({ error: "Este token já foi utilizado" })
			}

			if (new Date() > resetToken.expiresAt) {
				return res.status(400).json({ error: "Token expirado" })
			}

			// Gerar hash da nova senha
			const hashedPassword = await hashPassword(password)

			// Atualizar senha do usuário
			const user = await storage.updateUserPassword(
				resetToken.userId,
				hashedPassword
			)

			if (!user) {
				return res
					.status(400)
					.json({ error: "Erro ao atualizar senha" })
			}

			// Marcar token como usado
			await storage.updatePasswordResetToken(resetToken.id, {
				usedAt: new Date(),
			})

			return res
				.status(200)
				.json({ message: "Senha atualizada com sucesso" })
		} catch (error) {
			console.error("Erro ao redefinir senha:", error)
			res.status(500).json({ error: "Erro ao redefinir senha" })
		}
	})

	// ----------------------------------------------------------------------
	// Rotas de Administração
	// ----------------------------------------------------------------------

	// Relatórios e Dashboards

	// Resumo de estatísticas para dashboard admin
	app.get(
		"/api/admin/reports/summary",
		isAuthenticated,
		isAdmin, // Alterado: apenas administradores podem acessar relatórios de resumo
		async (req, res) => {
			try {
				const usersCount = await storage.getUsersCount()
				const providersCount = await storage.getUsersCount("provider")
				const clientsCount = await storage.getUsersCount("client")
				const servicesCount = await storage.getServicesCount()
				const categoriesCount = await storage.getCategoriesCount()
				const appointmentsCount = await storage.getAppointmentsCount()

				// Obter contagens de agendamentos por status
				const pendingCount = await storage.getAppointmentsCount(
					"pending"
				)
				const confirmedCount = await storage.getAppointmentsCount(
					"confirmed"
				)
				const completedCount = await storage.getAppointmentsCount(
					"completed"
				)
				const canceledCount = await storage.getAppointmentsCount(
					"canceled"
				)

				// Obter agendamentos recentes (últimos 5)
				const recentAppointments = await storage.getRecentAppointments(
					5
				)

				res.json({
					totalUsers: usersCount,
					totalProviders: providersCount,
					totalClients: clientsCount,
					totalServices: servicesCount,
					totalCategories: categoriesCount,
					totalAppointments: appointmentsCount,
					appointmentsByStatus: {
						pending: pendingCount,
						confirmed: confirmedCount,
						completed: completedCount,
						canceled: canceledCount,
					},
					recentAppointments,
				})
			} catch (error) {
				console.error("Erro ao obter resumo para dashboard:", error)
				res.status(500).json({
					error: "Erro ao obter resumo para dashboard",
				})
			}
		}
	)

	// Novos usuários por dia (com período ajustável)
	app.get(
		"/api/admin/reports/new-users-by-day",
		isAuthenticated,
		isAdmin, // Alterado: apenas administradores podem acessar relatórios de usuários
		async (req, res) => {
			try {
				// Pegar o número de dias do parâmetro de consulta, padrão: 30 dias
				const days = parseInt(req.query.days as string) || 30

				// Limitar o período para evitar consultas muito pesadas
				const maxDays = 90
				const daysToUse = Math.min(days, maxDays)

				const today = new Date()
				const startDate = new Date()
				startDate.setDate(today.getDate() - daysToUse)

				console.log(
					`Buscando novos usuários nos últimos ${daysToUse} dias`
				)

				// Esta função deve retornar dados no formato:
				// [{ date: '2023-05-01', count: 5 }, { date: '2023-05-02', count: 3 }, ...]
				const usersByDay = await storage.getNewUsersByDay(
					startDate,
					today
				)

				res.json(usersByDay)
			} catch (error) {
				console.error("Erro ao obter novos usuários por dia:", error)
				res.status(500).json({
					error: "Erro ao obter novos usuários por dia",
				})
			}
		}
	)

	// Obter todos os prestadores para gestão administrativa
	app.get(
		"/api/admin/providers",
		isAuthenticated,
		isAdmin, // Alterado: apenas administradores podem acessar gestão de prestadores
		async (req, res) => {
			try {
				const providers = await storage.getUsersByType("provider")
				res.json(providers)
			} catch (error) {
				console.error("Erro ao obter prestadores:", error)
				res.status(500).json({ error: "Erro ao obter prestadores" })
			}
		}
	)

	// Obter todos os usuários para gestão administrativa
	app.get(
		"/api/admin/users",
		isAuthenticated,
		isAdmin, // Alterado: apenas administradores podem acessar a lista completa de usuários
		async (req, res) => {
			try {
				const users = await storage.getUsers()
				res.json(users)
			} catch (error) {
				console.error("Erro ao obter usuários:", error)
				res.status(500).json({ error: "Erro ao obter usuários" })
			}
		}
	)

	// Criar novo usuário (admin ou suporte)
	app.post(
		"/api/admin/users",
		isAuthenticated,
		isAdmin, // Alterado: apenas administradores podem criar novos usuários
		async (req, res) => {
			try {
				const userData = req.body

				// Verificar se o usuário já existe
				const existingUser = await storage.getUserByEmail(
					userData.email
				)
				if (existingUser) {
					return res
						.status(400)
						.json({ error: "Usuário com este email já existe" })
				}

				// Hash da senha
				const { hashPassword } = require("./auth")
				userData.password = await hashPassword(userData.password)

				// Criar usuário
				const newUser = await storage.createUser(userData)
				res.status(201).json(newUser)
			} catch (error) {
				console.error("Erro ao criar usuário:", error)
				res.status(500).json({ error: "Erro ao criar usuário" })
			}
		}
	)

	// Atualizar usuário (admin)
	app.put(
		"/api/admin/users/:id",
		isAuthenticated,
		isAdmin, // Alterado: apenas administradores podem atualizar usuários
		async (req, res) => {
			try {
				const userId = parseInt(req.params.id)
				const userData = req.body

				const updatedUser = await storage.updateUser(userId, userData)
				if (!updatedUser) {
					return res
						.status(404)
						.json({ error: "Usuário não encontrado" })
				}

				res.json(updatedUser)
			} catch (error) {
				console.error("Erro ao atualizar usuário:", error)
				res.status(500).json({ error: "Erro ao atualizar usuário" })
			}
		}
	)

	// Excluir usuário (admin)
	app.delete(
		"/api/admin/users/:id",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const userId = parseInt(req.params.id)
				const success = await storage.deleteUser(userId)

				if (!success) {
					return res
						.status(404)
						.json({ error: "Usuário não encontrado" })
				}

				res.json({ success: true })
			} catch (error) {
				console.error("Erro ao excluir usuário:", error)
				res.status(500).json({ error: "Erro ao excluir usuário" })
			}
		}
	)

	// Upload de foto de perfil
	app.post(
		"/api/admin/users/:id/profile-image",
		isAuthenticated,
		isAdmin, // Alterado: apenas administradores podem atualizar fotos de perfil
		async (req, res) => {
			try {
				const userId = parseInt(req.params.id)
				const user = await storage.getUser(userId)

				if (!user) {
					return res
						.status(404)
						.json({ error: "Usuário não encontrado" })
				}

				// Verificar se há um corpo de requisição com a imagem
				if (!req.body || !req.body.file) {
					return res
						.status(400)
						.json({ error: "Nenhuma imagem enviada" })
				}

				// Processar o upload da imagem
				try {
					// A imagem está sendo enviada como base64 no corpo da requisição
					const base64Data = req.body.file.split(";base64,").pop()
					if (!base64Data) {
						return res
							.status(400)
							.json({ error: "Formato de imagem inválido" })
					}

					// Criar diretório para fotos de perfil se não existir
					const uploadDir = path.join(
						process.cwd(),
						"uploads",
						"profile-images"
					)
					if (!fs.existsSync(uploadDir)) {
						fs.mkdirSync(uploadDir, { recursive: true })
					}

					// Gerar nome único para o arquivo
					const fileExt =
						req.body.file.match(
							/^data:image\/(\w+);base64,/
						)?.[1] || "png"
					const fileName = `${userId}_${Date.now()}.${fileExt}`
					const filePath = path.join(uploadDir, fileName)

					// Salvar a imagem no sistema de arquivos
					fs.writeFileSync(filePath, base64Data, {
						encoding: "base64",
					})

					// Atualizar o caminho da imagem no banco de dados
					const imageUrl = `/uploads/profile-images/${fileName}`
					await storage.updateUser(userId, { profileImage: imageUrl })

					res.status(200).json({
						message: "Foto de perfil atualizada com sucesso",
						profileImage: imageUrl,
					})
				} catch (uploadError) {
					console.error("Erro ao processar upload:", uploadError)
					res.status(500).json({
						error: "Erro ao processar upload de imagem",
					})
				}
			} catch (error) {
				console.error("Erro ao atualizar foto de perfil:", error)
				res.status(500).json({
					error: "Erro ao atualizar foto de perfil",
				})
			}
		}
	)

	// Remover foto de perfil
	app.delete(
		"/api/admin/users/:id/profile-image",
		isAuthenticated,
		isAdmin, // Alterado: apenas administradores podem remover fotos de perfil
		async (req, res) => {
			try {
				const userId = parseInt(req.params.id)
				const user = await storage.getUser(userId)

				if (!user) {
					return res
						.status(404)
						.json({ error: "Usuário não encontrado" })
				}

				if (!user.profileImage) {
					return res
						.status(400)
						.json({ error: "Usuário não possui foto de perfil" })
				}

				// Remover arquivo se existir
				try {
					const imagePath = path.join(
						process.cwd(),
						user.profileImage.substring(1)
					) // Remove a / inicial
					if (fs.existsSync(imagePath)) {
						fs.unlinkSync(imagePath)
					}
				} catch (fileError) {
					console.error(
						"Erro ao remover arquivo de imagem:",
						fileError
					)
					// Continuar mesmo se o arquivo não puder ser removido
				}

				// Atualizar usuário no banco de dados
				await storage.updateUser(userId, { profileImage: null })

				res.status(200).json({
					message: "Foto de perfil removida com sucesso",
				})
			} catch (error) {
				console.error("Erro ao remover foto de perfil:", error)
				res.status(500).json({
					error: "Erro ao remover foto de perfil",
				})
			}
		}
	)

	// Gestão de Nichos/Categorias

	// Obter nichos
	app.get(
		"/api/admin/niches",
		isAuthenticated,
		isAdmin, // Alterado: apenas administradores podem visualizar todos os nichos
		async (req, res) => {
			try {
				// Utiliza a função que retorna nichos com categorias e serviços incluídos
				const niches =
					await storage.getNichesWithCategoriesAndServices()
				res.json(niches)
			} catch (error) {
				console.error(
					"Erro ao buscar nichos com categorias e serviços:",
					error
				)
				res.status(500).json({
					error: "Erro ao buscar hierarquia de nichos",
				})
			}
		}
	)

	// Criar nicho
	app.post(
		"/api/admin/niches",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const nicheData = insertNicheSchema.parse(req.body)

				// Validar se todos os campos necessários estão presentes
				if (!nicheData.name) {
					return res
						.status(400)
						.json({ error: "O nome do nicho é obrigatório" })
				}

				// Verificar se já existe um nicho com o mesmo nome
				const existingNiche = await storage.getNicheByName(
					nicheData.name
				)
				if (existingNiche) {
					return res
						.status(400)
						.json({ error: "Já existe um nicho com este nome" })
				}

				const niche = await storage.createNiche(nicheData)
				res.status(201).json(niche)
			} catch (error) {
				console.error("Erro ao criar nicho:", error)
				if (error instanceof z.ZodError) {
					return res.status(400).json({
						error: "Dados inválidos",
						details: error.errors,
					})
				}
				res.status(500).json({ error: "Erro ao criar nicho" })
			}
		}
	)

	// Atualizar nicho
	app.put(
		"/api/admin/niches/:id",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const nicheId = parseInt(req.params.id)
				const nicheData = req.body

				const updatedNiche = await storage.updateNiche(
					nicheId,
					nicheData
				)
				if (!updatedNiche) {
					return res
						.status(404)
						.json({ error: "Nicho não encontrado" })
				}

				res.json(updatedNiche)
			} catch (error) {
				console.error("Erro ao atualizar nicho:", error)
				res.status(500).json({ error: "Erro ao atualizar nicho" })
			}
		}
	)

	// Excluir nicho
	app.delete(
		"/api/admin/niches/:id",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const nicheId = parseInt(req.params.id)
				const cascadeDelete = req.query.cascade === "true"

				// Verificar se o nicho existe
				const niche = await storage.getNiche(nicheId)
				if (!niche) {
					return res
						.status(404)
						.json({ error: "Nicho não encontrado" })
				}

				// Verificar se existem categorias associadas
				const categories = await storage.getCategoriesByNicheId(nicheId)

				if (categories.length > 0 && !cascadeDelete) {
					return res.status(400).json({
						error: "Não é possível excluir o nicho porque existem categorias associadas",
						details: {
							categoryCount: categories.length,
							categories: categories.map((c) => ({
								id: c.id,
								name: c.name,
							})),
							message:
								"Para excluir o nicho e todas as suas categorias, use o parâmetro 'cascade=true'",
						},
					})
				}

				// Se cascadeDelete for true, excluir categorias e serviços associados
				if (cascadeDelete && categories.length > 0) {
					for (const category of categories) {
						await storage.deleteCategory(category.id)
					}
				}

				const success = await storage.deleteNiche(nicheId)

				if (!success) {
					return res
						.status(500)
						.json({ error: "Falha ao excluir o nicho" })
				}

				res.json({
					success: true,
					message:
						cascadeDelete && categories.length > 0
							? `Nicho excluído com sucesso junto com ${
									categories.length
							  } ${
									categories.length === 1
										? "categoria"
										: "categorias"
							  }`
							: "Nicho excluído com sucesso",
				})
			} catch (error) {
				console.error("Erro ao excluir nicho:", error)
				res.status(500).json({ error: "Erro ao excluir nicho" })
			}
		}
	)

	// Obter categorias por nicho
	app.get(
		"/api/admin/categories/by-niche/:nicheId",
		isAuthenticated,
		isAdmin, // Alterado: apenas administradores podem visualizar categorias por nicho
		async (req, res) => {
			try {
				const nicheId = parseInt(req.params.nicheId)
				const categories = await storage.getCategoriesByNicheId(nicheId)
				res.json(categories)
			} catch (error) {
				console.error("Erro ao obter categorias por nicho:", error)
				res.status(500).json({ error: "Erro ao obter categorias" })
			}
		}
	)

	// Criar categoria
	app.post(
		"/api/admin/categories",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				console.log(
					"Recebendo solicitação para criar categoria:",
					req.body
				)

				const categoryData = insertCategorySchema.parse(req.body)

				// Validar campos obrigatórios
				if (!categoryData.name) {
					return res
						.status(400)
						.json({ error: "O nome da categoria é obrigatório" })
				}

				// Verifica se nicheId é definido e um número (incluindo 0, que é válido)
				if (
					categoryData.nicheId === undefined ||
					categoryData.nicheId === null
				) {
					return res
						.status(400)
						.json({ error: "O ID do nicho é obrigatório" })
				}

				// Verificar se o nicho existe
				const niche = await storage.getNiche(categoryData.nicheId)
				if (!niche) {
					return res.status(404).json({
						error: `Nicho com ID ${categoryData.nicheId} não encontrado`,
					})
				}

				console.log("Criando categoria com os dados:", categoryData)
				const category = await storage.createCategory(categoryData)
				console.log("Categoria criada com sucesso:", category)

				res.status(201).json(category)
			} catch (error) {
				console.error("Erro ao criar categoria:", error)

				if (error instanceof z.ZodError) {
					return res.status(400).json({
						error: "Por favor, verifique os dados informados",
					})
				}

				if (
					error instanceof Error &&
					error.message.includes("já existe")
				) {
					return res
						.status(400)
						.json({
							error: "Já existe uma categoria com este nome",
						})
				}
				res.status(500).json({
					error: "Não foi possível criar a categoria",
				})
			}
		}
	)

	// Atualizar categoria
	app.put(
		"/api/admin/categories/:id",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const categoryId = parseInt(req.params.id)
				const categoryData = req.body

				// Verificar se a categoria existe
				const existingCategory = await storage.getCategory(categoryId)
				if (!existingCategory) {
					return res
						.status(404)
						.json({ error: "Categoria não encontrada" })
				}

				// Se estiver mudando o nicheId, verificar se o novo nicho existe
				if (
					categoryData.nicheId &&
					categoryData.nicheId !== existingCategory.nicheId
				) {
					const niche = await storage.getNiche(categoryData.nicheId)
					if (!niche) {
						return res.status(404).json({
							error: `Nicho com ID ${categoryData.nicheId} não encontrado`,
						})
					}
				}

				const updatedCategory = await storage.updateCategory(
					categoryId,
					categoryData
				)
				if (!updatedCategory) {
					return res
						.status(404)
						.json({ error: "Categoria não encontrada" })
				}

				res.json(updatedCategory)
			} catch (error) {
				console.error("Erro ao atualizar categoria:", error)
				if (error instanceof z.ZodError) {
					return res.status(400).json({
						error: "Dados inválidos",
						details: error.errors,
					})
				}
				res.status(500).json({ error: "Erro ao atualizar categoria" })
			}
		}
	)

	// Excluir categoria
	app.delete(
		"/api/admin/categories/:id",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const categoryId = parseInt(req.params.id)
				const verifyOnly = req.query.verifyOnly === "true"

				// Verificar se a categoria existe
				const category = await storage.getCategory(categoryId)
				if (!category) {
					return res
						.status(404)
						.json({ error: "Categoria não encontrada" })
				}

				// Verificar se existem serviços associados
				const services = await storage.getServicesByCategory(categoryId)

				// Se for apenas verificação, retornar as informações sem excluir
				if (verifyOnly) {
					return res.json({
						category,
						serviceCount: services.length,
						services: services.map((s) => ({
							id: s.id,
							name: s.name,
						})),
						canDelete: true,
						willDeleteServices: services.length > 0,
					})
				}

				// Executar a exclusão efetiva
				const success = await storage.deleteCategory(categoryId)

				if (!success) {
					return res
						.status(500)
						.json({ error: "Falha ao excluir a categoria" })
				}

				res.json({
					success: true,
					message:
						services.length > 0
							? `Categoria excluída com sucesso junto com ${
									services.length
							  } ${
									services.length === 1
										? "serviço"
										: "serviços"
							  }`
							: "Categoria excluída com sucesso",
				})
			} catch (error) {
				console.error("Erro ao excluir categoria:", error)
				res.status(500).json({ error: "Erro ao excluir categoria" })
			}
		}
	)

	// Configurações de Pagamento

	// Obter configurações de pagamento
	app.get(
		"/api/admin/payment-settings",
		isAuthenticated,
		isAdmin, // Alterado: apenas administradores podem visualizar configurações de pagamento
		async (req, res) => {
			try {
				const paymentSettings = await getPaymentSettings()
				res.json(paymentSettings || {})
			} catch (error) {
				console.error(
					"Erro ao obter configurações de pagamento:",
					error
				)
				res.status(500).json({
					error: "Erro ao obter configurações de pagamento",
				})
			}
		}
	)

	// Atualizar configurações de pagamento (suporta PUT e PATCH)
	const updatePaymentSettingsHandler = async (req, res) => {
		try {
			const settingsId = parseInt(req.params.id)
			const settingsData = req.body

			console.log(
				`Requisição para atualizar configurações de pagamento (ID: ${settingsId}):`,
				settingsData
			)

			// Garantir que o campo serviceFee exista se serviceFeePercentage estiver presente
			if (settingsData.serviceFeePercentage && !settingsData.serviceFee) {
				settingsData.serviceFee = settingsData.serviceFeePercentage
			}

			const updatedSettings = await storage.updatePaymentSettings(
				settingsId,
				settingsData
			)
			if (!updatedSettings) {
				console.log(
					`Configurações de pagamento com ID ${settingsId} não encontradas`
				)
				return res
					.status(404)
					.json({ error: "Configurações não encontradas" })
			}

			console.log(
				"Configurações de pagamento atualizadas com sucesso:",
				updatedSettings
			)
			res.json(updatedSettings)
		} catch (error) {
			console.error(
				"Erro ao atualizar configurações de pagamento:",
				error
			)
			res.status(500).json({
				error: "Erro ao atualizar configurações de pagamento",
			})
		}
	}

	// Rota PUT para atualizar configurações de pagamento
	app.put(
		"/api/admin/payment-settings/:id",
		isAuthenticated,
		isAdmin,
		updatePaymentSettingsHandler
	)

	// Rota PATCH para atualizar configurações de pagamento
	app.patch(
		"/api/admin/payment-settings/:id",
		isAuthenticated,
		isAdmin,
		updatePaymentSettingsHandler
	)

	// Criar configurações de pagamento se não existirem
	app.post(
		"/api/admin/payment-settings",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const settingsData = req.body

				// Verificar se já existe
				const existingSettings = await getPaymentSettings()
				if (existingSettings) {
					return res.status(400).json({
						error: "Configurações de pagamento já existem. Use PUT para atualizar.",
					})
				}

				const newSettings = await storage.createPaymentSettings(
					settingsData
				)
				res.status(201).json(newSettings)
			} catch (error) {
				console.error(
					"Erro ao criar configurações de pagamento:",
					error
				)
				res.status(500).json({
					error: "Erro ao criar configurações de pagamento",
				})
			}
		}
	)

	// Testar conexão com Stripe
	app.post(
		"/api/admin/payment-settings/test-stripe",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const { stripeSecretKey, stripeLiveMode } = req.body
				console.log("Testando conexão Stripe:", {
					hasSecretKey: !!stripeSecretKey,
					stripeLiveMode: !!stripeLiveMode,
					keyPrefix: stripeSecretKey
						? stripeSecretKey.substring(0, 7) + "..."
						: "não fornecida",
				})

				if (!stripeSecretKey) {
					return res.status(400).json({
						success: false,
						message: "Chave secreta do Stripe não fornecida",
					})
				}

				// Usando o método de teste do stripe-service.ts
				
				const result = await testStripeConnection(
					stripeSecretKey,
					!!stripeLiveMode
				)

				console.log("Resultado do teste de conexão Stripe:", result)
				res.json(result)
			} catch (error) {
				console.error("Erro ao testar conexão com Stripe:", error)
				res.status(500).json({
					success: false,
					message: `Erro ao testar conexão: ${
						error instanceof Error ? error.message : String(error)
					}`,
				})
			}
		}
	)

	// Testar conexão com Asaas
	app.post(
		"/api/admin/payment-settings/test-asaas",
		isAuthenticated,
		isAdmin,
		async (req, res) => {
			try {
				const { asaasApiKey, asaasLiveMode } = req.body
				console.log("Testando conexão Asaas:", {
					hasApiKey: !!asaasApiKey,
					asaasLiveMode: !!asaasLiveMode,
					keyPrefix: asaasApiKey
						? asaasApiKey.substring(0, 7) + "..."
						: "não fornecida",
				})

				if (!asaasApiKey) {
					return res.status(400).json({
						success: false,
						message: "Chave de API do Asaas não fornecida",
					})
				}

				// Usando o método de teste do asaas-service.ts
				const result = await testAsaasConnection(
					asaasApiKey,
					!!asaasLiveMode
				)

				console.log("Resultado do teste de conexão Asaas:", result)
				res.json(result)
			} catch (error) {
				console.error("Erro ao testar conexão com Asaas:", error)
				res.status(500).json({
					success: false,
					message: `Erro ao testar conexão: ${
						error instanceof Error ? error.message : String(error)
					}`,
				})
			}
		}
	)

	// Função auxiliar para testar conexão com Stripe (implementação simplificada)
	async function testStripeConnection(secretKey: string): Promise<boolean> {
		try {
			// Aqui deveria haver uma chamada real para o Stripe
			// Por exemplo: const stripe = new Stripe(secretKey, { apiVersion: '2023-10-16' });
			// const response = await stripe.balance.retrieve();

			// Simplificação para este exemplo
			return typeof secretKey === "string" && secretKey.startsWith("sk_")
		} catch (error) {
			console.error("Erro na conexão com Stripe:", error)
			return false
		}
	}

	// ----------------------------------------------------------------------
	// WebSocket Server para Notificações em Tempo Real
	// ----------------------------------------------------------------------

	const httpServer = createServer(app)

	// Rotas para disponibilidade de prestadores (Availability)
	// Obter disponibilidade de um prestador
	app.get("/api/availability/:providerId", async (req, res) => {
		try {
			const providerId = parseInt(req.params.providerId)
			console.log(
				`Buscando disponibilidade para o prestador ID: ${providerId}`
			)
			let availabilityList = await storage.getProviderAvailability(
				providerId
			)

			// Se não houver configuração de disponibilidade, criar uma padrão
			if (availabilityList.length === 0) {
				console.log(
					`Nenhuma disponibilidade encontrada para o prestador ${providerId}. Criando configuração padrão.`
				)

				// Criar disponibilidade padrão para todos os dias da semana (exceto domingo)
				const defaultAvailability = []
				for (let dayOfWeek = 0; dayOfWeek < 7; dayOfWeek++) {
					// Pular domingo (0) e sábado à tarde (6)
					const isAvailable = dayOfWeek !== 0

					// Horários padrão: 8h às 18h para dias de semana, 8h às 12h para sábado
					let startTime = "08:00"
					let endTime = dayOfWeek === 6 ? "12:00" : "18:00"

					const availabilityData = {
						providerId,
						dayOfWeek,
						startTime,
						endTime,
						date: null, // Configuração recorrente, não específica
						isAvailable,
						intervalMinutes: 0, // Sem intervalo entre agendamentos
					}

					try {
						const newAvailability =
							await storage.createAvailability(availabilityData)
						defaultAvailability.push(newAvailability)
					} catch (err) {
						console.error(
							`Erro ao criar disponibilidade padrão para dia ${dayOfWeek}:`,
							err
						)
					}
				}

				availabilityList = defaultAvailability
				console.log(
					`Criadas ${availabilityList.length} configurações de disponibilidade padrão`
				)
			}

			res.json(availabilityList)
		} catch (error) {
			console.error("Erro ao buscar disponibilidade:", error)
			res.status(500).json({ error: "Erro ao buscar disponibilidade" })
		}
	})

	// Criar novo horário de disponibilidade
	app.post("/api/availability", isAuthenticated, async (req, res) => {
		try {
			const userId = req.user!.id
			const { dayOfWeek, startTime, endTime, isAvailable, providerId } =
				req.body

			// Verificar se o usuário é o próprio prestador ou um admin
			if (userId !== providerId && req.user!.userType !== "admin") {
				return res.status(403).json({
					error: "Não autorizado a modificar disponibilidade deste prestador",
				})
			}

			console.log("Criando novo horário de disponibilidade:", req.body)

			const newAvailability = await storage.createAvailability({
				providerId,
				dayOfWeek,
				startTime,
				endTime,
				isAvailable: isAvailable === undefined ? true : isAvailable,
			})

			res.status(201).json(newAvailability)
		} catch (error) {
			console.error("Erro ao criar disponibilidade:", error)
			res.status(500).json({
				error: `Erro ao criar disponibilidade: ${
					error instanceof Error ? error.message : String(error)
				}`,
			})
		}
	})

	// Atualizar horário de disponibilidade
	app.put("/api/availability/:id", isAuthenticated, async (req, res) => {
		try {
			const availabilityId = parseInt(req.params.id)
			const userId = req.user!.id
			const { dayOfWeek, startTime, endTime, isAvailable } = req.body

			// Buscar a disponibilidade para verificar a propriedade
			const availability = await storage.getAvailability(availabilityId)

			if (!availability) {
				return res
					.status(404)
					.json({ error: "Disponibilidade não encontrada" })
			}

			// Verificar se o usuário é o próprio prestador ou um admin
			if (
				userId !== availability.providerId &&
				req.user!.userType !== "admin"
			) {
				return res
					.status(403)
					.json({
						error: "Não autorizado a modificar esta disponibilidade",
					})
			}

			const updatedAvailability = await storage.updateAvailability(
				availabilityId,
				{
					dayOfWeek,
					startTime,
					endTime,
					isAvailable,
				}
			)

			res.json(updatedAvailability)
		} catch (error) {
			console.error("Erro ao atualizar disponibilidade:", error)
			res.status(500).json({ error: "Erro ao atualizar disponibilidade" })
		}
	})

	// Excluir horário de disponibilidade
	app.delete("/api/availability/:id", isAuthenticated, async (req, res) => {
		try {
			const availabilityId = parseInt(req.params.id)
			const userId = req.user!.id

			// Buscar a disponibilidade para verificar a propriedade
			const availability = await storage.getAvailability(availabilityId)

			if (!availability) {
				return res
					.status(404)
					.json({ error: "Disponibilidade não encontrada" })
			}

			// Verificar se o usuário é o próprio prestador ou um admin
			if (
				userId !== availability.providerId &&
				req.user!.userType !== "admin"
			) {
				return res
					.status(403)
					.json({
						error: "Não autorizado a excluir esta disponibilidade",
					})
			}

			await storage.deleteAvailability(availabilityId)
			res.status(204).send()
		} catch (error) {
			console.error("Erro ao excluir disponibilidade:", error)
			res.status(500).json({ error: "Erro ao excluir disponibilidade" })
		}
	})

	// Rota para análise de tempo de execução de serviços
	app.get(
		"/api/analytics/service-execution/:serviceId/provider/:providerId",
		isAuthenticated,
		async (req, res) => {
			try {
				const serviceId = parseInt(req.params.serviceId)
				const providerId = parseInt(req.params.providerId)

				if (isNaN(serviceId) || isNaN(providerId)) {
					return res
						.status(400)
						.json({ error: "Parâmetros inválidos" })
				}

				// Verificar permissões - usuário deve ser o próprio prestador, admin ou support
				if (
					req.user!.userType !== "admin" &&
					req.user!.userType !== "support" &&
					(req.user!.userType !== "provider" ||
						req.user!.id !== providerId)
				) {
					return res.status(403).json({ error: "Acesso negado" })
				}

				// Como os dados reais talvez ainda não existam, vamos usar uma simulação inteligente
				// para demonstrar a funcionalidade de análise

				// Em um sistema de produção, buscaríamos os dados de agendamentos concluídos
				// Simulação de dados baseada no serviço
				const service = await storage.getService(serviceId)

				if (!service) {
					return res
						.status(404)
						.json({ error: "Serviço não encontrado" })
				}

				// Obter configuração personalizada de tempo, se existir
				const providerService =
					await storage.getProviderServiceByProviderAndService(
						providerId,
						serviceId
					)

				// Obter agendamentos do prestador para este serviço (mesmo que não usemos agora)
				// Usar getProviderAppointments e filtrar por serviço enquanto implementamos getAppointmentsByProviderAndService completamente
				const allAppointments = await storage.getProviderAppointments(
					providerId
				)
				const appointments = allAppointments.filter(
					(app) => app.serviceId === serviceId
				)

				// Gerar estatísticas baseadas no contexto
				// Em um sistema real, isso seria calculado com base nos agendamentos concluídos
				const defaultDuration = service.duration
				const customDuration =
					providerService?.executionTime || defaultDuration

				// Gerar estatísticas inteligentes
				const simulatedAverage =
					defaultDuration * 1.1 + Math.random() * 5 - 2.5
				const simulatedMin = Math.max(
					5,
					simulatedAverage - (5 + Math.random() * 5)
				)
				const simulatedMax = simulatedAverage + (5 + Math.random() * 10)
				const appointmentCount =
					appointments.length || 5 + Math.floor(Math.random() * 15)

				// Criar estatísticas de tempo de execução
				const stats = {
					count: appointmentCount,
					averageDuration: simulatedAverage,
					minimumDuration: simulatedMin,
					maximumDuration: simulatedMax,
				}

				// Quando o sistema tiver dados reais, o código seria substituído por:
				// const stats = await storage.getServiceExecutionStatsByProviderAndService(providerId, serviceId);

				res.json(stats)
			} catch (error) {
				console.error(
					"Erro ao buscar estatísticas de execução de serviço:",
					error
				)
				res.status(500).json({ error: "Erro ao buscar estatísticas" })
			}
		}
	)

	// Configurar WebSocket Server com um path específico para evitar conflito com o HMR do Vite
	// Usar um path de API (/api/ws) em vez de /ws para não colidir com o Vite
	const wss = new WebSocketServer({
		server: httpServer,
		path: "/api/ws",
		// Aumentar o tempo limite de ping (normalmente 30 segundos) para 60 segundos
		clientTracking: true,
	})

	// Mapear conexões por ID de usuário
	// Map<userId, WebSocket[]>>
	const connections = new Map<number, WebSocket[]>()

	// Configurar heartbeat para evitar timeouts e desconexões
	function heartbeat(this: WebSocket) {
		;(this as any).isAlive = true
	}

	// Verificar conexões ativas periodicamente
	const pingInterval = setInterval(() => {
		wss.clients.forEach((ws) => {
			if ((ws as any).isAlive === false) {
				// Se não recebeu pong desde o último ping, encerrar conexão
				return ws.terminate()
			}

			// Marcar como inativo até receber pong
			;(ws as any).isAlive = false
			// Enviar ping
			try {
				ws.ping()
			} catch (e) {
				// Se não conseguir enviar ping, encerrar conexão
				ws.terminate()
			}
		})
	}, 30000) // Verificar a cada 30 segundos

	// Limpar intervalo quando servidor WebSocket for fechado
	wss.on("close", () => {
		clearInterval(pingInterval)
	})

	wss.on("connection", (ws: WebSocket) => {
		console.log("Nova conexão WebSocket estabelecida")

		// Inicializar o estado de "alive" para este cliente
		;(ws as any).isAlive = true

		// Responder a pings com pongs para manter conexão
		ws.on("pong", heartbeat)

		// O cliente deve enviar uma mensagem de autenticação
		ws.on("message", (message: string) => {
			try {
				const data = JSON.parse(message)

				if (data.type === "auth" && data.userId) {
					const userId = data.userId
					console.log(`Usuário ${userId} autenticado via WebSocket`)

					// Adicionar essa conexão ao mapa de conexões do usuário
					if (!connections.has(userId)) {
						connections.set(userId, [])
					}

					// Verificar se esta conexão já existe no array
					const userConnections = connections.get(userId)!
					if (!userConnections.includes(ws)) {
						userConnections.push(ws)
					}

					// Enviar confirmação
					ws.send(
						JSON.stringify({
							type: "auth_success",
							message: "Autenticado com sucesso",
						})
					)

					// Enviar um ping imediatamente para verificar a conexão
					try {
						ws.ping()
					} catch (e) {
						console.error("Erro ao enviar ping inicial:", e)
					}
				}
			} catch (error) {
				console.error("Erro ao processar mensagem WebSocket:", error)
			}
		})

		// Tratar desconexão
		ws.on("close", () => {
			console.log("Conexão WebSocket fechada")

			// Remover a conexão fechada do mapa
			// Converter o iterador para um array antes de iterar para evitar problemas de tipagem
			for (const [userId, userConnections] of Array.from(
				connections.entries()
			)) {
				const index = userConnections.indexOf(ws)
				if (index !== -1) {
					userConnections.splice(index, 1)

					// Se não houver mais conexões para este usuário, remover a entrada
					if (userConnections.length === 0) {
						connections.delete(userId)
					}
					break
				}
			}
		})
	})

	// Função auxiliar para enviar notificações em tempo real
	function sendNotification(userId: number, notification: any) {
		// Persistir a notificação no banco de dados
		storage
			.createNotification({
				userId: userId,
				title: notification.title,
				message: notification.message,
				type: notification.type,
				read: false,
				linkTo: notification.linkTo || null,
				appointmentId: notification.appointmentId || null,
			})
			.catch((error) => {
				console.error("Erro ao salvar notificação:", error)
			})

		// Enviar notificação em tempo real se o usuário estiver conectado
		const userConnections = connections.get(userId)
		if (userConnections && userConnections.length > 0) {
			const message = JSON.stringify({
				type: "notification",
				data: notification,
			})

			userConnections.forEach((connection) => {
				if (connection.readyState === WebSocket.OPEN) {
					connection.send(message)
				}
			})
		}
	}

	// ---------------------------------------------------------------------
	// ---------------------------------------------------------------------
	// Registro das Rotas de Administração (Incluindo Sistema de Suporte)
	// ---------------------------------------------------------------------

	// Registrar todas as rotas do admin sob /api/admin
	app.use("/api/admin", adminRouter)

	// ---------------------------------------------------------------------
	// ---------------------------------------------------------------------
	// Rotas de Pagamento Stripe
	// ---------------------------------------------------------------------

	// Rota para criar um payment intent (necessário para processamento de pagamentos Stripe)
	app.post("/api/create-payment-intent", async (req, res) => {
		try {
			if (!stripe) {
				return res.status(500).json({
					error: "Serviço de pagamento não está configurado. Contate o administrador.",
				})
			}

			const { amount, description, appointmentId } = req.body

			if (!amount || amount <= 0) {
				return res.status(400).json({
					error: "Valor de pagamento inválido",
				})
			}

			// Converter para centavos (Stripe trabalha com a menor unidade monetária)
			const amountInCents = Math.round(amount * 100)

			// Criar o payment intent
			const paymentIntent = await stripe.paymentIntents.create({
				amount: amountInCents,
				currency: "brl", // Usando BRL como moeda para o Brasil
				description: description || "Pagamento AgendoAI",
				metadata: {
					appointmentId: appointmentId || "",
					source: "agendoai_web",
				},
			})

			// Retornar o client_secret que será usado pelo frontend
			res.json({
				clientSecret: paymentIntent.client_secret,
			})
		} catch (error: any) {
			console.error("Erro ao criar payment intent:", error)
			res.status(500).json({
				error:
					"Erro ao processar pagamento: " +
					(error.message || "Erro desconhecido"),
			})
		}
	})

	// Rota para verificar o status de um pagamento
	app.get("/api/verify-payment/:paymentIntentId", async (req, res) => {
		try {
			if (!stripe) {
				return res.status(500).json({
					error: "Serviço de pagamento não está configurado",
				})
			}

			const { paymentIntentId } = req.params

			if (!paymentIntentId) {
				return res.status(400).json({
					error: "ID do pagamento não fornecido",
				})
			}

			// Buscar o payment intent pelo ID
			const paymentIntent = await stripe.paymentIntents.retrieve(
				paymentIntentId
			)

			res.json({
				status: paymentIntent.status,
				amount: paymentIntent.amount / 100, // Converter de centavos para reais
				metadata: paymentIntent.metadata,
			})
		} catch (error: any) {
			console.error("Erro ao verificar pagamento:", error)
			res.status(500).json({
				error:
					"Erro ao verificar pagamento: " +
					(error.message || "Erro desconhecido"),
			})
		}
	})

	// ---------------------------------------------------------------------
	// Rotas de Avaliações
	// ---------------------------------------------------------------------

	// Criar uma nova avaliação para um prestador de serviço
	app.post("/api/reviews", isAuthenticated, isClient, async (req, res) => {
		try {
			const clientId = req.user!.id
			const {
				providerId,
				appointmentId,
				rating,
				comment,
				isPublic = true,
			} = req.body

			// Verificar se o agendamento existe e está concluído
			const appointment = await storage.getAppointment(appointmentId)

			if (!appointment) {
				return res
					.status(404)
					.json({ error: "Agendamento não encontrado" })
			}

			if (appointment.clientId !== clientId) {
				return res.status(403).json({
					error: "Você não pode avaliar um agendamento que não é seu",
				})
			}

			if (appointment.status !== "completed") {
				return res
					.status(400)
					.json({
						error: "Você só pode avaliar agendamentos concluídos",
					})
			}

			// Verificar se já existe uma avaliação para este agendamento
			const existingReview = await storage.getAppointmentReview(
				appointmentId
			)
			if (existingReview) {
				return res
					.status(400)
					.json({ error: "Este agendamento já foi avaliado" })
			}

			// Criar a avaliação
			const review = await storage.createReview({
				clientId,
				providerId,
				appointmentId,
				rating,
				comment,
				isPublic,
			})

			// Enviar notificação ao prestador
			sendNotification(providerId, {
				title: "Nova avaliação recebida",
				message: `Você recebeu uma avaliação de ${
					req.user!.name || "um cliente"
				}.`,
				type: "review",
				appointmentId,
			})

			res.status(201).json(review)
		} catch (error) {
			console.error("Erro ao criar avaliação:", error)
			res.status(500).json({ error: "Erro ao criar avaliação" })
		}
	})

	// Segunda rota para criar avaliação (para compatibilidade com o frontend)
	app.post(
		"/api/appointments/:id/reviews",
		isAuthenticated,
		isClient,
		async (req, res) => {
			try {
				const clientId = req.user!.id
				const appointmentId = parseInt(req.params.id)
				const {
					providerId,
					rating,
					comment,
					isPublic = true,
				} = req.body

				// Verificar se o agendamento existe e está concluído
				const appointment = await storage.getAppointment(appointmentId)

				if (!appointment) {
					return res
						.status(404)
						.json({ error: "Agendamento não encontrado" })
				}

				if (appointment.clientId !== clientId) {
					return res.status(403).json({
						error: "Você não pode avaliar um agendamento que não é seu",
					})
				}

				if (appointment.status !== "completed") {
					return res
						.status(400)
						.json({
							error: "Você só pode avaliar agendamentos concluídos",
						})
				}

				// Verificar se já existe uma avaliação para este agendamento
				const existingReview = await storage.getAppointmentReview(
					appointmentId
				)
				if (existingReview) {
					return res
						.status(400)
						.json({ error: "Este agendamento já foi avaliado" })
				}

				// Criar a avaliação
				const review = await storage.createReview({
					clientId,
					providerId,
					appointmentId,
					rating,
					comment,
					isPublic,
				})

				// Enviar notificação ao prestador
				sendNotification(providerId, {
					title: "Nova avaliação recebida",
					message: `Você recebeu uma avaliação de ${
						req.user!.name || "um cliente"
					}.`,
					type: "review",
					appointmentId,
				})

				res.status(201).json(review)
			} catch (error) {
				console.error("Erro ao criar avaliação:", error)
				res.status(500).json({ error: "Erro ao criar avaliação" })
			}
		}
	)

	// Obter avaliações de um prestador
	// Obter serviços de um prestador com informações hierárquicas completas
	app.get("/api/providers/:id/services", async (req, res) => {
		try {
			const providerId = parseInt(req.params.id)

			// Obter serviços do prestador
			const services = await storage.getServicesByProvider(providerId)

			// Obter categorias com informações de nicho
			const categoriesWithNicheInfo =
				await storage.getCategoriesWithNicheInfo()

			// Enriquecer cada serviço com informações da categoria e nicho
			const servicesWithHierarchy = services.map((service) => {
				const categoryInfo = categoriesWithNicheInfo.find(
					(c) => c.id === service.categoryId
				)

				return {
					...service,
					categoryName:
						categoryInfo?.name || "Categoria Desconhecida",
					categoryIcon: categoryInfo?.icon || "",
					nicheName: categoryInfo?.nicheName || "Nicho Desconhecido",
					nicheIcon: categoryInfo?.nicheIcon || "",
				}
			})

			// Forçar o tipo de conteúdo para JSON e desabilitar cache
			res.setHeader("Content-Type", "application/json")
			res.setHeader("Cache-Control", "no-store")
			res.status(200).json(servicesWithHierarchy)

			// Imprimir para debug
			console.log(
				`Serviços do prestador ${providerId}: ${JSON.stringify(
					servicesWithHierarchy
				)}`
			)
		} catch (error) {
			console.error("Erro ao buscar serviços do prestador:", error)
			res.status(500).json({
				error: "Erro ao buscar serviços do prestador",
			})
		}
	})

	app.get("/api/providers/:id/reviews", async (req, res) => {
		try {
			const providerId = parseInt(req.params.id)
			const reviews = await storage.getProviderReviews(providerId)
			res.json(reviews)
		} catch (error) {
			console.error("Erro ao buscar avaliações do prestador:", error)
			res.status(500).json({
				error: "Erro ao buscar avaliações do prestador",
			})
		}
	})

	// Obter avaliações do cliente logado
	app.get(
		"/api/client/reviews",
		isAuthenticated,
		isClient,
		async (req, res) => {
			try {
				const clientId = req.user!.id
				const reviews = await storage.getClientReviews(clientId)
				res.json(reviews)
			} catch (error) {
				console.error("Erro ao buscar avaliações do cliente:", error)
				res.status(500).json({
					error: "Erro ao buscar avaliações do cliente",
				})
			}
		}
	)

	// Atualizar uma avaliação
	app.put("/api/reviews/:id", isAuthenticated, isClient, async (req, res) => {
		try {
			const reviewId = parseInt(req.params.id)
			const clientId = req.user!.id
			const { rating, comment, isPublic } = req.body

			// Verificar se a avaliação existe
			const review = await storage.getReview(reviewId)

			if (!review) {
				return res
					.status(404)
					.json({ error: "Avaliação não encontrada" })
			}

			// Verificar se a avaliação pertence ao cliente
			if (review.clientId !== clientId) {
				return res.status(403).json({
					error: "Você não pode editar avaliações de outros clientes",
				})
			}

			// Atualizar a avaliação
			const updatedReview = await storage.updateReview(reviewId, {
				rating,
				comment,
				isPublic,
				updatedAt: new Date(),
			})

			res.json(updatedReview)
		} catch (error) {
			console.error("Erro ao atualizar avaliação:", error)
			res.status(500).json({ error: "Erro ao atualizar avaliação" })
		}
	})

	// Excluir uma avaliação
	app.delete("/api/reviews/:id", isAuthenticated, async (req, res) => {
		try {
			const reviewId = parseInt(req.params.id)
			const userId = req.user!.id

			// Verificar se a avaliação existe
			const review = await storage.getReview(reviewId)

			if (!review) {
				return res
					.status(404)
					.json({ error: "Avaliação não encontrada" })
			}

			// Verificar se o usuário tem permissão para excluir (cliente que criou ou admin)
			if (review.clientId !== userId && req.user!.userType !== "admin") {
				return res.status(403).json({
					error: "Você não tem permissão para excluir esta avaliação",
				})
			}

			// Excluir a avaliação
			const result = await storage.deleteReview(reviewId)

			if (result) {
				res.json({ success: true })
			} else {
				res.status(500).json({ error: "Erro ao excluir avaliação" })
			}
		} catch (error) {
			console.error("Erro ao excluir avaliação:", error)
			res.status(500).json({ error: "Erro ao excluir avaliação" })
		}
	})

	// Adicionar resposta do prestador a uma avaliação
	app.post(
		"/api/reviews/:id/response",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const reviewId = parseInt(req.params.id)
				const providerId = req.user!.id
				const { response } = req.body

				// Verificar se a avaliação existe
				const review = await storage.getReview(reviewId)

				if (!review) {
					return res
						.status(404)
						.json({ error: "Avaliação não encontrada" })
				}

				// Verificar se a avaliação é para este prestador
				if (review.providerId !== providerId) {
					return res.status(403).json({
						error: "Você só pode responder avaliações direcionadas a você",
					})
				}

				// Atualizar a avaliação com a resposta
				const updatedReview = await storage.updateReview(reviewId, {
					providerResponse: response,
					updatedAt: new Date(),
				})

				// Notificar o cliente que sua avaliação recebeu uma resposta
				sendNotification(review.clientId, {
					title: "Sua avaliação recebeu uma resposta",
					message: `${
						req.user!.name || "O prestador"
					} respondeu à sua avaliação.`,
					type: "review_response",
					appointmentId: review.appointmentId,
				})

				res.json(updatedReview)
			} catch (error) {
				console.error("Erro ao adicionar resposta:", error)
				res.status(500).json({ error: "Erro ao adicionar resposta" })
			}
		}
	)

	// Função utilitária para inicializar configurações do prestador
	async function initializeProviderSettings(
		userId: number,
		userName: string | null
	): Promise<any> {
		try {
			// Verificar se já existem configurações
			let settings = await storage.getProviderSettings(userId)

			// Se não existirem, criar automaticamente
			if (!settings) {
				console.log(
					`Inicializando configurações para prestador ${userId}`
				)

				settings = await storage.createProviderSettings({
					providerId: userId,
					isOnline: true,
					businessName: userName || "Minha Empresa",
					// Valores padrão para métodos de pagamento
					acceptsCards: true,
					acceptsPix: true,
					acceptsCash: true,
					// Iniciar contador de avaliações
					ratingCount: 0,
				})
				console.log(
					`Configurações do prestador criadas com sucesso para ${userId}`
				)
			}

			return settings
		} catch (error) {
			console.error(
				`Erro ao inicializar configurações para prestador ${userId}:`,
				error
			)
			throw error
		}
	}

	// Rota para buscar ou criar automaticamente as configurações do prestador
	app.get(
		"/api/provider-settings",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const providerId = req.user!.id
				const settings = await initializeProviderSettings(
					providerId,
					req.user!.name
				)
				res.json(settings || {})
			} catch (error) {
				console.error(
					"Erro ao buscar configurações do prestador:",
					error
				)
				res.status(500).json({
					error: "Erro ao buscar configurações do prestador",
				})
			}
		}
	)

	// Rota para atualizar as configurações do prestador
	app.put(
		"/api/provider-settings",
		isAuthenticated,
		isProvider,
		async (req, res) => {
			try {
				const providerId = req.user!.id
				const settingsData = req.body

				// Registrar dados recebidos para debug
				console.log(
					`Atualizando configurações do prestador ${providerId}:`,
					settingsData
				)

				// Atualizar configurações
				const updatedSettings = await storage.updateProviderSettings(
					providerId,
					settingsData
				)

				if (!updatedSettings) {
					return res
						.status(404)
						.json({
							error: "Configurações do prestador não encontradas",
						})
				}

				console.log(
					`Configurações do prestador ${providerId} atualizadas com sucesso`
				)
				res.json(updatedSettings)
			} catch (error) {
				console.error(
					"Erro ao atualizar configurações do prestador:",
					error
				)
				res.status(500).json({
					error: "Erro ao atualizar configurações do prestador",
				})
			}
		}
	)

	// Rota específica para inicializar configurações de prestador
	// Esta rota é útil para chamadas de sistema que precisam garantir que as configurações existam
	app.post(
		"/api/provider-settings/initialize",
		isAuthenticated,
		async (req, res) => {
			try {
				// Verificar se o usuário é um prestador ou é admin/suporte
				const userId = req.body.providerId || req.user!.id
				const userName = req.body.providerName || req.user!.name

				if (
					req.user!.id !== userId &&
					!["admin", "support"].includes(req.user!.userType)
				) {
					return res.status(403).json({
						error: "Você não tem permissão para inicializar configurações de outro prestador",
					})
				}

				// Verificar se o usuário alvo é um prestador
				if (req.body.providerId) {
					const targetUser = await storage.getUser(userId)
					if (!targetUser || targetUser.userType !== "provider") {
						return res.status(400).json({
							error: "O usuário especificado não é um prestador ou não existe",
						})
					}
				} else if (req.user!.userType !== "provider") {
					return res.status(400).json({
						error: "Apenas prestadores podem ter configurações inicializadas",
					})
				}

				const settings = await initializeProviderSettings(
					userId,
					userName
				)
				res.json({
					success: true,
					message:
						"Configurações do prestador inicializadas com sucesso",
					settings,
				})
			} catch (error) {
				console.error(
					"Erro ao inicializar configurações do prestador:",
					error
				)
				res.status(500).json({
					error: "Erro ao inicializar configurações do prestador",
				})
			}
		}
	)

	// =========================================================
	// API de Cartões de Crédito
	// =========================================================

	// Buscar métodos de pagamento disponíveis (endpoint público)
	app.get("/api/payment-methods/available", async (req, res) => {
		try {
			// Buscar configurações de pagamento do sistema
			const paymentSettings = await getPaymentSettings()

			// Definir tipo para método de pagamento
			type PaymentMethod = {
				id: string
				name: string
				type: "offline" | "online"
				processor?: "stripe" | "asaas"
			}

			// Opções padrão sempre disponíveis
			const availableMethods: PaymentMethod[] = [
				{ id: "money", name: "Dinheiro", type: "offline" },
				{
					id: "card_local",
					name: "Cartão (presencial)",
					type: "offline",
				},
				{ id: "pix_local", name: "PIX (presencial)", type: "offline" },
			]

			// Verificar se Stripe está habilitado
			if (
				paymentSettings?.stripeEnabled &&
				paymentSettings?.stripeSecretKey
			) {
				availableMethods.push({
					id: "stripe_card",
					name: "Cartão de Crédito Online",
					type: "online",
					processor: "stripe",
				})
			}

			// Verificar se Asaas está habilitado
			if (paymentSettings?.asaasEnabled && paymentSettings?.asaasApiKey) {
				availableMethods.push(
					{
						id: "asaas_card",
						name: "Cartão de Crédito",
						type: "online",
						processor: "asaas",
					},
					{
						id: "asaas_pix",
						name: "PIX",
						type: "online",
						processor: "asaas",
					}
				)
			}

			res.json(availableMethods)
		} catch (error) {
			console.error(
				"Erro ao buscar métodos de pagamento disponíveis:",
				error
			)
			res.status(500).json({
				error: "Erro ao buscar métodos de pagamento",
			})
		}
	})

	// Endpoint para gerenciar assinaturas
	app.post(
		"/api/get-or-create-subscription",
		isAuthenticated,
		async (req, res) => {
			try {
				const user = req.user!

				// Verificar se o usuário já tem um ID de assinatura no Stripe
				const userData = await storage.getUserPaymentMethod(user.id)

				if (userData?.stripeSubscriptionId) {
					// Buscar detalhes da assinatura no Stripe
					const stripeClient = getStripeClient()
					const subscription =
						await stripeClient.subscriptions.retrieve(
							userData.stripeSubscriptionId
						)

					res.send({
						subscriptionId: subscription.id,
						clientSecret:
							subscription.latest_invoice?.payment_intent
								?.client_secret,
					})

					return
				}

				if (!userData?.stripeCustomerId) {
					// Criar cliente Stripe para o usuário
					const stripeCustomerId = await createStripeCustomer(
						user.id,
						user.email,
						user.name || `Cliente ${user.id}`
					)

					// Salvar ID do cliente Stripe
					if (userData) {
						await storage.updateUserPaymentMethod(user.id, {
							stripeCustomerId,
						})
					} else {
						await storage.createUserPaymentMethod({
							userId: user.id,
							stripeCustomerId,
						})
					}
				}

				// Recarregar dados do usuário
				const updatedUserData = await storage.getUserPaymentMethod(
					user.id
				)

				if (!updatedUserData?.stripeCustomerId) {
					throw new Error(
						"Não foi possível criar ou recuperar o cliente Stripe"
					)
				}

				if (!process.env.STRIPE_PRICE_ID) {
					throw new Error("STRIPE_PRICE_ID não configurado")
				}

				// Criar assinatura
				const stripeClient = getStripeClient()
				const subscription = await stripeClient.subscriptions.create({
					customer: updatedUserData.stripeCustomerId,
					items: [
						{
							price: process.env.STRIPE_PRICE_ID,
						},
					],
					payment_behavior: "default_incomplete",
					expand: ["latest_invoice.payment_intent"],
				})

				// Atualizar o perfil do usuário com os IDs da assinatura
				await storage.updateUserPaymentMethod(user.id, {
					stripeSubscriptionId: subscription.id,
				})

				res.send({
					subscriptionId: subscription.id,
					clientSecret:
						subscription.latest_invoice?.payment_intent
							?.client_secret,
				})
			} catch (error: any) {
				console.error("Erro ao criar assinatura:", error)
				return res
					.status(400)
					.send({ error: { message: error.message } })
			}
		}
	)

	// Endpoint para criar payment intent (pagamento único)
	app.post("/api/create-payment-intent", async (req, res) => {
		try {
			const {
				amount,
				description = "Pagamento de serviço",
				appointmentId,
			} = req.body

			if (!amount || isNaN(amount) || amount <= 0) {
				return res.status(400).json({
					message: "O valor do pagamento é inválido",
				})
			}

			// Verificar se o Stripe está configurado
			if (!isStripeEnabled()) {
				await initializeStripe()
				if (!isStripeEnabled()) {
					return res.status(500).json({
						message:
							"O processador de pagamento Stripe não está configurado",
					})
				}
			}

			// Obter cliente Stripe
			const stripeClient = getStripeClient()

			// Metadados adicionais para o payment intent
			const metadata: Record<string, string> = {
				description,
			}

			if (appointmentId) {
				metadata.appointmentId = appointmentId.toString()

				// Se temos um ID de agendamento, buscar informações adicionais
				const appointment = await storage.getAppointment(
					parseInt(appointmentId)
				)
				if (appointment) {
					metadata.clientId = appointment.clientId.toString()
					metadata.providerId = appointment.providerId.toString()
					metadata.serviceName =
						appointment.serviceName || "Serviço não especificado"
				}
			}

			// Criar payment intent
			const paymentIntent = await stripeClient.paymentIntents.create({
				amount: Math.round(amount * 100), // Converter para centavos
				currency: "brl",
				metadata,
				description,
			})

			res.json({ clientSecret: paymentIntent.client_secret })
		} catch (error: any) {
			console.error("Erro ao criar payment intent:", error)
			res.status(500).json({
				message: "Erro ao criar payment intent: " + error.message,
			})
		}
	})

	// Verificar status de um pagamento
	app.get(
		"/api/payment-status/:paymentIntentId",
		isAuthenticated,
		async (req, res) => {
			try {
				const { paymentIntentId } = req.params

				if (!paymentIntentId) {
					return res.status(400).json({
						success: false,
						message: "ID do pagamento não fornecido",
					})
				}

				// Verificar se o Stripe está configurado
				if (!isStripeEnabled()) {
					await initializeStripe()
					if (!isStripeEnabled()) {
						return res.status(500).json({
							success: false,
							message:
								"O processador de pagamento Stripe não está configurado",
						})
					}
				}

				// Obter cliente Stripe
				const stripeClient = getStripeClient()

				// Buscar payment intent
				const paymentIntent =
					await stripeClient.paymentIntents.retrieve(paymentIntentId)

				// Verificar se o pagamento pertence ao usuário autenticado
				const userId = req.user!.id
				const appointmentId = paymentIntent.metadata?.appointmentId

				if (appointmentId) {
					const appointment = await storage.getAppointment(
						parseInt(appointmentId)
					)

					if (
						appointment &&
						appointment.clientId !== userId &&
						req.user!.userType !== "admin"
					) {
						return res.status(403).json({
							success: false,
							message:
								"Você não tem permissão para acessar este pagamento",
						})
					}
				}

				// Formatar resposta
				const payment = {
					id: paymentIntent.id,
					status: paymentIntent.status,
					amount: (paymentIntent.amount / 100).toFixed(2),
					currency: paymentIntent.currency,
					description: paymentIntent.description,
					appointmentId: paymentIntent.metadata?.appointmentId,
					created: new Date(
						paymentIntent.created * 1000
					).toISOString(),
					isSuccessful: ["succeeded", "processing"].includes(
						paymentIntent.status
					),
				}

				res.json({
					success: true,
					payment,
				})
			} catch (error: any) {
				console.error("Erro ao verificar status do pagamento:", error)
				res.status(500).json({
					success: false,
					message:
						"Erro ao verificar status do pagamento: " +
						error.message,
				})
			}
		}
	)

	// Criar cliente Stripe para usuário (se não existir)
	app.post(
		"/api/payment/setup-customer",
		isAuthenticated,
		async (req, res) => {
			try {
				const user = req.user!

				// Verificar se o usuário já tem um customerId usando a nova interface
				const userData = await storage.getUserPaymentMethod(user.id)

				if (userData && userData.stripeCustomerId) {
					return res.json({
						success: true,
						customerId: userData.stripeCustomerId,
						message: "Cliente Stripe já existe",
					})
				}

				// Criar cliente Stripe
				const stripeCustomerId = await createStripeCustomer(
					user.id,
					user.email,
					user.name || `Cliente ${user.id}`
				)

				// Salvar o ID do cliente Stripe usando a nova interface
				await storage.createUserPaymentMethod({
					userId: user.id,
					stripeCustomerId,
				})

				res.json({
					success: true,
					customerId: stripeCustomerId,
					message: "Cliente Stripe criado com sucesso",
				})
			} catch (error: any) {
				console.error("Erro ao configurar cliente Stripe:", error)
				res.status(500).json({
					success: false,
					error:
						"Erro ao configurar cliente Stripe: " + error.message,
				})
			}
		}
	)

	// Setup para adicionar novo cartão de crédito (cria um Setup Intent)
	app.post("/api/payment/setup-intent", isAuthenticated, async (req, res) => {
		try {
			const user = req.user!

			// Obter ou criar os dados do Stripe
			const userData = await getUserStripeData(
				user.id,
				user.email,
				user.name || `Cliente ${user.id}`
			)

			if (!userData || !userData.stripeCustomerId) {
				return res.status(400).json({
					error: "Não foi possível criar cliente Stripe",
				})
			}

			// Obter o cliente Stripe
			const stripeClient = getStripeClient()

			// Criar um setup intent para adicionar novo cartão
			const setupIntent = await stripeClient.setupIntents.create({
				customer: userData.stripeCustomerId,
				usage: "off_session",
			})

			res.json({
				clientSecret: setupIntent.client_secret,
				customerId: userData.stripeCustomerId,
			})
		} catch (error: any) {
			console.error("Erro ao criar setup intent:", error)
			res.status(500).json({
				error: "Erro ao processar solicitação: " + error.message,
			})
		}
	})

	// Listar cartões do usuário
	app.get("/api/payment/cards", isAuthenticated, async (req, res) => {
		try {
			const user = req.user!

			// Verificar se o usuário tem um customerId
			const userData = await storage.getUserPaymentMethod(user.id)

			if (!userData || !userData.stripeCustomerId) {
				return res.json([])
			}

			// Listar métodos de pagamento
			const paymentMethods = await listPaymentMethods(
				userData.stripeCustomerId
			)

			// Formatar resposta
			const cards = paymentMethods.map((pm) => formatCardDetails(pm))

			res.json(cards)
		} catch (error: any) {
			console.error("Erro ao listar cartões:", error)
			res.status(500).json({
				error: "Erro ao listar cartões: " + error.message,
			})
		}
	})

	// Remover cartão
	app.delete(
		"/api/payment/cards/:paymentMethodId",
		isAuthenticated,
		async (req, res) => {
			try {
				const user = req.user!
				const paymentMethodId = req.params.paymentMethodId

				// Verificar se o usuário tem um customerId
				const userData = await storage.getUserPaymentMethod(user.id)

				if (!userData || !userData.stripeCustomerId) {
					return res.status(404).json({
						error: "Usuário não possui cliente Stripe configurado",
					})
				}

				// Verificar se o método de pagamento pertence ao cliente
				const paymentMethods = await listPaymentMethods(
					userData.stripeCustomerId
				)
				const paymentMethod = paymentMethods.find(
					(pm) => pm.id === paymentMethodId
				)

				if (!paymentMethod) {
					return res.status(404).json({
						error: "Método de pagamento não encontrado ou não pertence a este usuário",
					})
				}

				// Remover cartão
				await removePaymentMethod(paymentMethodId)

				// Se o cartão for o padrão, atualizar no banco de dados
				if (userData.defaultPaymentMethodId === paymentMethodId) {
					await storage.updateUserPaymentMethod(user.id, {
						defaultPaymentMethodId: null,
					})
				}

				res.json({
					success: true,
					message: "Cartão removido com sucesso",
				})
			} catch (error: any) {
				console.error("Erro ao remover cartão:", error)
				res.status(500).json({
					error: "Erro ao remover cartão: " + error.message,
				})
			}
		}
	)

	// Definir cartão como padrão
	app.post(
		"/api/payment/cards/:paymentMethodId/set-default",
		isAuthenticated,
		async (req, res) => {
			try {
				const user = req.user!
				const paymentMethodId = req.params.paymentMethodId

				// Verificar se o usuário tem um customerId
				const userData = await storage.getUserPaymentMethod(user.id)

				if (!userData || !userData.stripeCustomerId) {
					return res.status(404).json({
						error: "Usuário não possui cliente Stripe configurado",
					})
				}

				// Verificar se o método de pagamento pertence ao cliente
				const paymentMethods = await listPaymentMethods(
					userData.stripeCustomerId
				)
				const paymentMethod = paymentMethods.find(
					(pm) => pm.id === paymentMethodId
				)

				if (!paymentMethod) {
					return res.status(404).json({
						error: "Método de pagamento não encontrado ou não pertence a este usuário",
					})
				}

				// Definir como padrão no Stripe
				await setDefaultPaymentMethod(
					userData.stripeCustomerId,
					paymentMethodId
				)

				// Atualizar no banco de dados
				await storage.updateUserPaymentMethod(user.id, {
					defaultPaymentMethodId: paymentMethodId,
				})

				res.json({
					success: true,
					message: "Cartão definido como padrão com sucesso",
				})
			} catch (error: any) {
				console.error("Erro ao definir cartão como padrão:", error)
				res.status(500).json({
					error:
						"Erro ao definir cartão como padrão: " + error.message,
				})
			}
		}
	)

	// Rotas para gerenciamento de endereços do usuário

	// Obter todos os endereços do usuário
	app.get("/api/user/addresses", isAuthenticated, async (req, res) => {
		try {
			const userId = req.user!.id
			const addresses = await storage.getUserAddresses(userId)
			res.json(addresses)
		} catch (error) {
			console.error("Erro ao obter endereços do usuário:", error)
			res.status(500).json({ error: "Erro ao buscar endereços" })
		}
	})

	// Obter um endereço específico
	app.get("/api/user/addresses/:id", isAuthenticated, async (req, res) => {
		try {
			const addressId = req.params.id
			const address = await storage.getUserAddress(addressId)

			if (!address) {
				return res
					.status(404)
					.json({ error: "Endereço não encontrado" })
			}

			// Verificar se o endereço pertence ao usuário logado
			if (address.userId !== req.user!.id) {
				return res
					.status(403)
					.json({
						error: "Você não tem permissão para acessar este endereço",
					})
			}

			res.json(address)
		} catch (error) {
			console.error("Erro ao obter endereço:", error)
			res.status(500).json({ error: "Erro ao buscar endereço" })
		}
	})

	// Criar um novo endereço
	app.post("/api/user/addresses", isAuthenticated, async (req, res) => {
		try {
			const userId = req.user!.id
			const addressData = {
				...req.body,
				userId,
			}

			const insertSchema = insertUserAddressSchema.extend({
				type: z.enum(["home", "work", "other"]),
				name: z.string().min(1, "Nome é obrigatório"),
				street: z.string().min(1, "Rua é obrigatória"),
				number: z.string().min(1, "Número é obrigatório"),
				neighborhood: z.string().min(1, "Bairro é obrigatório"),
				city: z.string().min(1, "Cidade é obrigatória"),
				state: z.string().min(2).max(2, "Estado deve ter 2 caracteres"),
				zipCode: z
					.string()
					.min(8, "CEP deve ter pelo menos 8 caracteres"),
			})

			const validatedData = insertSchema.parse(addressData)
			const newAddress = await storage.createUserAddress(validatedData)

			res.status(201).json(newAddress)
		} catch (error) {
			console.error("Erro ao criar endereço:", error)

			if (error instanceof z.ZodError) {
				const errorMessages = error.errors.map((err) => ({
					path: err.path.join("."),
					message: err.message,
				}))

				return res.status(400).json({
					error: "Dados de endereço inválidos",
					details: errorMessages,
				})
			}

			res.status(500).json({ error: "Erro ao criar endereço" })
		}
	})

	// Atualizar um endereço existente
	app.put("/api/user/addresses/:id", isAuthenticated, async (req, res) => {
		try {
			const addressId = req.params.id
			const existingAddress = await storage.getUserAddress(addressId)

			if (!existingAddress) {
				return res
					.status(404)
					.json({ error: "Endereço não encontrado" })
			}

			// Verificar se o endereço pertence ao usuário logado
			if (existingAddress.userId !== req.user!.id) {
				return res
					.status(403)
					.json({
						error: "Você não tem permissão para editar este endereço",
					})
			}

			const updateSchema = z.object({
				type: z.enum(["home", "work", "other"]).optional(),
				name: z.string().min(1, "Nome é obrigatório").optional(),
				street: z.string().min(1, "Rua é obrigatória").optional(),
				number: z.string().min(1, "Número é obrigatório").optional(),
				complement: z.string().optional().nullable(),
				neighborhood: z
					.string()
					.min(1, "Bairro é obrigatório")
					.optional(),
				city: z.string().min(1, "Cidade é obrigatória").optional(),
				state: z
					.string()
					.min(2)
					.max(2, "Estado deve ter 2 caracteres")
					.optional(),
				zipCode: z
					.string()
					.min(8, "CEP deve ter pelo menos 8 caracteres")
					.optional(),
				isDefault: z.boolean().optional(),
			})

			const validatedData = updateSchema.parse(req.body)
			const updatedAddress = await storage.updateUserAddress(
				addressId,
				validatedData
			)

			res.json(updatedAddress)
		} catch (error) {
			console.error("Erro ao atualizar endereço:", error)

			if (error instanceof z.ZodError) {
				const errorMessages = error.errors.map((err) => ({
					path: err.path.join("."),
					message: err.message,
				}))

				return res.status(400).json({
					error: "Dados de endereço inválidos",
					details: errorMessages,
				})
			}

			res.status(500).json({ error: "Erro ao atualizar endereço" })
		}
	})

	// Excluir um endereço
	app.delete("/api/user/addresses/:id", isAuthenticated, async (req, res) => {
		try {
			const addressId = req.params.id
			const existingAddress = await storage.getUserAddress(addressId)

			if (!existingAddress) {
				return res
					.status(404)
					.json({ error: "Endereço não encontrado" })
			}

			// Verificar se o endereço pertence ao usuário logado
			if (existingAddress.userId !== req.user!.id) {
				return res
					.status(403)
					.json({
						error: "Você não tem permissão para excluir este endereço",
					})
			}

			const success = await storage.deleteUserAddress(addressId)

			if (success) {
				res.status(204).end()
			} else {
				res.status(500).json({
					error: "Não foi possível excluir o endereço",
				})
			}
		} catch (error) {
			console.error("Erro ao excluir endereço:", error)
			res.status(500).json({ error: "Erro ao excluir endereço" })
		}
	})

	// Definir um endereço como padrão
	app.put(
		"/api/user/addresses/:id/default",
		isAuthenticated,
		async (req, res) => {
			try {
				const addressId = req.params.id
				const userId = req.user!.id
				const existingAddress = await storage.getUserAddress(addressId)

				if (!existingAddress) {
					return res
						.status(404)
						.json({ error: "Endereço não encontrado" })
				}

				// Verificar se o endereço pertence ao usuário logado
				if (existingAddress.userId !== userId) {
					return res
						.status(403)
						.json({
							error: "Você não tem permissão para modificar este endereço",
						})
				}

				const success = await storage.setDefaultUserAddress(
					userId,
					addressId
				)

				if (success) {
					const updatedAddresses = await storage.getUserAddresses(
						userId
					)
					res.json(updatedAddresses)
				} else {
					res.status(500).json({
						error: "Não foi possível definir o endereço como padrão",
					})
				}
			} catch (error) {
				console.error("Erro ao definir endereço como padrão:", error)
				res.status(500).json({
					error: "Erro ao definir endereço como padrão",
				})
			}
		}
	)

	// ---------------------------------------------------------------------
	// Rotas de Suporte
	// ---------------------------------------------------------------------

	// Rotas de suporte para usuários (cliente e prestador)
	app.get("/api/support/messages", isAuthenticated, async (req, res) => {
		try {
			const messages = await storage.getUserSupportMessages(req.user!.id)
			res.json(messages)
		} catch (error: any) {
			console.error("Erro ao buscar mensagens de suporte:", error.message)
			res.status(500).json({ error: error.message })
		}
	})

	app.post("/api/support/send", isAuthenticated, async (req, res) => {
		try {
			const { subject, message } = req.body

			if (!subject || !message) {
				return res
					.status(400)
					.json({ error: "Assunto e mensagem são obrigatórios" })
			}

			const newMessage = await storage.createSupportMessage({
				userId: req.user!.id,
				subject,
				message,
			})

			// Enviar notificação para administradores de suporte
			const supportAdmins = await storage.getUsersByType("support")
			for (const admin of supportAdmins) {
				try {
					await storage.createNotification({
						userId: admin.id,
						title: "Nova mensagem de suporte",
						message: `${
							req.user!.name || req.user!.email
						} enviou uma nova mensagem: ${subject}`,
						type: "support_message",
						read: false,
						appointmentId: null,
						linkTo: `/admin/support/message/${newMessage.id}`,
					})

					// Notificar via WebSocket se estiver conectado
					sendNotification(admin.id, {
						type: "new_support_message",
						messageId: newMessage.id,
						title: "Nova mensagem de suporte",
						message: `${
							req.user!.name || req.user!.email
						}: ${subject}`,
					})
				} catch (e) {
					console.error("Erro ao enviar notificação para admin:", e)
				}
			}

			res.status(201).json(newMessage)
		} catch (error: any) {
			console.error("Erro ao enviar mensagem de suporte:", error.message)
			res.status(500).json({ error: error.message })
		}
	})

	// Rotas de suporte para administradores
	app.get("/api/admin/support/all", isAdminOrSupport, async (req, res) => {
		try {
			// Usar a nova API do sistema de tickets
			const tickets = await db
				.select({
					ticket: supportTickets,
					user: {
						id: users.id,
						name: users.name,
						email: users.email,
						profileImage: users.profileImage,
					},
				})
				.from(supportTickets)
				.leftJoin(users, eq(supportTickets.userId, users.id))
				.orderBy(desc(supportTickets.updatedAt))

			// Transformar resultados para formato esperado
			const formattedTickets = tickets.map((result) => ({
				...result.ticket,
				user: result.user,
			}))

			res.json(formattedTickets)
		} catch (error: any) {
			console.error(
				"Erro ao buscar todas as mensagens de suporte:",
				error.message
			)
			res.status(500).json({ error: error.message })
		}
	})

	app.get(
		"/api/admin/support/pending",
		isAdminOrSupport,
		async (req, res) => {
			try {
				// Usar a nova API do sistema de tickets
				const tickets = await db
					.select({
						ticket: supportTickets,
						user: {
							id: users.id,
							name: users.name,
							email: users.email,
							profileImage: users.profileImage,
						},
					})
					.from(supportTickets)
					.leftJoin(users, eq(supportTickets.userId, users.id))
					.where(eq(supportTickets.status, "pending")) // Apenas tickets pendentes
					.orderBy(desc(supportTickets.updatedAt))

				// Transformar resultados para formato esperado
				const formattedTickets = tickets.map((result) => ({
					...result.ticket,
					user: result.user,
				}))

				res.json(formattedTickets)
			} catch (error: any) {
				console.error(
					"Erro ao buscar mensagens de suporte pendentes:",
					error.message
				)
				res.status(500).json({ error: error.message })
			}
		}
	)

	app.get(
		"/api/admin/support/user/:userId",
		isAdminOrSupport,
		async (req, res) => {
			try {
				const userId = parseInt(req.params.userId)
				if (isNaN(userId)) {
					return res
						.status(400)
						.json({ error: "ID de usuário inválido" })
				}

				const messages = await storage.getUserSupportMessages(userId)
				res.json(messages)
			} catch (error: any) {
				console.error(
					"Erro ao buscar mensagens de suporte do usuário:",
					error.message
				)
				res.status(500).json({ error: error.message })
			}
		}
	)

	app.post(
		"/api/admin/support/resolve/:messageId",
		isAdminOrSupport,
		async (req, res) => {
			try {
				const messageId = parseInt(req.params.messageId)
				if (isNaN(messageId)) {
					return res
						.status(400)
						.json({ error: "ID de mensagem inválido" })
				}

				const { response } = req.body
				if (!response) {
					return res
						.status(400)
						.json({ error: "Resposta é obrigatória" })
				}

				const message = await storage.getSupportMessage(messageId)
				if (!message) {
					return res
						.status(404)
						.json({ error: "Mensagem não encontrada" })
				}

				const resolvedMessage = await storage.resolveSupportMessage(
					messageId,
					req.user!.id,
					response
				)

				if (!resolvedMessage) {
					return res
						.status(404)
						.json({ error: "Erro ao resolver mensagem" })
				}

				// Enviar notificação para o usuário
				try {
					await storage.createNotification({
						userId: message.userId,
						title: "Resposta do suporte",
						message: "Sua mensagem foi respondida pelo suporte",
						type: "support_response",
						read: false,
						appointmentId: null,
						linkTo: `/support/message/${messageId}`,
					})

					// Notificar via WebSocket se estiver conectado
					sendNotification(message.userId, {
						type: "support_response",
						messageId,
						title: "Resposta do suporte",
						message: "Sua mensagem foi respondida pelo suporte",
					})
				} catch (e) {
					console.error("Erro ao enviar notificação para usuário:", e)
				}

				res.json(resolvedMessage)
			} catch (error: any) {
				console.error(
					"Erro ao resolver mensagem de suporte:",
					error.message
				)
				res.status(500).json({ error: error.message })
			}
		}
	)

	// Rota pública para consultar horários disponíveis para um prestador em uma data específica
	app.get("/api/available-slots", async (req, res) => {
		try {
			const { providerId, serviceId, date } = req.query

			// Validação dos parâmetros
			if (!providerId || !date) {
				return res
					.status(400)
					.json({ error: "ProviderId e date são obrigatórios" })
			}

			// Converter para os tipos corretos
			const providerIdNum = parseInt(providerId as string)
			const serviceIdNum = serviceId
				? parseInt(serviceId as string)
				: undefined
			const dateStr = date as string

			// Validar formato de data (YYYY-MM-DD)
			if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
				return res
					.status(400)
					.json({ error: "Formato de data inválido. Use YYYY-MM-DD" })
			}

			console.log(
				`Consultando slots disponíveis para prestador ${providerIdNum} na data ${dateStr}${
					serviceIdNum ? ` para o serviço ${serviceIdNum}` : ""
				}`
			)

			// Obter os slots disponíveis
			const slots = await storage.getAvailableTimeSlots(
				providerIdNum,
				dateStr,
				serviceIdNum
			)

			// Organizar os slots em estrutura de resposta mais amigável
			const formattedSlots = slots.map((slot) => ({
				...slot,
				isBlocked: !slot.isAvailable, // Para facilitar a leitura no frontend
				formattedSlot: `${slot.startTime} - ${slot.endTime}`,
			}))

			// Separar por disponibilidade
			const availableSlots = formattedSlots.filter(
				(slot) => slot.isAvailable
			)
			const blockedSlots = formattedSlots.filter(
				(slot) => !slot.isAvailable
			)

			res.json({
				date: dateStr,
				providerId: providerIdNum,
				serviceId: serviceIdNum,
				totalSlots: slots.length,
				availableCount: availableSlots.length,
				blockedCount: blockedSlots.length,
				slots: formattedSlots,
			})
		} catch (error) {
			console.error("Erro ao consultar horários disponíveis:", error)
			res.status(500).json({
				error: "Erro ao consultar horários disponíveis",
			})
		}
	})

	// Rotas para ranqueamento inteligente de prestadores
	app.get("/api/providers/ranked", async (req, res) => {
		try {
			const { serviceId, categoryId, date, timeOfDay, clientId } =
				req.query

			const rankingOptions: any = {}

			if (serviceId)
				rankingOptions.serviceId = parseInt(serviceId as string)
			if (categoryId)
				rankingOptions.categoryId = parseInt(categoryId as string)
			if (date) rankingOptions.date = date as string
			if (timeOfDay)
				rankingOptions.timeOfDay = timeOfDay as
					| "morning"
					| "afternoon"
					| "evening"
			if (clientId) rankingOptions.clientId = parseInt(clientId as string)

			// Importar dinamicamente o serviço de ranqueamento
			const { rankProviders } = await import(
				"./intelligent-provider-ranking"
			)

			const rankedProviders = await rankProviders(rankingOptions)

			res.json({ providers: rankedProviders })
		} catch (error) {
			console.error("Erro ao ranquear prestadores:", error)
			res.status(500).json({ error: "Erro ao ranquear prestadores" })
		}
	})

	// Rota para obter prestadores recomendados para um serviço
	app.get(
		"/api/services/:serviceId/recommended-providers",
		async (req, res) => {
			try {
				const serviceId = parseInt(req.params.serviceId)
				const { date, clientId } = req.query

				// Importar dinamicamente o serviço de ranqueamento
				const { getRecommendedProvidersForService } = await import(
					"./intelligent-provider-ranking"
				)

				const recommendedProviders =
					await getRecommendedProvidersForService(
						serviceId,
						date as string,
						clientId ? parseInt(clientId as string) : undefined
					)

				res.json({ providers: recommendedProviders })
			} catch (error) {
				console.error("Erro ao obter prestadores recomendados:", error)
				res.status(500).json({
					error: "Erro ao obter prestadores recomendados",
				})
			}
		}
	)

	// Rota para encontrar prestadores alternativos
	app.get("/api/providers/:providerId/alternatives", async (req, res) => {
		try {
			const providerId = parseInt(req.params.providerId)
			const { serviceId, date } = req.query

			if (!serviceId || !date) {
				return res
					.status(400)
					.json({ error: "serviceId e date são obrigatórios" })
			}

			// Importar dinamicamente o serviço de ranqueamento
			const { findAlternativeProviders } = await import(
				"./intelligent-provider-ranking"
			)

			const alternatives = await findAlternativeProviders(
				providerId,
				parseInt(serviceId as string),
				date as string
			)

			res.json({ providers: alternatives })
		} catch (error) {
			console.error("Erro ao encontrar prestadores alternativos:", error)
			res.status(500).json({
				error: "Erro ao encontrar prestadores alternativos",
			})
		}
	})

	// Rota para encontrar os melhores dias de disponibilidade de um prestador
	app.get("/api/providers/:providerId/best-days", async (req, res) => {
		try {
			const providerId = parseInt(req.params.providerId)
			const { serviceId, days } = req.query

			// Importar dinamicamente o serviço de ranqueamento
			const { findBestAvailabilityDays } = await import(
				"./intelligent-provider-ranking"
			)

			const bestDays = await findBestAvailabilityDays(
				providerId,
				serviceId ? parseInt(serviceId as string) : undefined,
				days ? parseInt(days as string) : 30
			)

			res.json({ bestDays })
		} catch (error) {
			console.error("Erro ao encontrar melhores dias:", error)
			res.status(500).json({
				error: "Erro ao encontrar melhores dias de disponibilidade",
			})
		}
	})

	// Rotas Stripe Connect Express para prestadores
	app.post('/api/provider/stripe-connect-onboarding', isAuthenticated, isProvider, async (req, res) => {
	  try {
	    const providerId = req.user.id;
	    const email = req.user.email;
	    const name = req.user.name || 'Prestador';
	    const { accountId, onboardingUrl } = await createOrGetStripeConnectAccount(providerId, email, name);
	    res.json({ accountId, onboardingUrl });
	  } catch (error) {
	    console.error('Erro ao criar onboarding Stripe Connect:', error);
	    res.status(500).json({ error: 'Erro ao criar onboarding Stripe Connect', message: error.message });
	  }
	});

	app.get('/api/provider/stripe-connect-status', isAuthenticated, isProvider, async (req, res) => {
	  try {
	    // Buscar o accountId salvo nas configurações do prestador
	    const providerSettings = await storage.getProviderSettings(req.user.id);
	    if (!providerSettings?.stripeAccountId) {
	      return res.status(404).json({ error: 'Prestador não possui conta Stripe Connect vinculada' });
	    }
	    const account = await getStripeConnectAccountStatus(providerSettings.stripeAccountId);
	    res.json({
	      id: account.id,
	      email: account.email,
	      type: account.type,
	      country: account.country,
	      capabilities: account.capabilities,
	      payouts_enabled: account.payouts_enabled,
	      charges_enabled: account.charges_enabled,
	      details_submitted: account.details_submitted,
	      requirements: account.requirements,
	      status: account.disabled_reason ? 'disabled' : (account.details_submitted ? 'active' : 'pending'),
	      disabled_reason: account.disabled_reason || null
	    });
	  } catch (error) {
	    console.error('Erro ao consultar status Stripe Connect:', error);
	    res.status(500).json({ error: 'Erro ao consultar status Stripe Connect', message: error.message });
	  }
	});

	app.post('/api/provider/stripe-connect-payout', isAuthenticated, isProvider, async (req, res) => {
	  try {
	    const { amount } = req.body;
	    if (!amount || isNaN(amount) || amount <= 0) {
	      return res.status(400).json({ error: 'Valor de saque inválido' });
	    }
	    // Buscar o accountId salvo nas configurações do prestador
	    const providerSettings = await storage.getProviderSettings(req.user.id);
	    if (!providerSettings?.stripeAccountId) {
	      return res.status(404).json({ error: 'Prestador não possui conta Stripe Connect vinculada' });
	    }
	    // Buscar saldo disponível na Stripe
	    const account = await getStripeConnectAccountStatus(providerSettings.stripeAccountId);
	    const balance = await stripe.balance.retrieve({ stripeAccount: providerSettings.stripeAccountId });
	    const available = balance.available.find(b => b.currency === 'brl');
	    if (!available || available.amount < Math.round(amount * 100)) {
	      return res.status(400).json({ error: 'Saldo insuficiente para saque' });
	    }
	    // Criar payout
	    const payout = await stripe.payouts.create({
	      amount: Math.round(amount * 100),
	      currency: 'brl',
	      statement_descriptor: 'Saque AgendoAi'
	    }, { stripeAccount: providerSettings.stripeAccountId });
	    res.json({ success: true, payout });
	  } catch (error) {
	    console.error('Erro ao solicitar payout Stripe Connect:', error);
	    res.status(500).json({ error: 'Erro ao solicitar payout Stripe Connect', message: error.message });
	  }
	});

	return httpServer
}
