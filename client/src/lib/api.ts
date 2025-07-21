// API Configuration
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Helper function to make API calls
export const apiCall = async (endpoint: string, options: RequestInit = {}) => {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const defaultOptions: RequestInit = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include', // Include cookies for session management
    ...options,
  };

  const response = await fetch(url, defaultOptions);
  
  if (!response.ok) {
    throw new Error(`API call failed: ${response.status} ${response.statusText}`);
  }
  
  return response;
};

// Helper function for JSON responses
export const apiJson = async (endpoint: string, options: RequestInit = {}) => {
  const response = await apiCall(endpoint, options);
  return response.json();
};

// Helper function for text responses
export const apiText = async (endpoint: string, options: RequestInit = {}) => {
  const response = await apiCall(endpoint, options);
  return response.text();
};

// Export the base URL for direct use if needed
export { API_BASE_URL }; 

// ==================== ASAAS MARKETPLACE API ====================

/**
 * Cadastra um novo prestador no marketplace Asaas
 */
export async function createAsaasProvider(providerData: {
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  birthDate: string;
  monthlyIncome: string | number;
  bankAccount?: {
    bank: string;
    accountNumber: string;
    accountDigit: string;
    branchNumber: string;
    branchDigit?: string;
    accountType: 'CHECKING' | 'SAVINGS';
  };
}) {
  const response = await fetch('/api/asaas-marketplace/providers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(providerData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao cadastrar prestador');
  }

  return response.json();
}

/**
 * Consulta dados de um prestador
 */
export async function getAsaasProvider(providerId: number) {
  const response = await fetch(`/api/asaas-marketplace/providers/${providerId}`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao consultar prestador');
  }

  return response.json();
}

/**
 * Consulta saldo de um prestador
 */
export async function getAsaasProviderBalance(providerId: number) {
  const response = await fetch(`/api/asaas-marketplace/providers/${providerId}/balance`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao consultar saldo');
  }

  return response.json();
}

/**
 * Consulta saldo da plataforma (admin)
 */
export async function getAsaasPlatformBalance() {
  const response = await fetch('/api/asaas-marketplace/admin/balance', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao consultar saldo da plataforma');
  }

  return response.json();
}

/**
 * Cria um pagamento com split
 */
export async function createAsaasPayment(paymentData: {
  customerId: string;
  providerId: number;
  serviceValue: number;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD';
  description?: string;
  dueDate?: string;
}) {
  const response = await fetch('/api/asaas-marketplace/payments', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(paymentData),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao criar pagamento');
  }

  return response.json();
}

/**
 * Libera repasse para o prestador
 */
export async function releaseAsaasPayment(paymentId: string) {
  const response = await fetch(`/api/asaas-marketplace/payments/${paymentId}/release`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao liberar repasse');
  }

  return response.json();
}

/**
 * Consulta status de um pagamento
 */
export async function getAsaasPaymentStatus(paymentId: string) {
  const response = await fetch(`/api/asaas-marketplace/payments/${paymentId}/status`, {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao consultar status');
  }

  return response.json();
}

/**
 * Cancela um pagamento
 */
export async function cancelAsaasPayment(paymentId: string) {
  const response = await fetch(`/api/asaas-marketplace/payments/${paymentId}/cancel`, {
    method: 'POST',
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao cancelar pagamento');
  }

  return response.json();
}

/**
 * Lista todas as carteiras (admin)
 */
export async function listAsaasWallets() {
  const response = await fetch('/api/asaas-marketplace/admin/wallets', {
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Erro ao listar carteiras');
  }

  return response.json();
} 

// ==================== ASAAS API FUNCTIONS ====================

// Criar subconta para prestador
export const createAsaasSubAccount = async (subAccountData: any) => {
  const response = await fetch('/api/admin/asaas/subaccounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(subAccountData),
  });
  return response.json();
};

// Listar subcontas
export const listAsaasSubAccounts = async () => {
  const response = await fetch('/api/admin/asaas/subaccounts', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
};

// Consultar saldo da subconta
export const getAsaasSubAccountBalance = async (subAccountId: string) => {
  const response = await fetch(`/api/admin/asaas/subaccounts/${subAccountId}/balance`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
};

// Atualizar subconta
export const updateAsaasSubAccount = async (subAccountId: string, updates: any) => {
  const response = await fetch(`/api/admin/asaas/subaccounts/${subAccountId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updates),
  });
  return response.json();
};

// Consultar saldo da conta principal
export const getAsaasMainBalance = async () => {
  const response = await fetch('/api/admin/asaas/balance', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
};

// Criar cliente no Asaas
export const createAsaasCustomer = async (customerData: any) => {
  const response = await fetch('/api/admin/asaas/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(customerData),
  });
  return response.json();
};

// Processar pagamento de agendamento com split
export const processAsaasBookingPayment = async (paymentData: {
  customerData: any;
  paymentData: {
    billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'DEBIT_CARD';
    totalValue: number;
    serviceValue: number;
    platformFee: number;
    description?: string;
    dueDate?: string;
    providerSubAccountId: string;
  };
}) => {
  const response = await fetch('/api/admin/asaas/process-booking-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(paymentData),
  });
  return response.json();
};

// Liberar valor retido na custódia
export const releaseAsaasEscrowValue = async (subAccountId: string, amount: number) => {
  const response = await fetch(`/api/admin/asaas/subaccounts/${subAccountId}/release-escrow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ amount }),
  });
  return response.json();
};

// Consultar pagamentos de uma subconta
export const getAsaasSubAccountPayments = async (subAccountId: string) => {
  const response = await fetch(`/api/admin/asaas/subaccounts/${subAccountId}/payments`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return response.json();
}; 

// ==================== ASAAS PROVIDER FUNCTIONS ====================

// Consultar saldo da subconta do prestador (rota de prestador)
export const getAsaasProviderSubAccountBalance = async (providerId: number) => {
  const response = await fetch(`/api/asaas-marketplace/providers/${providerId}/balance`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  return response.json();
};

// Consultar pagamentos da subconta do prestador (rota de prestador)
export const getAsaasProviderPayments = async (providerId: number) => {
  const response = await fetch(`/api/asaas-marketplace/providers/${providerId}/payments`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
  });
  return response.json();
};

// Liberar valor retido na custódia (rota de prestador)
export const releaseAsaasProviderEscrowValue = async (providerId: number, amount: number) => {
  const response = await fetch(`/api/asaas-marketplace/providers/${providerId}/release-escrow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ amount }),
  });
  return response.json();
}; 