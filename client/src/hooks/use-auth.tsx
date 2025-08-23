import React, { createContext, ReactNode, useContext } from "react";
import {
  useMutation,
  UseMutationResult
} from "@tanstack/react-query";
import type { InsertUser, User } from "../../../shared/schema";

import { useToast } from "./use-toast";
import { apiJson } from "../lib/api";

type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  error: Error | null;
  loginMutation: UseMutationResult<User, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<User, Error, RegisterData>;
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
  
  console.log("AuthProvider - Inicializando...");
  

  
  // Estado do usuário
  const [user, setUser] = React.useState<User | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<Error | null>(null);
  
  // Verificar se há token no localStorage e buscar dados do usuário
  React.useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token && !user) {
      console.log("Token encontrado, buscando dados do usuário...");
      setIsLoading(true);
      
      // Buscar dados do usuário
      apiJson("/api/user", {
        headers: {
          "Accept": "application/json",
          "Authorization": `Bearer ${token}`,
          "X-Requested-With": "XMLHttpRequest"
        }
      })
      .then((userData) => {
        console.log("Dados do usuário obtidos:", userData);
        setUser(userData);
      })
      .catch((err) => {
        console.error("Erro ao buscar dados do usuário:", err);
        // Se der erro, remover token inválido
        localStorage.removeItem('authToken');
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
    }
  }, [user]);
  


  // Efeito para redirecionar usuário logado que está na página de auth
  React.useEffect(() => {
    console.log("AuthProvider - Verificando redirecionamento:", {
      user: user ? { id: user.id, userType: user.userType } : null,
      currentPath: window.location.pathname,
      isLoading
    });
    
    if (user && !isLoading && window.location.pathname === '/auth') {
      console.log("AuthProvider - Usuário logado detectado na página de auth, redirecionando...");
      
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
      console.log("Enviando requisição de login para o servidor:", {
        email: credentials.email,
        // senha omitida por segurança
      });
      
      try {
        // Usar a nova função de API
        const response = await apiJson("/api/login", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        
        console.log("Dados da resposta do login:", response);
        
        // Salvar token no localStorage
        if (response.token) {
          localStorage.setItem('authToken', response.token);
          console.log('🔑 Token salvo no localStorage');
        }
        
        return response.user;
      } catch (err) {
        console.error("Erro na requisição de login:", err);
        throw err;
      }
    },
    onSuccess: (user: User) => {
      console.log("Login bem-sucedido, atualizando estado:", user);
      
      // Atualizar o estado do usuário diretamente
      setUser(user);
      
      console.log("Hook useAuth - login bem-sucedido, estado atualizado");
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
      console.log("Enviando requisição de registro para o servidor:", {
        email: credentials.email,
        name: credentials.name,
        userType: credentials.userType
        // senha omitida por segurança
      });
      
      try {
        // Usar a nova função de API
        const data = await apiJson("/api/register", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        
        console.log("Dados da resposta do registro:", data);
        return data;
      } catch (err) {
        console.error("Erro na requisição de registro:", err);
        throw err;
      }
    },
    onSuccess: (user: any) => {
      console.log("Registro realizado com sucesso:", user);
      
      // Atualizar o estado do usuário diretamente
      setUser(user);
      
      console.log("Hook useAuth - registro bem-sucedido");
    },
    onError: (error: Error) => {
      console.error("Erro no registro:", error);
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
        console.log("Resposta do logout:", data);
        return data;
      } catch (error) {
        console.error("Erro durante logout:", error);
        throw error;
      }
    },
    onSuccess: () => {
      console.log("Logout bem-sucedido.");
      
      // Remover token do localStorage
      localStorage.removeItem('authToken');
      console.log('🔑 Token removido do localStorage');
      
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
      console.error("Erro ao processar logout:", error);
      
      // Remover token mesmo com erro
      localStorage.removeItem('authToken');
      
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
