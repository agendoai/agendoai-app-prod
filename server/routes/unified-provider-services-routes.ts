/**
 * Rotas unificadas para gerenciamento de serviços de prestadores
 * 
 * Este módulo unifica as operações entre serviços normais e personalizados,
 * garantindo consistência nos dados e na interface.
 */

import { Router } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { insertProviderServiceSchema, type ProviderService } from '../../shared/schema';
import { getEnrichedProviderServices, updateOrCreateProviderService, removeProviderService } from '../services/provider-service-manager';

const router = Router();

/**
 * Rota para obter todos os serviços de um prestador com informações enriquecidas
 * GET /api/unified-services/provider/:providerId
 */
router.get('/provider/:providerId', async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    
    if (isNaN(providerId)) {
      return res.status(400).json({ error: 'ID do prestador inválido' });
    }
    
    // Determinar o tipo de usuário para enviar o contexto correto
    const userType = req.user?.userType || 'client';
    
    console.log(`[UNIFIED-SERVICES] Usuário do tipo ${userType} solicitando serviços do prestador ${providerId}`);
    
    // Passar o tipo de usuário para apresentar os dados adequados ao contexto
    const enrichedServices = await getEnrichedProviderServices(providerId, userType);
    return res.json(enrichedServices);
  } catch (error) {
    console.error('Erro ao buscar serviços do prestador:', error);
    return res.status(500).json({ 
      error: 'Erro ao buscar serviços do prestador',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});

/**
 * Rota para atualizar um serviço do prestador (regular ou personalizado)
 * PUT /api/unified-services/:serviceId
 */
router.put('/:serviceId', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.userType !== 'provider') {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const providerId = req.user.id;
    const serviceId = parseInt(req.params.serviceId);
    
    if (isNaN(serviceId)) {
      return res.status(400).json({ error: 'ID do serviço inválido' });
    }
    
    // Validar dados de entrada
    const schema = z.object({
      executionTime: z.number().min(5).max(480).optional(),
      breakTime: z.number().min(0).max(60).optional(),
      isActive: z.boolean().optional(),
      price: z.number().min(0).optional()
    });
    
    const validationResult = schema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos para atualização', 
        details: validationResult.error.errors 
      });
    }
    
    const { executionTime = 30, breakTime = 0, isActive = true, price } = validationResult.data;
    
    // Atualizar ou criar a personalização do serviço
    // Define um tipo explícito para o resultado
    const updatedService: ProviderService | null = await updateOrCreateProviderService(
      providerId,
      serviceId,
      executionTime,
      breakTime,
      isActive,
      price
    );
    
    // Buscar os dados enriquecidos do serviço atualizado
    const enrichedServices = await getEnrichedProviderServices(providerId, 'provider');
    const enrichedService = enrichedServices.find(s => 
      (s.isCustomized && updatedService && s.id === updatedService.id) ||
      (!s.isCustomized && s.id === serviceId)
    );
    
    return res.json(enrichedService || updatedService || { success: true, message: 'Serviço atualizado com sucesso' });
  } catch (error) {
    console.error('Erro ao atualizar serviço:', error);
    return res.status(500).json({ 
      error: 'Erro ao atualizar serviço', 
      details: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
});

/**
 * Rota para remover um serviço do catálogo do prestador
 * DELETE /api/unified-services/:serviceId
 */
router.delete('/:serviceId', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.userType !== 'provider') {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const providerId = req.user.id;
    const serviceId = parseInt(req.params.serviceId);
    
    if (isNaN(serviceId)) {
      return res.status(400).json({ error: 'ID do serviço inválido' });
    }
    
    // Opções de exclusão
    const hardDelete = req.query.hard === 'true';
    
    // Remover o serviço (personalizado ou regular)
    const result = await removeProviderService(providerId, serviceId, { hardDelete });
    
    return res.json(result);
  } catch (error) {
    console.error('Erro ao remover serviço:', error);
    return res.status(500).json({ 
      error: 'Erro ao remover serviço', 
      details: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
});

/**
 * Rota para adicionar um serviço regular ao catálogo do prestador
 * POST /api/unified-services
 */
router.post('/', async (req, res) => {
  try {
    if (!req.isAuthenticated() || req.user.userType !== 'provider') {
      return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const providerId = req.user.id;
    
    // Validar dados para um novo serviço
    const schema = z.object({
      name: z.string().min(3).max(100),
      description: z.string().optional(),
      categoryId: z.number().int().positive(),
      nicheId: z.number().int().positive().optional(),
      price: z.number().min(0),
      duration: z.number().min(5).max(480),
      isActive: z.boolean().optional(),
      executionTime: z.number().min(5).max(480).optional(),
      breakTime: z.number().min(0).max(60).optional()
    });
    
    const validationResult = schema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos para criação de serviço', 
        details: validationResult.error.errors 
      });
    }
    
    const data = validationResult.data;
    
    // Criar o serviço regular
    const newService = await storage.createService({
      providerId,
      name: data.name,
      description: data.description || "",
      categoryId: data.categoryId,
      nicheId: data.nicheId,
      price: data.price,
      duration: data.duration,
      isActive: data.isActive ?? true
    });
    
    // Se forneceu executionTime, criar personalização
    if (data.executionTime && data.executionTime !== data.duration) {
      await updateOrCreateProviderService(
        providerId,
        newService.id,
        data.executionTime,
        data.breakTime || 0,
        data.isActive ?? true,
        data.price  // Usar o mesmo preço inicial
      );
    }
    
    // Buscar dados enriquecidos do serviço criado
    const enrichedServices = await getEnrichedProviderServices(providerId, 'provider');
    const enrichedService = enrichedServices.find(s => s.id === newService.id);
    
    return res.status(201).json(enrichedService || newService);
  } catch (error) {
    console.error('Erro ao criar serviço:', error);
    return res.status(500).json({ 
      error: 'Erro ao criar serviço', 
      details: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
});

export default router;