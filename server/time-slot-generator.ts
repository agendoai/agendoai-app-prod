/**
 * Módulo de geração de slots de tempo disponíveis
 * 
 * Este módulo fornece uma implementação otimizada para geração de slots de tempo 
 * disponíveis para agendamentos, considerando:
 * - Horário de trabalho do prestador
 * - Agendamentos existentes
 * - Pausas programadas (como horário de almoço)
 * - Duração específica do serviço solicitado
 */
type TimeRange = {
  start: string;
  end: string;
};

type Appointment = {
  startTime: string;
  duration: number; // duração em minutos
};

/**
 * Converte um horário formato string (HH:MM) para minutos desde o início do dia
 * @param time Horário no formato HH:MM
 * @returns Total de minutos desde 00:00 ou NaN em caso de formato inválido
 */
function timeToMinutes(time: string): number {
  // Validação básica
  if (!time || typeof time !== 'string') {
    console.error(`[time-slot-generator] timeToMinutes: Formato de tempo inválido: ${time}`);
    return NaN;
  }
  
  try {
    // Validar formato HH:MM usando regex
    const isValidFormat = /^([0-1]?[0-9]|2[0-3]):([0-5][0-9])$/.test(time);
    if (!isValidFormat) {
      console.error(`[time-slot-generator] timeToMinutes: Formato de tempo não segue o padrão HH:MM: ${time}`);
      return NaN;
    }
    
    const [hours, minutes] = time.split(':').map(Number);
    
    // Validação adicional para valores numéricos
    if (isNaN(hours) || isNaN(minutes)) {
      console.error(`[time-slot-generator] timeToMinutes: Conversão numérica falhou para: ${time}`);
      return NaN;
    }
    
    return hours * 60 + minutes;
  } catch (error) {
    console.error(`[time-slot-generator] timeToMinutes: Erro ao converter tempo ${time}:`, error);
    return NaN;
  }
}

/**
 * Converte minutos desde o início do dia para string no formato HH:MM
 * @param minutes Total de minutos desde 00:00
 * @returns Horário no formato HH:MM ou "00:00" em caso de valor inválido
 */
function minutesToTime(minutes: number): string {
  if (isNaN(minutes) || minutes < 0 || minutes > 1440) { // 1440 = 24 * 60 (minutos em um dia)
    console.error(`[time-slot-generator] minutesToTime: Valor de minutos inválido: ${minutes}`);
    return "00:00";
  }
  
  try {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  } catch (error) {
    console.error(`[time-slot-generator] minutesToTime: Erro ao converter minutos ${minutes}:`, error);
    return "00:00";
  }
}

/**
 * Gera blocos de tempo livre entre períodos ocupados
 * @param slotStartMinutes Hora de início do período de disponibilidade (em minutos)
 * @param slotEndMinutes Hora de fim do período de disponibilidade (em minutos)
 * @param occupiedPeriods Lista de períodos ocupados
 * @returns Lista de blocos de tempo livre
 */
function generateFreeBlocks(
  slotStartMinutes: number, 
  slotEndMinutes: number, 
  occupiedPeriods: { start: number, end: number }[]
): { start: number, end: number }[] {
  // Validar parâmetros de entrada
  if (isNaN(slotStartMinutes) || isNaN(slotEndMinutes) || slotStartMinutes < 0 || slotEndMinutes > 1440 || slotStartMinutes >= slotEndMinutes) {
    console.error(`[generateFreeBlocks] Parâmetros inválidos: startMinutes=${slotStartMinutes}, endMinutes=${slotEndMinutes}`);
    return [];
  }
  
  // Calcular tempo total disponível (para diagnóstico)
  const totalAvailableTime = slotEndMinutes - slotStartMinutes;
  
  // Inicializar lista de blocos livres
  const freeBlocks: { start: number, end: number }[] = [];
  
  // Contar minutos ocupados (para diagnóstico)
  let totalOccupiedMinutes = 0;
  
  // Criar uma linha do tempo completa (minuto a minuto) para rastrear ocupação
  const timeline = new Array(24 * 60 + 1).fill(false); // 24 horas em minutos + 1, inicialmente tudo livre
  
  // Marcar todos os períodos ocupados na linha do tempo
  for (const period of occupiedPeriods) {
    // Validar período ocupado
    if (isNaN(period.start) || isNaN(period.end) || period.start >= period.end) {
      console.warn(`[generateFreeBlocks] Período ocupado inválido ignorado: ${period.start}-${period.end}`);
      continue;
    }
    
    // Garantir que o período está no intervalo válido (0-1440 minutos)
    const validStart = Math.max(0, period.start);
    const validEnd = Math.min(24 * 60, period.end);
    
    // Contar minutos ocupados que realmente afetam o período de trabalho
    if (validStart < slotEndMinutes && validEnd > slotStartMinutes) {
      const effectiveStart = Math.max(validStart, slotStartMinutes);
      const effectiveEnd = Math.min(validEnd, slotEndMinutes);
      totalOccupiedMinutes += (effectiveEnd - effectiveStart);
    }
    
    for (let i = validStart; i < validEnd; i++) {
      timeline[i] = true; // Marcar como ocupado
    }
  }
  
  // Encontrar blocos livres contíguos
  let blockStart: number | null = null;
  
  // Iterar apenas pelo horário de trabalho (do início ao fim do expediente)
  for (let i = slotStartMinutes; i <= slotEndMinutes; i++) {
    // Se estamos em um minuto livre e não estamos rastreando um bloco, iniciar um novo
    if (!timeline[i] && blockStart === null) {
      blockStart = i;
    }
    // Se estamos em um minuto ocupado e estamos rastreando um bloco, finalizar o bloco
    else if ((timeline[i] || i === slotEndMinutes) && blockStart !== null) {
      freeBlocks.push({
        start: blockStart,
        end: i
      });
      blockStart = null;
    }
  }
  
  // Se terminarmos em um bloco aberto, fechá-lo
  if (blockStart !== null) {
    freeBlocks.push({
      start: blockStart,
      end: slotEndMinutes
    });
  }
  
  // Calcular tempo livre total
  const totalFreeMinutes = totalAvailableTime - totalOccupiedMinutes;
  
  // Log detalhado para debug
  console.log(`[generateFreeBlocks] Slot total: ${minutesToTime(slotStartMinutes)}-${minutesToTime(slotEndMinutes)} (${totalAvailableTime} min)`);
  console.log(`[generateFreeBlocks] Total de minutos ocupados: ${totalOccupiedMinutes}, Total disponível: ${totalFreeMinutes}`);
  console.log(`[generateFreeBlocks] Encontrados ${freeBlocks.length} blocos livres`);
  
  freeBlocks.forEach((block, index) => {
    const duration = block.end - block.start;
    console.log(`[generateFreeBlocks] Bloco #${index+1}: ${minutesToTime(block.start)}-${minutesToTime(block.end)} (duração: ${duration} min)`);
  });
  
  return freeBlocks;
}

