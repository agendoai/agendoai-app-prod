// Configuração para tratamento de erros em produção
export const ERROR_CONFIG = {
  // Configurações de retry
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_DELAY: 1000, // 1 segundo
    MAX_DELAY: 30000, // 30 segundos
    BACKOFF_FACTOR: 2,
  },

  // Configurações de timeout
  TIMEOUT: {
    API_CALL: 10000, // 10 segundos
    MODULE_LOAD: 15000, // 15 segundos
    COMPONENT_RENDER: 5000, // 5 segundos
  },

  // Configurações de fallback
  FALLBACK: {
    ENABLE_AUTO_FALLBACK: true,
    FALLBACK_DELAY: 2000, // 2 segundos
    MAX_FALLBACK_ATTEMPTS: 2,
  },

  // Configurações de monitoramento
  MONITORING: {
    LOG_ERRORS: true,
    SEND_TO_ANALYTICS: process.env.NODE_ENV === 'production',
    CAPTURE_USER_ACTIONS: true,
  },

  // Configurações de cache
  CACHE: {
    CLEAR_ON_ERROR: true,
    CLEAR_ON_MODULE_ERROR: true,
    CLEAR_ON_NETWORK_ERROR: false,
  },

  // Mensagens de erro personalizadas
  MESSAGES: {
    NETWORK_ERROR: 'Problema de conexão detectado. Verifique sua internet.',
    MODULE_ERROR: 'Erro ao carregar recursos da aplicação.',
    TIMEOUT_ERROR: 'A operação demorou mais que o esperado.',
    UNKNOWN_ERROR: 'Ocorreu um erro inesperado.',
    RETRY_SUGGESTION: 'Tente novamente em alguns instantes.',
  },

  // Configurações de degradação
  GRACEFUL_DEGRADATION: {
    ENABLE: true,
    FALLBACK_COMPONENTS: {
      'LoadingSpinner': 'div',
      'ErrorBoundary': 'div',
    },
  },
};

// Função para calcular delay de retry com backoff exponencial
export function calculateRetryDelay(attempt: number): number {
  const delay = ERROR_CONFIG.RETRY.BASE_DELAY * Math.pow(ERROR_CONFIG.RETRY.BACKOFF_FACTOR, attempt);
  return Math.min(delay, ERROR_CONFIG.RETRY.MAX_DELAY);
}

// Função para determinar se um erro deve ser retryado
export function shouldRetryError(error: Error, attempt: number): boolean {
  if (attempt >= ERROR_CONFIG.RETRY.MAX_ATTEMPTS) {
    return false;
  }

  const errorMessage = error.message.toLowerCase();
  
  // Retry para erros de rede
  if (errorMessage.includes('failed to fetch') ||
      errorMessage.includes('network error') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('connection')) {
    return true;
  }

  // Retry para erros do servidor (5xx)
  if (errorMessage.includes('500') ||
      errorMessage.includes('502') ||
      errorMessage.includes('503') ||
      errorMessage.includes('504')) {
    return true;
  }

  // Retry para erros de módulo em produção
  if (process.env.NODE_ENV === 'production' &&
      (errorMessage.includes('mime type') ||
       errorMessage.includes('module script'))) {
    return true;
  }

  return false;
}

// Função para limpar cache baseado no tipo de erro
export function clearCacheForError(error: Error): void {
  if (!ERROR_CONFIG.CACHE.CLEAR_ON_ERROR) {
    return;
  }

  const errorMessage = error.message.toLowerCase();

  if (ERROR_CONFIG.CACHE.CLEAR_ON_MODULE_ERROR &&
      (errorMessage.includes('mime type') ||
       errorMessage.includes('module script') ||
       errorMessage.includes('unexpected token'))) {
    clearModuleCache();
  }

  if (ERROR_CONFIG.CACHE.CLEAR_ON_NETWORK_ERROR &&
      (errorMessage.includes('failed to fetch') ||
       errorMessage.includes('network error'))) {
    clearNetworkCache();
  }
}

// Função para limpar cache de módulos
function clearModuleCache(): void {
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        if (name.includes('module') || name.includes('chunk')) {
          caches.delete(name);
        }
      });
    });
  }

  // Limpar cache do service worker se disponível
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
      registrations.forEach(registration => {
        registration.unregister();
      });
    });
  }
}

// Função para limpar cache de rede
function clearNetworkCache(): void {
  if ('caches' in window) {
    caches.keys().then(names => {
      names.forEach(name => {
        if (name.includes('api') || name.includes('data')) {
          caches.delete(name);
        }
      });
    });
  }
}
