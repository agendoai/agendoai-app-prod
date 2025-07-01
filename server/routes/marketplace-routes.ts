import express from 'express';
import { storage } from '../storage';
import * as marketplaceService from '../services/marketplace-payment-service';

const router = express.Router();

// Criar configurações padrão se não existirem
const setupDefaultMarketplaceSettings = async () => {
  try {
    // Verificar se as configurações já existem
    const merchantCodeSetting = await storage.getSystemSettingByKey('platform_merchant_code');
    const feePercentSetting = await storage.getSystemSettingByKey('platform_fee_percent');
    
    // Se não existir configuração do merchant code, criar com valor padrão
    if (!merchantCodeSetting) {
      await storage.setSystemSetting(
        'platform_merchant_code',
        process.env.SUMUP_MERCHANT_CODE || '',
        'Código do comerciante da plataforma no SumUp',
        'Código único que identifica a conta principal da plataforma no SumUp para receber os pagamentos centralizados'
      );
      console.log('[MarketplaceSettings] Configuração platform_merchant_code criada');
    }
    
    // Se não existir configuração da taxa de comissão, criar com valor padrão
    if (!feePercentSetting) {
      await storage.setSystemSetting(
        'platform_fee_percent',
        '10',
        'Percentual de comissão da plataforma',
        'Percentual retido pela plataforma em cada transação (valor entre 0 e 100)'
      );
      console.log('[MarketplaceSettings] Configuração platform_fee_percent criada');
    }
  } catch (error) {
    console.error('[MarketplaceSettings] Erro ao configurar marketplace:', error);
  }
};

// Inicializar o serviço de marketplace
const initializeMarketplaceService = async () => {
  try {
    // Configurar settings padrão primeiro
    await setupDefaultMarketplaceSettings();
    
    // Obter configuração do sistema
    const merchantCodeSetting = await storage.getSystemSettingByKey('platform_merchant_code');
    const feePercentSetting = await storage.getSystemSettingByKey('platform_fee_percent');
    
    const merchantCode = merchantCodeSetting?.value || process.env.PLATFORM_MERCHANT_CODE;
    const feePercent = feePercentSetting?.value ? parseFloat(feePercentSetting.value) : 10;
    
    marketplaceService.initializeMarketplaceService(merchantCode, feePercent);
    
    console.log('[MarketplaceRoutes] Serviço de marketplace inicializado com sucesso');
  } catch (error) {
    console.error('[MarketplaceRoutes] Erro ao inicializar serviço de marketplace:', error);
  }
};

// Chamada para inicializar o serviço
initializeMarketplaceService();

// Middleware para verificar se o usuário é um prestador
function isProvider(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Não autenticado' });
  }
  
  if (req.user.userType !== 'provider') {
    return res.status(403).json({ message: 'Acesso negado. Apenas prestadores podem acessar este recurso.' });
  }
  
  next();
}

// Rota para obter o saldo do prestador
router.get('/balance', isProvider, async (req, res) => {
  try {
    const providerId = req.user.id;
    const balance = await marketplaceService.getProviderBalance(providerId);
    
    if (!balance) {
      return res.status(404).json({ message: 'Saldo não encontrado' });
    }
    
    res.json(balance);
  } catch (error) {
    console.error('Erro ao obter saldo:', error);
    res.status(500).json({ message: 'Erro ao obter saldo' });
  }
});

// Rota para obter transações do prestador
router.get('/transactions', isProvider, async (req, res) => {
  try {
    const providerId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const type = req.query.type as string;
    
    const result = await marketplaceService.getProviderTransactions(providerId, page, limit, type);
    res.json(result);
  } catch (error) {
    console.error('Erro ao obter transações:', error);
    res.status(500).json({ message: 'Erro ao obter transações' });
  }
});

// Rota para solicitar saque
router.post('/withdrawals', isProvider, async (req, res) => {
  try {
    const providerId = req.user.id;
    const { amount, paymentMethod, paymentDetails } = req.body;
    
    if (!amount || amount <= 0) {
      return res.status(400).json({ message: 'Valor de saque inválido' });
    }
    
    if (!paymentMethod) {
      return res.status(400).json({ message: 'Método de pagamento não informado' });
    }
    
    const withdrawal = await marketplaceService.requestWithdrawal(
      providerId,
      amount,
      paymentMethod,
      paymentDetails
    );
    
    if (!withdrawal) {
      return res.status(400).json({ message: 'Falha ao solicitar saque' });
    }
    
    res.status(201).json(withdrawal);
  } catch (error) {
    console.error('Erro ao solicitar saque:', error);
    
    if (error.message === 'Saldo insuficiente para saque') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Erro ao solicitar saque' });
  }
});

