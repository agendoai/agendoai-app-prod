import { Router } from 'express';
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
 * Rota para verificar slots disponíveis para um serviço específico
 */
bookingSlotsRouter.get('/available-slots', isAuthenticated, isClient, async (req, res) => {
  try {
    // Extrair parâmetros da query
    const serviceId = req.query.serviceId ? parseInt(req.query.serviceId as string) : undefined;
    const date = req.query.date as string | undefined;
    const providerId = req.query.providerId ? parseInt(req.query.providerId as string) : undefined;
    
    // Validar parâmetros obrigatórios
    if (!serviceId || !date) {
      return res.status(400).json({ 
        error: "Parâmetros inválidos", 
        message: "serviceId e date são obrigatórios"
      });
    }

    // Buscar o serviço
    const service = await storage.getService(serviceId);
    if (!service) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    // Array para armazenar slots disponíveis
    let availableSlots: any[] = [];

    // Buscar prestadores para este serviço
    try {
      const providers = await storage.getProvidersByService(serviceId);
      
      // Se fornecido um ID de prestador específico, filtrar apenas esse
      const providersToProcess = providerId 
        ? providers.filter(p => p.id === providerId) 
        : providers;
      
      if (providersToProcess.length === 0) {
        return res.json({
          totalSlots: 0,
          service,
          date,
          message: providerId ? "Prestador não encontrado para este serviço" : "Nenhum prestador disponível para este serviço",
          availableSlots: []
        });
      }
      
      // Para simplificação, vamos retornar slots fictícios para o(s) prestador(es)
      for (const provider of providersToProcess) {
        const mockSlots = [
          { startTime: "09:00", endTime: "10:00" },
          { startTime: "10:30", endTime: "11:30" },
          { startTime: "13:00", endTime: "14:00" },
          { startTime: "14:30", endTime: "15:30" }
        ].map(slot => ({
          ...slot,
          providerId: provider.id,
          serviceId: serviceId,
          date: date
        }));
        
        availableSlots = [...availableSlots, ...mockSlots];
      }
    } catch (error) {
      logger.error(`Erro ao buscar prestadores para o serviço: ${error}`);
      return res.status(500).json({ error: "Erro ao buscar prestadores para o serviço" });
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
 * Rota para buscar sugestões alternativas de agendamento
 */
bookingSlotsRouter.get('/alternatives', isAuthenticated, isClient, async (req, res) => {
  try {
    const providerId = req.query.providerId ? parseInt(req.query.providerId as string) : undefined;
    const serviceId = req.query.serviceId ? parseInt(req.query.serviceId as string) : undefined;
    const date = req.query.date as string | undefined;
    
    // Criar sugestões para retornar
    let suggestions = [];

    // Adicionar sugestões de datas alternativas
    if (date) {
      const alternativeDates = [];
      const requestedDate = new Date(date);
      
      for (let i = 1; i <= 3; i++) {
        const nextDate = new Date(requestedDate);
        nextDate.setDate(nextDate.getDate() + i);
        
        alternativeDates.push({
          date: nextDate.toISOString().split('T')[0],
          reason: 'Data alternativa próxima'
        });
      }
      
      suggestions = alternativeDates.map(alt => ({
        type: 'date',
        value: alt.date,
        reason: alt.reason
      }));
    }

    // Se houver providerId e serviceId, adicionar sugestão de prestadores alternativos
    if (providerId && serviceId) {
      try {
        // Buscar prestadores que oferecem o serviço
        const providers = await storage.getProvidersByService(serviceId);
        
        // Filtrar prestadores diferentes do atual
        const providerSuggestions = providers
          .filter(p => p.id !== providerId)
          .slice(0, 3)
          .map(p => ({
            type: 'provider',
            value: p.id.toString(),
            name: p.name,
            reason: 'Prestador alternativo disponível'
          }));
        
        suggestions = [...suggestions, ...providerSuggestions];
      } catch (error) {
        logger.error(`Erro ao buscar prestadores alternativos: ${error}`);
      }
    }

    // Agrupar sugestões por tipo
    const groupedSuggestions = {
      date: suggestions.filter(s => s.type === 'date'),
      provider: suggestions.filter(s => s.type === 'provider')
    };

    res.json({
      totalSuggestions: suggestions.length,
      suggestions: groupedSuggestions
    });
  } catch (error) {
    logger.error(`Erro ao obter sugestões alternativas: ${error}`);
    res.status(500).json({ error: "Erro ao processar sugestões alternativas" });
  }
});

export default bookingSlotsRouter;