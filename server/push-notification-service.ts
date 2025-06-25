/**
 * Serviço de notificações push
 * Utiliza Web Push para enviar notificações push para navegadores
 * 
 * Este serviço verifica primeiro por chaves VAPID no banco de dados (tabela system_settings)
 * antes de usar as variáveis de ambiente. Isso permite configurar as chaves via interface de administração.
 */
import webpush from 'web-push';
import { createLogger } from './logger';
import { db } from './db';
import { systemSettings } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Inicialização do logger
const logger = createLogger('PushNotification');

interface PushSubscription {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  private initialized = false;

  constructor() {
    this.initialize();
  }

  /**
   * Inicializa o serviço de notificações push
   * @param customPublicKey Chave pública VAPID personalizada (opcional)
   * @param customPrivateKey Chave privada VAPID personalizada (opcional)
   * @param customSubject Email de contato para notificações VAPID (opcional)
   */
  initialize(customPublicKey?: string, customPrivateKey?: string, customSubject?: string): void {
    let vapidPublicKey = customPublicKey || process.env.VAPID_PUBLIC_KEY;
    let vapidPrivateKey = customPrivateKey || process.env.VAPID_PRIVATE_KEY;
    const vapidSubject = customSubject || process.env.VAPID_SUBJECT || 'mailto:notifications@agendoai.com';

    if (vapidPublicKey && vapidPrivateKey) {
      try {
        // Garantir que as chaves estão no formato correto (URL safe Base64 sem '=')
        vapidPublicKey = this.cleanVapidKey(vapidPublicKey);
        vapidPrivateKey = this.cleanVapidKey(vapidPrivateKey);

        logger.info(`Configurando VAPID com chave pública: ${vapidPublicKey.substring(0, 10)}...`);
        
        webpush.setVapidDetails(
          vapidSubject,
          vapidPublicKey,
          vapidPrivateKey
        );
        this.initialized = true;
        logger.info('Serviço de notificações push inicializado com sucesso');
      } catch (error) {
        logger.error('Erro ao inicializar serviço de notificações push:', error);
        // Sugestão para resolução
        logger.info('Dica: Execute "npx tsx server/tools/generate-vapid-keys.ts" para gerar novas chaves VAPID válidas');
      }
    } else {
      logger.warn('Chaves VAPID não encontradas. Serviço de notificações push não inicializado');
      logger.info('Dica: Execute "npx tsx server/tools/generate-vapid-keys.ts" para gerar chaves VAPID');
    }
  }
  
  /**
   * Limpa uma chave VAPID para garantir que esteja no formato URL safe Base64 sem caracteres '='
   * @param key A chave VAPID a ser limpa
   * @returns A chave no formato adequado
   */
  private cleanVapidKey(key: string): string {
    if (!key) return "";
    
    // Remove espaços em branco, quebras de linha e tabulações
    let cleanKey = key.trim().replace(/[\r\n\t]/g, '');
    
    // Substitui caracteres não URL safe (+ para - e / para _)
    cleanKey = cleanKey.replace(/\+/g, '-').replace(/\//g, '_');
    
    // Remove caracteres de igual (=) do final da chave
    cleanKey = cleanKey.replace(/=+$/, '');
    
    // Verificação adicional para garantir que não há caracteres '=' restantes
    if (cleanKey.includes('=')) {
      cleanKey = cleanKey.replace(/=/g, '');
      logger.warn('A chave VAPID continha caracteres "=" no meio do texto e foi limpa. Recomenda-se gerar novas chaves.');
    }
    
    return cleanKey;
  }

  /**
   * Verifica se o serviço está inicializado
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Gera chaves VAPID para o serviço de notificações push
   * Chaves devem ser salvas em variáveis de ambiente:
   * - VAPID_PUBLIC_KEY
   * - VAPID_PRIVATE_KEY
   * @returns Objeto com as chaves pública e privada
   */
  generateVAPIDKeys(): { publicKey: string; privateKey: string } {
    const keys = webpush.generateVAPIDKeys();
    return keys;
  }

  /**
   * Envia notificação push para um assinante
   * @param subscription Dados da assinatura push
   * @param payload Conteúdo da notificação
   * @returns Promise<boolean> Indicando sucesso/falha
   */
  async sendNotification(
    subscription: PushSubscription,
    payload: any
  ): Promise<boolean> {
    if (!this.initialized) {
      logger.error('Tentativa de enviar notificação com serviço não inicializado');
      return false;
    }

    try {
      // Converte payload para string se for objeto
      const stringPayload = typeof payload === 'object' 
        ? JSON.stringify(payload) 
        : payload;

      await webpush.sendNotification(subscription, stringPayload);
      logger.info(`Notificação push enviada com sucesso para: ${subscription.endpoint}`);
      return true;
    } catch (error) {
      logger.error(`Erro ao enviar notificação push:`, error);
      return false;
    }
  }

  /**
   * Prepara payload para notificação de agendamento
   * @param appointmentDetails Detalhes do agendamento 
   * @returns Objeto com dados formatados para notificação
   */
  createAppointmentNotificationPayload(appointmentDetails: any): any {
    const { 
      appointmentId, 
      serviceName, 
      providerName, 
      date, 
      time 
    } = appointmentDetails;

    return {
      notification: {
        title: 'Agendamento Confirmado',
        body: `Seu agendamento de ${serviceName} com ${providerName} foi confirmado para ${date} às ${time}.`,
        icon: '/icons/appointment-icon.png',
        badge: '/icons/badge-icon.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          type: 'appointment',
          appointmentId
        },
        actions: [
          {
            action: 'view',
            title: 'Ver Detalhes'
          }
        ]
      }
    };
  }

  /**
   * Prepara payload para notificação de cancelamento
   * @param appointmentDetails Detalhes do agendamento 
   * @returns Objeto com dados formatados para notificação
   */
  createCancellationNotificationPayload(appointmentDetails: any): any {
    const { 
      appointmentId, 
      serviceName, 
      providerName, 
      date, 
      time 
    } = appointmentDetails;

    return {
      notification: {
        title: 'Agendamento Cancelado',
        body: `Seu agendamento de ${serviceName} com ${providerName} para ${date} às ${time} foi cancelado.`,
        icon: '/icons/cancel-icon.png',
        badge: '/icons/badge-icon.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          type: 'cancellation',
          appointmentId
        }
      }
    };
  }

  /**
   * Prepara payload para notificação de lembrete
   * @param appointmentDetails Detalhes do agendamento 
   * @returns Objeto com dados formatados para notificação
   */
  createReminderNotificationPayload(appointmentDetails: any): any {
    const { 
      appointmentId, 
      serviceName, 
      providerName, 
      date, 
      time 
    } = appointmentDetails;

    return {
      notification: {
        title: 'Lembrete de Agendamento',
        body: `Seu agendamento de ${serviceName} com ${providerName} está confirmado para ${date} às ${time}.`,
        icon: '/icons/reminder-icon.png',
        badge: '/icons/badge-icon.png',
        vibrate: [100, 50, 100],
        data: {
          dateOfArrival: Date.now(),
          type: 'reminder',
          appointmentId
        },
        actions: [
          {
            action: 'view',
            title: 'Ver Detalhes'
          }
        ]
      }
    };
  }
}

// Exporta uma instância única do serviço
export const pushNotificationService = new PushNotificationService();