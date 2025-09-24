import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  Home, 
  Search, 
  CalendarCheck, 
  CalendarClock, 
  User,
  MapPin,
  PlusCircle
} from 'lucide-react';

/**
 * Barra de navegação inferior padronizada para o aplicativo
 * Com animações suaves e visual consistente conforme o design
 * 
 * Este componente foi padronizado para ser reutilizado em todos os layouts
 */
export interface NavItemType {
  icon: React.ReactNode;
  label: string;
  href: string;
  /**
   * Função personalizada para verificar se o item está ativo.
   * Se não for fornecida, verifica apenas correspondência exata da URL
   */
  isActive?: (currentPath: string, itemPath: string) => boolean;
}

interface NavbarProps {
  /** Lista de itens de navegação a serem exibidos */
  items?: NavItemType[];
  /** ID único para animações de layout entre diferentes navbars na mesma página */
  layoutId?: string;
  /** Função para lidar com a navegação entre páginas */
  onNavigate?: (href: string) => void;
  /** Classe CSS adicional para personalização */
  className?: string;
  /** Mostrar indicador do item ativo */
  showActiveIndicator?: boolean;
  /** Posição da barra de navegação */
  position?: 'top' | 'bottom';
}

export default function Navbar({ 
  items,
  layoutId = 'navbar',
  onNavigate,
  className = '',
  showActiveIndicator = true,
  position = 'bottom'
}: NavbarProps) {
  const [location, setLocation] = useLocation();

  // Itens de navegação padrão se não forem fornecidos
  const defaultItems: NavItemType[] = [
    {
      icon: <Home size={26} />,
      label: 'Início',
      href: '/client/dashboard'
    },
    {
      icon: <Search size={26} />,
      label: 'Buscar',
      href: '/client/search'
    },
    {
      icon: <PlusCircle size={32} className="animate-pulse" />,
      label: 'Novo Agendamento',
      href: '/client/new-booking-wizard'
    },
    {
      icon: <CalendarCheck size={26} />,
      label: 'Agenda',
      href: '/client/appointments'
    },
    {
      icon: <User size={26} />,
      label: 'Perfil',
      href: '/client/profile'
    }
  ];

  const navItems = items || defaultItems;

  // Função para lidar com cliques nos itens de navegação
  const handleNavClick = (href: string) => {
    if (onNavigate) {
      onNavigate(href);
    } else {
      // Se não tiver um manipulador personalizado, use o roteamento wouter
      setLocation(href);
    }
  };

  // Verifica se um item está ativo
  const isItemActive = (item: NavItemType) => {
    if (item.isActive) {
      return item.isActive(location, item.href);
    }
    // Verificação padrão: 
    // - Verifica correspondência exata
    // - Para página inicial, também verifica o root path (/)
    return location === item.href || 
           (item.href.includes('/dashboard') && location === '/') ||
           (location.startsWith(item.href) && item.href !== '/');
  };

  // Estilo da posição para barra superior ou inferior
  const positionStyle = position === 'top' 
    ? 'top-0 border-b shadow-sm' 
    : 'bottom-0 border-t';

  return (
    <motion.div 
      initial={{ y: position === 'top' ? -60 : 60, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.3 }}
      className={`fixed ${positionStyle} left-0 right-0 bg-white border-neutral-200 h-16 z-40 w-full ${className}`}
    >
      <div className="flex justify-around items-center h-full px-1 relative">
        {navItems.map((item, index) => {
          // Destacar o botão de novo agendamento
          const isMainAction = item.href === '/client/new-booking-wizard';
          const isActive = isItemActive(item);
          if (isMainAction) {
            return (
              <div key={index} className="relative z-20 -mt-6 flex-1 flex justify-center">
                <button
                  onClick={() => handleNavClick(item.href)}
                  className="bg-[#58c9d1] shadow-2xl hover:bg-[#58c9d1]/90 transition-colors rounded-full w-20 h-20 flex flex-col items-center justify-center border-4 border-white outline-none focus:ring-2 focus:ring-[#58c9d1] focus:ring-offset-2 animate-pulse"
                  style={{ boxShadow: '0 8px 32px 0 #58c9d133' }}
                >
                  <PlusCircle size={36} className="text-white mb-1 animate-pulse" />
                  <span className="text-sm font-bold text-white">Agendar</span>
                </button>
              </div>
            );
          }
          return (
            <NavItem 
              key={index}
              icon={item.icon}
              label={item.label}
              href={item.href}
              active={isActive}
              onClick={() => handleNavClick(item.href)}
              layoutId={`${layoutId}-${index}`}
              showActiveIndicator={showActiveIndicator}
              className={
                isActive
                  ? 'bg-[#58c9d1] text-white shadow-md'
                  : 'text-[#58c9d1] hover:bg-[#58c9d1]/10 hover:text-[#58c9d1]'
              }
            />
          );
        })}
      </div>
    </motion.div>
  );
}

/**
 * Item de navegação individual com animações
 */
interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  active: boolean;
  onClick: () => void;
  layoutId: string;
  showActiveIndicator: boolean;
  className?: string;
}

function NavItem({ 
  icon, 
  label, 
  href, 
  active, 
  onClick, 
  layoutId,
  showActiveIndicator,
  className
}: NavItemProps) {
  return (
    <div
      onClick={onClick}
      className={`flex flex-col items-center justify-center h-full w-16 sm:w-20 cursor-pointer relative ${className}`}
    >
      {/* Indicador de item ativo */}
      {active && showActiveIndicator && (
        <motion.div 
          layoutId={layoutId}
          className="absolute top-0 w-12 h-1 bg-primary rounded-full" 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
      
      <motion.div 
        className={`flex items-center justify-center ${active ? 'text-white' : 'text-[#58c9d1]'}`}
        whileTap={{ scale: 1.2 }}
      >
        {icon}
      </motion.div>
      
      <motion.span 
        className={`text-xs mt-1 ${active ? 'font-medium text-white' : 'font-normal text-[#58c9d1]'}`}
        animate={{ scale: active ? 1.05 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {label}
      </motion.span>
    </div>
  );
}