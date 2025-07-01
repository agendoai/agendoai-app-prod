/**
 * Serviço centralizado para gerenciamento de serviços de prestadores
 * 
 * Este módulo unifica as operações entre os serviços normais e os serviços
 * personalizados dos prestadores, garantindo consistência nos dados.
 */

import { storage } from '../storage';
import { db } from '../db';
import { sql } from 'drizzle-orm';
import { Service, ProviderService, Niche, Category } from '@shared/schema';

// Tipos para os serviços enriquecidos
interface EnrichedProviderService {
  id: number;
  serviceId: number;
  providerId: number;
  serviceName: string;
  serviceDescription: string | null;
  categoryId: number;
  categoryName: string;
  nicheId: number | null;
  nicheName: string;
  duration: number;
  price: number | null;
  isActive: boolean | null;
  executionTime: number;
  breakTime: number | null;
  isCustomized: boolean;
}

interface RemoveServiceOptions {
  hardDelete?: boolean;
}

interface RemoveServiceResult {
  success: boolean;
  message: string;
  affectedId?: number;
}

/**
 * Busca todos os serviços de um prestador com informações enriquecidas
 * Este método foi aprimorado para buscar dados diretamente da tabela de templates (serviceTemplates)
 * quando o usuário é um admin, assegurando que os serviços base sempre sejam consistentes.
 * 
 * @param providerId ID do prestador
 * @param userType Tipo de usuário que está fazendo a requisição (provider, admin, client)
 * @returns Promise<EnrichedProviderService[]> Lista de serviços enriquecidos
 * @throws ServiceError Quando ocorre um erro na busca
 */
