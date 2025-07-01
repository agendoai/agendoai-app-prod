import { Router } from "express";
import { storage } from "../storage";
import { insertPromotionSchema } from "@shared/schema";
import { and, eq, gte, lte, isNull, or } from "drizzle-orm";
import { z } from "zod";

export const promotionRouter = Router();

// Rota para obter todas as promoções (para administradores)
promotionRouter.get("/admin/promotions", async (req, res) => {
  try {
    if (req.user?.userType !== "admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const promotions = await storage.getPromotions();
    return res.json(promotions);
  } catch (error: any) {
    console.error("Erro ao buscar promoções:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Rota para obter promoções ativas (para clientes) - público
promotionRouter.get("/promotions/active", async (req, res) => {
  try {
    const now = new Date();

    // Busca promoções que:
    // 1. Estão ativas (isActive = true)
    // 2. Data atual está dentro do período (startDate <= now <= endDate)
    const activePromotions = await storage.getActivePromotions(now);
    
    return res.json(activePromotions);
  } catch (error: any) {
    console.error("Erro ao buscar promoções ativas:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Rota para criar uma nova promoção (apenas admin)
promotionRouter.post("/admin/promotions", async (req, res) => {
  try {
    if (req.user?.userType !== "admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const parsedData = insertPromotionSchema.parse(req.body);
    const promotion = await storage.createPromotion(parsedData);
    
    return res.status(201).json(promotion);
  } catch (error: any) {
    console.error("Erro ao criar promoção:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ error: error.message });
  }
});

// Rota para atualizar uma promoção (apenas admin)
promotionRouter.patch("/admin/promotions/:id", async (req, res) => {
  try {
    if (req.user?.userType !== "admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Validação parcial dos dados (permite atualização parcial)
    const updatePromotionSchema = insertPromotionSchema.partial();
    const parsedData = updatePromotionSchema.parse(req.body);
    
    const promotion = await storage.updatePromotion(id, parsedData);
    
    if (!promotion) {
      return res.status(404).json({ error: "Promoção não encontrada" });
    }
    
    return res.json(promotion);
  } catch (error: any) {
    console.error("Erro ao atualizar promoção:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ error: error.message });
  }
});

// Rota para alternar o status ativo/inativo de uma promoção (apenas admin)
promotionRouter.patch("/admin/promotions/:id/toggle-status", async (req, res) => {
  try {
    if (req.user?.userType !== "admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    // Buscar promoção atual
    const promotion = await storage.getPromotionById(id);
    
    if (!promotion) {
      return res.status(404).json({ error: "Promoção não encontrada" });
    }
    
    // Inverter o status ativo
    const updatedPromotion = await storage.updatePromotion(id, {
      isActive: !promotion.isActive
    });
    
    return res.json(updatedPromotion);
  } catch (error: any) {
    console.error("Erro ao alternar status da promoção:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Rota para excluir uma promoção (apenas admin)
promotionRouter.delete("/admin/promotions/:id", async (req, res) => {
  try {
    if (req.user?.userType !== "admin") {
      return res.status(403).json({ error: "Acesso negado" });
    }

    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({ error: "ID inválido" });
    }

    const result = await storage.deletePromotion(id);
    
    if (!result) {
      return res.status(404).json({ error: "Promoção não encontrada" });
    }
    
    return res.json({ success: true, message: "Promoção excluída com sucesso" });
  } catch (error: any) {
    console.error("Erro ao excluir promoção:", error);
    return res.status(500).json({ error: error.message });
  }
});

// Rota para buscar promoções aplicáveis a um serviço/provider específico
promotionRouter.get("/promotions/applicable", async (req, res) => {
  try {
    const { serviceId, providerId, categoryId, nicheId } = req.query;
    
    const validationSchema = z.object({
      serviceId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
      providerId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
      categoryId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
      nicheId: z.string().optional().transform(val => val ? parseInt(val) : undefined),
    });
    
    const { 
      serviceId: parsedServiceId, 
      providerId: parsedProviderId,
      categoryId: parsedCategoryId,
      nicheId: parsedNicheId
    } = validationSchema.parse(req.query);
    
    const now = new Date();
    
    // Buscar promoções aplicáveis com os filtros fornecidos
    const applicablePromotions = await storage.getApplicablePromotions({
      serviceId: parsedServiceId,
      providerId: parsedProviderId,
      categoryId: parsedCategoryId,
      nicheId: parsedNicheId,
      currentDate: now
    });
    
    return res.json(applicablePromotions);
  } catch (error: any) {
    console.error("Erro ao buscar promoções aplicáveis:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({ 
        error: "Parâmetros inválidos", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ error: error.message });
  }
});

// Rota para validar um código de cupom
promotionRouter.post("/promotions/validate-coupon", async (req, res) => {
  try {
    const { couponCode, serviceId, providerId } = req.body;
    
    const validationSchema = z.object({
      couponCode: z.string().min(1, "Código do cupom é obrigatório"),
      serviceId: z.number().optional(),
      providerId: z.number().optional(),
    });
    
    const parsedData = validationSchema.parse(req.body);
    const now = new Date();
    
    // Buscar promoção pelo código do cupom
    const promotion = await storage.getPromotionByCouponCode({
      couponCode: parsedData.couponCode,
      serviceId: parsedData.serviceId,
      providerId: parsedData.providerId,
      currentDate: now
    });
    
    if (!promotion) {
      return res.status(404).json({ 
        valid: false, 
        message: "Cupom inválido ou expirado" 
      });
    }
    
    return res.json({ 
      valid: true, 
      promotion 
    });
  } catch (error: any) {
    console.error("Erro ao validar cupom:", error);
    
    if (error.name === "ZodError") {
      return res.status(400).json({ 
        valid: false,
        error: "Dados inválidos", 
        details: error.errors 
      });
    }
    
    return res.status(500).json({ 
      valid: false,
      error: error.message 
    });
  }
});