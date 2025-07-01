import React from 'react';
import { Link, useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { 
  Home, 
  Search, 
  CalendarCheck, 
  CalendarClock, 
  User,
  MapPin
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
      icon: <Home size={20} />,
      label: 'Início',
      href: '/client/dashboard'
    },
    {
      icon: <Search size={20} />,
      label: 'Buscar',
      href: '/client/search'
    },
    {
      icon: <MapPin size={20} />,
      label: 'Mapa',
      href: '/services/availability-map'
    },
    {
      icon: <CalendarClock size={20} />,
      label: 'Agendar',
      href: '/client/new-booking-wizard'
    },
    {
      icon: <CalendarCheck size={20} />,
      label: 'Agenda',
      href: '/client/appointments'
    },
    {
      icon: <User size={20} />,
      label: 'Perfil',
      href: '/profile'
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
      className={`fixed ${positionStyle} left-0 right-0 bg-white border-neutral-200 h-16 z-50 max-w-md mx-auto ${className}`}
    >
      <div className="flex justify-around items-center h-full px-1">
        {navItems.map((item, index) => (
          <NavItem 
            key={index}
            icon={item.icon}
            label={item.label}
            href={item.href}
            active={isItemActive(item)}
            onClick={() => handleNavClick(item.href)}
            layoutId={`${layoutId}-${index}`}
            showActiveIndicator={showActiveIndicator}
          />
        ))}
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
}

function NavItem({ 
  icon, 
  label, 
  href, 
  active, 
  onClick, 
  layoutId,
  showActiveIndicator
}: NavItemProps) {
  return (
    <div
      onClick={onClick}
      className="flex flex-col items-center justify-center h-full w-16 sm:w-20 cursor-pointer relative"
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
        className={`flex items-center justify-center ${active ? 'text-primary' : 'text-gray-500'}`}
        whileTap={{ scale: 0.9 }}
      >
        {icon}
      </motion.div>
      
      <motion.span 
        className={`text-xs mt-1 ${active ? 'font-medium text-primary' : 'font-normal text-gray-500'}`}
        animate={{ scale: active ? 1.05 : 1 }}
        transition={{ duration: 0.2 }}
      >
        {label}
      </motion.span>
    </div>
  );
}