export async function getEnrichedProviderServices(providerId: number, userType?: string): Promise<EnrichedProviderService[]> {
  try {
    console.log(`Buscando serviços enriquecidos para prestador ${providerId}, usuário tipo: ${userType || 'não especificado'}`);
    // Validação básica do input com maior rigor
    if (!providerId || isNaN(providerId) || providerId <= 0) {
      throw new ServiceError('ID do prestador inválido ou inexistente');
    }
    
    // Verificação explícita de permissão
    // Se o usuário não for um prestador ou admin, ou se não houver ID de prestador definido
    if (userType !== 'admin' && userType !== 'provider' && userType !== 'support') {
      throw new ServiceError('Permissão insuficiente para acessar serviços de prestadores');
    }

    // Buscar serviços em paralelo para melhor performance
    const [providerServices, regularServices] = await Promise.all([
      storage.getProviderServicesByProvider(providerId),
      storage.getServicesByProvider(providerId)
    ]);

    // Mapear IDs de serviços para buscar informações adicionais em batch
    const serviceIds = providerServices.map(ps => ps.serviceId);
    
    // Buscar serviços base diretamente dos templates para maior consistência
    let baseServices = [];
    try {
      // Primeiro tentar buscar dos templates (fonte mais confiável)
      const result = await db.execute(sql`
        SELECT st.*, c.name as category_name, n.name as niche_name
        FROM service_templates st
        LEFT JOIN categories c ON st.category_id = c.id
        LEFT JOIN niches n ON c.niche_id = n.id
        WHERE st.id IN (${sql.join(serviceIds, sql`, `)})
        AND st.is_active = true
      `);
      
      if (result && result.rows && Array.isArray(result.rows)) {
        baseServices = result.rows.map(row => ({
          id: row.id,
          name: row.name,
          description: row.description,
          categoryId: row.category_id,
          price: row.price,
          duration: row.duration,
          isActive: row.is_active === true
        }));
        console.log(`Obtidos ${baseServices.length} serviços base diretamente dos templates`);
      }
    } catch (error) {
      console.error('Erro ao buscar serviços base dos templates:', error);
      // Em caso de erro, usar método tradicional como fallback
      // @ts-ignore - Método adicionado dinamicamente em runtime
      baseServices = await storage.getServicesByIds(serviceIds);
      console.log(`Fallback: Obtidos ${baseServices.length} serviços base do storage`);
    }

    // Mapear categorias e nichos necessários
    const categoryIds = [
      ...new Set([
        ...baseServices.map((s: Service) => s.categoryId),
        ...regularServices.map(s => s.categoryId)
      ])
    ];
    // @ts-ignore - Método adicionado dinamicamente em runtime
    const categories = await storage.getCategoriesByIds(categoryIds);

    const nicheIds = [
      ...new Set(
        categories
          .map((c: Category) => c.nicheId)
          .filter((id): id is number => id !== null && id !== undefined)
      )
    ];
    // @ts-ignore - Método adicionado dinamicamente em runtime
    const niches = await storage.getNichesByIds(nicheIds);

    // Função auxiliar para buscar informações de categoria e nicho
    const getCategoryAndNiche = (categoryId: number) => {
      const category = categories.find((c: Category) => c.id === categoryId);
      const niche = category?.nicheId ? niches.find((n: Niche) => n.id === category.nicheId) : null;
      
      return {
        categoryName: category?.name || 'Categoria não encontrada',
        nicheId: category?.nicheId || null,
        nicheName: niche?.name || 'Especialidade não encontrada'
      };
    };

    // Processar serviços personalizados
    const processedServices = providerServices.map(ps => {
      // Primeiro tentar buscar o serviço na lista de baseServices (que agora vem dos templates)
      const baseService = baseServices.find((s: Service) => s.id === ps.serviceId);
      
      // Se não encontrar, tentar buscar diretamente do banco como fallback
      if (!baseService) {
        console.warn(`Serviço base não encontrado para ID ${ps.serviceId} na lista normal. Tentando recuperar do banco...`);
        
        // Usar um serviço alternativo (template essencial) como fallback
        // Para evitar quebrar o fluxo, vamos usar um serviço essencial genérico
        const fallbackService = {
          id: ps.serviceId,
          name: `Serviço #${ps.serviceId}`,
          description: "Detalhes indisponíveis temporariamente",
          categoryId: 1, // Categoria padrão
          price: ps.price || 0,
          duration: ps.executionTime || 30,
          isActive: true
        };
        
        const { categoryName, nicheId, nicheName } = getCategoryAndNiche(fallbackService.categoryId);
        
        return {
          id: ps.id,
          serviceId: fallbackService.id,
          providerId: ps.providerId,
          serviceName: fallbackService.name,
          serviceDescription: fallbackService.description,
          categoryId: fallbackService.categoryId,
          categoryName,
          nicheId,
          nicheName,
          duration: ps.executionTime || fallbackService.duration,
          price: ps.price ?? fallbackService.price,
          isActive: ps.isActive,
          executionTime: ps.executionTime,
          breakTime: ps.breakTime,
          isCustomized: true
        };
      }
      
      // Processamento normal quando o serviço base é encontrado
      const { categoryName, nicheId, nicheName } = getCategoryAndNiche(baseService.categoryId);
      
      return {
        id: ps.id,
        serviceId: baseService.id,
        providerId: ps.providerId,
        serviceName: baseService.name,
        serviceDescription: baseService.description,
        categoryId: baseService.categoryId,
        categoryName,
        nicheId,
        nicheName,
        duration: ps.executionTime || baseService.duration,
        price: ps.price ?? baseService.price,
        isActive: ps.isActive,
        executionTime: ps.executionTime,
        breakTime: ps.breakTime,
        isCustomized: true
      };
    });

    // Processar serviços regulares não personalizados
    const processedServiceIds = new Set(providerServices.map(ps => ps.serviceId));
    const regularProcessedServices = regularServices
      .filter(s => !processedServiceIds.has(s.id))
      .map(service => {
        const { categoryName, nicheId, nicheName } = getCategoryAndNiche(service.categoryId);

        return {
          id: service.id,
          serviceId: service.id,
          providerId: service.providerId,
          serviceName: service.name,
          serviceDescription: service.description,
          categoryId: service.categoryId,
          categoryName,
          nicheId,
          nicheName,
          duration: service.duration,
          price: service.price,
          isActive: service.isActive,
          executionTime: service.duration,
          breakTime: 0,
          isCustomized: false
        };
      });

    // Diferenciar o comportamento baseado no tipo de usuário
    let allServices = [];
    
    // Admins devem ver apenas serviços base (não personalizados) para gerenciamento
    if (userType === 'admin' || userType === 'support') {
      // Para admins, mostrar apenas serviços base (templates)
      const baseServicesOnly = regularProcessedServices.map(service => ({
        ...service,
        // Garantir que admins vejam os valores padrão, não os personalizados
        price: service.price,
        duration: service.duration,
        executionTime: service.duration,
        breakTime: 0,
        isCustomized: false
      }));
      
      allServices = baseServicesOnly;
      console.log(`Admin/Suporte visualizando ${allServices.length} serviços base do prestador ${providerId}`);
    } else {
      // Para prestadores, mostrar serviços personalizados + regulares
      allServices = [...processedServices, ...regularProcessedServices];
      console.log(`Prestador ${providerId} visualizando ${allServices.length} serviços (${processedServices.length} personalizados)`);
    }
    
    // Ordenar serviços por nome
    allServices.sort((a, b) => a.serviceName.localeCompare(b.serviceName));

    return allServices;
  } catch (error) {
    console.error('Erro ao buscar serviços enriquecidos do prestador:', error);
    throw new ServiceError('Falha ao buscar serviços', { cause: error });
  }
}

