/**
 * Serviço Inteligente de Agendamento com IA
 * 
 * Este serviço implementa o algoritmo de fluxo inteligente de agendamento
 * conforme especificado no documento do projeto.
 * 
 * Características:
 * - Identificação da duração do serviço
 * - Busca por janelas contínuas com tempo suficiente para execução
 * - Geração de blocos de tempo válidos
 * - Evita conflitos e sobreposições
 * - Permite múltiplos agendamentos no dia
 */

import { ProviderSchedule, TimeSlot } from './available-time-slots';
import { anthropicService } from './anthropic-service';
import { createLogger } from './logger';

const logger = createLogger('IntelligentSlotService');

export interface ServiceInfo {
  id: number;
  name: string;
  duration: number;
  categoryId: number;
  providerId: number;
}

export interface SlotRecommendation {
  startTime: string;
  endTime: string;
  score: number;
  reason: string;
}

interface TimeWindow {
  start: string;
  end: string;
  durationMinutes: number;
}

/**
 * Gera slots de tempo inteligentes para um serviço específico
 * considerando a duração necessária e a agenda do prestador
 */
export async function generateIntelligentSlotsForService(
  providerSchedule: ProviderSchedule,
  service: ServiceInfo,
  date: string,
  appointmentData?: { date: string; startTime: string; endTime: string }[] // Opcional: agendamentos adicionais a considerar
): Promise<TimeSlot[]> {
  try {
    // Identificar a duração do serviço
    const serviceDuration = service.duration;
    logger.info(`Gerando slots inteligentes para serviço ${service.name} (${serviceDuration} minutos)`);
    
    // Se existem agendamentos adicionais não refletidos no schedule, adicioná-los
    if (appointmentData && appointmentData.length > 0) {
      // Filtra apenas os agendamentos para a data atual
      const relevantAppointments = appointmentData.filter(appt => appt.date === date);
      
      if (relevantAppointments.length > 0) {
        // Adiciona esses agendamentos ao schedule
        const additionalAppointments = relevantAppointments.map(appt => ({
          startTime: appt.startTime,
          duration: timeToMinutes(appt.endTime) - timeToMinutes(appt.startTime)
        }));
        
        // Adiciona à lista existente ou cria uma nova
        if (!providerSchedule.appointments) {
          providerSchedule.appointments = additionalAppointments;
        } else {
          providerSchedule.appointments = [...providerSchedule.appointments, ...additionalAppointments];
        }
        
        logger.info(`Adicionados ${relevantAppointments.length} agendamentos extras à análise de disponibilidade`);
      }
    }

    // Encontrar janelas de tempo livres na agenda do prestador
    const freeWindows = identifyFreeTimeWindows(providerSchedule);
    logger.info(`Identificadas ${freeWindows.length} janelas livres na agenda`);

    // Gerar slots válidos com base na duração do serviço
    const validSlots = generateValidTimeSlots(freeWindows, serviceDuration);
    logger.info(`Gerados ${validSlots.length} slots válidos para o serviço`);

    // Verificar se devemos usar IA para ranking de slots
    if (anthropicService.isInitialized() && validSlots.length > 0) {
      try {
        const rankedSlots = await rankSlotsWithAI(validSlots, service, date);
        // Ordenar por pontuação (score)
        return rankedSlots
          .sort((a, b) => b.score - a.score)
          .map(slot => ({
            startTime: slot.startTime,
            endTime: slot.endTime,
            score: slot.score,
            reason: slot.reason
          }));
      } catch (aiError) {
        logger.error(`Erro ao usar IA para ranking de slots: ${aiError}`);
        // Em caso de erro na IA, retornar slots com pontuação básica
        return validSlots.map(slot => {
          // Determinar score básico com base no horário (horários "redondos" têm pontuação maior)
          const hour = parseInt(slot.startTime.split(':')[0]);
          const minutes = parseInt(slot.startTime.split(':')[1]);
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
            reason
          };
        });
      }
    }

    // Se não usamos IA, retornar uma classificação básica
    return validSlots.map(slot => {
      // Determinar score básico com base no horário (horários "redondos" têm pontuação maior)
      const hour = parseInt(slot.startTime.split(':')[0]);
      const minutes = parseInt(slot.startTime.split(':')[1]);
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
        reason
      };
    });
  } catch (error) {
    logger.error(`Erro ao gerar slots inteligentes: ${error}`);
    return [];
  }
}

/**
 * Identifica janelas de tempo livre na agenda do prestador
 */
