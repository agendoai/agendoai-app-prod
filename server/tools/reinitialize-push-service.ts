/**
 * Utilitário para reinicializar o serviço de notificações push
 * 
 * Este script reconfigura o serviço de notificações push com
 * as chaves VAPID armazenadas no banco de dados.
 * 
 * Útil para quando as chaves VAPID já foram geradas e armazenadas,
 * mas o serviço precisa ser reinicializado após uma mudança.
 * 
 * Executar: 
 * npx tsx server/tools/reinitialize-push-service.ts
 */
import { db } from '../db';
import { systemSettings } from '../../shared/schema';
import { eq } from 'drizzle-orm';
import { createLogger } from '../logger';
import { pushNotificationService } from '../push-notification-service';

const logger = createLogger('PushServiceReinitializer');

// Função principal
async function main() {
  logger.info('Iniciando reinicialização do serviço de notificações push...');
  
  try {
    // Obter chaves VAPID do banco de dados
    logger.info('Buscando configurações VAPID no banco de dados...');
    
    const settings = await db
      .select()
      .from(systemSettings)
      .where(
        eq(systemSettings.key, 'VAPID_PUBLIC_KEY')
      );
      
    const privateKeySettings = await db
      .select()
      .from(systemSettings)
      .where(
        eq(systemSettings.key, 'VAPID_PRIVATE_KEY')
      );
      
    const subjectSettings = await db
      .select()
      .from(systemSettings)
      .where(
        eq(systemSettings.key, 'VAPID_SUBJECT')
      );
      
    const allSettings = [...settings, ...privateKeySettings, ...subjectSettings];
    
    if (allSettings.length === 0) {
      logger.error('Nenhuma configuração VAPID encontrada no banco de dados.');
      logger.info('Execute o script generate-vapid-keys.ts para gerar novas chaves.');
      process.exit(1);
    }
    
    // Mapear configurações
    const config: Record<string, string | null> = {};
    allSettings.forEach((setting) => {
      config[setting.key] = setting.value;
    });
    
    // Verificar se todas as chaves necessárias estão presentes
    if (!config.VAPID_PUBLIC_KEY || !config.VAPID_PRIVATE_KEY) {
      logger.error('Configurações VAPID incompletas no banco de dados.');
      logger.info('Execute o script generate-vapid-keys.ts para gerar novas chaves completas.');
      process.exit(1);
    }
    
    // Exibir informações (parciais) das chaves
    logger.info(`Chave pública: ${config.VAPID_PUBLIC_KEY.substring(0, 10)}...`);
    logger.info(`Chave privada: ${config.VAPID_PRIVATE_KEY.substring(0, 6)}...`);
    logger.info(`Assunto: ${config.VAPID_SUBJECT || 'mailto:notifications@agendoai.com'}`);
    
    // Reinicializar serviço
    logger.info('Reinicializando serviço de notificações push...');
    pushNotificationService.initialize(
      config.VAPID_PUBLIC_KEY,
      config.VAPID_PRIVATE_KEY,
      config.VAPID_SUBJECT || undefined
    );
    
    if (pushNotificationService.isInitialized()) {
      logger.info('✅ Serviço de notificações push reinicializado com sucesso!');
    } else {
      logger.error('❌ Falha ao reinicializar o serviço de notificações push.');
      logger.info('Verifique as chaves VAPID armazenadas no banco de dados.');
      process.exit(1);
    }
  } catch (error) {
    logger.error('Erro ao reinicializar serviço de notificações push:', error);
    process.exit(1);
  }
}

// Executar função principal
main().catch(error => {
  logger.error('Erro fatal:', error);
  process.exit(1);
});