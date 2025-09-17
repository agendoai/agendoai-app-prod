/**
 * Rotas para validação de códigos de agendamento
 * 
 * Implementa o sistema de validação por código único para conclusão de serviços.
 * O prestador deve fornecer o código recebido pelo cliente para marcar o agendamento como concluído.
 */

import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { isAuthenticated, isProvider } from '../middleware/jwt-auth';
import { verifyValidationCode } from '../utils/validation-code-utils';
import { 
  notifyClientAboutBlockedValidation, 
  notifyClientAboutCompletedService 
} from '../services/validation-notification-service';
import { z } from 'zod';

const router = Router();

// Schema para validação da requisição de confirmação
const confirmAppointmentSchema = z.object({
  validationCode: z.string().length(6, 'Código deve ter exatamente 6 dígitos').regex(/^\d{6}$/, 'Código deve conter apenas números')
});

/**
 * Endpoint para validar código de agendamento (alias para /confirm)
 * POST /api/appointments/:id/validate
 * 
 * Este endpoint é um alias para manter compatibilidade com o frontend
 */
router.post('/:id/validate', isAuthenticated, isProvider, async (req: Request, res: Response) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const providerId = req.user?.id;
    
    // Validar dados de entrada
    const validation = confirmAppointmentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Código inválido',
        details: validation.error.errors.map(e => e.message)
      });
    }
    
    const { validationCode } = validation.data;
    
    // Buscar agendamento
    const appointment = await storage.getAppointmentById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        error: 'Agendamento não encontrado'
      });
    }
    
    // Verificar se o prestador é o responsável pelo agendamento
    if (appointment.providerId !== providerId) {
      return res.status(403).json({
        error: 'Você não tem permissão para confirmar este agendamento'
      });
    }
    
    // Verificar se o agendamento já foi concluído
    if (appointment.status === 'completed') {
      return res.status(400).json({
        error: 'Este agendamento já foi concluído'
      });
    }
    
    // Verificar se o agendamento foi cancelado
    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        error: 'Este agendamento foi cancelado e não pode ser concluído'
      });
    }
    
    // Verificar se há código de validação configurado
    if (!appointment.validationCodeHash) {
      return res.status(400).json({
        error: 'Este agendamento não possui código de validação configurado'
      });
    }
    
    // Verificar se o agendamento não está bloqueado por tentativas excessivas
    const maxAttempts = 3;
    const currentAttempts = appointment.validationAttempts || 0;
    
    if (currentAttempts >= maxAttempts) {
      return res.status(400).json({
        error: 'Muitas tentativas incorretas. Este agendamento foi bloqueado para validação.'
      });
    }
    
    // Verificar o código de validação
    const isValidCode = await verifyValidationCode(validationCode, appointment.validationCodeHash);
    
    if (!isValidCode) {
      // Incrementar tentativas
      const newAttempts = currentAttempts + 1;
      await storage.updateAppointment(appointmentId, {
        validationAttempts: newAttempts
      });
      
      // Se atingiu o máximo de tentativas, bloquear e notificar
      if (newAttempts >= maxAttempts) {
        await notifyClientAboutBlockedValidation({
          clientId: appointment.clientId,
          appointmentId,
          serviceName: appointment.serviceName || 'Serviço',
          providerName: appointment.providerName || 'Prestador'
        });
        
        return res.status(400).json({
          error: 'Código incorreto. Máximo de tentativas atingido. Agendamento bloqueado.'
        });
      }
      
      const remainingAttempts = maxAttempts - newAttempts;
      return res.status(400).json({
        error: `Código de validação incorreto. Tentativas restantes: ${remainingAttempts}`
      });
    }
    
    // Código válido - marcar agendamento como concluído
    const updatedAppointment = await storage.updateAppointment(appointmentId, {
      status: 'completed',
      completedAt: new Date().toISOString()
    });
    
    // Notificar cliente sobre conclusão do serviço
    await notifyClientAboutCompletedService({
      clientId: appointment.clientId,
      appointmentId,
      serviceName: appointment.serviceName || 'Serviço',
      providerName: appointment.providerName || 'Prestador'
    });
    
    return res.status(200).json({
      success: true,
      message: 'Agendamento concluído com sucesso!',
      appointment: {
        id: updatedAppointment.id,
        status: updatedAppointment.status,
        serviceName: updatedAppointment.serviceName,
        clientName: updatedAppointment.clientName,
        date: updatedAppointment.date,
        startTime: updatedAppointment.startTime,
        endTime: updatedAppointment.endTime,
        totalPrice: updatedAppointment.totalPrice
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao validar agendamento:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor ao validar agendamento'
    });
  }
});