function identifyFreeTimeWindows(schedule: ProviderSchedule): TimeWindow[] {
  const freeWindows: TimeWindow[] = [];
  
  // Converter horários para minutos desde o início do dia para facilitar cálculos
  const workStartMinutes = timeToMinutes(schedule.workingHours.start);
  const workEndMinutes = timeToMinutes(schedule.workingHours.end);
  
  // Criar lista de eventos ordenados (início do trabalho, fim do trabalho, início/fim de compromissos)
  const events: {time: number, isStart: boolean}[] = [
    {time: workStartMinutes, isStart: true},
    {time: workEndMinutes, isStart: false}
  ];
  
  // Adicionar horário de almoço, se existir
  if (schedule.lunchBreak) {
    events.push({time: timeToMinutes(schedule.lunchBreak.start), isStart: false});
    events.push({time: timeToMinutes(schedule.lunchBreak.end), isStart: true});
  }
  
  // Adicionar compromissos existentes
  schedule.appointments.forEach(appointment => {
    const appointmentStartMin = timeToMinutes(appointment.startTime);
    const appointmentEndMin = appointmentStartMin + appointment.duration;
    
    events.push({time: appointmentStartMin, isStart: false});
    events.push({time: appointmentEndMin, isStart: true});
  });
  
  // Ordenar eventos por horário
  events.sort((a, b) => {
    if (a.time !== b.time) return a.time - b.time;
    // Quando os horários são iguais, priorizamos finais de eventos antes de inícios
    return a.isStart ? 1 : -1; 
  });
  
  // Percorrer os eventos para identificar janelas livres
  let lastFreeStart: number | null = null;
  let isAvailable = true; // Começamos com disponibilidade (início do expediente)
  let nestedEndCount = 0;
  
  events.forEach((event, index) => {
    if (event.isStart) {
      // Quando um período ocupado termina
      nestedEndCount--;
      if (nestedEndCount === 0) {
        isAvailable = true;
        lastFreeStart = event.time;
      }
    } else {
      // Quando um período ocupado começa
      if (isAvailable && lastFreeStart !== null) {
        // Temos uma janela livre entre lastFreeStart e o evento atual
        const windowDuration = event.time - lastFreeStart;
        if (windowDuration > 0) {
          freeWindows.push({
            start: minutesToTime(lastFreeStart),
            end: minutesToTime(event.time),
            durationMinutes: windowDuration
          });
        }
        isAvailable = false;
      }
      nestedEndCount++;
    }
  });
  
  return freeWindows;
}

/**
 * Gera slots de tempo válidos a partir das janelas livres
 * considerando a duração do serviço
 */
function generateValidTimeSlots(freeWindows: TimeWindow[], serviceDuration: number): TimeSlot[] {
  const validSlots: TimeSlot[] = [];
  const intervalMinutes = 15; // Intervalos de 15 minutos entre inícios possíveis
  
  freeWindows.forEach(window => {
    // Se a janela não comporta o serviço, pular
    if (window.durationMinutes < serviceDuration) return;
    
    const windowStartMinutes = timeToMinutes(window.start);
    const windowEndMinutes = timeToMinutes(window.end);
    
    // Gerar slots a cada 15 minutos, desde que caibam na janela
    for (let startMin = windowStartMinutes; startMin <= windowEndMinutes - serviceDuration; startMin += intervalMinutes) {
      // Arredondar para o próximo intervalo de 15 minutos
      const roundedStartMin = Math.ceil(startMin / intervalMinutes) * intervalMinutes;
      
      // Verificar se ainda cabe na janela após arredondamento
      if (roundedStartMin + serviceDuration <= windowEndMinutes) {
        const slotStartTime = minutesToTime(roundedStartMin);
        const slotEndTime = minutesToTime(roundedStartMin + serviceDuration);
        
        validSlots.push({
          startTime: slotStartTime,
          endTime: slotEndTime
        });
      }
    }
  });
  
  return validSlots;
}

/**
 * Converte horário no formato "HH:MM" para minutos desde o início do dia
 */
function timeToMinutes(time: string): number {
  // Verificar se time é uma string válida antes de prosseguir
  if (!time || typeof time !== 'string') {
    logger.error(`Tempo inválido recebido: ${time}`);
    return 0; // Retornar 0 como valor padrão (meia-noite)
  }
  
  try {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  } catch (error) {
    logger.error(`Erro ao converter tempo ${time}: ${error}`);
    return 0;
  }
}

/**
 * Converte minutos desde o início do dia para horário no formato "HH:MM"
 */
function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Usa IA para rankear os slots de tempo de acordo com a relevância
 */
async function rankSlotsWithAI(
  slots: TimeSlot[], 
  service: ServiceInfo,
  date: string
): Promise<SlotRecommendation[]> {
  try {
    // Preparar dados para enviar para a IA
    const data = {
      service,
      date,
      availableSlots: slots,
      currentTime: new Date().toISOString()
    };

    // Instruções para a IA
    const instructions = `
      Analise os horários disponíveis para agendamento e atribua uma pontuação (score) de 0 a 100 
      para cada slot com base nos seguintes critérios:
      
      1. Preferência por horários "redondos" (ex: 9:00, 10:00, etc) - prioridade alta
      2. Proximidade com o horário atual (nem muito cedo, nem muito tarde) - prioridade média
      3. Espaçamento uniforme entre slots - prioridade baixa
      
      Para cada slot, forneça um motivo resumido da pontuação.
      
      Responda em formato JSON com a seguinte estrutura:
      {
        "recommendations": [
          {
            "startTime": "09:00",
            "endTime": "09:45",
            "score": 85,
            "reason": "Horário redondo em período da manhã com boa disponibilidade"
          },
          ...
        ]
      }
    `;
    
    // Usar o serviço Anthropic para ranking
    const result = await anthropicService.analyzeScheduleData(data, instructions);
    
    // Validar e retornar as recomendações
    if (result && result.recommendations && Array.isArray(result.recommendations)) {
      return result.recommendations;
    } else {
      logger.error("Formato de resposta da IA inválido");
      // Fallback: retornar os slots originais com pontuação padrão
      return slots.map(slot => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        score: 50,
        reason: "Slot disponível (pontuação padrão)"
      }));
    }
  } catch (error) {
    logger.error(`Erro ao rankear slots com IA: ${error}`);
    // Fallback: retornar os slots originais com pontuação padrão
    return slots.map(slot => ({
      startTime: slot.startTime,
      endTime: slot.endTime,
      score: 50,
      reason: "Slot disponível (pontuação padrão)"
    }));
  }
}