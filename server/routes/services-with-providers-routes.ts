import { Router } from 'express';
import { storage } from '../storage';

// Criar um router para as novas rotas de serviços
const servicesWithProvidersRouter = Router();

// Rota para obter todos os serviços de um prestador (incluindo serviços personalizados)
servicesWithProvidersRouter.get('/provider/:providerId', async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    
    if (isNaN(providerId)) {
      return res.status(400).json({ error: 'ID do prestador inválido' });
    }
    
    console.log(`[ALL-SERVICES] Buscando todos os serviços para o prestador ID ${providerId}`);
    
    // 1. Buscar serviços diretos do prestador (tabela services)
    const directServices = await storage.getServicesByProviderId(providerId);
    console.log(`[ALL-SERVICES] Serviços diretos encontrados: ${directServices.length}`);
    
    // 2. Buscar serviços personalizados do prestador (tabela provider_services)
    const providerServices = await storage.getProviderServices(providerId);
    console.log(`[ALL-SERVICES] Serviços personalizados encontrados: ${providerServices.length}`);
    
    // 3. Para cada serviço personalizado, buscar os detalhes do serviço base
    const serviceDetails = [];
    
    // Adicionar serviços personalizados com informações completas
    for (const providerService of providerServices) {
      const baseService = await storage.getService(providerService.serviceId);
      
      if (baseService) {
        serviceDetails.push({
          id: providerService.id,
          providerId: providerService.providerId,
          serviceId: providerService.serviceId,
          name: baseService.name,
          description: baseService.description,
          categoryId: baseService.categoryId,
          nicheId: baseService.nicheId,
          price: baseService.price,
          defaultDuration: baseService.duration,
          executionTime: providerService.executionTime,
          breakTime: providerService.breakTime || 0,
          isActive: providerService.isActive,
          isCustomized: true,
          createdAt: providerService.createdAt
        });
      }
    }
    
    // Verificar quais serviços diretos não têm equivalente personalizado
    const customizedServiceIds = new Set(providerServices.map(ps => ps.serviceId));
    
    // Adicionar serviços diretos que não têm versão personalizada
    for (const directService of directServices) {
      if (!customizedServiceIds.has(directService.id)) {
        serviceDetails.push({
          id: directService.id,
          providerId: directService.providerId,
          serviceId: directService.id,
          name: directService.name,
          description: directService.description,
          categoryId: directService.categoryId,
          nicheId: directService.nicheId,
          price: directService.price,
          defaultDuration: directService.duration,
          executionTime: directService.duration,
          breakTime: 0,
          isActive: directService.isActive,
          isCustomized: false,
          createdAt: directService.createdAt
        });
      }
    }
    
    console.log(`[ALL-SERVICES] Total de serviços combinados: ${serviceDetails.length}`);
    
    // Ordenar por nome
    serviceDetails.sort((a, b) => a.name.localeCompare(b.name));
    
    return res.json(serviceDetails);
  } catch (error) {
    console.error('[ALL-SERVICES] Erro ao buscar serviços:', error);
    res.status(500).json({ error: 'Erro ao buscar serviços do prestador' });
  }
});

export default servicesWithProvidersRouter;