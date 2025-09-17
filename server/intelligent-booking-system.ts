/**
 * Sistema de Agendamento Inteligente
 * 
 * Implementa lógica avançada para gerenciamento de slots de tempo,
 * considerando duração de serviços, intervalos entre atendimentos,
 * e coordenação entre múltiplos prestadores.
 */

import { pool } from './db';
import { storage } from './storage';
import { timeToMinutes, minutesToTime } from './advanced-slot-generator';
import { generateValidationCode, hashValidationCode } from './utils/validation-code-utils';
import { sendValidationCodeToClient } from './services/validation-notification-service';

// Configurações padrão
const DEFAULT_BUFFER_MINUTES = 15; // Intervalo padrão entre serviços

interface BookingOptions {
  providerId: number;
  serviceId: number;
  clientId: number;
  date: string;
  startTime: string;
  endTime?: string;
  serviceDuration?: number;
  bufferTime?: number;
  isMultipleService?: boolean;
  isProfessionalSpecific?: boolean;
  paymentMethod?: string;
  paymentStatus?: string;
  totalPrice?: number;
  paymentId?: string;
  serviceName?: string;
  clientName?: string;
}

interface BlockSlotOptions {
  providerId: number;
  date: string;
  startTime: string;
  endTime: string;
  reason?: string;
  appointmentId?: number;
  recurrentId?: string;
  blockType?: 'manual' | 'appointment' | 'break';
}

/**
 * Gerencia a criação, bloqueio e liberação de slots de tempo
 * de forma inteligente, considerando regras de negócio complexas
 */
