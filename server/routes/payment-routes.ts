/**
 * Rotas para processamento de pagamentos
 *
 * Este módulo implementa rotas para gerenciar pagamentos e assinaturas
 * utilizando a API do Stripe
 */
import { Router } from 'express';
import Stripe from 'stripe';
import { storage } from '../storage';
import { z } from 'zod';

// Verificação de chave secreta do Stripe
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('ERRO: Chave secreta do Stripe não configurada (STRIPE_SECRET_KEY)');
}

// Inicializa o cliente Stripe com a chave secreta
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: "2025-04-30.basil" as any,
});

export const paymentRouter = Router();

// Schema para validação da requisição de pagamento
const createPaymentIntentSchema = z.object({
  amount: z.number().positive(),
  description: z.string().optional(),
  metadata: z.record(z.string()).optional(),
});

/**
 * Cria um PaymentIntent para processar um pagamento único
 * POST /api/payments/create-payment-intent
 */
paymentRouter.post('/create-payment-intent', async (req, res) => {
  try {
    // Verifica se o usuário está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Valida os dados da requisição
    const validation = createPaymentIntentSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: validation.error.format() 
      });
    }

    const { amount, description, metadata } = validation.data;
    
    // Verificar se o usuário já tem um ID de cliente no Stripe
    const paymentMethods = await storage.getUserPaymentMethods(req.user.id);
    let stripeCustomerId = paymentMethods.length > 0 ? paymentMethods[0].stripeCustomerId : null;
    
    // Se não tiver, cria um novo cliente no Stripe
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: req.user.email,
        name: req.user.name || "Cliente " + req.user.id,
        metadata: {
          userId: String(req.user.id)
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Atualiza o ID do cliente no banco de dados
      await storage.updateStripeCustomerId(req.user.id, stripeCustomerId);
    }
    
    // Cria o PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Converte para centavos
      currency: 'brl',
      customer: stripeCustomerId,
      description: description || `Pagamento AgendoAI - Usuário ${req.user.id}`,
      metadata: {
        userId: String(req.user.id),
        ...metadata
      },
      receipt_email: req.user.email, // Envia recibo por email
      payment_method_types: ['card'],
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'always'
      },
      setup_future_usage: 'off_session', // Permite uso futuro do método de pagamento
    });

    // Registra a intenção de pagamento
    try {
      await storage.createPaymentLog({
        userId: req.user.id,
        paymentIntentId: paymentIntent.id,
        amount: amount,
        status: 'pending',
        metadata: JSON.stringify(metadata)
      });
    } catch (err) {
      console.error('Erro ao registrar pagamento no log:', err);
      // Não interrompe o fluxo se o log falhar
    }

    // Retorna o clientSecret para o frontend
    res.json({ 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id 
    });
  } catch (error: any) {
    console.error('Erro ao criar payment intent:', error);
    res.status(500).json({ 
      message: 'Erro ao processar o pagamento', 
      error: error.message 
    });
  }
});

/**
 * Verifica o status de um PaymentIntent
 * GET /api/payments/check-status/:paymentIntentId
 */
paymentRouter.get('/check-status/:paymentIntentId', async (req, res) => {
  try {
    // Verifica se o usuário está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const { paymentIntentId } = req.params;
    
    if (!paymentIntentId) {
      return res.status(400).json({ message: 'ID de pagamento não fornecido' });
    }

    // Recupera o PaymentIntent do Stripe
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    // Verifica se o PaymentIntent pertence ao usuário atual
    if (paymentIntent.metadata?.userId && 
        paymentIntent.metadata.userId !== String(req.user.id)) {
      return res.status(403).json({ message: 'Acesso negado a este pagamento' });
    }
    
    // Retorna status e outras informações relevantes
    res.json({
      id: paymentIntent.id,
      status: paymentIntent.status,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      created: new Date(paymentIntent.created * 1000).toISOString(),
      description: paymentIntent.description
    });
  } catch (error: any) {
    console.error('Erro ao verificar status do pagamento:', error);
    res.status(500).json({ 
      message: 'Erro ao verificar status do pagamento', 
      error: error.message 
    });
  }
});

// Schema para validação da requisição de webhook
const webhookEventSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.object({
    object: z.record(z.any())
  }).passthrough()
});

/**
 * Webhook para receber eventos do Stripe
 * POST /api/payments/webhook
 */
