import express from 'express';
import { db } from '../db';
import { paymentWithdrawals } from '../../shared/schema';
import { users } from '../../shared/schema';
import { eq, desc, count } from 'drizzle-orm';

const router = express.Router();

// Rota para administrador obter todas as solicitações de saque
router.get('/withdrawals', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    const offset = (page - 1) * limit;
    
    // Buscar withdrawals com informações do provider
    let query = db
      .select({
        id: paymentWithdrawals.id,
        providerId: paymentWithdrawals.providerId,
        amount: paymentWithdrawals.amount,
        status: paymentWithdrawals.status,
        paymentMethod: paymentWithdrawals.paymentMethod,
        paymentDetails: paymentWithdrawals.paymentDetails,
        requestedAt: paymentWithdrawals.requestedAt,
        processedAt: paymentWithdrawals.processedAt,
        transactionId: paymentWithdrawals.transactionId,
        notes: paymentWithdrawals.notes,
        providerName: users.name,
        providerEmail: users.email,
        providerPhone: users.phone
      })
      .from(paymentWithdrawals)
      .leftJoin(users, eq(paymentWithdrawals.providerId, users.id))
      .orderBy(desc(paymentWithdrawals.requestedAt));
    
    if (status) {
      query = query.where(eq(paymentWithdrawals.status, status));
    }
    
    const withdrawals = await query.limit(limit).offset(offset);
    
    // Contar total
    const countQuery = db
      .select({ count: count() })
      .from(paymentWithdrawals);
    
    if (status) {
      countQuery.where(eq(paymentWithdrawals.status, status));
    }
    
    const [{ count: total }] = await countQuery;
    
    // Formatar dados
    const formattedWithdrawals = withdrawals.map(withdrawal => {
      const paymentDetails = withdrawal.paymentDetails || {};
      return {
        id: withdrawal.id,
        providerId: withdrawal.providerId,
        amount: parseFloat(withdrawal.amount),
        status: withdrawal.status,
        paymentMethod: withdrawal.paymentMethod,
        providerInfo: {
          id: withdrawal.providerId,
          name: withdrawal.providerName,
          email: withdrawal.providerEmail,
          phone: withdrawal.providerPhone
        },
        pixInfo: {
          pixKey: paymentDetails.pixKey || '',
          pixKeyType: paymentDetails.pixKeyType || ''
        },
        requestedAt: withdrawal.requestedAt,
        processedAt: withdrawal.processedAt,
        transactionId: withdrawal.transactionId,
        notes: withdrawal.notes,
        paymentDetails: withdrawal.paymentDetails
      };
    });
    
    res.json({
      withdrawals: formattedWithdrawals,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    });
  } catch (error) {
    console.error('Erro ao obter todas as solicitações de saque:', error);
    res.status(500).json({ message: 'Erro ao obter todas as solicitações de saque' });
  }
});

// Rota para administrador atualizar status de um saque
router.put('/withdrawals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionId, notes } = req.body;
    
    // Import the marketplace service function dynamically to avoid circular dependencies
    const { updateWithdrawalStatus } = await import('../services/marketplace-payment-service');
    
    if (!status) {
      return res.status(400).json({ message: 'Status não informado' });
    }
    
    const success = await updateWithdrawalStatus(
      parseInt(id),
      status,
      transactionId,
      notes
    );
    
    if (!success) {
      return res.status(400).json({ message: 'Falha ao atualizar status do saque' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Erro ao atualizar status do saque:', error);
    res.status(500).json({ message: 'Erro ao atualizar status do saque' });
  }
});

export default router;