/**
 * Endpoint para prestador confirmar conclusão do agendamento
 * POST /api/appointments/:id/confirm
 * 
 * FLUXO DE SEGURANÇA:
 * 1. Apenas prestadores autenticados podem acessar
 * 2. Prestador deve ser o responsável pelo agendamento
 * 3. Código fornecido pelo cliente é validado contra o hash
 * 4. Máximo de 3 tentativas por agendamento
 * 5. Após 3 tentativas incorretas, agendamento é bloqueado
 */
router.post('/:id/confirm', isAuthenticated, isProvider, async (req: Request, res: Response) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const providerId = req.user?.id;
    
    // Validar dados de entrada
    const validation = confirmAppointmentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({
        error: 'Código inválido',
        details: validation.error.errors.map(e => e.message)
      });
    }
    
    const { validationCode } = validation.data;
    
    // Buscar agendamento
    const appointment = await storage.getAppointmentById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        error: 'Agendamento não encontrado'
      });
    }
    
    // Verificar se o prestador é o responsável pelo agendamento
    if (appointment.providerId !== providerId) {
      return res.status(403).json({
        error: 'Você não tem permissão para confirmar este agendamento'
      });
    }
    
    // Verificar se o agendamento já foi concluído
    if (appointment.status === 'completed') {
      return res.status(400).json({
        error: 'Este agendamento já foi concluído'
      });
    }
    
    // Verificar se o agendamento foi cancelado
    if (appointment.status === 'cancelled') {
      return res.status(400).json({
        error: 'Este agendamento foi cancelado e não pode ser concluído'
      });
    }
    
    // Verificar se há código de validação configurado
    if (!appointment.validationCodeHash) {
      return res.status(400).json({
        error: 'Este agendamento não possui código de validação configurado'
      });
    }
    
    // Verificar se o agendamento está bloqueado por muitas tentativas
    const maxAttempts = 3;
    if (appointment.validationAttempts >= maxAttempts) {
      console.log(`🚫 Agendamento ${appointmentId} bloqueado por excesso de tentativas`);
      
      // Notificar cliente sobre o bloqueio
      await notifyClientAboutBlockedValidation({
        clientId: appointment.clientId,
        clientName: appointment.clientName || 'Cliente',
        appointmentId,
        serviceName: appointment.serviceName || 'Serviço'
      });
      
      return res.status(423).json({
        error: `Agendamento bloqueado após ${maxAttempts} tentativas incorretas. Entre em contato com o suporte.`,
        blocked: true,
        attempts: appointment.validationAttempts
      });
    }
    
    // Validar o código fornecido
    console.log(`🔐 Validando código para agendamento ${appointmentId}...`);
    const isValidCode = await verifyValidationCode(validationCode, appointment.validationCodeHash);
    
    if (!isValidCode) {
      // Incrementar contador de tentativas
      const newAttempts = appointment.validationAttempts + 1;
      await storage.updateAppointmentValidationAttempts(appointmentId, newAttempts);
      
      console.log(`❌ Código inválido para agendamento ${appointmentId}. Tentativa ${newAttempts}/${maxAttempts}`);
      
      // Se atingiu o limite, bloquear
      if (newAttempts >= maxAttempts) {
        console.log(`🚫 Agendamento ${appointmentId} bloqueado após ${maxAttempts} tentativas`);
        
        // Notificar cliente sobre o bloqueio
        await notifyClientAboutBlockedValidation({
          clientId: appointment.clientId,
          clientName: appointment.clientName || 'Cliente',
          appointmentId,
          serviceName: appointment.serviceName || 'Serviço'
        });
        
        return res.status(423).json({
          error: `Código incorreto. Agendamento bloqueado após ${maxAttempts} tentativas. Entre em contato com o suporte.`,
          blocked: true,
          attempts: newAttempts
        });
      }
      
      return res.status(400).json({
        error: 'Código de validação incorreto',
        attempts: newAttempts,
        remainingAttempts: maxAttempts - newAttempts
      });
    }
    
    // Código válido! Marcar agendamento como concluído
    console.log(`✅ Código válido! Marcando agendamento ${appointmentId} como concluído`);
    
    await storage.updateAppointmentStatus(appointmentId, 'completed');
    
    // Buscar dados atualizados do agendamento
    const updatedAppointment = await storage.getAppointmentById(appointmentId);
    
    // Notificar cliente sobre a conclusão
    await notifyClientAboutCompletedService({
      clientId: appointment.clientId,
      clientName: appointment.clientName || 'Cliente',
      appointmentId,
      serviceName: appointment.serviceName || 'Serviço',
      providerName: appointment.providerName || 'Prestador'
    });
    
    // TODO: Aqui você pode implementar a lógica de liberação de saldo para o prestador
    console.log(`💰 Liberando saldo para prestador ${providerId} - Agendamento ${appointmentId}`);
    
    return res.status(200).json({
      success: true,
      message: 'Agendamento concluído com sucesso!',
      appointment: {
        id: updatedAppointment.id,
        status: updatedAppointment.status,
        serviceName: updatedAppointment.serviceName,
        clientName: updatedAppointment.clientName,
        date: updatedAppointment.date,
        startTime: updatedAppointment.startTime,
        endTime: updatedAppointment.endTime,
        totalPrice: updatedAppointment.totalPrice
      }
    });
    
  } catch (error) {
    console.error('❌ Erro ao confirmar agendamento:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor ao confirmar agendamento'
    });
  }
});

