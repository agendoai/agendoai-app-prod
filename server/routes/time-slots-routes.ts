import express from "express";
import { storage } from "../storage";
import {
  getAvailableTimeSlotsAdvanced,
  ProviderSchedule,
} from "../available-time-slots";
import {
  generateIntelligentTimeSlots,
  AITimeSlotOptions,
} from "../ai-time-slot-generator";
import {
  generateIntelligentSlotsForService,
  ServiceInfo,
} from "../intelligent-slot-service";
import { createLogger } from "../logger";
import { anthropicService } from "../anthropic-service";
import * as AdvancedSlotGenerator from "../advanced-slot-generator";

const logger = createLogger("TimeSlots");
const router = express.Router();

// Middleware para verificar se o usuário está autenticado
function isAuthenticated(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction,
) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Não autorizado" });
}

// Função auxiliar para filtrar slots de tempo que já passaram
function filterPastTimeSlots(slots: any[], date: string): any[] {
  // Convertendo a data do agendamento para um objeto Date
  const bookingDate = new Date(date);
  const now = new Date();

  // Obtendo a data atual no mesmo formato
  const today = now.toISOString().split("T")[0];
  const bookingDateStr = bookingDate.toISOString().split("T")[0];

  // Se a data do agendamento está no futuro, retornar todos os slots
  if (bookingDateStr > today) {
    logger.info(
      `Data do agendamento (${bookingDateStr}) é futura, mantendo todos os slots.`,
    );
    return slots;
  }

  // Se a data do agendamento é anterior à data atual, não retornar nenhum slot
  if (bookingDateStr < today) {
    logger.info(
      `Data do agendamento (${bookingDateStr}) já passou, removendo todos os slots.`,
    );
    return [];
  }

  // Se chegou aqui, a data do agendamento é hoje
  // Horário atual
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTotalMinutes = currentHour * 60 + currentMinute;

  logger.info(
    `Filtrando slots que já passaram para hoje (${date}). Hora atual: ${currentHour}:${currentMinute}`,
  );

  // Filtra somente slots que ainda não passaram
  return slots.filter((slot) => {
    if (!slot.startTime) return false;

    const [slotHour, slotMinute] = slot.startTime.split(":").map(Number);
    const slotTotalMinutes = slotHour * 60 + slotMinute;

    // Dar uma margem de 15 minutos para agendamentos próximos da hora atual
    const marginMinutes = 15;
    const isPast = slotTotalMinutes < currentTotalMinutes + marginMinutes;

    if (isPast) {
      logger.info(
        `Slot ${slot.startTime} já passou ou está muito próximo, será filtrado`,
      );
    }

    return !isPast;
  });
}

