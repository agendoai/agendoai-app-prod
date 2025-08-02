import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(timeString: string): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
}

export function addMinutesToTime(timeString: string, minutesToAdd: number): string {
  const [hours, minutes] = timeString.split(':').map(Number);
  const totalMinutes = hours * 60 + minutes + minutesToAdd;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMinutes = totalMinutes % 60;
  return `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}`;
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  return addMinutesToTime(startTime, durationMinutes);
}

export function isTimeAfter(time1: string, time2: string): boolean {
  const [h1, m1] = time1.split(':').map(Number);
  const [h2, m2] = time2.split(':').map(Number);
  return h1 > h2 || (h1 === h2 && m1 > m2);
}

export function isTimeBetween(time: string, start: string, end: string): boolean {
  return !isTimeAfter(time, end) && !isTimeAfter(start, time);
}

// Função para formatação de status
export function formatStatus(status: string): string {
  const statusMap: Record<string, string> = {
    'pending': 'Pendente',
    'confirmed': 'Confirmado',
    'executing': 'Executando',
    'canceled': 'Cancelado',
    'completed': 'Concluído',
    'no_show': 'Não Compareceu',
    'processing_payment': 'Processando Pagamento'
  };
  
  return statusMap[status] || status;
}

// Função para obter propriedades de badge com base no status
export function getStatusBadgeProps(status: string): { bg: string, text: string } {
  const statusMap: Record<string, { bg: string, text: string }> = {
    'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800' },
    'confirmed': { bg: 'bg-green-100', text: 'text-green-800' },
    'executing': { bg: 'bg-purple-100', text: 'text-purple-800' },
    'canceled': { bg: 'bg-red-100', text: 'text-red-800' },
    'completed': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'no_show': { bg: 'bg-gray-100', text: 'text-gray-800' },
    'processing_payment': { bg: 'bg-purple-100', text: 'text-purple-800' }
  };
  
  return statusMap[status] || { bg: 'bg-gray-100', text: 'text-gray-800' };
}

// Função para formatação de valores monetários
export function formatCurrency(value: number | null): string {
  if (value === null) return 'R$ 0,00';
  // O valor está em centavos, dividir por 100 para converter para reais
  return new Intl.NumberFormat('pt-BR', { 
    style: 'currency', 
    currency: 'BRL' 
  }).format(value / 100);
}

// Alias para formatCurrency para manter compatibilidade com outros componentes
export const formatPrice = formatCurrency;

// Função para formatar data no padrão brasileiro
export function formatDateToBR(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

// Função para gerar slots de tempo entre dois horários
export function calculateDuration(startTime: string, endTime: string): number {
  try {
    const today = new Date().toISOString().split('T')[0];
    const startDate = new Date(`${today}T${startTime}`);
    const endDate = new Date(`${today}T${endTime}`);
    
    const diffMs = endDate.getTime() - startDate.getTime();
    const diffMinutes = Math.round(diffMs / 60000);
    
    return Math.max(diffMinutes, 0);
  } catch (error) {
    console.error("Error calculating duration:", error);
    return 45; // Default 45 minutes if calculation fails
  }
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number
): string[] {
  const slots: string[] = [];
  let current = startTime;
  
  while (isTimeAfter(endTime, current) || endTime === current) {
    slots.push(current);
    current = addMinutesToTime(current, intervalMinutes);
  }
  
  return slots;
}

// Tipos comuns para componentes de slots de tempo
export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  availabilityId?: number;
  score?: number;
  reason?: string;
  formattedSlot?: string;
}

export interface Service {
  id: number;
  name: string;
  durationMinutes: number;
  bufferTime?: number; // Tempo de buffer entre agendamentos
}

export interface ProviderSchedule {
  startTime: string;
  endTime: string;
  workingDays: number[]; // [0-6] onde 0 é Domingo
  blockedSlots?: { date: string; startTime: string; endTime: string }[];
  timeSlotInterval: number;
  scheduleType?: 'weekly' | 'monthly'; // Adicionando tipo de agenda
}

// Função para verificar se um slot está dentro do horário de trabalho
export function isWithinWorkingHours(
  slot: TimeSlot, 
  schedule: ProviderSchedule, 
  serviceDuration: number
): boolean {
  const slotEnd = addMinutesToTime(slot.startTime, serviceDuration);
  return slot.startTime >= schedule.startTime && slotEnd <= schedule.endTime;
}

// Função para verificar se um slot não está bloqueado
export function isNotBlocked(
  slot: TimeSlot,
  blockedSlots: ProviderSchedule['blockedSlots'] = [],
  date: string,
  serviceDuration: number
): boolean {
  const slotEnd = addMinutesToTime(slot.startTime, serviceDuration);
  
  return !blockedSlots.some(blocked => {
    return (
      blocked.date === date &&
      ((slot.startTime >= blocked.startTime && slot.startTime < blocked.endTime) ||
      (slotEnd > blocked.startTime && slotEnd <= blocked.endTime) ||
      (slot.startTime <= blocked.startTime && slotEnd >= blocked.endTime))
    );
  });
}

// Função para verificar se um slot não tem sobreposição com agendamentos existentes
export function hasNoOverlap(
  slot: TimeSlot,
  existingSlots: TimeSlot[],
  serviceDuration: number
): boolean {
  const slotEnd = addMinutesToTime(slot.startTime, serviceDuration);
  
  return !existingSlots.some(existing => {
    const existingEnd = existing.endTime || addMinutesToTime(existing.startTime, serviceDuration);
    return (
      (slot.startTime >= existing.startTime && slot.startTime < existingEnd) ||
      (slotEnd > existing.startTime && slotEnd <= existingEnd) ||
      (slot.startTime <= existing.startTime && slotEnd >= existingEnd)
    );
  });
}