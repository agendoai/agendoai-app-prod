import { useState } from "react";
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
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
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
      logoutMutation.mutate(undefined);
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
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
      <ClientLayout showBackButton backButtonAction={navigateBack} title="Perfil">
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
    <ClientLayout showBackButton backButtonAction={navigateBack} title="Perfil">
      {/* User Banner */}
      <div className="h-40 bg-primary relative">
        <div className="pt-20 px-4">
          <div className="relative">
            <div className="absolute -top-14 w-28 h-28 bg-white rounded-2xl overflow-hidden border-4 border-white">
              {user?.profileImage ? (
                <img
                  src={user.profileImage}
                  alt={user.name || "User"}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/112?text=User";
                  }}
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-4xl font-bold shadow-lg mx-auto mb-4">
                  {user?.name?.charAt(0) || "C"}
                </div>
              )}
            </div>
            <h1 className="text-xl font-bold ml-32 mb-4 text-white">
              {user?.name || user?.email?.split('@')[0] || "Usuário"}
            </h1>
            <p className="text-white/80 ml-32 text-sm">
              {user?.email || "Email não informado"}
            </p>
          </div>
        </div>
      </div>
      
      {/* Profile Sections */}
      <div className="p-4 pt-10">
        {/* Profile Options */}
        <Card className="border border-neutral-200 mb-6">
          <CardContent className="p-0">
            <div className="space-y-px">
              <button
                onClick={navigateToProfileSettings}
                className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Informações Pessoais</p>
                    <p className="text-sm text-neutral-500">Edite seus dados pessoais</p>
                  </div>
                </div>
                <Shield className="h-5 w-5 text-neutral-400" />
              </button>
              
              <div className="w-full h-px bg-neutral-100"></div>
              
              <button
                onClick={navigateToAppointments}
                className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center mr-3">
                    <Calendar className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Meus Agendamentos</p>
                    <p className="text-sm text-neutral-500">Visualize e gerencie seus agendamentos</p>
                  </div>
                </div>
                <History className="h-5 w-5 text-neutral-400" />
              </button>
              
              <div className="w-full h-px bg-neutral-100"></div>
              
              <button
                onClick={navigateToPaymentMethods}
                className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mr-3">
                    <CreditCard className="h-5 w-5 text-green-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Métodos de Pagamento</p>
                    <p className="text-sm text-neutral-500">Gerencie seus cartões e métodos de pagamento</p>
                  </div>
                </div>
                <Shield className="h-5 w-5 text-neutral-400" />
              </button>
              
              <div className="w-full h-px bg-neutral-100"></div>
              
              <button
                onClick={navigateToAddresses}
                className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center mr-3">
                    <MapPin className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Endereços</p>
                    <p className="text-sm text-neutral-500">Gerencie seus endereços</p>
                  </div>
                </div>
                <Shield className="h-5 w-5 text-neutral-400" />
              </button>
            </div>
          </CardContent>
        </Card>
        
        {/* Support Options */}
        <Card className="border border-neutral-200 mb-6">
          <CardContent className="p-0">
            <div className="space-y-px">
              <button
                onClick={navigateToFaq}
                className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center mr-3">
                    <HelpCircle className="h-5 w-5 text-purple-600" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium">Perguntas Frequentes</p>
                    <p className="text-sm text-neutral-500">Tire suas dúvidas mais comuns</p>
                  </div>
                </div>
                <Shield className="h-5 w-5 text-neutral-400" />
              </button>
              
              <div className="w-full h-px bg-neutral-100"></div>
              
              <button
                onClick={navigateToSupport}
                className="w-full p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center mr-3">
                    <Headphones className="h-5 w-5 text-red-500" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-red-500">Suporte</p>
                    <p className="text-sm text-neutral-500">Entre em contato com nossa equipe</p>
                  </div>
                </div>
                <Shield className="h-5 w-5 text-neutral-400" />
              </button>
            </div>
          </CardContent>
        </Card>
        
        {/* Logout Button */}
        <Button 
          variant="outline" 
          className="w-full border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {logoutMutation.isPending ? "Saindo..." : "Sair da conta"}
        </Button>
      </div>
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair da conta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja sair da sua conta? Você será redirecionado para a tela de login.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setLogoutDialogOpen(false)}
              disabled={logoutMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmLogout}
              disabled={logoutMutation.isPending}
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
