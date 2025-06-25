import Stripe from 'stripe';
import { db } from './db';
import { appointments, paymentSettings, userPaymentMethods, UserPaymentMethod, InsertUserPaymentMethod } from '@shared/schema';
import { eq } from 'drizzle-orm';

let stripeClient: Stripe | null = null;
let stripeConfig: {
  secretKey: string;
  liveMode: boolean;
  webhookSecret?: string;
} | null = null;

/**
 * Inicializa o cliente Stripe com as configurações salvas no banco de dados
 */
export async function initializeStripe(): Promise<void> {
  try {
    // Buscar configurações do banco de dados
    const [settings] = await db.select().from(paymentSettings).limit(1);

    if (!settings?.stripeEnabled || !settings?.stripeSecretKey) {
      console.log('Stripe não configurado ou desativado');
      stripeClient = null;
      stripeConfig = null;
      return;
    }

    // Configurar cliente Stripe
    stripeClient = new Stripe(settings.stripeSecretKey);

    stripeConfig = {
      secretKey: settings.stripeSecretKey,
      liveMode: settings.stripeLiveMode || false,
      webhookSecret: settings.stripeWebhookSecret || undefined,
    };

    console.log(`Stripe inicializado em modo ${settings.stripeLiveMode ? 'produção' : 'teste'}`);
  } catch (error) {
    console.error('Erro ao inicializar Stripe:', error);
    stripeClient = null;
    stripeConfig = null;
  }
}

/**
 * Obtém o cliente Stripe inicializado
 */
export function getStripeClient(): Stripe {
  if (!stripeClient) {
    throw new Error('Stripe não foi inicializado. Execute initializeStripe() primeiro.');
  }
  return stripeClient;
}

/**
 * Verifica se o Stripe está configurado e ativo
 */
export function isStripeEnabled(): boolean {
  return !!stripeClient;
}

/**
 * Testa a conexão com o Stripe usando as credenciais fornecidas
 */
export async function testStripeConnection(secretKey: string, liveMode: boolean): Promise<{ success: boolean; message: string }> {
  try {
    const testClient = new Stripe(secretKey);

    // Tentar buscar informações da conta para testar a conexão
    const account = await testClient.accounts.retrieve();

    return {
      success: true,
      message: `Conexão bem-sucedida com a conta ${account.id} ${liveMode ? '(produção)' : '(teste)'}`,
    };
  } catch (error: any) {
    console.error('Erro ao testar conexão Stripe:', error);
    return {
      success: false,
      message: `Falha na conexão: ${error.message}`,
    };
  }
}

/**
 * Cria um payment intent para um agendamento
 */
export async function createPaymentIntent(appointmentId: number): Promise<{ clientSecret: string; paymentIntentId: string }> {
  if (!stripeClient) {
    await initializeStripe();
    if (!stripeClient) {
      throw new Error('Stripe não está configurado. Configure o Stripe nas configurações de pagamento.');
    }
  }

  // Buscar detalhes do agendamento
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, appointmentId));

  if (!appointment) {
    throw new Error('Agendamento não encontrado');
  }

  if (appointment.status === 'cancelled') {
    throw new Error('Agendamento cancelado não pode ser pago');
  }

  if (appointment.paymentStatus === 'paid') {
    throw new Error('Este agendamento já foi pago');
  }

  // Criar um payment intent
  try {
    const paymentIntent = await stripeClient.paymentIntents.create({
      amount: Math.round((appointment.totalPrice || 0) * 100), // Converter para centavos
      currency: 'brl',
      metadata: {
        appointmentId: appointment.id.toString(),
        clientId: appointment.clientId.toString(),
        providerId: appointment.providerId.toString(),
        serviceName: appointment.serviceName,
      },
      description: `Pagamento para ${appointment.serviceName} com ${appointment.providerName}`,
    });

    // Atualizar o agendamento com o ID do payment intent
    await db
      .update(appointments)
      .set({
        paymentId: paymentIntent.id,
        paymentStatus: 'pending',
        updatedAt: new Date(),
      })
      .where(eq(appointments.id, appointmentId));

    return {
      clientSecret: paymentIntent.client_secret as string,
      paymentIntentId: paymentIntent.id,
    };
  } catch (error: any) {
    console.error('Erro ao criar payment intent:', error);
    throw new Error(`Falha ao processar pagamento: ${error.message}`);
  }
}

