import { useCallback } from "react";
import { useLocation } from "wouter";
import { ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackButtonProps {
  to?: string;
  label?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
}

export function BackButton({ 
  to,
  label = "Voltar",
  variant = "ghost",
  size = "default",
  className = ""
}: BackButtonProps) {
  const [, setLocation] = useLocation();
  
  const handleClick = useCallback(() => {
    if (to) {
      setLocation(to);
    } else {
      window.history.back();
    }
  }, [to, setLocation]);
  
  return (
    <Button 
      variant={variant} 
      size={size} 
      onClick={handleClick}
      className={`${className}`}
    >
      <ChevronLeft className="h-4 w-4 mr-2" />
      {label}
    </Button>
  );
}