import { QueryClient } from "@tanstack/react-query";
import { apiCall } from "./api";

// Função para fazer requisições HTTP
export async function apiRequest(method: string, url: string, data?: any): Promise<Response> {
  try {
    const response = await apiCall(url, {
      method,
      body: data ? JSON.stringify(data) : undefined,
    });
    return response;
  } catch (error) {
    console.error(`Erro na requisição ${method} ${url}:`, error);
    throw error;
  }
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        try {
          const res = await apiCall(queryKey[0] as string);
          
          if (res.status === 401) {
            return null;
          }
          
          if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
          }
          
          return await res.json();
        } catch (error) {
          console.error(`Erro na query ${queryKey[0]}:`, error);
          throw error;
        }
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: 0,
      retry: (failureCount, error) => {
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || 
              error.message.includes('Network Error')) {
            return failureCount < 3;
          }
        }
        return false;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      networkMode: 'online',
      gcTime: 5 * 60 * 1000,
    },
    mutations: {
      retry: (failureCount, error) => {
        if (error instanceof Error) {
          if (error.message.includes('Failed to fetch') || 
              error.message.includes('Network Error')) {
            return failureCount < 2;
          }
        }
        return false;
      },
      retryDelay: 1000,
    },
  },
});


