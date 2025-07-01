import React, { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient
} from "@tanstack/react-query";
import { InsertUser, User } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { apiJson } from "@/lib/api";

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
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: async ({ queryKey }) => {
      try {
        console.log("Fazendo requisição GET para", queryKey[0], null);
        console.log("Estado de autenticação para requisição " + queryKey[0] + ":", "Não autenticado");
        
        const response = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
          }
        });
        
        console.log("Resposta recebida de " + queryKey[0] + ":", {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries())
        });
        
        if (response.status === 401) {
          console.log("Usuário não autenticado");
          return null;
        }
        
        if (!response.ok) {
          throw new Error("Erro ao buscar dados do usuário");
        }
        
        const userData = await response.json();
        console.log("Dados do usuário obtidos:", userData);
        return userData;
      } catch (error) {
        console.error("Erro ao buscar usuário:", error);
        return null;
      }
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      console.log("Enviando requisição de login para o servidor:", {
        email: credentials.email,
        // senha omitida por segurança
      });
      
      try {
        // Usar a nova função de API
        const data = await apiJson("/api/login", {
          method: "POST",
          body: JSON.stringify(credentials),
        });
        
        console.log("Dados da resposta do login:", data);
        return data;
      } catch (err) {
        console.error("Erro na requisição de login:", err);
        throw err;
      }
    },
    onSuccess: (user: User) => {
      console.log("Login bem-sucedido, atualizando cache:", user);
      queryClient.setQueryData(["/api/user"], user);
      
      // Verificar a sessão para garantir que o login foi bem-sucedido
      refetchUser().then(result => {
        console.log("Verificação após login:", result.data);
        
        const userData = result.data || user;
        console.log("Dados do usuário para redirecionamento:", userData);
        
        // Verificar tipo de usuário para redirecionamento
        const userType = userData.userType || 'client';
        
        console.log("Redirecionando para:", userType);
        
        // Usar setTimeout para dar tempo ao navegador processar os cookies
        setTimeout(() => {
          if (userType === "client") {
            setLocation("/client/dashboard");
          } else if (userType === "provider") {
            setLocation("/provider/dashboard");
          } else if (userType === "admin" || userType === "support") {
            setLocation("/admin/dashboard");
          }
        }, 500);
      });
      
      toast({
        title: "Login realizado com sucesso!",
        description: `Bem-vindo(a) de volta, ${user.name || user.email}!`,
      });
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
      
      // Atualizar cache do usuário
      queryClient.setQueryData(["/api/user"], user);
      
      // Verificar a sessão para garantir que o registro foi bem-sucedido
      refetchUser().then(result => {
        console.log("Verificação após registro:", result.data);
        
        const userData = result.data || user;
        console.log("Dados do usuário para redirecionamento:", userData);
        
        // Verificar tipo de usuário para redirecionamento
        const userType = userData.userType || 'client';
        
        console.log("Redirecionando para:", userType);
        
        // Usar setTimeout para dar tempo ao navegador processar os cookies
        setTimeout(() => {
          if (userType === "client") {
            setLocation("/client/dashboard");
          } else if (userType === "provider") {
            setLocation("/provider/dashboard");
          } else if (userType === "admin" || userType === "support") {
            setLocation("/admin/dashboard");
          }
        }, 1000);
      });
      
      toast({
        title: "Conta criada com sucesso!",
        description: "Bem-vindo(a) ao AgendoAI!",
      });
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
      console.log("Logout bem-sucedido. Redirecionando para página de autenticação.");
      // Limpa o cache de usuário
      queryClient.setQueryData(["/api/user"], null);
      // Invalidar qualquer outra consulta relacionada ao usuário
      queryClient.invalidateQueries({queryKey: ["/api/user"]});
      
      // Redirecionar para página de login
      setLocation("/auth");
      
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error("Erro ao processar logout:", error);
      toast({
        title: "Falha ao sair",
        description: error.message || "Não foi possível realizar o logout. Tente novamente.",
        variant: "destructive",
      });
      
      // Se houver erro, ainda vamos limpar o estado local e redirecionar
      // para garantir que o usuário possa sair mesmo se o servidor falhar
      queryClient.setQueryData(["/api/user"], null);
      setLocation("/auth");
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
