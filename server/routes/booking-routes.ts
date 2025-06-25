/**
 * Rotas para o Sistema de Agendamento Inteligente
 * 
 * Implementa os endpoints necessários para o funcionamento
 * do sistema de agendamento com todas as regras de negócio.
 */

import { Router } from 'express';
import { bookingSystem } from '../intelligent-booking-system';
import { timeToMinutes, minutesToTime } from '../advanced-slot-generator';
import { storage } from '../storage';

const router = Router();

/**
 * Rota para agendar um serviço
 * POST /api/booking
 */
router.post('/', async (req, res) => {
  try {
    const {
      providerId,
      serviceId,
      date,
      startTime,
      bufferTime
    } = req.body;
    
    // Validação básica
    if (!providerId || !serviceId || !date || !startTime) {
      return res.status(400).json({
        error: 'Dados incompletos para agendamento'
      });
    }
    
    // Validar autenticação
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        error: 'É necessário estar autenticado para agendar'
      });
    }
    
    const clientId = req.user.id;
    
    // Criar o agendamento
    const appointmentId = await bookingSystem.bookAppointment({
      providerId: Number(providerId),
      serviceId: Number(serviceId),
      clientId,
      date,
      startTime,
      bufferTime: bufferTime ? Number(bufferTime) : undefined
    });
    
    res.status(201).json({
      success: true,
      appointmentId,
      message: 'Agendamento realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao processar agendamento:', error);
    res.status(400).json({
      error: error.message || 'Erro ao processar agendamento'
    });
  }
});

/**
 * Rota para verificar disponibilidade de horário
 * GET /api/booking/check-availability
 */
router.get('/check-availability', async (req, res) => {
  try {
    const { providerId, date, startTime, endTime, serviceId } = req.query;
    
    // Validação básica
    if (!providerId || !date || !startTime) {
      return res.status(400).json({
        error: 'Dados incompletos para verificação'
      });
    }
    
    // Se temos serviceId mas não temos endTime, calculamos baseado na duração do serviço
    let calculatedEndTime = endTime as string;
    
    if (serviceId && !endTime) {
      // Função para calcular o endTime com base no serviceId e providerId
      // Esta é uma implementação simplificada
      const service = await storage.getService(Number(serviceId));
      
      // Verificar se existe um tempo de execução personalizado
      const providerService = await storage.getProviderService(
        Number(providerId), 
        Number(serviceId)
      );
      
      // Usar duração personalizada ou padrão
      const serviceDuration = providerService?.executionTime || service.duration;
      
      const startTimeMinutes = timeToMinutes(startTime as string);
      const endTimeMinutes = startTimeMinutes + serviceDuration;
      calculatedEndTime = minutesToTime(endTimeMinutes);
    }
    
    if (!calculatedEndTime) {
      return res.status(400).json({
        error: 'É necessário fornecer endTime ou serviceId'
      });
    }
    
    // Verificar disponibilidade
    const isAvailable = await bookingSystem.checkSlotAvailability({
      providerId: Number(providerId),
      date: date as string,
      startTime: startTime as string,
      endTime: calculatedEndTime
    });
    
    res.json({ isAvailable });
  } catch (error) {
    console.error('Erro ao verificar disponibilidade:', error);
    res.status(500).json({
      error: error.message || 'Erro ao verificar disponibilidade'
    });
  }
});

/**
 * Rota para reagendar um compromisso
 * PUT /api/booking/:appointmentId/reschedule
 */
router.put('/:appointmentId/reschedule', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { date, startTime } = req.body;
    
    // Validação básica
    if (!date || !startTime) {
      return res.status(400).json({
        error: 'Nova data e horário são obrigatórios'
      });
    }
    
    // Validar autenticação
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        error: 'É necessário estar autenticado para reagendar'
      });
    }
    
    // Reagendar
    const success = await bookingSystem.rescheduleAppointment(
      Number(appointmentId),
      date,
      startTime
    );
    
    res.json({
      success,
      message: 'Agendamento remarcado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao reagendar:', error);
    res.status(400).json({
      error: error.message || 'Erro ao reagendar'
    });
  }
});

/**
 * Rota para agendar serviços consecutivos
 * POST /api/booking/consecutive
 */
router.post('/consecutive', async (req, res) => {
  try {
    const { providerId, date, startTime, services } = req.body;
    
    // Validação básica
    if (!providerId || !date || !startTime || !services || !services.length) {
      return res.status(400).json({
        error: 'Dados incompletos para agendamento consecutivo'
      });
    }
    
    // Validar autenticação
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        error: 'É necessário estar autenticado para agendar'
      });
    }
    
    const clientId = req.user.id;
    
    // Criar agendamentos consecutivos
    const appointmentIds = await bookingSystem.bookConsecutiveServices({
      providerId: Number(providerId),
      clientId,
      date,
      startTime,
      services: services.map(s => ({
        serviceId: Number(s.serviceId),
        duration: s.duration ? Number(s.duration) : undefined
      }))
    });
    
    res.status(201).json({
      success: true,
      appointmentIds,
      message: 'Agendamentos consecutivos realizados com sucesso'
    });
  } catch (error) {
    console.error('Erro ao processar agendamentos consecutivos:', error);
    res.status(400).json({
      error: error.message || 'Erro ao processar agendamentos consecutivos'
    });
  }
});

/**
 * Rota para agendar com qualquer prestador disponível
 * POST /api/booking/generic-provider
 */
router.post('/generic-provider', async (req, res) => {
  try {
    const { serviceId, date, startTime, providerIds } = req.body;
    
    // Validação básica
    if (!serviceId || !date || !startTime || !providerIds || !providerIds.length) {
      return res.status(400).json({
        error: 'Dados incompletos para agendamento com prestador genérico'
      });
    }
    
    // Validar autenticação
    if (!req.isAuthenticated()) {
      return res.status(401).json({
        error: 'É necessário estar autenticado para agendar'
      });
    }
    
    const clientId = req.user.id;
    
    // Criar agendamento com prestador genérico
    const result = await bookingSystem.bookWithGenericProvider({
      serviceId: Number(serviceId),
      clientId,
      date,
      startTime,
      providerIds: providerIds.map(id => Number(id))
    });
    
    res.status(201).json({
      success: true,
      appointmentId: result.appointmentId,
      providerId: result.providerId,
      message: 'Agendamento realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao processar agendamento com prestador genérico:', error);
    res.status(400).json({
      error: error.message || 'Erro ao processar agendamento com prestador genérico'
    });
  }
});

export default router;