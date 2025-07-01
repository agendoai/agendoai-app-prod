import { useLocation } from "wouter";
import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmailVerificationPage() {
  const [, setLocation] = useLocation();
  
  // Navigate back to login page
  const navigateToLogin = () => {
    setLocation("/auth");
  };
  
  return (
    <div className="h-screen bg-white px-6 pt-16 text-center">
      <div className="bg-primary/10 w-24 h-24 rounded-lg flex items-center justify-center mx-auto mb-8">
        <Mail className="h-10 w-10 text-primary" />
      </div>
      
      <h1 className="text-2xl font-bold mb-4">Verifique seu e-mail</h1>
      <p className="text-neutral-600 mb-8">
        Acabamos de enviar um link de recuperação de senha para o seu e-mail.
        Por favor, verifique sua caixa de entrada.
        Caso não encontre, dê uma olhada na pasta de spam ou lixo eletrônico.
      </p>
      
      <Button
        className="w-full mt-8"
        onClick={navigateToLogin}
      >
        Voltar
      </Button>
    </div>
  );
}
