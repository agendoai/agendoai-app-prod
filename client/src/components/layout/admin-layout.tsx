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
  ArrowLeft,
  Settings,
  Package,
  TrendingUp,
  MessageSquare,
  LogOut
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

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
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
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
    setLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    setLogoutDialogOpen(false);
    logoutMutation.mutate();
  };
  
  // Verificar se a rota atual corresponde a algum item de navegação
  const isActive = (path: string) => {
    return location.startsWith(path);
  };
  
  // Menu principal - versão simplificada para mobile
  const mainLinks = [
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
  ];

  // Menu secundário - configurações e relatórios
  const secondaryLinks = [
    { 
      href: '/admin/reports', 
      label: 'Relatórios', 
      icon: <TrendingUp className="h-5 w-5" /> 
    },
    { 
      href: '/admin/categories', 
      label: 'Categorias', 
      icon: <FolderTree className="h-5 w-5" /> 
    },
    { 
      href: '/admin/financial-settings', 
      label: 'Financeiro', 
      icon: <CreditCard className="h-5 w-5" /> 
    },
    { 
      href: '/admin/integrations-settings', 
      label: 'Integrações', 
      icon: <Share2 className="h-5 w-5" /> 
    },
  ];

  // Menu terciário - suporte e documentação
  const supportLinks = [
    { 
      href: '/admin/support', 
      label: 'Suporte', 
      icon: <HelpCircle className="h-5 w-5" /> 
    },
    { 
      href: '/admin/documentation', 
      label: 'Documentação', 
      icon: <BookOpen className="h-5 w-5" /> 
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

  // Componente do menu mobile otimizado
  const MobileMenu = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="text-white hover:bg-primary/90">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0">
        <div className="h-full flex flex-col">
          {/* Header */}
          <SheetHeader className="p-4 border-b bg-gradient-to-r from-primary to-primary/90 text-white">
            <SheetTitle>
              <div className="flex items-center space-x-2">
                <span className="text-xl font-bold">AgendoAI</span>
                <span className="bg-white text-primary text-xs font-bold px-2 py-1 rounded">ADMIN</span>
              </div>
            </SheetTitle>
            <SheetDescription className="text-white/80">
              Painel de Administração
            </SheetDescription>
          </SheetHeader>

          {/* Conteúdo do menu */}
          <div className="flex-1 overflow-y-auto">
            {/* Menu Principal */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Principal</h3>
              <div className="space-y-1">
                {mainLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => setLocation(link.href)}
                    className={`w-full flex items-center px-3 py-3 rounded-lg text-sm transition-colors ${
                      isActive(link.href)
                        ? "bg-primary/10 text-primary font-medium border border-primary/20"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="mr-3">{link.icon}</span>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Menu Secundário */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Configurações</h3>
              <div className="space-y-1">
                {secondaryLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => setLocation(link.href)}
                    className={`w-full flex items-center px-3 py-3 rounded-lg text-sm transition-colors ${
                      isActive(link.href)
                        ? "bg-primary/10 text-primary font-medium border border-primary/20"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="mr-3">{link.icon}</span>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            {/* Suporte */}
            <div className="p-4">
              <h3 className="text-sm font-semibold text-gray-600 mb-3 uppercase tracking-wide">Suporte</h3>
              <div className="space-y-1">
                {supportLinks.map((link) => (
                  <button
                    key={link.href}
                    onClick={() => setLocation(link.href)}
                    className={`w-full flex items-center px-3 py-3 rounded-lg text-sm transition-colors ${
                      isActive(link.href)
                        ? "bg-primary/10 text-primary font-medium border border-primary/20"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span className="mr-3">{link.icon}</span>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Footer com logout */}
          <div className="p-4 border-t bg-gray-50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-3 rounded-lg text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5 mr-3" />
              Sair do Sistema
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header principal */}
      <header className="bg-gradient-to-r from-blue-800 via-blue-900 to-indigo-900 text-white shadow-lg z-50">
        <div className="container mx-auto py-4 px-4 flex justify-between items-center">
          <div className="flex items-center space-x-4">
            <MobileMenu />
            <h1 className="text-lg sm:text-xl font-bold tracking-wide drop-shadow-md select-none">{showBackButton ? title : "Painel Admin"}</h1>
          </div>

          <div className="flex items-center space-x-2">
            <Button 
              variant="ghost"
              className="relative p-2 text-white hover:bg-blue-700/80 focus:bg-blue-700/90"
              onClick={() => setLocation("/admin/notifications")}
            >
              <Bell className="h-6 w-6 text-white" />
              {unreadCount > 0 && (
                <Badge
                  variant="destructive"
                  className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-[10px]"
                >
                  {unreadCount}
                </Badge>
              )}
            </Button>
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
          items={mainLinks.map(link => ({
            icon: link.icon,
            label: link.label,
            href: link.href,
            isActive: (currentPath: string, itemPath: string) => currentPath.startsWith(itemPath)
          }))} 
          layoutId="adminNav" 
          onNavigate={(href) => setLocation(href)}
          className="lg:hidden"
        />
      </div>

      {/* Diálogo de confirmação para sair */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent className="backdrop-blur-sm backdrop:bg-black/20">
          <DialogHeader>
            <DialogTitle>Sair do Sistema</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja sair do painel administrativo?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogoutDialogOpen(false)}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmLogout}>
              Sair
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}