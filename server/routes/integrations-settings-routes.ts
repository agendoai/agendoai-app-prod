/**
 * Rotas para gerenciamento de configurações de integrações
 */
import { Router, Request, Response } from 'express';
import { storage } from '../storage';
import { createLogger } from '../logger';
import { emailService } from '../email-service';
import { pushNotificationService } from '../push-notification-service';
// Chatbot removido

// Inicialização do logger
const logger = createLogger('IntegrationsSettings');

// Criação do router de configurações de integrações
export const integrationsRouter = Router();

// Middleware para verificar se o usuário é administrador
const isAdmin = (req: Request, res: Response, next: Function) => {
  if (req.user && req.user.userType === "admin") {
    return next();
  }
  return res.status(403).json({ error: "Permissão negada" });
};

// Endpoint para obter configurações de integrações
integrationsRouter.get('/', isAdmin, async (req, res) => {
  try {
    const settings = await storage.getIntegrationsSettings();
    
    // Se não existir configurações, retorna um objeto vazio com valores padrão
    if (!settings) {
      return res.json({
        id: null,
        sendGridEnabled: false,
        pushNotificationsEnabled: false,
        whatsappEnabled: false,
        whatsappVerifyToken: '',
        whatsappBusinessId: '',
        whatsappChatbotEnabled: false,
        whatsappChatbotWelcomeMessage: 'Olá! Bem-vindo ao AgendoAI. Como posso ajudar você hoje?',
        whatsappChatbotSchedulingEnabled: false
      });
    }
    
    // Limpa valores sensíveis
    const sanitizedSettings = {
      ...settings,
      // Mantém apenas o status para as chaves sensíveis
      sendGridApiKey: settings.sendGridApiKey ? '••••••••••••••••••••••' : '',
      vapidPrivateKey: settings.vapidPrivateKey ? '••••••••••••••••••••••' : '',
      whatsappApiKey: settings.whatsappApiKey ? '••••••••••••••••••••••' : '',
    };
    
    res.json(sanitizedSettings);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error('Erro ao obter configurações de integrações:', error);
    res.status(500).json({ error: 'Erro ao obter configurações de integrações: ' + errorMessage });
  }
});

// Endpoint para atualizar ou criar configurações de integrações
integrationsRouter.put('/:id', isAdmin, async (req, res) => {
  try {
    const settingsId = parseInt(req.params.id);
    const settingsData = req.body;
    
    // Carregar configurações atuais para comparar com as novas
    const currentSettings = await storage.getIntegrationsSettings();
    
    // Verifica se mantém valores sensíveis caso o campo esteja mascarado
    if (currentSettings) {
      if (settingsData.sendGridApiKey === '••••••••••••••••••••••') {
        settingsData.sendGridApiKey = currentSettings.sendGridApiKey;
      }
      
      if (settingsData.vapidPrivateKey === '••••••••••••••••••••••') {
        settingsData.vapidPrivateKey = currentSettings.vapidPrivateKey;
      }
      
      if (settingsData.whatsappApiKey === '••••••••••••••••••••••') {
        settingsData.whatsappApiKey = currentSettings.whatsappApiKey;
      }
    }
    
    // Atualizar configurações
    const updatedSettings = await storage.updateIntegrationsSettings(settingsId, settingsData);
    
    // Atualizar serviços com as novas configurações
    if (emailService && updatedSettings && updatedSettings.sendGridApiKey) {
      // Atualizar configuração do serviço de email
      process.env.SENDGRID_API_KEY = updatedSettings.sendGridApiKey;
      // Reiniciar o serviço para aplicar a nova chave
      emailService.initialize(updatedSettings.sendGridApiKey);
    }
    
    if (pushNotificationService && updatedSettings && updatedSettings.vapidPublicKey && updatedSettings.vapidPrivateKey) {
      // Atualizar configuração do serviço de notificações push
      process.env.VAPID_PUBLIC_KEY = updatedSettings.vapidPublicKey;
      process.env.VAPID_PRIVATE_KEY = updatedSettings.vapidPrivateKey;
      // Reiniciar o serviço para aplicar as novas chaves
      pushNotificationService.initialize(updatedSettings.vapidPublicKey, updatedSettings.vapidPrivateKey);
    }
    
    // Funcionalidade de chatbot do WhatsApp removida
    
    // Sanitizar resposta
    const sanitizedSettings = updatedSettings ? {
      ...updatedSettings,
      sendGridApiKey: updatedSettings.sendGridApiKey ? '••••••••••••••••••••••' : '',
      vapidPrivateKey: updatedSettings.vapidPrivateKey ? '••••••••••••••••••••••' : '',
      whatsappApiKey: updatedSettings.whatsappApiKey ? '••••••••••••••••••••••' : '',
    } : { error: "Configurações não puderam ser atualizadas" };
    
    res.json(sanitizedSettings);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error('Erro ao atualizar configurações de integrações:', error);
    res.status(500).json({ error: 'Erro ao atualizar configurações de integrações: ' + errorMessage });
  }
});