/**
 * Processa webhook do Stripe
 */
export async function handleStripeWebhook(
  signature: string,
  rawBody: Buffer
): Promise<{ success: boolean; message: string }> {
  if (!stripeClient || !stripeConfig?.webhookSecret) {
    return {
      success: false,
      message: 'Stripe não configurado ou webhook secret não definido',
    };
  }

  try {
    const event = stripeClient.webhooks.constructEvent(
      rawBody,
      signature,
      stripeConfig.webhookSecret
    );

    // Processar eventos
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      // Adicione mais handlers conforme necessário
    }

    return {
      success: true,
      message: `Webhook processado: ${event.type}`,
    };
  } catch (error: any) {
    console.error('Erro ao processar webhook:', error);
    return {
      success: false,
      message: `Erro no webhook: ${error.message}`,
    };
  }
}

/**
 * Processa payment intent bem-sucedido
 */
async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const appointmentId = paymentIntent.metadata?.appointmentId;
  if (!appointmentId) {
    console.error('Payment intent sem appointmentId no metadata');
    return;
  }

  // Atualizar status do agendamento
  await db
    .update(appointments)
    .set({
      paymentStatus: 'paid',
      status: 'confirmed',
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, parseInt(appointmentId)));

  console.log(`Pagamento confirmado para agendamento ${appointmentId}`);
}

/**
 * Processa payment intent falho
 */
async function handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
  const appointmentId = paymentIntent.metadata?.appointmentId;
  if (!appointmentId) {
    console.error('Payment intent sem appointmentId no metadata');
    return;
  }

  // Atualizar status do agendamento
  await db
    .update(appointments)
    .set({
      paymentStatus: 'failed',
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, parseInt(appointmentId)));

  console.log(`Pagamento falhou para agendamento ${appointmentId}`);
}

/**
 * Busca um agendamento pelo ID do payment intent
 */
export async function getAppointmentByPaymentId(paymentId: string) {
  const [appointment] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.paymentId as any, paymentId));

  return appointment;
}

/**
 * Atualiza o cliente Stripe com novas configurações
 */
export async function updateStripeConfig(config: {
  secretKey: string;
  liveMode: boolean;
  webhookSecret?: string;
}): Promise<void> {
  stripeClient = new Stripe(config.secretKey);
  
  stripeConfig = config;
  
  console.log(`Stripe reconfigurado em modo ${config.liveMode ? 'produção' : 'teste'}`);
}

/**
 * Cria um cliente Stripe para o usuário
 */
export async function createStripeCustomer(userId: number, email: string, name: string): Promise<string> {
  if (!stripeClient) {
    await initializeStripe();
    if (!stripeClient) {
      throw new Error('Stripe não está configurado');
    }
  }

  try {
    const customer = await stripeClient.customers.create({
      email,
      name,
      metadata: {
        userId: userId.toString(),
      },
    });

    // Retorna o ID do cliente Stripe
    return customer.id;
  } catch (error: any) {
    console.error('Erro ao criar cliente Stripe:', error);
    throw new Error(`Falha ao criar cliente: ${error.message}`);
  }
}

/**
 * Adiciona um novo método de pagamento (cartão) para o cliente
 */
export async function addPaymentMethod(customerId: string, paymentMethodId: string): Promise<Stripe.PaymentMethod> {
  if (!stripeClient) {
    await initializeStripe();
    if (!stripeClient) {
      throw new Error('Stripe não está configurado');
    }
  }

  try {
    // Anexar o método de pagamento ao cliente
    await stripeClient.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });

    // Buscar os detalhes do método de pagamento
    const paymentMethod = await stripeClient.paymentMethods.retrieve(paymentMethodId);
    
    // Definir como padrão se este for o primeiro cartão
    const customerPaymentMethods = await stripeClient.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });
    
    if (customerPaymentMethods.data.length === 1) {
      await stripeClient.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });
    }

    return paymentMethod;
  } catch (error: any) {
    console.error('Erro ao adicionar método de pagamento:', error);
    throw new Error(`Falha ao adicionar cartão: ${error.message}`);
  }
}

