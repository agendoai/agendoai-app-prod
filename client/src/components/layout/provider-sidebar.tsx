import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Home,
  Calendar,
  User,
  Settings,
  HelpCircle,
  MessageSquare,
  LogOut,
  Search
} from 'lucide-react';

interface SidebarItemProps {
  icon: React.ReactNode;
  label: string;
  path?: string;
  isActive: boolean;
  onClick: () => void;
}

// Componente para cada item do menu
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

// Componente principal da sidebar do prestador
export function ProviderSidebar() {
  const [location, setLocation] = useLocation();
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  
  // Verifica se a rota atual está ativa
  const isActive = (path: string) => {
    return location.startsWith(path);
  }
  
  // Função para lidar com o logout
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
    <div className="flex h-screen w-64 flex-col border-r bg-background sticky top-0 left-0">
      {/* Logo e cabeçalho */}
      <div className="flex h-14 items-center border-b px-4">
        <div className="flex items-center">
          <h1 className="text-xl font-bold text-primary">AgendoAI</h1>
        </div>
      </div>
      
      {/* Links de navegação principal */}
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid gap-1 px-2">
          <SidebarItem 
            icon={<Home />} 
            label="Início" 
            path="/provider/dashboard"
            isActive={isActive("/provider/dashboard")}
            onClick={() => setLocation("/provider/dashboard")}  
          />
          <SidebarItem
            icon={<Search />}
            label="Teste Search"
            path="/provider/teste-search"
            isActive={isActive("/provider/teste-search")}
            onClick={() => setLocation("/provider/teste-search")}
          />
          <SidebarItem 
            icon={<Calendar />} 
            label="Minha Agenda" 
            path="/provider/schedule"
            isActive={isActive("/provider/schedule")}
            onClick={() => setLocation("/provider/schedule")}  
          />
          <SidebarItem 
            icon={<User />} 
            label="Meu Perfil" 
            path="/provider/profile"
            isActive={isActive("/provider/profile")}
            onClick={() => setLocation("/provider/profile")}  
          />
          <SidebarItem 
            icon={<Settings />} 
            label="Configurações" 
            path="/provider/settings"
            isActive={isActive("/provider/settings")}
            onClick={() => setLocation("/provider/settings")}  
          />
          <SidebarItem 
            icon={<HelpCircle />} 
            label="Ajuda" 
            path="/provider/help"
            isActive={isActive("/provider/help")}
            onClick={() => setLocation("/provider/help")}  
          />
          <SidebarItem 
            icon={<MessageSquare />} 
            label="Suporte" 
            path="/provider/support"
            isActive={isActive("/provider/support")}
            onClick={() => setLocation("/provider/support")}  
          />
        </nav>
      </div>
      
      {/* Rodapé com botão de logout */}
      <div className="p-4 border-t">
        <Button 
          variant="ghost"
          className="w-full justify-start gap-3 text-red-500 hover:bg-red-50 hover:text-red-600"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </Button>
      </div>
    </div>
  );
}

export default ProviderSidebar;
