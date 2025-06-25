import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useAuth } from "@/hooks/use-auth";

export default function DashboardRedirectPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    // Se não estiver carregando e o usuário estiver logado, redireciona para o dashboard
    if (!isLoading) {
      if (user) {
        // Usuário autenticado - redireciona para o dashboard
        setLocation("/client/dashboard-new");
      } else {
        // Não autenticado - redireciona para login
        setLocation("/auth");
      }
    }
  }, [isLoading, user, setLocation]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <LoadingSpinner size="lg" />
      <p className="mt-4 text-gray-600">Redirecionando...</p>
    </div>
  );
}