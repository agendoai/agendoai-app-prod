import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { apiCall, apiJson } from "./api";
import { ERROR_CONFIG, shouldRetryError, calculateRetryDelay, clearCacheForError } from "./error-config";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let message = res.statusText;
    try {
      // Tenta analisar o texto como JSON para verificar se há uma mensagem de erro personalizada
      const text = await res.text();
      if (text) {
        try {
          const json = JSON.parse(text);
          if (json.message) {
            message = json.message;
          } else if (json.error) {
            message = json.error;
          } else if (typeof json === 'string') {
            message = json;
          } else {
            message = text;
          }
        } catch (e) {
          // Se não for JSON, use o texto como está
          message = text;
        }
      }
    } catch (e) {
      // Mantém o statusText se houver erro ao ler o corpo da resposta
    }
    throw new Error(message);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  try {
    // Verificar o estado de autenticação localmente antes da requisição
    const userDataFromCache = queryClient.getQueryData(["/api/user"]);
    
    // Usar a nova função de API
    const res = await apiCall(url, {
      method,
      body: data ? JSON.stringify(data) : undefined,
    });

    
    // Para requisições 401, tentar refrescar o estado de autenticação
    if (res.status === 401 && url !== "/api/login" && url !== "/api/logout") {
    }
    
    // Clonar resposta antes de consumir o corpo
    const clonedRes = res.clone();
    
    if (!res.ok) {
      // Tentar extrair corpo da resposta para detalhes de erro
      try {
        const errorResponse = await res.clone().json();
        console.error(`Detalhes do erro da API ${url}:`, errorResponse);
      } catch (jsonError) {
        try {
          const errorText = await res.clone().text();
          console.error(`Texto do erro da API ${url}:`, errorText);
        } catch (textError) {
          console.error(`Não foi possível extrair detalhes do erro`);
        }
      }
    }
    
    try {
      await throwIfResNotOk(res);
      return clonedRes;
    } catch (error) {
      console.error(`Erro na requisição para ${url}:`, error);
      throw error;
    }
  } catch (error) {
    console.error(`Erro na conexão com ${url}:`, error);
    throw error;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    
    try {
      // Usar a nova função de API
      const res = await apiCall(queryKey[0] as string);

      
      if (unauthorizedBehavior === "returnNull" && res.status === 401) {
        return null;
      }

      try {
        await throwIfResNotOk(res);
        return await res.json();
      } catch (error) {
        console.error(`Erro processando requisição para ${queryKey[0]}:`, error);
        throw error;
      }
    } catch (error) {
      console.error(`Erro na conexão com ${queryKey[0]}:`, error);
      throw error;
    }
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "returnNull" }), // Retornar null em vez de throw para 401
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: ERROR_CONFIG.TIMEOUT.API_CALL, // Timeout para queries
      retry: (failureCount, error) => {
        // Usar configuração centralizada para retry
        return shouldRetryError(error, failureCount);
      },
      retryDelay: (attemptIndex) => calculateRetryDelay(attemptIndex),
      networkMode: 'online', // Só tentar quando online
      gcTime: 5 * 60 * 1000, // 5 minutos de cache
    },
    mutations: {
      retry: (failureCount, error) => {
        // Retry para mutações apenas em casos específicos
        if (error instanceof Error) {
          // Retry para erros de rede em mutações
          if (error.message.includes('Failed to fetch') || 
              error.message.includes('Network Error')) {
            return failureCount < ERROR_CONFIG.RETRY.MAX_ATTEMPTS;
          }
        }
        return false;
      },
      retryDelay: ERROR_CONFIG.RETRY.BASE_DELAY,
    },
  },
});

// Interceptor global para limpar cache em caso de erro
queryClient.setDefaultOptions({
  queries: {
    onError: (error) => {
      if (error instanceof Error) {
        clearCacheForError(error);
      }
    },
  },
  mutations: {
    onError: (error) => {
      if (error instanceof Error) {
        clearCacheForError(error);
      }
    },
  },
});
