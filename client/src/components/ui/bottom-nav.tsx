import React from "react";
import { cn } from "@/lib/utils";

type BottomNavProps = {
  children: React.ReactNode;
  className?: string;
};

type BottomNavItemProps = {
  icon: React.ReactNode;
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  className?: string;
};

const BottomNav = ({ children, className }: BottomNavProps) => {
  // Contar o número de elementos filhos para definir o grid adequado
  const childCount = React.Children.count(children);
  
  // Função para determinar o grid adequado com base no número de itens
  const getGridClass = () => {
    switch (childCount) {
      case 2: return "grid-cols-2";
      case 3: return "grid-cols-3";
      case 4: return "grid-cols-4";
      case 5: return "grid-cols-5";
      default: return "grid-cols-4"; // Padrão para compatibilidade
    }
  };
  
  return (
    <div className={cn("w-full", className)}>
      <nav className={cn("h-16 grid items-center justify-items-center", getGridClass())}>
        {children}
      </nav>
    </div>
  );
};

const BottomNavItem = ({ 
  icon, 
  label, 
  isActive = false, 
  onClick,
  className 
}: BottomNavItemProps) => {
  return (
    <button
      className={cn(
        "flex flex-col items-center justify-center gap-1 w-full h-full",
        isActive ? "text-primary" : "text-muted-foreground",
        className
      )}
      onClick={onClick}
    >
      <div className={cn(
        "w-6 h-6 flex items-center justify-center",
        isActive && "text-primary"
      )}>
        {icon}
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
};

BottomNav.Item = BottomNavItem;

export { BottomNav };