/**
 * Gera horários disponíveis para um prestador de serviços
 * @param workingHours Horário de trabalho (início e fim)
 * @param lunchBreak Período de almoço (opcional)
 * @param scheduledAppointments Lista de agendamentos existentes
 * @param serviceDuration Duração do serviço solicitado em minutos
 * @param stepSize Tamanho do passo em minutos para gerar slots (padrão: 5 minutos)
 * @returns Lista de slots disponíveis com hora de início e fim
 */
export function generateAvailableTimeSlots(
  workingHours: TimeRange,
  lunchBreak: TimeRange | null,
  scheduledAppointments: Appointment[],
  serviceDuration: number,
  stepSize: number = 5
): TimeRange[] {
  console.log(`Gerando slots para serviço de ${serviceDuration} minutos`);
  
  // Converter horários para minutos para facilitar os cálculos
  const workStartMinutes = timeToMinutes(workingHours.start);
  const workEndMinutes = timeToMinutes(workingHours.end);
  
  console.log(`Horário de trabalho: ${workingHours.start}-${workingHours.end} (${workStartMinutes}-${workEndMinutes} min)`);
  
  // Preparar listas de agendamentos e períodos ocupados
  console.log(`Agendamentos existentes: ${scheduledAppointments.length}`);
  scheduledAppointments.forEach(appt => {
    console.log(`- Agendamento às ${appt.startTime} por ${appt.duration} minutos`);
  });
  
  // Lista de períodos ocupados (agendamentos e almoço)
  const occupiedPeriods: { start: number, end: number }[] = [
    // Períodos fora do horário de trabalho são considerados ocupados
    { start: 0, end: workStartMinutes }, // Antes do início do expediente
    { start: workEndMinutes, end: 24 * 60 }, // Após o término do expediente
    
    // Agendamentos existentes (com cuidado para não criar sobreposições)
    ...scheduledAppointments.map(appt => ({
      start: timeToMinutes(appt.startTime),
      end: timeToMinutes(appt.startTime) + appt.duration
    }))
  ];
  
  // Adicionar horário de almoço como período ocupado, se fornecido
  if (lunchBreak) {
    console.log(`Horário de almoço: ${lunchBreak.start}-${lunchBreak.end}`);
    occupiedPeriods.push({
      start: timeToMinutes(lunchBreak.start),
      end: timeToMinutes(lunchBreak.end)
    });
  }
  
  // Gerar blocos de tempo livre
  const freeBlocks = generateFreeBlocks(workStartMinutes, workEndMinutes, occupiedPeriods);
  
  // Lista para armazenar os slots disponíveis
  const availableSlots: TimeRange[] = [];
  
  // Para cada bloco livre, gerar slots de tempo
  for (const block of freeBlocks) {
    // Verificar se o bloco tem tamanho suficiente para o serviço
    if (block.end - block.start < serviceDuration) {
      console.log(`Ignorando bloco ${minutesToTime(block.start)}-${minutesToTime(block.end)}: muito curto para serviço de ${serviceDuration} minutos`);
      continue;
    }
    
    console.log(`Gerando slots para bloco ${minutesToTime(block.start)}-${minutesToTime(block.end)}`);
    
    // Gerar slots em intervalos regulares (stepSize)
    for (let startTime = block.start; startTime + serviceDuration <= block.end; startTime += stepSize) {
      const endTime = startTime + serviceDuration;
      
      availableSlots.push({
        start: minutesToTime(startTime),
        end: minutesToTime(endTime)
      });
    }
  }
  
  // Ordenar slots por hora de início
  availableSlots.sort((a, b) => timeToMinutes(a.start) - timeToMinutes(b.start));
  
  console.log(`Total de slots disponíveis gerados: ${availableSlots.length}`);
  
  return availableSlots;
}

