/**
 * Rotas para marketplace com Asaas
 * 
 * Este módulo implementa rotas para gerenciar marketplace com split,
 * custódia, onboarding de prestadores e pagamentos via Asaas
 */
import { Router } from 'express';
import { isAuthenticated, isClient, isProvider, isAdmin, isSupport, isAdminOrSupport } from '../middleware/jwt-auth';
import { z } from 'zod';
import { storage } from '../storage';
import {
  createAsaasCustomer,
  createAsaasWallet,
  createAsaasPaymentWithSubAccountSplit,
  isAsaasEnabled
} from '../asaas-service';

export const asaasMarketplaceRouter = Router();

// ==================== ONBOARDING DE PRESTADORES ====================

/**
 * Schema para cadastro de prestador
 */
const createProviderSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  cpfCnpj: z.string().min(11).max(18),
  phone: z.string().optional(),
  birthDate: z.string().regex(/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/, 'Data deve estar no formato YYYY-MM-DD'),
  monthlyIncome: z.union([
    z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, 'Informe a renda mensal'),
    z.number().min(0.01, 'Informe a renda mensal')
  ]), // aceita string ou número
  address: z.string().min(1),
  addressNumber: z.string().min(1),
  city: z.string().min(1),
  state: z.string().min(1),
  postalCode: z.string().min(1),
  bankAccount: z.object({
    bank: z.string(),
    accountNumber: z.string(),
    accountDigit: z.string(),
    branchNumber: z.string(),
    branchDigit: z.string().optional(),
    accountType: z.enum(['CHECKING','SAVINGS'])
  }).optional()
});

/**
 * Cadastra um novo prestador (onboarding automatizado)
 * POST /api/asaas-marketplace/providers
 */
asaasMarketplaceRouter.post('/providers', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Verificar se o Asaas está habilitado
    if (!isAsaasEnabled()) {
      return res.status(400).json({ message: 'Asaas não está configurado' });
    }

    const validation = createProviderSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: validation.error.format() 
      });
    }

    const providerData = validation.data;

    // Converter renda para string com duas casas decimais antes de enviar ao Asaas
    const renda = Number(providerData.monthlyIncome).toFixed(2);

    // Criar subconta (subAccount) no Asaas com Escrow ativado
    const { createAsaasSubAccount } = await import('../asaas-service');
    const subAccountResult = await createAsaasSubAccount({
      name: providerData.name,
      email: providerData.email,
      cpfCnpj: providerData.cpfCnpj,
      phone: providerData.phone,
      birthDate: providerData.birthDate,
      monthlyIncome: renda, // garantir envio como string
      address: providerData.address,
      addressNumber: providerData.addressNumber,
      city: providerData.city,
      state: providerData.state,
      postalCode: providerData.postalCode,
      bankAccount: providerData.bankAccount
    });

    if (!subAccountResult.success) {
      return res.status(400).json({ 
        message: 'Erro ao criar conta do prestador', 
        error: subAccountResult.error,
        details: subAccountResult.details // <-- Mostra detalhes do erro do Asaas
      });
    }

    // Salvar dados do prestador no banco de dados
    const providerId = await storage.createProvider({
      userId: req.user.id,
      name: providerData.name,
      email: providerData.email,
      cpfCnpj: providerData.cpfCnpj,
      phone: providerData.phone,
      asaasWalletId: subAccountResult.subAccountId, // Salva o ID da subconta
      bankAccount: providerData.bankAccount ? JSON.stringify(providerData.bankAccount) : null
    });

    res.json({
      success: true,
      providerId,
      walletId: subAccountResult.subAccountId,
      message: 'Prestador cadastrado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao cadastrar prestador:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error.message 
    });
  }
});

/**
 * Consulta dados de um prestador
 * GET /api/asaas-marketplace/providers/:providerId
 */
asaasMarketplaceRouter.get('/providers/:providerId', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { providerId } = req.params;
    const provider = await storage.getProvider(Number(providerId));

    if (!provider) {
      return res.status(404).json({ message: 'Prestador não encontrado' });
    }

    // Verificar se o usuário tem permissão para ver este prestador
    if (provider.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    res.json({
      success: true,
      provider: {
        id: provider.id,
        name: provider.name,
        email: provider.email,
        cpfCnpj: provider.cpfCnpj,
        phone: provider.phone,
        asaasWalletId: provider.asaasWalletId,
        bankAccount: provider.bankAccount ? JSON.parse(provider.bankAccount) : null,
        createdAt: provider.createdAt
      }
    });

  } catch (error) {
    console.error('Erro ao consultar prestador:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error.message 
    });
  }
});

