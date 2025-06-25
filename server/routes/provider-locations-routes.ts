/**
 * Rotas para o mapa de calor de disponibilidade baseado em geolocalização
 */
import { Router } from 'express';
import { getProviderLocations } from '../services/provider-location-service';

export const providerLocationsRouter = Router();

// Rota para obter todas as localizações dos prestadores com informações de disponibilidade
providerLocationsRouter.get('/', async (req, res) => {
  try {
    const { serviceId, categoryId, date } = req.query;
    
    // Converter parâmetros para o tipo correto
    const serviceIdNum = serviceId ? parseInt(serviceId as string) : undefined;
    const categoryIdNum = categoryId ? parseInt(categoryId as string) : undefined;
    const dateStr = date as string | undefined;
    
    // Buscar localizações dos prestadores
    const locations = await getProviderLocations(
      serviceIdNum, 
      categoryIdNum, 
      dateStr
    );
    
    res.json(locations);
  } catch (error) {
    console.error('Erro ao obter localizações dos prestadores:', error);
    res.status(500).json({ 
      error: 'Falha ao buscar localizações dos prestadores',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});