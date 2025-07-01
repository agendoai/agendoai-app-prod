/**
 * Função para calcular slots de tempo disponíveis na agenda do prestador
 * 
 * Esta função analisa o expediente do prestador, horário de almoço,
 * agendamentos existentes e retorna os horários disponíveis que comportam
 * a duração do serviço solicitado.
 */

export interface TimeRange {
  start: string;
  end: string;
}

export interface Appointment {
  startTime: string;
  duration: number; // em minutos
}

export interface ProviderSchedule {
  workingHours: TimeRange;
  lunchBreak?: TimeRange;
  appointments: Appointment[];
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

/**
 * Converte horário no formato "HH:MM" para minutos desde o início do dia
 * Inclui validação e tratamento de erro
 */
function timeToMinutes(time: string): number {
  if (!time) {
    console.error('timeToMinutes recebeu valor inválido:', time);
    return 0;
  }
  try {
    const [hours, minutes] = time.split(':').map(Number);
    if (isNaN(hours) || isNaN(minutes)) {
      console.error('timeToMinutes recebeu formato inválido:', time);
      return 0;
    }
    return hours * 60 + minutes;
  } catch (error) {
    console.error('Erro ao converter tempo para minutos:', time, error);
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
 * Calcula o horário de término com base no horário de início e duração
 */
function calculateEndTime(startTime: string, durationMinutes: number): string {
  const startMinutes = timeToMinutes(startTime);
  const endMinutes = startMinutes + durationMinutes;
  return minutesToTime(endMinutes);
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
 * Gera slots de tempo disponíveis com intervalos de 15 minutos
 * que podem acomodar a duração do serviço
 */
export function getAvailableTimeSlots(
  schedule: ProviderSchedule,
  serviceDuration: number,
  slotInterval: number = 15 // Intervalo padrão de 15 minutos entre os slots
): TimeSlot[] {
  const availableSlots: TimeSlot[] = [];
  
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
  
  // Gera slots de tempo a cada 'slotInterval' minutos
  for (let slotStart = workStartMinutes; slotStart <= workEndMinutes - serviceDuration; slotStart += slotInterval) {
    const slotEnd = slotStart + serviceDuration;
    
    // Verifica se o slot está totalmente dentro do horário de trabalho
    if (slotEnd <= workEndMinutes) {
      // Verifica se o slot não conflita com períodos bloqueados
      if (isSlotAvailable(slotStart, slotEnd, blockedRanges)) {
        availableSlots.push({
          startTime: minutesToTime(slotStart),
          endTime: minutesToTime(slotEnd)
        });
      }
    }
  }
  
  return availableSlots;
}

/**
 * Versão avançada da função que prioriza horários mais "amigáveis" ao usuário
 * Horários "redondos" como 9:00, 10:00 tem prioridade sobre 9:15, 9:30, 9:45
 * E estes têm prioridade sobre horários como 9:05, 9:10, etc.
 */
export function getAvailableTimeSlotsAdvanced(
  schedule: ProviderSchedule,
  serviceDuration: number
): TimeSlot[] {
  const result: TimeSlot[] = [];
  const workStartMinutes = timeToMinutes(schedule.workingHours.start);
  const workEndMinutes = timeToMinutes(schedule.workingHours.end);
  
  // Períodos bloqueados (almoço e agendamentos)
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
  
  // Lista de possíveis slots com suas prioridades
  const possibleSlots: { startMinutes: number; priority: number }[] = [];
  
  // 1. Adicionar horários "redondos" (hora exata) - prioridade alta
  for (let hour = Math.ceil(workStartMinutes / 60); hour <= Math.floor(workEndMinutes / 60); hour++) {
    possibleSlots.push({ startMinutes: hour * 60, priority: 1 });
  }
  
  // 2. Adicionar horários de meia hora - prioridade média
  for (let hour = Math.floor(workStartMinutes / 60); hour <= Math.floor(workEndMinutes / 60); hour++) {
    const halfHour = hour * 60 + 30;
    if (halfHour >= workStartMinutes && halfHour <= workEndMinutes - serviceDuration) {
      possibleSlots.push({ startMinutes: halfHour, priority: 2 });
    }
  }
  
  // 3. Adicionar horários de 15 minutos - prioridade baixa
  for (let hour = Math.floor(workStartMinutes / 60); hour <= Math.floor(workEndMinutes / 60); hour++) {
    const quarter1 = hour * 60 + 15;
    const quarter3 = hour * 60 + 45;
    
    if (quarter1 >= workStartMinutes && quarter1 <= workEndMinutes - serviceDuration) {
      possibleSlots.push({ startMinutes: quarter1, priority: 3 });
    }
    
    if (quarter3 >= workStartMinutes && quarter3 <= workEndMinutes - serviceDuration) {
      possibleSlots.push({ startMinutes: quarter3, priority: 3 });
    }
  }
  
  // 4. Adicionar horários de 5 em 5 minutos - prioridade mais baixa
  for (let minutes = workStartMinutes; minutes <= workEndMinutes - serviceDuration; minutes += 5) {
    // Só adiciona se não estiver já em alguma das categorias anteriores
    if (minutes % 15 !== 0) {
      possibleSlots.push({ startMinutes: minutes, priority: 4 });
    }
  }
  
  // Ordenar por prioridade (do menor para o maior valor)
  possibleSlots.sort((a, b) => a.priority - b.priority);
  
  // Verificar disponibilidade e adicionar ao resultado final
  for (const slot of possibleSlots) {
    const slotEnd = slot.startMinutes + serviceDuration;
    
    // Verifica se o slot não conflita com períodos bloqueados
    if (isSlotAvailable(slot.startMinutes, slotEnd, blockedRanges)) {
      result.push({
        startTime: minutesToTime(slot.startMinutes),
        endTime: minutesToTime(slotEnd)
      });
    }
  }
  
  return result;
}

/**
 * Exemplo de uso:
 * 
 * const schedule = {
 *   workingHours: { start: "08:00", end: "18:00" },
 *   lunchBreak: { start: "12:00", end: "13:00" },
 *   appointments: [
 *     { startTime: "09:00", duration: 60 },
 *     { startTime: "14:00", duration: 90 }
 *   ]
 * };
 * 
 * const serviceDuration = 45; // 45 minutos
 * 
 * const availableSlots = getAvailableTimeSlotsAdvanced(schedule, serviceDuration);
 * console.log(availableSlots);
 */