// Rota para listar saques
router.get('/withdrawals', isProvider, async (req, res) => {
  try {
    const providerId = req.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const status = req.query.status as string;
    
    const result = await storage.getProviderWithdrawals(providerId, {
      offset: (page - 1) * limit,
      limit,
      status
    });
    
    res.json({
      withdrawals: result.withdrawals,
      total: result.total,
      page,
      totalPages: Math.ceil(result.total / limit)
    });
  } catch (error) {
    console.error('Erro ao obter saques:', error);
    res.status(500).json({ message: 'Erro ao obter saques' });
  }
});

// Rotas para processamento de pagamentos do marketplace (centralizado)
router.post('/create-checkout', async (req, res) => {
  try {
    const { amount, currency, description, providerId, customerEmail, customerPhone, additionalInfo } = req.body;
    
    if (!amount || !currency || !description || !providerId) {
      return res.status(400).json({ message: 'Parâmetros incompletos' });
    }
    
    const checkout = await marketplaceService.createCheckout({
      amount,
      currency,
      description,
      providerId,
      customerEmail,
      customerPhone,
      additionalInfo
    });
    
    res.json(checkout);
  } catch (error) {
    console.error('Erro ao criar checkout:', error);
    res.status(500).json({ message: 'Erro ao criar checkout', error: error.message });
  }
});

router.post('/complete-checkout/:checkoutId', async (req, res) => {
  try {
    const { checkoutId } = req.params;
    const { cardDetails } = req.body;
    
    if (!checkoutId || !cardDetails) {
      return res.status(400).json({ message: 'Parâmetros incompletos' });
    }
    
    const result = await marketplaceService.completeCheckout(checkoutId, cardDetails);
    res.json(result);
  } catch (error) {
    console.error('Erro ao processar pagamento:', error);
    res.status(500).json({ message: 'Erro ao processar pagamento', error: error.message });
  }
});

router.get('/checkout-status/:checkoutId', async (req, res) => {
  try {
    const { checkoutId } = req.params;
    const status = await marketplaceService.getCheckoutStatus(checkoutId);
    res.json(status);
  } catch (error) {
    console.error('Erro ao verificar status do checkout:', error);
    res.status(500).json({ message: 'Erro ao verificar status do checkout' });
  }
});

// Rotas para gerenciar taxas de categorias (admin)
router.get('/admin/category-fees', isAdmin, async (req, res) => {
  try {
    // Buscar todas as categorias
    const categories = await storage.getCategories();
    
    // Preparar resposta com taxas
    const categoryFees = categories.map(category => {
      return {
        id: category.id,
        name: category.name,
        feePercent: marketplaceService.getCategoryFee(category.id)
      };
    });
    
    res.json(categoryFees);
  } catch (error) {
    console.error('Erro ao obter taxas de categorias:', error);
    res.status(500).json({ message: 'Erro ao obter taxas de categorias' });
  }
});

router.put('/admin/category-fees/:id', isAdmin, async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { feePercent } = req.body;
    
    if (isNaN(categoryId) || categoryId <= 0) {
      return res.status(400).json({ message: 'ID de categoria inválido' });
    }
    
    if (isNaN(feePercent) || feePercent < 0 || feePercent > 100) {
      return res.status(400).json({ message: 'Porcentagem de taxa inválida. Deve ser um número entre 0 e 100.' });
    }
    
    // Verificar se a categoria existe
    const category = await storage.getCategory(categoryId);
    if (!category) {
      return res.status(404).json({ message: 'Categoria não encontrada' });
    }
    
    // Atualizar a taxa para a categoria
    marketplaceService.setCategoryFee(categoryId, feePercent);
    
    // Salvar as configurações atualizadas no banco de dados
    await marketplaceService.saveCategoryFees();
    
    res.json({ 
      id: categoryId,
      name: category.name,
      feePercent: feePercent
    });
  } catch (error) {
    console.error(`Erro ao atualizar taxa da categoria:`, error);
    res.status(500).json({ message: 'Erro ao atualizar taxa da categoria' });
  }
});

// Rotas administrativas (somente para usuários admin)
function isAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ message: 'Não autenticado' });
  }
  
  if (req.user.userType !== 'admin') {
    return res.status(403).json({ message: 'Acesso negado. Apenas administradores podem acessar este recurso.' });
  }
  
  next();
}

// Rota para administrador atualizar status de um saque
router.put('/admin/withdrawals/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, transactionId, notes } = req.body;
    
    if (!status) {
      return res.status(400).json({ message: 'Status não informado' });
    }
    
    const success = await marketplaceService.updateWithdrawalStatus(
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