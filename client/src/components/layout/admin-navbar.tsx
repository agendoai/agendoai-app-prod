import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  BarChart3,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  Home,
  Tag,
  CreditCard,
  Copy,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

export function AdminNavbar() {
  const { user, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const routes = [
    {
      href: "/admin",
      label: "Dashboard",
      icon: Home,
      active: location === "/admin",
    },
    {
      href: "/admin/users",
      label: "Usuários",
      icon: Users,
      active: location === "/admin/users",
    },
    {
      href: "/admin/categories",
      label: "Categorias",
      icon: Tag,
      active: location === "/admin/categories",
    },
    {
      href: "/admin/service-templates",
      label: "Templates",
      icon: Copy,
      active: location === "/admin/service-templates",
    },
    {
      href: "/admin/payment-settings",
      label: "Pagamentos",
      icon: CreditCard,
      active: location === "/admin/payment-settings",
    },
    {
      href: "/admin/reports",
      label: "Relatórios",
      icon: BarChart3,
      active: location === "/admin/reports",
    },
    {
      href: "/admin/settings",
      label: "Configurações",
      icon: Settings,
      active: location === "/admin/settings",
    },
  ];

  const NavItems = () => (
    <>
      <div className="flex items-center gap-x-4 px-6 pb-4">
        <Avatar>
          <AvatarImage src={user?.profileImage || ""} />
          <AvatarFallback className="bg-primary text-white uppercase">
            {user?.name?.charAt(0) || "A"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm font-semibold">{user?.name || "Administrador"}</p>
          <p className="text-xs text-muted-foreground">Administrador</p>
        </div>
      </div>
      <Separator />
      <ScrollArea className="flex-1 px-6">
        <div className="flex flex-col gap-y-2 py-4">
          {routes.map((route) => (
            <Button
              key={route.href}
              asChild
              variant={route.active ? "default" : "ghost"}
              className="justify-start"
              onClick={() => setOpen(false)}
            >
              <Link href={route.href}>
                <route.icon className="mr-2 h-4 w-4" />
                {route.label}
              </Link>
            </Button>
          ))}
        </div>
      </ScrollArea>
      <Separator />
      <div className="p-6">
        <Button
          variant="outline"
          className="w-full justify-start"
          onClick={handleLogout}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile version - Sidebar in a drawer */}
      <Sheet open={open} onOpenChange={setOpen}>
        <div className="flex items-center justify-between p-4 lg:hidden border-b">
          <div className="flex items-center">
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <h1 className="text-xl font-bold ml-2">AgendoAI Admin</h1>
          </div>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-white uppercase">
              {user?.name?.charAt(0) || "A"}
            </AvatarFallback>
          </Avatar>
        </div>
        <SheetContent side="left" className="p-0 flex flex-col w-72">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-lg font-semibold">Menu</h2>
            <Button size="icon" variant="ghost" onClick={() => setOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <Separator />
          <NavItems />
        </SheetContent>
      </Sheet>

      {/* Desktop version - Sidebar always visible */}
      <div className="hidden lg:flex h-screen w-64 flex-col fixed inset-y-0 z-50 border-r bg-white">
        <div className="p-6">
          <h1 className="text-xl font-bold">AgendoAI Admin</h1>
        </div>
        <Separator />
        <div className="flex flex-col flex-1">
          <NavItems />
        </div>
      </div>
      <div className="lg:pl-64">
        {/* Content will be positioned to the right */}
      </div>
    </>
  );
}

export default AdminNavbar;