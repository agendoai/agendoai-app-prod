import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { 
  Home, 
  Calendar, 
  CalendarDays, 
  Scissors, 
  User, 
  ClipboardList, 
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Bell
} from "lucide-react";
import Navbar, { NavItemType } from "./navbar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/use-notifications";
import { NotificationsMenu } from "@/components/ui/notifications-menu";

/**
 * Barra de navegação para prestadores de serviço
 * Com suporte a navegação mobile e desktop
 */
export default function ProviderNavbar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { unreadCount } = useNotifications();
  const [open, setOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Definição das rotas do prestador com verificação de rota ativa aprimorada
  const navItems: NavItemType[] = [
    {
      icon: <Home className="h-5 w-5" />,
      label: "Início",
      href: "/provider/dashboard",
      isActive: (path) => path.startsWith("/provider/dashboard") || path === "/provider"
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      label: "Agenda",
      href: "/provider/schedule",
      isActive: (path) => path.includes("schedule")
    },
    {
      icon: <ClipboardList className="h-5 w-5" />,
      label: "Agendamentos",
      href: "/provider/appointments",
      isActive: (path) => path.includes("appointments")
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Clientes",
      href: "/provider/clients",
      isActive: (path) => path.includes("clients")
    },
    {
      icon: <Scissors className="h-5 w-5" />,
      label: "Serviços",
      href: "/provider/services",
      isActive: (path) => path.includes("services")
    }
  ];

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={setOpen}>
        <motion.header 
          className="sticky top-0 z-40 bg-white border-b shadow-sm"
          initial={{ y: -60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          <div className="px-4 sm:px-6 lg:px-8 flex h-16 items-center justify-between">
            <div className="flex items-center">
              <SheetTrigger asChild className="lg:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-6 w-6" />
                  <span className="sr-only">Abrir menu</span>
                </Button>
              </SheetTrigger>
            
            <Link href="/provider/dashboard">
              <div className="flex items-center">
                <motion.h1 
                  className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/80"
                  whileHover={{ scale: 1.05 }}
                  transition={{ duration: 0.2 }}
                >
                  AgendoAI Pro
                </motion.h1>
              </div>
            </Link>
            
            <nav className="ml-8 hidden lg:flex lg:items-center lg:space-x-4">
              {navItems.map((item, index) => (
                <Button
                  key={index}
                  asChild
                  variant={item.isActive?.(location) ? "default" : "ghost"}
                  className={item.isActive?.(location) ? "bg-primary/10 text-primary hover:bg-primary/20" : ""}
                >
                  <Link href={item.href}>
                    {item.icon}
                    <span className="ml-2">{item.label}</span>
                  </Link>
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
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

            <Link href="/provider/profile">
              <Avatar className="cursor-pointer hover:ring-2 hover:ring-offset-2 hover:ring-primary/20 transition-all">
                <AvatarImage src={user?.profileImage || ""} />
                <AvatarFallback className="bg-primary text-white uppercase">
                  {user?.name?.charAt(0) || "P"}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </div>
      </motion.header>

        {/* Mobile Navigation Menu */}
        <SheetContent side="left" className="flex flex-col">
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold">Menu do Prestador</h2>
            </div>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex flex-col gap-2 mt-6">
            {navItems.map((item, index) => (
              <Button
                key={index}
                asChild
                variant={item.isActive?.(location) ? "default" : "ghost"}
                className="justify-start"
                onClick={() => setOpen(false)}
              >
                <Link href={item.href}>
                  {item.icon}
                  <span className="ml-2">{item.label}</span>
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

      {/* Menu do Fundo */}
      <Navbar 
        items={navItems} 
        className="md:hidden" 
        layoutId="provider-navbar" 
        showActiveIndicator={true}
      />
    </>
  );
}
