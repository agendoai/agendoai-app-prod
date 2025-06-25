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

export default function AppHeader({ 
  title, 
  showBackButton = false,
  backUrl,
  showUserInfo = false,
  showNotificationIcon = false,
  showMenuIcon = true,
  userType = "client",
  className = "",
  onBack,
  backButtonAction,
  transparent = false,
}: AppHeaderProps) {
  const [, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { unreadCount } = useNotifications();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
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
      // Executar a mutação de logout
      logoutMutation.mutate();
      
      // Garantir redirecionamento para página de autenticação após logout
      console.log('Iniciando logout e redirecionando para /auth');
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
    } catch (error) {
      console.error("Erro ao processar logout:", error);
      // Mesmo com erro, tentamos redirecionar para logout
      setTimeout(() => {
        window.location.href = '/auth';
      }, 100);
    }
  };
  
  // Navegar para a página inicial baseada no tipo de usuário
  const navigateToHome = () => {
    switch (userType) {
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
    if (userType === "client") {
      setLocation("/client/appointments");
    } else if (userType === "provider") {
      setLocation("/provider/schedule");
    }
  };
  
  // Navegar para a página de perfil baseada no tipo de usuário
  const navigateToProfile = () => {
    if (userType === "client") {
      setLocation("/client/profile");
    } else if (userType === "provider") {
      setLocation("/provider/profile");
    } else if (userType === "admin" || userType === "support") {
      setLocation(`/${userType}/settings`);
    }
  };

  // Navegar para notificações
  const navigateToNotifications = () => {
    setLocation(`/${userType}/notifications`);
  };
  
  return (
    <motion.div 
      initial={{ opacity: 0.8, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`sticky top-0 z-50 ${transparent ? '' : 'border-b bg-background'} h-14 flex items-center px-4 ${className}`}
    >
      {showBackButton && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="mr-3 rounded-full p-1"
          aria-label="Voltar"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      )}
      
      {title && (
        <h1 className="text-lg font-semibold flex-1">{title}</h1>
      )}
      
      {showUserInfo && user && (
        <div className="flex items-center mr-auto">
          <Avatar className="h-8 w-8 mr-2">
            <AvatarImage src={user.profileImage || ''} alt={user.name || 'User'} />
            <AvatarFallback>
              {user.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col justify-center">
            <span className="font-medium text-sm">{user.name || 'Usuário'}</span>
            <span className="text-xs text-muted-foreground">
              {userType === "client" ? "Cliente" : 
               userType === "provider" ? "Prestador" : 
               userType === "admin" ? "Administrador" : "Suporte"}
            </span>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2 ml-auto">
        {showNotificationIcon && (
          <Button
            variant="ghost"
            size="icon"
            className="relative p-1 rounded-full"
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
                className="p-1 rounded-full"
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
              
              <DropdownMenuItem onClick={() => setLocation(`/${userType}/settings`)}>
                <Settings className="h-4 w-4 mr-2" />
                <span>Configurações</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setLocation(`/${userType}/help`)}>
                <HelpCircle className="h-4 w-4 mr-2" />
                <span>Ajuda</span>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => setLocation(`/${userType}/support`)}>
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