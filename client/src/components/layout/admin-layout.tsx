import React, { ReactNode, useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useNotifications } from '@/hooks/use-notifications';
import Navbar from './navbar';
import {
  BarChart2,
  Users,
  Calendar,
  CreditCard,
  FolderTree,
  Menu,
  HelpCircle,
  File,
  User,
  BookOpen,
  FileCog,
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Share2,
  Bell,
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { UserDropdown } from "@/components/ui/user-dropdown";

type AdminLayoutProps = {
  children: ReactNode;
  title?: string;
  showBackButton?: boolean;
  backButtonAction?: () => void;
};

export default function AdminLayout({ 
  children, 
  title = "Administração",
  showBackButton = false,
  backButtonAction
}: AdminLayoutProps) {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { unreadCount } = useNotifications();
  const [docMenuOpen, setDocMenuOpen] = useState(false);
  
  // Abrir automaticamente o submenu quando a rota for de documentação
  useEffect(() => {
    if (
      location.startsWith('/admin/documentation') || 
      location.startsWith('/admin/project-documentation') || 
      location.startsWith('/admin/testing-documentation')
    ) {
      setDocMenuOpen(true);
    }
  }, [location]);
  
  const handleBackButton = () => {
    if (backButtonAction) {
      backButtonAction();
    } else {
      // Comportamento padrão: voltar no histórico
      window.history.back();
    }
  };
  
  const handleLogout = () => {
    // Chamamos logoutMutation para realizar o logout no servidor
    logoutMutation.mutate();
    // O redirecionamento para a página de autenticação será feito automaticamente
    // pelo manipulador onSuccess da mutação em useAuth
  };
  
  // Verificar se a rota atual corresponde a algum item de navegação
  const isActive = (path: string) => {
    return location.startsWith(path);
  };
  
  // Menu principal
  const links = [
    { 
      href: '/admin/dashboard', 
      label: 'Dashboard', 
      icon: <BarChart2 className="h-5 w-5" /> 
    },
    { 
      href: '/admin/users', 
      label: 'Usuários', 
      icon: <User className="h-5 w-5" /> 
    },
    { 
      href: '/admin/providers', 
      label: 'Prestadores', 
      icon: <Users className="h-5 w-5" /> 
    },
    { 
      href: '/admin/appointments', 
      label: 'Agendamentos', 
      icon: <Calendar className="h-5 w-5" /> 
    },
    { 
      href: '/admin/reports', 
      label: 'Relatórios', 
      icon: <BarChart2 className="h-5 w-5" /> 
    },
    { 
      href: '/admin/financial-settings', 
      label: 'Configurações Financeiras', 
      icon: <CreditCard className="h-5 w-5" /> 
    },
    { 
      href: '/admin/categories', 
      label: 'Categorias', 
      icon: <FolderTree className="h-5 w-5" /> 
    },
    { 
      href: '/admin/integrations-settings', 
      label: 'Integrações', 
      icon: <Share2 className="h-5 w-5" /> 
    },
    { 
      href: '/admin/support', 
      label: 'Suporte', 
      icon: <HelpCircle className="h-5 w-5" /> 
    },
  ];
  
  // Submenu de documentação
  const docLinks = [
    { 
      href: '/admin/documentation', 
      label: 'Guia do Sistema', 
      icon: <BookOpen className="h-5 w-5" /> 
    },
    { 
      href: '/admin/project-documentation', 
      label: 'Documentação do Projeto', 
      icon: <File className="h-5 w-5" /> 
    },
    { 
      href: '/admin/testing-documentation', 
      label: 'Testes e Logs', 
      icon: <FileCog className="h-5 w-5" /> 
    },
  ];

  // Auxiliar para obter iniciais do usuário
  const getUserInitials = () => {
    if (!user?.name) return "A";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header principal */}
      <header className="bg-primary text-white">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="text-white hover:bg-primary/90">
                  <Menu className="h-6 w-6" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>
                    <div className="flex items-center space-x-2">
                      <span className="text-xl font-bold text-primary">AgendoAI</span>
                      <span className="bg-primary text-xs font-bold text-primary-foreground px-1 py-0.5 rounded">ADMIN</span>
                    </div>
                  </SheetTitle>
                  <SheetDescription>
                    Painel de Administração
                  </SheetDescription>
                </SheetHeader>
                <div className="py-4">
                  <div className="space-y-1">
                    {links.map((link) => (
                      <a
                        key={link.href}
                        onClick={() => setLocation(link.href)}
                        className={`flex items-center px-4 py-3 rounded-md text-sm cursor-pointer ${
                          location.startsWith(link.href)
                            ? "bg-primary/10 text-primary font-medium"
                            : "text-neutral-700 hover:bg-primary/5"
                        }`}
                      >
                        <span className="mr-3">{link.icon}</span>
                        {link.label}
                      </a>
                    ))}
                    
                    {/* Submenu Documentação */}
                    <div>
                      <div
                        onClick={() => setDocMenuOpen(!docMenuOpen)}
                        className="flex items-center justify-between px-4 py-3 rounded-md text-sm cursor-pointer text-neutral-700 hover:bg-primary/5"
                      >
                        <div className="flex items-center">
                          <FolderOpen className="h-5 w-5 mr-3" />
                          <span>Documentação</span>
                        </div>
                        {docMenuOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </div>
                      
                      {docMenuOpen && (
                        <div className="pl-4 space-y-1">
                          {docLinks.map((link) => (
                            <a
                              key={link.href}
                              onClick={() => setLocation(link.href)}
                              className={`flex items-center px-4 py-3 rounded-md text-sm cursor-pointer ${
                                location.startsWith(link.href)
                                  ? "bg-primary/10 text-primary font-medium"
                                  : "text-neutral-700 hover:bg-primary/5"
                              }`}
                            >
                              <span className="mr-3">{link.icon}</span>
                              {link.label}
                            </a>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-bold">{showBackButton ? title : "Painel Admin"}</h1>
          </div>

          <div className="flex items-center">
            <Button 
              variant="ghost"
              className="relative p-2 text-white hover:bg-primary/90"
              onClick={() => setLocation("/admin/notifications")}
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
            {/* Usando o novo componente UserDropdown para garantir redirecionamento após logout */}
            <UserDropdown userType="admin" />
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
      <main className={cn("flex-1", showBackButton && "pt-2")}>
        {children}
      </main>

      {/* Barra inferior para navegação rápida em dispositivos móveis */}
      <div className="lg:hidden">
        <Navbar 
          items={links} 
          layoutId="adminNav" 
          onNavigate={(href) => setLocation(href)}
          className="lg:hidden"
        />
      </div>
    </div>
  );
}