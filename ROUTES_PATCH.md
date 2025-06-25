# Patch para Adicionar Rotas Faltantes

## Problema
O frontend está tentando acessar rotas que não existem no backend:
- `GET /api/availability/provider/:providerId` - 404 Not Found
- `GET /api/blocked-times/provider/:providerId` - 404 Not Found

## Solução
Adicionar as seguintes rotas no arquivo `server/routes.ts` após a linha 6822 (após o fechamento da rota de exclusão de disponibilidade):

```typescript
	// Rota específica para obter disponibilidade de um prestador (usada pelo frontend)
	app.get("/api/availability/provider/:providerId", isAuthenticated, async (req, res) => {
		try {
			const providerId = parseInt(req.params.providerId)
			const userId = req.user!.id

			// Verificar se o usuário é o próprio prestador ou um admin
			if (userId !== providerId && req.user!.userType !== "admin") {
				return res.status(403).json({
					error: "Não autorizado a acessar disponibilidade deste prestador",
				})
			}

			console.log(`Buscando disponibilidade para o prestador ID: ${providerId}`)
			
			// Buscar disponibilidade por providerId
			const availabilityList = await storage.getAvailabilityByProviderId(providerId)

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
						intervalMinutes: 30, // Intervalo de 30 minutos entre agendamentos
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

				availabilityList.push(...defaultAvailability)
				console.log(
					`Criadas ${defaultAvailability.length} configurações de disponibilidade padrão`
				)
			}

			res.json(availabilityList)
		} catch (error) {
			console.error("Erro ao buscar disponibilidade do prestador:", error)
			res.status(500).json({ error: "Erro ao buscar disponibilidade" })
		}
	})

	// Rota para obter horários bloqueados de um prestador
	app.get("/api/blocked-times/provider/:providerId", isAuthenticated, async (req, res) => {
		try {
			const providerId = parseInt(req.params.providerId)
			const userId = req.user!.id

			// Verificar se o usuário é o próprio prestador ou um admin
			if (userId !== providerId && req.user!.userType !== "admin") {
				return res.status(403).json({
					error: "Não autorizado a acessar horários bloqueados deste prestador",
				})
			}

			console.log(`Buscando horários bloqueados para o prestador ID: ${providerId}`)
			
			// Buscar horários bloqueados por providerId
			const blockedTimes = await storage.getBlockedTimesByProviderId(providerId)

			res.json(blockedTimes)
		} catch (error) {
			console.error("Erro ao buscar horários bloqueados:", error)
			res.status(500).json({ error: "Erro ao buscar horários bloqueados" })
		}
	})

	// Rota para criar um novo horário bloqueado
	app.post("/api/blocked-times", isAuthenticated, async (req, res) => {
		try {
			const userId = req.user!.id
			const { providerId, date, startTime, endTime, reason } = req.body

			// Verificar se o usuário é o próprio prestador ou um admin
			if (userId !== providerId && req.user!.userType !== "admin") {
				return res.status(403).json({
					error: "Não autorizado a criar horários bloqueados para este prestador",
				})
			}

			console.log("Criando novo horário bloqueado:", req.body)

			const newBlockedTime = await storage.createBlockedTime({
				providerId,
				date,
				startTime,
				endTime,
				reason: reason || "Horário bloqueado pelo prestador",
				availabilityId: 0, // ID da disponibilidade (0 para bloqueios gerais)
			})

			res.status(201).json(newBlockedTime)
		} catch (error) {
			console.error("Erro ao criar horário bloqueado:", error)
			res.status(500).json({
				error: `Erro ao criar horário bloqueado: ${
					error instanceof Error ? error.message : String(error)
				}`,
			})
		}
	})

	// Rota para excluir um horário bloqueado
	app.delete("/api/blocked-times/:id", isAuthenticated, async (req, res) => {
		try {
			const blockedTimeId = parseInt(req.params.id)
			const userId = req.user!.id

			// Buscar o horário bloqueado para verificar a propriedade
			const blockedTime = await storage.getBlockedTimeById(blockedTimeId)

			if (!blockedTime) {
				return res
					.status(404)
					.json({ error: "Horário bloqueado não encontrado" })
			}

			// Verificar se o usuário é o próprio prestador ou um admin
			if (
				userId !== blockedTime.providerId &&
				req.user!.userType !== "admin"
			) {
				return res
					.status(403)
					.json({
						error: "Não autorizado a excluir este horário bloqueado",
					})
			}

			await storage.deleteBlockedTime(blockedTimeId)
			res.status(204).send()
		} catch (error) {
			console.error("Erro ao excluir horário bloqueado:", error)
			res.status(500).json({ error: "Erro ao excluir horário bloqueado" })
		}
	})
```

## Como Aplicar
1. Abrir o arquivo `server/routes.ts`
2. Localizar a linha 6822 (após o fechamento da rota de exclusão de disponibilidade)
3. Inserir o código acima antes da linha que contém "// Rota para análise de tempo de execução de serviços"
4. Salvar o arquivo
5. Reiniciar o servidor

## Resultado Esperado
Após aplicar o patch e reiniciar o servidor, as rotas devem funcionar corretamente e o frontend não deve mais apresentar erros 404. 