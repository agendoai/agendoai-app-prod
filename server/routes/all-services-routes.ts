import { Router } from 'express';
import { storage } from '../storage';
import { z } from 'zod';

export const allServicesRouter = Router();

/**
 * Rota para obter todos os serviços de um prestador, 
 * combinando dados de serviços básicos e serviços específicos do prestador
 */
allServicesRouter.get('/provider/:providerId', async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    
    if (isNaN(providerId)) {
      return res.status(400).json({ message: "ID do prestador inválido" });
    }
    
    // Buscar serviços diretos do prestador
    const providerServices = await storage.getProviderServicesByProviderId(providerId);
    
    // Buscar todos os serviços do prestador
    const services = await storage.getServicesByProviderId(providerId);
    
    // Criar um mapa para serviços do prestador para acesso rápido
    const providerServiceMap = new Map();
    for (const provService of providerServices) {
      providerServiceMap.set(provService.serviceId, provService);
    }
    
    // Combinar os dados
    const combinedServices = services.map(service => {
      const providerService = providerServiceMap.get(service.id);
      
      return {
        serviceId: service.id,
        name: service.name,
        description: service.description,
        categoryId: service.categoryId,
        nicheId: service.nicheId,
        providerId: service.providerId,
        isActive: service.isActive,
        
        // Valores específicos do prestador, se disponíveis
        executionTime: providerService?.executionTime || service.duration,
        breakTime: providerService?.breakTime || 0,
        price: service.price,
        defaultDuration: service.duration
      };
    });
    
    console.log(`API Combinada: Retornando ${combinedServices.length} serviços para o prestador ${providerId}`);
    
    return res.json(combinedServices);
  } catch (error) {
    console.error('Erro ao buscar serviços do prestador:', error);
    return res.status(500).json({ message: "Erro ao buscar serviços do prestador" });
  }
});