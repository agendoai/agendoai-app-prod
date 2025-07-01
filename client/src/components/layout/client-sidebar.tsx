import { ReactNode } from "react";
import { useLocation } from "wouter";
import { 
  Home, 
  Search, 
  CalendarClock, 
  User,
  Settings,
  HelpCircle,
  Bell,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

type SidebarItemProps = {
  icon: ReactNode;
  label: string;
  path: string;
  isActive: boolean;
  onClick: () => void;
};

function SidebarItem({ icon, label, isActive, onClick }: SidebarItemProps) {
  return (
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-3 font-normal h-10 px-4",
        isActive ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground"
      )}
      onClick={onClick}
    >
      <span className={cn("h-5 w-5", isActive ? "text-primary" : "text-muted-foreground")}>
        {icon}
      </span>
      <span>{label}</span>
    </Button>
  );
}

export function ClientSidebar() {
  const [location, setLocation] = useLocation();
  const auth = useAuth();
  const logout = auth?.logout;
  const { toast } = useToast();
  
  // Verifica se a rota atual está ativa
  const isActive = (path: string) => {
    return location.startsWith(path);
  };

  const handleLogout = async () => {
    if (logout) {
      await logout();
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso",
      });
      setLocation("/login");
    } else {
      // Fallback caso logout não esteja disponível
      toast({
        title: "Função não disponível",
        description: "Não foi possível realizar o logout",
        variant: "destructive"
      });
    }
  };
  
  return (
    <div className="hidden lg:flex h-screen w-64 flex-col border-r bg-background sticky top-0 left-0">
      {/* Logo e cabeçalho */}
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center">
          <img 
            src="/logo.png" 
            alt="AgendoAI" 
            className="h-8 w-8 mr-2" 
            onError={(e) => {
              // Caso a imagem do logo não exista, ocultamos o elemento
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <h1 className="text-xl font-bold text-primary">AgendoAI</h1>
        </div>
      </div>
      
      {/* Links de navegação principal */}
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          <SidebarItem 
            icon={<Home />} 
            label="Início" 
            path="/client/dashboard"
            isActive={isActive("/client/dashboard")}
            onClick={() => setLocation("/client/dashboard")}  
          />
          <SidebarItem 
            icon={<Search />} 
            label="Explorar Serviços" 
            path="/client/categories"
            isActive={isActive("/client/categories") || isActive("/client/services") || isActive("/client/providers")}
            onClick={() => setLocation("/client/categories")}
          />
          <SidebarItem 
            icon={<CalendarClock />} 
            label="Meus Agendamentos"
            path="/client/appointments"
            isActive={isActive("/client/appointments")} 
            onClick={() => setLocation("/client/appointments")}
          />
          <SidebarItem 
            icon={<User />} 
            label="Meu Perfil" 
            path="/client/profile"
            isActive={isActive("/client/profile") || isActive("/profile")}
            onClick={() => setLocation("/client/profile")}
          />
        </nav>

        <Separator className="my-4 mx-2" />
        
        {/* Links secundários */}
        <nav className="grid gap-1 px-2">
          <SidebarItem 
            icon={<Bell />} 
            label="Notificações" 
            path="/client/notifications"
            isActive={isActive("/client/notifications")}
            onClick={() => setLocation("/client/notifications")}  
          />
          <SidebarItem 
            icon={<Settings />} 
            label="Configurações" 
            path="/client/settings"
            isActive={isActive("/client/settings")}
            onClick={() => setLocation("/client/settings")}  
          />
          <SidebarItem 
            icon={<HelpCircle />} 
            label="Ajuda e Suporte" 
            path="/client/help"
            isActive={isActive("/client/help")}
            onClick={() => setLocation("/client/help")}  
          />
        </nav>
      </div>
      
      {/* Rodapé com botão de logout */}
      <div className="p-4 border-t">
        <Button 
          variant="outline" 
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </Button>
      </div>
    </div>
  );
}