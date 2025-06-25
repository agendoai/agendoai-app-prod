import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { createLogger } from '../logger';

const logger = createLogger('BookingSlotsRoutes');
export const bookingSlotsRouter = Router();

/**
 * Middleware para garantir que o usuário está autenticado
 */
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user) return next();
  return res.status(401).json({ error: "Não autorizado" });
};

/**
 * Middleware para garantir que o usuário é um cliente
 */
const isClient = (req: any, res: any, next: any) => {
  if (req.user?.userType === "client") return next();
  return res.status(403).json({ error: "Permissão negada" });
};

/**
 * Schema para validar a requisição de verificação de slots disponíveis
 */
const availableSlotsRequestSchema = z.object({
  serviceId: z.number(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  providerId: z.number().optional(),
  timeOfDay: z.enum(['morning', 'afternoon', 'evening']).optional()
});

/**
 * Rota para verificar slots disponíveis para um serviço específico
 */
bookingSlotsRouter.get('/available-slots', isAuthenticated, isClient, async (req, res) => {
  try {
    // Extrair e validar parâmetros da query
    const queryParams = {
      serviceId: req.query.serviceId ? parseInt(req.query.serviceId as string) : undefined,
      date: req.query.date as string | undefined,
      providerId: req.query.providerId ? parseInt(req.query.providerId as string) : undefined,
      timeOfDay: req.query.timeOfDay as 'morning' | 'afternoon' | 'evening' | undefined
    };

    const validationResult = availableSlotsRequestSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Parâmetros inválidos", 
        details: validationResult.error.errors 
      });
    }

    // Se chegou aqui, os parâmetros são válidos
    const { serviceId, date, providerId, timeOfDay } = queryParams;

    // Buscar o serviço
    const service = await storage.getService(serviceId!);
    if (!service) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    // Buscar slots disponíveis
    let availableSlots: Array<{
      startTime: string;
      endTime: string;
      providerId: number;
      serviceId: number;
    }> = [];

    if (providerId) {
      // Buscar slots específicos do prestador
      const provider = await storage.getProvider(providerId);
      if (!provider) {
        return res.status(404).json({ error: "Prestador não encontrado" });
      }

      try {
        // Buscar disponibilidade do prestador para a data específica
        const providerAvailability = await storage.getProviderAvailabilityByDate(providerId, date!);
        
        // Transformar a disponibilidade em slots com base na duração do serviço
        availableSlots = providerAvailability.map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime,
          providerId: providerId,
          serviceId: serviceId || 0
        }));
      } catch (error) {
        logger.error(`Erro ao buscar disponibilidade do prestador: ${error}`);
        // Em caso de erro, retorna uma lista vazia
        availableSlots = [];
      }
    } else {
      try {
        // Buscar prestadores que oferecem o serviço (aqui usamos uma consulta alternativa)
        const serviceProviders = await storage.getServiceProviders(serviceId!);
        
        // Para cada prestador, buscar slots disponíveis
        for (const provider of serviceProviders) {
          try {
            const providerAvailability = await storage.getProviderAvailabilityByDate(provider.providerId, date!);
            
            // Adicionar slots deste prestador ao resultado
            const providerSlots = providerAvailability.map(slot => ({
              startTime: slot.startTime,
              endTime: slot.endTime,
              providerId: provider.providerId,
              serviceId: serviceId || 0
            }));
            
            availableSlots = [...availableSlots, ...providerSlots];
          } catch (error) {
            logger.error(`Erro ao buscar disponibilidade para prestador ${provider.providerId}: ${error}`);
            // Continua para o próximo prestador
          }
        }
      } catch (error) {
        logger.error(`Erro ao buscar prestadores para o serviço: ${error}`);
        // Em caso de erro, retorna uma lista vazia
        availableSlots = [];
      }
    }

    // Filtrar slots por período do dia, se especificado
    if (timeOfDay) {
      const timeRanges = {
        morning: { start: 0, end: 12 },
        afternoon: { start: 12, end: 18 },
        evening: { start: 18, end: 24 }
      };

      const range = timeRanges[timeOfDay];
      
      availableSlots = availableSlots.filter(slot => {
        const hour = parseInt(slot.startTime.split(':')[0]);
        return hour >= range.start && hour < range.end;
      });
    }

    return res.json({ 
      totalSlots: availableSlots.length,
      service,
      date,
      availableSlots
    });
  } catch (error) {
    logger.error(`Erro ao buscar slots disponíveis: ${error}`);
    return res.status(500).json({ error: "Erro ao processar a requisição de slots disponíveis" });
  }
});