// ==================== CONSULTA DE SALDO ====================

/**
 * Consulta saldo de um prestador
 * GET /api/asaas-marketplace/providers/:providerId/balance
 */
asaasMarketplaceRouter.get('/providers/:providerId/balance', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    if (!isAsaasEnabled()) {
      return res.status(400).json({ message: 'Asaas não está configurado' });
    }

    const { providerId } = req.params;
    const provider = await storage.getProvider(Number(providerId));

    if (!provider) {
      return res.status(404).json({ message: 'Prestador não encontrado' });
    }

    if (!provider.asaasWalletId) {
      return res.status(400).json({ message: 'Prestador não possui carteira Asaas' });
    }

    // Consultar saldo da subconta no Asaas
    const { getAsaasSubAccountBalance } = await import('../asaas-service');
    const balanceResult = await getAsaasSubAccountBalance(provider.asaasWalletId);

    if (!balanceResult.success) {
      return res.status(400).json({ 
        message: 'Erro ao consultar saldo', 
        error: balanceResult.error 
      });
    }

    res.json({
      success: true,
      balance: balanceResult.balance,
      walletId: provider.asaasWalletId
    });

  } catch (error) {
    console.error('Erro ao consultar saldo:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error.message 
    });
  }
});

/**
 * Consulta saldo da plataforma (admin)
 * GET /api/asaas-marketplace/admin/balance
 */
asaasMarketplaceRouter.get('/admin/balance', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Acesso negado' });
    }

    if (!isAsaasEnabled()) {
      return res.status(400).json({ message: 'Asaas não está configurado' });
    }

    // A função getAsaasMainBalance não existe/exporta, então retornamos um erro ou 0
    res.status(501).json({ message: 'Função de consulta de saldo da plataforma não implementada' });

  } catch (error) {
    console.error('Erro ao consultar saldo da plataforma:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error.message 
    });
  }
});

// ==================== CRIAÇÃO DE PAGAMENTOS COM SPLIT ====================

/**
 * Schema para criação de pagamento com split
 */
// const createPaymentWithSplitSchema = z.object({
//   customerId: z.string(),
//   providerId: z.number(),
//   serviceValue: z.number().positive(),
//   billingType: z.enum(['PIX', 'BOLETO', 'CREDIT_CARD', 'DEBIT_CARD']),
//   description: z.string().optional(),
//   dueDate: z.string().optional()
// });

/**
 * Cria um pagamento com split automático
 * POST /api/asaas-marketplace/payments
 */
// asaasMarketplaceRouter.post('/payments', async (req, res) => {
//   try {
//     if (!req.user) {
//       return res.status(401).json({ message: 'Usuário não autenticado' });
//     }
//
//     if (!isAsaasEnabled()) {
//       return res.status(400).json({ message: 'Asaas não está configurado' });
//     }
//
//     const validation = createPaymentWithSplitSchema.safeParse(req.body);
//     if (!validation.success) {
//       return res.status(400).json({ 
//         message: 'Dados inválidos', 
//         errors: validation.error.format() 
//       });
//     }
//
//     const { customerId, providerId, serviceValue, billingType, description, dueDate } = validation.data;
//
//     // Buscar dados do prestador
//     const provider = await storage.getProvider(providerId);
//     if (!provider || !provider.asaasWalletId) {
//       return res.status(400).json({ message: 'Prestador não encontrado ou sem carteira' });
//     }
//
//     // Buscar dados da plataforma (wallet principal)
//     const platformSettings = await storage.getPaymentSettings();
//     if (!platformSettings?.asaasWalletId) {
//       return res.status(400).json({ message: 'Carteira da plataforma não configurada' });
//     }
//
//     // Buscar ID da subconta (conta secundária) das variáveis de ambiente
//     const subAccountWalletId = process.env.ASAAS_WALLET_ID_SUBCONTA;
//     if (!subAccountWalletId) {
//       return res.status(400).json({ message: 'Carteira secundária (subconta) não configurada' });
//     }
//
//     // Calcular split
//     const platformFee = 1.75; // Taxa fixa da plataforma
//     const totalValue = serviceValue + platformFee;
//
//     // Criar cobrança com split no Asaas
//     const paymentResult = await createAsaasPaymentWithSubAccountSplit({
//       customerId,
//       billingType,
//       value: totalValue,
//       description: description || `Agendamento - ${provider.name}`,
//       dueDate,
//       split: [
//         {
//           walletId: subAccountWalletId, // valor do serviço vai para a subconta
//           fixedValue: serviceValue,
//           status: 'RELEASED' // Libera na hora
//         },
//         {
//           walletId: platformSettings.asaasWalletId, // taxa vai para a conta principal
//           fixedValue: platformFee,
//           status: 'RELEASED' // Libera na hora
//         }
//       ]
//     });
//
//     if (!paymentResult.success) {
//       return res.status(400).json({ 
//         message: 'Erro ao criar cobrança', 
//         error: paymentResult.error 
//       });
//     }
//
//     // Salvar dados do pagamento no banco
//     const paymentId = await storage.createAsaasPayment({
//       customerId,
//       providerId,
//       paymentId: paymentResult.paymentId!,
//       totalValue,
//       serviceValue,
//       platformFee,
//       status: 'pending',
//       billingType
//     });
//
//     res.json({
//       success: true,
//       paymentId,
//       asaasPaymentId: paymentResult.paymentId,
//       totalValue,
//       serviceValue,
//       platformFee,
//       message: 'Pagamento criado com sucesso'
//     });
//
//   } catch (error) {
//     console.error('Erro ao criar pagamento:', error);
//     res.status(500).json({ 
//       message: 'Erro interno do servidor', 
//       error: error.message 
//     });
//   }
// });

