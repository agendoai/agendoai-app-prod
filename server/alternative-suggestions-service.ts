/**
 * Serviço de Sugestões Alternativas
 * 
 * Este serviço fornece sugestões alternativas de horários e prestadores
 * quando as opções preferidas não estão disponíveis, usando dados históricos
 * e análise contextual para maximizar a relevância das sugestões.
 */

import { db } from "./db";
import { 
  appointments, 
  users, 
  services, 
  availability,
  categories,
  niches,
  reviews
} from "@shared/schema";
import { eq, and, gte, lt, desc, sql, or, between, like } from "drizzle-orm";
import { createLogger } from "./logger";
import { storage } from "./storage";
import { analyzeAndRecommendTimeSlots } from "./ai-scheduling-service";

// Adicionar as funções auxiliares para conversão de tempo
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

const logger = createLogger("AlternativeSuggestions");

export interface AlternativeSuggestion {
  type: 'date' | 'provider' | 'time' | 'service';
  score: number;
  providerId?: number;
  providerName?: string;
  providerAvatar?: string | null;
  providerRating?: number;
  serviceId?: number;
  serviceName?: string;
  date?: string;
  time?: string;
  reason: string;
  originalRequest: {
    providerId?: number;
    serviceId?: number;
    date?: string;
    time?: string;
  };
}

interface SuggestionRequest {
  clientId: number;
  providerId?: number;
  serviceId?: number;
  categoryId?: number;
  date?: string;
  time?: string;
  reason?: string;
}

/**
 * Gera sugestões alternativas baseadas nos parâmetros da solicitação original
 * 
 * Este sistema inclui um mecanismo de fallback robusto que garante que sugestões 
 * úteis serão apresentadas mesmo quando ocorrerem erros em partes específicas do processo.
 * Implementa múltiplas estratégias independentes para maximizar a confiabilidade.
 * 
 * @param request Parâmetros da solicitação original
 * @returns Lista de sugestões alternativas ordenadas por relevância
 */
export async function generateAlternativeSuggestions(
  request: SuggestionRequest
): Promise<AlternativeSuggestion[]> {
  logger.info(`Gerando sugestões alternativas para: ${JSON.stringify(request)}`);
  
  try {
    const suggestions: AlternativeSuggestion[] = [];
    
    // Obter informações do cliente para contexto
    const client = await storage.getUser(request.clientId).catch(err => {
      logger.error(`Erro ao buscar cliente: ${err}`);
      return null;
    });
    
    if (!client) {
      logger.error(`Cliente ${request.clientId} não encontrado ou erro ao buscar`);
      // Fallback: retornar sugestões genéricas mesmo sem dados do cliente
      return getFallbackSuggestions(request);
    }
    
    // 1. Se temos prestador e serviço, mas o horário não está disponível
    if (request.providerId && request.serviceId && request.date) {
      await addAlternativeDateSuggestions(suggestions, request);
      await addAlternativeTimeSuggestions(suggestions, request);
    }
    
    // 2. Se temos categoria e serviço, mas não prestador ou o prestador não está disponível
    if ((request.categoryId || request.serviceId) && (!request.providerId || request.reason === 'provider_unavailable')) {
      await addAlternativeProviderSuggestions(suggestions, request);
    }
    
    // 3. Se temos prestador, mas não serviço (ou serviço indisponível)
    if (request.providerId && (!request.serviceId || request.reason === 'service_unavailable')) {
      await addAlternativeServiceSuggestions(suggestions, request);
    }
    
    // Ordenar sugestões por score (maior para menor)
    return suggestions.sort((a, b) => b.score - a.score);
    
  } catch (error) {
    logger.error(`Erro ao gerar sugestões alternativas: ${error}`);
    // Mesmo com erro, tentamos retornar algumas sugestões genéricas
    return getFallbackSuggestions(request);
  }
}

/**
 * Função de fallback para garantir que sempre tenhamos sugestões,
 * mesmo quando ocorrerem erros nas estratégias principais
 */
