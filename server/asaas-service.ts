import axios from 'axios';
import { db } from './db';
import { appointments, paymentSettings, userPaymentMethods } from '@shared/schema';
import { eq } from 'drizzle-orm';

// Configurações do cliente Asaas
let asaasConfig: {
  apiKey: string;
  liveMode: boolean;
  webhookToken?: string;
  walletId?: string;
} | null = null;

/**
 * Inicializa o cliente Asaas com as configurações salvas no banco de dados
 */
export async function initializeAsaas(): Promise<void> {
  try {
    // Buscar configurações do banco de dados
    const [settings] = await db.select().from(paymentSettings).limit(1);

    if (!settings?.asaasEnabled || !settings?.asaasApiKey) {
      console.log('Asaas não configurado ou desativado');
      asaasConfig = null;
      return;
    }

    // Configurar cliente Asaas
    asaasConfig = {
      apiKey: settings.asaasApiKey,
      liveMode: settings.asaasLiveMode || false,
      webhookToken: settings.asaasWebhookToken || undefined,
      walletId: settings.asaasWalletId || undefined,
    };

    console.log(`Asaas inicializado em modo ${settings.asaasLiveMode ? 'produção' : 'teste'}`);
  } catch (error) {
    console.error('Erro ao inicializar Asaas:', error);
    asaasConfig = null;
  }
}

/**
 * Verifica se o Asaas está configurado e ativo
 */
export function isAsaasEnabled(): boolean {
  return !!asaasConfig;
}

/**
 * Obtém o baseURL da API do Asaas de acordo com o modo (sandbox ou produção)
 */
export function getAsaasBaseUrl(liveMode: boolean): string {
  return liveMode
    ? 'https://api.asaas.com/v3'
    : 'https://sandbox.asaas.com/api/v3';
}

/**
 * Testa a conexão com o Asaas usando as credenciais fornecidas
 */
export async function testAsaasConnection(apiKey: string, liveMode: boolean): Promise<{ success: boolean; message: string }> {
  try {
    const baseURL = getAsaasBaseUrl(liveMode);
    
    // Testar fazendo uma chamada para obter informações da conta
    const response = await axios.get(`${baseURL}/finance/balance`, {
      headers: {
        'access_token': apiKey,
        'Content-Type': 'application/json'
      }
    });

    return {
      success: true,
      message: `Conexão bem-sucedida com o Asaas ${liveMode ? '(produção)' : '(sandbox)'}`,
    };
  } catch (error: any) {
    console.error('Erro ao testar conexão Asaas:', error);
    
    // Verificar o tipo de erro para retornar mensagem adequada
    if (error.response) {
      // Erro de resposta da API
      const status = error.response.status;
      if (status === 401) {
        return {
          success: false,
          message: 'Falha na autenticação. Verifique sua chave de API.',
        };
      } else {
        return {
          success: false,
          message: `Erro na API do Asaas (${status}): ${error.response.data?.message || 'Falha na conexão'}`,
        };
      }
    } else if (error.request) {
      // Sem resposta da API
      return {
        success: false,
        message: 'Sem resposta do servidor Asaas. Verifique sua conexão com a internet.',
      };
    } else {
      // Erro ao configurar a requisição
      return {
        success: false,
        message: `Erro ao conectar: ${error.message}`,
      };
    }
  }
}

/**
 * Atualiza a configuração do Asaas
 */
export async function updateAsaasConfig(config: {
  apiKey: string;
  liveMode: boolean;
  webhookToken?: string;
  walletId?: string;
}): Promise<void> {
  asaasConfig = config;
  console.log(`Asaas reconfigurado em modo ${config.liveMode ? 'produção' : 'sandbox'}`);
}

/**
 * Cria um pagamento com split para subcontas no Asaas
 * @param paymentData Dados do pagamento (customerId, billingType, value, description, dueDate, split[])
 */
