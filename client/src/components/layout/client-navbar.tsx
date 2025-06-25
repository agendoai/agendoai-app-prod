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
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { NotificationsMenu } from "@/components/ui/notifications-menu";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Barra de navegação e cabeçalho para clientes
 * Inclui pesquisa, notificações e controle de usuário
 */
export function ClientNavbar() {
  const { user, logoutMutation } = useAuth();
  const { unreadCount } = useNotifications();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Rotas principais do cliente com detecção de rota ativa aprimorada
  const routes = [
    {
      href: "/client/dashboard",
      label: "Início",
      icon: Home,
      isActive: (path: string) => 
        path === "/client/dashboard" || 
        path === "/client" || 
        path === "/"
    },
    {
      href: "/client/search",
      label: "Buscar",
      icon: Search,
      isActive: (path: string) => path.startsWith("/client/search")
    },
    {
      href: "/client/new-booking-wizard",
      label: "Agendar",
      icon: CalendarClock,
      isActive: (path: string) => path.includes("booking") || path.includes("wizard")
    },
    {
      href: "/client/appointments",
      label: "Agenda",
      icon: CalendarCheck,
      isActive: (path: string) => path.includes("appointments") || path.includes("agendamentos")
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
              <TooltipContent>Menu</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <Link href="/">
            <div className="flex items-center">
              <motion.h1 
                className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80"
                whileHover={{ scale: 1.05 }}
                transition={{ duration: 0.2 }}
              >
                AgendoAI
              </motion.h1>
            </div>
          </Link>
          
          <nav className="ml-8 hidden lg:flex lg:items-center lg:space-x-4">
            {routes.map((route) => (
              <Button
                key={route.href}
                asChild
                variant={isActive(route) ? "default" : "ghost"}
                className={isActive(route) ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}
              >
                <Link href={route.href}>
                  <route.icon className="mr-2 h-4 w-4" />
                  {route.label}
                </Link>
              </Button>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <form className="hidden md:flex relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar serviços..."
              className="pl-8"
            />
          </form>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
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
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
                      >
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                  {showNotifications && (
                    <NotificationsMenu onClose={() => setShowNotifications(false)} />
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent>Notificações</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Avatar className="cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-primary/20 transition-all">
                  <AvatarImage src={user?.profileImage || ""} />
                  <AvatarFallback className="bg-primary text-white uppercase">
                    {user?.name?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </TooltipTrigger>
              <TooltipContent>{user?.name || "Perfil"}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Mobile Navigation Menu */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="left" className="flex flex-col">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Menu</h2>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2 mt-6">
            {routes.map((route) => (
              <Button
                key={route.href}
                asChild
                variant={isActive(route) ? "default" : "ghost"}
                className="justify-start"
                onClick={() => setOpen(false)}
              >
                <Link href={route.href}>
                  <route.icon className="mr-2 h-5 w-5" />
                  {route.label}
                </Link>
              </Button>
            ))}

            <Button
              variant="outline"
              className="justify-start mt-4"
              onClick={handleLogout}
            >
              <LogOut className="mr-2 h-5 w-5" />
              Sair
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </motion.header>
  );
}

export default ClientNavbar;