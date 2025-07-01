// Serviço para ranqueamento inteligente de prestadores baseado em avaliações e disponibilidade
import { storage } from "./storage";
import { Appointment, User, Review, Service } from "@shared/schema";
import { addDays, format, isAfter, isBefore, parseISO, startOfDay } from "date-fns";

// Interface TimeSlot para representar slots de tempo
interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  availabilityId?: number;
}

interface RankedProvider {
  id: number;
  name: string;
  rating: number;
  availabilityScore: number;
  qualityScore: number;
  totalScore: number;
  isRecommended: boolean;
  availableSlots: TimeSlot[];
}

interface RankingOptions {
  serviceId?: number;
  date?: string; // Formato YYYY-MM-DD
  timeOfDay?: "morning" | "afternoon" | "evening";
  clientPreferredProviders?: number[]; // IDs de prestadores preferidos pelo cliente
  categoryId?: number;
  clientId?: number; // Para considerar histórico do cliente
  maxResults?: number;
}

/**
 * Ranqueia prestadores com base em critérios inteligentes como avaliação, disponibilidade e preferências
 */
export async function rankProviders(options: RankingOptions = {}): Promise<RankedProvider[]> {
  try {
    const { 
      serviceId, 
      date = format(new Date(), 'yyyy-MM-dd'), 
      timeOfDay, 
      clientPreferredProviders = [],
      categoryId,
      clientId,
      maxResults = 10
    } = options;

    // 1. Buscar prestadores elegíveis (com base no serviço ou categoria)
    let providers: User[] = [];
    if (serviceId) {
      // Buscar prestadores que oferecem este serviço específico
      // Adaptar para as funções existentes na API
      const allProviderServices = await storage.getAllProviderServices();
      const providerServices = allProviderServices.filter(ps => ps.serviceId === serviceId);
      const providerIds = providerServices.map(ps => ps.providerId);
      
      // Buscar dados completos dos prestadores
      for (const id of providerIds) {
        const provider = await storage.getUser(id);
        if (provider && provider.isActive) {
          providers.push(provider);
        }
      }
    } else if (categoryId) {
      // Buscar serviços desta categoria
      const services = await storage.getServicesByCategory(categoryId);
      
      // Buscar prestadores destes serviços
      const providerIds = new Set<number>();
      const allProviderServices = await storage.getAllProviderServices();
      
      // Filtrar para obter serviços apenas desta categoria
      for (const service of services) {
        const filteredServices = allProviderServices.filter(ps => ps.serviceId === service.id);
        filteredServices.forEach(ps => providerIds.add(ps.providerId));
      }
      
      // Buscar dados completos dos prestadores
      // Converter Set para array para iterar
      const uniqueProviderIds = Array.from(providerIds);
      for (const id of uniqueProviderIds) {
        const provider = await storage.getUser(id);
        if (provider && provider.isActive) {
          providers.push(provider);
        }
      }
    } else {
      // Sem filtro específico, pegar todos os prestadores ativos
      providers = await storage.getAllProviders();
      providers = providers.filter(p => p.isActive);
    }

    if (providers.length === 0) {
      return [];
    }

    // 2. Coletar pontuações e rankings para cada prestador
    const rankedProviders: RankedProvider[] = [];

    for (const provider of providers) {
      // Buscar avaliações do prestador
      // Adaptar para usar funções existentes
      const allReviews = await storage.getAllReviews();
      const reviews = allReviews.filter(review => review.providerId === provider.id);
      
      // Calcular média de avaliação (1-5 estrelas)
      const averageRating = reviews.length > 0
        ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length
        : 3; // Pontuação neutra para prestadores sem avaliações
      
      // Buscar slots disponíveis para a data
      const availableSlots = await getProviderAvailableSlots(provider.id, date, serviceId);
      
      // Filtrar slots pelo período do dia, se especificado
      const filteredSlots = timeOfDay 
        ? filterSlotsByTimeOfDay(availableSlots, timeOfDay)
        : availableSlots;
      
      // Calcular pontuação de disponibilidade (0-5)
      const availabilityScore = calculateAvailabilityScore(filteredSlots);
      
      // Calcular pontuação de qualidade (0-5) com base em avaliações recentes
      const qualityScore = calculateQualityScore(reviews);
      
      // Calcular bônus para prestadores preferidos
      const preferredBonus = clientPreferredProviders.includes(provider.id) ? 2 : 0;
      
      // Calcular pontuação de histórico com o cliente (0-2)
      const historyScore = clientId ? await calculateClientHistoryScore(provider.id, clientId) : 0;
      
      // Calcular pontuação total (ponderada)
      const weightedRating = averageRating * 0.4; // 40% da pontuação
      const weightedAvailability = availabilityScore * 0.3; // 30% da pontuação
      const weightedQuality = qualityScore * 0.2; // 20% da pontuação
      const weightedHistory = historyScore * 0.1; // 10% da pontuação
      
      const totalScore = weightedRating + weightedAvailability + weightedQuality + 
                        weightedHistory + preferredBonus;
      
      // Adicionar à lista de prestadores ranqueados
      rankedProviders.push({
        id: provider.id,
        name: provider.name || "Prestador",
        rating: averageRating,
        availabilityScore,
        qualityScore,
        totalScore,
        isRecommended: totalScore >= 4, // Prestadores com pontuação >= 4 são recomendados
        availableSlots: filteredSlots
      });
    }

    // 3. Ordenar prestadores por pontuação total
    rankedProviders.sort((a, b) => b.totalScore - a.totalScore);
    
    // 4. Limitar ao número máximo de resultados
    return rankedProviders.slice(0, maxResults);
  } catch (error) {
    console.error("Erro ao ranquear prestadores:", error);
    return [];
  }
}

