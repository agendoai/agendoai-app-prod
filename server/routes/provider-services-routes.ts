/**
 * Rotas para gerenciamento de serviços personalizados de prestadores
 *
 * Este módulo implementa as rotas para gerenciar os serviços personalizados
 * e seus tempos de execução específicos para cada prestador.
 */

import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { storage } from "../storage";
import {
  insertProviderServiceSchema,
  type ProviderService,
} from "../../shared/schema.ts";
import { db } from "../db";
import { sql } from "drizzle-orm";
import {
  withRetry,
  withFallback,
  withCache,
  withCacheAndFallback,
  clearCache,
  clearAllCache,
} from "../utils/resilience-utils";
import { isAuthenticated, isProvider } from "../middleware/jwt-auth";



// Garantindo que req.user está disponível em TypeScript
declare global {
  namespace Express {
    interface User {
      id: number;
      userType: string;
      [key: string]: any;
    }
  }
}

const router = Router();

/**
 * Rota para obter todos os serviços de um prestador específico
 * GET /api/provider-services/provider/:providerId
 */
router.get("/provider/:providerId", isAuthenticated, async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    
    // Buscar serviços personalizados do prestador
    const providerServices =
      await storage.getProviderServicesByProvider(providerId);

    // Enriquecer com detalhes dos serviços
    const enrichedServices = await Promise.all(
      providerServices.map(async (ps: ProviderService) => {
        try {
          // Buscar informações do serviço
          const service = await storage.getService(ps.serviceId);
          if (service) {
            const category = await storage.getCategory(service.categoryId);
            const niche = category
              ? await storage.getNiche(category.nicheId)
              : null;
            const dataToRetun = {
              id: ps.id,
              providerId: ps.providerId,
              serviceId: ps.serviceId,
              executionTime: ps.executionTime,
              duration: ps.duration,
              price: ps.price, // Campo de preço explícito
              breakTime: ps.breakTime,
              isActive: ps.isActive,
              createdAt: ps.createdAt,
              serviceName: service.name,
              serviceDescription: service.description,
              categoryId: service.categoryId,
              categoryName: category?.name || "Categoria não encontrada",
              nicheId: category?.nicheId || null,
              nicheName: niche?.name || "Especialidade não encontrada",
            };
            return dataToRetun;
          }

          // Se não encontrou o serviço
          return {
            id: ps.id,
            providerId: ps.providerId,
            serviceId: ps.serviceId,
            executionTime: ps.executionTime,
            duration: ps.duration,
            price: ps.price, // Campo de preço explícito também no fallback
            breakTime: ps.breakTime,
            isActive: ps.isActive,
            createdAt: ps.createdAt,
            serviceName: "Serviço não encontrado",
            serviceDescription: "Este serviço não está mais disponível",
            categoryId: null,
            categoryName: "Categoria não encontrada",
            nicheId: null,
            nicheName: "Especialidade não encontrada",
          };
        } catch (error) {
          console.error(`Erro ao enriquecer serviço ${ps.id}:`, error);
          return {
            ...ps,
            serviceName: "Erro ao buscar serviço",
            serviceDescription:
              "Ocorreu um erro ao buscar detalhes deste serviço",
            categoryId: null,
            categoryName: "Indisponível",
            nicheId: null,
            nicheName: "Indisponível",
          };
        }
      }),
    );

    return res.json(enrichedServices);
  } catch (error) {
    console.error("Erro ao buscar serviços do prestador:", error);
    return res
      .status(500)
      .json({ error: "Erro ao buscar serviços do prestador" });
  }
});

/**
 * Rota para listar todos os serviços disponíveis para adicionar ao portfólio
 * GET /api/provider-services/available-services
 */
