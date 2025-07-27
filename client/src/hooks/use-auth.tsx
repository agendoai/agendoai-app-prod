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
    retry: false, // Não tentar novamente em caso de erro
    queryFn: async ({ queryKey }) => {
      console.log("useAuth - Executando queryFn para /api/user");
      try {
        console.log("useAuth - Fazendo requisição GET para", queryKey[0]);
        console.log("useAuth - Estado de autenticação:", "Verificando...");
        
        const response = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            "Accept": "application/json",
            "X-Requested-With": "XMLHttpRequest"
          }
        });
        
        console.log("useAuth - Resposta recebida:", {
          status: response.status,
          statusText: response.statusText,
          url: response.url
        });
        
        if (response.status === 401) {
          console.log("useAuth - Usuário não autenticado (401)");
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
      
      // Adicionar um pequeno delay para garantir que o redirecionamento funcione
      setTimeout(() => {
        if (user.userType === "client") {
          setLocation("/client/dashboard");
        } else if (user.userType === "provider") {
          setLocation("/provider/dashboard");
        } else if (user.userType === "admin") {
          setLocation("/admin/dashboard");
        }
      }, 100);
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
      console.log("Login bem-sucedido, limpando cache e atualizando dados:", user);
      
      // Limpar todo o cache para garantir dados frescos
      queryClient.clear();
      queryClient.setQueryData(["/api/user"], user);
      
      // DESABILITADO: Redirecionamento automático do hook
      // O redirecionamento será feito pela página de login
      console.log("Hook useAuth - login bem-sucedido, cache limpo, redirecionamento desabilitado");
      
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
      
      // DESABILITADO: Redirecionamento automático do hook
      // O redirecionamento será feito pela página de login
      console.log("Hook useAuth - registro bem-sucedido, mas redirecionamento desabilitado");
      
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
      
      // Limpar cache imediatamente
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({queryKey: ["/api/user"]});
      queryClient.clear(); // Limpar todo o cache
      
      // Redirecionar para página de login
      setLocation("/auth");
      
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error("Erro ao processar logout:", error);
      
      // Limpar cache e redirecionar mesmo com erro
      queryClient.setQueryData(["/api/user"], null);
      queryClient.invalidateQueries({queryKey: ["/api/user"]});
      queryClient.clear();
      setLocation("/auth");
      
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
