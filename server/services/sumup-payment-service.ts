/**
 * Serviço de Pagamento SumUp
 * 
 * Este serviço implementa a integração com a API SumUp para processamento
 * de pagamentos com cartão de crédito/débito online.
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '../storage';

// Constantes
const SUMUP_API_BASE_URL = 'https://api.sumup.com/v0.1';
const API_KEY = process.env.SUMUP_API_KEY;

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
 * Verifica se os pagamentos online estão habilitados para um prestador
 */
export async function isPaymentEnabledForProvider(providerId: number): Promise<boolean> {
  try {
    const settings = await storage.getProviderSettings(providerId);
    return settings?.acceptOnlinePayments || false;
  } catch (error) {
    console.error('[SumUpPayment] Erro ao verificar configurações de pagamento:', error);
    return false;
  }
}

/**
 * Habilita ou desabilita pagamentos online para um prestador
 */
export async function toggleOnlinePayments(providerId: number, enabled: boolean): Promise<boolean> {
  try {
    const settings = await storage.getProviderSettings(providerId);
    if (!settings) {
      throw new Error('Configurações do prestador não encontradas');
    }
    
    const updatedSettings = {
      ...settings,
      acceptOnlinePayments: enabled,
    };
    
    await storage.updateProviderSettings(providerId, updatedSettings);
    return true;
  } catch (error) {
    console.error('[SumUpPayment] Erro ao atualizar configurações de pagamento:', error);
    return false;
  }
}

/**
 * Obtém o merchant code (código do comerciante) de um prestador
 */
async function getProviderMerchantCode(providerId: number): Promise<string> {
  try {
    const settings = await storage.getProviderSettings(providerId);
    // Se não tiver código de comerciante cadastrado, lança erro
    if (!settings?.merchantCode) {
      throw new Error('Código de comerciante não configurado para este prestador');
    }
    return settings.merchantCode;
  } catch (error) {
    console.error('[SumUpPayment] Erro ao obter merchant code:', error);
    throw new Error('Falha ao obter código de comerciante');
  }
}

/**
 * Configura o código de comerciante para um prestador
 */
export async function setProviderMerchantCode(providerId: number, merchantCode: string): Promise<boolean> {
  try {
    const settings = await storage.getProviderSettings(providerId);
    if (!settings) {
      throw new Error('Configurações do prestador não encontradas');
    }
    
    const updatedSettings = {
      ...settings,
      merchantCode,
    };
    
    await storage.updateProviderSettings(providerId, updatedSettings);
    return true;
  } catch (error) {
    console.error('[SumUpPayment] Erro ao configurar merchant code:', error);
    return false;
  }
}

/**
 * Cria um checkout na SumUp
 * 
 * Um checkout é uma solicitação de pagamento que depois será completada
 * com os dados do cartão do cliente.
 */
export async function createCheckout(params: CreateCheckoutParams): Promise<CheckoutResponse> {
  try {
    // Verificar se o prestador aceita pagamentos online
    const isEnabled = await isPaymentEnabledForProvider(params.providerId);
    if (!isEnabled) {
      throw new Error('Este prestador não aceita pagamentos online');
    }

    // Obtém o código do comerciante do prestador
    const merchantCode = await getProviderMerchantCode(params.providerId);
    
    // Gerar uma referência única se não fornecida
    const checkoutReference = params.checkoutReference || `CO-${uuidv4().substring(0, 8)}`;

    const payload = {
      checkout_reference: checkoutReference,
      amount: params.amount,
      currency: params.currency,
      merchant_code: merchantCode,
      description: params.description
    };

    console.log('[SumUpPayment] Criando checkout:', JSON.stringify(payload));

    const response = await axios.post(`${SUMUP_API_BASE_URL}/checkouts`, payload, {
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('[SumUpPayment] Checkout criado com sucesso:', response.data);
    return response.data;
  } catch (error) {
    console.error('[SumUpPayment] Erro ao criar checkout:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('[SumUpPayment] Resposta de erro:', error.response.data);
      throw new Error(`Erro na API SumUp: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw new Error('Falha ao criar checkout no SumUp');
  }
}

/**
 * Completa um checkout com os dados do cartão
 * 
 * Esta função processa o pagamento utilizando os dados do cartão fornecidos pelo cliente
 */
export async function completeCheckout(checkoutId: string, cardDetails: CardDetails): Promise<CheckoutResponse> {
  try {
    console.log(`[SumUpPayment] Processando pagamento para checkout ${checkoutId}`);
    
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

    console.log('[SumUpPayment] Pagamento processado com sucesso:', response.data.status);
    return response.data;
  } catch (error) {
    console.error('[SumUpPayment] Erro ao processar pagamento:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error('[SumUpPayment] Resposta de erro:', error.response.data);
      throw new Error(`Erro ao processar pagamento: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
    }
    throw new Error('Falha ao processar pagamento');
  }
}

/**
 * Verifica o status de um checkout
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
    console.error('[SumUpPayment] Erro ao verificar status do checkout:', error);
    throw new Error('Falha ao verificar status do pagamento');
  }
}