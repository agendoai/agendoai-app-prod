import { Router } from 'express';
import { db } from '../db.js';
import { paymentWithdrawals } from '../../shared/schema.js';
import { isAuthenticated } from '../middleware/auth.js';
import { eq, desc, and, sql } from 'drizzle-orm';
import { z } from 'zod';

const router = Router();

console.log('🔧 WITHDRAWAL ROUTES - Carregando rotas de saque...');

// Log todas as rotas registradas
router.stack?.forEach((layer) => {
  console.log(`📍 ROUTE: ${layer.route?.methods ? Object.keys(layer.route.methods).join(',').toUpperCase() : 'MIDDLEWARE'} ${layer.route?.path || 'N/A'}`);
});

// Adicionar log específico para a rota DELETE
console.log('🗑️ REGISTRANDO ROTA DELETE: /withdrawal-request/:id');

// Schema for withdrawal request validation
const withdrawalRequestSchema = z.object({
  amount: z.number().positive('O valor deve ser maior que zero'),
  pixKey: z.string().min(1, 'Chave PIX é obrigatória'),
  pixKeyType: z.enum(['cpf', 'cnpj', 'email', 'phone', 'random'], {
    errorMap: () => ({ message: 'Tipo de chave PIX inválido' })
  }),
});

// POST /api/provider/withdrawal-request
router.post('/withdrawal-request', isAuthenticated, async (req, res) => {
  try {
    const user = req.user || req.session?.user;
    
    // Verify user is a provider
    if (user.userType !== 'provider') {
      return res.status(403).json({ 
        success: false, 
        message: 'Apenas prestadores podem solicitar saques' 
      });
    }

    // Validate request body
    const validationResult = withdrawalRequestSchema.safeParse(req.body);
    if (!validationResult.success) {
      return res.status(400).json({ 
        success: false, 
        message: 'Dados inválidos',
        errors: validationResult.error.issues 
      });
    }

    const { amount, pixKey, pixKeyType } = validationResult.data;

    // Check if provider already made a withdrawal request today
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    const existingTodayWithdrawal = await db
      .select()
      .from(paymentWithdrawals)
      .where(
        and(
          eq(paymentWithdrawals.providerId, user.id),
          sql`${paymentWithdrawals.requestedAt} >= ${startOfDay.toISOString()}`,
          sql`${paymentWithdrawals.requestedAt} < ${endOfDay.toISOString()}`
        )
      )
      .limit(1);

    if (existingTodayWithdrawal.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Você já fez uma solicitação de saque hoje. Apenas uma solicitação por dia é permitida.',
        error: 'DAILY_LIMIT_EXCEEDED'
      });
    }

    // Check provider balance before creating withdrawal
    const { storage } = await import('../storage.js');
    let providerBalance = await storage.getProviderBalance(user.id);
    
    // Create balance if doesn't exist
    if (!providerBalance) {
      providerBalance = await storage.createProviderBalance({
        providerId: user.id,
        balance: '0',
        availableBalance: '0',
        pendingBalance: '0'
      });
    }
    
    const currentAvailableBalance = Number(providerBalance.availableBalance) || 0;
    
    // Check if user has sufficient balance
    if (amount > currentAvailableBalance) {
      return res.status(400).json({
        success: false,
        message: `Saldo insuficiente. Disponível: R$ ${currentAvailableBalance.toFixed(2)}`,
        error: 'INSUFFICIENT_BALANCE'
      });
    }

    // Create withdrawal request
    const [withdrawalRequest] = await db.insert(paymentWithdrawals).values({
      providerId: user.id,
      amount: amount.toString(),
      status: 'pending',
      paymentMethod: 'pix',
      paymentDetails: {
        pixKey,
        pixKeyType,
        providerName: user.name,
        providerEmail: user.email,
        providerPhone: user.phone,
      },
      requestedAt: new Date(),
      notes: `Solicitação de saque de R$ ${amount.toFixed(2)} via PIX (${pixKeyType})`
    }).returning();
    
    // Debit from available balance
    const newAvailableBalance = currentAvailableBalance - amount;
    const newPendingBalance = Number(providerBalance.pendingBalance) + amount;
    
    await storage.updateProviderBalance(user.id, {
      availableBalance: newAvailableBalance.toString(),
      pendingBalance: newPendingBalance.toString()
    });
    
    console.log(`💰 SAQUE SOLICITADO - Provider ${user.id}: R$ ${amount} debitado do saldo disponível`);

    res.status(201).json({
      success: true,
      message: 'Solicitação de saque criada com sucesso',
      data: {
        id: withdrawalRequest.id,
        amount: parseFloat(withdrawalRequest.amount),
        status: withdrawalRequest.status,
        paymentMethod: withdrawalRequest.paymentMethod,
        providerInfo: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone
        },
        pixInfo: {
          pixKey,
          pixKeyType
        },
        requestedAt: withdrawalRequest.requestedAt,
        notes: withdrawalRequest.notes
      }
    });

  } catch (error) {
    console.error('Erro ao criar solicitação de saque:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// GET /api/provider/withdrawal-requests
router.get('/withdrawal-requests', isAuthenticated, async (req, res) => {
  try {
    const user = req.user || req.session?.user;
    
    // Verify user is a provider
    if (user.userType !== 'provider') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }

    // Get provider's withdrawal requests
    const withdrawalRequests = await db
      .select()
      .from(paymentWithdrawals)
      .where(eq(paymentWithdrawals.providerId, user.id))
      .orderBy(desc(paymentWithdrawals.requestedAt));

    const formattedRequests = withdrawalRequests.map(request => {
      const paymentDetails = request.paymentDetails || {};
      return {
        id: request.id,
        amount: parseFloat(request.amount),
        status: request.status,
        paymentMethod: request.paymentMethod,
        providerInfo: {
          id: request.providerId,
          name: paymentDetails.providerName || user.name,
          email: paymentDetails.providerEmail || user.email,
          phone: paymentDetails.providerPhone || user.phone
        },
        pixInfo: {
          pixKey: paymentDetails.pixKey,
          pixKeyType: paymentDetails.pixKeyType
        },
        requestedAt: request.requestedAt,
        processedAt: request.processedAt,
        transactionId: request.transactionId,
        notes: request.notes,
        // Include original paymentDetails for backward compatibility
        paymentDetails: request.paymentDetails
      };
    });

    res.json({
      success: true,
      data: formattedRequests
    });

  } catch (error) {
    console.error('Erro ao buscar solicitações de saque:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// DELETE /api/provider/withdrawal-request/:id
router.delete('/withdrawal-request/:id', isAuthenticated, async (req, res) => {
  console.log('🗑️ DELETE WITHDRAWAL - Rota DELETE chamada para ID:', req.params.id);
  try {
    const user = req.user || req.session?.user;
    const withdrawalId = parseInt(req.params.id);
    
    // Verify user is a provider
    if (user.userType !== 'provider') {
      return res.status(403).json({ 
        success: false, 
        message: 'Acesso negado' 
      });
    }

    if (isNaN(withdrawalId)) {
      return res.status(400).json({
        success: false,
        message: 'ID de solicitação inválido'
      });
    }

    // Find the withdrawal request
    const [existingWithdrawal] = await db
      .select()
      .from(paymentWithdrawals)
      .where(
        and(
          eq(paymentWithdrawals.id, withdrawalId),
          eq(paymentWithdrawals.providerId, user.id)
        )
      )
      .limit(1);

    if (!existingWithdrawal) {
      return res.status(404).json({
        success: false,
        message: 'Solicitação de saque não encontrada'
      });
    }

    // Only allow deletion of pending withdrawals
    if (existingWithdrawal.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Apenas solicitações pendentes podem ser canceladas'
      });
    }

    // Credit back to available balance when canceling withdrawal
    const { storage } = await import('../storage.js');
    const providerBalance = await storage.getProviderBalance(user.id);
    
    if (providerBalance) {
      const withdrawalAmount = Number(existingWithdrawal.amount);
      const newAvailableBalance = Number(providerBalance.availableBalance) + withdrawalAmount;
      const newPendingBalance = Number(providerBalance.pendingBalance) - withdrawalAmount;
      
      await storage.updateProviderBalance(user.id, {
        availableBalance: newAvailableBalance.toString(),
        pendingBalance: Math.max(0, newPendingBalance).toString()
      });
      
      console.log(`💰 SAQUE CANCELADO - Provider ${user.id}: R$ ${withdrawalAmount} creditado de volta ao saldo disponível`);
    }

    // Delete the withdrawal request
    await db
      .delete(paymentWithdrawals)
      .where(eq(paymentWithdrawals.id, withdrawalId));

    res.json({
      success: true,
      message: 'Solicitação de saque cancelada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao cancelar solicitação de saque:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// Log final das rotas registradas
console.log('🔧 WITHDRAWAL ROUTES - Rotas finais registradas:');
router.stack?.forEach((layer) => {
  if (layer.route) {
    const methods = Object.keys(layer.route.methods).join(',').toUpperCase();
    console.log(`📍 ${methods} /api/provider${layer.route.path}`);
  }
});

export default router;