export class IntelligentBookingSystem {
  /**
   * Bloqueia um slot de tempo com todas as regras de negócio aplicadas
   * Utilizado tanto para agendamentos quanto para bloqueios manuais
   */
  async blockTimeSlot(options: BlockSlotOptions): Promise<boolean> {
    try {
      const { providerId, date, startTime, endTime, reason, appointmentId, blockType } = options;
      
      // Obter o dia da semana para buscar a disponibilidade
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      const adjustedDayOfWeek = dayOfWeek + 1; // Ajustar para formato do banco (1-7)
      
      // Buscar a disponibilidade para o dia
      const availabilities = await storage.getAvailabilityByDay(providerId, adjustedDayOfWeek);
      if (!availabilities || availabilities.length === 0) {
        throw new Error('Não há disponibilidade configurada para este dia');
      }
      
      // Usar a primeira disponibilidade encontrada para o bloqueio
      const availability = availabilities[0];
      
      // Bloquear o slot no banco de dados
      await storage.createBlockedTime({
        providerId,
        availabilityId: availability.id,
        date,
        startTime,
        endTime,
        reason: reason || 'Horário reservado',
        blockedByUserId: providerId,
        metadata: {
          type: blockType || 'manual',
          appointmentId,
          recurrentId: options.recurrentId
        }
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao bloquear slot de tempo:', error);
      throw new Error(`Falha ao bloquear horário: ${error.message}`);
    }
  }
  
  /**
   * Libera um slot de tempo previamente bloqueado
   */
  async unblockTimeSlot(options: { 
    providerId: number; 
    date: string;
    startTime: string;
    endTime: string;
    appointmentId?: number;
  }): Promise<boolean> {
    try {
      const { providerId, date, startTime, endTime, appointmentId } = options;
      
      // Buscar todos os bloqueios do prestador na data
      const blockedSlots = await storage.getBlockedTimesByProviderId(providerId);
      
      // Filtrar bloqueios da data específica
      const slotsOnDate = blockedSlots.filter(slot => slot.date === date);
      
      // Se temos appointmentId, remover bloqueios associados a ele
      if (appointmentId) {
        const appointmentSlots = slotsOnDate.filter(slot => slot.appointmentId === appointmentId);
        for (const slot of appointmentSlots) {
          await storage.deleteBlockedTime(slot.id);
        }
        return true;
      }
      
      // Caso contrário, remover bloqueios que correspondem ao horário específico
      const matchingSlots = slotsOnDate.filter(slot => 
        slot.startTime === startTime && slot.endTime === endTime
      );
      
      for (const slot of matchingSlots) {
        await storage.deleteBlockedTime(slot.id);
      }
      
      return true;
    } catch (error) {
      console.error('Erro ao liberar slot de tempo:', error);
      throw new Error(`Falha ao liberar horário: ${error.message}`);
    }
  }
  
  /**
   * Realiza um agendamento com todas as regras inteligentes aplicadas
   */
  async bookAppointment(options: BookingOptions): Promise<number> {
    try {
      console.log(`🚀 Iniciando agendamento:`, {
        providerId: options.providerId,
        serviceId: options.serviceId,
        clientId: options.clientId,
        date: options.date,
        startTime: options.startTime,
        paymentMethod: options.paymentMethod,
        paymentStatus: options.paymentStatus,
        serviceName: options.serviceName,
        clientName: options.clientName
      });
      
      const { 
        providerId, 
        serviceId, 
        clientId, 
        date, 
        startTime, 
        bufferTime = DEFAULT_BUFFER_MINUTES,
        isMultipleService = false,
        paymentMethod,
        paymentStatus,
        totalPrice,
        paymentId,
        serviceName,
        clientName
      } = options;
      
      // 1. Obter detalhes do serviço (incluindo duração personalizada)
      const serviceInfo = await this.getServiceDetails(serviceId, providerId);
      const serviceDuration = options.serviceDuration || serviceInfo.duration;
      
      // 2. Calcular o horário de término
      const startTimeMinutes = timeToMinutes(startTime);
      const endTimeMinutes = startTimeMinutes + serviceDuration;
      const endTime = minutesToTime(endTimeMinutes);
      
      // 3. Verificar disponibilidade do slot
      console.log(`🔍 Verificando disponibilidade do slot...`);
      const isAvailable = await this.checkSlotAvailability({
        providerId,
        date,
        startTime,
        endTime
      });
      
      console.log(`📊 Resultado da verificação de disponibilidade: ${isAvailable}`);
      
      if (!isAvailable) {
        console.log(`❌ Horário não disponível - lançando erro`);
        throw new Error('O horário selecionado não está mais disponível');
      }
      
      // 4. Gerar código de validação único de 6 dígitos
      console.log('🔐 Gerando código de validação...');
      const validationCode = generateValidationCode();
      const validationCodeHash = await hashValidationCode(validationCode);
      console.log('✅ Código de validação gerado e hasheado com sucesso');
      
      // 5. Criar o agendamento com código de validação
      const appointmentId = await storage.createAppointment({
        providerId,
        serviceId,
        clientId,
        date,
        startTime,
        endTime,
        status: 'pending',
        notes: '',
        paymentMethod,
        paymentStatus,
        totalPrice: totalPrice || serviceInfo.price || 0,
        paymentId,
        serviceName,
        clientName,
        validationCodeHash, // Salvar o hash para validação
        validationCode, // Salvar o código em texto para o cliente visualizar
        validationAttempts: 0 // Inicializar contador de tentativas
      });
      
      // 6. Bloquear o slot de tempo
      await this.blockTimeSlot({
        providerId,
        date,
        startTime,
        endTime,
        appointmentId,
        blockType: 'appointment',
        reason: `Agendamento: ${serviceInfo.name}`
      });
      
      // 7. Buscar dados do cliente e prestador para envio do código
      console.log('📱 Preparando envio do código de validação ao cliente...');
      const clientData = await storage.getUser(clientId);
      const providerData = await storage.getUser(providerId);
      
      // 8. Enviar código de validação APENAS ao cliente
      // IMPORTANTE: O prestador NUNCA deve ter acesso a este código
      try {
        const notificationSent = await sendValidationCodeToClient({
          clientId,
          clientName: clientData?.name || clientName || 'Cliente',
          clientPhone: clientData?.phone,
          clientEmail: clientData?.email,
          validationCode, // Código em texto claro APENAS para envio ao cliente
          appointmentId,
          serviceName: serviceInfo.name || serviceName || 'Serviço',
          providerName: providerData?.name || 'Prestador',
          appointmentDate: date,
          appointmentTime: startTime
        });
        
        if (notificationSent) {
          console.log('✅ Código de validação enviado ao cliente com sucesso');
        } else {
          console.log('⚠️  Falha ao enviar código de validação, mas agendamento foi criado');
        }
      } catch (notificationError) {
        console.error('❌ Erro ao enviar código de validação:', notificationError);
        // Não falhar o agendamento por erro de notificação
      }
      
      // 9. Se houver tempo de buffer, bloquear também
      if (bufferTime > 0 && !isMultipleService) {
        const bufferEndTimeMinutes = endTimeMinutes + bufferTime;
        const bufferEndTime = minutesToTime(bufferEndTimeMinutes);
        
        await this.blockTimeSlot({
          providerId,
          date,
          startTime: endTime,
          endTime: bufferEndTime,
          appointmentId,
          blockType: 'break',
          reason: 'Intervalo entre serviços'
        });
      }
      
      return appointmentId;
    } catch (error) {
      console.error('Erro ao realizar agendamento:', error);
      throw new Error(`Falha ao agendar: ${error.message}`);
    }
  }
  
  /**
   * Reagenda um compromisso existente
   */
  async rescheduleAppointment(
    appointmentId: number, 
    newDate: string, 
    newStartTime: string
  ): Promise<boolean> {
    try {
      // 1. Obter detalhes do agendamento atual
      const appointment = await storage.getAppointmentById(appointmentId);
      if (!appointment) {
        throw new Error('Agendamento não encontrado');
      }
      
      // 2. Obter detalhes do serviço
      const serviceInfo = await this.getServiceDetails(
        appointment.serviceId, 
        appointment.providerId
      );
      
      // 3. Liberar o horário antigo
      await this.unblockTimeSlot({
        providerId: appointment.providerId,
        date: appointment.date,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        appointmentId
      });
      
      // 4. Calcular novo horário de término
      const startTimeMinutes = timeToMinutes(newStartTime);
      const serviceDuration = appointment.endTime ? 
        timeToMinutes(appointment.endTime) - timeToMinutes(appointment.startTime) : 
        serviceInfo.duration;
        
      const newEndTimeMinutes = startTimeMinutes + serviceDuration;
      const newEndTime = minutesToTime(newEndTimeMinutes);
      
      // 5. Verificar disponibilidade do novo slot
      const isAvailable = await this.checkSlotAvailability({
        providerId: appointment.providerId,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime
      });
      
      if (!isAvailable) {
        throw new Error('O novo horário selecionado não está disponível');
      }
      
      // 6. Atualizar o agendamento
      await storage.updateAppointment(appointmentId, {
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime
      });
      
      // 7. Bloquear o novo slot
      await this.blockTimeSlot({
        providerId: appointment.providerId,
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime,
        appointmentId,
        blockType: 'appointment',
        reason: `Agendamento: ${serviceInfo.name}`
      });
      
      // 8. Se houver tempo de buffer, bloquear também
      const bufferTime = DEFAULT_BUFFER_MINUTES;
      const bufferEndTimeMinutes = newEndTimeMinutes + bufferTime;
      const bufferEndTime = minutesToTime(bufferEndTimeMinutes);
      
      await this.blockTimeSlot({
        providerId: appointment.providerId,
        date: newDate,
        startTime: newEndTime,
        endTime: bufferEndTime,
        appointmentId,
        blockType: 'break',
        reason: 'Intervalo entre serviços'
      });
      
      return true;
    } catch (error) {
      console.error('Erro ao reagendar compromisso:', error);
      throw new Error(`Falha ao reagendar: ${error.message}`);
    }
  }
  
  /**
   * Verifica se um slot de tempo está disponível
   */
  async checkSlotAvailability(options: {
    providerId: number;
    date: string;
    startTime: string;
    endTime: string;
  }): Promise<boolean> {
    try {
      const { providerId, date, startTime, endTime } = options;
      
      console.log(`🔍 Verificando disponibilidade: Provider ${providerId}, Data ${date}, Horário ${startTime}-${endTime}`);
      
      // Verificar se o slot está dentro do horário de trabalho do prestador
      const isWithinWorkHours = await this.checkWithinWorkHours(
        providerId, date, startTime, endTime
      );
      
      console.log(`📅 Dentro do horário de trabalho: ${isWithinWorkHours}`);
      
      if (!isWithinWorkHours) {
        console.log(`❌ Horário fora do período de trabalho`);
        return false;
      }
      
      // Verificar se há conflitos com bloqueios existentes
      const blockedSlots = await storage.getBlockedTimeSlotsByDate(
        providerId, date
      );
      
      console.log(`🚫 Bloqueios encontrados: ${blockedSlots.length}`);
      
      // Verificar se há conflitos com agendamentos existentes
      const existingAppointments = await storage.getAppointmentsByProviderId(providerId);
      
      // Filtrar agendamentos da data específica
      const appointmentsOnDate = existingAppointments.filter(
        appointment => appointment.date === date
      );
      
      console.log(`📋 Agendamentos na data: ${appointmentsOnDate.length}`);
      
      // Converter horários para minutos para facilitar comparação
      const startTimeMinutes = timeToMinutes(startTime);
      const endTimeMinutes = timeToMinutes(endTime);
      
      console.log(`⏰ Horário solicitado: ${startTimeMinutes}-${endTimeMinutes} minutos`);
      
      // Verificar conflitos com bloqueios
      for (const blockedSlot of blockedSlots) {
        const blockedStartMinutes = timeToMinutes(blockedSlot.startTime);
        const blockedEndMinutes = timeToMinutes(blockedSlot.endTime);
        
        console.log(`🚫 Bloqueio: ${blockedStartMinutes}-${blockedEndMinutes} minutos`);
        
        // Verificar se há sobreposição
        const hasOverlap = (
          (startTimeMinutes < blockedEndMinutes && endTimeMinutes > blockedStartMinutes)
        );
        
        console.log(`🔍 Verificação de sobreposição com bloqueio: ${startTimeMinutes} < ${blockedEndMinutes} && ${endTimeMinutes} > ${blockedStartMinutes} = ${hasOverlap}`);
        
        if (hasOverlap) {
          console.log(`❌ Conflito com bloqueio detectado`);
          return false;
        }
      }
      
      // Verificar conflitos com agendamentos existentes
      for (const appointment of appointmentsOnDate) {
        const appointmentStartMinutes = timeToMinutes(appointment.startTime);
        const appointmentEndMinutes = timeToMinutes(appointment.endTime);
        
        console.log(`📋 Agendamento: ${appointmentStartMinutes}-${appointmentEndMinutes} minutos (ID: ${appointment.id}, Status: ${appointment.status})`);
        
        // Ignorar agendamentos cancelados
        if (appointment.status === 'canceled') {
          console.log(`⏭️ Ignorando agendamento cancelado (ID: ${appointment.id})`);
          continue;
        }
        
        // Verificar se há sobreposição
        const hasOverlap = (
          (startTimeMinutes < appointmentEndMinutes && endTimeMinutes > appointmentStartMinutes)
        );
        
        console.log(`🔍 Verificação de sobreposição: ${startTimeMinutes} < ${appointmentEndMinutes} && ${endTimeMinutes} > ${appointmentStartMinutes} = ${hasOverlap}`);
        
        if (hasOverlap) {
          console.log(`❌ Conflito com agendamento existente detectado (ID: ${appointment.id})`);
          return false;
        }
      }
      
      console.log(`✅ Horário disponível!`);
      return true;
    } catch (error) {
      console.error('Erro ao verificar disponibilidade de slot:', error);
      return false;
    }
  }
  
  /**
   * Verifica se um horário está dentro do período de trabalho do prestador
   */
  private async checkWithinWorkHours(
    providerId: number, 
    date: string, 
    startTime: string, 
    endTime: string
  ): Promise<boolean> {
    try {
      // Obter dia da semana (0-6, onde 0 = domingo)
      const dateObj = new Date(date);
      const dayOfWeek = dateObj.getDay();
      
      // Ajustar para formato do banco (1-7, onde 1 = domingo)
      const adjustedDayOfWeek = dayOfWeek + 1;
      
      console.log(`📅 Verificando horário de trabalho: Provider ${providerId}, Dia ${adjustedDayOfWeek}, Data ${date}`);
      
      // Buscar disponibilidade para o dia
      const availabilities = await storage.getAvailabilityByDay(
        providerId, adjustedDayOfWeek
      );
      
      console.log(`📋 Disponibilidades encontradas:`, availabilities);
      
      // Se não houver disponibilidade configurada para o dia, não está disponível
      if (!availabilities || availabilities.length === 0) {
        console.log(`❌ Nenhuma disponibilidade configurada para o dia`);
        return false;
      }
      
      // Converter horários para minutos para facilitar comparação
      const startTimeMinutes = timeToMinutes(startTime);
      const endTimeMinutes = timeToMinutes(endTime);
      
      console.log(`⏰ Horário solicitado: ${startTimeMinutes}-${endTimeMinutes} minutos`);
      
      // Verificar se o horário está dentro de alguma das disponibilidades
      for (const availability of availabilities) {
        console.log(`📋 Verificando disponibilidade: ${availability.startTime}-${availability.endTime}`);
        
        const availStartMinutes = timeToMinutes(availability.startTime);
        const availEndMinutes = timeToMinutes(availability.endTime);
        
        console.log(`📋 Horário disponível: ${availStartMinutes}-${availEndMinutes} minutos`);
        
        if (
          startTimeMinutes >= availStartMinutes && 
          endTimeMinutes <= availEndMinutes
        ) {
          console.log(`✅ Horário está dentro da disponibilidade`);
          return true;
        }
      }
      
      console.log(`❌ Horário não está dentro de nenhuma disponibilidade`);
      return false;
    } catch (error) {
      console.error('Erro ao verificar horário de trabalho:', error);
      return false;
    }
  }
  
  /**
   * Obtém detalhes do serviço, incluindo duração personalizada se existir
   */
  private async getServiceDetails(serviceId: number, providerId: number): Promise<any> {
    try {
      // Buscar informações básicas do serviço
      const service = await storage.getService(serviceId);
      if (!service) {
        throw new Error('Serviço não encontrado');
      }
      
      // Verificar se há duração personalizada para este prestador
      const customizedService = await storage.getProviderServiceByProviderAndService(providerId, serviceId);
      
      // Se existir tempo personalizado, usar ele
      if (customizedService && customizedService.executionTime) {
        return {
          ...service,
          duration: customizedService.executionTime
        };
      }
      
      return service;
    } catch (error) {
      console.error('Erro ao obter detalhes do serviço:', error);
      throw error;
    }
  }
  
  /**
   * Cria agendamentos múltiplos para serviços consecutivos
   */
  async bookConsecutiveServices(options: {
    providerId: number;
    clientId: number;
    date: string;
    startTime: string;
    services: { serviceId: number, duration?: number }[];
    paymentMethod?: string;
    paymentStatus?: string;
    totalPrice?: number;
    serviceName?: string;
    clientName?: string;
  }): Promise<number[]> {
    try {
      const { 
        providerId, 
        clientId, 
        date, 
        startTime, 
        services,
        paymentMethod,
        paymentStatus,
        totalPrice,
        serviceName,
        clientName
      } = options;
      
      if (services.length === 0) {
        throw new Error('Nenhum serviço selecionado');
      }
      
      const appointmentIds: number[] = [];
      let currentStartTime = startTime;
      
      // Para cada serviço, criar um agendamento consecutivo
      for (let i = 0; i < services.length; i++) {
        const service = services[i];
        const isLastService = i === services.length - 1;
        
        // Criar o agendamento com flag de serviço múltiplo para não adicionar buffer entre eles
        const appointmentId = await this.bookAppointment({
          providerId,
          serviceId: service.serviceId,
          clientId,
          date,
          startTime: currentStartTime,
          serviceDuration: service.duration,
          isMultipleService: !isLastService, // Apenas o último tem buffer
          bufferTime: DEFAULT_BUFFER_MINUTES,
          paymentMethod,
          paymentStatus,
          totalPrice,
          serviceName,
          clientName
        });
        
        appointmentIds.push(appointmentId);
        
        // Atualizar o horário de início para o próximo serviço
        if (!isLastService) {
          const appointment = await storage.getAppointmentById(appointmentId);
          currentStartTime = appointment.endTime;
        }
      }
      
      return appointmentIds;
    } catch (error) {
      console.error('Erro ao agendar serviços consecutivos:', error);
      throw new Error(`Falha ao agendar serviços consecutivos: ${error.message}`);
    }
  }
  
  /**
   * Gerencia agendamentos para serviços que podem ser prestados por qualquer profissional
   */
  async bookWithGenericProvider(options: {
    serviceId: number;
    clientId: number;
    date: string;
    startTime: string;
    providerIds: number[];
  }): Promise<{ appointmentId: number, providerId: number }> {
    try {
      const { serviceId, clientId, date, startTime, providerIds } = options;
      
      if (providerIds.length === 0) {
        throw new Error('Nenhum prestador disponível');
      }
      
      // Obter detalhes do serviço
      const service = await storage.getService(serviceId);
      if (!service) {
        throw new Error('Serviço não encontrado');
      }
      
      // Calcular horário de término
      const startTimeMinutes = timeToMinutes(startTime);
      const endTimeMinutes = startTimeMinutes + service.duration;
      const endTime = minutesToTime(endTimeMinutes);
      
      // Verificar qual prestador está disponível neste horário
      let availableProviderId: number | null = null;
      
      for (const providerId of providerIds) {
        const isAvailable = await this.checkSlotAvailability({
          providerId,
          date,
          startTime,
          endTime
        });
        
        if (isAvailable) {
          availableProviderId = providerId;
          break;
        }
      }
      
      if (!availableProviderId) {
        throw new Error('Nenhum prestador disponível para este horário');
      }
      
      // Criar o agendamento com o prestador disponível
      const appointmentId = await this.bookAppointment({
        providerId: availableProviderId,
        serviceId,
        clientId,
        date,
        startTime
      });
      
      return { appointmentId, providerId: availableProviderId };
    } catch (error) {
      console.error('Erro ao agendar com prestador genérico:', error);
      throw new Error(`Falha ao agendar com prestador genérico: ${error.message}`);
    }
  }
}

// Exportar uma instância única do sistema de agendamento
export const bookingSystem = new IntelligentBookingSystem();