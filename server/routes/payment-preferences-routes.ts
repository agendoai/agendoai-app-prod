import { Router } from "express";
import { db } from "../db";
import { eq } from "drizzle-orm";
import { 
  providerPaymentPreferences, 
  clientPaymentPreferences,
  insertProviderPaymentPreferenceSchema,
  insertClientPaymentPreferenceSchema
} from "@shared/schema";
// Middleware para verificar se o usuário está autenticado
const isAuthenticated = (req: any, res: any, next: any) => {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: "Não autorizado" });
};

// Este arquivo contém as rotas para gerenciar as preferências de pagamento
// tanto de prestadores quanto de clientes

export function registerPaymentPreferencesRoutes(router: Router) {
  // Rotas para preferências de pagamento do prestador
  
  // Obter preferências do prestador logado
  router.get("/provider/payment-preferences", isAuthenticated, async (req, res) => {
    if (req.user?.userType !== 'provider') {
      return res.status(403).json({
        error: "Apenas prestadores podem acessar esta rota"
      });
    }

    try {
      const [preferences] = await db
        .select()
        .from(providerPaymentPreferences)
        .where(eq(providerPaymentPreferences.providerId, req.user.id));

      // Se não existir, criar um registro padrão
      if (!preferences) {
        const defaultPreferences = {
          providerId: req.user.id,
          acceptsCreditCard: true,
          acceptsDebitCard: true,
          acceptsPix: true,
          acceptsCash: true,
          acceptsTransfer: false,
          preferStripe: true,
          preferAsaas: false,
          preferManual: false,
          autoConfirm: false,
          requestPrePayment: false,
          allowPartialPayment: false
        };

        // Criar preferências padrão
        const [newPreferences] = await db
          .insert(providerPaymentPreferences)
          .values(defaultPreferences)
          .returning();

        return res.status(200).json(newPreferences);
      }

      return res.status(200).json(preferences);
    } catch (error) {
      console.error("Erro ao buscar preferências de pagamento do prestador:", error);
      return res.status(500).json({
        error: "Erro ao buscar preferências de pagamento"
      });
    }
  });

  // Atualizar preferências do prestador
  router.put("/provider/payment-preferences", isAuthenticated, async (req, res) => {
    if (req.user?.userType !== 'provider') {
      return res.status(403).json({
        error: "Apenas prestadores podem acessar esta rota"
      });
    }

    try {
      // Validar dados com zod
      const validatedData = insertProviderPaymentPreferenceSchema.parse({
        ...req.body,
        providerId: req.user.id
      });

      // Verificar se já existe registro
      const [existingPreferences] = await db
        .select()
        .from(providerPaymentPreferences)
        .where(eq(providerPaymentPreferences.providerId, req.user.id));

      let result;
      
      if (existingPreferences) {
        // Atualizar registro existente
        [result] = await db
          .update(providerPaymentPreferences)
          .set({
            ...validatedData,
            updatedAt: new Date()
          })
          .where(eq(providerPaymentPreferences.id, existingPreferences.id))
          .returning();
      } else {
        // Criar novo registro
        [result] = await db
          .insert(providerPaymentPreferences)
          .values({
            ...validatedData,
            providerId: req.user.id
          })
          .returning();
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Erro ao atualizar preferências de pagamento do prestador:", error);
      return res.status(500).json({
        error: "Erro ao atualizar preferências de pagamento"
      });
    }
  });

  // Rotas para preferências de pagamento do cliente
  
  // Obter preferências do cliente logado
  router.get("/client/payment-preferences", isAuthenticated, async (req, res) => {
    if (req.user?.userType !== 'client') {
      return res.status(403).json({
        error: "Apenas clientes podem acessar esta rota"
      });
    }

    try {
      const [preferences] = await db
        .select()
        .from(clientPaymentPreferences)
        .where(eq(clientPaymentPreferences.clientId, req.user.id));

      // Se não existir, criar um registro padrão
      if (!preferences) {
        const defaultPreferences = {
          clientId: req.user.id,
          preferCreditCard: true,
          preferDebitCard: false,
          preferPix: false,
          preferCash: false,
          savePaymentInfo: true
        };

        // Criar preferências padrão
        const [newPreferences] = await db
          .insert(clientPaymentPreferences)
          .values(defaultPreferences)
          .returning();

        return res.status(200).json(newPreferences);
      }

      return res.status(200).json(preferences);
    } catch (error) {
      console.error("Erro ao buscar preferências de pagamento do cliente:", error);
      return res.status(500).json({
        error: "Erro ao buscar preferências de pagamento"
      });
    }
  });

  // Atualizar preferências do cliente
  router.put("/client/payment-preferences", isAuthenticated, async (req, res) => {
    if (req.user?.userType !== 'client') {
      return res.status(403).json({
        error: "Apenas clientes podem acessar esta rota"
      });
    }

    try {
      // Validar dados com zod
      const validatedData = insertClientPaymentPreferenceSchema.parse({
        ...req.body,
        clientId: req.user.id
      });

      // Verificar se já existe registro
      const [existingPreferences] = await db
        .select()
        .from(clientPaymentPreferences)
        .where(eq(clientPaymentPreferences.clientId, req.user.id));

      let result;
      
      if (existingPreferences) {
        // Atualizar registro existente
        [result] = await db
          .update(clientPaymentPreferences)
          .set({
            ...validatedData,
            updatedAt: new Date()
          })
          .where(eq(clientPaymentPreferences.id, existingPreferences.id))
          .returning();
      } else {
        // Criar novo registro
        [result] = await db
          .insert(clientPaymentPreferences)
          .values({
            ...validatedData,
            clientId: req.user.id
          })
          .returning();
      }

      return res.status(200).json(result);
    } catch (error) {
      console.error("Erro ao atualizar preferências de pagamento do cliente:", error);
      return res.status(500).json({
        error: "Erro ao atualizar preferências de pagamento"
      });
    }
  });

  // Obter métodos de pagamento aceitos por um prestador específico
  router.get("/providers/:providerId/payment-methods", async (req, res) => {
    const providerId = Number(req.params.providerId);
    
    if (isNaN(providerId)) {
      return res.status(400).json({
        error: "ID de prestador inválido"
      });
    }

    try {
      const [preferences] = await db
        .select()
        .from(providerPaymentPreferences)
        .where(eq(providerPaymentPreferences.providerId, providerId));

      // Se não existirem preferências, retornar valores padrão
      if (!preferences) {
        return res.status(200).json({
          acceptsCreditCard: true,
          acceptsDebitCard: true,
          acceptsPix: true,
          acceptsCash: true,
          acceptsTransfer: false,
          preferStripe: false,
          preferAsaas: false,
          preferManual: true,
          requestPrePayment: false,
          allowPartialPayment: false,
          autoConfirm: false
        });
      }

      // Retornar todos os dados de preferências de pagamento
      return res.status(200).json({
        acceptsCreditCard: preferences.acceptsCreditCard,
        acceptsDebitCard: preferences.acceptsDebitCard,
        acceptsPix: preferences.acceptsPix,
        acceptsCash: preferences.acceptsCash,
        acceptsTransfer: preferences.acceptsTransfer,
        preferStripe: preferences.preferStripe,
        preferAsaas: preferences.preferAsaas,
        preferManual: preferences.preferManual,
        requestPrePayment: preferences.requestPrePayment,
        allowPartialPayment: preferences.allowPartialPayment,
        autoConfirm: preferences.autoConfirm
      });
    } catch (error) {
      console.error("Erro ao buscar métodos de pagamento aceitos pelo prestador:", error);
      return res.status(500).json({
        error: "Erro ao buscar métodos de pagamento"
      });
    }
  });
}