router.get(
  "/available-services",
  isAuthenticated,
  isProvider,
  async (req, res) => {
    try {
      const providerId = req.user?.id;
      console.log(`[AVAILABLE-SERVICES] Buscando serviços para prestador ID: ${providerId}`);

      if (!providerId) {
        return res.status(401).json({
          error: "Não autorizado. ID do prestador não encontrado.",
        });
      }

      // Obter todos os serviços disponíveis no sistema
      console.log(`[AVAILABLE-SERVICES] Buscando todos os serviços...`);
      const allServiceTemplates = await storage.getServiceTemplates();
      console.log(`[AVAILABLE-SERVICES] Total de templates encontrados: ${allServiceTemplates.length}`);

      // Obter serviços já adicionados ao portfólio do prestador
      console.log(`[AVAILABLE-SERVICES] Buscando serviços do prestador ${providerId}...`);
      const providerServices =
        await storage.getProviderServicesByProvider(providerId);
      const addedServiceIds = providerServices.map((ps) => ps.serviceId);
      console.log(`[AVAILABLE-SERVICES] Serviços já adicionados: ${addedServiceIds.length}`);

      // Filtrar templates que ainda não foram adicionados
      const availableTemplates = allServiceTemplates.filter((template: any) => {
        console.log(`[DEBUG] Verificando template ${template.id} (${template.name}):`);
        console.log(`  - isActive: ${template.isActive} (tipo: ${typeof template.isActive})`);
        
        // Se o template não estiver ativo, não mostrar
        if (template.isActive === false) {
          console.log(`  ❌ Template ${template.id} filtrado: isActive = false`);
          return false;
        }

        console.log(`  ✅ Template ${template.id} aprovado`);
        return true;
      });
      console.log(`[AVAILABLE-SERVICES] Templates disponíveis após filtro: ${availableTemplates.length}`);

      // Enriquecer com informações de categoria e nicho
      console.log(`[AVAILABLE-SERVICES] Enriquecendo templates com detalhes...`);
      const availableTemplatesWithDetails = await Promise.all(
        availableTemplates.map(async (template) => {
          try {
            // Buscar categoria
            const category = await storage.getCategory(template.categoryId);
            // Buscar nicho
            const niche = category
              ? await storage.getNiche(category.nicheId)
              : null;

            return {
              id: template.id,
              name: template.name,
              description: template.description,
              categoryId: template.categoryId,
              nicheId: template.nicheId,
              duration: template.duration,
              icon: template.icon,
              isActive: template.isActive,
              categoryName: category?.name || "Categoria não encontrada",
              nicheName: niche?.name || "Especialidade não encontrada",
              isTemplate: true, // Marcar como template
            };
          } catch (error) {
            // Em caso de qualquer erro, continua com valores padrão
            console.error(
              `Erro ao buscar detalhes para o template ${template.id}:`,
              error,
            );
            return {
              id: template.id,
              name: template.name,
              description: template.description,
              categoryId: template.categoryId,
              nicheId: template.nicheId,
              duration: template.duration,
              icon: template.icon,
              isActive: template.isActive,
              categoryName: "Categoria não encontrada",
              nicheName: "Especialidade não encontrada",
              isTemplate: true,
            };
          }
        }),
      );

      console.log(`[AVAILABLE-SERVICES] Retornando ${availableTemplatesWithDetails.length} templates`);
      return res.json(availableTemplatesWithDetails);
    } catch (error) {
      console.error("Erro ao buscar serviços disponíveis:", error);
      return res
        .status(500)
        .json({ error: "Erro ao buscar serviços disponíveis" });
    }
  },
);

/**
 * Rota para criar um serviço personalizado diretamente
 * POST /api/provider-services/custom
 */
