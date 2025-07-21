// Configurações do Asaas Marketplace
export const ASAAS_CONFIG = {
  // URLs da API
  API_BASE_URL: process.env.NODE_ENV === 'production' 
    ? 'https://api.asaas.com/v3' 
    : 'https://sandbox.asaas.com/api/v3',
  
  // Taxa da plataforma (em centavos)
  PLATFORM_FEE: 175, // R$ 1,75
  
  // Tipos de pagamento suportados
  BILLING_TYPES: {
    PIX: 'PIX',
    BOLETO: 'BOLETO',
    CREDIT_CARD: 'CREDIT_CARD',
    DEBIT_CARD: 'DEBIT_CARD',
  },
  
  // Status de pagamento
  PAYMENT_STATUS: {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    OVERDUE: 'OVERDUE',
    REFUNDED: 'REFUNDED',
    CANCELLED: 'CANCELLED',
    RECEIVED: 'RECEIVED',
  },
  
  // Tipos de conta bancária
  ACCOUNT_TYPES: {
    CHECKING: 'CHECKING',
    SAVINGS: 'SAVINGS',
  },
  
  // Bancos suportados
  BANKS: [
    { code: '001', name: 'Banco do Brasil' },
    { code: '104', name: 'Caixa Econômica Federal' },
    { code: '033', name: 'Santander' },
    { code: '341', name: 'Itaú' },
    { code: '237', name: 'Bradesco' },
    { code: '756', name: 'Sicoob' },
    { code: '748', name: 'Sicredi' },
    { code: '212', name: 'Banco Original' },
    { code: '077', name: 'Inter' },
    { code: '260', name: 'Nubank' },
  ],
};

// Função para formatar valores monetários
export const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value / 100); // Converte de centavos para reais
};

// Função para obter nome do banco pelo código
export const getBankName = (code: string): string => {
  const bank = ASAAS_CONFIG.BANKS.find(b => b.code === code);
  return bank ? bank.name : code;
};

// Função para validar CPF/CNPJ
export const validateCpfCnpj = (value: string): boolean => {
  const cleanValue = value.replace(/\D/g, '');
  return cleanValue.length === 11 || cleanValue.length === 14;
};

// Função para formatar CPF/CNPJ
export const formatCpfCnpj = (value: string): string => {
  const cleanValue = value.replace(/\D/g, '');
  if (cleanValue.length === 11) {
    return cleanValue.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (cleanValue.length === 14) {
    return cleanValue.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  return value;
}; 