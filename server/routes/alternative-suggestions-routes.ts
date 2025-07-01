/**
 * Rotas para sugestões alternativas de agendamento
 * 
 * Estas rotas permitem que o cliente solicite sugestões alternativas quando
 * sua opção de agendamento preferida não está disponível.
 */

import { Router } from 'express';
import { generateAlternativeSuggestions } from '../alternative-suggestions-service';
import { createLogger } from '../logger';
import { z } from 'zod';

const logger = createLogger('AlternativeSuggestionsRoutes');

export const alternativeSuggestionsRouter = Router();

// Schema para validar requisições de sugestões alternativas
const suggestionRequestSchema = z.object({
  providerId: z.number().optional(),
  serviceId: z.number().optional(),
  categoryId: z.number().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  reason: z.enum(['provider_unavailable', 'service_unavailable', 'time_unavailable', 'date_unavailable']).optional()
}).refine(data => {
  // Pelo menos um parâmetro deve ser fornecido
  return !!data.providerId || !!data.serviceId || !!data.categoryId || !!data.date;
}, {
  message: "Pelo menos um critério de busca deve ser fornecido (prestador, serviço, categoria ou data)"
});

// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated() && req.user) {
    return next();
  }
  return res.status(401).json({ error: "Não autorizado" });
};

// Middleware para verificar se o usuário é cliente
const isClient = (req: any, res: any, next: any) => {
  if (req.user && req.user.userType === "client") {
    return next();
  }
  return res.status(403).json({ error: "Permissão negada" });
};

/**
 * Rota para obter sugestões alternativas de agendamento
 * GET /api/suggestions/alternatives
 */
alternativeSuggestionsRouter.get('/alternatives', isAuthenticated, isClient, async (req, res) => {
  try {
    const queryParams = {
      providerId: req.query.providerId ? parseInt(req.query.providerId as string) : undefined,
      serviceId: req.query.serviceId ? parseInt(req.query.serviceId as string) : undefined,
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
      date: req.query.date as string | undefined,
      time: req.query.time as string | undefined,
      reason: req.query.reason as string | undefined
    };
    
    // Validar os parâmetros de consulta
    const validationResult = suggestionRequestSchema.safeParse(queryParams);
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Parâmetros inválidos", 
        details: validationResult.error.errors 
      });
    }
    
    // Obter sugestões alternativas
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Dados do usuário inválidos" });
    }
    
    const clientId = req.user.id;
    const suggestions = await generateAlternativeSuggestions({
      clientId,
      ...queryParams
    });
    
    // Retornar as sugestões agrupadas por tipo
    const groupedSuggestions = {
      date: suggestions.filter(s => s.type === 'date'),
      time: suggestions.filter(s => s.type === 'time'),
      provider: suggestions.filter(s => s.type === 'provider'),
      service: suggestions.filter(s => s.type === 'service')
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

/**
 * Rota para obter sugestões "Porque não tentar..." baseadas em critérios livres
 * GET /api/suggestions/try
 */
alternativeSuggestionsRouter.get('/try', isAuthenticated, isClient, async (req, res) => {
  try {
    const queryParams = {
      categoryId: req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined,
      timeOfDay: req.query.timeOfDay as 'morning' | 'afternoon' | 'evening' | undefined
    };
    
    // Esta rota é mais flexível e requer menos validação
    // pois é para sugestões exploratórias
    
    // Verificar se temos um usuário válido
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: "Dados do usuário inválidos" });
    }
    
    // Obter sugestões exploratórias
    const clientId = req.user.id;

    // Se temos categoria, buscar prestadores de destaque nessa categoria
    if (queryParams.categoryId) {
      const suggestions = await generateAlternativeSuggestions({
        clientId,
        categoryId: queryParams.categoryId
      });
      
      return res.json({
        totalSuggestions: suggestions.length,
        suggestions: suggestions.slice(0, 5)  // Limitar a 5 sugestões
      });
    }
    
    // Sem categoria, retornar sugestões genéricas
    res.json({
      message: "Para obter sugestões personalizadas, forneça pelo menos uma categoria.",
      suggestions: []
    });
    
  } catch (error) {
    logger.error(`Erro ao obter sugestões exploratórias: ${error}`);
    res.status(500).json({ error: "Erro ao processar sugestões" });
  }
});