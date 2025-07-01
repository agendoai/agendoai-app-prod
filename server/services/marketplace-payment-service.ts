/**
 * Serviço de Pagamento no Modelo Marketplace
 * 
 * Este serviço implementa a integração com gateways de pagamento no modelo marketplace,
 * onde a plataforma recebe todos os pagamentos e depois transfere aos prestadores
 * após descontar sua comissão.
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';
import {
  ProviderBalance,
  InsertProviderBalance,
  ProviderTransaction,
  InsertProviderTransaction,
  PaymentWithdrawal,
  InsertPaymentWithdrawal
} from '@shared/schema';

// Constantes
const SUMUP_API_BASE_URL = 'https://api.sumup.com/v0.1';
const API_KEY = process.env.SUMUP_API_KEY;
let PLATFORM_MERCHANT_CODE = process.env.PLATFORM_MERCHANT_CODE || '';
const DEFAULT_PLATFORM_FEE_PERCENT = 10; // 10% de comissão padrão

// Taxa da plataforma em porcentagem (configurável)
let platformFeePercent = DEFAULT_PLATFORM_FEE_PERCENT;

// Taxas específicas por categoria
const categoryFeesMap = new Map<number, number>();

// Tipos
export interface CreateCheckoutParams {
  amount: number;
  currency: string;
  description: string;
  providerId: number;
  checkoutReference?: string;
  customerEmail?: string;
  customerPhone?: string;
  additionalInfo?: Record<string, string>;
}

export interface CardDetails {
  name: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
}

export interface CheckoutResponse {
  id: string;
  status: 'PENDING' | 'PAID' | 'FAILED';
  checkoutReference: string;
  amount: number;
  currency: string;
  transactionCode?: string;
  transactionId?: string;
  date: string;
  transactions: any[];
}

/**
 * Inicializa o serviço de marketplace
 * @param merchantCode Código do comerciante da plataforma na SumUp
 * @param feePercent Porcentagem da taxa da plataforma (padrão: 10%)
 */
export function initializeMarketplaceService(merchantCode?: string, feePercent?: number) {
  if (merchantCode) {
    PLATFORM_MERCHANT_CODE = merchantCode;
  }
  
  if (feePercent !== undefined && feePercent >= 0 && feePercent <= 100) {
    platformFeePercent = feePercent;
  }
  
  console.log(`[MarketplacePayment] Serviço inicializado - Comissão: ${platformFeePercent}%, Merchant Code: ${PLATFORM_MERCHANT_CODE}`);
  
  // Validações
  if (!API_KEY) {
    console.error('[MarketplacePayment] Erro: SUMUP_API_KEY não configurada.');
  }
  
  if (!PLATFORM_MERCHANT_CODE) {
    console.error('[MarketplacePayment] Erro: PLATFORM_MERCHANT_CODE não configurado.');
  }
  
  // Carregar taxas de categorias do banco de dados
  loadCategoryFees().catch(err => {
    console.error('[MarketplacePayment] Erro ao carregar taxas por categoria:', err);
  });
}

/**
 * Carrega as taxas por categoria do banco de dados
 */
async function loadCategoryFees() {
  try {
    const db = await import('../db').then(module => module.db);
    const { systemSettings } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const [categoriesConfig] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'category_fees'));
    
    if (categoriesConfig && categoriesConfig.value) {
      const fees = JSON.parse(categoriesConfig.value.toString());
      
      if (typeof fees === 'object') {
        Object.entries(fees).forEach(([categoryId, fee]) => {
          setCategoryFee(Number(categoryId), Number(fee));
        });
        
        console.log(`[MarketplacePayment] Carregadas ${categoryFeesMap.size} taxas de categorias`);
      }
    }
  } catch (error) {
    console.error('[MarketplacePayment] Erro ao carregar taxas de categorias:', error);
  }
}

/**
 * Define a taxa para uma categoria específica
 * @param categoryId ID da categoria
 * @param feePercent Porcentagem da taxa (ex: 15 para 15%)
 */
