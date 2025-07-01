// Rotas para gerenciar intervalos personalizados de prestadores (almoço, janta, etc.)
import { Router, Request, Response, NextFunction } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { ProviderBreak, insertProviderBreakSchema } from "@shared/schema";

// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Não autorizado" });
};

// Middleware para verificar se o usuário é prestador
const isProvider = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && req.user.userType === "provider") {
    return next();
  }
  return res.status(403).json({ error: "Permissão negada" });
};

// Schema de validação para criação e atualização de intervalos
const providerBreakSchema = insertProviderBreakSchema.extend({
  providerId: z.number().int().positive(),
  name: z.string().min(2, "Nome do intervalo é obrigatório"),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Formato de hora inválido (HH:MM)"),
  isRecurring: z.boolean().default(true),
  date: z.string().nullable().optional(),
});

export const providerBreaksRouter = Router();

// Obter todos os intervalos de um prestador
providerBreaksRouter.get("/providers/:id/breaks", async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const breaks = await storage.getProviderBreaksByProviderId(providerId);
    res.json(breaks);
  } catch (error) {
    console.error("Erro ao buscar intervalos:", error);
    res.status(500).json({ error: "Erro ao buscar intervalos" });
  }
});

// Obter intervalos de um prestador para um dia específico da semana
providerBreaksRouter.get("/providers/:id/breaks/day/:dayOfWeek", async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const dayOfWeek = parseInt(req.params.dayOfWeek);
    
    if (isNaN(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return res.status(400).json({ error: "Dia da semana inválido (0-6)" });
    }
    
    const breaks = await storage.getProviderBreaksByDay(providerId, dayOfWeek);
    res.json(breaks);
  } catch (error) {
    console.error("Erro ao buscar intervalos:", error);
    res.status(500).json({ error: "Erro ao buscar intervalos" });
  }
});

// Obter intervalos de um prestador para uma data específica
providerBreaksRouter.get("/providers/:id/breaks/date/:date", async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const date = req.params.date;
    
    // Validar formato da data (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Formato de data inválido. Use YYYY-MM-DD" });
    }
    
    const breaks = await storage.getProviderBreaksByDate(providerId, date);
    res.json(breaks);
  } catch (error) {
    console.error("Erro ao buscar intervalos:", error);
    res.status(500).json({ error: "Erro ao buscar intervalos" });
  }
});

// Criar um novo intervalo personalizado
providerBreaksRouter.post("/provider-breaks", isAuthenticated, isProvider, async (req, res) => {
  try {
    // Validar dados
    const validationResult = providerBreakSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: validationResult.error.format() 
      });
    }
    
    const breakData = validationResult.data;
    
    // Verificar se o prestador está criando para si mesmo
    if (breakData.providerId !== req.user!.id) {
      return res.status(403).json({ error: "Você só pode adicionar intervalos para sua própria agenda" });
    }
    
    // Criar o intervalo
    const newBreak = await storage.createProviderBreak(breakData);
    res.status(201).json(newBreak);
  } catch (error) {
    console.error("Erro ao criar intervalo:", error);
    res.status(500).json({ error: "Erro ao criar intervalo" });
  }
});

// Atualizar um intervalo personalizado
providerBreaksRouter.put("/provider-breaks/:id", isAuthenticated, isProvider, async (req, res) => {
  try {
    const breakId = parseInt(req.params.id);
    
    // Buscar o intervalo atual
    const currentBreak = await storage.getProviderBreak(breakId);
    if (!currentBreak) {
      return res.status(404).json({ error: "Intervalo não encontrado" });
    }
    
    // Verificar se o prestador é o dono do intervalo
    if (currentBreak.providerId !== req.user!.id) {
      return res.status(403).json({ error: "Você só pode atualizar seus próprios intervalos" });
    }
    
    // Validar os dados de atualização
    const validationResult = providerBreakSchema.partial().safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: "Dados inválidos", 
        details: validationResult.error.format() 
      });
    }
    
    const updateData = validationResult.data;
    
    // Não permitir alterar o providerId
    if (updateData.providerId && updateData.providerId !== currentBreak.providerId) {
      return res.status(400).json({ error: "Não é permitido alterar o prestador do intervalo" });
    }
    
    // Atualizar o intervalo
    const updatedBreak = await storage.updateProviderBreak(breakId, updateData);
    if (!updatedBreak) {
      return res.status(500).json({ error: "Erro ao atualizar intervalo" });
    }
    
    res.json(updatedBreak);
  } catch (error) {
    console.error("Erro ao atualizar intervalo:", error);
    res.status(500).json({ error: "Erro ao atualizar intervalo" });
  }
});

// Excluir um intervalo personalizado
providerBreaksRouter.delete("/provider-breaks/:id", isAuthenticated, isProvider, async (req, res) => {
  try {
    const breakId = parseInt(req.params.id);
    
    // Buscar o intervalo
    const breakData = await storage.getProviderBreak(breakId);
    if (!breakData) {
      return res.status(404).json({ error: "Intervalo não encontrado" });
    }
    
    // Verificar se o prestador é o dono do intervalo
    if (breakData.providerId !== req.user!.id) {
      return res.status(403).json({ error: "Você só pode excluir seus próprios intervalos" });
    }
    
    // Excluir o intervalo
    const success = await storage.deleteProviderBreak(breakId);
    if (!success) {
      return res.status(500).json({ error: "Erro ao excluir intervalo" });
    }
    
    res.json({ success: true, message: "Intervalo excluído com sucesso" });
  } catch (error) {
    console.error("Erro ao excluir intervalo:", error);
    res.status(500).json({ error: "Erro ao excluir intervalo" });
  }
});