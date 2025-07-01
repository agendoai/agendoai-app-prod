/**
 * Rotas para gerenciamento de templates de serviços
 * 
 * Este módulo implementa as rotas para gerenciar os templates de serviços
 * que serão usados pelos administradores para criar o catálogo de serviços
 * que ficará disponível para os prestadores.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { insertServiceTemplateSchema, type ServiceTemplate } from '../../shared/schema';

// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Não autorizado" });
};

// Middleware para verificar se o usuário é um administrador
const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (req.user && (req.user.userType === "admin" || req.user.userType === "support")) {
    return next();
  }
  return res.status(403).json({ error: "Acesso permitido apenas para administradores" });
};

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
 * Rota para obter todos os templates de serviços
 * GET /api/service-templates
 */
router.get('/', isAuthenticated, async (req, res) => {
  try {
    // Parâmetros de consulta
    
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const nicheId = req.query.nicheId ? parseInt(req.query.nicheId as string) : undefined;
    
    let templates: ServiceTemplate[] = [];
    
    if (categoryId) {
      templates = await storage.getServiceTemplatesByCategoryId(categoryId);
    }  else {
      templates = await storage.getServiceTemplates();
    }
    
    // Enriquecer com informações de categoria e nicho
    const templatesWithDetails = await Promise.all(
      templates.map(async (template) => {
        const category = await storage.getCategory(template.categoryId);
        const niche = category ? await storage.getNiche(category.nicheId) : null;
        
        return {
          ...template,
          categoryName: category?.name || 'Categoria não encontrada',
          nicheName: niche?.name || 'Nicho não encontrado',
          nicheId: category?.nicheId || null
        };
      })
    );
    
    return res.json(templatesWithDetails);
  } catch (error) {
    console.error('Erro ao buscar templates de serviços:', error);
    return res.status(500).json({ error: 'Erro ao buscar templates de serviços', erro: error });
  }
});

/**
 * Rota para obter um template de serviço por ID
 * GET /api/service-templates/:id
 */
router.get('/:id', isAuthenticated, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID do template inválido' });
    }
    
    const template = await storage.getServiceTemplate(id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template de serviço não encontrado' });
    }
    
    // Enriquecer com informações de categoria e nicho
    const category = await storage.getCategory(template.categoryId);
    const niche = category ? await storage.getNiche(category.nicheId) : null;
    
    const templateWithDetails = {
      ...template,
      categoryName: category?.name || 'Categoria não encontrada',
      nicheName: niche?.name || 'Nicho não encontrado',
      nicheId: category?.nicheId || null
    };
    
    return res.json(templateWithDetails);
  } catch (error) {
    console.error(`Erro ao buscar template de serviço ${req.params.id}:`, error);
    return res.status(500).json({ error: 'Erro ao buscar template de serviço' });
  }
});

/**
 * Rota para criar um novo template de serviço
 * POST /api/service-templates
 */
router.post('/', isAuthenticated, isAdmin, async (req, res) => {
  try {
    // Validar dados
    const validationResult = insertServiceTemplateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validationResult.error.errors 
      });
    }
    
    const data = validationResult.data;
    
    // Verificar se a categoria existe
    const category = await storage.getCategory(data.categoryId);
    
    if (!category) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }
    
    // Criar o template
    const template = await storage.createServiceTemplate(data);
    
    return res.status(201).json(template);
  } catch (error) {
    console.error('Erro ao criar template de serviço:', error);
    return res.status(500).json({ error: 'Erro ao criar template de serviço' });
  }
});

/**
 * Rota para atualizar um template de serviço
 * PUT /api/service-templates/:id
 */
