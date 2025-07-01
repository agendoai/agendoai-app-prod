import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { BackButton } from "@/components/ui/back-button";
import { Loader2 } from "lucide-react";

export default function SplashPage() {
  const [, setLocation] = useLocation();
  const { user, isLoading } = useAuth();
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [appReady, setAppReady] = useState(false);

  // Efeito para simular o carregamento progressivo e pré-carregar recursos importantes
  useEffect(() => {
    // Inicia em 0% e progride até 70% durante a carga inicial
    const initialLoadInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 70) {
          clearInterval(initialLoadInterval);
          return 70;
        }
        return prev + 5;
      });
    }, 100);

    // Pré-carregar imagens e recursos essenciais
    const preloadResources = async () => {
      // Lista de recursos para pré-carregar (URLs de imagens, etc.)
      const resources = [
        '/icons/logo-icon.png',
        '/images/background.jpg'
      ];

      // Função para pré-carregar uma imagem
      const preloadImage = (src: string) => {
        return new Promise((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = src;
        });
      };

      // Pré-carrega todas as imagens em paralelo
      await Promise.all(resources.map(src => preloadImage(src)));

      // Marca como pronto e avança para 100%
      setLoadingProgress(100);
      setAppReady(true);
    };

    // Inicia o pré-carregamento de recursos
    preloadResources();

    return () => {
      clearInterval(initialLoadInterval);
    };
  }, []);

  // Redireciona após o carregamento estar completo e o usuário autenticado
  useEffect(() => {
    if (appReady && !isLoading) {
      const timer = setTimeout(() => {
        // Se o usuário estiver logado, redireciona para o dashboard apropriado
        if (user) {
          if (user.userType === "admin") {
            setLocation("/admin/dashboard");
          } else if (user.userType === "provider") {
            setLocation("/provider/dashboard");
          } else {
            setLocation("/client/dashboard");
          }
        } else {
          // Caso contrário, redireciona para a tela de onboarding
          setLocation("/welcome");
        }
      }, 500); // Pequeno atraso para garantir uma transição suave

      return () => clearTimeout(timer);
    }
  }, [appReady, isLoading, user, setLocation]);

  return (
    <div className="h-screen bg-gradient-to-b from-primary to-primary-dark flex flex-col items-center justify-center px-6">
      <div className="w-72 h-72 bg-white rounded-xl shadow-lg flex flex-col items-center justify-center mb-auto mt-auto animate-fade-in">
        <div className="flex-1 flex items-center justify-center py-6">
          <img
            src="/AgendoAilogo.png"
            alt="AgendoAI Logo"
            className="w-56 h-56 object-contain"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/96?text=AgendoAI";
            }}
          />
        </div>

        <div className="w-full px-6 mb-8">
          <div className="h-2 w-full bg-gray-200 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
          <div className="flex items-center justify-center mt-3">
            <Loader2 className={`w-4 h-4 mr-2 ${appReady ? 'hidden' : 'animate-spin'} text-primary`} />
            <span className="text-xs text-gray-500">
              {appReady ? 'Pronto!' : 'Carregando recursos...'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
