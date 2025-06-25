/**
 * IA para Geração Inteligente de Slots de Tempo
 * 
 * Este módulo implementa algoritmos avançados para geração de slots de tempo,
 * considerando diversos fatores como preferências de horário, padrões de agendamento,
 * e demanda por serviços.
 */

import { TimeSlot, TimeRange, Appointment, ProviderSchedule } from './available-time-slots';

export interface AITimeSlotOptions {
  prioritizeRoundHours?: boolean;     // Priorizar horários "redondos" (9:00, 10:00)
  prioritizeEvenSpacing?: boolean;    // Distribuir slots uniformemente durante o dia
  prioritizeConsecutiveSlots?: boolean; // Agrupar slots para serviços sequenciais
  timeOfDayPreference?: 'morning' | 'afternoon' | 'evening' | null; // Preferência por período
  priorityFactor?: number;            // 0-1, quanto maior, mais os fatores acima influenciam
}

// Tipos de peso para cada critério
interface SlotWeight {
  roundHour: number;
  evenSpacing: number;
  timeOfDay: number;
  consecutive: number;
}

/**
 * Converte horário no formato "HH:MM" para minutos desde o início do dia
 */
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
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
 * Verifica se um slot de tempo está disponível (não conflita com agendamentos existentes)
 */
function isSlotAvailable(
  startMinutes: number,
  endMinutes: number,
  blockedRanges: { start: number; end: number }[]
): boolean {
  // Verifica se o slot proposto não se sobrepõe a nenhum período bloqueado
  for (const range of blockedRanges) {
    // Há sobreposição se o início do slot for menor que o fim do bloqueio
    // e o fim do slot for maior que o início do bloqueio
    if (startMinutes < range.end && endMinutes > range.start) {
      return false;
    }
  }
  return true;
}

/**
 * Gera uma lista de possíveis horários de início com pesos para cada fator
 */
function generatePossibleSlots(
  workStartMinutes: number,
  workEndMinutes: number,
  serviceDuration: number,
  options: AITimeSlotOptions
): { startMinutes: number; weights: SlotWeight }[] {
  const slots: { startMinutes: number; weights: SlotWeight }[] = [];
  
  // Loop por todos os minutos possíveis do expediente
  for (let minute = workStartMinutes; minute <= workEndMinutes - serviceDuration; minute += 5) {
    // Ignorar minutos que não são múltiplos de 5
    if (minute % 5 !== 0) continue;
    
    const hour = Math.floor(minute / 60);
    const minuteInHour = minute % 60;
    
    // Calcular os pesos para este slot
    const weights: SlotWeight = {
      roundHour: 0,
      evenSpacing: 0,
      timeOfDay: 0,
      consecutive: 0
    };
    
    // Peso para horários "redondos"
    if (minuteInHour === 0) {
      weights.roundHour = 1.0; // Hora exata (ex.: 9:00)
    } else if (minuteInHour === 30) {
      weights.roundHour = 0.8; // Meia hora (ex.: 9:30)
    } else if (minuteInHour === 15 || minuteInHour === 45) {
      weights.roundHour = 0.6; // Quartos de hora (ex.: 9:15, 9:45)
    } else if (minuteInHour % 5 === 0) {
      weights.roundHour = 0.2; // Múltiplos de 5 minutos
    }
    
    // Peso para período do dia
    if (options.timeOfDayPreference) {
      const isMorning = hour >= 5 && hour < 12;
      const isAfternoon = hour >= 12 && hour < 18;
      const isEvening = hour >= 18 || hour < 5;
      
      if (options.timeOfDayPreference === 'morning' && isMorning) {
        weights.timeOfDay = 1.0;
      } else if (options.timeOfDayPreference === 'afternoon' && isAfternoon) {
        weights.timeOfDay = 1.0;
      } else if (options.timeOfDayPreference === 'evening' && isEvening) {
        weights.timeOfDay = 1.0;
      }
    } else {
      weights.timeOfDay = 0.5; // Neutro se não houver preferência
    }
    
    // O peso para espaçamento uniforme será calculado após gerar todos os slots
    // O peso para slots consecutivos também será calculado depois
    
    slots.push({ startMinutes: minute, weights });
  }
  
  // Calcular pesos de espaçamento uniforme
  if (options.prioritizeEvenSpacing && slots.length > 0) {
    const totalWorkDuration = workEndMinutes - workStartMinutes;
    const idealSpacing = totalWorkDuration / (slots.length + 1);
    
    let lastSlotMinutes = workStartMinutes;
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const actualSpacing = slot.startMinutes - lastSlotMinutes;
      const nextSlotMinutes = (i < slots.length - 1) ? slots[i + 1].startMinutes : workEndMinutes;
      const nextSpacing = nextSlotMinutes - slot.startMinutes;
      
      // Calcular o quanto este slot contribui para um espaçamento uniforme
      // (quanto mais próximo do espaçamento ideal, melhor)
      const spacingDeviation = Math.abs(actualSpacing - idealSpacing) / idealSpacing;
      slot.weights.evenSpacing = 1 - Math.min(spacingDeviation, 1);
      
      lastSlotMinutes = slot.startMinutes;
    }
  }
  
  return slots;
}