/**
 * Obtém os slots disponíveis de um prestador para uma data específica
 */
async function getProviderAvailableSlots(
  providerId: number, 
  date: string, 
  serviceId?: number
): Promise<TimeSlot[]> {
  try {
    // Usar a função existente de slots disponíveis
    const slots = await storage.getAvailableTimeSlots(providerId, date, serviceId);
    
    // Filtrar apenas slots disponíveis
    return slots.filter(slot => slot.isAvailable);
  } catch (error) {
    console.error(`Erro ao buscar slots disponíveis para provider ${providerId}:`, error);
    return [];
  }
}

/**
 * Filtra slots por período do dia (manhã, tarde, noite)
 */
function filterSlotsByTimeOfDay(
  slots: TimeSlot[], 
  timeOfDay: "morning" | "afternoon" | "evening"
): TimeSlot[] {
  return slots.filter(slot => {
    const hour = parseInt(slot.startTime.split(":")[0]);
    
    switch (timeOfDay) {
      case "morning":
        return hour >= 6 && hour < 12;
      case "afternoon":
        return hour >= 12 && hour < 18;
      case "evening":
        return hour >= 18 || hour < 6;
      default:
        return true;
    }
  });
}

/**
 * Calcula a pontuação de disponibilidade com base nos slots disponíveis
 * Retorna valor de 0 a 5
 */
function calculateAvailabilityScore(slots: TimeSlot[]): number {
  if (slots.length === 0) return 0;
  
  // Quanto mais slots disponíveis, melhor a pontuação (até um limite)
  // Valor máximo de 5 para 10+ slots disponíveis
  return Math.min(5, slots.length / 2);
}

/**
 * Calcula a pontuação de qualidade com base nas avaliações recentes
 * Dá mais peso para avaliações recentes
 * Retorna valor de 0 a 5
 */
function calculateQualityScore(reviews: Review[]): number {
  if (reviews.length === 0) return 2.5; // Pontuação neutra sem avaliações
  
  // Filtrar apenas avaliações dos últimos 90 dias
  const recentDate = addDays(new Date(), -90);
  const recentReviews = reviews.filter(r => {
    const reviewDate = r.publishedAt || new Date();
    return isAfter(reviewDate, recentDate);
  });
  
  if (recentReviews.length === 0) {
    // Se não houver avaliações recentes, usar todas as avaliações com peso menor
    const avgRating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
    return Math.min(5, avgRating * 0.8); // 80% do valor normal
  }
  
  // Calcular média ponderada das avaliações recentes (mais peso) e antigas
  const recentAvg = recentReviews.reduce((sum, r) => sum + r.rating, 0) / recentReviews.length;
  const olderReviews = reviews.filter(r => !recentReviews.includes(r));
  
  if (olderReviews.length === 0) {
    return recentAvg;
  }
  
  const olderAvg = olderReviews.reduce((sum, r) => sum + r.rating, 0) / olderReviews.length;
  
  // 70% peso para avaliações recentes, 30% para antigas
  return recentAvg * 0.7 + olderAvg * 0.3;
}