router.post("/custom", isAuthenticated, isProvider, async (req, res) => {
  try {
    const providerId = req.user?.id;

    if (!providerId) {
      return res.status(400).json({ error: "ID do prestador não informado" });
    }

    console.log("Criando serviço personalizado para prestador:", providerId, req.body);

    // Obter dados da requisição
    const { 
      name, 
      description, 
      nicheId, 
      categoryId, 
      price, 
      duration, 
      executionTime, 
      breakTime 
    } = req.body;

    // Validar dados obrigatórios
    if (!name || !nicheId || !categoryId || !price || !duration || !executionTime) {
      return res.status(400).json({
        error: "Dados incompletos. Forneça nome, nicho, categoria, preço, duração e tempo de execução.",
      });
    }

    // Primeiro, criar o serviço na tabela services
    const serviceData = {
      name,
      description: description || "",
      providerId: Number(providerId),
      categoryId: Number(categoryId),
      price: Math.round(Number(price) * 100), // Salva em centavos
      duration: Number(duration),
      isActive: true,
    };

    console.log("Criando serviço base:", serviceData);
    const newService = await storage.createService(serviceData);
    console.log("Serviço criado com ID:", newService.id);

    // Depois, criar o provider service
    const providerServiceData = {
      providerId: Number(providerId),
      serviceId: newService.id,
      executionTime: Number(executionTime),
      price: Math.round(Number(price) * 100), // Salva em centavos
      duration: Number(duration),
      breakTime: breakTime ? Number(breakTime) : 0,
      isActive: true,
    };

    console.log("Criando provider service:", providerServiceData);
    const providerService = await storage.createProviderService(providerServiceData);

    // Buscar categoria e nicho para enriquecer a resposta
    let category = null;
    let niche = null;

    try {
      category = await storage.getCategory(Number(categoryId));
      if (category && category.nicheId) {
        niche = await storage.getNiche(category.nicheId);
      }
    } catch (error) {
      console.warn("Erro ao buscar categoria/nicho:", error);
    }

    // Limpar cache
    clearCache(`provider-services-${providerId}`);

    // Retornar resposta enriquecida
    return res.status(201).json({
      ...providerService,
      serviceName: name,
      serviceDescription: description || "",
      categoryId: Number(categoryId),
      categoryName: category?.name || "Categoria não encontrada",
      nicheId: category?.nicheId || null,
      nicheName: niche?.name || "Especialidade não encontrada",
      isTemplate: false,
      isCustom: true,
      addedAt: new Date().toISOString(),
    });

  } catch (error: any) {
    console.error("Erro ao criar serviço personalizado:", error);
    return res.status(500).json({
      error: "Erro ao criar serviço personalizado",
      details: error?.message || "Erro desconhecido",
    });
  }
});

/**
 * Rota para adicionar um serviço do catálogo ao portfólio do prestador
 * POST /api/provider-services
 */
