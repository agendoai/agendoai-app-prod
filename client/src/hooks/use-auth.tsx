import React, { createContext, ReactNode, useContext } from "react";
import {
  useMutation,
  UseMutationResult
} from "@tanstack/react-query";
import type { InsertUser, User } from "../../../shared/schema";

import { useToast } from "./use-toast";
import { apiJson } from "../lib/api";
import { queryClient } from "../lib/queryClient";

// Declaração de tipo para window.authToken
declare global {
  interface Window {
    authToken?: string;
  }
}

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
  logout: () => void; // Função conveniente para logout
};

type LoginData = {
  email: string;
  password: string;
};

type RegisterData = {
  email: string;
  password: string;
  name: string;
  userType: "client" | "provider";
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {



  
  const { toast } = useToast();
  
  
  

  
  // Estado do usuário
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  // Verificar se há token e buscar dados do usuário
  React.useEffect(() => {
    // Função para obter token de múltiplas fontes
    const getToken = () => {
      // 1. Tentar localStorage primeiro
      let token = localStorage.getItem('authToken');

      
      // 2. Se não encontrou no localStorage, tentar sessionStorage
      if (!token) {
        token = sessionStorage.getItem('authToken');

      }
      
      // 3. Se não encontrou, tentar variável global
      if (!token && window.authToken) {
        token = window.authToken;

      }
      
      return token;
    };
    
    const token = getToken();
    
    if (token && !user) {

      setIsLoading(true);
      
      // Buscar dados do usuário usando a função apiJson que já adiciona o token automaticamente
      apiJson("/api/user")
        .then((userData) => {

          setUser(userData);
        })
        .catch((err) => {

          // Se der erro, remover token inválido de todas as fontes
          localStorage.removeItem('authToken');
          sessionStorage.removeItem('authToken');
          document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
          setUser(null);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (!token) {
      // Se não há token, garantir que o usuário está null
      setUser(null);
      setIsLoading(false);
    }
  }, []); // Remover dependência [user] para evitar loop infinito
  


  // Efeito para redirecionar usuário logado que está na página de auth
  React.useEffect(() => {

    
    if (user && !isLoading && window.location.pathname === '/auth') {

      
      // Redirecionamento imediato sem delay
      if (user.userType === "client") {
        window.location.href = "/client/dashboard";
      } else if (user.userType === "provider") {
        window.location.href = "/provider/dashboard";
      } else if (user.userType === "admin") {
        window.location.href = "/admin/dashboard";
      }
    }
  }, [user, isLoading]);


  
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {

      
      try {
        // Usar a nova função de API

        const response = await apiJson("/api/login", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        

        
        // Salvar token de forma simples e direta

        
        if (response && response.token) {

          
          // Método 1: localStorage (padrão)
          try {
            localStorage.setItem('authToken', response.token);

          } catch (error) {
            console.error('❌ Erro ao salvar no localStorage:', error);
          }
          
          // Método 2: sessionStorage (fallback)
          try {
            sessionStorage.setItem('authToken', response.token);

          } catch (error) {
            console.error('❌ Erro ao salvar no sessionStorage:', error);
          }
          
          // Método 3: Variável global (último recurso)
          try {
            window.authToken = response.token;

          } catch (error) {
            console.error('❌ Erro ao salvar em variável global:', error);
          }
          
          // Verificar se pelo menos um método funcionou
          const hasLocalStorage = localStorage.getItem('authToken');
          const hasSessionStorage = sessionStorage.getItem('authToken');
          const hasGlobal = window.authToken;
          

        } else {

        }
        
        return response.user;
      } catch (err) {

        throw err;
      }
    },
    onSuccess: (user: User) => {
      // Atualizar o estado do usuário diretamente
      setUser(user);
    },
    onError: (error: Error) => {
      toast({
        title: "Falha no login",
        description: error.message || "Verifique suas credenciais e tente novamente.",
        variant: "destructive",
      });
    },
  });
  


  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterData) => {

      
      try {
        // Usar a nova função de API
        const data = await apiJson("/api/register", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        

        
        // Salvar token no localStorage se existir
        if (data.token) {
          localStorage.setItem('authToken', data.token);

        } else {

        }
        
        return data;
      } catch (err) {

        throw err;
      }
    },
    onSuccess: (user: any) => {
      // Atualizar o estado do usuário diretamente
      setUser(user);
    },
    onError: (error: Error) => {

      toast({
        title: "Falha no cadastro",
        description: error.message || "Não foi possível criar sua conta. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        const data = await apiJson("/api/logout", {
          method: "POST",
        });

        return data;
      } catch (error) {

        throw error;
      }
    },
    onSuccess: () => {
      // Remover token de todas as fontes
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      window.authToken = undefined;
      
      // Limpar estado do usuário
      setUser(null);
      
      // Forçar recarregamento da página após logout
      window.location.reload();
      
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
    },
    onError: (error: Error) => {

      
      // Remover token de todas as fontes mesmo com erro
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      window.authToken = undefined;
      
      // Limpar estado do usuário
      setUser(null);
      
      // Forçar recarregamento da página
      window.location.reload();
      
      toast({
        title: "Falha ao sair",
        description: error.message || "Não foi possível realizar o logout. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        loginMutation,
        logoutMutation,
        registerMutation,
        logout: logoutMutation.mutate, // Adicionar a função logout ao contexto
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
