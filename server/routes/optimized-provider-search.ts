import { Router, Request, Response } from 'express';
import { storage } from '../storage';

const router = Router();

// Função auxiliar para converter horário para minutos
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

// Função auxiliar para verificar disponibilidade do prestador
async function checkProviderAvailability(providerId: number, date: string, services: any[]): Promise<boolean> {
  try {
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // Buscar disponibilidade específica para a data
    const specificAvailability = await storage.getAvailabilityByDate(providerId, date);
    
    // Se não há disponibilidade específica, verificar disponibilidade semanal
    if (!specificAvailability || (Array.isArray(specificAvailability) && specificAvailability.length === 0)) {
      const weeklyAvailability = await storage.getAvailabilityByDay(providerId, dayOfWeek);
      if (!weeklyAvailability || (Array.isArray(weeklyAvailability) && weeklyAvailability.length === 0)) {
        return false;
      }
    }

    // Verificar se há blocos de tempo suficientes para pelo menos um serviço
    const allAvailability = specificAvailability || await storage.getAvailabilityByDay(providerId, dayOfWeek);
    
    // Garantir que allAvailability seja um array
    const availabilityArray = Array.isArray(allAvailability) ? allAvailability : [allAvailability];
    
    for (const service of services) {
      const serviceDuration = service.duration || 30;
      
      const hasAvailableBlock = availabilityArray.some((avail: any) => {
        const startMinutes = timeToMinutes(avail.startTime);
        const endMinutes = timeToMinutes(avail.endTime);
        const availableDuration = endMinutes - startMinutes;
        
        return availableDuration >= serviceDuration;
      });

      if (hasAvailableBlock) {
        return true;
      }
    }

    return false;

  } catch (error) {
    console.error(`Erro ao verificar disponibilidade do prestador ${providerId}:`, error);
    return false;
  }
}