function getFallbackSuggestions(request: SuggestionRequest): AlternativeSuggestion[] {
  try {
    const suggestions: AlternativeSuggestion[] = [];
    const today = new Date();
    
    // 1. Sugestões de datas alternativas genéricas
    for (let i = 1; i <= 3; i++) {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      const dateString = nextDate.toISOString().split('T')[0];
      
      suggestions.push({
        type: 'date',
        score: 80 - (i * 5),
        date: dateString,
        reason: `Experimente agendar para ${formatDate(dateString)}`,
        originalRequest: {
          date: request.date
        }
      });
    }
    
    // 2. Sugestões de horários populares
    const popularTimes = ['09:00', '14:00', '16:00'];
    if (request.providerId && request.serviceId) {
      popularTimes.forEach((time, index) => {
        suggestions.push({
          type: 'time',
          score: 75 - (index * 5),
          providerId: request.providerId,
          serviceId: request.serviceId,
          date: request.date,
          time,
          reason: `${time} é um horário popular para este serviço`,
          originalRequest: {
            providerId: request.providerId,
            serviceId: request.serviceId,
            date: request.date,
            time: request.time
          }
        });
      });
    }
    
    return suggestions;
  } catch (error) {
    logger.error(`Erro até mesmo no fallback de sugestões: ${error}`);
    // Em caso de falha completa, retornar array vazio
    return [];
  }
}

/**
 * Implementação simplificada para encontrar os melhores prestadores
 * para um serviço/categoria específica
 */
async function findTopProviders(
  clientId: number,
  serviceId?: number,
  categoryId?: number,
  limit: number = 5
): Promise<any[]> {
  try {
    let providerIds = new Set<number>();
    
    if (serviceId) {
      // Buscar prestadores que oferecem este serviço específico
      const serviceProviders = await storage.getProvidersByService(serviceId);
      serviceProviders.forEach((provider: any) => {
        providerIds.add(provider.id);
      });
    } else if (categoryId) {
      // Se não temos serviço mas temos categoria, buscar serviços da categoria
      // e então buscar prestadores para cada serviço
      const categoryServices = await storage.getServicesByCategory(categoryId);
      
      // Buscar prestadores para cada serviço da categoria
      for (const service of categoryServices) {
        const serviceProviders = await storage.getProvidersByService(service.id);
        serviceProviders.forEach((provider: any) => {
          providerIds.add(provider.id);
        });
      }
    } else {
      // Se não temos nem serviço nem categoria, retornar vazio
      return [];
    }
    
    // Converter o conjunto para array
    const uniqueProviderIds = Array.from(providerIds);
    
    // Buscar dados completos e criar objetos enriquecidos
    const providersWithData = await Promise.all(
      uniqueProviderIds.map(async (id: number) => {
        const provider = await storage.getProvider(id);
        if (!provider) return null;
        
        // Buscar avaliações do prestador para calcular média
        const ratings = await db.query.reviews.findMany({
          where: eq(reviews.providerId, id)
        });
        
        const avgRating = ratings.length > 0
          ? ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length
          : 0;
        
        // Calculamos um score baseado na avaliação
        const score = Math.min(85 + (avgRating * 3), 100);
        
        return {
          id: provider.id,
          name: provider.name || 'Prestador',
          // Usar a propriedade correta para a imagem do perfil
          avatar: provider.profileImage || null,
          rating: avgRating,
          score
        };
      })
    );
    
    // Filtrar null values, ordenar por score e limitar
    return providersWithData
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .sort((a: any, b: any) => b.score - a.score)
      .slice(0, limit);
    
  } catch (error) {
    logger.error(`Erro ao buscar providers: ${error}`);
    return [];
  }
}

/**
 * Adiciona sugestões de datas alternativas para o mesmo prestador e serviço
 */