export function setCategoryFee(categoryId: number, feePercent: number) {
  if (feePercent >= 0 && feePercent <= 100) {
    categoryFeesMap.set(categoryId, feePercent);
    return true;
  }
  return false;
}

/**
 * Obtém a taxa para uma categoria específica
 * @param categoryId ID da categoria
 * @returns Porcentagem da taxa ou a taxa padrão se não houver específica
 */
export function getCategoryFee(categoryId: number): number {
  return categoryFeesMap.has(categoryId) 
    ? categoryFeesMap.get(categoryId)! 
    : platformFeePercent;
}

/**
 * Salva as configurações de taxas por categoria no banco de dados
 */
export async function saveCategoryFees(): Promise<boolean> {
  try {
    const db = await import('../db').then(module => module.db);
    const { systemSettings } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    
    const feesObject: Record<number, number> = {};
    categoryFeesMap.forEach((fee, categoryId) => {
      feesObject[categoryId] = fee;
    });
    
    // Verificar se já existe uma configuração
    const [existingConfig] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.key, 'category_fees'));
    
    if (existingConfig) {
      // Atualizar configuração existente
      await db
        .update(systemSettings)
        .set({ value: JSON.stringify(feesObject) })
        .where(eq(systemSettings.key, 'category_fees'));
    } else {
      // Criar nova configuração
      await db
        .insert(systemSettings)
        .values({
          key: 'category_fees',
          value: JSON.stringify(feesObject),
          description: 'Taxas de comissão por categoria'
        });
    }
    
    return true;
  } catch (error) {
    console.error('[MarketplacePayment] Erro ao salvar taxas de categorias:', error);
    return false;
  }
}

/**
 * Obtém o saldo de um prestador
 */
export async function getProviderBalance(providerId: number): Promise<ProviderBalance | null> {
  try {
    // Buscar saldo do prestador
    let balance = await storage.getProviderBalance(providerId);
    
    // Se não existir, criar um novo registro de saldo
    if (!balance) {
      balance = await storage.createProviderBalance({
        providerId,
        balance: 0,
        availableBalance: 0,
        pendingBalance: 0
      });
    }
    
    return balance;
  } catch (error) {
    console.error('[MarketplacePayment] Erro ao obter saldo do prestador:', error);
    return null;
  }
}

/**
 * Cria um checkout para um pagamento
 * 
 * Um checkout é uma solicitação de pagamento que depois será completada
 * com os dados do cartão do cliente.
 */
