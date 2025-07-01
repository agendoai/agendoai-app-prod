/**
 * Rota especializada para busca de prestadores com disponibilidade para serviços específicos
 * 
 * Esta implementação permite buscar prestadores que ofereçam serviços específicos
 * do catálogo e tenham disponibilidade para atender no período solicitado
 */

import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

const router = Router();

// Esquema de validação com Zod
const searchSchema = z.object({
  serviceIds: z.string().transform(val => 
    val.split(',').map(id => {
      const num = parseInt(id.trim());
      if (isNaN(num)) throw new Error('IDs de serviço inválidos');
      return num;
    })
  ),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  especialidadeId: z.string().transform(val => {
    const num = parseInt(val);
    if (isNaN(num)) throw new Error('ID de especialidade inválido');
    return num;
  }).optional(),
  categoryId: z.string().transform(val => {
    const num = parseInt(val);
    if (isNaN(num)) throw new Error('ID de categoria inválido');
    return num;
  }).optional(),
  minRating: z.string().transform(val => {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0 || num > 5) throw new Error('Avaliação deve ser entre 0 e 5');
    return num;
  }).optional().default('0'),
});

// Funções auxiliares para manipulação de tempo
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
 * Rota para buscar prestadores que oferecem serviços específicos
 * GET /api/providers/specialized-search?serviceIds=1,2,3&date=2023-04-01&especialidadeId=5
 */
router.get('/specialized-search', async (req, res) => {
  try {
    // Validar parâmetros de entrada
    const parsedQuery = await searchSchema.parseAsync(req.query).catch(error => {
      throw new Error(`Erro de validação: ${error.message}`);
    });
    
    const { serviceIds, date, especialidadeId, categoryId, minRating } = parsedQuery;

    console.log(`Buscando prestadores para serviços: ${serviceIds.join(',')}`);

    // 1. Buscar todos os prestadores ativos
    const allUsers = await storage.getAllUsers();
    const activeProviders = allUsers.filter(p => p?.userType === 'provider' && p.isActive !== false);
    console.log(`Total de prestadores ativos: ${activeProviders.length}`);

    // 2. Filtrar por especialidade se fornecida
    let filteredProviders = [...activeProviders];
    if (especialidadeId) {
      const categoriesInEspecialidade = await storage.getCategoriesByNicheId(especialidadeId);
      const categoryIds = categoriesInEspecialidade.map(cat => cat.id);
      
      filteredProviders = await filterProvidersByCategories(filteredProviders, categoryIds);
      console.log(`Prestadores filtrados por especialidade (ID ${especialidadeId}): ${filteredProviders.length}`);
    }

    // 3. Filtrar por categoria específica se fornecida
    if (categoryId) {
      filteredProviders = await filterProvidersByCategories(filteredProviders, [categoryId]);
      console.log(`Prestadores filtrados por categoria (ID ${categoryId}): ${filteredProviders.length}`);
    }

    // 4. Filtrar prestadores que oferecem todos os serviços solicitados
    const qualifiedProviders = await filterProvidersByServices(filteredProviders, serviceIds, minRating);
    console.log(`Prestadores qualificados (oferecem todos os serviços): ${qualifiedProviders.length}`);

    // 5. Verificar disponibilidade se data for fornecida
    let providersWithAvailability = [...qualifiedProviders];
    if (date) {
      providersWithAvailability = await checkProvidersAvailability(providersWithAvailability, date);
      console.log(`Prestadores com disponibilidade na data ${date}: ${providersWithAvailability.length}`);
    }

    // Ordenar por avaliação
    const sortedProviders = providersWithAvailability
      .sort((a, b) => (b.settings?.rating || 0) - (a.settings?.rating || 0));

    res.json({
      providers: sortedProviders,
      totalResults: sortedProviders.length,
      filters: {
        serviceIds,
        date: date || null,
        especialidadeId: especialidadeId || null,
        categoryId: categoryId || null,
        minRating
      }
    });

  } catch (error) {
    console.error('Erro na pesquisa especializada de prestadores:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar prestadores', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

// Funções auxiliares

/**
 * Filtrar prestadores que oferecem serviços em categorias específicas
 */
async function filterProvidersByCategories(providers: any[], categoryIds: number[]): Promise<any[]> {
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        const providerServices = await storage.getProviderServicesByProvider(provider.id);
        
        for (const ps of providerServices) {
          // Verificar service template
          const serviceTemplate = await storage.getServiceTemplate(ps.serviceId);
          if (serviceTemplate && categoryIds.includes(serviceTemplate.categoryId)) {
            return provider;
          }
          
          // Verificar serviço legado
          const service = await storage.getService(ps.serviceId);
          if (service && categoryIds.includes(service.categoryId)) {
            return provider;
          }
        }
        return null;
      } catch (error) {
        console.error(`Erro ao filtrar prestador ${provider.id} por categorias:`, error);
        return null;
      }
    })
  );
  
  return results.filter(p => p !== null);
}

