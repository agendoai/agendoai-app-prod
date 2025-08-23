/**
 * Rotas para relatórios administrativos
 * 
 * Este módulo implementa as rotas para relatórios e dashboards administrativos.
 */

import { Router } from 'express';
import { isAuthenticated, isClient, isProvider, isAdmin, isSupport, isAdminOrSupport } from '../middleware/jwt-auth';
import { storage } from '../storage';
import { Request, Response } from 'express';
// Funções de middleware de autenticação
const isAdminOrSupport = (req: Request, res: Response, next: any) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  const user = req.user as any;
  if (user.userType !== 'admin' && user.userType !== 'support') {
    return res.status(403).json({ error: 'Acesso negado' });
  }
  
  next();
};

const router = Router();

/**
 * Rota para obter resumo do dashboard administrativo
 * GET /api/admin/reports/dashboard
 */
router.get('/dashboard', isAdminOrSupport, async (req: Request, res: Response) => {
  try {
    // Buscar estatísticas gerais do sistema
    const totalUsers = await storage.getUsersCount();
    const totalProviders = await storage.getUsersCount('provider');
    const totalClients = await storage.getUsersCount('client');
    
    // Estatísticas básicas de agendamentos
    const appointmentStats = {
      total: 0,
      pending: 0,
      confirmed: 0,
      completed: 0,
      canceled: 0
    };
    
    // Estatísticas de serviços
    const serviceTemplates = await storage.getServiceTemplates();
    const categories = await storage.getCategories();
    
    // Retornar dados consolidados
    res.json({
      users: {
        total: totalUsers,
        providers: totalProviders,
        clients: totalClients
      },
      appointments: appointmentStats,
      services: {
        total: serviceTemplates.length,
        categories: categories.length
      }
    });
  } catch (error) {
    console.error('Erro ao gerar relatório do dashboard:', error);
    res.status(500).json({ error: 'Erro ao gerar relatório do dashboard' });
  }
});

/**
 * Rota para obter resumo geral do sistema
 * GET /api/admin/reports/summary
 * 
 * Observação: Esta rota já está sendo implementada em outro arquivo.
 * Estamos incluindo aqui apenas para documentação.
 */
// Esta rota já existe no sistema e está funcionando
// router.get('/summary', isAdminOrSupport, async (req: Request, res: Response) => {
//   try {
//     // Lógica para gerar o resumo do sistema
//     // ...
//   } catch (error) {
//     console.error('Erro ao gerar resumo do sistema:', error);
//     res.status(500).json({ error: 'Erro ao gerar resumo do sistema' });
//   }
// });

/**
 * Rota para obter novos usuários por dia
 * GET /api/admin/reports/new-users-by-day
 * 
 * Parâmetros:
 * - days: Número de dias para buscar (padrão: 30)
 * 
 * Observação: Esta rota já está sendo implementada em outro arquivo.
 * Estamos incluindo aqui apenas para documentação.
 */
// Esta rota já existe no sistema e está funcionando
// router.get('/new-users-by-day', isAdminOrSupport, async (req: Request, res: Response) => {
//   try {
//     const days = req.query.days ? parseInt(req.query.days as string) : 30;
//     
//     const endDate = new Date();
//     const startDate = new Date();
//     startDate.setDate(endDate.getDate() - days);
//     
//     console.log(`Buscando novos usuários nos últimos ${days} dias`);
//     
//     const result = await storage.getNewUsersByDay(startDate, endDate);
//     res.json(result);
//   } catch (error) {
//     console.error('Erro ao buscar novos usuários por dia:', error);
//     res.status(500).json({ error: 'Erro ao buscar novos usuários por dia' });
//   }
// });

export default router;