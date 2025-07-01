/**
 * Rotas para verificação de disponibilidade
 *
 * Este módulo implementa rotas para verificar disponibilidade em datas específicas
 * e suporta filtros por timezone
 */
import { Router } from 'express';
import { storage } from '../storage';
import { parseISO, format } from 'date-fns';

export const checkAvailabilityRouter = Router();

/**
 * Verifica se uma data específica está disponível para um prestador
 * GET /api/availability/:providerId/check-date
 * 
 * Query params:
 * - date: Data no formato YYYY-MM-DD
 * - timezone: Fuso horário (opcional, padrão: America/Sao_Paulo)
 */
checkAvailabilityRouter.get('/:providerId/check-date', async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    const dateString = req.query.date as string;
    const timezone = req.query.timezone as string || 'America/Sao_Paulo';
    
    if (!dateString) {
      return res.status(400).json({ error: 'Data não fornecida' });
    }
    
    // Garantir que a data está no formato correto (YYYY-MM-DD)
    const normalizedDateString = dateString.substring(0, 10);
    
    // Converter para objeto Date
    const date = parseISO(normalizedDateString);
    if (isNaN(date.getTime())) {
      return res.status(400).json({ error: 'Formato de data inválido: ' + normalizedDateString });
    }
    
    // Obter o dia da semana (0 = domingo, 6 = sábado)
    const dayOfWeek = date.getDay();
    const formattedDate = format(date, 'yyyy-MM-dd');
    
    // Verificar disponibilidade para o dia específico
    const specificAvailability = await storage.getAvailabilityByDate(
      providerId,
      formattedDate
    );
    
    // Verificar disponibilidade recorrente para o dia da semana
    const weekdayAvailability = await storage.getAvailabilityByDay(
      providerId,
      dayOfWeek
    );
    
    // Verificar se há bloqueios para a data
    const blockedSlots = await storage.getBlockedTimeSlotsByDate(
      providerId,
      formattedDate
    );
    
    // Verificar agendamentos na data
    const appointments = await storage.getAppointmentsByProviderId(providerId);
    
    // Filtrar agendamentos para a data específica (formato da data no startTime: "2023-09-05T09:00:00.000Z")
    const appointmentsForDate = appointments.filter((appt: any) => {
      try {
        if (!appt.startTime) return false;
        const apptDate = new Date(appt.startTime);
        if (isNaN(apptDate.getTime())) return false;
        return format(apptDate, 'yyyy-MM-dd') === formattedDate;
      } catch (error) {
        console.error("Erro ao processar data do agendamento:", error);
        return false;
      }
    });
    
    // A data está disponível se tiver configuração específica ou recorrente e não estiver totalmente bloqueada
    const hasSpecificAvailability = specificAvailability.length > 0 && 
                                  specificAvailability.some((a: any) => a.isAvailable);
    
    const hasWeekdayAvailability = weekdayAvailability.length > 0 && 
                                  weekdayAvailability.some((a: any) => a.isAvailable);
    
    // Verificar se todos os horários estão bloqueados - considerar um dia bloqueado apenas se 
    // houver bloqueios cobrindo todo o horário de atendimento
    const isFullyBooked = false; // Simplificado para implementação inicial
    
    // Verificar se o dia tem agendamentos (marca o dia com status de "agendamentos")
    const hasAppointments = appointmentsForDate.length > 0;
    
    // Disponível se tiver configuração de disponibilidade e não estiver totalmente bloqueado
    const isAvailable = (hasSpecificAvailability || hasWeekdayAvailability) && !isFullyBooked;
    
    return res.json({
      date: formattedDate,
      providerId,
      isAvailable,
      hasAppointments,
      hasSpecificAvailability,
      hasWeekdayAvailability,
      isFullyBooked
    });
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);
    return res.status(500).json({ error: 'Erro ao verificar disponibilidade' });
  }
});