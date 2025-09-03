import { useAuth } from '@/hooks/use-auth';
import { useLocation } from 'wouter';
import { 
  User, 
  Settings, 
  LogOut 
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface UserDropdownProps {
  userType?: 'client' | 'provider' | 'admin';
}

export function UserDropdown({ userType = 'admin' }: UserDropdownProps) {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const getUserInitials = () => {
    if (!user || !user.name) return userType.substring(0, 2).toUpperCase();
    const names = user.name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return (names[0][0] + names[names.length - 1][0]).toUpperCase();
  };

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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src={user?.profileImage || undefined} alt={user?.name || "Usuário"} />
            <AvatarFallback>{getUserInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{user?.name || 'Administrador'}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setLocation(`/${userType}/profile`)}>
          <User className="mr-2 h-4 w-4" />
          <span>Perfil</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setLocation(`/${userType}/settings`)}>
          <Settings className="mr-2 h-4 w-4" />
          <span>Configurações</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleLogout} className="text-red-600">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Sair</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default UserDropdown;