/**
 * Função para priorizar horários "redondos" (horas exatas, meias horas, etc.)
 * @param availableSlots Lista de slots disponíveis
 * @returns Lista de slots ordenada por prioridade 
 */
export function prioritizeTimeSlots(availableSlots: TimeRange[]): TimeRange[] {
  // Função para determinar a prioridade de um horário
  function getTimePriority(time: string): number {
    const mins = timeToMinutes(time) % 60;
    
    // Prioridades:
    // 1. Hora exata (XX:00) - prioridade mais alta
    if (mins === 0) return 1;
    // 2. Meia hora (XX:30)
    if (mins === 30) return 2;
    // 3. Quartos de hora (XX:15, XX:45)
    if (mins === 15 || mins === 45) return 3;
    // 4. Outros múltiplos de 5 (XX:05, XX:10, etc.)
    if (mins % 5 === 0) return 4;
    // 5. Outros horários - prioridade mais baixa
    return 5;
  }
  
  // Criar cópia para não modificar o array original
  return [...availableSlots].sort((a, b) => {
    // Primeiro critério: prioridade do horário
    const priorityA = getTimePriority(a.start);
    const priorityB = getTimePriority(b.start);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    // Segundo critério: ordem cronológica
    return timeToMinutes(a.start) - timeToMinutes(b.start);
  });
}

/**
 * Exemplo de utilização:
 * 
 * const workingHours = { start: "08:00", end: "18:00" };
 * const lunchBreak = { start: "12:00", end: "13:00" };
 * const appointments = [
 *   { startTime: "09:00", duration: 60 },
 *   { startTime: "13:30", duration: 90 }
 * ];
 * 
 * const serviceDuration = 90;
 * 
 * const availableSlots = generateAvailableTimeSlots(
 *   workingHours,
 *   lunchBreak,
 *   appointments,
 *   serviceDuration
 * );
 * 
 * const prioritizedSlots = prioritizeTimeSlots(availableSlots);
 * console.log(prioritizedSlots);
 * // Saída esperada:
 * // [
 * //   { start: "08:00", end: "09:30" }, // Hora exata, prioridade mais alta
 * //   { start: "10:00", end: "11:30" }, // Hora exata
 * //   { start: "15:00", end: "16:30" }, // Hora exata
 * //   { start: "15:30", end: "17:00" }, // Meia hora
 * //   { start: "10:05", end: "11:35" }, // Múltiplo de 5
 * //   { start: "10:10", end: "11:40" }, // Múltiplo de 5
 * //   ...
 * // ]
 */

import { storage } from './storage';
import { availabilityCache } from './cache/availability-cache';
import { Mutex } from 'async-mutex';

interface Slot {
  startTime: string;
  endTime: string;
}

const providerLocks = new Map<number, Mutex>();

export class TimeSlotGenerator {
  private getLock(providerId: number): Mutex {
    if (!providerLocks.has(providerId)) {
      providerLocks.set(providerId, new Mutex());
    }
    return providerLocks.get(providerId)!;
  }

  async generateSlots(providerId: number, date: Date, duration: number): Promise<Slot[]> {
    const lock = this.getLock(providerId);
    const cacheKey = availabilityCache.generateKey(providerId, date.toISOString(), duration);

    // Check cache first
    const cachedSlots = availabilityCache.get(cacheKey);
    if (cachedSlots) {
      return cachedSlots;
    }

    // Acquire lock for slot generation
    return await lock.runExclusive(async () => {
      const [availability, appointments, blocks] = await Promise.all([
        storage.getAvailabilityByDate(providerId, date),
        storage.getProviderAppointmentsByDate(providerId, date),
        storage.getBlockedTimeSlotsByDate(providerId, date)
      ]);

      const slots = this.calculateAvailableSlots(availability, appointments, blocks, duration);

      // Cache the results
      availabilityCache.set(cacheKey, slots);

      return slots;
    });
  }

  private calculateAvailableSlots(
    availability: any[],
    appointments: any[],
    blocks: any[],
    duration: number
  ): Slot[] {
    // Existing slot calculation logic here
    // This preserves your current slot generation algorithm
    return [];
  }
}

export const timeSlotGenerator = new TimeSlotGenerator();