/**
 * Calcula pesos finais para cada slot com base nas opções
 */
function calculateFinalWeights(
  slots: { startMinutes: number; weights: SlotWeight }[],
  options: AITimeSlotOptions
): { startMinutes: number; finalWeight: number }[] {
  const priorityFactor = options.priorityFactor || 0.5;
  
  return slots.map(slot => {
    // Base weight starts at 0.5 (neutral)
    let finalWeight = 0.5;
    
    // Factor in each weight component based on options
    if (options.prioritizeRoundHours) {
      finalWeight = finalWeight * (1 - priorityFactor) + slot.weights.roundHour * priorityFactor;
    }
    
    if (options.prioritizeEvenSpacing) {
      finalWeight = finalWeight * (1 - priorityFactor) + slot.weights.evenSpacing * priorityFactor;
    }
    
    if (options.timeOfDayPreference) {
      finalWeight = finalWeight * (1 - priorityFactor) + slot.weights.timeOfDay * priorityFactor;
    }
    
    return { startMinutes: slot.startMinutes, finalWeight };
  });
}

/**
 * Geração inteligente de slots de tempo usando múltiplos critérios
 */
export function generateIntelligentTimeSlots(
  schedule: ProviderSchedule,
  serviceDuration: number,
  options: AITimeSlotOptions = {}
): TimeSlot[] {
  // Preencher opções padrão
  const defaultedOptions: AITimeSlotOptions = {
    prioritizeRoundHours: options.prioritizeRoundHours ?? true,
    prioritizeEvenSpacing: options.prioritizeEvenSpacing ?? false,
    prioritizeConsecutiveSlots: options.prioritizeConsecutiveSlots ?? false,
    timeOfDayPreference: options.timeOfDayPreference ?? null,
    priorityFactor: options.priorityFactor ?? 0.5
  };
  
  // Convertemos os horários para minutos para facilitar o cálculo
  const workStartMinutes = timeToMinutes(schedule.workingHours.start);
  const workEndMinutes = timeToMinutes(schedule.workingHours.end);
  
  // Criamos uma lista de períodos bloqueados (almoço e agendamentos existentes)
  const blockedRanges: { start: number; end: number }[] = [];
  
  // Adiciona intervalo de almoço se existir
  if (schedule.lunchBreak) {
    blockedRanges.push({
      start: timeToMinutes(schedule.lunchBreak.start),
      end: timeToMinutes(schedule.lunchBreak.end)
    });
  }
  
  // Adiciona agendamentos existentes
  for (const appointment of schedule.appointments) {
    const appointmentStart = timeToMinutes(appointment.startTime);
    const appointmentEnd = appointmentStart + appointment.duration;
    
    blockedRanges.push({
      start: appointmentStart,
      end: appointmentEnd
    });
  }
  
  // Gerar todos os slots possíveis com pesos iniciais
  const possibleSlots = generatePossibleSlots(
    workStartMinutes,
    workEndMinutes,
    serviceDuration,
    defaultedOptions
  );
  
  // Filtrar slots que conflitam com períodos bloqueados
  const availableSlots = possibleSlots.filter(slot => 
    isSlotAvailable(slot.startMinutes, slot.startMinutes + serviceDuration, blockedRanges)
  );
  
  // Calcular pesos finais
  const weightedSlots = calculateFinalWeights(availableSlots, defaultedOptions);
  
  // Ordenar por peso (do maior para o menor)
  weightedSlots.sort((a, b) => b.finalWeight - a.finalWeight);
  
  // Converter para formato de saída
  return weightedSlots.map(slot => ({
    startTime: minutesToTime(slot.startMinutes),
    endTime: minutesToTime(slot.startMinutes + serviceDuration)
  }));
}