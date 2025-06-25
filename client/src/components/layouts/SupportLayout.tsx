import React, { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { 
  MessageSquare, 
  Users, 
  LogOut, 
  Menu, 
  X, 
  BarChart,
  Clock,
  ChevronDown,
  Bell
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
import { useQuery } from "@tanstack/react-query";

export default function SupportLayout({ children }: { children: React.ReactNode }) {
  const { user, logoutMutation } = useAuth();
  const [location, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  
  // Consulta para buscar mensagens de suporte pendentes
  const { data: pendingMessages } = useQuery({
    queryKey: ['/api/admin/support/pending'],
    refetchInterval: 30000, // Atualizar a cada 30 segundos
  });

  const pendingCount = Array.isArray(pendingMessages) ? pendingMessages.length : 0;
  
  // Verifica se o usuário é do tipo suporte
  useEffect(() => {
    if (user) {
      if (user.userType !== "support") {
        // Se não for usuário de suporte, redireciona
        navigate("/");
      }
    }
  }, [user, navigate]);

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    navigate("/auth");
  };

  // Links do menu de navegação
  const navLinks = [
    {
      name: "Central de Suporte",
      href: "/support/dashboard",
      icon: <MessageSquare size={20} />,
      active: location === "/support/dashboard" || location === "/support",
    },
    {
      name: "Mensagens Pendentes",
      href: "/support/pending",
      icon: <Clock size={20} />,
      active: location === "/support/pending",
      badge: pendingCount,
    },
    {
      name: "Histórico de Mensagens",
      href: "/support/history",
      icon: <BarChart size={20} />,
      active: location === "/support/history",
    },
    {
      name: "Clientes",
      href: "/support/clients",
      icon: <Users size={20} />,
      active: location === "/support/clients",
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
    : "SU";

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
                      {link.badge ? (
                        <Badge variant="destructive" className="ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0">
                          {link.badge}
                        </Badge>
                      ) : null}
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
          <Link href="/">
            <a className="flex items-center gap-2">
              <span className="font-bold text-xl">AgendoAI</span>
              <Badge variant="secondary">Suporte</Badge>
            </a>
          </Link>
        </div>
        
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell size={20} />
                {pendingCount > 0 && (
                  <Badge 
                    variant="destructive" 
                    className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-[10px]"
                  >
                    {pendingCount}
                  </Badge>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notificações</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {pendingCount > 0 ? (
                <>
                  <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/support/pending")}>
                    Você tem {pendingCount} {pendingCount === 1 ? "mensagem" : "mensagens"} pendente{pendingCount === 1 ? "" : "s"}
                  </DropdownMenuItem>
                </>
              ) : (
                <div className="px-2 py-4 text-center text-muted-foreground">
                  Nenhuma notificação no momento
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={user.profileImage || ""} alt={user.name || "Avatar"} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{user.name}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
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
                  {link.badge ? (
                    <Badge variant="destructive" className="ml-auto flex h-5 w-5 items-center justify-center rounded-full p-0">
                      {link.badge}
                    </Badge>
                  ) : null}
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