export async function createCheckout(params: CreateCheckoutParams): Promise<CheckoutResponse> {
  try {
    // Validar se o código do comerciante da plataforma está configurado
    if (!PLATFORM_MERCHANT_CODE) {
      throw new Error('Código do comerciante da plataforma não configurado');
    }
    
    // Gerar uma referência única se não fornecida
    const checkoutReference = params.checkoutReference || `PMT-${uuidv4().substring(0, 8)}`;

    const payload = {
      checkout_reference: checkoutReference,
      amount: params.amount,
      currency: params.currency,
      merchant_code: PLATFORM_MERCHANT_CODE,
      description: params.description
    };

    console.log('[MarketplacePayment] Criando checkout:', JSON.stringify(payload));

    const response = await axios.post(`${SUMUP_API_BASE_URL}/checkouts`, payload, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('[MarketplacePayment] Checkout criado com sucesso:', response.data);
    
    // Armazenar metadados do checkout para uso posterior
    await storage.createProviderTransaction({
      providerId: params.providerId,
      amount: params.amount,
      type: 'payment',
      status: 'pending',
      description: params.description,
      metadata: {
        checkoutId: response.data.id,
        checkoutReference,
        customerEmail: params.customerEmail,
        customerPhone: params.customerPhone,
        additionalInfo: params.additionalInfo
      }
    });
    
    return response.data;
  } catch (error) {
    console.error('[MarketplacePayment] Erro ao criar checkout:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('[MarketplacePayment] Resposta de erro:', error.response.data);
      throw new Error(`Erro na API SumUp: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw new Error('Falha ao criar checkout');
  }
}

/**
 * Completa um checkout com os dados do cartão
 * 
 * Esta função processa o pagamento utilizando os dados do cartão fornecidos pelo cliente
 */
export async function completeCheckout(checkoutId: string, cardDetails: CardDetails): Promise<CheckoutResponse> {
  try {
    // Verificar se o checkout existe
    const transaction = await storage.getTransactionByCheckoutId(checkoutId);
    
    if (!transaction) {
      throw new Error('Checkout não encontrado');
    }
    
    // Processar o pagamento
    const payload = {
      payment_type: 'card',
      card: {
        name: cardDetails.name,
        number: cardDetails.number,
        expiry_month: cardDetails.expiryMonth,
        expiry_year: cardDetails.expiryYear,
        cvv: cardDetails.cvv
      }
    };

    const response = await axios.put(`${SUMUP_API_BASE_URL}/checkouts/${checkoutId}`, payload, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('[MarketplacePayment] Pagamento processado com sucesso:', response.data);

    // Se o pagamento foi bem-sucedido, atualizar o status da transação e o saldo do prestador
    if (response.data.status === 'PAID') {
      await processSuccessfulPayment(transaction.id, transaction.providerId, transaction.amount);
    } else {
      // Atualizar status da transação como falha
      await storage.updateProviderTransaction(transaction.id, {
        status: 'failed'
      });
    }

    return response.data;
  } catch (error) {
    console.error('[MarketplacePayment] Erro ao processar pagamento:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('[MarketplacePayment] Resposta de erro:', error.response.data);
      throw new Error(`Erro ao processar pagamento: ${JSON.stringify(error.response.data)}`);
    }
    throw new Error('Falha ao processar pagamento');
  }
}

/**
 * Processa um pagamento bem-sucedido
 * 
 * 1. Atualiza o status da transação
 * 2. Calcula a comissão da plataforma baseada na categoria do serviço (se disponível)
 * 3. Atualiza o saldo do prestador
 */
async function processSuccessfulPayment(transactionId: number, providerId: number, amount: number): Promise<boolean> {
  try {
    // Obter a transação completa para acessar metadados como a categoria do serviço
    const transaction = await storage.getProviderTransaction(transactionId);
    
    // Determinar a taxa aplicável com base na categoria do serviço
    let applicableFeePercent = platformFeePercent;
    let categoryId = null;
    
    if (transaction?.metadata && typeof transaction.metadata === 'object') {
      categoryId = transaction.metadata.categoryId as number;
      
      if (categoryId && categoryFeesMap.has(categoryId)) {
        applicableFeePercent = getCategoryFee(categoryId);
      }
    }
    
    // Calcular a taxa da plataforma
    const platformFee = (amount * applicableFeePercent) / 100;
    const providerAmount = amount - platformFee;
    
    // Atualizar a transação
    await storage.updateProviderTransaction(transactionId, {
      status: 'completed',
      metadata: {
        platformFee,
        providerAmount,
        feePercent: applicableFeePercent,
        categoryId,
        processedAt: new Date().toISOString()
      }
    });
    
    // Registrar a comissão da plataforma
    await storage.createProviderTransaction({
      providerId,
      amount: -platformFee,
      type: 'commission',
      status: 'completed',
      description: `Comissão de ${platformFeePercent}% da plataforma`,
      metadata: {
        originalTransactionId: transactionId,
        feePercent: platformFeePercent
      }
    });
    
    // Atualizar o saldo do prestador
    const balance = await getProviderBalance(providerId);
    
    if (balance) {
      const newBalance = Number(balance.balance) + providerAmount;
      const newAvailableBalance = Number(balance.availableBalance) + providerAmount;
      
      await storage.updateProviderBalance(providerId, {
        balance: newBalance,
        availableBalance: newAvailableBalance
      });
    }
    
    return true;
  } catch (error) {
    console.error('[MarketplacePayment] Erro ao processar pagamento bem-sucedido:', error);
    return false;
  }
}

/**
 * Verificar o status de um checkout
 */
export async function getCheckoutStatus(checkoutId: string): Promise<CheckoutResponse> {
  try {
    const response = await axios.get(`${SUMUP_API_BASE_URL}/checkouts/${checkoutId}`, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    return response.data;
  } catch (error) {
    console.error('[MarketplacePayment] Erro ao verificar status do checkout:', error);
    throw new Error('Falha ao verificar status do checkout');
  }
}

/**
 * Solicita um saque para o prestador
 */
export async function requestWithdrawal(
  providerId: number, 
  amount: number, 
  paymentMethod: string,
  paymentDetails: any
): Promise<PaymentWithdrawal | null> {
  try {
    // Validar se o prestador tem saldo disponível
    const balance = await getProviderBalance(providerId);
    
    if (!balance || Number(balance.availableBalance) < amount) {
      throw new Error('Saldo insuficiente para saque');
    }
    
    // Criar a solicitação de saque
    const withdrawal = await storage.createPaymentWithdrawal({
      providerId,
      amount,
      status: 'pending',
      paymentMethod,
      paymentDetails,
      notes: 'Solicitação de saque criada pelo prestador'
    });
    
    // Atualizar o saldo disponível do prestador
    await storage.updateProviderBalance(providerId, {
      availableBalance: Number(balance.availableBalance) - amount
    });
    
    // Registrar a transação
    await storage.createProviderTransaction({
      providerId,
      amount: -amount,
      type: 'withdrawal',
      status: 'pending',
      description: `Solicitação de saque via ${paymentMethod}`,
      metadata: {
        withdrawalId: withdrawal.id,
        paymentMethod,
        details: paymentDetails
      }
    });
    
    return withdrawal;
  } catch (error) {
    console.error('[MarketplacePayment] Erro ao solicitar saque:', error);
    return null;
  }
}

/**
 * Atualiza o status de um saque
 */
export async function updateWithdrawalStatus(
  withdrawalId: number,
  status: 'pending' | 'processing' | 'completed' | 'failed',
  transactionId?: string,
  notes?: string
): Promise<boolean> {
  try {
    const withdrawal = await storage.getPaymentWithdrawal(withdrawalId);
    
    if (!withdrawal) {
      throw new Error('Solicitação de saque não encontrada');
    }
    
    // Atualizar o status
    await storage.updatePaymentWithdrawal(withdrawalId, {
      status,
      transactionId,
      notes,
      processedAt: (status === 'completed' || status === 'failed') ? new Date() : undefined
    });
    
    // Se o saque falhou, devolver o valor ao saldo disponível do prestador
    if (status === 'failed') {
      const balance = await getProviderBalance(withdrawal.providerId);
      
      if (balance) {
        await storage.updateProviderBalance(withdrawal.providerId, {
          availableBalance: Number(balance.availableBalance) + Number(withdrawal.amount)
        });
        
        // Atualizar a transação relacionada
        const transaction = await storage.getTransactionByWithdrawalId(withdrawalId);
        
        if (transaction) {
          await storage.updateProviderTransaction(transaction.id, {
            status: 'failed',
            metadata: {
              ...transaction.metadata,
              failureNotes: notes,
              failedAt: new Date().toISOString()
            }
          });
        }
      }
    }
    
    return true;
  } catch (error) {
    console.error('[MarketplacePayment] Erro ao atualizar status do saque:', error);
    return false;
  }
}

/**
 * Obtém o histórico de transações de um prestador
 */
export async function getProviderTransactions(
  providerId: number,
  page: number = 1,
  limit: number = 20,
  type?: string
): Promise<{
  transactions: ProviderTransaction[],
  total: number,
  page: number,
  totalPages: number
}> {
  try {
    const offset = (page - 1) * limit;
    
    const result = await storage.getProviderTransactions(providerId, {
      offset,
      limit,
      type
    });
    
    return {
      transactions: result.transactions,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit)
    };
  } catch (error) {
    console.error('[MarketplacePayment] Erro ao obter transações do prestador:', error);
    return {
      transactions: [],
      total: 0,
      page: 1,
      totalPages: 0
    };
  }
}