paymentRouter.post('/webhook', async (req, res) => {
  let event;
  
  try {
    // Verificar a assinatura do webhook se estiver configurada
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    if (webhookSecret) {
      // Recupera a assinatura do header
      const signature = req.headers['stripe-signature'];
      
      if (!signature) {
        return res.status(400).json({ message: 'Assinatura do webhook não encontrada' });
      }
      
      try {
        // Construir o evento a partir do body e da assinatura
        event = stripe.webhooks.constructEvent(
          req.body, 
          signature as string, 
          webhookSecret
        );
      } catch (err: any) {
        console.error(`⚠️ Erro na assinatura do webhook: ${err.message}`);
        return res.status(400).json({ message: `Assinatura inválida: ${err.message}` });
      }
    } else {
      // Se não houver segredo de webhook, validação básica
      const validation = webhookEventSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: 'Formato de evento inválido' 
        });
      }
      event = req.body;
    }

    // Processa o evento com base no tipo
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        console.log(`🔔 Pagamento confirmado: ${paymentIntent.id}`);
        
        // Registra o pagamento bem-sucedido no banco de dados
        if (paymentIntent.metadata?.userId) {
          const userId = parseInt(paymentIntent.metadata.userId);
          
          try {
            // Atualiza o status do pagamento no log
            await storage.updatePaymentLog(paymentIntent.id, {
              status: 'completed',
              completedAt: new Date()
            });
            
            // Se for um pagamento de agendamento, atualizar o status do agendamento
            if (paymentIntent.metadata?.appointmentId && 
                paymentIntent.metadata.appointmentId !== 'none') {
              const appointmentId = parseInt(paymentIntent.metadata.appointmentId);
              
              // Atualiza o status de pagamento do agendamento
              await storage.updateAppointmentPaymentStatus(appointmentId, 'paid');
              console.log(`📅 Agendamento #${appointmentId} marcado como pago`);
            }
            
            console.log(`✅ Pagamento registrado para usuário ${userId}`);
          } catch (err) {
            console.error('Erro ao processar pagamento confirmado:', err);
          }
        }
        break;
        
      case 'payment_intent.payment_failed':
        const failedPayment = event.data.object;
        console.log(`⚠️ Pagamento falhou: ${failedPayment.id}`);
        
        // Atualiza o status do pagamento no log
        try {
          await storage.updatePaymentLog(failedPayment.id, {
            status: 'failed',
            completedAt: new Date()
          });
          
          // Se for um pagamento de agendamento, atualizar o status
          if (failedPayment.metadata?.appointmentId && 
              failedPayment.metadata.appointmentId !== 'none') {
            const appointmentId = parseInt(failedPayment.metadata.appointmentId);
            
            // Marca o pagamento como falho
            await storage.updateAppointmentPaymentStatus(appointmentId, 'failed');
            console.log(`🔴 Pagamento falhou para agendamento #${appointmentId}`);
          }
        } catch (err) {
          console.error('Erro ao processar falha de pagamento:', err);
        }
        break;
        
      case 'customer.subscription.created':
        const subscription = event.data.object;
        console.log(`🔔 Assinatura criada: ${subscription.id}`);
        break;
        
      case 'customer.subscription.updated':
        const updatedSubscription = event.data.object;
        console.log(`🔔 Assinatura atualizada: ${updatedSubscription.id}`);
        break;
        
      case 'customer.subscription.deleted':
        const deletedSubscription = event.data.object;
        console.log(`🔔 Assinatura cancelada: ${deletedSubscription.id}`);
        break;
        
      default:
        console.log(`🔔 Evento não processado: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Erro ao processar webhook:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schema para validação da criação de assinatura
const createSubscriptionSchema = z.object({
  priceId: z.string().optional(),
  planType: z.enum(['mensal', 'anual']).default('mensal'),
  metadata: z.record(z.string()).optional(),
});

/**
 * Cria ou recupera uma assinatura para o usuário
 * POST /api/payments/create-subscription
 */
paymentRouter.post('/create-subscription', async (req, res) => {
  try {
    // Verifica se o usuário está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    const user = req.user;
    
    // Valida os dados da requisição
    const validation = createSubscriptionSchema.safeParse(req.body);
    if (!validation.success) {
      return res.status(400).json({ 
        message: 'Dados inválidos', 
        errors: validation.error.format() 
      });
    }

    const { planType, metadata } = validation.data;
    
    // Define o ID do preço com base no plano (mensal ou anual)
    const priceId = planType === 'anual' 
      ? process.env.STRIPE_ANNUAL_PRICE_ID 
      : process.env.STRIPE_MONTHLY_PRICE_ID;
      
    if (!priceId) {
      return res.status(500).json({ 
        message: `ID de preço para plano ${planType} não configurado` 
      });
    }
      
    // Verificar se o usuário já tem um ID de cliente no Stripe
    const paymentMethods = await storage.getUserPaymentMethods(user.id);
    let stripeCustomerId = paymentMethods.length > 0 ? paymentMethods[0].stripeCustomerId : null;
    
    // Se não tiver, cria um novo cliente no Stripe
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        name: user.name || "Cliente " + user.id,
        metadata: {
          userId: String(user.id)
        }
      });
      
      stripeCustomerId = customer.id;
      
      // Atualiza o ID do cliente no banco de dados
      await storage.updateStripeCustomerId(user.id, stripeCustomerId);
    }
    
    // Verificar se já existe uma assinatura ativa
    const existingSubscription = await storage.getUserActiveSubscription(user.id);
    
    if (existingSubscription) {
      // Verificar no Stripe se a assinatura ainda está ativa
      const stripeSubscription = await stripe.subscriptions.retrieve(
        existingSubscription.stripeSubscriptionId
      );
      
      if (stripeSubscription.status === 'active') {
        return res.status(400).json({
          message: 'Usuário já possui uma assinatura ativa',
          subscriptionId: existingSubscription.stripeSubscriptionId
        });
      }
    }
    
    // Cria a assinatura
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomerId,
      items: [{
        price: priceId,
      }],
      payment_behavior: 'default_incomplete',
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        userId: String(user.id),
        planType,
        ...metadata
      }
    });
    
    // Salva as informações da assinatura no banco de dados
    const invoice = subscription.latest_invoice as any;
    const paymentIntent = invoice?.payment_intent as any;
    
    // Registra a assinatura no banco de dados
    await storage.createSubscription({
      userId: user.id,
      stripeSubscriptionId: subscription.id,
      planType: planType,
      status: subscription.status,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      metadata: JSON.stringify(metadata)
    });
    
    // Retorna os dados necessários para o frontend
    res.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
      status: subscription.status
    });
    
  } catch (error: any) {
    console.error('Erro ao criar assinatura:', error);
    res.status(500).json({ 
      message: 'Erro ao processar a assinatura', 
      error: error.message 
    });
  }
});

/**
 * Obtém as informações da assinatura atual do usuário
 * GET /api/payments/subscription
 */
paymentRouter.get('/subscription', async (req, res) => {
  try {
    // Verifica se o usuário está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Busca a assinatura ativa do usuário
    const subscription = await storage.getUserActiveSubscription(req.user.id);
    
    if (!subscription) {
      return res.json({ hasActiveSubscription: false });
    }
    
    // Busca os detalhes no Stripe
    try {
      const stripeSubscription = await stripe.subscriptions.retrieve(
        subscription.stripeSubscriptionId
      );
      
      // Retorna os dados de assinatura formatados
      res.json({
        hasActiveSubscription: stripeSubscription.status === 'active',
        subscription: {
          id: stripeSubscription.id,
          status: stripeSubscription.status,
          currentPeriodStart: new Date(stripeSubscription.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeSubscription.current_period_end * 1000),
          planType: subscription.planType,
          cancelAtPeriodEnd: stripeSubscription.cancel_at_period_end
        }
      });
    } catch (stripeError) {
      console.error('Erro ao buscar assinatura no Stripe:', stripeError);
      // Retorna os dados do banco de dados se o Stripe falhar
      res.json({
        hasActiveSubscription: subscription.status === 'active',
        subscription: {
          id: subscription.stripeSubscriptionId,
          status: subscription.status,
          currentPeriodStart: subscription.currentPeriodStart,
          currentPeriodEnd: subscription.currentPeriodEnd,
          planType: subscription.planType,
          cancelAtPeriodEnd: false
        }
      });
    }
  } catch (error: any) {
    console.error('Erro ao buscar assinatura:', error);
    res.status(500).json({ 
      message: 'Erro ao buscar informações de assinatura', 
      error: error.message 
    });
  }
});

/**
 * Cancela a assinatura do usuário
 * POST /api/payments/cancel-subscription
 */
paymentRouter.post('/cancel-subscription', async (req, res) => {
  try {
    // Verifica se o usuário está autenticado
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Usuário não autenticado' });
    }

    // Busca a assinatura ativa do usuário
    const subscription = await storage.getUserActiveSubscription(req.user.id);
    
    if (!subscription) {
      return res.status(404).json({ message: 'Nenhuma assinatura ativa encontrada' });
    }
    
    // Cancela a assinatura no Stripe (ao final do período atual)
    const updatedSubscription = await stripe.subscriptions.update(
      subscription.stripeSubscriptionId,
      { cancel_at_period_end: true }
    );
    
    // Atualiza o status no banco de dados
    await storage.updateSubscriptionStatus(
      subscription.stripeSubscriptionId, 
      'cancelling'
    );
    
    // Retorna os dados atualizados
    res.json({
      id: updatedSubscription.id,
      status: 'cancelling', 
      cancelAtPeriodEnd: true,
      currentPeriodEnd: new Date(updatedSubscription.current_period_end * 1000)
    });
  } catch (error: any) {
    console.error('Erro ao cancelar assinatura:', error);
    res.status(500).json({ 
      message: 'Erro ao cancelar assinatura', 
      error: error.message 
    });
  }
});