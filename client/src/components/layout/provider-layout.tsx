import React from "react";
import { useLocation } from "wouter";
import { Bell, Calendar, Home, Menu, PenSquare, Settings, User, HelpCircle, MessageSquare, ClipboardList, Users, ArrowLeft } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import Navbar from "./navbar";
import ProviderSidebar from "@/components/provider/provider-sidebar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface ProviderLayoutProps {
  children: React.ReactNode;
  title?: string;
  showBackButton?: boolean;
  backButtonAction?: () => void;
}

export default function ProviderLayout({ 
  children, 
  title = "Agenda do Profissional",
  showBackButton = false,
  backButtonAction
}: ProviderLayoutProps) {
  const { user } = useAuth();
  const [location, setLocation] = useLocation();
  const { unreadCount } = useNotifications();

  // Verificar se a rota atual corresponde a algum item de navegação
  const isActive = (path: string) => {
    return location.startsWith(path);
  };

  const handleBackButton = () => {
    if (backButtonAction) {
      backButtonAction();
    } else {
      // Comportamento padrão: voltar no histórico
      window.history.back();
    }
  };

  // Itens de navegação
  const navItems = [
    {
      icon: <Home className="h-5 w-5" />,
      label: "Início",
      href: "/provider/dashboard",
    },
    {
      icon: <Calendar className="h-5 w-5" />,
      label: "Agenda",
      href: "/provider/schedule",
    },
    {
      icon: <ClipboardList className="h-5 w-5" />,
      label: "Agendamentos",
      href: "/provider/appointments",
    },
    {
      icon: <Users className="h-5 w-5" />,
      label: "Clientes",
      href: "/provider/clients",
    },
    /* Meus Serviços removido do menu e adicionado ao dashboard */
    {
      icon: <User className="h-5 w-5" />,
      label: "Meu Perfil",
      href: "/provider/profile",
    },
  ];

  // Auxiliar para obter iniciais do usuário
  const getUserInitials = () => {
    if (!user?.name) return "U";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Menu lateral (visível apenas em telas maiores) */}
      <div className="hidden md:block">
        <ProviderSidebar />
      </div>
      
      <div className="flex flex-col flex-1">
        {/* Header principal (visível apenas em telas menores) */}
        <header className="md:hidden bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 text-white">
          <div className="container mx-auto py-4 px-4 flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="text-white hover:bg-primary/90">
                    <Menu className="h-6 w-6" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left">
                  <SheetHeader>
                    <SheetTitle>Menu do Prestador</SheetTitle>
                    <SheetDescription>
                      Acesse todas as funcionalidades da plataforma
                    </SheetDescription>
                  </SheetHeader>
                  <div className="py-4">
                    <div className="space-y-1">
                      <a
                        onClick={() => setLocation("/provider/dashboard")}
                        className={`flex items-center px-4 py-3 rounded-md text-sm cursor-pointer ${
                          location.startsWith("/provider/dashboard")
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-neutral-700 hover:bg-primary/5"
                        }`}
                      >
                        <span className="mr-3"><Home className="h-5 w-5" /></span>
                        Início
                      </a>
                      <a
                        onClick={() => setLocation("/provider/schedule")}
                        className={`flex items-center px-4 py-3 rounded-md text-sm cursor-pointer ${
                          location.startsWith("/provider/schedule")
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-neutral-700 hover:bg-primary/5"
                        }`}
                      >
                        <span className="mr-3"><Calendar className="h-5 w-5" /></span>
                        Minha Agenda
                      </a>
                      <a
                        onClick={() => setLocation("/provider/profile")}
                        className={`flex items-center px-4 py-3 rounded-md text-sm cursor-pointer ${
                          location.startsWith("/provider/profile")
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-neutral-700 hover:bg-primary/5"
                        }`}
                      >
                        <span className="mr-3"><User className="h-5 w-5" /></span>
                        Meu Perfil
                      </a>
                      <a
                        onClick={() => setLocation("/provider/settings")}
                        className={`flex items-center px-4 py-3 rounded-md text-sm cursor-pointer ${
                          location.startsWith("/provider/settings")
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-neutral-700 hover:bg-primary/5"
                        }`}
                      >
                        <span className="mr-3"><Settings className="h-5 w-5" /></span>
                        Configurações
                      </a>
                      <a
                        onClick={() => setLocation("/provider/help")}
                        className={`flex items-center px-4 py-3 rounded-md text-sm cursor-pointer ${
                          location.startsWith("/provider/help")
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-neutral-700 hover:bg-primary/5"
                        }`}
                      >
                        <span className="mr-3"><HelpCircle className="h-5 w-5" /></span>
                        Ajuda
                      </a>
                      <a
                        onClick={() => setLocation("/provider/support")}
                        className={`flex items-center px-4 py-3 rounded-md text-sm cursor-pointer ${
                          location.startsWith("/provider/support")
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-neutral-700 hover:bg-primary/5"
                        }`}
                      >
                        <span className="mr-3"><MessageSquare className="h-5 w-5" /></span>
                        Suporte
                      </a>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <h1 className="text-lg font-bold">{showBackButton ? title : "AgendoAI"}</h1>
            </div>

            <div className="flex items-center">
              <Button 
                variant="ghost"
                className="relative p-2 text-white hover:bg-primary/90"
                onClick={() => setLocation("/provider/notifications")}
              >
                <Bell className="h-6 w-6" />
                {unreadCount > 0 && (
                  <Badge
                    variant="destructive"
                    className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-[10px]"
                  >
                    {unreadCount}
                  </Badge>
                )}
              </Button>
              <Button
                variant="ghost"
                className="ml-2 p-0 hover:bg-primary/90"
                onClick={() => setLocation("/provider/profile")}
              >
                <Avatar className="h-8 w-8 border-2 border-white">
                  <AvatarImage src={user?.profileImage || ""} />
                  <AvatarFallback className="bg-primary/20 text-primary">
                    {getUserInitials()}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </div>
          </div>
        </header>

        {/* Header secundário com botão de voltar (se necessário) */}
        {showBackButton && (
          <div className="sticky top-0 z-50 border-b bg-background h-14 flex items-center px-4">
            <button
              onClick={handleBackButton}
              className="mr-3 rounded-full p-1 hover:bg-muted"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
          </div>
        )}

        {/* Conteúdo principal */}
        <main className={cn("flex-1 pb-16 md:pb-0", showBackButton && "pt-2")}>
          <div className="container px-4 py-4">
            {children}
          </div>
        </main>

        {/* Navegação inferior (ativa apenas em telas menores) */}
        <div className="md:hidden">
          <Navbar 
            items={navItems} 
            layoutId="providerNav" 
            onNavigate={(href) => setLocation(href)}
          />
        </div>
      </div>
    </div>
  );
}