// export async function createAsaasPaymentWithSubAccountSplit(paymentData: {
//   customerId: string;
//   billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD';
//   value: number;
//   description?: string;
//   dueDate?: string;
//   split: Array<{
//     walletId: string;
//     fixedValue: number;
//     status: 'PENDING' | 'RELEASED';
//   }>;
// }): Promise<{ success: boolean; paymentId?: string; error?: string; warning?: string }> {
//   try {
//     if (!asaasConfig) {
//       return { success: false, error: 'Asaas não configurado' };
//     }
//     const baseURL = getAsaasBaseUrl(asaasConfig.liveMode);
//     const payload = {
//       customer: paymentData.customerId,
//       billingType: paymentData.billingType,
//       value: paymentData.value,
//       description: paymentData.description,
//       dueDate: paymentData.dueDate,
//       split: paymentData.split.map(s => ({
//         walletId: s.walletId,
//         fixedValue: s.fixedValue,
//         status: s.status
//       }))
//     };
//     const response = await axios.post(`${baseURL}/payments`, payload, {
//       headers: {
//         'access_token': asaasConfig.apiKey,
//         'Content-Type': 'application/json'
//       }
//     });
//     return {
//       success: true,
//       paymentId: response.data.id
//     };
//   }
//     // Mostra o erro detalhado do Asaas
//     console.error('Erro ao criar pagamento com split no Asaas:', error.response?.data || error);
//     
//     // Se for erro de split na própria carteira, tentar sem split
//     if (error.response?.data?.errors?.[0]?.description?.includes('sua própria carteira')) {
//       console.log('🔄 Tentando criar pagamento sem split devido ao erro de carteira própria');
//       
//       // Criar pagamento sem split
//       const simplePayload = {
//         customer: paymentData.customerId,
//         billingType: paymentData.billingType,
//         value: paymentData.value,
//         description: paymentData.description,
//         dueDate: paymentData.dueDate
//       };
//       
//       try {
//         const simpleResponse = await axios.post(`${getAsaasBaseUrl(asaasConfig!.liveMode)}/payments`, simplePayload, {
//           headers: {
//             'access_token': asaasConfig!.apiKey,
//             'Content-Type': 'application/json'
//           }
//         });
//         
//         return {
//           success: true,
//           paymentId: simpleResponse.data.id,
//           warning: 'Pagamento criado sem split (carteiras pertencem à mesma conta)'
//         };
//       } catch (simpleError: any) {
//         return {
//           success: false,
//           error: simpleError.response?.data?.errors?.[0]?.description || simpleError.message || 'Erro ao criar pagamento simples'
//         };
//       }
//     }
//     
//     return {
//       success: false,
//       error: error.response?.data?.errors?.[0]?.description || error.response?.data?.message || error.message || 'Erro ao criar pagamento com split'
//     };
//   }
// }

/**
 * Cria um pagamento simples no Asaas (sem split)
 * @param paymentData Dados do pagamento (customerId, billingType, value, description, dueDate)
 */
export async function createAsaasPayment(paymentData: {
  customerId: string;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD';
  value: number;
  description?: string;
  dueDate?: string;
}): Promise<{ success: boolean; paymentId?: string; error?: string; pixQrCode?: string; pixQrCodeImage?: string; invoiceUrl?: string }> {
  try {
    if (!asaasConfig) {
      return { success: false, error: 'Asaas não configurado' };
    }
    const baseURL = getAsaasBaseUrl(asaasConfig.liveMode);
    const payload = {
      customer: paymentData.customerId,
      billingType: paymentData.billingType,
      value: paymentData.value,
      description: paymentData.description,
      dueDate: paymentData.dueDate
    };
    const response = await axios.post(`${baseURL}/payments`, payload, {
      headers: {
        'access_token': asaasConfig.apiKey,
        'Content-Type': 'application/json'
      }
    });
    console.log('Resposta do Asaas:', response.data);

    let pixQrCode = undefined;
    let pixQrCodeImage = undefined;
    if (paymentData.billingType === 'PIX') {
      // Buscar o QR Code do PIX após criar o pagamento
      try {
        const qrCodeResponse = await axios.get(
          `${baseURL}/payments/${response.data.id}/pixQrCode`,
          {
            headers: {
              'access_token': asaasConfig.apiKey,
              'Content-Type': 'application/json'
            }
          }
        );
        pixQrCode = qrCodeResponse.data.payload;
        pixQrCodeImage = qrCodeResponse.data.encodedImage;
      } catch (qrErr) {
        console.error('Erro ao buscar QR Code do PIX:', qrErr.response?.data || qrErr);
      }
    }

    return {
      success: true,
      paymentId: response.data.id,
      pixQrCode,
      pixQrCodeImage,
      invoiceUrl: response.data.invoiceUrl
    };
  } catch (error: any) {
    console.error('Erro ao criar pagamento no Asaas:', error.response?.data || error);
    return {
      success: false,
      error: error.response?.data?.errors?.[0]?.description || error.response?.data?.message || error.message || 'Erro ao criar pagamento'
    };
  }
}

/**
 * Cria um cliente no Asaas (pessoa física)
 * @param data Dados do cliente (name, email, cpfCnpj, mobilePhone)
 */
export async function createAsaasCustomer(data: {
  name: string;
  email: string;
  cpfCnpj: string;
  mobilePhone: string;
}): Promise<{ success: boolean; customerId?: string; error?: string }> {
  if (!asaasConfig) {
    return { success: false, error: 'Asaas não configurado' };
  }
  // ROTA FIXA PRODUÇÃO
  const baseURL = 'https://api.asaas.com/v3';
  try {
    const response = await axios.post(`${baseURL}/customers`, data, {
      headers: {
        'access_token': asaasConfig.apiKey,
        'Content-Type': 'application/json'
      }
    });
    return { success: true, customerId: response.data.id };
  } catch (error: any) {
    return { success: false, error: error.response?.data?.message || error.message };
  }
}

export { asaasConfig };