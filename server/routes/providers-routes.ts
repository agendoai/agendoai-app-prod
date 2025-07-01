/**
 * Rotas para gerenciamento de prestadores de serviço
 *
 * Este módulo implementa as rotas para gerenciar prestadores,
 * incluindo listagens, pesquisa e detalhes.
 */

import { Router } from "express";
import { storage } from "../storage";
import { Request, Response, NextFunction } from "express";
import { ParsedQs } from "qs";

// Middleware para verificar se o usuário está autenticado
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Não autorizado' });
}

const router = Router();

/**
 * Rota para buscar todos os prestadores disponíveis
 * GET /api/providers
 *
 * Suporta os seguintes parâmetros de consulta:
 * - search: string para pesquisa por nome ou email
 * - categoryId: filtrar por categoria
 * - nicheId: filtrar por nicho
 * - limit: número máximo de resultados (padrão: 100)
 * - offset: deslocamento para paginação (padrão: 0)
 * - onlyActive: retornar apenas prestadores ativos (padrão: true)
 * - onlyOnline: retornar apenas prestadores online (padrão: false)
 */
router.get("/", async (req: Request, res: Response) => {
  try {
    const {
      search,
      categoryId,
      nicheId,
      limit = "100",
      offset = "0",
      onlyActive = "true",
      onlyOnline = "false",
    } = req.query;

    // Não precisamos mais destas condições já que usamos o método do storage para obter prestadores

    // Buscar todos os prestadores
    const allProviders = await storage.getUsersByType("provider");

    // Filtrar manualmente baseado nas condições
    let providers = allProviders.filter((provider) => {
      // Filtrar por pesquisa se necessário
      if (search && typeof search === "string") {
        const searchLower = search.toLowerCase();
        const nameMatch = provider.name?.toLowerCase().includes(searchLower);
        const emailMatch = provider.email.toLowerCase().includes(searchLower);
        if (!nameMatch && !emailMatch) return false;
      }

      // Filtrar por status ativo
      if (onlyActive === "true") {
        if (!provider.isActive) return false;
      }

      return true;
    });

    // Aplicar paginação
    providers = providers.slice(Number(offset), Number(offset) + Number(limit));

    // Se solicitado apenas prestadores online, filtrar com configurações
    if (onlyOnline === "true") {
      const onlineProviders = [];

      for (const provider of providers) {
        const settings = await storage.getProviderSettings(provider.id);
        if (settings?.isOnline) {
          onlineProviders.push(provider);
        }
      }

      return res.json(onlineProviders);
    }

    // Filtrar por categoria se solicitado
    // Verificar se há um categoryId para filtrar
    if (
      categoryId &&
      typeof categoryId === "string" &&
      !isNaN(Number(categoryId))
    ) {
      const filteredProviders = [];
      const catId = Number(categoryId);

      for (const provider of providers) {
        // Buscar serviços do prestador nesta categoria
        const services = await storage.getServicesByProvider(provider.id);
        if (services.some((service) => service.categoryId === catId)) {
          filteredProviders.push(provider);
        }
      }

      return res.json(filteredProviders);
    }

    // Filtrar por nicho se solicitado
    if (nicheId && typeof nicheId === "string" && !isNaN(Number(nicheId))) {
      const filteredProviders = [];
      const nId = Number(nicheId);

      for (const provider of providers) {
        // Buscar serviços do prestador neste nicho
        const services = await storage.getServicesByProvider(provider.id);
        if (services.some((service) => service.nicheId === nId)) {
          filteredProviders.push(provider);
        }
      }

      return res.json(filteredProviders);
    }

    // Retornar todos os prestadores
    return res.json(providers);
  } catch (error) {
    console.error("Erro ao buscar prestadores:", error);
    return res.status(500).json({ error: "Erro ao buscar prestadores" });
  }
});

/**
 * Rota para buscar um prestador por ID
 * GET /api/providers/:id
 *
 * Retorna os detalhes completos de um prestador específico
 */
