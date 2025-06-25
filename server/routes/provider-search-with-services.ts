/**
 * Rota de pesquisa de prestadores por serviços e disponibilidade
 * 
 * Esta rota fornece uma API para buscar prestadores baseado em
 * serviços selecionados e sua disponibilidade
 */

import { Router } from 'express';
import { storage } from '../storage';

const router = Router();

/**
 * Rota para buscar prestadores por serviço e data
 * GET /api/providers/service-search?serviceId=1&date=2023-04-01
 * 
 * Retorna os prestadores que têm o serviço selecionado e disponibilidade na data
 */
router.get('/service-search', async (req, res) => {
  console.log('Chamando rota service-search com params:', req.query);
  try {
    const { serviceId, date, categoryId, nicheId } = req.query;
    
    if (!serviceId) {
      return res.status(400).json({ error: 'ID do serviço é obrigatório' });
    }
    
    // Validação do ID do serviço
    const serviceIdNum = parseInt(serviceId as string);
    if (isNaN(serviceIdNum)) {
      return res.status(400).json({ error: 'ID do serviço inválido' });
    }
    
    // Validação da data (se fornecida)
    let selectedDate: Date | undefined;
    if (date) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(date as string)) {
        return res.status(400).json({ error: 'Formato de data inválido. Use YYYY-MM-DD' });
      }
      selectedDate = new Date(date as string);
      
      // Verificar se a data é válida
      if (isNaN(selectedDate.getTime())) {
        return res.status(400).json({ error: 'Data inválida' });
      }
    }
    
    // Extrair o dia da semana (0-6, sendo 0 = Domingo)
    const dayOfWeek = selectedDate ? selectedDate.getDay() : undefined;
    
    console.log(`Buscando prestadores para o serviço ${serviceIdNum} no dia ${dayOfWeek}`);
    
    // Buscar o serviço para obter sua duração
    let serviceDuration = 0;
    let serviceTemplate = await storage.getServiceTemplate(serviceIdNum);
    
    if (serviceTemplate) {
      serviceDuration = serviceTemplate.duration || 60; // Padrão de 60 minutos
      console.log(`Serviço ${serviceIdNum} tem duração padrão de ${serviceDuration} minutos`);
    } else {
      // Tentar buscar do modelo de serviço legado
      const service = await storage.getService(serviceIdNum);
      if (service) {
        serviceDuration = service.duration || 60;
        console.log(`Serviço legado ${serviceIdNum} tem duração de ${serviceDuration} minutos`);
      } else {
        return res.status(404).json({ error: 'Serviço não encontrado' });
      }
    }
    
    // Buscar todos os prestadores ativos
    const allUsers = await storage.getAllUsers();
    const activeProviders = allUsers.filter(user => 
      user.userType === 'provider' && user.isActive !== false
    );
    
    console.log(`Total de prestadores ativos: ${activeProviders.length}`);
    
    // Filtrar por categoria ou nicho, se fornecidos
    let filteredProviders = [...activeProviders];
    
    // Filtrar prestadores que oferecem este serviço
    const providersWithService = await Promise.all(
      filteredProviders.map(async (provider) => {
        // Verificar se o prestador oferece o serviço
        const providerServices = await storage.getProviderServicesByProvider(provider.id);
        const hasService = providerServices.some(ps => ps.serviceId === serviceIdNum);
        
        if (!hasService) {
          console.log(`Prestador ${provider.id} não oferece o serviço ${serviceIdNum}`);
          return null;
        }
        
        // Se dayOfWeek for definido, verificar disponibilidade
        if (dayOfWeek !== undefined) {
          // Buscar disponibilidade do prestador para este dia
          const availability = await storage.getAvailabilityByDay(provider.id, dayOfWeek);
          
          if (!availability || availability.length === 0) {
            console.log(`Prestador ${provider.id} não tem disponibilidade para o dia ${dayOfWeek}`);
            return null;
          }
          
          // Verificar se há pelo menos um período disponível longo o suficiente
          const hasLongEnoughSlot = availability.some(slot => {
            const startParts = slot.startTime.split(':').map(Number);
            const endParts = slot.endTime.split(':').map(Number);
            
            const startMinutes = startParts[0] * 60 + startParts[1];
            const endMinutes = endParts[0] * 60 + endParts[1];
            
            return endMinutes - startMinutes >= serviceDuration;
          });
          
          if (!hasLongEnoughSlot) {
            console.log(`Prestador ${provider.id} não tem blocos longos o suficiente para o serviço de ${serviceDuration} minutos`);
            return null;
          }
        }
        
        // Buscar detalhes adicionais do prestador
        const settings = await storage.getProviderSettings(provider.id);
        
        // Verificar a duração personalizada do serviço para este prestador
        const providerService = providerServices.find(ps => ps.serviceId === serviceIdNum);
        const customServiceDuration = providerService ? providerService.executionTime : serviceDuration;
        
        // Retornar prestador com informações adicionais
        return {
          ...provider,
          settings,
          serviceDuration: customServiceDuration
        };
      })
    );
    
    // Filtrar nulos e ordenar por avaliação
    const validProviders = providersWithService
      .filter(p => p !== null)
      .sort((a, b) => (b?.settings?.rating || 0) - (a?.settings?.rating || 0));
    
    console.log(`Prestadores disponíveis para o serviço: ${validProviders.length}`);
    
    // Retornar resultado
    res.json({
      providers: validProviders,
      totalResults: validProviders.length,
      filters: {
        serviceId: serviceIdNum,
        date: date ? (date as string) : undefined,
        dayOfWeek
      }
    });
    
  } catch (error) {
    console.error('Erro na pesquisa de prestadores por serviço:', error);
    res.status(500).json({ 
      error: 'Erro ao buscar prestadores', 
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;