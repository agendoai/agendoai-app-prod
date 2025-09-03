import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Menu, X, CalendarClock, UserCircle, Search, MapPin, Home } from "lucide-react";
import { useNotifications } from "@/hooks/use-notifications";

export function ClientNavbar() {
  const { user, logoutMutation } = useAuth();
  const { unreadCount } = useNotifications();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const { toast } = useToast();
  
  // Obtém as iniciais do nome do usuário
  const getUserInitials = () => {
    if (!user || !user.name) return "U";
    
    const nameParts = user.name.split(" ");
    if (nameParts.length === 1) return nameParts[0][0].toUpperCase();
    
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  };
  
  // Verifica se o link está ativo
  const isActive = (path: string) => {
    return location.startsWith(path);
  };
  
  // Lista de links de navegação
  const navLinks = [
    { path: "/client/dashboard", label: "Início", icon: <Home size={20} /> },
    { path: "/client/search", label: "Buscar", icon: <Search size={20} /> },
    { path: "/client/appointments", label: "Agendamentos", icon: <CalendarClock size={20} /> },
    { path: "/client/provider-map", label: "Mapa", icon: <MapPin size={20} /> },
    { path: "/client/profile", label: "Perfil", icon: <UserCircle size={20} /> },
  ];

  const handleLogout = () => {
    // Remover token diretamente do localStorage e sessionStorage
    localStorage.removeItem('authToken');
    sessionStorage.removeItem('authToken');
    if (window.authToken) {
      window.authToken = undefined;
    }
    
    console.log('🔑 Token removido diretamente do localStorage e sessionStorage');
    
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
  
  return (
    <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
      <div className="container flex items-center justify-between h-14 px-4">
        {/* Logo */}
        <Link href="/client/dashboard" className="flex items-center space-x-2">
          <img 
            src="/logo.svg" 
            alt="AgendoAI" 
            className="h-8 w-auto" 
          />
        </Link>
        
        {/* Avatar e Menu de Navegação (Mobile) */}
        <div className="flex items-center space-x-2">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu size={24} />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <SheetHeader className="p-4 border-b">
                <SheetTitle className="flex items-center justify-between">
                  <span>Menu</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setOpen(false)}
                  >
                    <X size={18} />
                  </Button>
                </SheetTitle>
              </SheetHeader>
              
              {/* Informações do Usuário */}
              {user && (
                <div className="p-4 border-b">
                  <div className="flex items-center space-x-3">
                    <Avatar>
                      <AvatarImage src={user.profileImage} />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name || user.email}</p>
                      <p className="text-xs text-muted-foreground">Cliente</p>
                    </div>
                  </div>
                </div>
              )}
              
              {/* Links de Navegação */}
              <nav className="p-2">
                <ul className="space-y-1">
                  {navLinks.map((link) => (
                    <li key={link.path}>
                      <Link href={link.path}>
                        <a 
                          className={`flex items-center space-x-3 px-3 py-2 rounded-md text-sm ${
                            isActive(link.path) 
                              ? "bg-primary text-primary-foreground" 
                              : "hover:bg-primary/10"
                          }`}
                          onClick={() => setOpen(false)}
                        >
                          {link.icon}
                          <span>{link.label}</span>
                        </a>
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              
              {/* Botão de Logout */}
              <div className="p-4 border-t mt-auto">
                <Button 
                  variant="outline" 
                  className="w-full"
                  onClick={handleLogout}
                >
                  Sair
                </Button>
              </div>
            </SheetContent>
          </Sheet>
          
          {/* Navegação Desktop */}
          <nav className="hidden md:flex items-center space-x-1">
            {navLinks.map((link) => (
              <Link key={link.path} href={link.path}>
                <a
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm ${
                    isActive(link.path) 
                      ? "bg-primary text-primary-foreground" 
                      : "hover:bg-primary/10"
                  }`}
                >
                  {link.icon}
                  <span>{link.label}</span>
                </a>
              </Link>
            ))}
          </nav>
          
          {/* Avatar do Usuário */}
          <Link href="/client/profile">
            <a className="flex items-center space-x-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.profileImage} alt={user?.name || "Usuário"} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
            </a>
          </Link>
        </div>
      </div>
    </header>
  );
}