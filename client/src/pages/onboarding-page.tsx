import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function OnboardingPage() {
  const [, setLocation] = useLocation();

  const handleCreateAccount = () => {
    setLocation("/auth?register=true");
  };

  const handleLogin = () => {
    setLocation("/auth");
  };

  return (
    <div className="h-screen bg-primary flex flex-col">
      <div className="h-2/3 bg-primary relative">
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <div className="text-center">
            <h1 className="text-white text-3xl font-bold">Agendo AI</h1>
            <p className="text-white text-sm mt-2">Agende serviços rápido e fácil</p>
          </div>
        </div>
      </div>
      <div className="h-1/3 bg-white rounded-t-3xl px-6 pt-8 pb-6 flex flex-col">
        <h1 className="text-2xl font-bold text-neutral-800 mb-2">Seu tempo, sua escolha</h1>
        <p className="text-neutral-600 mb-6">
          Agendo ai: Conectamos você aos melhores serviços, quando e onde precisar.
        </p>
        <div className="flex space-x-3 mt-auto">
          <Button
            variant="outline"
            className="flex-1 border-primary text-primary"
            onClick={handleCreateAccount}
          >
            Criar conta
          </Button>
          <Button className="flex-1" onClick={handleLogin}>
            Entrar
          </Button>
        </div>
      </div>
    </div>
  );
}
