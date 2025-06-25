/**
 * Rotas para gerenciamento de notificações push
 */
import { Router } from 'express';
import { pushNotificationService } from '../push-notification-service';
import { createLogger } from '../logger';

// Inicialização do logger
const logger = createLogger('PushRoutes');

// Criação do router de notificações push
export const pushRouter = Router();

// Endpoint para obter a chave pública VAPID
pushRouter.get('/vapid-public-key', (req, res) => {
  try {
    // Obter chave pública das variáveis de ambiente
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    
    if (!vapidPublicKey) {
      logger.error('Chave pública VAPID não configurada no servidor');
      return res.status(500).json({ error: 'Configuração de push não disponível' });
    }
    
    res.status(200).send(vapidPublicKey);
  } catch (error) {
    logger.error('Erro ao obter chave pública VAPID:', error);
    res.status(500).json({ error: 'Erro interno ao obter configuração de push' });
  }
});

// Endpoint para registrar assinatura push
pushRouter.post('/subscribe', async (req, res) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const userId = req.user!.id;
    const subscription = req.body;
    
    // Validar dados da assinatura
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Dados de assinatura inválidos' });
    }
    
    // Armazenar a assinatura vinculada ao usuário
    // TODO: Implementar função no storage para salvar a assinatura
    // await storage.savePushSubscription(userId, subscription);
    
    logger.info(`Assinatura push registrada para usuário ${userId}`);
    
    // Enviar notificação de teste para confirmar funcionamento
    if (pushNotificationService.isInitialized()) {
      const testPayload = {
        notification: {
          title: 'Notificações Ativadas!',
          body: 'Você receberá atualizações sobre seus agendamentos.',
          icon: '/icons/notification-icon.png',
        }
      };
      
      await pushNotificationService.sendNotification(subscription, testPayload);
    }
    
    res.status(201).json({ success: true });
  } catch (error) {
    logger.error('Erro ao registrar assinatura push:', error);
    res.status(500).json({ error: 'Erro ao registrar assinatura push' });
  }
});

// Endpoint para remover assinatura push
pushRouter.post('/unsubscribe', async (req, res) => {
  try {
    // Verificar se o usuário está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: 'Usuário não autenticado' });
    }
    
    const userId = req.user!.id;
    const { endpoint } = req.body;
    
    // Validar dados
    if (!endpoint) {
      return res.status(400).json({ error: 'Endpoint da assinatura não fornecido' });
    }
    
    // Remover a assinatura do armazenamento
    // TODO: Implementar função no storage para remover a assinatura
    // await storage.removePushSubscription(userId, endpoint);
    
    logger.info(`Assinatura push removida para usuário ${userId}`);
    
    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Erro ao remover assinatura push:', error);
    res.status(500).json({ error: 'Erro ao remover assinatura push' });
  }
});

// Endpoint para enviar notificação push para um usuário específico (apenas para administradores)
pushRouter.post('/send/:userId', async (req, res) => {
  try {
    // Verificar se o usuário está autenticado e é admin
    if (!req.isAuthenticated() || req.user!.type !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const targetUserId = parseInt(req.params.userId);
    const { title, body, data } = req.body;
    
    // Validar dados
    if (!title || !body) {
      return res.status(400).json({ error: 'Dados da notificação insuficientes' });
    }
    
    // Obter as assinaturas do usuário alvo
    // TODO: Implementar função no storage para obter assinaturas de um usuário
    // const subscriptions = await storage.getUserPushSubscriptions(targetUserId);
    
    // Mock para desenvolvimento
    const subscriptions: any[] = [];
    
    if (!subscriptions.length) {
      return res.status(404).json({ error: 'Usuário não possui assinaturas push' });
    }
    
    // Preparar payload da notificação
    const payload = {
      notification: {
        title,
        body,
        icon: '/icons/notification-icon.png',
        data: data || {},
      }
    };
    
    // Enviar notificação para cada assinatura do usuário
    const results = await Promise.all(
      subscriptions.map(subscription => 
        pushNotificationService.sendNotification(subscription, payload)
      )
    );
    
    // Verificar se pelo menos uma notificação foi enviada com sucesso
    const someSuccess = results.some(result => result === true);
    
    if (someSuccess) {
      logger.info(`Notificação enviada para usuário ${targetUserId}`);
      res.status(200).json({ success: true });
    } else {
      logger.warn(`Falha ao enviar notificação para usuário ${targetUserId}`);
      res.status(500).json({ error: 'Falha ao enviar notificações' });
    }
  } catch (error) {
    logger.error('Erro ao enviar notificação push:', error);
    res.status(500).json({ error: 'Erro ao enviar notificação push' });
  }
});

// Endpoint para gerar chaves VAPID (apenas para setup inicial)
pushRouter.post('/generate-keys', async (req, res) => {
  try {
    // Verificar se o usuário está autenticado e é admin
    if (!req.isAuthenticated() || req.user!.type !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    // Gerar novas chaves VAPID
    const keys = pushNotificationService.generateVAPIDKeys();
    
    res.status(200).json({
      publicKey: keys.publicKey,
      privateKey: keys.privateKey,
      instructions: 'Adicione estas chaves às variáveis de ambiente VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY e reinicie o servidor.'
    });
  } catch (error) {
    logger.error('Erro ao gerar chaves VAPID:', error);
    res.status(500).json({ error: 'Erro ao gerar chaves VAPID' });
  }
});