// Endpoint otimizado para busca de prestadores
router.get("/search", async (req: Request, res: Response) => {
  try {
    const {
      q, // query de busca
      nicheId,
      categoryId,
      serviceId,
      minRating,
      maxDistance,
      date,
      page = "1",
      limit = "20"
    } = req.query;

    console.log("🔍 Busca de prestadores iniciada:", {
      query: q,
      nicheId,
      categoryId,
      serviceId,
      minRating,
      maxDistance,
      date,
      page,
      limit
    });

    // Validação e conversão de parâmetros
    const searchQuery = (q as string)?.trim() || "";
    const pageNum = Math.max(1, parseInt(page as string) || 1);
    const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 20));
    const offset = (pageNum - 1) * limitNum;

    // Validação de parâmetros numéricos
    const filters = {
      nicheId: nicheId ? parseInt(nicheId as string) : null,
      categoryId: categoryId ? parseInt(categoryId as string) : null,
      serviceId: serviceId ? parseInt(serviceId as string) : null,
      minRating: minRating ? parseInt(minRating as string) : 0,
      maxDistance: maxDistance ? parseInt(maxDistance as string) : 50,
      date: date as string || null
    };

    // Validar parâmetros
    for (const [key, value] of Object.entries(filters)) {
      if (value !== null && isNaN(value as number)) {
        return res.status(400).json({ 
          error: `Parâmetro inválido: ${key}` 
        });
      }
    }

    // Validar formato da data
    if (filters.date) {
      const datePattern = /^\d{4}-\d{2}-\d{2}$/;
      if (!datePattern.test(filters.date)) {
        return res.status(400).json({ 
          error: "Formato de data inválido. Use YYYY-MM-DD" 
        });
      }
    }

    // Buscar prestadores ativos
    let providers = await storage.getUsersByType("provider");
    console.log(`📊 Total de prestadores ativos: ${providers.length}`);

    // Aplicar filtros em paralelo para melhor performance
    const filteredProviders = await Promise.all(
      providers.map(async (provider) => {
        try {
          // 1. Filtro por texto de busca
          if (searchQuery) {
            const settings = await storage.getProviderSettings(provider.id);
            const matchesSearch = 
              provider.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
              settings?.businessName?.toLowerCase().includes(searchQuery.toLowerCase());
            
            if (!matchesSearch) return null;
          }

          // 2. Buscar serviços do prestador
          const services = await storage.getServicesByProvider(provider.id);
          const activeServices = services.filter(service => service.isActive);

          if (activeServices.length === 0) {
            console.log(`❌ Prestador ${provider.id} não tem serviços ativos`);
            return null;
          }

          // 3. Aplicar filtros de serviço
          let filteredServices = activeServices;

          if (filters.serviceId) {
            filteredServices = filteredServices.filter(s => s.serviceId === filters.serviceId);
          } else if (filters.categoryId) {
            // Para filtrar por categoria, precisamos buscar os serviços completos
            const fullServices = await Promise.all(
              filteredServices.map(async (ps) => {
                const service = await storage.getService(ps.serviceId);
                return { ...ps, service };
              })
            );
            filteredServices = fullServices.filter(s => s.service?.categoryId === filters.categoryId);
          } else if (filters.nicheId) {
            const categoriesOfNiche = await storage.getCategoriesByNicheId(filters.nicheId);
            const categoryIds = categoriesOfNiche.map(cat => cat.id);
            
            // Para filtrar por nicho, precisamos buscar os serviços completos
            const fullServices = await Promise.all(
              filteredServices.map(async (ps) => {
                const service = await storage.getService(ps.serviceId);
                return { ...ps, service };
              })
            );
            filteredServices = fullServices.filter(s => s.service && categoryIds.includes(s.service.categoryId));
          }

          if (filteredServices.length === 0) {
            console.log(`❌ Prestador ${provider.id} não atende aos filtros de serviço`);
            return null;
          }

          // 4. Buscar configurações do prestador
          const settings = await storage.getProviderSettings(provider.id);

          // 5. Filtro por avaliação
          if (filters.minRating > 0 && (!settings?.rating || settings.rating < filters.minRating)) {
            console.log(`❌ Prestador ${provider.id} não atende à avaliação mínima`);
            return null;
          }

          // 6. Verificar disponibilidade na data (se especificada)
          if (filters.date) {
            const isAvailable = await checkProviderAvailability(provider.id, filters.date, filteredServices);
            if (!isAvailable) {
              console.log(`❌ Prestador ${provider.id} não disponível na data ${filters.date}`);
              return null;
            }
          }

          // 7. Calcular distância (simulada)
          const distance = Math.random() * 15; // 0-15km
          if (distance > filters.maxDistance) {
            console.log(`❌ Prestador ${provider.id} fora da distância máxima`);
            return null;
          }

          console.log(`✅ Prestador ${provider.id} aprovado em todos os filtros`);
          return {
            ...provider,
            settings,
            services: filteredServices,
            distance: Math.round(distance * 10) / 10 // Arredondar para 1 casa decimal
          };

        } catch (error) {
          console.error(`❌ Erro ao processar prestador ${provider.id}:`, error);
          return null;
        }
      })
    );

    // Remover nulls e aplicar paginação
    const validProviders = filteredProviders.filter(p => p !== null);
    const totalResults = validProviders.length;
    const paginatedProviders = validProviders.slice(offset, offset + limitNum);

    console.log(`📈 Resultados: ${paginatedProviders.length}/${totalResults} prestadores`);

    // Retornar resposta com metadados
    res.json({
      providers: paginatedProviders,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalResults,
        totalPages: Math.ceil(totalResults / limitNum),
        hasNext: offset + limitNum < totalResults,
        hasPrev: pageNum > 1
      },
      filters: {
        searchQuery,
        ...filters
      }
    });

  } catch (error) {
    console.error("💥 Erro na busca de prestadores:", error);
    res.status(500).json({ 
      error: "Falha ao buscar prestadores",
      details: error instanceof Error ? error.message : "Erro desconhecido"
    });
  }
});

export default router; 