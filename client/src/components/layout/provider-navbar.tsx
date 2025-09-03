import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { motion } from "framer-motion";
import {
  Menu,
  X,
  Home,
  Calendar,
  User,
  LogOut,
  Bell,
  Search,
  CalendarClock,
  CalendarCheck,
  Settings,
  Users,
  Clock,
  Wallet,
  BarChart,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { NotificationsMenu } from "@/components/ui/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

/**
 * Barra de navegação e cabeçalho para prestadores de serviço
 * Inclui pesquisa, notificações e controle de usuário
 */
export function ProviderNavbar() {
  const { user, logoutMutation } = useAuth();
  const { unreadCount } = useNotifications();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { toast } = useToast();

  const handleLogout = () => {
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
      console.log('🔄 Recarregando página...');
      window.location.reload();
    }, 500);
  };

  // Rotas principais do prestador com detecção de rota ativa aprimorada
  const routes = [
    {
      href: "/provider/dashboard",
      label: "Início",
      icon: Home,
      isActive: (path: string) => 
        path === "/provider/dashboard" || 
        path === "/provider" || 
        path === "/"
    },
    {
      href: "/provider/schedule",
      label: "Agenda",
      icon: Calendar,
      isActive: (path: string) => path.includes("schedule") || path.includes("agenda")
    },
    {
      href: "/provider/appointments",
      label: "Agendamentos",
      icon: CalendarCheck,
      isActive: (path: string) => path.includes("appointments") || path.includes("agendamentos")
    },
    {
      href: "/provider/clients",
      label: "Clientes",
      icon: Users,
      isActive: (path: string) => path.includes("clients") || path.includes("clientes")
    },
    {
      href: "/provider/services",
      label: "Serviços",
      icon: Clock,
      isActive: (path: string) => path.includes("services") || path.includes("servicos")
    },
    {
      href: "/provider/finances",
      label: "Finanças",
      icon: Wallet,
      isActive: (path: string) => path.includes("finances") || path.includes("financas")
    },
    {
      href: "/provider/reports",
      label: "Relatórios",
      icon: BarChart,
      isActive: (path: string) => path.includes("reports") || path.includes("relatorios")
    },
    {
      href: "/profile",
      label: "Perfil",
      icon: User,
      isActive: (path: string) => path.includes("profile") || path.includes("perfil") || path.includes("settings")
    },
  ];

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  // Verifica se a rota atual está ativa
  const isActive = (route: typeof routes[0]) => {
    if (route.isActive) {
      return route.isActive(location);
    }
    return location === route.href;
  };

  return (
    <motion.header 
      className="sticky top-0 z-40 bg-white border-b shadow-sm"
      initial={{ y: -60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
        <div className="flex items-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <SheetTrigger asChild className="lg:hidden">
                  <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
                    <Menu className="h-6 w-6" />
                    <span className="sr-only">Abrir menu</span>
                  </Button>
                </SheetTrigger>
              </TooltipTrigger>
              <TooltipContent>
                <p>Menu</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Link href="/provider/dashboard" className="flex items-center space-x-2 ml-4">
            <img src="/logo.svg" alt="AgendoAI" className="h-8 w-auto" />
            <span className="hidden sm:inline-block font-semibold text-lg">AgendoAI</span>
          </Link>
        </div>

        {/* Navegação desktop */}
        <nav className="hidden lg:flex items-center space-x-1">
          {routes.map((route) => {
            const active = isActive(route);
            return (
              <TooltipProvider key={route.href}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href={route.href}>
                      <Button
                        variant={active ? "default" : "ghost"}
                        size="sm"
                        className="flex items-center gap-2"
                      >
                        <route.icon className="h-4 w-4" />
                        <span className="hidden xl:inline">{route.label}</span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{route.label}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            );
          })}
        </nav>

        {/* Ações do usuário */}
        <div className="flex items-center space-x-2">
          {/* Notificações */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleNotifications}
                  className="relative"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs"
                    >
                      {unreadCount}
                    </Badge>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Notificações</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Avatar do usuário */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href="/profile">
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <Avatar className="h-8 w-8">
                      {user?.profileImage ? (
                        <AvatarImage src={user.profileImage} alt={user.name || "Usuário"} />
                      ) : (
                        <AvatarFallback className="bg-primary text-white">
                          {user?.name ? user.name.charAt(0).toUpperCase() : <User className="h-4 w-4" />}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent>
                <p>Perfil</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Menu mobile */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="w-80">
          <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-6">
              <Link href="/provider/dashboard" className="flex items-center space-x-2">
                <img src="/logo.svg" alt="AgendoAI" className="h-8 w-auto" />
                <span className="font-semibold text-lg">AgendoAI</span>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setOpen(false)}>
                <X className="h-6 w-6" />
              </Button>
            </div>

            <nav className="flex-1 space-y-2">
              {routes.map((route) => {
                const active = isActive(route);
                return (
                  <Link key={route.href} href={route.href} onClick={() => setOpen(false)}>
                    <Button
                      variant={active ? "default" : "ghost"}
                      className="w-full justify-start"
                    >
                      <route.icon className="h-4 w-4 mr-3" />
                      {route.label}
                    </Button>
                  </Link>
                );
              })}
            </nav>

            <div className="border-t pt-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-3" />
                Sair
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Menu de notificações */}
      {showNotifications && (
        <NotificationsMenu onClose={() => setShowNotifications(false)} />
      )}
    </motion.header>
  );
}

export default ProviderNavbar;