router.get("/:id", async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);

    if (isNaN(providerId)) {
      return res.status(400).json({ error: "ID de prestador inválido" });
    }

    // Buscar usuário
    const provider = await storage.getUser(providerId);

    // Verificar se o usuário existe e é um prestador
    if (!provider || provider.userType !== "provider") {
      return res.status(404).json({ error: "Prestador não encontrado" });
    }

    // Buscar configurações do prestador
    const settings = await storage.getProviderSettings(providerId);

    // Buscar serviços do prestador
    const services = await storage.getServicesByProvider(providerId);

    // Buscar avaliações do prestador
    const reviews = await storage.getProviderReviews(providerId);

    // Calcular classificação média
    let averageRating = 0;
    if (reviews.length > 0) {
      averageRating =
        reviews.reduce(
          (sum: number, review: any) => sum + (review.rating || 0),
          0,
        ) / reviews.length;
    }

    // Excluir senha e outros campos sensíveis dos resultados
    const { password, ...safeProvider } = provider;

    // Retornar informações completas do prestador
    return res.json({
      ...safeProvider,
      settings,
      services,
      reviews,
      statistics: {
        reviewCount: reviews.length,
        averageRating,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar detalhes do prestador:", error);
    return res
      .status(500)
      .json({ error: "Erro ao buscar detalhes do prestador" });
  }
});

/**
 * Rota para atualizar o fuso horário do prestador
 * POST /api/providers/:id/update-timezone
 * 
 * Atualiza o fuso horário do prestador e de suas configurações de disponibilidade
 * Requer autenticação e o usuário só pode atualizar seu próprio fuso horário
 */
router.post("/:id/update-timezone", isAuthenticated, async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    
    // Verificar se o usuário está autenticado e é o mesmo que está sendo atualizado
    if (!req.user || req.user.id !== providerId) {
      return res.status(403).json({ error: "Permissão negada. Você só pode atualizar seu próprio fuso horário." });
    }
    
    // Validar o timezone recebido
    const { timezone } = req.body;
    if (!timezone) {
      return res.status(400).json({ error: "Fuso horário não fornecido" });
    }
    
    // Lista de fusos horários válidos para o Brasil
    const validBrazilianTimezones = [
      'America/Sao_Paulo',
      'America/Manaus',
      'America/Belem',
      'America/Fortaleza',
      'America/Cuiaba',
      'America/Rio_Branco',
      'America/Noronha'
    ];
    
    if (!validBrazilianTimezones.includes(timezone)) {
      return res.status(400).json({ error: "Fuso horário inválido" });
    }
    
    // Atualizar o fuso horário do usuário nos metadados
    // Primeiro, buscamos o usuário para obter os metadados atuais
    const user = await storage.getUser(providerId);
    if (!user) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }

    // Obter metadados existentes ou criar novo objeto
    const currentMetadata = user.metadata ? JSON.parse(user.metadata) : {};
    
    // Atualizar com o novo fuso horário
    const newMetadata = {
      ...currentMetadata,
      timezone
    };
    
    // Atualizar o usuário com os novos metadados
    const updatedUser = await storage.updateUser(providerId, { 
      metadata: JSON.stringify(newMetadata)
    });
    
    if (!updatedUser) {
      return res.status(404).json({ error: "Erro ao atualizar usuário" });
    }
    
    // Também atualizar o timezone em todas as configurações de disponibilidade do prestador
    const availabilityConfigs = await storage.getAvailabilitiesByProviderId(providerId);
    if (availabilityConfigs && availabilityConfigs.length > 0) {
      // Atualizar cada configuração de disponibilidade com o novo timezone
      for (const config of availabilityConfigs) {
        // Atualizar como metadados (um objeto JSON) para contornar restrições de tipo
        const metadata = { timezone };
        await storage.updateAvailability(config.id, { metadata: JSON.stringify(metadata) });
      }
    }
    
    res.json({ success: true, timezone });
  } catch (error) {
    console.error('Erro ao atualizar fuso horário:', error);
    res.status(500).json({ error: "Erro ao atualizar fuso horário do prestador" });
  }
});

router.post("/:id/available-slots-check", async (req, res) => {
  try {
    const { date, serviceId, timeSlots } = req.body;
    if (!date || !serviceId || !timeSlots) {
      return res.status(400).json({ error: "Dados inválidos" });
    }
    // validação do body desestruturado

    // validação do provider
    const providerId = parseInt(req.params.id);
    const provider = await storage.getProvider(providerId);
    if (!provider) {
      return res.status(404).json({ error: "Prestador não encontrado" });
    }

    console.log(provider);

    // BUSCAR SLOTS E RETORNAR PARA O FRONT EXIBIR
    return res.json({ slots: "teste" });
  } catch (error) {
    console.error("Erro ao buscar slots do prestador:", error);
    return res.status(500).json({ error: "Erro ao buscar slots do prestador" });
  }
});

export default router;
