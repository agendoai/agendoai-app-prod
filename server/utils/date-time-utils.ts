/**
 * Utilitários para manipulação de datas e horas com suporte a fusos horários
 * 
 * Este módulo fornece funções para:
 * - Converter entre representações de tempo (string vs minutos)
 * - Verificar sobreposições de intervalos de tempo
 * - Manipular datas e horas com fusos horários corretos
 */

import { DateTime } from 'luxon';

/**
 * Converte uma string de hora (HH:MM) para minutos desde meia-noite
 */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

/**
 * Converte minutos desde meia-noite para string de hora (HH:MM)
 */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Verifica se dois intervalos de tempo se sobrepõem
 */
export function doTimeSlotsOverlap(
  slot1Start: string,
  slot1End: string,
  slot2Start: string,
  slot2End: string
): boolean {
  const start1 = timeToMinutes(slot1Start);
  const end1 = timeToMinutes(slot1End);
  const start2 = timeToMinutes(slot2Start);
  const end2 = timeToMinutes(slot2End);
  
  return Math.max(start1, start2) < Math.min(end1, end2);
}

/**
 * Converte uma data para o fuso horário específico do prestador
 * Se não há fuso especificado, usa o padrão 'America/Sao_Paulo'
 */
export function convertToProviderTimezone(
  date: Date | string,
  providerTimezone: string = 'America/Sao_Paulo'
): DateTime {
  if (typeof date === 'string') {
    // Tenta primeiro no formato ISO
    try {
      return DateTime.fromISO(date, { zone: providerTimezone });
    } catch (e) {
      // Se falhar, tenta no formato YYYY-MM-DD
      return DateTime.fromFormat(date, 'yyyy-MM-dd', { zone: providerTimezone });
    }
  }
  
  return DateTime.fromJSDate(date, { zone: providerTimezone });
}

/**
 * Obtém o dia da semana de uma data (0 = domingo, 6 = sábado)
 */
export function getDayOfWeek(date: Date | string, timezone: string = 'America/Sao_Paulo'): number {
  const dt = (typeof date === 'string') 
    ? DateTime.fromISO(date, { zone: timezone })
    : DateTime.fromJSDate(date, { zone: timezone });
  
  return dt.weekday % 7; // Luxon usa 1-7 (seg-dom), convertemos para 0-6 (dom-sáb)
}

/**
 * Formata a data para exibição conforme fuso horário
 */
export function formatDateForDisplay(
  date: Date | string,
  format: string = 'dd/MM/yyyy',
  timezone: string = 'America/Sao_Paulo'
): string {
  const dt = (typeof date === 'string')
    ? DateTime.fromISO(date, { zone: timezone })
    : DateTime.fromJSDate(date, { zone: timezone });
  
  return dt.toFormat(format);
}

/**
 * Gera uma lista de slots de tempo para um período
 */
export function generateTimeSlots(
  startTime: string,
  endTime: string,
  duration: number,
  interval: number = 30
): { startTime: string, endTime: string }[] {
  const result: { startTime: string, endTime: string }[] = [];
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  
  for (let time = start; time + duration <= end; time += interval) {
    result.push({
      startTime: minutesToTime(time),
      endTime: minutesToTime(time + duration)
    });
  }
  
  return result;
}