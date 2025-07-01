import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  User, 
  Shield, 
  CreditCard, 
  MapPin, 
  HelpCircle, 
  Headphones, 
  LogOut
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
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
  // Navigation handlers
  const navigateBack = () => {
    setLocation("/client/dashboard");
  };
  
  const navigateToProfileSettings = () => {
    setLocation("/client/personal-info");
  };
  
  const navigateToPaymentMethods = () => {
    setLocation("/client/payment-methods");
  };
  
  const navigateToAddresses = () => {
    setLocation("/client/addresses");
  };
  
  const navigateToFaq = () => {
    setLocation("/faq");
  };
  
  const navigateToSupport = () => {
    setLocation("/client/support");
  };
  
  // Handle logout
  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };
  
  const confirmLogout = () => {
    try {
      setLogoutDialogOpen(false);
      // Simplificado para usar a implementação do hook
      logoutMutation.mutate(undefined);
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };
  
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
                <div className="w-full h-full bg-primary/10 flex items-center justify-center">
                  <User className="h-12 w-12 text-primary" />
                </div>
              )}
            </div>
            <h1 className="text-xl font-bold ml-32 mb-4 text-white">
              {user?.name || user?.email?.split('@')[0] || "Usuário"}
            </h1>
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
                className="w-full p-4 flex items-center justify-between"
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
                onClick={navigateToPaymentMethods}
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <CreditCard className="h-5 w-5 text-primary" />
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
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <MapPin className="h-5 w-5 text-primary" />
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
                className="w-full p-4 flex items-center justify-between"
              >
                <div className="flex items-center">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                    <HelpCircle className="h-5 w-5 text-primary" />
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
                className="w-full p-4 flex items-center justify-between"
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
          className="w-full border-red-500 text-red-500 hover:bg-red-50"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair da conta
        </Button>
      </div>
      
      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair da conta</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja sair da sua conta?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setLogoutDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? "Saindo..." : "Sair"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}
