import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { 
  LayoutDashboard, 
  Users, 
  LogOut, 
  Menu, 
  Settings, 
  FileText,
  Calendar,
  MessageSquare,
  PieChart,
  ShoppingBag,
  Bell,
  DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { toast } = useToast();

  // Verifica se o usuário é admin
  useEffect(() => {
    if (user && user.userType !== "admin") {
      setLocation("/");
    }
  }, [user, setLocation]);

  const handleLogout = async () => {
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

  // Links do menu de navegação
  const navLinks = [
    {
      name: "Dashboard",
      href: "/admin",
      icon: <LayoutDashboard size={20} />,
      active: location === "/admin",
    },
    {
      name: "Usuários",
      href: "/admin/users",
      icon: <Users size={20} />,
      active: location === "/admin/users",
    },
    {
      name: "Categorias",
      href: "/admin/categories",
      icon: <PieChart size={20} />,
      active: location === "/admin/categories",
    },
    {
      name: "Serviços",
      href: "/admin/services",
      icon: <ShoppingBag size={20} />,
      active: location === "/admin/services",
    },
    {
      name: "Agendamentos",
      href: "/admin/appointments",
      icon: <Calendar size={20} />,
      active: location === "/admin/appointments",
    },
    {
      name: "Suporte",
      href: "/admin/support",
      icon: <MessageSquare size={20} />,
      active: location === "/admin/support",
    },
    {
      name: "Relatórios",
      href: "/admin/reports",
      icon: <FileText size={20} />,
      active: location === "/admin/reports",
    },
    {
      name: "Configurações",
      href: "/admin/settings",
      icon: <Settings size={20} />,
      active: location === "/admin/settings",
    },
    {
      name: "Taxas por Categoria",
      href: "/admin/category-fees",
      icon: <DollarSign size={20} />,
      active: location === "/admin/category-fees",
    },
  ];

  if (!user) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  const initials = user.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2)
    : "AD";

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-16 border-b bg-background flex items-center justify-between px-4 lg:px-6">
        <div className="flex items-center">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild className="lg:hidden mr-2">
              <Button variant="ghost" size="icon">
                <Menu size={20} />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0 pt-10">
              <div className="flex flex-col space-y-2 p-4">
                {navLinks.map((link) => (
                  <Link key={link.href} href={link.href}>
                    <a
                      className={cn(
                        "flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium",
                        link.active
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-primary/5"
                      )}
                      onClick={() => setMobileOpen(false)}
                    >
                      {link.icon}
                      <span>{link.name}</span>
                    </a>
                  </Link>
                ))}
                <Button variant="ghost" className="justify-start" onClick={handleLogout}>
                  <LogOut size={20} className="mr-2" />
                  <span>Sair</span>
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/admin">
            <a className="flex items-center gap-2">
              <span className="font-bold text-xl">AgendoAI</span>
              <Badge variant="default">Admin</Badge>
            </a>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.profileImage || ""} alt={user.name || "Avatar"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56 bg-white border border-blue-200 shadow-xl rounded-xl p-2" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="hover:bg-blue-50 rounded-lg cursor-pointer">
                <Link href="/admin/profile">
                  <a className="cursor-pointer w-full flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Perfil</span>
                  </a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="hover:bg-blue-50 rounded-lg cursor-pointer">
                <Link href="/admin/settings">
                  <a className="cursor-pointer w-full flex items-center">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configurações</span>
                  </a>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 hover:bg-red-50 rounded-lg">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar (desktop) */}
        <div className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r">
          <div className="flex flex-col space-y-2 p-4">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                <a
                  className={cn(
                    "flex items-center space-x-2 rounded-lg px-3 py-2 text-sm font-medium",
                    link.active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-primary/5"
                  )}
                >
                  {link.icon}
                  <span>{link.name}</span>
                </a>
              </Link>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto bg-secondary/10 p-4">
          {children}
        </main>
      </div>
    </div>
  );
}