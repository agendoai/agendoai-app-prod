import express from 'express';
import { storage } from '../storage';
import { adaptProviderAgendaForService } from '../ai-provider-scheduling-service';
import { 
  analyzeProviderSchedule, 
  analyzeServiceExecutionTimes, 
  predictSchedulingTrends 
} from '../ai-provider-scheduling-service';
import { createLogger } from '../logger';

const logger = createLogger('IA');
const router = express.Router();

// Middleware para verificar se o usuário está autenticado
function isAuthenticated(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Não autorizado' });
}

// Middleware para verificar se o usuário é um prestador
function isProvider(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.user && req.user.userType === 'provider') {
    return next();
  }
  res.status(403).json({ error: 'Acesso negado. Apenas prestadores podem acessar este recurso.' });
}

// Rota para otimizar a agenda do prestador com base em IA
router.post('/optimize', isAuthenticated, isProvider, async (req, res) => {
  try {
    const { providerId, date, serviceId } = req.body;
    
    // Verificar dados
    if (!providerId || !date) {
      return res.status(400).json({ error: 'Os parâmetros providerId e date são obrigatórios' });
    }
    
    // Verificar se o prestador é o usuário logado ou um admin
    if (req.user.userType !== 'admin' && req.user.id !== providerId) {
      return res.status(403).json({ error: 'Você só pode otimizar sua própria agenda' });
    }
    
    logger.info(`Adaptando agenda para providerId: ${providerId}, date: ${date}, serviceId: ${serviceId}, slots: N/A`);
    
    // Obter os slots de tempo disponíveis do prestador na data
    const timeSlots = await storage.getAvailableTimeSlots(providerId, date, serviceId);
    
    logger.info(`Adaptando agenda para providerId: ${providerId}, date: ${date}, serviceId: ${serviceId}, slots: ${timeSlots.length}`);
    
    // Usar IA para adaptar a agenda com base no serviço selecionado
    const optimizedSlots = await adaptProviderAgendaForService(
      providerId,
      serviceId,
      date,
      timeSlots
    );
    
    return res.json({ 
      timeSlots: optimizedSlots,
      message: 'Agenda otimizada com sucesso'
    });
  } catch (error) {
    console.error('Erro ao otimizar agenda:', error);
    res.status(500).json({ 
      error: 'Erro ao otimizar agenda', 
      details: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
});

// Rota para obter análise de tendências e insights
router.get('/insights', isAuthenticated, isProvider, async (req, res) => {
  try {
    const providerId = parseInt(req.query.providerId as string);
    
    // Verificar permissão
    if (req.user.userType !== 'admin' && req.user.id !== providerId) {
      return res.status(403).json({ error: 'Você só pode analisar sua própria agenda' });
    }
    
    // Data range opcional (padrão: últimos 30 dias)
    const dateRange = req.query.dateRange 
      ? JSON.parse(req.query.dateRange as string)
      : { 
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        };
    
    // Analisar agenda do prestador
    const insights = await analyzeProviderSchedule({
      providerId,
      dateRange,
      includeHistorical: true,
      includeAvailability: true,
      includeUpcoming: true
    });
    
    return res.json({ insights });
  } catch (error) {
    console.error('Erro ao obter insights:', error);
    res.status(500).json({ 
      error: 'Erro ao obter insights', 
      details: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
});

// Rota para analisar tempos de execução de serviços
router.get('/execution-times', isAuthenticated, isProvider, async (req, res) => {
  try {
    const providerId = parseInt(req.query.providerId as string);
    const serviceId = req.query.serviceId ? parseInt(req.query.serviceId as string) : undefined;
    
    // Verificar permissão
    if (req.user.userType !== 'admin' && req.user.id !== providerId) {
      return res.status(403).json({ error: 'Você só pode analisar seus próprios serviços' });
    }
    
    // Analisar tempos de execução
    const analysis = await analyzeServiceExecutionTimes(providerId, serviceId);
    
    return res.json({ analysis });
  } catch (error) {
    console.error('Erro ao analisar tempos de execução:', error);
    res.status(500).json({ 
      error: 'Erro ao analisar tempos de execução', 
      details: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
});

// Rota para prever tendências de agendamento
router.get('/trends', isAuthenticated, isProvider, async (req, res) => {
  try {
    const providerId = parseInt(req.query.providerId as string);
    
    // Verificar permissão
    if (req.user.userType !== 'admin' && req.user.id !== providerId) {
      return res.status(403).json({ error: 'Você só pode analisar suas próprias tendências' });
    }
    
    // Prever tendências
    const trends = await predictSchedulingTrends(providerId);
    
    return res.json({ trends });
  } catch (error) {
    console.error('Erro ao prever tendências:', error);
    res.status(500).json({ 
      error: 'Erro ao prever tendências', 
      details: error instanceof Error ? error.message : 'Erro desconhecido' 
    });
  }
});

export const providerAIRouter = router;