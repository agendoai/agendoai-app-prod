import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { 
  ArrowLeft, 
  BellIcon, 
  MoreVertical, 
  Home, 
  Calendar, 
  User,
  LogOut,
  Settings,
  HelpCircle,
  MessageSquare
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { motion } from "framer-motion";
import { useToast } from "@/hooks/use-toast";

export interface AppHeaderProps {
  title?: string;
  showBackButton?: boolean;
  backUrl?: string;
  showUserInfo?: boolean;
  showNotificationIcon?: boolean;
  showMenuIcon?: boolean;
  userType?: "client" | "provider" | "admin" | "support";
  className?: string;
  onBack?: () => void;
  backButtonAction?: () => void; // Adicionado para resolver erro LSP
  transparent?: boolean;
  children?: React.ReactNode;
}

function AppHeader({ 
  title, 
  showBackButton = false, 
  showUserInfo = true, 
  transparent = false,
  className = "",
  userType,
  showBackButton: showBackButtonProp,
  backUrl,
  onBack,
  backButtonAction,
  showNotificationIcon = true,
  showMenuIcon = true
}: AppHeaderProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { toast } = useToast();
  const { unreadCount } = useNotifications();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  // Determinar userType se não fornecido nas props
  const currentUserType = userType || user?.role || 'client';
  
  const handleBack = () => {
    if (backButtonAction) {
      backButtonAction();
    } else if (onBack) {
      onBack();
    } else if (backUrl) {
      setLocation(backUrl);
    } else {
      window.history.back();
    }
  };
  
  const handleLogout = () => {
    try {
      // Remover token de todas as fontes possíveis
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      if (window.authToken) {
        window.authToken = undefined;
      }
      
      // Limpar também cookies relacionados
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/; domain=' + window.location.hostname + '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Forçar limpeza do cache do navegador para o token
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
      

      
      // Mostrar toast de sucesso
      toast({
        title: "Logout realizado",
        description: "Você saiu da sua conta com sucesso.",
      });
      
      // Forçar recarregamento da página após um pequeno delay
      setTimeout(() => {
        
        window.location.reload();
      }, 500);
      
    } catch (error) {
      
      toast({
        title: "Erro no logout",
        description: "Ocorreu um erro ao sair da conta.",
        variant: "destructive",
      });
    }
  };
  
  // Navegar para a página inicial baseada no tipo de usuário
  const navigateToHome = () => {
    switch (currentUserType) {
      case "client":
        setLocation("/client/dashboard");
        break;
      case "provider":
        setLocation("/provider/dashboard");
        break;
      case "admin":
        setLocation("/admin/dashboard");
        break;
      case "support":
        setLocation("/support/dashboard");
        break;
      default:
        setLocation("/");
    }
  };
  
  // Navegar para a página de agenda baseada no tipo de usuário
  const navigateToCalendar = () => {
    if (currentUserType === "client") {
      setLocation("/client/appointments");
    } else if (currentUserType === "provider") {
      setLocation("/provider/schedule");
    }
  };
  
  // Navegar para a página de perfil baseada no tipo de usuário
  const navigateToProfile = () => {
    if (currentUserType === "client") {
      setLocation("/client/profile");
    } else if (currentUserType === "provider") {
      setLocation("/provider/profile");
    } else if (currentUserType === "admin" || currentUserType === "support") {
      setLocation(`/${currentUserType}/settings`);
    }
  };

  // Navegar para notificações
  const navigateToNotifications = () => {
    setLocation(`/${currentUserType}/notifications`);
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0.8, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`sticky top-0 z-50 ${transparent ? '' : 'border-b bg-[#3EB9AA]'} h-14 flex items-center px-0 ${className}`}
    >
      {showBackButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="mr-3 ml-4 rounded-full p-1 text-white hover:bg-white/20"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      
      {title && (
        <h1 className="text-lg font-semibold flex-1 text-white px-4">{title}</h1>
      )}
      
      {showUserInfo && user && (
        <div className="flex items-center mr-auto px-4">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage src={user.profileImage || ''} alt={user.name || 'User'} />
            <AvatarFallback>
              {user.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col justify-center">
            <span className="font-medium text-sm text-white">{user.name || 'Usuário'}</span>
            <span className="text-xs text-white/80">
              {currentUserType === "client" ? "Cliente" : 
               currentUserType === "provider" ? "Prestador" : 
               currentUserType === "admin" ? "Administrador" : "Suporte"}
            </span>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2 ml-auto pr-4">
        {showNotificationIcon && (
          <Button
            variant="ghost"
            size="icon"
            className="relative p-1 rounded-full text-white hover:bg-white/20"
            onClick={navigateToNotifications}
            aria-label="Notificações"
          >
            <BellIcon className="h-5 w-5" />
            {unreadCount > 0 && (
              <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 min-w-4 flex items-center justify-center p-0 text-[10px]">
                {unreadCount}
              </Badge>
            )}
          </Button>
        )}
        
        {showMenuIcon && (
          <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="p-1 rounded-full text-white hover:bg-white/20"
                aria-label="Menu"
              >
                <MoreVertical className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Navegação</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={navigateToHome}>
                <Home className="h-4 w-4 mr-2" />
                <span>Início</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={navigateToCalendar}>
                <Calendar className="h-4 w-4 mr-2" />
                <span>Minha Agenda</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={navigateToProfile}>
                <User className="h-4 w-4 mr-2" />
                <span>Meu Perfil</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => setLocation(`/${currentUserType}/settings`)}>
                <Settings className="h-4 w-4 mr-2" />
                <span>Configurações</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setLocation(`/${currentUserType}/help`)}>
                <HelpCircle className="h-4 w-4 mr-2" />
                <span>Ajuda</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setLocation(`/${currentUserType}/support`)}>
                <MessageSquare className="h-4 w-4 mr-2" />
                <span>Suporte</span>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem className="text-destructive" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </motion.div>
  );
}

export default AppHeader;