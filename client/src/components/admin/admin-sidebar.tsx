import React from 'react';
import { Link, useLocation } from 'wouter';
import { cn } from '@/lib/utils';
import {
  BarChart3,
  Bell,
  CircleDollarSign,
  Cog,
  FileText,
  FolderTree,
  Home,
  LayoutGrid,
  ListTree,
  MessageCircle,
  Settings,
  Users,
  FileCog,
  Percent,
  Tag
} from 'lucide-react';

interface SidebarLinkProps {
  href: string;
  icon: React.ReactNode;
  text: string;
  isActive?: boolean;
}

function SidebarLink({ href, icon, text, isActive }: SidebarLinkProps) {
  return (
    <Link to={href}>
      <a
        className={cn(
          'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-secondary'
        )}
      >
        {icon}
        <span>{text}</span>
      </a>
    </Link>
  );
}

export default function AdminSidebar() {
  const [location] = useLocation();

  return (
    <aside className="hidden h-screen w-64 flex-col border-r bg-muted/10 md:flex">
      <div className="flex h-14 items-center border-b px-4">
        <Link to="/admin/dashboard">
          <a className="flex items-center gap-2 font-semibold">
            <LayoutGrid className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">AgendoAI</span>
          </a>
        </Link>
      </div>
      
      <div className="flex-1 overflow-auto py-2">
        <nav className="grid items-start px-2 text-sm font-medium">
          <SidebarLink
            href="/admin/dashboard"
            icon={<Home className="h-4 w-4" />}
            text="Dashboard"
            isActive={location === '/admin/dashboard'}
          />
          
          <div className="mt-6 px-3 text-xs font-semibold text-muted-foreground">
            Gerenciamento
          </div>
          
          <SidebarLink
            href="/admin/users"
            icon={<Users className="h-4 w-4" />}
            text="Usuários"
            isActive={location === '/admin/users' || location === '/admin/user-management'}
          />
          
          <SidebarLink
            href="/admin/providers"
            icon={<Users className="h-4 w-4" />}
            text="Prestadores"
            isActive={location === '/admin/providers'}
          />
          
          <SidebarLink
            href="/admin/categories"
            icon={<ListTree className="h-4 w-4" />}
            text="Categorias"
            isActive={location === '/admin/categories'}
          />
          
          <SidebarLink
            href="/admin/service-templates"
            icon={<FolderTree className="h-4 w-4" />}
            text="Templates de Serviço"
            isActive={location === '/admin/service-templates'}
          />
          
          <SidebarLink
            href="/admin/appointments"
            icon={<FileText className="h-4 w-4" />}
            text="Agendamentos"
            isActive={location === '/admin/appointments'}
          />
          
          <SidebarLink
            href="/admin/promotions"
            icon={<Percent className="h-4 w-4" />}
            text="Promoções e Descontos"
            isActive={location === '/admin/promotions'}
          />
          
          <div className="mt-6 px-3 text-xs font-semibold text-muted-foreground">
            Configurações
          </div>
          
          <SidebarLink
            href="/admin/payment-settings"
            icon={<CircleDollarSign className="h-4 w-4" />}
            text="Configurações de Pagamento"
            isActive={location === '/admin/payment-settings'}
          />
          
          <SidebarLink
            href="/admin/notification-settings"
            icon={<Bell className="h-4 w-4" />}
            text="Configurações de Notificação"
            isActive={location === '/admin/notification-settings'}
          />
          
          <SidebarLink
            href="/admin/support"
            icon={<MessageCircle className="h-4 w-4" />}
            text="Gestão de Suporte"
            isActive={location === '/admin/support'}
          />
          
          <SidebarLink
            href="/admin/support-enhanced"
            icon={<MessageCircle className="h-4 w-4" />}
            text="Suporte Aprimorado"
            isActive={location === '/admin/support-enhanced'}
          />
          
          <div className="mt-6 px-3 text-xs font-semibold text-muted-foreground">
            Dados e Análises
          </div>
          
          <SidebarLink
            href="/admin/reports"
            icon={<BarChart3 className="h-4 w-4" />}
            text="Relatórios"
            isActive={location === '/admin/reports'}
          />
          
          <div className="mt-6 px-3 text-xs font-semibold text-muted-foreground">
            Documentação
          </div>
          
          <SidebarLink
            href="/admin/documentation"
            icon={<FileText className="h-4 w-4" />}
            text="Documentação"
            isActive={location === '/admin/documentation'}
          />
          
          <SidebarLink
            href="/admin/project-documentation"
            icon={<FileCog className="h-4 w-4" />}
            text="Documentação do Projeto"
            isActive={location === '/admin/project-documentation'}
          />
          
          <SidebarLink
            href="/admin/testing-documentation"
            icon={<FileText className="h-4 w-4" />}
            text="Documentação de Testes"
            isActive={location === '/admin/testing-documentation'}
          />
        </nav>
      </div>
    </aside>
  );
}