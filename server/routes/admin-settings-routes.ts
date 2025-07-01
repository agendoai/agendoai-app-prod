import { Express } from "express";
import { db } from "../db";
import { systemSettings } from "@shared/schema";
import { eq } from "drizzle-orm";
import webpush from "web-push";
import { pushService } from "../push-notification-service";
import { logger } from "../logger";

/**
 * Configura rotas para administração de configurações do sistema
 */
export function registerAdminSettingsRoutes(app: Express): void {
  
  /**
   * Rota para obter todas as configurações do sistema
   */
  app.get("/api/admin/integrations-settings/system-settings", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(401).json({ message: "Não autorizado" });
      }
      
      const settings = await db.select().from(systemSettings);
      return res.json(settings);
    } catch (error) {
      logger.error("Erro ao buscar configurações do sistema", { error });
      return res.status(500).json({ message: "Erro ao buscar configurações" });
    }
  });
  
  /**
   * Rota para obter uma configuração específica do sistema
   */
  app.get("/api/admin/integrations-settings/system-settings/:key", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(401).json({ message: "Não autorizado" });
      }
      
      const { key } = req.params;
      const [setting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key));
        
      if (!setting) {
        return res.status(404).json({ message: "Configuração não encontrada" });
      }
      
      return res.json(setting);
    } catch (error) {
      logger.error(`Erro ao buscar configuração ${req.params.key}`, { error });
      return res.status(500).json({ message: "Erro ao buscar configuração" });
    }
  });
  
  /**
   * Rota para atualizar uma configuração do sistema
   */
  app.post("/api/admin/integrations-settings/system-settings/:key", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(401).json({ message: "Não autorizado" });
      }
      
      const { key } = req.params;
      const { value } = req.body;
      
      if (value === undefined) {
        return res.status(400).json({ message: "Valor da configuração é obrigatório" });
      }
      
      // Verificar se a configuração existe
      const [existingSetting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key));
        
      if (existingSetting) {
        // Atualizar configuração existente
        const [updatedSetting] = await db
          .update(systemSettings)
          .set({ value, updatedAt: new Date() })
          .where(eq(systemSettings.key, key))
          .returning();
          
        // Verificar se é uma configuração VAPID e recarregar o serviço de notificações
        if (key.startsWith("VAPID_")) {
          try {
            await pushService.reloadVapidConfiguration();
            logger.info(`Configuração VAPID '${key}' atualizada e serviço recarregado`);
          } catch (vapidError) {
            logger.error("Erro ao recarregar configuração VAPID", { error: vapidError });
            // Não falhar a operação, apenas logar o erro
          }
        }
        
        return res.json(updatedSetting);
      } else {
        // Criar nova configuração
        const [newSetting] = await db
          .insert(systemSettings)
          .values({
            key,
            value,
            createdAt: new Date(),
            updatedAt: new Date()
          })
          .returning();
          
        // Verificar se é uma configuração VAPID e recarregar o serviço de notificações
        if (key.startsWith("VAPID_")) {
          try {
            await pushService.reloadVapidConfiguration();
            logger.info(`Configuração VAPID '${key}' criada e serviço recarregado`);
          } catch (vapidError) {
            logger.error("Erro ao recarregar configuração VAPID", { error: vapidError });
            // Não falhar a operação, apenas logar o erro
          }
        }
        
        return res.status(201).json(newSetting);
      }
    } catch (error) {
      logger.error(`Erro ao atualizar configuração ${req.params.key}`, { error });
      return res.status(500).json({ message: "Erro ao atualizar configuração" });
    }
  });
  
  /**
   * Rota para excluir uma configuração do sistema
   */
  app.delete("/api/admin/integrations-settings/system-settings/:key", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(401).json({ message: "Não autorizado" });
      }
      
      const { key } = req.params;
      
      // Verificar se a configuração existe
      const [existingSetting] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, key));
        
      if (!existingSetting) {
        return res.status(404).json({ message: "Configuração não encontrada" });
      }
      
      // Excluir configuração
      await db
        .delete(systemSettings)
        .where(eq(systemSettings.key, key));
        
      // Verificar se é uma configuração VAPID e recarregar o serviço de notificações
      if (key.startsWith("VAPID_")) {
        try {
          await pushService.reloadVapidConfiguration();
          logger.info(`Configuração VAPID '${key}' excluída e serviço recarregado`);
        } catch (vapidError) {
          logger.error("Erro ao recarregar configuração VAPID após exclusão", { error: vapidError });
          // Não falhar a operação, apenas logar o erro
        }
      }
        
      return res.status(200).json({ message: "Configuração excluída com sucesso" });
    } catch (error) {
      logger.error(`Erro ao excluir configuração ${req.params.key}`, { error });
      return res.status(500).json({ message: "Erro ao excluir configuração" });
    }
  });
  
  /**
   * Rota para obter status do serviço de notificações push
   */
  app.get("/api/admin/integrations-settings/system-settings/push-notification-status", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(401).json({ message: "Não autorizado" });
      }
      
      const status = {
        initialized: pushService.isInitialized(),
        vapidKeysConfigured: pushService.isVapidConfigured()
      };
      
      return res.json(status);
    } catch (error) {
      logger.error("Erro ao obter status do serviço de notificações push", { error });
      return res.status(500).json({ message: "Erro ao obter status do serviço" });
    }
  });
  
  /**
   * Rota para gerar novas chaves VAPID
   */
  app.post("/api/admin/integrations-settings/system-settings/vapid/generate", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(401).json({ message: "Não autorizado" });
      }
      
      // Gerar novas chaves VAPID
      const vapidKeys = webpush.generateVAPIDKeys();
      
      // Salvar chave pública
      const [existingPublicKey] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "VAPID_PUBLIC_KEY"));
        
      if (existingPublicKey) {
        await db
          .update(systemSettings)
          .set({ value: vapidKeys.publicKey, updatedAt: new Date() })
          .where(eq(systemSettings.key, "VAPID_PUBLIC_KEY"));
      } else {
        await db
          .insert(systemSettings)
          .values({
            key: "VAPID_PUBLIC_KEY",
            value: vapidKeys.publicKey,
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
      
      // Salvar chave privada
      const [existingPrivateKey] = await db
        .select()
        .from(systemSettings)
        .where(eq(systemSettings.key, "VAPID_PRIVATE_KEY"));
        
      if (existingPrivateKey) {
        await db
          .update(systemSettings)
          .set({ value: vapidKeys.privateKey, updatedAt: new Date() })
          .where(eq(systemSettings.key, "VAPID_PRIVATE_KEY"));
      } else {
        await db
          .insert(systemSettings)
          .values({
            key: "VAPID_PRIVATE_KEY",
            value: vapidKeys.privateKey,
            createdAt: new Date(),
            updatedAt: new Date()
          });
      }
      
      // Recarregar configurações VAPID
      try {
        await pushService.reloadVapidConfiguration();
        logger.info("Novas chaves VAPID geradas e serviço recarregado");
      } catch (vapidError) {
        logger.error("Erro ao recarregar configuração VAPID após geração de novas chaves", { error: vapidError });
        // Não falhar a operação, apenas logar o erro
      }
      
      return res.json({ publicKey: vapidKeys.publicKey });
    } catch (error) {
      logger.error("Erro ao gerar novas chaves VAPID", { error });
      return res.status(500).json({ message: "Erro ao gerar novas chaves VAPID" });
    }
  });
}