router.put('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID do template inválido' });
    }
    
    // Verificar se o template existe
    const existingTemplate = await storage.getServiceTemplate(id);
    
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template de serviço não encontrado' });
    }
    
    // Validar dados - permitimos atualizações parciais
    const updateSchema = z.object({
      name: z.string().optional(),
      description: z.string().nullable().optional(),
      categoryId: z.number().optional(),
      nicheId: z.number().nullable().optional(),
      price: z.number().optional(),
      duration: z.number().optional(),
      icon: z.string().nullable().optional(),
      isActive: z.boolean().optional()
    });
    
    const validationResult = updateSchema.safeParse(req.body);
    
    if (!validationResult.success) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: validationResult.error.errors 
      });
    }
    
    const data = validationResult.data;
    
    // Se categoryId for fornecido, verificar se a categoria existe
    if (data.categoryId) {
      const category = await storage.getCategory(data.categoryId);
      
      if (!category) {
        return res.status(404).json({ error: 'Categoria não encontrada' });
      }
    }
    
    // Atualizar o template
    const updatedTemplate = await storage.updateServiceTemplate(id, data);
    
    return res.json(updatedTemplate);
  } catch (error) {
    console.error(`Erro ao atualizar template de serviço ${req.params.id}:`, error);
    return res.status(500).json({ error: 'Erro ao atualizar template de serviço' });
  }
});

/**
 * Rota para excluir um template de serviço (soft delete)
 * DELETE /api/service-templates/:id
 */
/**
 * Rota para buscar templates de serviço por termo, nicho ou categoria
 * GET /api/service-templates/search
 */
router.get('/search', isAuthenticated, async (req, res) => {
  try {
    // Parâmetros de busca
    const q = req.query.q as string;
    const categoryId = req.query.categoryId ? parseInt(req.query.categoryId as string) : undefined;
    const nicheId = req.query.nicheId ? parseInt(req.query.nicheId as string) : undefined;
    
    // Buscar todos os templates
    let templates = await storage.getServiceTemplates();
    
    // Aplicar filtros se necessário
    if (q) {
      templates = templates.filter(template => 
        template.name.toLowerCase().includes(q.toLowerCase()) || 
        (template.description && template.description.toLowerCase().includes(q.toLowerCase()))
      );
    }
    
    if (categoryId) {
      templates = templates.filter(template => template.categoryId === categoryId);
    }
    
    if (nicheId) {
      // Para filtrar por nicho, precisamos obter a categoria de cada template
      // e verificar se o nicheId da categoria corresponde ao solicitado
      const categories = await storage.getCategories();
      const categoryIdsByNiche = categories
        .filter(cat => cat.nicheId === nicheId)
        .map(cat => cat.id);
      
      templates = templates.filter(template => 
        categoryIdsByNiche.includes(template.categoryId)
      );
    }
    
    // Enriquecer com informações de categoria e nicho
    const templatesWithDetails = await Promise.all(
      templates.map(async (template) => {
        const category = await storage.getCategory(template.categoryId);
        const niche = category ? await storage.getNiche(category.nicheId) : null;
        
        return {
          ...template,
          categoryName: category?.name || 'Categoria não encontrada',
          nicheName: niche?.name || 'Nicho não encontrado',
          nicheId: category?.nicheId || null
        };
      })
    );
    
    return res.json(templatesWithDetails);
  } catch (error) {
    console.error('Erro ao buscar templates de serviços:', error);
    return res.status(500).json({ error: 'Erro ao buscar templates de serviços' });
  }
});

router.delete('/:id', isAuthenticated, isAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    
    if (isNaN(id)) {
      return res.status(400).json({ error: 'ID do template inválido' });
    }
    
    // Verificar se o template existe
    const existingTemplate = await storage.getServiceTemplate(id);
    
    if (!existingTemplate) {
      return res.status(404).json({ error: 'Template de serviço não encontrado' });
    }
    
    // Em vez de excluir, desativamos o template
    const updatedTemplate = await storage.updateServiceTemplate(id, { isActive: false });
    
    return res.json({ success: true, message: 'Template de serviço desativado com sucesso' });
  } catch (error) {
    console.error(`Erro ao excluir template de serviço ${req.params.id}:`, error);
    return res.status(500).json({ error: 'Erro ao excluir template de serviço' });
  }
});

export default router;