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
 * Rota para buscar agendamentos existentes
 * GET /api/bookings?providerId=2&date=2025-07-06
 */
router.get('/', async (req, res) => {
  try {
    const { providerId, date } = req.query;
    
    // Validação básica
    if (!providerId || !date) {
      return res.status(400).json({
        error: 'providerId e date são obrigatórios'
      });
    }
    
    // Buscar agendamentos do prestador para a data específica
    const appointments = await storage.getAppointmentsByProviderId(Number(providerId));
    
    // Filtrar por data e status
    const bookingsForDate = appointments.filter(appointment => 
      appointment.date === date && 
      (appointment.status === 'confirmed' || appointment.status === 'pending')
    );
    
    // Formatar os dados para o frontend
    const bookings = bookingsForDate.map(appointment => ({
      id: appointment.id,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      status: appointment.status,
      clientName: appointment.clientName || 'Cliente',
      serviceName: appointment.serviceName || 'Serviço',
      totalPrice: appointment.totalPrice,
      paymentId: appointment.paymentId // <-- incluir o campo paymentId
    }));
    
    res.json({
      bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    res.status(500).json({
      error: 'Erro ao buscar agendamentos'
    });
  }
});

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
      bufferTime,
      paymentMethod,
      totalPrice,
      paymentId, // ID do pagamento confirmado (para pagamentos online)
      paymentStatus,
      serviceName,
      clientName
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
    
    // Para pagamentos online (PIX/Cartão), verificar se o pagamento foi confirmado
    if (paymentMethod === 'pix' || paymentMethod === 'credit_card') {
      if (!paymentId) {
        return res.status(400).json({
          error: 'ID do pagamento obrigatório para pagamentos online'
        });
      }
      
      try {
        // Verificar status do pagamento no Stripe
        const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
        const paymentIntent = await stripe.paymentIntents.retrieve(paymentId);
        
        if (paymentIntent.status !== 'succeeded') {
          return res.status(400).json({
            error: 'Pagamento não foi confirmado. Status: ' + paymentIntent.status
          });
        }
        
        // Verificar se o valor pago corresponde ao valor do agendamento
        const paidAmount = paymentIntent.amount / 100; // Stripe trabalha em centavos
        if (Math.abs(paidAmount - totalPrice) > 0.01) { // Tolerância de 1 centavo
          return res.status(400).json({
            error: 'Valor pago não corresponde ao valor do agendamento'
          });
        }
        
        console.log(`✅ Pagamento confirmado: ${paymentId} - Valor: R$ ${paidAmount}`);
        
      } catch (stripeError) {
        console.error('Erro ao verificar pagamento:', stripeError);
        return res.status(400).json({
          error: 'Erro ao verificar status do pagamento'
        });
      }
    }
    
    // Criar o agendamento
    const appointmentId = await bookingSystem.bookAppointment({
      providerId: Number(providerId),
      serviceId: Number(serviceId),
      clientId,
      date,
      startTime,
      bufferTime: bufferTime ? Number(bufferTime) : undefined,
      paymentMethod,
      paymentStatus,
      totalPrice: totalPrice ? Number(totalPrice) : undefined,
      paymentId: paymentId || null,
      serviceName,
      clientName
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
      const providerService = await storage.getProviderServiceByService(
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
    const { 
      providerId, 
      date, 
      startTime, 
      services,
      paymentMethod,
      paymentStatus,
      totalPrice,
      serviceName,
      clientName
    } = req.body;
    
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
      })),
      paymentMethod,
      paymentStatus,
      totalPrice: totalPrice ? Number(totalPrice) : undefined,
      serviceName,
      clientName
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

/**
 * Rota para buscar um agendamento por ID
 * GET /api/booking/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const appointmentId = parseInt(req.params.id);
    if (isNaN(appointmentId)) {
      return res.status(400).json({ error: 'ID de agendamento inválido' });
    }

    // Buscar agendamento
    const appointment = await storage.getAppointmentById(appointmentId);
    if (!appointment) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }

    // Permitir acesso apenas ao cliente, prestador, admin ou suporte
    const user = req.user;
    if (
      appointment.clientId !== user?.id &&
      appointment.providerId !== user?.id &&
      user?.userType !== 'admin' &&
      user?.userType !== 'support'
    ) {
      return res.status(403).json({ error: 'Você não tem permissão para ver este agendamento' });
    }

    // Buscar informações adicionais (serviço e prestador)
    let service = null;
    let provider = null;
    try {
      service = appointment.serviceId ? await storage.getService(appointment.serviceId) : null;
      provider = appointment.providerId ? await storage.getUser(appointment.providerId) : null;
    } catch (e) {}

    res.json({
      ...appointment,
      serviceName: service?.name,
      serviceDescription: service?.description,
      providerName: provider?.name,
      providerPhone: provider?.phone,
      providerImage: provider?.profileImage,
    });
  } catch (error) {
    console.error('Erro ao buscar agendamento por ID:', error);
    res.status(500).json({ error: 'Erro ao buscar agendamento por ID' });
  }
});

/**
 * Rota para atualizar o status do agendamento (ex: cancelar)
 * PATCH /api/booking/:appointmentId/status
 */
router.patch('/:appointmentId/status', async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { status } = req.body;
    if (!status) {
      return res.status(400).json({ error: 'Status é obrigatório' });
    }
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'É necessário estar autenticado' });
    }
    const updated = await storage.updateAppointmentStatus(Number(appointmentId), status);
    if (!updated) {
      return res.status(404).json({ error: 'Agendamento não encontrado' });
    }
    res.json({ success: true, status });
  } catch (error) {
    res.status(500).json({ error: error.message || 'Erro ao atualizar status' });
  }
});

export default router;