import React, { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { Loader2 } from "lucide-react";
import { useOnboarding } from "@/hooks/use-onboarding";

export default function OnboardingWizardPage() {
  const { user, isLoading: isLoadingAuth } = useAuth();
  const { isOnboardingComplete, isLoading: isLoadingOnboarding } = useOnboarding();
  const [, navigate] = useLocation();

  useEffect(() => {
    // Se o usuário não estiver autenticado, redirecionar para login
    if (!isLoadingAuth && !user) {
      navigate("/auth");
    }
    
    // Se o onboarding já estiver completo, redirecionar para o dashboard apropriado
    if (!isLoadingOnboarding && isOnboardingComplete && user) {
      switch (user.userType) {
        case "provider":
          navigate("/provider/dashboard");
          break;
        case "client":
          navigate("/client/dashboard");
          break;
        case "admin":
          navigate("/admin/dashboard");
          break;
        default:
          navigate("/");
      }
    }
  }, [user, isLoadingAuth, isOnboardingComplete, isLoadingOnboarding, navigate]);

  const handleComplete = () => {
    // Redirecionar para o dashboard apropriado com base no tipo de usuário
    if (user) {
      switch (user.userType) {
        case "provider":
          navigate("/provider/dashboard");
          break;
        case "client":
          navigate("/client/dashboard");
          break;
        case "admin":
          navigate("/admin/dashboard");
          break;
        default:
          navigate("/");
      }
    }
  };

  if (isLoadingAuth || isLoadingOnboarding) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold text-center mb-6">
        Bem-vindo ao AgendoAI
      </h1>
      <p className="text-center text-muted-foreground mb-10 max-w-2xl mx-auto">
        Complete as etapas abaixo para configurar sua conta e começar a usar o sistema.
        Você pode pular algumas etapas e voltar a elas mais tarde.
      </p>
      
      <OnboardingWizard onComplete={handleComplete} />
    </div>
  );
}