// Endpoint para criar configurações de integrações (caso não existam)
integrationsRouter.post('/', isAdmin, async (req, res) => {
  try {
    const settingsData = req.body;
    
    // Criar novas configurações
    const newSettings = await storage.createIntegrationsSettings(settingsData);
    
    // Atualizar serviços com as novas configurações
    if (emailService && newSettings && newSettings.sendGridApiKey) {
      process.env.SENDGRID_API_KEY = newSettings.sendGridApiKey;
      emailService.initialize(newSettings.sendGridApiKey);
    }
    
    if (pushNotificationService && newSettings && newSettings.vapidPublicKey && newSettings.vapidPrivateKey) {
      process.env.VAPID_PUBLIC_KEY = newSettings.vapidPublicKey;
      process.env.VAPID_PRIVATE_KEY = newSettings.vapidPrivateKey;
      pushNotificationService.initialize(newSettings.vapidPublicKey, newSettings.vapidPrivateKey);
    }
    
    // Funcionalidade de chatbot do WhatsApp removida
    
    // Sanitizar resposta
    const sanitizedSettings = {
      ...newSettings,
      sendGridApiKey: newSettings.sendGridApiKey ? '••••••••••••••••••••••' : '',
      vapidPrivateKey: newSettings.vapidPrivateKey ? '••••••••••••••••••••••' : '',
      whatsappApiKey: newSettings.whatsappApiKey ? '••••••••••••••••••••••' : '',
    };
    
    res.status(201).json(sanitizedSettings);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error('Erro ao criar configurações de integrações:', error);
    res.status(500).json({ error: 'Erro ao criar configurações de integrações: ' + errorMessage });
  }
});

// Endpoint para testar a configuração do SendGrid
integrationsRouter.post('/test-sendgrid', isAdmin, async (req, res) => {
  try {
    const { apiKey } = req.body;
    
    if (!apiKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'Chave de API não fornecida' 
      });
    }
    
    // Testar o envio de um email de teste
    const testResult = await emailService.sendTestEmail(apiKey);
    
    if (testResult) {
      res.json({ 
        success: true, 
        message: 'Teste do SendGrid realizado com sucesso' 
      });
    } else {
      res.status(400).json({ 
        success: false, 
        message: 'Falha ao testar o SendGrid. Verifique a chave de API.' 
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error('Erro ao testar SendGrid:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao testar SendGrid: ' + errorMessage 
    });
  }
});

// Endpoint para testar a configuração do WhatsApp
integrationsRouter.post('/test-whatsapp', isAdmin, async (req, res) => {
  try {
    const { apiKey, phoneNumberId } = req.body;
    
    if (!apiKey || !phoneNumberId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Chave de API ou ID do número de telefone não fornecidos' 
      });
    }
    
    // Verificar a conexão com a API do WhatsApp
    // Usamos fetch para uma chamada simples à API
    const response = await fetch(`https://graph.facebook.com/v16.0/${phoneNumberId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      res.json({ 
        success: true, 
        message: 'Conexão com a API do WhatsApp verificada com sucesso' 
      });
    } else {
      const errorData = await response.json();
      res.status(400).json({ 
        success: false, 
        message: `Falha ao verificar conexão com o WhatsApp: ${errorData.error?.message || 'Erro desconhecido'}` 
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error('Erro ao testar conexão com o WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao testar conexão com o WhatsApp: ' + errorMessage 
    });
  }
});

// Endpoint para testar o chatbot do WhatsApp com uma mensagem simulada
integrationsRouter.post('/test-chatbot', isAdmin, async (req, res) => {
  try {
    const { message, phoneNumber } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'É necessário fornecer uma mensagem para testar o chatbot' 
      });
    }
    
    // Obter ou usar o telefone padrão para teste
    const testPhoneNumber = phoneNumber || '5511999999999';
    
    // Importa a função de teste do chatbot e o SessionManager
    const { testChatbot } = await import('../../chatbt');
    const { SessionManager } = await import('../../chatbt/models/session');
    
    // Define um timeout para garantir que o teste não fica travado
    const timeoutPromise = new Promise<boolean>((resolve) => {
      setTimeout(() => resolve(false), 10000); // 10 segundos de timeout
    });
    
    // Executar o teste com timeout
    const testSuccess = await Promise.race([
      testChatbot(message, testPhoneNumber),
      timeoutPromise
    ]);
    
    if (!testSuccess) {
      return res.status(500).json({
        success: false,
        message: 'Timeout ou erro ao testar o chatbot. A resposta não foi recebida dentro do tempo esperado.'
      });
    }
    
    // Buscar o último estado e resposta da sessão
    const session = SessionManager.getSession(testPhoneNumber);
    
    // Obter as últimas mensagens do histórico
    const lastMessages = session.context.lastMessages || [];
    let lastResponse = 'Nenhuma resposta recebida do chatbot.';
    
    if (lastMessages.length > 0) {
      // Encontrar a última mensagem do assistente
      for (let i = lastMessages.length - 1; i >= 0; i--) {
        if (lastMessages[i].role === 'assistant') {
          lastResponse = lastMessages[i].content;
          break;
        }
      }
    }
    
    res.json({ 
      success: true, 
      message: 'Chatbot testado com sucesso', 
      userMessage: message,
      botResponse: lastResponse,
      sessionState: session.state,
      contextData: {
        ...session.context,
        lastMessages: undefined // Não retorna o histórico completo de mensagens
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
    logger.error('Erro ao testar o chatbot do WhatsApp:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro ao testar o chatbot do WhatsApp: ' + errorMessage 
    });
  }
});