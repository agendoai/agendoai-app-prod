/**
 * Rota especializada para buscar slots de tempo disponíveis para múltiplos serviços
 * 
 * Esta implementação permite que clientes escolham múltiplos serviços e encontrem
 * slots de tempo disponíveis levando em conta a duração total de todos os serviços selecionados
 */

import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

const router = Router();

// Funções auxiliares para converter horários
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/**
 * Rota para buscar slots de tempo disponíveis para múltiplos serviços
 * GET /api/time-slots/multiple?providerId=123&date=2023-05-15&serviceIds=1,2,3
 */
router.get('/multiple', async (req, res) => {
  try {
    const { providerId, date, serviceIds } = req.query;
    
    // Validar dados de entrada
    if (!providerId || !date) {
      return res.status(400).json({ 
        error: 'Parâmetros obrigatórios: providerId e date' 
      });
    }
    
    // Converter e validar providerId
    const providerIdNum = parseInt(providerId as string);
    if (isNaN(providerIdNum)) {
      return res.status(400).json({ 
        error: 'ID do prestador inválido' 
      });
    }
    
    // Validar formato da data (YYYY-MM-DD)
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date as string)) {
      return res.status(400).json({ 
        error: 'Formato de data inválido. Use YYYY-MM-DD' 
      });
    }
    
    // Validar serviceIds
    if (!serviceIds) {
      return res.status(400).json({ 
        error: 'Parâmetro serviceIds é obrigatório' 
      });
    }
    
    // Converter a lista de IDs de serviço para números
    const serviceIdArray: number[] = [];
    try {
      const idsString = serviceIds as string;
      const idsList = idsString.split(',').map(id => id.trim());
      
      for (const idStr of idsList) {
        const id = parseInt(idStr);
        if (isNaN(id)) {
          return res.status(400).json({ 
            error: `ID de serviço inválido: ${idStr}` 
          });
        }
        serviceIdArray.push(id);
      }
    } catch (error) {
      return res.status(400).json({ 
        error: 'Formato de serviceIds inválido. Use lista separada por vírgulas.' 
      });
    }
    
    if (serviceIdArray.length === 0) {
      return res.status(400).json({ 
        error: 'Nenhum serviço válido especificado' 
      });
    }
    
    // Calcular a duração total de todos os serviços
    let totalDuration = 0;
    const serviceDurations: number[] = [];
    
    for (const serviceId of serviceIdArray) {
      // Primeiro verificar se existe como provider service (serviço personalizado)
      const providerService = await storage.getProviderServiceByProviderAndService(providerIdNum, serviceId);
      
      if (providerService) {
        totalDuration += providerService.executionTime;
        serviceDurations.push(providerService.executionTime);
        continue;
      }
      
      // Verificar service template (catálogo de serviços)
      const serviceTemplate = await storage.getServiceTemplate(serviceId);
      if (serviceTemplate) {
        totalDuration += serviceTemplate.duration;
        serviceDurations.push(serviceTemplate.duration);
        continue;
      }
      
      // Verificar serviço legado
      const service = await storage.getService(serviceId);
      if (service) {
        totalDuration += service.duration;
        serviceDurations.push(service.duration);
        continue;
      }
      
      // Se não encontrar o serviço, retornar erro
      return res.status(404).json({ 
        error: `Serviço não encontrado: ${serviceId}` 
      });
    }
    
    console.log(`Duração total dos serviços selecionados (${serviceIdArray.join(',')}): ${totalDuration} minutos`);
    
    // Converter a data para objeto Date
    const requestDate = new Date(date as string);
    
    // Obter o dia da semana (0 = Domingo, 6 = Sábado)
    const dayOfWeek = requestDate.getDay();
    
    // Buscar configuração de disponibilidade para este dia da semana
    const availabilityConfig = await storage.getAvailabilityByDay(providerIdNum, dayOfWeek);
    
    if (!availabilityConfig || availabilityConfig.length === 0) {
      return res.json({
        slots: [],
        message: `Prestador não tem disponibilidade configurada para ${['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayOfWeek]}`
      });
    }
    
    // Buscar agendamentos existentes para esta data
    const existingAppointments = await storage.getProviderAppointmentsByDate(providerIdNum, date as string);
    
    // Buscar bloqueios de horário para esta data
    let blockedSlots = [];
    try {
      blockedSlots = await storage.getBlockedTimeSlotsByDate(providerIdNum, date as string);
    } catch (error) {
      console.error("Erro ao buscar bloqueios:", error);
    }
    
    // Períodos ocupados combinam agendamentos e bloqueios
    const occupiedPeriods = [
      ...existingAppointments.map(apt => ({ 
        startTime: apt.startTime, 
        endTime: apt.endTime,
        type: 'appointment'
      })),
      ...blockedSlots.map(block => ({ 
        startTime: block.startTime, 
        endTime: block.endTime,
        type: 'block'
      }))
    ];
    
    // Verificar se devemos usar algoritmo avançado para serviços longos
    let availableTimeSlots = [];
    
    if (totalDuration > 90) {
      try {
        // Importar o gerador avançado de slots
        const { generateLongServiceTimeSlots } = require('../advanced-slot-generator');
        
        // Converter períodos ocupados para o formato esperado pelo gerador avançado
        const occupiedPeriodsInMinutes = occupiedPeriods.map(period => ({
          start: timeToMinutes(period.startTime),
          end: timeToMinutes(period.endTime)
        }));
        
        // Para cada configuração de disponibilidade, gerar slots
        for (const config of availabilityConfig) {
          // Pular configurações marcadas como indisponíveis
          if (config.isAvailable === false) continue;
          
          const slotsForConfig = generateLongServiceTimeSlots(
            config.startTime,
            config.endTime,
            occupiedPeriodsInMinutes,
            totalDuration,
            config.id
          );
          
          availableTimeSlots = [...availableTimeSlots, ...slotsForConfig];
        }
        
        console.log(`Gerados ${availableTimeSlots.length} slots para serviços longos usando algoritmo avançado`);
      } catch (error) {
        console.error("Erro ao usar gerador avançado, usando método padrão:", error);
        // Em caso de erro, continuar com o método padrão
      }
    }
    
    // Se não conseguir usar o algoritmo avançado ou se a duração for menor,
    // usar o algoritmo padrão para gerar slots
    if (availableTimeSlots.length === 0) {
      // Para cada configuração de disponibilidade
      for (const config of availabilityConfig) {
        // Pular configurações marcadas como indisponíveis
        if (config.isAvailable === false) continue;
        
        const startMinutes = timeToMinutes(config.startTime);
        const endMinutes = timeToMinutes(config.endTime);
        const intervalSize = config.intervalMinutes || 30; // Intervalo padrão
        
        // Gerar slots com base no intervalo configurado
        for (
          let slotStart = startMinutes;
          slotStart + totalDuration <= endMinutes;
          slotStart += intervalSize
        ) {
          const slotEnd = slotStart + totalDuration;
          let isAvailable = true;
          let conflictInfo = null;
          
          // Verificar se há conflitos com períodos ocupados
          for (const period of occupiedPeriods) {
            const periodStart = timeToMinutes(period.startTime);
            const periodEnd = timeToMinutes(period.endTime);
            
            // Verificar sobreposição
            if (slotStart < periodEnd && slotEnd > periodStart) {
              isAvailable = false;
              conflictInfo = {
                type: period.type,
                startTime: period.startTime,
                endTime: period.endTime
              };
              break;
            }
          }
          
          if (isAvailable) {
            availableTimeSlots.push({
              startTime: minutesToTime(slotStart),
              endTime: minutesToTime(slotEnd),
              isAvailable: true,
              availabilityId: config.id,
              serviceDuration: totalDuration
            });
          }
        }
      }
      
      console.log(`Gerados ${availableTimeSlots.length} slots usando algoritmo padrão`);
    }
    
    // Enriquecer a resposta com detalhes dos serviços
    const serviceDetails = await Promise.all(serviceIdArray.map(async (id, index) => {
      // Primeiro tentar como provider service
      const providerService = await storage.getProviderServiceByProviderAndService(providerIdNum, id);
      
      if (providerService) {
        const baseService = await storage.getService(id);
        return {
          id,
          name: baseService?.name || 'Serviço personalizado',
          duration: serviceDurations[index],
          customized: true
        };
      }
      
      // Tentar como service template
      const serviceTemplate = await storage.getServiceTemplate(id);
      if (serviceTemplate) {
        return {
          id,
          name: serviceTemplate.name,
          duration: serviceDurations[index],
          isTemplate: true
        };
      }
      
      // Tentar como serviço legado
      const service = await storage.getService(id);
      if (service) {
        return {
          id,
          name: service.name,
          duration: serviceDurations[index],
          legacy: true
        };
      }
      
      // Fallback
      return {
        id,
        name: 'Serviço desconhecido',
        duration: serviceDurations[index]
      };
    }));
    
    // Retornar os resultados
    res.json({
      slots: availableTimeSlots,
      services: serviceDetails,
      totalDuration,
      date: date as string,
      providerId: providerIdNum,
      dayOfWeek,
      dayName: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][dayOfWeek]
    });
    
  } catch (error) {
    console.error("Erro ao buscar slots para múltiplos serviços:", error);
    res.status(500).json({ 
      error: "Erro ao buscar slots de tempo", 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;