async function addAlternativeDateSuggestions(
  suggestions: AlternativeSuggestion[],
  request: SuggestionRequest
): Promise<void> {
  try {
    if (!request.providerId || !request.serviceId || !request.date) return;
    
    // Buscar o serviço para obter duração
    const service = await storage.getService(request.serviceId);
    if (!service) return;
    
    // Buscar o prestador para mostrar informações relevantes
    const provider = await storage.getProvider(request.providerId);
    if (!provider) return;
    
    // Obter próximas 7 datas disponíveis a partir do dia seguinte
    const currentDate = new Date(request.date);
    const futureDates: string[] = [];
    
    // Buscar datas para os próximos 14 dias
    for (let i = 1; i <= 14; i++) {
      const nextDate = new Date(currentDate);
      nextDate.setDate(currentDate.getDate() + i);
      const dateString = nextDate.toISOString().split('T')[0];
      
      // Verificar se esta data tem slots disponíveis
      const slots = await storage.getAvailableTimeSlots(
        request.providerId, 
        dateString, 
        request.serviceId
      );
      
      // Se houver slots disponíveis, adicionar à lista
      if (slots && slots.some(slot => slot.isAvailable)) {
        futureDates.push(dateString);
        
        // Parar quando encontrarmos 3 datas disponíveis
        if (futureDates.length >= 3) break;
      }
    }
    
    // Gerar sugestões para as datas disponíveis
    futureDates.forEach((date, index) => {
      // Calcular score baseado na proximidade (mais próximo = score maior)
      const score = 90 - (index * 5);
      
      const suggestion: AlternativeSuggestion = {
        type: 'date',
        score,
        providerId: request.providerId,
        providerName: provider.name || '',
        providerAvatar: provider.profileImage,
        serviceId: request.serviceId,
        serviceName: service.name,
        date,
        reason: `${provider.name} tem horários disponíveis em ${formatDate(date)}`,
        originalRequest: {
          providerId: request.providerId,
          serviceId: request.serviceId,
          date: request.date
        }
      };
      
      suggestions.push(suggestion);
    });
    
  } catch (error) {
    logger.error(`Erro ao gerar sugestões de datas alternativas: ${error}`);
  }
}

/**
 * Adiciona sugestões de horários alternativos para o mesmo prestador, serviço e data
 */
async function addAlternativeTimeSuggestions(
  suggestions: AlternativeSuggestion[],
  request: SuggestionRequest
): Promise<void> {
  try {
    if (!request.providerId || !request.serviceId || !request.date) return;
    
    // Buscar o serviço para obter duração
    const service = await storage.getService(request.serviceId);
    if (!service) return;
    
    // Buscar o prestador para mostrar informações relevantes
    const provider = await storage.getProvider(request.providerId);
    if (!provider) return;
    
    // Obter todos os slots disponíveis para esta data
    const slots = await storage.getAvailableTimeSlots(
      request.providerId, 
      request.date, 
      request.serviceId
    );
    
    // Filtrar apenas os slots disponíveis
    const availableSlots = slots.filter(slot => slot.isAvailable);
    
    if (availableSlots.length === 0) return;
    
    // Tentar usar IA para recomendar os melhores horários
    try {
      const recommendations = await analyzeAndRecommendTimeSlots({
        clientId: request.clientId,
        providerId: request.providerId,
        serviceId: request.serviceId,
        date: request.date,
        availableSlots: availableSlots.map(slot => ({
          startTime: slot.startTime,
          endTime: slot.endTime
        }))
      });
      
      // Limitar a 3 recomendações
      const topRecommendations = recommendations.slice(0, 3);
      
      topRecommendations.forEach((rec, index) => {
        suggestions.push({
          type: 'time',
          score: rec.score,
          providerId: request.providerId,
          providerName: provider.name || '',
          providerAvatar: provider.profileImage,
          serviceId: request.serviceId,
          serviceName: service.name,
          date: request.date,
          time: rec.slot.startTime,
          reason: rec.reason,
          originalRequest: {
            providerId: request.providerId,
            serviceId: request.serviceId,
            date: request.date,
            time: request.time
          }
        });
      });
      
    } catch (error) {
      logger.error(`Erro ao obter recomendações de IA para horários: ${error}`);
      
      // Fallback: Usar os 3 primeiros slots disponíveis
      availableSlots.slice(0, 3).forEach((slot, index) => {
        suggestions.push({
          type: 'time',
          score: 85 - (index * 5),
          providerId: request.providerId,
          providerName: provider.name || '',
          providerAvatar: provider.profileImage,
          serviceId: request.serviceId,
          serviceName: service.name,
          date: request.date,
          time: slot.startTime,
          reason: `Horário disponível às ${slot.startTime}`,
          originalRequest: {
            providerId: request.providerId,
            serviceId: request.serviceId,
            date: request.date,
            time: request.time
          }
        });
      });
    }
    
  } catch (error) {
    logger.error(`Erro ao gerar sugestões de horários alternativos: ${error}`);
  }
}

