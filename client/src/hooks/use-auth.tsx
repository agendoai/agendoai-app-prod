import React, { createContext, ReactNode, useContext } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
  useQueryClient
} from "@tanstack/react-query";
import type { InsertUser, User } from "@shared/schema";
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
  
  console.log("AuthProvider - Inicializando...");
  
  // Efeito para verificar sessão quando a página carrega
  React.useEffect(() => {
    console.log("AuthProvider - Verificando sessão na inicialização...");
    refetchUser();
  }, []);
  
  const {
    data: user,
    error,
    isLoading,
    refetch: refetchUser
  } = useQuery<User | undefined, Error>({
    queryKey: ["/api/user"],
    enabled: true, // Forçar execução da query
    staleTime: 10 * 60 * 1000, // 10 minutos - dados ficam "frescos" por 10 minutos
    cacheTime: 15 * 60 * 1000, // 15 minutos - cache mantido por 15 minutos
    refetchOnWindowFocus: false, // Não refazer query quando a janela ganhar foco
    refetchOnMount: true, // Refazer query quando o componente montar (importante para /auth)
    retry: 1, // Tentar uma vez em caso de erro (útil para iOS)
    retryDelay: 1000, // Aguardar 1 segundo antes de tentar novamente
    queryFn: async ({ queryKey }) => {
      console.log("useAuth - Executando queryFn para /api/user");
      try {
        console.log("useAuth - Fazendo requisição GET para", queryKey[0]);
        
        // Pegar token do localStorage
        const token = localStorage.getItem('authToken');
        
        if (!token) {
          console.log("useAuth - Nenhum token encontrado");
          return null;
        }
        
        const response = await fetch(queryKey[0] as string, {
          headers: {
            "Accept": "application/json",
            "Authorization": `Bearer ${token}`,
            "X-Requested-With": "XMLHttpRequest"
          }
        });
        
        console.log('🔍 Verificando autenticação:', {
          url: queryKey[0],
          status: response.status,
          hasToken: !!token
        });
        
        console.log("useAuth - Resposta recebida:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        if (response.status === 401) {
          console.log("useAuth - Token inválido (401)");
          localStorage.removeItem('authToken'); // Limpar token inválido
          return null;
        }
        
        if (!response.ok) {
          console.log("useAuth - Erro na resposta:", response.status, response.statusText);
          throw new Error("Erro ao buscar dados do usuário");
        }
        
        const userData = await response.json();
        console.log("useAuth - Dados do usuário obtidos:", {
          id: userData?.id,
          email: userData?.email,
          userType: userData?.userType,
          name: userData?.name
        });
        return userData;
      } catch (error) {
        console.error("useAuth - Erro ao buscar usuário:", error);
        return null;
      }
    },
  });

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
        setLocation("/client/dashboard");
      } else if (user.userType === "provider") {
        setLocation("/provider/dashboard");
      } else if (user.userType === "admin") {
        setLocation("/admin/dashboard");
      }
    }
  }, [user, isLoading, setLocation]);

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
      console.log("Login bem-sucedido, atualizando cache:", user);
      
      // Limpar todo o cache para garantir dados frescos
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], user);
      
      console.log("Hook useAuth - login bem-sucedido, cache limpo");
      
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
      
      console.log("Hook useAuth - registro bem-sucedido");
      
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
      console.log("Logout bem-sucedido.");
      
      // Remover token do localStorage
      localStorage.removeItem('authToken');
      console.log('🔑 Token removido do localStorage');
      
      // Limpar cache imediatamente
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({queryKey: ["/api/user"]});
      queryClient.clear(); // Limpar todo o cache
      
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
      
      // Limpar cache e recarregar página mesmo com erro
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({queryKey: ["/api/user"]});
      queryClient.clear();
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
