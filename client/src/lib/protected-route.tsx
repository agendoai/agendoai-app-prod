import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";
import { User } from "@shared/schema.ts";

interface ProtectedRouteProps {
  path: string;
  component: () => React.JSX.Element;
  userType?: "client" | "provider" | "admin" | "support";
}

export function ProtectedRoute({
  path,
  component: Component,
  userType,
}: ProtectedRouteProps) {
  const { user, isLoading } = useAuth();

  // Função auxiliar para verificar se o usuário tem permissão para acessar a rota
  const hasAccess = () => {
    if (!userType || !user) return false;
    
    // Support users can access admin routes
    if (userType === "admin" && (user.userType === "support" || user.userType === "admin")) {
      return true;
    }
    
    // Admin users can access support routes
    if (userType === "support" && (user.userType === "support" || user.userType === "admin")) {
      return true;
    }
    
    return user.userType === userType;
  };

  return (
    <Route path={path}>
      {isLoading ? (
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : user ? (
        // Se userType é fornecido, verifica se o usuário tem o tipo correto
        userType && !hasAccess() ? (
          // Redirecionar para o dashboard apropriado baseado no tipo do usuário
          <Redirect to={
            user.userType === "client" 
              ? "/client/dashboard" 
              : user.userType === "provider" 
                ? "/provider/dashboard" 
                : user.userType === "admin"
                  ? "/admin/dashboard"
                  : user.userType === "support"
                    ? "/support/dashboard"
                  : "/auth"
          } />
        ) : (
          // Se o usuário está autenticado e tem o tipo correto, renderiza o componente
          <Component />
        )
      ) : (
        // Se o usuário não está autenticado, redireciona para a página de login
        <Redirect to="/auth" />
      )}
    </Route>
  );
}