/**
 * Filtrar prestadores que oferecem todos os serviços solicitados
 */
async function filterProvidersByServices(providers: any[], serviceIds: number[], minRating: number): Promise<any[]> {
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        // Buscar todos os serviços do prestador
        const allServices = await storage.getServicesByProvider(provider.id);
        
        // Extrair IDs de serviços oferecidos
        const offeredServiceIds = new Set(allServices.map(s => s.id));
        
        // Verificar se todos os serviços solicitados são oferecidos
        const missingServices = serviceIds.filter(id => !offeredServiceIds.has(id));
        if (missingServices.length > 0) {
          console.log(`Prestador ${provider.id} não oferece todos os serviços solicitados. Faltando: ${missingServices.join(',')}`);
          return null;
        }
        
        // Calcular duração total para este prestador
        let totalDuration = 0;
        const durations = [];
        
        for (const serviceId of serviceIds) {
          const service = allServices.find(s => s.id === serviceId);
          if (service) {
            const duration = service.duration || 30;
            totalDuration += duration;
            durations.push({
              id: serviceId,
              duration,
              name: service.name || `Serviço ${serviceId}`
            });
          }
        }
        
        // Verificar avaliação mínima
        const settings = await storage.getProviderSettings(provider.id);
        if (minRating > 0 && (!settings?.rating || settings.rating < minRating)) {
          return null;
        }
        
        return {
          ...provider,
          totalServiceDuration: totalDuration,
          serviceDurations: durations,
          settings
        };
      } catch (error) {
        console.error(`Erro ao processar prestador ${provider.id}:`, error);
        return null;
      }
    })
  );
  
  return results.filter(p => p !== null);
}

/**
 * Verificar disponibilidade dos prestadores para a data especificada
 */
async function checkProvidersAvailability(providers: any[], date: string): Promise<any[]> {
  const requestDate = new Date(date);
  const dayOfWeek = requestDate.getDay();
  
  const results = await Promise.all(
    providers.map(async (provider) => {
      try {
        // Buscar disponibilidade do prestador
        let dayAvailability = await storage.getAvailabilityByDay(provider.id, dayOfWeek);
        if (!Array.isArray(dayAvailability)) {
          dayAvailability = dayAvailability ? [dayAvailability] : [];
        }
        
        // Verificar existência de pelo menos um período disponível
        if (dayAvailability.length === 0) {
          console.log(`Prestador ${provider.id} não tem disponibilidade para o dia ${dayOfWeek}`);
          return null;
        }
        
        // Buscar agendamentos e bloqueios
        const [appointments, blockedSlots] = await Promise.all([
          storage.getAppointmentsByProviderId(provider.id),
          storage.getBlockedTimeSlotsByDate(provider.id, date)
        ]);
        
        // Filtrar agendamentos para a data especificada e não cancelados
        const existingAppointments = appointments.filter(app => 
          new Date(app.date).toISOString().split('T')[0] === date && 
          app.status !== 'canceled' && 
          app.status !== 'no_show'
        );
        
        // Converter para blocos de tempo ocupados
        const occupiedBlocks = [
          ...existingAppointments.map(app => ({
            start: timeToMinutes(app.startTime),
            end: timeToMinutes(app.endTime)
          })),
          ...(blockedSlots || []).filter(slot => 
            slot?.startTime && typeof slot.startTime === 'string' &&
            slot?.endTime && typeof slot.endTime === 'string'
          ).map(slot => ({
            start: timeToMinutes(slot.startTime),
            end: timeToMinutes(slot.endTime)
          }))
        ];
        
        // Verificar se há pelo menos um período disponível longo o suficiente
        for (const avail of dayAvailability) {
          if (!avail?.startTime || !avail?.endTime) continue;
          
          const availStart = timeToMinutes(avail.startTime);
          const availEnd = timeToMinutes(avail.endTime);
          
          if (availEnd - availStart < provider.totalServiceDuration) {
            continue; // Período muito curto
          }
          
          // Verificar blocos livres
          let hasAvailableSlot = false;
          
          // Dividir o dia em slots de 15 minutos e verificar cada um
          for (let slotStart = availStart; slotStart + provider.totalServiceDuration <= availEnd; slotStart += 15) {
            const slotEnd = slotStart + provider.totalServiceDuration;
            
            // Verificar se o slot não conflita com períodos ocupados
            const isSlotFree = !occupiedBlocks.some(block => 
              slotStart < block.end && slotEnd > block.start
            );
            
            if (isSlotFree) {
              hasAvailableSlot = true;
              break;
            }
          }
          
          if (hasAvailableSlot) {
            return provider;
          }
        }
        
        // Se não encontrou slots livres
        console.log(`Prestador ${provider.id} não tem slots disponíveis para o serviço com duração ${provider.totalServiceDuration} na data ${date}`);
        return null;
      } catch (error) {
        console.error(`Erro ao verificar disponibilidade do prestador ${provider.id}:`, error);
        return null;
      }
    })
  );
  
  return results.filter(p => p !== null);
}

export default router;