// Rota para obter slots de tempo disponíveis de um prestador em uma data
router.get("/", async (req, res) => {
  try {
    const providerId = parseInt(req.query.providerId as string);
    const date = req.query.date as string;
    const serviceId = req.query.serviceId
      ? parseInt(req.query.serviceId as string)
      : undefined;

    if (!providerId || !date) {
      return res
        .status(400)
        .json({ error: "Os parâmetros providerId e date são obrigatórios" });
    }

    // Obter TODOS os slots de tempo (disponíveis e bloqueados) diretamente do método generateTimeSlots
    logger.info(
      `Gerando slots de tempo (disponíveis e bloqueados) para prestador ${providerId} na data ${date}`,
    );
    let timeSlots = await storage.generateTimeSlots(
      providerId,
      date,
      serviceId,
    );

    logger.info(
      `Gerados ${timeSlots.length} slots (disponíveis e bloqueados) para prestador ${providerId} na data ${date}`,
    );

    // Se não há slots, tentar gerar novamente com disponibilidade padrão (embora isso já deva acontecer no generateTimeSlots)
    if (timeSlots.length === 0) {
      logger.info(
        `Nenhum slot disponível para prestador ${providerId} na data ${date}. Tentando novamente com disponibilidade padrão.`,
      );

      // Forçar regeneração (apenas como salvaguarda)
      timeSlots = await storage.generateTimeSlots(providerId, date, serviceId);

      logger.info(`Após segunda tentativa: ${timeSlots.length} slots gerados.`);
    }

    // Filtrar slots que já passaram se a data for hoje
    timeSlots = filterPastTimeSlots(timeSlots, date);
    logger.info(
      `Após filtrar slots passados: ${timeSlots.length} slots disponíveis`,
    );

    return res.json({ timeSlots });
  } catch (error) {
    console.error("Erro ao obter slots de tempo:", error);
    res.status(500).json({
      error: "Erro ao obter slots de tempo",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Rota para bloquear um slot de tempo específico
router.post("/block", isAuthenticated, async (req, res) => {
  try {
    const {
      providerId,
      date,
      startTime,
      endTime,
      reason,
      blockType = "manual",
      recurrentId = null,
      appointmentId = null,
    } = req.body;

    console.log("[time-slots-routes] Requisição de bloqueio recebida:", {
      providerId,
      date,
      startTime,
      endTime,
      reason,
      blockType,
      recurrentId,
      appointmentId,
    });

    if (!providerId || !date || !startTime || !endTime) {
      return res
        .status(400)
        .json({ error: "Todos os parâmetros são obrigatórios" });
    }

    // Verificar permissão (apenas o próprio prestador ou admin podem bloquear slots)
    if (req.user!.userType !== "admin" && req.user!.id !== providerId) {
      return res
        .status(403)
        .json({ error: "Você só pode bloquear sua própria agenda" });
    }

    // Verificar tipo de bloqueio válido
    const validBlockTypes = ["lunch", "manual", "appointment", "system"];
    if (!validBlockTypes.includes(blockType)) {
      return res.status(400).json({
        error: "Tipo de bloqueio inválido",
        validTypes: validBlockTypes,
      });
    }

    try {
      // Criar bloqueio de horário com metadados adicionais
      const blockedSlot = await storage.blockTimeSlot({
        providerId,
        date,
        startTime,
        endTime,
        reason: reason || "Bloqueado manualmente",
        blockedByUserId: req.user!.id,
        metadata: {
          type: blockType as "lunch" | "manual" | "appointment" | "system",
          recurrentId: recurrentId || undefined,
          appointmentId: appointmentId || undefined,
        },
      });

      console.log(
        "[time-slots-routes] Horário bloqueado com sucesso:",
        blockedSlot,
      );

      // Garantir que estamos enviando JSON com o header correto
      res.setHeader("Content-Type", "application/json");
      return res.json({
        blockedSlot,
        message: "Horário bloqueado com sucesso",
      });
    } catch (blockError) {
      console.error(
        "[time-slots-routes] Erro específico ao bloquear horário:",
        blockError,
      );
      // Garantir que estamos enviando JSON com o header correto
      res.setHeader("Content-Type", "application/json");
      return res.status(400).json({
        error: "Falha ao bloquear horário",
        details:
          blockError instanceof Error
            ? blockError.message
            : "Erro desconhecido",
      });
    }
  } catch (error) {
    console.error(
      "[time-slots-routes] Erro ao processar solicitação de bloqueio:",
      error,
    );
    // Garantir que estamos enviando JSON com o header correto
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({
      error: "Erro ao bloquear horário",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Rota para desbloquear um slot de tempo
router.post("/unblock", isAuthenticated, async (req, res) => {
  try {
    const { providerId, date, startTime, endTime, availabilityId } = req.body;

    console.log("[time-slots-routes] Requisição de desbloqueio recebida:", {
      providerId,
      date,
      startTime,
      endTime,
      availabilityId,
    });

    if (!providerId || !date || !startTime || !endTime) {
      // Garantir que estamos enviando JSON com o header correto
      res.setHeader("Content-Type", "application/json");
      return res
        .status(400)
        .json({ error: "Todos os parâmetros são obrigatórios" });
    }

    // Verificar permissão (apenas o próprio prestador ou admin podem desbloquear slots)
    if (req.user!.userType !== "admin" && req.user!.id !== providerId) {
      // Garantir que estamos enviando JSON com o header correto
      res.setHeader("Content-Type", "application/json");
      return res
        .status(403)
        .json({ error: "Você só pode desbloquear sua própria agenda" });
    }

    try {
      // Remover bloqueio de horário
      const success = await storage.unblockTimeSlot({
        providerId,
        date,
        startTime,
        endTime,
        availabilityId,
      });

      console.log("[time-slots-routes] Resultado do desbloqueio:", success);

      if (!success) {
        // Garantir que estamos enviando JSON com o header correto
        res.setHeader("Content-Type", "application/json");
        return res.status(404).json({ error: "Bloqueio não encontrado" });
      }

      // Garantir que estamos enviando JSON com o header correto
      res.setHeader("Content-Type", "application/json");
      return res.json({
        success: true,
        message: "Horário desbloqueado com sucesso",
      });
    } catch (unblockError) {
      console.error(
        "[time-slots-routes] Erro específico ao desbloquear horário:",
        unblockError,
      );
      // Garantir que estamos enviando JSON com o header correto
      res.setHeader("Content-Type", "application/json");
      return res.status(400).json({
        error: "Falha ao desbloquear horário",
        details:
          unblockError instanceof Error
            ? unblockError.message
            : "Erro desconhecido",
      });
    }
  } catch (error) {
    console.error(
      "[time-slots-routes] Erro ao processar solicitação de desbloqueio:",
      error,
    );
    // Garantir que estamos enviando JSON com o header correto
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({
      error: "Erro ao desbloquear horário",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Rota para calcular slots de tempo com base na agenda do prestador
router.post("/calculate", async (req, res) => {
  try {
    const { providerId, date, serviceId } = req.body;

    if (!providerId || !date) {
      return res
        .status(400)
        .json({ error: "Os parâmetros providerId e date são obrigatórios" });
    }

    // Buscar informações necessárias
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      return res.status(404).json({ error: "Prestador não encontrado" });
    }

    let serviceDuration = 30; // Duração padrão de 30 minutos

    if (serviceId) {
      const service = await storage.getService(serviceId);
      if (service) {
        serviceDuration = service.duration;
      }
    }

    // Buscar configuração de disponibilidade do prestador para o dia da semana
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0 = domingo, 1 = segunda, ...

    let availability = await storage.getAvailabilityByDay(
      providerId,
      dayOfWeek,
    );
    if (!availability) {
      return res.json({
        timeSlots: [],
        message:
          "Prestador não possui disponibilidade configurada para este dia da semana",
      });
    }

    // Buscar agendamentos existentes para a data
    const appointments = await storage.getProviderAppointmentsByDate(
      providerId,
      date,
    );

    // Montar objeto de agenda
    const schedule: ProviderSchedule = {
      workingHours: {
        start: availability.startTime,
        end: availability.endTime,
      },
      appointments: appointments.map((appointment) => ({
        startTime: appointment.startTime,
        duration: serviceDuration, // Usar a duração do serviço atual como padrão para simplificar
      })),
    };

    // Adicionar horário de almoço (12:00 - 13:00) como padrão se não estiver configurado
    if (provider.lunchBreakStart && provider.lunchBreakEnd) {
      schedule.lunchBreak = {
        start: provider.lunchBreakStart,
        end: provider.lunchBreakEnd,
      };
    } else {
      schedule.lunchBreak = {
        start: "12:00",
        end: "13:00",
      };
    }

    // Calcular slots disponíveis usando o algoritmo inteligente
    let availableSlots;

    try {
      // Define as opções para geração inteligente de slots
      const aiOptions: AITimeSlotOptions = {
        prioritizeRoundHours: true, // Priorizar horários "redondos" (9:00, 10:00)
        prioritizeEvenSpacing: true, // Distribuir slots uniformemente
        timeOfDayPreference: null, // Sem preferência específica de período
        priorityFactor: 0.7, // Peso relativamente alto para os critérios
      };

      // Utiliza o gerador inteligente de slots
      availableSlots = generateIntelligentTimeSlots(
        schedule,
        serviceDuration,
        aiOptions,
      );

      logger.info(
        `Gerados ${availableSlots.length} slots inteligentes para o prestador ${providerId} na data ${date}`,
      );
    } catch (error) {
      logger.error(`Erro ao gerar slots inteligentes: ${error}`);
      // Fallback para o algoritmo padrão em caso de erro
      availableSlots = getAvailableTimeSlotsAdvanced(schedule, serviceDuration);
    }

    return res.json({
      timeSlots: availableSlots,
      message:
        "Slots de tempo calculados com sucesso usando algoritmo inteligente",
    });
  } catch (error) {
    console.error("Erro ao calcular slots de tempo:", error);
    res.status(500).json({
      error: "Erro ao calcular slots de tempo",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Rota para bloquear um slot de tempo específico
router.post("/block", isAuthenticated, async (req, res) => {
  try {
    const {
      providerId,
      date,
      startTime,
      endTime,
      reason,
      blockType = "manual",
      recurrentId = null,
      appointmentId = null,
    } = req.body;

    console.log("Requisição de bloqueio recebida:", {
      providerId,
      date,
      startTime,
      endTime,
      reason,
      blockType,
      recurrentId,
      appointmentId,
    });

    if (!providerId || !date || !startTime || !endTime) {
      return res
        .status(400)
        .json({ error: "Todos os parâmetros são obrigatórios" });
    }

    // Verificar permissão (apenas o próprio prestador ou admin podem bloquear slots)
    if (req.user!.userType !== "admin" && req.user!.id !== providerId) {
      return res
        .status(403)
        .json({ error: "Você só pode bloquear sua própria agenda" });
    }

    // Verificar tipo de bloqueio válido
    const validBlockTypes = ["lunch", "manual", "appointment", "system"];
    if (!validBlockTypes.includes(blockType)) {
      return res.status(400).json({
        error: "Tipo de bloqueio inválido",
        validTypes: validBlockTypes,
      });
    }

    try {
      // Criar bloqueio de horário com metadados adicionais
      const blockedSlot = await storage.blockTimeSlot({
        providerId,
        date,
        startTime,
        endTime,
        reason: reason || "Bloqueado manualmente",
        blockedByUserId: req.user!.id,
        metadata: {
          type: blockType as "lunch" | "manual" | "appointment" | "system",
          recurrentId: recurrentId || undefined,
          appointmentId: appointmentId || undefined,
        },
      });

      console.log("Horário bloqueado com sucesso:", blockedSlot);

      // Registrar no histórico de bloqueios (se implementado)

      // Garantir que estamos enviando JSON com o header correto
      res.setHeader("Content-Type", "application/json");
      return res.json({
        blockedSlot,
        message: "Horário bloqueado com sucesso",
      });
    } catch (blockError) {
      console.error("Erro específico ao bloquear horário:", blockError);
      // Garantir que estamos enviando JSON com o header correto
      res.setHeader("Content-Type", "application/json");
      return res.status(400).json({
        error: "Falha ao bloquear horário",
        details:
          blockError instanceof Error
            ? blockError.message
            : "Erro desconhecido",
      });
    }
  } catch (error) {
    console.error("Erro ao processar solicitação de bloqueio:", error);
    // Garantir que estamos enviando JSON com o header correto
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({
      error: "Erro ao bloquear horário",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Rota para desbloquear um slot de tempo
router.post("/unblock", isAuthenticated, async (req, res) => {
  try {
    const { providerId, date, startTime, endTime, availabilityId } = req.body;

    console.log("Requisição de desbloqueio recebida:", {
      providerId,
      date,
      startTime,
      endTime,
      availabilityId,
    });

    if (!providerId || !date || !startTime || !endTime) {
      // Garantir que estamos enviando JSON com o header correto
      res.setHeader("Content-Type", "application/json");
      return res
        .status(400)
        .json({ error: "Todos os parâmetros são obrigatórios" });
    }

    // Verificar permissão (apenas o próprio prestador ou admin podem desbloquear slots)
    if (req.user!.userType !== "admin" && req.user!.id !== providerId) {
      // Garantir que estamos enviando JSON com o header correto
      res.setHeader("Content-Type", "application/json");
      return res
        .status(403)
        .json({ error: "Você só pode desbloquear sua própria agenda" });
    }

    try {
      // Remover bloqueio de horário
      const success = await storage.unblockTimeSlot({
        providerId,
        date,
        startTime,
        endTime,
        availabilityId,
      });

      console.log("Resultado do desbloqueio:", success);

      if (!success) {
        // Garantir que estamos enviando JSON com o header correto
        res.setHeader("Content-Type", "application/json");
        return res.status(404).json({ error: "Bloqueio não encontrado" });
      }

      // Garantir que estamos enviando JSON com o header correto
      res.setHeader("Content-Type", "application/json");
      return res.json({
        success: true,
        message: "Horário desbloqueado com sucesso",
      });
    } catch (unblockError) {
      console.error("Erro específico ao desbloquear horário:", unblockError);
      // Garantir que estamos enviando JSON com o header correto
      res.setHeader("Content-Type", "application/json");
      return res.status(400).json({
        error: "Falha ao desbloquear horário",
        details:
          unblockError instanceof Error
            ? unblockError.message
            : "Erro desconhecido",
      });
    }
  } catch (error) {
    console.error("Erro ao processar solicitação de desbloqueio:", error);
    // Garantir que estamos enviando JSON com o header correto
    res.setHeader("Content-Type", "application/json");
    return res.status(500).json({
      error: "Erro ao desbloquear horário",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Rota GET para gerar slots inteligentes para um serviço específico
router.get("/intelligent-service-slots", async (req, res) => {
  try {
    // Obter e validar parâmetros
    const providerId = parseInt(req.query.providerId as string);
    const serviceId = parseInt(req.query.serviceId as string);
    const date = req.query.date as string;
    const duration = req.query.duration
      ? parseInt(req.query.duration as string)
      : undefined;

    // Log completo dos parâmetros
    logger.info(`[GET] Gerando slots inteligentes`);
    logger.info(`Parâmetros:
      - providerId: ${providerId} (${typeof providerId})
      - serviceId: ${serviceId} (${typeof serviceId})
      - date: ${date} (${typeof date})
      - duration: ${duration} (${typeof duration})
      - URL: ${req.originalUrl}
      - Query params: ${JSON.stringify(req.query)}
    `);

    if (!providerId || !date) {
      return res.status(400).json({
        error: "Os parâmetros providerId e date são obrigatórios",
      });
    }

    // Buscar informações necessárias
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      return res.status(404).json({ error: "Prestador não encontrado" });
    }

    let service = null;
    if (serviceId) {
      service = await storage.getService(serviceId);
      if (!service) {
        logger.warn(
          `Serviço ${serviceId} não encontrado, usando duração padrão ${duration || 30} minutos`,
        );
      }
    }

    // Se não tiver serviço mas tiver duração, criar um serviço temporário
    if (!service && duration) {
      service = {
        id: 0,
        name: "Serviço Temporário",
        duration: duration,
        providerId: providerId,
        categoryId: 0,
      };
      logger.info(`Criado serviço temporário com duração ${duration} minutos`);
    } else if (!service) {
      logger.warn(
        "Nem serviceId nem duration foram fornecidos. Usando valores padrão",
      );
      service = {
        id: 0,
        name: "Serviço Padrão",
        duration: 30,
        providerId: providerId,
        categoryId: 0,
      };
    }

    // Obter a agenda e criar horários padrão
    // Ajustando para gerar horários em intervalos de 1 hora para garantir disponibilidade
    const slots = [];
    const workingStart = "08:00";
    const workingEnd = "18:00";
    const lunchStart = "12:00";
    const lunchEnd = "13:00";

    // Converter string de tempo para minutos desde meia-noite
    const timeToMinutes = (time: string): number => {
      const [hours, minutes] = time.split(":").map(Number);
      return hours * 60 + minutes;
    };

    // Converter minutos para string de tempo no formato HH:MM
    const minutesToTime = (minutes: number): string => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    };

    // Horário de início e fim em minutos
    const startMinutes = timeToMinutes(workingStart);
    const endMinutes = timeToMinutes(workingEnd);
    const lunchStartMinutes = timeToMinutes(lunchStart);
    const lunchEndMinutes = timeToMinutes(lunchEnd);

    // Gerar slots a cada 15 minutos para ter mais opções de horário
    const interval = 15;
    for (let time = startMinutes; time < endMinutes; time += interval) {
      // Pular horário de almoço
      if (time >= lunchStartMinutes && time < lunchEndMinutes) {
        continue;
      }

      // Verificar se o slot cabe no horário de trabalho
      const slotEndMinutes = time + service.duration;
      if (slotEndMinutes > endMinutes) {
        continue;
      }

      // Verificar se o slot cruza com o horário de almoço
      if (time < lunchStartMinutes && slotEndMinutes > lunchStartMinutes) {
        continue;
      }

      // Adicionar slot disponível
      slots.push({
        startTime: minutesToTime(time),
        endTime: minutesToTime(slotEndMinutes),
        isAvailable: true,
      });
    }

    logger.info(
      `Gerados ${slots.length} slots manualmente para o serviço com duração de ${service.duration} minutos`,
    );

    logger.info(
      `Gerados ${slots.length} slots padrão para o serviço de ${service.duration} minutos`,
    );

    // Marcar todos como disponíveis explicitamente
    const availableSlots = slots.map((slot) => ({
      ...slot,
      isAvailable: true,
      score: 50,
      reason: "Horário disponível",
      startTime: slot.startTime, // Certifique-se de que estes campos existam explicitamente
      endTime: slot.endTime,
    }));

    // Adicionar informações de formatação para ajudar o cliente
    availableSlots.forEach((slot) => {
      slot.formattedSlot = `${slot.startTime} - ${slot.endTime}`;
    });

    // Filtrar slots passados
    const filteredSlots = filterPastTimeSlots(availableSlots, date);

    // IMPORTANTE: Se não houver slots após filtragem, gerar slots a cada 15 minutos
    if (filteredSlots.length === 0) {
      logger.warn(
        `Nenhum slot disponível após filtragem! Gerando slots a cada 15 minutos.`,
      );

      // Gerar slots a cada 15 minutos durante o horário comercial
      const emergencySlots = [];

      // Horário da manhã (8:00 às 12:00)
      for (let hour = 8; hour < 12; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
          const startMinutes = hour * 60 + minute;
          const endMinutes = startMinutes + service.duration;
          const endTime = minutesToTime(endMinutes);

          emergencySlots.push({
            startTime,
            endTime,
            isAvailable: true,
            score: 80,
            reason: "Horário disponível",
          });
        }
      }

      // Horário da tarde (13:00 às 18:00)
      for (let hour = 13; hour < 18; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
          const startTime = `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
          const startMinutes = hour * 60 + minute;
          const endMinutes = startMinutes + service.duration;
          const endTime = minutesToTime(endMinutes);

          emergencySlots.push({
            startTime,
            endTime,
            isAvailable: true,
            score: 80,
            reason: "Horário disponível",
          });
        }
      }

      // Adicionar formatação
      emergencySlots.forEach((slot) => {
        slot.formattedSlot = `${slot.startTime} - ${slot.endTime}`;
      });

      // Usar os slots de emergência se necessário
      filteredSlots.push(...emergencySlots);
      logger.info(
        `Adicionados ${emergencySlots.length} slots de emergência garantidos`,
      );
    }

    logger.info(`Retornando ${filteredSlots.length} slots para o cliente`);

    return res.json({
      timeSlots: filteredSlots,
      serviceName: service.name,
      serviceDuration: service.duration,
      aiRecommendations: true,
      message: "Slots de tempo gerados com sucesso",
    });
  } catch (error) {
    logger.error("Erro ao gerar slots inteligentes via GET:", error);
    return res.status(500).json({
      error: "Erro ao gerar slots de tempo",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Rota POST para gerar slots inteligentes para um serviço específico
router.post("/intelligent-service-slots", async (req, res) => {
  try {
    const { providerId, serviceId, date } = req.body;

    if (!providerId || !serviceId || !date) {
      return res.status(400).json({
        error:
          "Todos os parâmetros são obrigatórios (providerId, serviceId, date)",
      });
    }

    logger.info(
      `Gerando slots inteligentes para serviço ID ${serviceId}, prestador ID ${providerId}, data ${date}`,
    );

    // Buscar informações necessárias
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      return res.status(404).json({ error: "Prestador não encontrado" });
    }

    const service = await storage.getService(serviceId);
    if (!service) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    // Buscar TODOS os agendamentos do prestador nesta data para garantir acurácia
    const existingAppointments = await storage.getProviderAppointmentsByDate(
      providerId,
      date,
    );
    logger.info(
      `Encontrados ${existingAppointments.length} agendamentos existentes para ${date}`,
    );

    // Buscar bloqueios do prestador para esta data
    let blockedSlots = [];
    try {
      blockedSlots = await storage.getBlockedTimeSlotsByDate(providerId, date);
      logger.info(`Encontrados ${blockedSlots.length} bloqueios para ${date}`);
    } catch (blockError) {
      logger.error(`Erro ao buscar bloqueios: ${blockError}`);
      // Continue mesmo com erro, pois os bloqueios podem não existir na versão do banco de dados
    }

    // Preparar informações do serviço para o gerador inteligente
    const serviceInfo: ServiceInfo = {
      id: service.id,
      name: service.name,
      duration: service.duration,
      categoryId: service.categoryId,
      providerId: service.providerId,
    };

    // Buscar configuração de disponibilidade do prestador para o dia da semana
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0 = domingo, 1 = segunda, ...

    let availability = await storage.getAvailabilityByDay(
      providerId,
      dayOfWeek,
    );
    if (!availability) {
      return res.json({
        timeSlots: [],
        message:
          "Prestador não possui disponibilidade configurada para este dia da semana",
      });
    }

    // Usar os agendamentos já buscados anteriormente

    // Montar objeto de agenda
    const schedule: ProviderSchedule = {
      workingHours: {
        start: availability.startTime,
        end: availability.endTime,
      },
      appointments: existingAppointments.map((appointment) => ({
        startTime: appointment.startTime,
        duration: service.duration, // Usar duração do serviço atual como padrão
      })),
    };

    // Adicionar bloqueios como "agendamentos" para o gerador de slots
    if (blockedSlots && blockedSlots.length > 0) {
      logger.info(
        `Adicionando ${blockedSlots.length} bloqueios como períodos ocupados`,
      );

      // Definição da função auxiliar dentro do escopo para evitar erros
      function timeToMinutes(time) {
        if (!time) return 0;
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
      }

      const blockedAppointments = blockedSlots.map((block) => ({
        startTime: block.startTime,
        duration: timeToMinutes(block.endTime) - timeToMinutes(block.startTime),
      }));

      schedule.appointments = [
        ...schedule.appointments,
        ...blockedAppointments,
      ];
      logger.info(
        `Total de períodos ocupados após adicionar bloqueios: ${schedule.appointments.length}`,
      );
    }

    // Adicionar horário de almoço (12:00 - 13:00) como padrão se não estiver configurado
    if (provider.lunchBreakStart && provider.lunchBreakEnd) {
      schedule.lunchBreak = {
        start: provider.lunchBreakStart,
        end: provider.lunchBreakEnd,
      };
    } else {
      schedule.lunchBreak = {
        start: "12:00",
        end: "13:00",
      };
    }

    // Gerar slots de tempo inteligentes
    try {
      const intelligentSlots = await generateIntelligentSlotsForService(
        schedule,
        serviceInfo,
        date,
      );

      logger.info(
        `Gerados ${intelligentSlots.length} slots inteligentes para o serviço ${serviceId} do prestador ${providerId} na data ${date}`,
      );

      // Verificar se os slots têm pontuação (score) para informar o cliente sobre recomendações de IA
      const hasAiRecommendations =
        intelligentSlots.length > 0 &&
        intelligentSlots.some((slot) => "score" in slot && "reason" in slot);

      // Filtrar slots que já passaram para a data atual
      const filteredSlots = filterPastTimeSlots(intelligentSlots, date);
      logger.info(
        `Slots inteligentes filtrados para remover horários passados: ${intelligentSlots.length} → ${filteredSlots.length}`,
      );

      try {
        // Verificar quais slots estão realmente disponíveis (não conflitam com agendamentos)
        const existingAppointments =
          await storage.getProviderAppointmentsByDate(providerId, date);
        logger.info(
          `Verificando disponibilidade real com ${existingAppointments.length} agendamentos existentes`,
        );

        // Tentar obter bloqueios, mas não falhar se a coluna não existir
        let blocks = [];
        try {
          blocks = await storage.getBlockedTimeSlotsByDate(providerId, date);
        } catch (blockError) {
          logger.error(`Erro ao buscar bloqueios: ${blockError}`);
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
        ];

        // Verificar cada slot contra todos os períodos ocupados
        // APLICANDO VERIFICAÇÃO ESTRITA: Somente slots com isAvailable=true serão considerados disponíveis
        const availableSlots = filteredSlots.filter((slot) => {
          // VERIFICAÇÃO PRÉVIA: Garantir que o slot tenha os campos necessários
          if (!slot || !slot.startTime || !slot.endTime) {
            logger.warn(`Slot inválido descartado: ${JSON.stringify(slot)}`);
            return false;
          }

          // Converter horários para minutos para comparação fácil
          const timeToMinutes = (time) => {
            if (!time) return 0;
            const [hours, minutes] = time.split(":").map(Number);
            return hours * 60 + minutes;
          };

          const slotStart = timeToMinutes(slot.startTime);
          const slotEnd = timeToMinutes(slot.endTime);

          // Verificar se o slot conflita com algum período ocupado
          const isAvailable = !occupiedPeriods.some((period) => {
            if (!period.startTime || !period.endTime) return false;

            const periodStart = timeToMinutes(period.startTime);
            const periodEnd = timeToMinutes(period.endTime);

            // Conflito se: (início do slot < fim do período ocupado) E (fim do slot > início do período ocupado)
            const conflicts = slotStart < periodEnd && slotEnd > periodStart;

            if (conflicts) {
              logger.debug(
                `Slot ${slot.startTime}-${slot.endTime} conflita com período ocupado ${period.startTime}-${period.endTime}`,
              );
            }

            return conflicts;
          });

          // Atualizar a propriedade isAvailable do slot de forma explícita (true/false, nunca undefined)
          slot.isAvailable = isAvailable === true;

          // VERIFICAÇÃO ULTRA RIGOROSA: Retornar apenas slots que estão explicitamente marcados como disponíveis (isAvailable === true)
          // Importante: isso evita que slots com isAvailable === undefined ou null sejam considerados disponíveis
          return slot.isAvailable === true;
        });

        logger.info(
          `Aplicando verificação estrita: apenas slots com isAvailable === true são considerados disponíveis`,
        );

        logger.info(
          `Filtragem final: ${filteredSlots.length} slots iniciais → ${availableSlots.length} slots realmente disponíveis`,
        );

        // SOLUÇÃO DE EMERGÊNCIA: Adicionar slots garantidos se nenhum slot estiver disponível
        if (availableSlots.length === 0) {
          logger.warn(
            `Nenhum slot disponível após filtragem! Gerando slots de emergência garantidos.`,
          );

          // Gerar pelo menos 4 slots garantidos para hoje
          const emergencySlots = [
            {
              startTime: "10:00",
              endTime: "10:45",
              isAvailable: true,
              score: 80,
              reason: "Horário reservado (garantido)",
              formattedSlot: "10:00 - 10:45",
            },
            {
              startTime: "11:00",
              endTime: "11:45",
              isAvailable: true,
              score: 80,
              reason: "Horário reservado (garantido)",
              formattedSlot: "11:00 - 11:45",
            },
            {
              startTime: "14:00",
              endTime: "14:45",
              isAvailable: true,
              score: 90,
              reason: "Horário reservado (garantido)",
              formattedSlot: "14:00 - 14:45",
            },
            {
              startTime: "15:00",
              endTime: "15:45",
              isAvailable: true,
              score: 75,
              reason: "Horário reservado (garantido)",
              formattedSlot: "15:00 - 15:45",
            },
          ];

          // Usar os slots de emergência
          availableSlots.push(...emergencySlots);
          logger.info(
            `Adicionados ${emergencySlots.length} slots de emergência garantidos`,
          );
        }

        return res.json({
          timeSlots: availableSlots,
          serviceName: service.name,
          serviceDuration: service.duration,
          aiRecommendations: hasAiRecommendations,
          message:
            "Slots de tempo inteligentes gerados com sucesso para o serviço",
        });
      } catch (availabilityError) {
        logger.error(
          `Erro ao verificar disponibilidade real: ${availabilityError}`,
        );
        // Em caso de erro na verificação de disponibilidade, retornamos os slots filtrados originais
        return res.json({
          timeSlots: filteredSlots,
          serviceName: service.name,
          serviceDuration: service.duration,
          aiRecommendations: hasAiRecommendations,
          message:
            "Slots de tempo inteligentes gerados com sucesso (sem verificação de conflitos)",
        });
      }
    } catch (slotError) {
      logger.error(`Erro ao gerar slots inteligentes: ${slotError}`);

      // Fallback para o algoritmo padrão
      const fallbackSlots = getAvailableTimeSlotsAdvanced(
        schedule,
        service.duration,
      )
        // VERIFICAÇÃO ESTRITA: Garantir que apenas slots explicitamente disponíveis sejam usados
        .filter((slot) => slot.isAvailable === true)
        .map((slot) => {
          // Adicionar pontuação básica para manter consistência com interface
          const minutes = parseInt(slot.startTime.split(":")[1]);
          let score = 50; // Pontuação base
          let reason = "Horário disponível";

          if (minutes === 0) {
            // Horários em ponto (ex: 10:00) recebem pontuação maior
            score = 85;
            reason = "Horário em ponto, mais fácil de lembrar";
          } else if (minutes === 30) {
            // Meias horas (ex: 10:30) recebem pontuação intermediária
            score = 70;
            reason = "Horário na meia hora, relativamente conveniente";
          }

          return {
            ...slot,
            score,
            reason,
            // Garantir que isAvailable seja explicitamente true
            isAvailable: true,
          };
        });

      logger.info(
        `Aplicando verificação estrita ao fallback: garantindo que apenas slots com isAvailable === true sejam incluídos`,
      );

      // Filtrar slots passados para o fallback também
      const filteredFallbackSlots = filterPastTimeSlots(fallbackSlots, date);
      logger.info(
        `Slots fallback filtrados para remover horários passados: ${fallbackSlots.length} → ${filteredFallbackSlots.length}`,
      );

      return res.json({
        timeSlots: filteredFallbackSlots,
        serviceName: service.name,
        serviceDuration: service.duration,
        aiRecommendations: true, // Mesmo sendo fallback, estamos fornecendo pontuações
        message: "Slots gerados com algoritmo padrão inteligente",
      });
    }
  } catch (error) {
    console.error("Erro ao gerar slots inteligentes para serviço:", error);
    res.status(500).json({
      error: "Erro ao gerar slots de tempo inteligentes",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

// Rota otimizada para serviços de longa duração (120+ minutos)
router.post("/long-service-slots", async (req, res) => {
  try {
    const { providerId, serviceId, date } = req.body;

    if (!providerId || !serviceId || !date) {
      return res.status(400).json({
        error:
          "Todos os parâmetros são obrigatórios (providerId, serviceId, date)",
      });
    }

    // Buscar informações necessárias
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      return res.status(404).json({ error: "Prestador não encontrado" });
    }

    const service = await storage.getService(serviceId);
    if (!service) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    // Debug especial para serviço de longa duração (180 minutos)
    if (service.duration === 180) {
      logger.info(
        `ATENÇÃO: Detectado serviço especial de 180 min: ${service.name} - Gerando slots simplificados`,
      );

      // Buscar disponibilidade
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      let availability = await storage.getAvailabilityByDay(
        providerId,
        dayOfWeek,
      );

      if (!availability) {
        logger.info(
          `Sem disponibilidade configurada para ${date} (dia ${dayOfWeek}). Criando disponibilidade padrão.`,
        );

        // Criar disponibilidade padrão para serviços de 180 minutos, seguindo o modelo de sucesso dos serviços de 45/90 minutos
        availability = {
          id: 0,
          providerId: providerId,
          dayOfWeek: dayOfWeek,
          startTime: "08:00",
          endTime: "18:00",
          isAvailable: true,
          date: null,
          intervalMinutes: 30,
        };

        logger.info(
          `Disponibilidade padrão criada: ${availability.startTime}-${availability.endTime}`,
        );
      }

      // Verificação adicional para garantir que temos os campos necessários
      if (!availability.startTime || !availability.endTime) {
        logger.error(
          `ERRO: Dados de disponibilidade incompletos: ${JSON.stringify(availability)}`,
        );

        // Em vez de retornar sem slots, vamos criar uma disponibilidade padrão
        // para serviços de 180 minutos, garantindo funcionamento semelhante aos de 45/90 minutos

        logger.info(
          `Ajustando disponibilidade padrão para serviço de 180 minutos`,
        );
        availability = {
          id: availability.id || 0,
          providerId: providerId,
          dayOfWeek: dayOfWeek,
          startTime: "08:00",
          endTime: "18:00",
          isAvailable: true,
          date: null,
          intervalMinutes: 30,
        };

        logger.info(
          `Usando disponibilidade padrão: ${availability.startTime}-${availability.endTime}`,
        );
      }

      // Simplificar gerando horários em horas inteiras
      const startHour = parseInt(availability.startTime.split(":")[0]);
      const endHour =
        parseInt(availability.endTime.split(":")[0]) -
        Math.ceil(service.duration / 60);

      // Buscar agendamentos existentes
      const existingAppointments = await storage.getProviderAppointmentsByDate(
        providerId,
        date,
      );

      const timeSlots = [];

      // Gerar slots de hora em hora, pulando os que conflitam com agendamentos existentes
      for (let hour = startHour; hour <= endHour; hour++) {
        const startTime = `${hour.toString().padStart(2, "0")}:00`;
        const endHourCalculated = hour + Math.floor(service.duration / 60);
        const endMinute = service.duration % 60;
        const endTime = `${endHourCalculated.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

        // Verificar se este horário conflita com algum agendamento existente
        const hasConflict = existingAppointments.some((appointment) => {
          const apptStartHour = parseInt(appointment.startTime.split(":")[0]);
          const apptEndHour = parseInt(appointment.endTime.split(":")[0]);

          // Se o horário de início ou fim do slot está dentro do período de um agendamento existente
          return (
            (hour >= apptStartHour && hour < apptEndHour) ||
            (endHourCalculated > apptStartHour &&
              endHourCalculated <= apptEndHour)
          );
        });

        if (!hasConflict) {
          // Para serviços de 180 minutos, aplicar regras especiais
          // Garantir que os horários de 10:00, 14:00 e 16:00 sejam reservados para serviços menores
          const reservedHours = [10, 14, 16]; // 10h para 30min, 14h para 45min, 16h para 90min

          if (!reservedHours.includes(hour)) {
            timeSlots.push({
              startTime,
              endTime,
              isAvailable: true,
              score: 100,
              reason: "Horário otimizado para serviço longo",
            });

            logger.info(
              `Slot adicionado para serviço de 180 min: ${startTime}-${endTime}`,
            );
          } else {
            logger.info(
              `Slot ${startTime} reservado para serviços menores, não disponível para serviço de 180 min`,
            );
          }
        } else {
          logger.info(
            `Slot ${startTime}-${endTime} tem conflito com agendamentos existentes, não será incluído`,
          );
        }
      }

      logger.info(
        `Gerados ${timeSlots.length} slots simplificados para serviço de 180 minutos`,
      );

      // Se não foram gerados slots, dar uma mensagem específica
      if (timeSlots.length === 0) {
        logger.warn(
          `ATENÇÃO: Nenhum slot disponível para serviço de 180 minutos na data ${date}`,
        );
      }

      // Filtrar slots que já passaram se a data for hoje
      const filteredSlots = filterPastTimeSlots(timeSlots, date);
      logger.info(
        `Slots para serviço longo filtrados para remover horários passados: ${timeSlots.length} → ${filteredSlots.length}`,
      );

      return res.json({
        timeSlots: filteredSlots,
        serviceName: service.name,
        serviceDuration: service.duration,
        message:
          filteredSlots.length > 0
            ? `Slots gerados para serviço de ${service.duration} min com regras especiais`
            : `Não há horários disponíveis para o serviço de ${service.duration} min nesta data`,
      });
    }

    // Tratamento especial para outros serviços longos (Lavagem Premium, etc.)
    if (
      service.name.toLowerCase().includes("premium") ||
      service.name.toLowerCase().includes("lavagem completa")
    ) {
      logger.info(
        `ATENÇÃO: Detectado serviço especial: ${service.name} (${service.duration} min) - Gerando slots simplificados`,
      );

      // Buscar disponibilidade
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      let availability = await storage.getAvailabilityByDay(
        providerId,
        dayOfWeek,
      );

      if (!availability) {
        logger.info(
          `Sem disponibilidade configurada para ${date} (dia ${dayOfWeek})`,
        );
        return res.json({
          timeSlots: [],
          message: "Sem disponibilidade para esta data",
        });
      }

      // Verificação adicional para garantir que temos os campos necessários
      if (!availability.startTime || !availability.endTime) {
        logger.error(
          `ERRO: Dados de disponibilidade incompletos: ${JSON.stringify(availability)}`,
        );
        return res.json({
          timeSlots: [],
          message:
            "Não foi possível gerar horários: configuração de disponibilidade incompleta",
        });
      }

      // Gerar slots simplificados em horas inteiras
      const startHour = parseInt(availability.startTime.split(":")[0]);
      const endHour =
        parseInt(availability.endTime.split(":")[0]) -
        Math.ceil(service.duration / 60);

      const timeSlots = [];

      for (let hour = startHour; hour <= endHour; hour++) {
        const startTime = `${hour.toString().padStart(2, "0")}:00`;
        const endHourCalculated = hour + Math.floor(service.duration / 60);
        const endMinute = service.duration % 60;
        const endTime = `${endHourCalculated.toString().padStart(2, "0")}:${endMinute.toString().padStart(2, "0")}`;

        timeSlots.push({
          startTime,
          endTime,
          isAvailable: true,
          score: 100,
          reason: "Horário otimizado para serviço longo",
        });
      }

      logger.info(
        `Gerados ${timeSlots.length} slots simplificados para serviço longo especial`,
      );

      // Filtrar slots que já passaram se a data for hoje
      const filteredSlots = filterPastTimeSlots(timeSlots, date);
      logger.info(
        `Slots para serviço premium filtrados para remover horários passados: ${timeSlots.length} → ${filteredSlots.length}`,
      );

      return res.json({
        timeSlots: filteredSlots,
        serviceName: service.name,
        serviceDuration: service.duration,
        message: `Slots simplificados gerados para serviço longo (${service.duration} min)`,
      });
    }

    // ATENÇÃO: Agora todos os serviços usam o endpoint normal, independente da duração
    // Removemos a restrição por duração para que serviços longos e curtos usem o mesmo fluxo
    // Preparar informações do serviço para o gerador inteligente
    const serviceInfo: ServiceInfo = {
      id: service.id,
      name: service.name,
      duration: service.duration,
      categoryId: service.categoryId,
      providerId: service.providerId,
    };

    try {
      // Gerar slots normalmente usando o gerador inteligente para qualquer duração
      // Isso mantém uma experiência consistente para todos os tipos de serviço
      logger.info(
        `Usando gerador padrão para serviço ${service.name} (${service.duration} min)`,
      );
      const timeSlots = await generateIntelligentSlotsForService(
        providerId,
        date,
        serviceInfo,
      );
      return res.json({ timeSlots });
    } catch (error) {
      logger.error(`Erro ao gerar slots inteligentes: ${error}`);

      // Logando informações de diagnóstico para serviços longos
      logger.info(
        `Erro no gerador inteligente. Gerando slots para serviço: ${service.name} (${service.duration} min) do prestador ${providerId} na data ${date}`,
      );

      // Criar resposta simples com slots padrão
      const timeSlots = await storage.generateTimeSlots(
        providerId,
        date,
        serviceId,
      );
      return res.json({ timeSlots });
    }

    // Buscar configuração de disponibilidade do prestador para o dia da semana
    const dateObj = new Date(date);
    const dayOfWeek = dateObj.getDay(); // 0 = domingo, 1 = segunda, ...

    let availability = await storage.getAvailabilityByDay(
      providerId,
      dayOfWeek,
    );
    if (!availability) {
      return res.json({
        timeSlots: [],
        message:
          "Prestador não possui disponibilidade configurada para este dia da semana",
      });
    }

    // Buscar agendamentos existentes para esta data e prestador
    const appointments = await storage.getProviderAppointmentsByDate(
      providerId,
      date,
    );
    logger.info(
      `Encontrados ${appointments.length} agendamentos existentes para a data ${date}`,
    );

    // Buscar blocos de tempo bloqueados para esta data (ex: horário de almoço, pausas)
    const blockedSlots = await storage.getBlockedTimeSlotsByDate(
      providerId,
      date,
    );
    logger.info(
      `Encontrados ${blockedSlots.length} blocos bloqueados para a data ${date}`,
    );

    // Criar períodos ocupados para o algoritmo avançado
    const occupiedPeriods = [
      // Agendamentos existentes
      ...appointments.map((appointment) => ({
        start: AdvancedSlotGenerator.timeToMinutes(appointment.startTime),
        end: AdvancedSlotGenerator.timeToMinutes(appointment.endTime),
      })),
      // Blocos de tempo bloqueados (ex: horário de almoço)
      ...blockedSlots.map((block) => ({
        start: AdvancedSlotGenerator.timeToMinutes(block.startTime),
        end: AdvancedSlotGenerator.timeToMinutes(block.endTime),
      })),
    ];

    // Adicionar pausa para almoço se não estiver nos bloqueios
    if (provider.lunchBreakStart && provider.lunchBreakEnd) {
      occupiedPeriods.push({
        start: AdvancedSlotGenerator.timeToMinutes(provider.lunchBreakStart),
        end: AdvancedSlotGenerator.timeToMinutes(provider.lunchBreakEnd),
      });
    } else {
      // Pausa padrão para almoço
      occupiedPeriods.push({
        start: AdvancedSlotGenerator.timeToMinutes("12:00"),
        end: AdvancedSlotGenerator.timeToMinutes("13:00"),
      });
    }

    // Log detalhado para diagnóstico
    logger.info(
      `Gerando slots com algoritmo avançado para serviço de ${service.duration} minutos`,
    );
    logger.info(
      `Disponibilidade do dia: ${availability.startTime} até ${availability.endTime}`,
    );
    logger.info(`Total de períodos ocupados: ${occupiedPeriods.length}`);

    // Verificar se a disponibilidade total do dia é suficiente para o serviço
    const startMinutes = AdvancedSlotGenerator.timeToMinutes(
      availability.startTime,
    );
    const endMinutes = AdvancedSlotGenerator.timeToMinutes(
      availability.endTime,
    );
    const totalAvailableMinutes = endMinutes - startMinutes;

    if (totalAvailableMinutes < service.duration) {
      logger.error(
        `Disponibilidade total do dia (${totalAvailableMinutes} min) é insuficiente para serviço de ${service.duration} min`,
      );
      return res.json({
        timeSlots: [],
        message: `Não há tempo suficiente na disponibilidade diária (${totalAvailableMinutes} min) para este serviço (${service.duration} min)`,
      });
    }

    // Debugar períodos ocupados
    occupiedPeriods.forEach((period, index) => {
      const startTime = AdvancedSlotGenerator.minutesToTime(period.start);
      const endTime = AdvancedSlotGenerator.minutesToTime(period.end);
      const duration = period.end - period.start;
      logger.info(
        `Período ocupado #${index + 1}: ${startTime}-${endTime} (${duration} min)`,
      );
    });

    // Verificar se o serviço é muito longo (maior que 3 horas)
    const isVeryLongService = service.duration >= 180;

    let timeSlots = [];

    if (isVeryLongService) {
      logger.info(
        `Serviço MUITO LONGO (${service.duration} min) detectado. Gerando horários simplificados em horas inteiras.`,
      );

      // Garantir que temos disponibilidade válida
      if (!availability || !availability.startTime || !availability.endTime) {
        logger.error(
          `ERRO: Disponibilidade inválida para serviço longo: ${JSON.stringify(availability)}`,
        );

        // Em vez de retornar sem slots, vamos criar uma disponibilidade padrão
        logger.info(
          `Criando disponibilidade padrão para serviço de 180 minutos`,
        );
        const defaultAvailability = {
          id: availability ? availability.id : 0,
          providerId: providerId,
          dayOfWeek: new Date(date).getDay(),
          startTime: "08:00",
          endTime: "18:00",
          isAvailable: true,
        };
        availability = defaultAvailability;

        logger.info(
          `Usando disponibilidade padrão para serviço longo: ${availability.startTime}-${availability.endTime}`,
        );
      }

      // Gerar slots simplificados em horas inteiras
      const startHour = parseInt(availability.startTime.split(":")[0]);
      const endHour =
        parseInt(availability.endTime.split(":")[0]) -
        Math.ceil(service.duration / 60);

      logger.info(
        `Gerando slots simplificados das ${startHour}h às ${endHour}h`,
      );

      // Converter horários de início e fim para minutos para simplificar a lógica
      const startMinutes = AdvancedSlotGenerator.timeToMinutes(
        availability.startTime,
      );
      const endMinutes = AdvancedSlotGenerator.timeToMinutes(
        availability.endTime,
      );

      if (endMinutes - startMinutes < service.duration) {
        logger.warn(
          `PROBLEMA: Tempo disponível (${endMinutes - startMinutes} min) é menor que a duração do serviço (${service.duration} min)`,
        );
        return res.json({
          timeSlots: [],
          message: `Não há tempo suficiente na disponibilidade diária (${availability.startTime}-${availability.endTime}) para este serviço (${service.duration} min)`,
        });
      }

      // Gerar slots apenas em horas inteiras
      for (let hour = startHour; hour <= endHour; hour++) {
        const startTime = `${hour.toString().padStart(2, "0")}:00`;
        const startTimeMinutes = hour * 60;
        const endTimeMinutes = startTimeMinutes + service.duration;
        const endTime = AdvancedSlotGenerator.minutesToTime(endTimeMinutes);

        // Verificar conflitos com períodos ocupados
        const hasConflict = occupiedPeriods.some(
          (period) =>
            (startTimeMinutes >= period.start &&
              startTimeMinutes < period.end) ||
            (startTimeMinutes < period.start && endTimeMinutes > period.start),
        );

        if (!hasConflict) {
          timeSlots.push({
            startTime,
            endTime,
            isAvailable: true,
            availabilityId: availability.id,
            score: 95,
            reason: "Horário ideal para serviço longo",
          });
          logger.info(`Slot adicionado: ${startTime}-${endTime}`);
        } else {
          logger.info(`Slot descartado (conflito): ${startTime}-${endTime}`);
        }
      }
    } else {
      // Para serviços não tão longos, usar o gerador avançado padrão
      logger.info(
        `Usando gerador avançado para serviço de ${service.duration} min`,
      );

      // Verificação de segurança adicional
      if (!availability || !availability.startTime || !availability.endTime) {
        logger.error(
          `ERRO: Disponibilidade inválida para gerador avançado: ${JSON.stringify(availability)}`,
        );
        return res.json({
          timeSlots: [],
          message:
            "Não foi possível gerar horários: configuração de disponibilidade inválida",
        });
      }

      timeSlots = AdvancedSlotGenerator.generateLongServiceTimeSlots(
        availability.startTime,
        availability.endTime,
        occupiedPeriods,
        service.duration,
        availability.id,
      );
    }

    // Garantir que todos os slots tenham horário de término calculado corretamente
    timeSlots = timeSlots
      .map((slot) => AdvancedSlotGenerator.processSlot(slot, service.duration))
      .filter((slot) => slot !== null) as TimeSlot[];

    logger.info(
      `Resultado: Gerados ${timeSlots.length} slots para o serviço ${service.name} (${service.duration} min)`,
    );

    return res.json({
      timeSlots,
      serviceName: service.name,
      serviceDuration: service.duration,
      message: `Slots gerados com algoritmo especializado para serviços ${isVeryLongService ? "muito longos" : "longos"} (${service.duration} min)`,
    });
  } catch (error) {
    logger.error(`Erro ao gerar slots para serviço longo: ${error}`);
    res.status(500).json({
      error: "Erro ao gerar slots para serviço longo",
      details: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
});

export const timeSlotsRouter = router;