/**
 * Rota para verificar slots disponíveis de um prestador específico
 */
bookingSlotsRouter.post("/providers/:id/available-slots-check", isAuthenticated, isClient, async (req, res) => {
  try {
    const { date, serviceId, timeSlots } = req.body;
    if (!date || !serviceId || !timeSlots) {
      return res.status(400).json({ error: "Dados inválidos" });
    }

    const providerId = parseInt(req.params.id);
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      return res.status(404).json({ error: "Prestador não encontrado" });
    }

    // Simulando processamento de slots disponíveis
    // Na versão real, verificaria conflitos de agenda, bloqueios, etc.
    const availableSlots = timeSlots.filter((slot: any) => slot.startTime && slot.endTime);
    
    return res.json({ 
      providerId,
      serviceId,
      date,
      availableSlots
    });
  } catch (error) {
    logger.error(`Erro ao verificar slots do prestador: ${error}`);
    return res.status(500).json({ error: "Erro ao verificar slots do prestador" });
  }
});

/**
 * Rota para buscar sugestões alternativas de agendamento
 */
bookingSlotsRouter.get('/alternatives', isAuthenticated, isClient, async (req, res) => {
  try {
    const queryParams = {
      providerId: req.query.providerId ? parseInt(req.query.providerId as string) : undefined,
      serviceId: req.query.serviceId ? parseInt(req.query.serviceId as string) : undefined,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
      date: req.query.date as string | undefined,
      reason: req.query.reason as 'provider_unavailable' | 'service_unavailable' | 'time_unavailable' | 'date_unavailable' | undefined
    };

    const { providerId, serviceId, categoryId, date, reason } = queryParams;

    // Gerar sugestões alternativas com base nos parâmetros
    // Aqui seria implementada uma lógica mais complexa para sugestões inteligentes
    const alternativeDates = [];
    const today = new Date();
    
    // Gerar 3 datas alternativas próximas à data solicitada
    if (date) {
      const requestedDate = new Date(date);
      
      for (let i = 1; i <= 3; i++) {
        const nextDate = new Date(requestedDate);
        nextDate.setDate(nextDate.getDate() + i);
        
        if (nextDate > today) {
          alternativeDates.push({
            date: nextDate.toISOString().split('T')[0],
            reason: 'Data alternativa próxima'
          });
        }
      }
    }

    // Criar sugestões para retornar
    let suggestions = [];

    // Adicionar sugestões de datas alternativas
    suggestions = alternativeDates.map(alt => ({
      type: 'date',
      value: alt.date,
      reason: alt.reason
    }));

    // Se houver providerId e serviceId, adicionar sugestão de prestadores alternativos
    if (providerId && serviceId) {
      try {
        // Consultar prestadores que oferecem este serviço
        const serviceProviders = await storage.getServiceProviders(serviceId);
        
        // Obter informações completas de cada prestador
        const providerPromises = serviceProviders.map(sp => 
          storage.getProvider(sp.providerId)
        );
        
        const providers = await Promise.all(providerPromises);
        
        // Filtrar prestadores válidos (não nulos) e diferentes do atual
        const providerSuggestions = providers
          .filter(p => p && p.id !== providerId)
          .slice(0, 3)
          .map(p => ({
            type: 'provider',
            value: p!.id.toString(),
            name: p!.name,
            reason: 'Prestador alternativo disponível'
          }));
        
        suggestions = [...suggestions, ...providerSuggestions];
      } catch (error) {
        logger.error(`Erro ao buscar prestadores alternativos: ${error}`);
      }
    }

    // Agrupar sugestões por tipo para uma resposta mais estruturada
    const groupedSuggestions = {
      date: suggestions.filter(s => s.type === 'date'),
      provider: suggestions.filter(s => s.type === 'provider')
    };

    res.json({
      originalRequest: queryParams,
      totalSuggestions: suggestions.length,
      suggestions: groupedSuggestions
    });
  } catch (error) {
    logger.error(`Erro ao obter sugestões alternativas: ${error}`);
    res.status(500).json({ error: "Erro ao processar sugestões alternativas" });
  }
});

export default bookingSlotsRouter;