import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

// Função para salvar o token
function saveToken(token: string) {
  localStorage.setItem('authToken', token);
  sessionStorage.setItem('authToken', token);
  window.authToken = token;
}

// Função para limpar o token
function clearToken() {
  localStorage.removeItem('authToken');
  sessionStorage.removeItem('authToken');
  window.authToken = undefined;
}

interface User {
  id: number;
  name: string | null;
  email: string;
  role: 'client' | 'provider' | 'admin';
  profileImage: string | null;
  userType: string;
  phone?: string;
  address?: string;
  cpf?: string;
}

export interface AuthContextType {
  user: User | undefined;
  isLoading: boolean;
  isError: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<boolean>;
  refetch: () => Promise<any>;
  logoutMutation: {
    mutate: () => void;
    isPending: boolean;
  };
  loginMutation: {
    mutate: (data: { email: string; password: string }, options?: any) => void;
    isPending: boolean;
  };
  registerMutation: {
    mutate: (data: any, options?: any) => void;
    isPending: boolean;
  };
}

function useAuthProvider(): AuthContextType {
  const queryClient = useQueryClient();

  // Função para obter token de múltiplas fontes
  const getToken = () => {
    let token = localStorage.getItem('authToken');
    if (!token) token = sessionStorage.getItem('authToken');
    if (!token && window.authToken) token = window.authToken as string;
    return token;
  };

  // Busca o usuário logado
  const { 
    data: user, 
    isLoading, 
    isError, 
    refetch 
  } = useQuery<User>({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/user');
        if (!response.ok) {
          throw new Error('Usuário não autenticado');
        }
        return await response.json();
      } catch (error) {
        // Evitar ruído quando não há token (401/403)
        // Apenas propagar o erro para o estado da query
        throw error;
      }
    },
    retry: false,
    // Só buscar usuário se houver token
    enabled: !!getToken()
  });

  // Sincronizar estado quando o token mudar (ex.: após login/logout)
  useEffect(() => {
    // Invalida e refetch quando existir token
    const token = getToken();
    if (token) {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    }
  }, [queryClient]);

  // Função para realizar login
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/login', { email, password });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha no login');
      }
      
      // Extrair e salvar o token da resposta
      const loginData = await response.json();
      if (loginData.token) {
        saveToken(loginData.token);
      }
      
      await refetch();
      return true;
    } catch (error) {
      console.error('Erro no login:', error);
      throw error;
    }
  }, [refetch]);

  // Função para realizar logout
  const logout = useCallback(async () => {
    try {
      const response = await apiRequest('POST', '/api/logout');
      
      if (!response.ok) {
        throw new Error('Falha ao realizar logout');
      }
      
      // Limpar o token
      clearToken();
      
      // Limpar o cache da query
      queryClient.invalidateQueries({ queryKey: ['user'] });
      return true;
    } catch (error) {
      console.error('Erro no logout:', error);
      // Mesmo com erro, limpar o token localmente
      clearToken();
      throw error;
    }
  }, [queryClient]);

  // Cria uma "mutação" para logout
  const logoutMutation = {
    mutate: () => {
      // Limpar token imediatamente
      clearToken();
      logout().catch(err => {
        console.error("Erro ao realizar logout:", err);
      });
    },
    isPending: false
  };

  // Cria uma "mutação" para login
  const loginMutation = {
    mutate: (data: { email: string; password: string }, options?: any) => {
      login(data.email, data.password)
        .then(() => {
          if (options?.onSuccess) {
            options.onSuccess();
          }
        })
        .catch(err => {
          console.error("Erro ao realizar login:", err);
          if (options?.onError) {
            options.onError(err);
          }
        });
    },
    isPending: false
  };

  // Cria uma "mutação" para registro
  const registerMutation = {
    mutate: (data: any, options?: any) => {
      // Simula registro - implementação real deve ser feita
      console.log("Registro simulado com dados:", data);
      if (options?.onError) {
        // options.onError(new Error("Registro ainda não implementado"));
      }
    },
    isPending: false
  };

  return {
    user,
    isLoading,
    isError,
    isAuthenticated: !!user,
    login,
    logout,
    refetch,
    logoutMutation,
    loginMutation,
    registerMutation
  };
}

// Criar contexto de autenticação
const AuthContext = createContext<AuthContextType | null>(null);

// Componente provider que vai envolver a aplicação
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const auth = useAuthProvider();
  return React.createElement(AuthContext.Provider, { value: auth }, children);
};

// Hook para usar o contexto de autenticação
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  // Se não formos usar o provider, retornamos uma implementação padrão
  if (!context) {
    // Esta é uma implementação mínima para permitir que a sidebar funcione
    // mesmo sem o provider configurado
    return {
      user: undefined,
      isLoading: false,
      isError: false,
      isAuthenticated: false,
      login: async () => false,
      logout: async () => {
        console.log('Logout chamado sem provider configurado');
        return true;
      },
      refetch: async () => null,
      logoutMutation: {
        mutate: () => {
          console.log('Logout mutation chamada sem provider configurado');
        },
        isPending: false
      },
      loginMutation: {
        mutate: () => {
          console.log('Login mutation chamada sem provider configurado');
        },
        isPending: false
      },
      registerMutation: {
        mutate: () => {
          console.log('Register mutation chamada sem provider configurado');
        },
        isPending: false
      }
    };
  }
  
  return context;
}