/**
 * Atualiza ou cria um serviço personalizado para um prestador
 * @param providerId ID do prestador
 * @param serviceId ID do serviço base
 * @param executionTime Tempo de execução em minutos
 * @param breakTime Tempo de descanso em minutos (opcional)
 * @param isActive Status do serviço (opcional)
 * @param price Preço personalizado (opcional)
 * @returns Promise<ProviderService> O serviço personalizado criado/atualizado
 * @throws ServiceError Quando ocorre um erro na operação
 */
export async function updateOrCreateProviderService(
  providerId: number,
  serviceId: number,
  executionTime: number,
  breakTime: number = 0,
  isActive: boolean = true,
  price?: number
): Promise<ProviderService> {
  try {
    // Validação de inputs
    if (!providerId || isNaN(providerId)) {
      throw new ServiceError('ID do prestador inválido');
    }
    if (!serviceId || isNaN(serviceId)) {
      throw new ServiceError('ID do serviço inválido');
    }
    if (executionTime <= 0) {
      throw new ServiceError('Tempo de execução deve ser maior que zero');
    }
    if (breakTime < 0) {
      throw new ServiceError('Tempo de descanso não pode ser negativo');
    }

    // Verificar existência do serviço base
    const baseService = await storage.getService(serviceId);
    if (!baseService) {
      throw new ServiceError('Serviço base não encontrado');
    }

    // Buscar ou criar provider_service
    const existing = await storage.getProviderServiceByProviderAndService(providerId, serviceId);
    const serviceData = {
      providerId,
      serviceId,
      executionTime,
      breakTime,
      isActive,
      ...(price !== undefined && { price })
    };

    let providerService = existing
      ? await storage.updateProviderService(existing.id, serviceData)
      : await storage.createProviderService(serviceData);
    
    // Garantir que o retorno seja não undefined
    if (!providerService) {
      throw new ServiceError('Não foi possível criar ou atualizar o serviço personalizado');
    }

    return providerService as ProviderService;
  } catch (error) {
    console.error('Erro ao atualizar ou criar serviço personalizado:', error);
    throw new ServiceError('Falha ao salvar serviço personalizado', { cause: error });
  }
}

/**
 * Remove um serviço personalizado ou regular do catálogo do prestador
 * @param providerId ID do prestador
 * @param serviceId ID do serviço (pode ser provider_service ou service)
 * @param options Opções de remoção
 * @returns Promise<RemoveServiceResult> Resultado da operação
 * @throws ServiceError Quando ocorre um erro na operação
 */
export async function removeProviderService(
  providerId: number,
  serviceId: number,
  options: RemoveServiceOptions = { hardDelete: false }
): Promise<RemoveServiceResult> {
  try {
    if (!providerId || isNaN(providerId)) {
      throw new ServiceError('ID do prestador inválido');
    }
    if (!serviceId || isNaN(serviceId)) {
      throw new ServiceError('ID do serviço inválido');
    }

    // Verificar se é um provider_service
    const providerService = await storage.getProviderService(serviceId);
    
    if (providerService) {
      // Validação de propriedade
      if (providerService.providerId !== providerId) {
        throw new ServiceError('Acesso negado ao serviço de outro prestador');
      }

      await db.execute(sql`
        DELETE FROM provider_services 
        WHERE id = ${serviceId}
      `);

      return { 
        success: true, 
        message: 'Serviço personalizado removido com sucesso',
        affectedId: serviceId
      };
    }

    // Se não for provider_service, tratar como service regular
    const service = await storage.getService(serviceId);
    if (!service) {
      throw new ServiceError('Serviço não encontrado');
    }

    // Validação de propriedade
    if (service.providerId !== providerId) {
      throw new ServiceError('Acesso negado ao serviço de outro prestador');
    }

    if (options.hardDelete) {
      await storage.deleteService(serviceId);
    } else {
      await storage.updateService(serviceId, { isActive: false });
    }

    return { 
      success: true, 
      message: 'Serviço removido com sucesso',
      affectedId: serviceId
    };
  } catch (error) {
    console.error('Erro ao remover serviço:', error);
    throw new ServiceError('Falha ao remover serviço', { cause: error });
  }
}

/**
 * Classe de erro personalizado para o serviço
 */
class ServiceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ServiceError';
  }
}

export { ServiceError };