router.post("/", isAuthenticated, isProvider, async (req, res) => {
  try {
    // Usar ID do usuário autenticado ou o enviado no corpo da requisição (para testes)
    const providerId = req.user?.id || req.body.providerId;

    if (!providerId) {
      return res.status(400).json({ error: "ID do prestador não informado" });
    }

    console.log(
      "Adicionando serviço ao portfólio do prestador:",
      providerId,
      req.body,
    );

    // Obter dados essenciais da requisição
    const { serviceId, executionTime, price, breakTime, duration } = req.body;

    // Validar dados obrigatórios
    if (!serviceId || !executionTime || !price) {
      return res.status(400).json({
        error: "Dados incompletos. Forneça serviceId, executionTime e price.",
      });
    }

    // Normalizar dados para o formato esperado
    const data = {
      providerId: Number(providerId),
      serviceId: Number(serviceId),
      executionTime: Number(executionTime),
      price: Math.round(Number(price) * 100), // Salva em centavos
      breakTime: breakTime ? Number(breakTime) : 0,
      duration: duration
        ? Number(duration)
        : Number(executionTime) + (breakTime ? Number(breakTime) : 0),
    };

    console.log("Dados formatados para adicionar serviço:", data);

    // Verificar se o serviço existe
    const service = await storage.getService(data.serviceId);

    if (!service) {
      return res.status(404).json({ error: "Serviço não encontrado" });
    }

    console.log(`Serviço encontrado: "${service.name}"`);

    // Verificar se já existe este serviço no portfólio do prestador
    const existingProviderService = await storage.getProviderServiceByProviderAndService(
      data.providerId,
      data.serviceId,
    );

    let providerService;

    if (existingProviderService) {
      // Serviço já existe - não permitir duplicata
      console.log(`❌ Tentativa de criar serviço duplicado. Prestador ${data.providerId} já possui o serviço ${service.name}`);
      return res.status(400).json({ 
        error: 'Serviço duplicado', 
        message: `Você já possui o serviço "${service.name}" em seu portfólio. Não é possível adicionar o mesmo serviço duas vezes.`,
        existingService: {
          id: existingProviderService.id,
          name: service.name,
          price: existingProviderService.price,
          duration: existingProviderService.executionTime
        }
      });
    } else {
      // Criar novo serviço no portfólio
      console.log(`Criando novo serviço para: ${service.name}`);
      try {
        providerService = await storage.createProviderService({
          providerId: data.providerId,
          serviceId: data.serviceId,
          executionTime: data.executionTime,
          price: data.price, // já está em centavos
          duration: data.duration,
          breakTime: data.breakTime,
          isActive: true,
        });
        console.log(`✅ Serviço criado com sucesso: ID ${providerService.id}`);
      } catch (createError) {
        console.error('❌ Erro ao criar provider service:', createError);
        
        // Se falhar na criação, pode ser devido a constraint ou problema de sincronização
        // Tentar buscar novamente para ver se já existe
        const recheckService = await storage.getProviderServiceByProviderAndService(
          data.providerId,
          data.serviceId,
        );
        
        if (recheckService) {
          console.log(`🔄 Serviço encontrado após erro de criação, atualizando: ID ${recheckService.id}`);
          providerService = await storage.updateProviderService(
            recheckService.id,
            {
              executionTime: data.executionTime,
              price: data.price, // já está em centavos
              duration: data.duration,
              breakTime: data.breakTime,
              isActive: true,
            },
          );
        } else {
          // Se ainda não existe, re-throw o erro original
          throw createError;
        }
      }
    }

    // Buscar categoria e nicho
    let category = null;
    let niche = null;

    try {
      category = await storage.getCategory(service.categoryId);
      if (category && category.nicheId) {
        niche = await storage.getNiche(category.nicheId);
      }
    } catch (error) {
      console.warn("Erro ao buscar categoria/nicho:", error);
    }

    // Limpar cache
    clearCache(`provider-services-${providerId}`);

    // Retornar resposta enriquecida
    return res.status(201).json({
      ...providerService,
      serviceName: service.name,
      serviceDescription: service.description,
      categoryId: service.categoryId,
      categoryName: category?.name || "Categoria não encontrada",
      nicheId: category?.nicheId || null,
      nicheName: niche?.name || "Especialidade não encontrada",
      isTemplate: false,
      addedAt: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Erro ao adicionar serviço ao portfólio:", error);
    return res.status(500).json({
      error: "Erro ao adicionar serviço ao portfólio",
      details: error?.message || "Erro desconhecido",
    });
  }
});

/**
 * Rota para atualizar um serviço personalizado
 * PATCH /api/provider-services/:id
 */
router.patch("/:id", isAuthenticated, isProvider, async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const providerId = req.user?.id;

    if (!providerId) {
      return res
        .status(401)
        .json({ error: "Não autorizado. ID do prestador não encontrado." });
    }

    // Verificar se o serviço pertence ao prestador
    const existingService = await storage.getProviderService(serviceId);

    if (!existingService) {
      return res
        .status(404)
        .json({ error: "Serviço personalizado não encontrado" });
    }

    if (existingService.providerId !== providerId) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para editar este serviço" });
    }

    // Validar dados da requisição
    const updateData = req.body;

    // Atualizar o serviço
    const updatedService = await storage.updateProviderService(
      serviceId,
      updateData,
    );

    // Limpar cache
    clearCache(`provider-services-${providerId}`);

    return res.json(updatedService);
  } catch (error) {
    console.error("Erro ao atualizar serviço personalizado:", error);
    return res
      .status(500)
      .json({ error: "Erro ao atualizar serviço personalizado" });
  }
});

/**
 * Rota para excluir um serviço personalizado
 * DELETE /api/provider-services/:id
 */
router.delete("/:id", isAuthenticated, isProvider, async (req, res) => {
  try {
    const serviceId = parseInt(req.params.id);
    const providerId = req.user?.id;

    if (!providerId) {
      return res
        .status(401)
        .json({ error: "Não autorizado. ID do prestador não encontrado." });
    }

    // Verificar se o serviço pertence ao prestador
    const existingService = await storage.getProviderService(serviceId);

    if (!existingService) {
      return res
        .status(404)
        .json({ error: "Serviço personalizado não encontrado" });
    }

    if (existingService.providerId !== providerId) {
      return res
        .status(403)
        .json({ error: "Você não tem permissão para excluir este serviço" });
    }

    // Excluir o serviço
    await storage.deleteProviderService(serviceId);

    // Limpar cache
    clearCache(`provider-services-${providerId}`);

    return res.json({ message: "Serviço personalizado excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir serviço personalizado:", error);
    return res
      .status(500)
      .json({ error: "Erro ao excluir serviço personalizado" });
  }
});

export default router;
