/**
 * Serviço de gerenciamento de localizações e disponibilidade de prestadores para o mapa de calor
 */
import { storage } from "../storage";
import { parseISO, isValid } from "date-fns";

/**
 * Interface para localização de prestador com informações de disponibilidade
 */
export interface ProviderLocationInfo {
  id: number;
  name: string;
  businessName?: string;
  latitude: string;
  longitude: string;
  isOnline: boolean;
  rating?: number;
  serviceCount: number;
  availability: number; // 0-100% disponibilidade
}

/**
 * Calcula a disponibilidade de um prestador para uma data específica
 * @param providerId ID do prestador
 * @param dateStr Data no formato YYYY-MM-DD
 * @returns Percentual de disponibilidade (0-100)
 */
async function calculateProviderAvailability(providerId: number, dateStr?: string | null): Promise<number> {
  try {
    // Se não houver data, retornar disponibilidade alta
    if (!dateStr) return 85;
    
    // Garantir que a data está no formato YYYY-MM-DD
    const dateString = dateStr.toString().substring(0, 10);
    const date = parseISO(dateString);
    if (!isValid(date)) return 75; // Se a data for inválida, retorna disponibilidade média-alta
    
    // Obter slots disponíveis na data
    const daySlots = await storage.getAvailableTimeSlots(providerId, dateString);
    
    if (!daySlots || daySlots.length === 0) {
      return 15; // Baixa disponibilidade se não houver slots
    }
    
    // Calcular percentual de slots disponíveis
    const availableSlots = daySlots.filter(slot => slot.isAvailable).length;
    const totalSlots = daySlots.length;
    
    if (totalSlots === 0) return 20;
    
    const availabilityPercentage = Math.round((availableSlots / totalSlots) * 100);
    return availabilityPercentage;
  } catch (error) {
    console.error(`Erro ao calcular disponibilidade para prestador ${providerId}:`, error);
    return 50; // Valor médio em caso de erro
  }
}

/**
 * Recupera prestadores com suas informações de localização e disponibilidade
 */
export async function getProviderLocations(
  serviceId?: number | null, 
  categoryId?: number | null,
  dateStr?: string | null
): Promise<ProviderLocationInfo[]> {
  try {
    // Obter todos os prestadores com suas configurações
    const providers = await storage.getUsersByType("provider");
    
    // Filtrar prestadores com coordenadas válidas
    const providerLocations = await Promise.all(providers.map(async (provider) => {
      try {
        // Obter configurações do prestador (latitude, longitude, etc.)
        const settings = await storage.getProviderSettings(provider.id);
        if (!settings || !settings.latitude || !settings.longitude) return null;
        
        // Converter latitude e longitude para verificar se são válidas
        const lat = parseFloat(settings.latitude);
        const lng = parseFloat(settings.longitude);
        if (isNaN(lat) || isNaN(lng)) return null;
        
        // Se serviceId foi fornecido, verificar se o prestador oferece este serviço
        if (serviceId) {
          const providerServices = await storage.getProviderServicesByProvider(provider.id);
          if (!providerServices || providerServices.length === 0) return null;
          
          // Verificar se algum dos serviços do prestador corresponde ao serviceId solicitado
          const hasService = providerServices.some(ps => ps.serviceId === serviceId);
          if (!hasService) return null;
        }
        
        // Se categoryId foi fornecido, verificar se o prestador tem serviços nesta categoria
        if (categoryId) {
          const providerServices = await storage.getProviderServicesByProvider(provider.id);
          if (!providerServices || providerServices.length === 0) return null;
          
          // Para cada serviço do prestador, verificar se pertence à categoria
          const services = await Promise.all(
            providerServices.map(ps => storage.getService(ps.serviceId))
          );
          const hasCategory = services.some(service => 
            service && service.categoryId === categoryId
          );
          if (!hasCategory) return null;
        }
        
        // Obter contagem de serviços oferecidos pelo prestador
        const providerServices = await storage.getProviderServicesByProvider(provider.id);
        
        // Calcular disponibilidade para a data específica (se fornecida)
        const availability = await calculateProviderAvailability(provider.id, dateStr);
        
        return {
          id: provider.id,
          name: provider.name,
          businessName: settings.businessName || provider.name,
          latitude: settings.latitude,
          longitude: settings.longitude,
          isOnline: !!settings.isOnline,
          rating: settings.rating || 40, // Convertido para escala 0-50
          serviceCount: providerServices.length,
          availability: availability
        };
      } catch (error) {
        console.error(`Erro ao processar localização do prestador ${provider.id}:`, error);
        return null;
      }
    }));
    
    // Filtrar nulos e retornar localizações válidas
    return providerLocations.filter(location => location !== null) as ProviderLocationInfo[];
  } catch (error) {
    console.error("Erro ao obter localizações dos prestadores:", error);
    return [];
  }
}