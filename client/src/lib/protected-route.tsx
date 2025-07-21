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

  console.log(`ProtectedRoute [${path}]:`, {
    isLoading,
    user: user ? { 
      id: user.id, 
      email: user.email, 
      userType: user.userType,
      name: user.name 
    } : null,
    requiredUserType: userType,
    isAuthenticated: !!user
  });
  
  // Log adicional para debug
  if (user) {
    console.log(`ProtectedRoute [${path}] - Dados completos do usuário:`, user);
  }

  // Função auxiliar para verificar se o usuário tem permissão para acessar a rota
  const hasAccess = () => {
    if (!userType || !user) {
      console.log(`ProtectedRoute [${path}]: hasAccess = false (no userType or no user)`);
      return false;
    }
    
    // Support users can access admin routes
    if (userType === "admin" && (user.userType === "support" || user.userType === "admin")) {
      console.log(`ProtectedRoute [${path}]: hasAccess = true (admin/support access)`);
      return true;
    }
    
    // Admin users can access support routes
    if (userType === "support" && (user.userType === "support" || user.userType === "admin")) {
      console.log(`ProtectedRoute [${path}]: hasAccess = true (support access)`);
      return true;
    }
    
    const hasAccess = user.userType === userType;
    console.log(`ProtectedRoute [${path}]: hasAccess = ${hasAccess} (userType: ${user.userType} === required: ${userType})`);
    return hasAccess;
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