/**
 * Lista todos os métodos de pagamento (cartões) de um cliente
 */
export async function listPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
  if (!stripeClient) {
    await initializeStripe();
    if (!stripeClient) {
      throw new Error('Stripe não está configurado');
    }
  }

  try {
    const paymentMethods = await stripeClient.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    // Buscar o método de pagamento padrão do cliente
    const customer = await stripeClient.customers.retrieve(customerId);
    const defaultPaymentMethodId = typeof customer !== 'string' 
      ? customer.invoice_settings?.default_payment_method 
      : null;

    // Marcar o método de pagamento padrão
    return paymentMethods.data.map(pm => ({
      ...pm,
      metadata: {
        ...pm.metadata,
        isDefault: pm.id === defaultPaymentMethodId
      }
    }));
  } catch (error: any) {
    console.error('Erro ao listar métodos de pagamento:', error);
    throw new Error(`Falha ao listar cartões: ${error.message}`);
  }
}

/**
 * Remove um método de pagamento (cartão) de um cliente
 */
export async function removePaymentMethod(paymentMethodId: string): Promise<void> {
  if (!stripeClient) {
    await initializeStripe();
    if (!stripeClient) {
      throw new Error('Stripe não está configurado');
    }
  }

  try {
    // Desanexar o método de pagamento do cliente
    await stripeClient.paymentMethods.detach(paymentMethodId);
  } catch (error: any) {
    console.error('Erro ao remover método de pagamento:', error);
    throw new Error(`Falha ao remover cartão: ${error.message}`);
  }
}

/**
 * Define um método de pagamento como padrão para o cliente
 */
export async function setDefaultPaymentMethod(customerId: string, paymentMethodId: string): Promise<void> {
  if (!stripeClient) {
    await initializeStripe();
    if (!stripeClient) {
      throw new Error('Stripe não está configurado');
    }
  }

  try {
    await stripeClient.customers.update(customerId, {
      invoice_settings: {
        default_payment_method: paymentMethodId,
      },
    });
  } catch (error: any) {
    console.error('Erro ao definir método de pagamento padrão:', error);
    throw new Error(`Falha ao definir cartão padrão: ${error.message}`);
  }
}

/**
 * Obtém ou cria os dados de pagamento do usuário no Stripe
 */
export async function getUserStripeData(userId: number, email: string, name: string): Promise<UserPaymentMethod> {
  try {
    // Verificar se já existe um registro para o usuário
    const [existingData] = await db
      .select()
      .from(userPaymentMethods)
      .where(eq(userPaymentMethods.userId, userId));
    
    if (existingData) {
      return existingData;
    }
    
    // Se não existir, criar um novo cliente no Stripe
    const stripeCustomerId = await createStripeCustomer(userId, email, name);
    
    // Inserir na tabela userPaymentMethods
    const [newUserPaymentMethod] = await db
      .insert(userPaymentMethods)
      .values({
        userId,
        stripeCustomerId,
      })
      .returning();
    
    return newUserPaymentMethod;
  } catch (error: any) {
    console.error('Erro ao obter/criar dados do Stripe do usuário:', error);
    throw new Error(`Falha ao configurar método de pagamento: ${error.message}`);
  }
}

/**
 * Retorna um objeto formatado com informações do cartão para exibição
 */
export function formatCardDetails(paymentMethod: Stripe.PaymentMethod): {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
} {
  // Extrair detalhes do cartão
  const card = paymentMethod.card;
  
  if (!card) {
    throw new Error('Método de pagamento não contém informações de cartão');
  }
  
  return {
    id: paymentMethod.id,
    brand: card.brand,
    last4: card.last4,
    expMonth: card.exp_month,
    expYear: card.exp_year,
    isDefault: (paymentMethod.metadata as any)?.isDefault || false,
  };
}