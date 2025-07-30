import React, { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  User, 
  Shield, 
  CreditCard, 
  MapPin, 
  HelpCircle, 
  Headphones, 
  LogOut,
  Settings,
  Calendar,
  History
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ClientLayout from "@/components/layout/client-layout";

export default function UserProfilePage() {
  const [, setLocation] = useLocation();
  const { user, logoutMutation, isLoading } = useAuth();
  const { toast } = useToast();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
  // Redirecionar se não estiver logado
  React.useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);
  
  // Navigation handlers com tratamento de erro
  const navigateBack = () => {
    setLocation("/client/dashboard");
  };
  
  const navigateToProfileSettings = () => {
    try {
      setLocation("/client/personal-info");
    } catch (error) {
      toast({
        title: "Erro de navegação",
        description: "Não foi possível acessar as configurações pessoais.",
        variant: "destructive",
      });
    }
  };
  
  const navigateToPaymentMethods = () => {
    try {
      setLocation("/client/payment-methods");
    } catch (error) {
      toast({
        title: "Erro de navegação",
        description: "Não foi possível acessar os métodos de pagamento.",
        variant: "destructive",
      });
    }
  };
  
  const navigateToAddresses = () => {
    try {
      setLocation("/client/addresses");
    } catch (error) {
      toast({
        title: "Erro de navegação",
        description: "Não foi possível acessar os endereços.",
        variant: "destructive",
      });
    }
  };

  const navigateToAppointments = () => {
    try {
      setLocation("/client/appointments");
    } catch (error) {
      toast({
        title: "Erro de navegação",
        description: "Não foi possível acessar os agendamentos.",
        variant: "destructive",
      });
    }
  };
  
  const navigateToFaq = () => {
    try {
      setLocation("/faq");
    } catch (error) {
      toast({
        title: "Erro de navegação",
        description: "Não foi possível acessar as perguntas frequentes.",
        variant: "destructive",
      });
    }
  };
  
  const navigateToSupport = () => {
    try {
      setLocation("/client/support");
    } catch (error) {
      toast({
        title: "Erro de navegação",
        description: "Não foi possível acessar o suporte.",
        variant: "destructive",
      });
    }
  };
  
  // Handle logout
  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };
  
  const confirmLogout = () => {
    try {
      setLogoutDialogOpen(false);
      
      // Redirecionar imediatamente para evitar delay
      setLocation("/auth");
      
      // Executar logout em background
      logoutMutation.mutate(undefined, {
        onSuccess: () => {
        },
        onError: (error) => {
          toast({
            title: "Erro no logout",
            description: "Ocorreu um erro ao sair da conta.",
            variant: "destructive",
          });
        }
      });
    } catch (error) {
      toast({
        title: "Erro no logout",
        description: "Ocorreu um erro ao sair da conta.",
        variant: "destructive",
      });
    }
  };

  // Verificar se o usuário está carregado
  if (!user) {
    return (
      <ClientLayout>
        <div className="flex justify-center items-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando perfil...</p>
          </div>
        </div>
      </ClientLayout>
    );
  }
  
  return (
    <ClientLayout>
      {/* User Banner */}
      <div className="h-44 bg-gradient-to-br from-[#3EB9AA] to-[#2A9D8F] relative flex flex-col items-center justify-center">
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 w-28 h-28 bg-white rounded-full overflow-hidden border-4 border-white shadow-lg flex items-center justify-center group">
          {user?.profileImage ? (
            <img
              src={user.profileImage}
              alt={user.name || 'User'}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/src/assets/service-images/perfil de usuario.png';
              }}
            />
          ) : (
            <div className="w-full h-full rounded-full bg-gradient-to-br from-[#3EB9AA] to-[#2A9D8F] flex items-center justify-center text-white text-4xl font-bold">
              {user?.name?.charAt(0) || 'C'}
            </div>
          )}
          <button
            type="button"
            className="absolute bottom-2 right-2 bg-neutral-400 text-white p-2 rounded-full shadow-lg border-2 border-white opacity-60 cursor-not-allowed"
            aria-label="Alterar foto de perfil"
            disabled
            title="Em breve disponível"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6-6m2 2a2.828 2.828 0 11-4-4 2.828 2.828 0 014 4z" /></svg>
          </button>
        </div>
        <div className="pt-20 flex flex-col items-center">
          <h1 className="text-xl font-bold text-white text-center">
            {user?.name || user?.email?.split('@')[0] || 'Usuário'}
          </h1>
          <p className="text-white/80 text-sm text-center">
            {user?.email || 'Email não informado'}
          </p>
        </div>
      </div>
      {/* Profile Sections */}
      <div className="p-4 pt-16 max-w-md mx-auto">
        {/* Profile Options */}
        <Card className="border border-neutral-200 mb-8">
          <CardContent className="p-0 divide-y divide-neutral-100">
            <button
              onClick={navigateToProfileSettings}
              className="w-full p-5 flex items-center gap-4 hover:bg-neutral-50 transition-colors rounded-t-2xl"
              aria-label="Informações Pessoais"
            >
              <span className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </span>
              <span className="flex flex-col items-start">
                <span className="font-medium">Informações Pessoais</span>
                <span className="text-sm text-neutral-500">Edite seus dados pessoais</span>
              </span>
            </button>
            <button
              onClick={navigateToAppointments}
              className="w-full p-5 flex items-center gap-4 hover:bg-neutral-50 transition-colors"
              aria-label="Meus Agendamentos"
            >
              <span className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-blue-600" />
              </span>
              <span className="flex flex-col items-start">
                <span className="font-medium">Meus Agendamentos</span>
                <span className="text-sm text-neutral-500">Visualize e gerencie seus agendamentos</span>
              </span>
            </button>
            <button
              onClick={navigateToPaymentMethods}
              className="w-full p-5 flex items-center gap-4 hover:bg-neutral-50 transition-colors"
              aria-label="Métodos de Pagamento"
            >
              <span className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                <CreditCard className="h-6 w-6 text-green-600" />
              </span>
              <span className="flex flex-col items-start">
                <span className="font-medium">Métodos de Pagamento</span>
                <span className="text-sm text-neutral-500">Gerencie seus cartões e métodos de pagamento</span>
              </span>
            </button>
            <button
              onClick={navigateToAddresses}
              className="w-full p-5 flex items-center gap-4 hover:bg-neutral-50 transition-colors rounded-b-2xl"
              aria-label="Endereços"
            >
              <span className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                <MapPin className="h-6 w-6 text-orange-600" />
              </span>
              <span className="flex flex-col items-start">
                <span className="font-medium">Endereços</span>
                <span className="text-sm text-neutral-500">Gerencie seus endereços</span>
              </span>
            </button>
          </CardContent>
        </Card>
        {/* Support Options */}
        <Card className="border border-neutral-200 mb-8">
          <CardContent className="p-0 divide-y divide-neutral-100">
            <button
              onClick={navigateToFaq}
              className="w-full p-5 flex items-center gap-4 hover:bg-neutral-50 transition-colors rounded-t-2xl"
              aria-label="Perguntas Frequentes"
            >
              <span className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
                <HelpCircle className="h-6 w-6 text-purple-600" />
              </span>
              <span className="flex flex-col items-start">
                <span className="font-medium">Perguntas Frequentes</span>
                <span className="text-sm text-neutral-500">Tire suas dúvidas mais comuns</span>
              </span>
            </button>
            <button
              onClick={navigateToSupport}
              className="w-full p-5 flex items-center gap-4 hover:bg-neutral-50 transition-colors rounded-b-2xl"
              aria-label="Suporte"
            >
              <span className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <Headphones className="h-6 w-6 text-red-500" />
              </span>
              <span className="flex flex-col items-start">
                <span className="font-medium text-red-500">Suporte</span>
                <span className="text-sm text-neutral-500">Entre em contato com nossa equipe</span>
              </span>
            </button>
          </CardContent>
        </Card>
        {/* Logout Button */}
        <Button
          variant="outline"
          className="w-full border-2 border-red-500 text-red-600 font-bold py-4 rounded-2xl text-lg hover:bg-red-50 hover:text-red-700 transition-colors mb-4"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          aria-label="Sair da conta"
        >
          <LogOut className="mr-2 h-5 w-5" />
          {logoutMutation.isPending ? "Saindo..." : "Sair da conta"}
        </Button>
      </div>
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="z-[10001] bg-white border-2 border-gray-200 shadow-2xl max-w-sm mx-auto">
          <DialogHeader className="text-center pb-4">
            <DialogTitle className="text-gray-800 font-bold text-xl">Sair da conta</DialogTitle>
            <DialogDescription className="text-gray-600 text-base mt-2">
              Tem certeza que deseja sair da sua conta? Você será redirecionado para a tela de login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3 pt-4">
            <Button 
              variant="outline" 
              onClick={() => setLogoutDialogOpen(false)}
              disabled={logoutMutation.isPending}
              className="flex-1 border-gray-300 text-gray-700 hover:bg-gray-50 h-12"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmLogout}
              disabled={logoutMutation.isPending}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white h-12"
            >
              {logoutMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saindo...
                </>
              ) : (
                "Sair"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