/**
 * Adiciona sugestões de prestadores alternativos para o mesmo serviço
 */
async function addAlternativeProviderSuggestions(
  suggestions: AlternativeSuggestion[],
  request: SuggestionRequest
): Promise<void> {
  try {
    let serviceId = request.serviceId;
    let categoryId = request.categoryId;
    
    // Se não temos serviço mas temos categoria, usar o primeiro serviço da categoria
    if (!serviceId && categoryId) {
      const categoryServices = await storage.getServicesByCategory(categoryId);
      if (categoryServices.length > 0) {
        serviceId = categoryServices[0].id;
      }
    }
    
    // Se não temos serviço nem categoria, não podemos sugerir prestadores alternativos
    if (!serviceId) return;
    
    // Buscar o serviço para informações
    const service = await storage.getService(serviceId);
    if (!service) return;
    
    // Se não temos categoria, obter da service
    if (!categoryId) {
      categoryId = service.categoryId;
    }
    
    // Buscar prestadores que oferecem este serviço
    // Simplificação: usar uma função que não depende de módulos externos
    const rankedProviders = await findTopProviders(
      request.clientId,
      serviceId,
      categoryId,
      3  // Limitar a 3 resultados
    );
    
    // Filtrar para não incluir o prestador original (se houver)
    const filteredProviders = rankedProviders.filter(p => 
      !request.providerId || p.id !== request.providerId
    );
    
    // Adicionar sugestões para cada prestador
    for (const rankedProvider of filteredProviders) {
      // Se temos data, verificar disponibilidade para essa data
      if (request.date) {
        const slots = await storage.getAvailableTimeSlots(
          rankedProvider.id, 
          request.date, 
          serviceId
        );
        
        // Se não há slots disponíveis nesta data, verificar próximas datas
        if (!slots || !slots.some(slot => slot.isAvailable)) {
          // Encontrar a próxima data disponível
          let nextAvailableDate = null;
          
          const currentDate = new Date(request.date);
          for (let i = 1; i <= 7; i++) {
            const nextDate = new Date(currentDate);
            nextDate.setDate(currentDate.getDate() + i);
            const dateString = nextDate.toISOString().split('T')[0];
            
            const futureSlots = await storage.getAvailableTimeSlots(
              rankedProvider.id, 
              dateString, 
              serviceId
            );
            
            if (futureSlots && futureSlots.some(slot => slot.isAvailable)) {
              nextAvailableDate = dateString;
              break;
            }
          }
          
          if (nextAvailableDate) {
            suggestions.push({
              type: 'provider',
              score: rankedProvider.score,
              providerId: rankedProvider.id,
              providerName: rankedProvider.name || '',
              providerAvatar: rankedProvider.avatar || null,
              providerRating: rankedProvider.rating,
              serviceId,
              serviceName: service.name,
              date: nextAvailableDate,
              reason: `${rankedProvider.name} está disponível em ${formatDate(nextAvailableDate)} para este serviço`,
              originalRequest: {
                providerId: request.providerId,
                serviceId,
                date: request.date
              }
            });
          }
        } else {
          // Prestador disponível na mesma data
          suggestions.push({
            type: 'provider',
            score: rankedProvider.score,
            providerId: rankedProvider.id,
            providerName: rankedProvider.name || '',
            providerAvatar: rankedProvider.avatar || null,
            providerRating: rankedProvider.rating,
            serviceId,
            serviceName: service.name,
            date: request.date,
            reason: `${rankedProvider.name} está disponível na mesma data (${formatDate(request.date)})`,
            originalRequest: {
              providerId: request.providerId,
              serviceId,
              date: request.date
            }
          });
        }
      } else {
        // Não temos data, sugerir apenas o prestador
        suggestions.push({
          type: 'provider',
          score: rankedProvider.score,
          providerId: rankedProvider.id,
          providerName: rankedProvider.name || '',
          providerAvatar: rankedProvider.avatar || null,
          providerRating: rankedProvider.rating,
          serviceId,
          serviceName: service.name,
          reason: `${rankedProvider.name} é altamente recomendado para ${service.name}`,
          originalRequest: {
            providerId: request.providerId,
            serviceId
          }
        });
      }
    }
    
  } catch (error) {
    logger.error(`Erro ao gerar sugestões de prestadores alternativos: ${error}`);
  }
}

