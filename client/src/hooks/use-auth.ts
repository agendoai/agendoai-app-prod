import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface User {
  id: number;
  name: string | null;
  email: string;
  role: 'client' | 'provider' | 'admin';
  profileImage: string | null;
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
  const [isInitialized, setIsInitialized] = useState(false);

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
        console.error('Erro ao buscar usuário:', error);
        throw error;
      }
    },
    retry: false,
    enabled: isInitialized
  });

  // Inicializa o hook quando montado
  useEffect(() => {
    setIsInitialized(true);
  }, []);

  // Função para realizar login
  const login = useCallback(async (email: string, password: string) => {
    try {
      const response = await apiRequest('POST', '/api/login', { email, password });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha no login');
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
      
      // Limpar o cache da query
      queryClient.invalidateQueries({ queryKey: ['user'] });
      return true;
    } catch (error) {
      console.error('Erro no logout:', error);
      throw error;
    }
  }, [queryClient]);

  // Cria uma "mutação" para logout
  const logoutMutation = {
    mutate: () => {
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