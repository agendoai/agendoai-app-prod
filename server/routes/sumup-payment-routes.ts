/**
 * Rotas para integração com o gateway de pagamento SumUp
 * 
 * Este arquivo contém as APIs para processar pagamentos com cartão usando a SumUp
 */

import { Router, Request, Response } from 'express';
import * as SumUpPaymentService from '../services/sumup-payment-service';
import { storage } from '../storage';

const router = Router();

// Middleware para verificar se o usuário é um prestador autenticado
const isAuthenticatedProvider = async (req: Request, res: Response, next: Function) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: 'Não autenticado' });
  }
  
  if (req.user.userType !== 'provider') {
    return res.status(403).json({ error: 'Acesso negado: apenas prestadores podem acessar esta rota' });
  }
  
  next();
};

// Ativar/desativar pagamentos online para um prestador
router.post('/sumup/toggle', isAuthenticatedProvider, async (req: Request, res: Response) => {
  try {
    const providerId = req.user.id;
    const { enabled } = req.body;
    
    if (typeof enabled !== 'boolean') {
      return res.status(400).json({ error: 'Parâmetro "enabled" deve ser booleano' });
    }
    
    const result = await SumUpPaymentService.toggleOnlinePayments(providerId, enabled);
    
    if (result) {
      res.status(200).json({ 
        success: true, 
        enabled, 
        message: enabled ? 
          'Pagamentos online ativados com sucesso' : 
          'Pagamentos online desativados com sucesso' 
      });
    } else {
      res.status(500).json({ error: 'Falha ao atualizar configuração de pagamentos' });
    }
  } catch (error) {
    console.error('Erro ao ativar/desativar pagamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Configurar o código de comerciante (merchant code) do prestador
router.post('/sumup/merchant-code', isAuthenticatedProvider, async (req: Request, res: Response) => {
  try {
    const providerId = req.user.id;
    const { merchantCode } = req.body;
    
    if (!merchantCode || typeof merchantCode !== 'string') {
      return res.status(400).json({ error: 'Código de comerciante inválido' });
    }
    
    const result = await SumUpPaymentService.setProviderMerchantCode(providerId, merchantCode);
    
    if (result) {
      res.status(200).json({ 
        success: true,
        merchantCode,
        message: 'Código de comerciante configurado com sucesso' 
      });
    } else {
      res.status(500).json({ error: 'Falha ao configurar código de comerciante' });
    }
  } catch (error) {
    console.error('Erro ao configurar código de comerciante:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar status dos pagamentos online para um prestador
router.get('/sumup/status', isAuthenticatedProvider, async (req: Request, res: Response) => {
  try {
    const providerId = req.user.id;
    const isEnabled = await SumUpPaymentService.isPaymentEnabledForProvider(providerId);
    
    const settings = await storage.getProviderSettings(providerId);
    const merchantCode = settings?.merchantCode || null;
    
    res.status(200).json({
      enabled: isEnabled,
      merchantCode,
      configured: Boolean(merchantCode && isEnabled)
    });
  } catch (error) {
    console.error('Erro ao verificar status dos pagamentos:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Criar um checkout para um pagamento
router.post('/sumup/checkout', async (req: Request, res: Response) => {
  try {
    const { providerId, amount, currency, description, customerEmail, customerPhone, checkoutReference } = req.body;
    
    if (!providerId || !amount || !currency || !description) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes' });
    }
    
    // Verificar se o provedor aceita pagamentos online
    const isEnabled = await SumUpPaymentService.isPaymentEnabledForProvider(providerId);
    if (!isEnabled) {
      return res.status(400).json({ error: 'Este prestador não aceita pagamentos online' });
    }
    
    const checkout = await SumUpPaymentService.createCheckout({
      providerId,
      amount,
      currency,
      description,
      customerEmail,
      customerPhone,
      checkoutReference
    });
    
    res.status(201).json(checkout);
  } catch (error) {
    console.error('Erro ao criar checkout:', error);
    if (error.message.includes('Erro na API SumUp')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Processar pagamento com cartão
router.post('/sumup/process-payment', async (req: Request, res: Response) => {
  try {
    const { checkoutId, cardDetails } = req.body;
    
    if (!checkoutId || !cardDetails) {
      return res.status(400).json({ error: 'Parâmetros obrigatórios ausentes' });
    }
    
    // Validar dados do cartão
    const { name, number, expiryMonth, expiryYear, cvv } = cardDetails;
    
    if (!name || !number || !expiryMonth || !expiryYear || !cvv) {
      return res.status(400).json({ error: 'Dados do cartão incompletos' });
    }
    
    const result = await SumUpPaymentService.completeCheckout(checkoutId, cardDetails);
    
    if (result.status === 'PAID') {
      res.status(200).json({
        success: true,
        transactionId: result.transactionId,
        transactionCode: result.transactionCode,
        status: result.status,
        message: 'Pagamento processado com sucesso'
      });
    } else {
      res.status(400).json({
        success: false,
        status: result.status,
        message: 'Falha no processamento do pagamento'
      });
    }
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    if (error.message.includes('Erro ao processar pagamento')) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Verificar status de um checkout
router.get('/sumup/checkout/:id', async (req: Request, res: Response) => {
  try {
    const checkoutId = req.params.id;
    
    if (!checkoutId) {
      return res.status(400).json({ error: 'ID do checkout não fornecido' });
    }
    
    const result = await SumUpPaymentService.getCheckoutStatus(checkoutId);
    
    res.status(200).json(result);
  } catch (error) {
    console.error('Erro ao verificar status do checkout:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

export default router;