/**
 * Endpoint para verificar status de validação de um agendamento
 * GET /api/appointments/:id/validation-status
 * 
 * Permite ao prestador verificar quantas tentativas restam
 */
router.get('/:id/validation-status', isAuthenticated, isProvider, async (req: Request, res: Response) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const providerId = req.user?.id;
    
    // Buscar agendamento
    const appointment = await storage.getAppointmentById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        error: 'Agendamento não encontrado'
      });
    }
    
    // Verificar se o prestador é o responsável pelo agendamento
    if (appointment.providerId !== providerId) {
      return res.status(403).json({
        error: 'Você não tem permissão para ver este agendamento'
      });
    }
    
    const maxAttempts = 3;
    const attempts = appointment.validationAttempts || 0;
    const isBlocked = attempts >= maxAttempts;
    const remainingAttempts = Math.max(0, maxAttempts - attempts);
    
    return res.status(200).json({
      appointmentId,
      status: appointment.status,
      hasValidationCode: !!appointment.validationCodeHash,
      attempts,
      maxAttempts,
      remainingAttempts,
      isBlocked,
      canConfirm: appointment.status !== 'completed' && appointment.status !== 'cancelled' && !isBlocked
    });
    
  } catch (error) {
    console.error('❌ Erro ao verificar status de validação:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

/**
 * Endpoint para cliente visualizar código de validação do agendamento
 * GET /api/appointments/:id/validation-code
 * 
 * Permite ao cliente ver o código de validação do seu agendamento
 */
router.get('/:id/validation-code', isAuthenticated, async (req: Request, res: Response) => {
  try {
    const appointmentId = parseInt(req.params.id);
    const userId = req.user?.id;
    const userRole = (req.user as any)?.userType || (req.user as any)?.role;
    
    // Buscar agendamento
    const appointment = await storage.getAppointmentById(appointmentId);
    if (!appointment) {
      return res.status(404).json({
        error: 'Agendamento não encontrado'
      });
    }
    
    // Verificar se o usuário é o cliente do agendamento
    if (userRole !== 'client' || appointment.clientId !== userId) {
      return res.status(403).json({
        error: 'Você não tem permissão para ver este código'
      });
    }
    
    // Verificar se o agendamento tem código de validação
    if (!appointment.validationCode) {
      return res.status(404).json({
        error: 'Código de validação não encontrado para este agendamento'
      });
    }
    
    return res.status(200).json({
      appointmentId,
      validationCode: appointment.validationCode,
      status: appointment.status,
      serviceName: appointment.serviceName,
      providerName: appointment.providerName,
      date: appointment.date,
      startTime: appointment.startTime,
      endTime: appointment.endTime
    });
    
  } catch (error) {
    console.error('❌ Erro ao buscar código de validação:', error);
    return res.status(500).json({
      error: 'Erro interno do servidor'
    });
  }
});

export default router;