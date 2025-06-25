import { Calendar, Clipboard, Settings, Users, BarChart, Clock, Home, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";

interface NavItem {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
}

export function ProviderNavMenu({ className }: { className?: string }) {
  const [location] = useLocation();
  
  const navItems: NavItem[] = [
    {
      label: "Início",
      icon: Home,
      href: "/provider/dashboard",
    },
    {
      label: "Agenda",
      icon: Calendar,
      href: "/provider/schedule",
    },
    {
      label: "Agendamentos",
      icon: Clipboard,
      href: "/provider/appointments",
    },
    {
      label: "Clientes",
      icon: Users,
      href: "/provider/clients",
    },
    {
      label: "Serviços",
      icon: Clock,
      href: "/provider/services",
    },
    {
      label: "Finanças",
      icon: Wallet,
      href: "/provider/finances",
    },
    {
      label: "Relatórios",
      icon: BarChart,
      href: "/provider/reports",
    },
    {
      label: "Configurações",
      icon: Settings,
      href: "/provider/settings",
    },
  ];

  return (
    <div className={cn("flex overflow-x-auto pb-2 scrollbar-hide", className)}>
      <div className="flex gap-1 px-1 mx-auto sm:mx-0">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <Button
                variant={isActive ? "default" : "ghost"}
                size="sm"
                className={cn(
                  "flex items-center gap-1 whitespace-nowrap",
                  isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{item.label}</span>
              </Button>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function ProviderSideNav({ className }: { className?: string }) {
  const [location] = useLocation();
  
  const navItems: NavItem[] = [
    {
      label: "Início",
      icon: Home,
      href: "/provider/dashboard",
    },
    {
      label: "Agenda",
      icon: Calendar,
      href: "/provider/schedule",
    },
    {
      label: "Agendamentos",
      icon: Clipboard,
      href: "/provider/appointments",
    },
    {
      label: "Clientes",
      icon: Users,
      href: "/provider/clients",
    },
    {
      label: "Serviços",
      icon: Clock,
      href: "/provider/services",
    },
    {
      label: "Finanças",
      icon: Wallet,
      href: "/provider/finances",
    },
    {
      label: "Relatórios",
      icon: BarChart,
      href: "/provider/reports",
    },
    {
      label: "Configurações",
      icon: Settings,
      href: "/provider/settings",
    },
  ];

  return (
    <div className={cn("h-full w-full space-y-1", className)}>
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <Button
              variant={isActive ? "default" : "ghost"}
              size="sm"
              className={cn(
                "w-full justify-start",
                isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className="h-4 w-4 mr-2" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );
}