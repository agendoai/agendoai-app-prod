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
function getAsaasBaseUrl(liveMode: boolean): string {
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