/**
 * Adiciona sugestões de serviços alternativos para o mesmo prestador
 */
async function addAlternativeServiceSuggestions(
  suggestions: AlternativeSuggestion[],
  request: SuggestionRequest
): Promise<void> {
  try {
    if (!request.providerId) return;
    
    // Buscar o prestador para mostrar informações relevantes
    const provider = await storage.getProvider(request.providerId);
    if (!provider) return;
    
    // Buscar todos os serviços do prestador
    const providerServices = await storage.getServicesByProvider(request.providerId);
    
    // Filtrar para não incluir o serviço original (se houver)
    const filteredServices = providerServices.filter(s => 
      !request.serviceId || s.id !== request.serviceId
    );
    
    // Limitar a 3 serviços
    const services = filteredServices.slice(0, 3);
    
    // Adicionar sugestões para cada serviço
    for (const service of services) {
      // Se temos data, verificar disponibilidade para essa data
      if (request.date) {
        const slots = await storage.getAvailableTimeSlots(
          request.providerId, 
          request.date, 
          service.id
        );
        
        // Adicionar apenas se houver slots disponíveis
        if (slots && slots.some(slot => slot.isAvailable)) {
          suggestions.push({
            type: 'service',
            score: 75, // Score menor que as outras opções
            providerId: request.providerId,
            providerName: provider.name || '',
            providerAvatar: provider.profileImage,
            serviceId: service.id,
            serviceName: service.name,
            date: request.date,
            reason: `${provider.name} tem disponibilidade para ${service.name} em ${formatDate(request.date)}`,
            originalRequest: {
              providerId: request.providerId,
              serviceId: request.serviceId,
              date: request.date
            }
          });
        }
      } else {
        // Não temos data, sugerir apenas o serviço
        suggestions.push({
          type: 'service',
          score: 70,
          providerId: request.providerId,
          providerName: provider.name || '',
          providerAvatar: provider.profileImage,
          serviceId: service.id,
          serviceName: service.name,
          reason: `${provider.name} também oferece ${service.name}`,
          originalRequest: {
            providerId: request.providerId,
            serviceId: request.serviceId
          }
        });
      }
    }
    
  } catch (error) {
    logger.error(`Erro ao gerar sugestões de serviços alternativos: ${error}`);
  }
}

/**
 * Formata uma data para exibição amigável
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('pt-BR', {
    weekday: 'long', 
    day: 'numeric', 
    month: 'long'
  });
}

/**
 * Determina o período do dia com base na hora
 */
function getTimeOfDay(time?: string): 'morning' | 'afternoon' | 'evening' | null {
  if (!time) return null;
  
  const hour = parseInt(time.split(':')[0]);
  
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 18) return 'afternoon';
  return 'evening';
}