/**
 * Calcula a pontuação de histórico entre cliente e prestador
 * Considera agendamentos passados e se foram bem-sucedidos
 * Retorna valor de 0 a 2
 */
async function calculateClientHistoryScore(providerId: number, clientId: number): Promise<number> {
  try {
    // Buscar agendamentos passados entre este cliente e prestador
    // Adaptar para API existente
    const allAppointments = await storage.getAllAppointments();
    const appointments = allAppointments.filter(a => 
      a.clientId === clientId && a.providerId === providerId);
    
    if (appointments.length === 0) return 0;
    
    // Contar agendamentos completos e cancelados
    const completed = appointments.filter(a => a.status === "completed").length;
    const canceled = appointments.filter(a => a.status === "canceled").length;
    
    // Se o cliente cancelou mais do que completou, diminuir pontuação
    if (canceled > completed) {
      return 0.5;
    }
    
    // Quanto mais agendamentos completos, maior a pontuação (até 2)
    return Math.min(2, completed * 0.5);
  } catch (error) {
    console.error("Erro ao calcular pontuação de histórico:", error);
    return 0;
  }
}

/**
 * Obtém prestadores recomendados para um serviço específico
 */
export async function getRecommendedProvidersForService(
  serviceId: number,
  date: string = format(new Date(), 'yyyy-MM-dd'),
  clientId?: number
): Promise<RankedProvider[]> {
  const rankedProviders = await rankProviders({
    serviceId,
    date,
    clientId,
    maxResults: 5
  });
  
  return rankedProviders.filter(p => p.isRecommended);
}

/**
 * Encontra horários alternativos de outros prestadores quando o preferido não tem disponibilidade
 */
export async function findAlternativeProviders(
  preferredProviderId: number,
  serviceId: number,
  date: string
): Promise<RankedProvider[]> {
  // Verificar se o prestador preferido tem disponibilidade
  const slots = await getProviderAvailableSlots(preferredProviderId, date, serviceId);
  
  if (slots.length > 0) {
    // Se já tem disponibilidade, não é necessário buscar alternativas
    const provider = await storage.getUser(preferredProviderId);
    if (!provider) return [];
    
    // Buscar avaliações com método adaptado
    const allReviews = await storage.getAllReviews();
    const reviews = allReviews.filter(review => review.providerId === preferredProviderId);
    
    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 3;
    
    return [{
      id: preferredProviderId,
      name: provider.name || "Prestador",
      rating: avgRating,
      availabilityScore: calculateAvailabilityScore(slots),
      qualityScore: calculateQualityScore(reviews),
      totalScore: 5, // Máxima pontuação para o prestador preferido
      isRecommended: true,
      availableSlots: slots
    }];
  }
  
  // Buscar alternativas - outros prestadores que oferecem o mesmo serviço
  const rankedProviders = await rankProviders({
    serviceId,
    date,
    maxResults: 3
  });
  
  // Filtrar apenas prestadores com disponibilidade
  return rankedProviders.filter(p => p.availableSlots.length > 0);
}

/**
 * Identifica os dias com maior disponibilidade para um prestador nos próximos 30 dias
 */
export async function findBestAvailabilityDays(
  providerId: number,
  serviceId?: number,
  daysToCheck: number = 30
): Promise<{ date: string, availableSlots: number, score: number }[]> {
  const result = [];
  const today = startOfDay(new Date());
  
  for (let i = 0; i < daysToCheck; i++) {
    const date = format(addDays(today, i), 'yyyy-MM-dd');
    const slots = await getProviderAvailableSlots(providerId, date, serviceId);
    
    if (slots.length > 0) {
      result.push({
        date,
        availableSlots: slots.length,
        score: calculateAvailabilityScore(slots)
      });
    }
  }
  
  // Ordenar por número de slots disponíveis (decrescente)
  return result.sort((a, b) => b.availableSlots - a.availableSlots);
}