// ==================== LIBERAÇÃO DE REPASSE ====================

/**
 * Libera repasse para o prestador (custódia)
 * POST /api/asaas-marketplace/payments/:paymentId/release
 */
asaasMarketplaceRouter.post('/payments/:paymentId/release', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Acesso negado' });
    }

    if (!isAsaasEnabled()) {
      return res.status(400).json({ message: 'Asaas não está configurado' });
    }

    const { paymentId } = req.params;

    // Buscar dados do pagamento
    const payment = await storage.getAsaasPayment(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    // Buscar dados do prestador
    const provider = await storage.getProvider(payment.providerId);
    if (!provider?.asaasWalletId) {
      return res.status(400).json({ message: 'Prestador não encontrado' });
    }

    // Liberar repasse no Asaas
    const releaseResult = await releaseAsaasSplit(payment.asaasPaymentId);

    if (!releaseResult.success) {
      return res.status(400).json({ 
        message: 'Erro ao liberar repasse', 
        error: releaseResult.error 
      });
    }

    // Atualizar status no banco
    await storage.updateAsaasPaymentStatus(paymentId, 'released');

    res.json({
      success: true,
      message: 'Repasse liberado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao liberar repasse:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error.message 
    });
  }
});

// ==================== CONSULTA DE STATUS ====================

/**
 * Consulta status de um pagamento
 * GET /api/asaas-marketplace/payments/:paymentId/status
 */
asaasMarketplaceRouter.get('/payments/:paymentId/status', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    if (!isAsaasEnabled()) {
      return res.status(400).json({ message: 'Asaas não está configurado' });
    }

    const { paymentId } = req.params;

    // Buscar dados do pagamento
    const payment = await storage.getAsaasPayment(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    // Verificar permissão
    if (payment.customerId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    // Consultar status no Asaas
    const statusResult = await getAsaasPaymentStatus(payment.asaasPaymentId);

    if (!statusResult.success) {
      return res.status(400).json({ 
        message: 'Erro ao consultar status', 
        error: statusResult.error 
      });
    }

    res.json({
      success: true,
      status: statusResult.status,
      payment: {
        id: payment.id,
        totalValue: payment.totalValue,
        serviceValue: payment.serviceValue,
        platformFee: payment.platformFee,
        billingType: payment.billingType,
        createdAt: payment.createdAt
      }
    });

  } catch (error) {
    console.error('Erro ao consultar status:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error.message 
    });
  }
});

// ==================== CANCELAMENTO ====================

/**
 * Cancela um pagamento
 * POST /api/asaas-marketplace/payments/:paymentId/cancel
 */
