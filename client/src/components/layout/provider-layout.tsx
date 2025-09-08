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
    <div className="flex min-h-screen w-full full-width-screen bg-background">
      
      <div className="flex flex-col flex-1 w-full">
        
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
        <main className={cn("w-full px-2 py-2 sm:px-4 sm:py-4 md:px-6 md:py-6 lg:px-8 lg:py-8 xl:px-12 xl:py-12", showBackButton && "pt-2")}> 
          <div className="w-full overflow-x-hidden">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}