asaasMarketplaceRouter.post('/payments/:paymentId/cancel', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Acesso negado' });
    }

    if (!isAsaasEnabled()) {
      return res.status(400).json({ message: 'Asaas não está configurado' });
    }

    const { paymentId } = req.params;

    // Buscar dados do pagamento
    const payment = await storage.getAsaasPayment(paymentId);
    if (!payment) {
      return res.status(404).json({ message: 'Pagamento não encontrado' });
    }

    // Cancelar no Asaas
    const cancelResult = await cancelAsaasPayment(payment.asaasPaymentId);

    if (!cancelResult.success) {
      return res.status(400).json({ 
        message: 'Erro ao cancelar pagamento', 
        error: cancelResult.error 
      });
    }

    // Atualizar status no banco
    await storage.updateAsaasPaymentStatus(paymentId, 'cancelled');

    res.json({
      success: true,
      message: 'Pagamento cancelado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao cancelar pagamento:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error.message 
    });
  }
});

// ==================== LISTAGEM DE CARTEIRAS (ADMIN) ====================

/**
 * Lista todas as carteiras (admin)
 * GET /api/asaas-marketplace/admin/wallets
 */
asaasMarketplaceRouter.get('/admin/wallets', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(401).json({ message: 'Acesso negado' });
    }

    if (!isAsaasEnabled()) {
      return res.status(400).json({ message: 'Asaas não está configurado' });
    }

    const walletsResult = await listAsaasWallets();

    if (!walletsResult.success) {
      return res.status(400).json({ 
        message: 'Erro ao listar carteiras', 
        error: walletsResult.error 
      });
    }

    res.json({
      success: true,
      wallets: walletsResult.wallets
    });

  } catch (error) {
    console.error('Erro ao listar carteiras:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error.message 
    });
  }
}); 

// ==================== PAGAMENTOS DO PRESTADOR ====================

/**
 * Consulta pagamentos de um prestador
 * GET /api/asaas-marketplace/providers/:providerId/payments
 */
asaasMarketplaceRouter.get('/providers/:providerId/payments', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    if (!isAsaasEnabled()) {
      return res.status(400).json({ message: 'Asaas não está configurado' });
    }

    const { providerId } = req.params;
    const provider = await storage.getProvider(Number(providerId));

    if (!provider) {
      return res.status(404).json({ message: 'Prestador não encontrado' });
    }

    // Verificar se o usuário tem permissão para ver este prestador
    if (provider.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    if (!provider.asaasWalletId) {
      return res.status(400).json({ message: 'Prestador não possui conta Asaas' });
    }

    // Consultar pagamentos da subconta no Asaas
    const { getAsaasSubAccountPayments } = await import('../asaas-service');
    const paymentsResult = await getAsaasSubAccountPayments(provider.asaasWalletId);

    if (!paymentsResult.success) {
      return res.status(400).json({ 
        message: 'Erro ao consultar pagamentos', 
        error: paymentsResult.error 
      });
    }

    res.json({
      success: true,
      payments: paymentsResult.payments
    });

  } catch (error) {
    console.error('Erro ao consultar pagamentos do prestador:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error.message 
    });
  }
});

/**
 * Libera valor retido na custódia do prestador
 * POST /api/asaas-marketplace/providers/:providerId/release-escrow
 */
asaasMarketplaceRouter.post('/providers/:providerId/release-escrow', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    if (!isAsaasEnabled()) {
      return res.status(400).json({ message: 'Asaas não está configurado' });
    }

    const { providerId } = req.params;
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valor inválido para liberação' });
    }

    const provider = await storage.getProvider(Number(providerId));

    if (!provider) {
      return res.status(404).json({ message: 'Prestador não encontrado' });
    }

    // Verificar se o usuário tem permissão para liberar valores deste prestador
    if (provider.userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Acesso negado' });
    }

    if (!provider.asaasWalletId) {
      return res.status(400).json({ message: 'Prestador não possui conta Asaas' });
    }

    // Liberar valor da custódia no Asaas
    const { releaseAsaasEscrowValue } = await import('../asaas-service');
    const releaseResult = await releaseAsaasEscrowValue(provider.asaasWalletId, amount);

    if (!releaseResult.success) {
      return res.status(400).json({ 
        message: 'Erro ao liberar valor da custódia', 
        error: releaseResult.error 
      });
    }

    res.json({
      success: true,
      message: 'Valor liberado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao liberar valor da custódia:', error);
    res.status(500).json({ 
      message: 'Erro interno do servidor', 
      error: error.message 
    });
  }
}); 