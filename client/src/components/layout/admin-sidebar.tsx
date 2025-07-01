import { useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Users,
  Settings,
  Calendar,
  CreditCard,
  BarChart3,
  MessageSquare,
  LogOut,
  ChevronRight,
  Menu,
  X,
  Package,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function AdminSidebar() {
  const [location, setLocation] = useLocation();
  const { logoutMutation } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);

  const menuItems = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5" />,
      path: "/admin/dashboard",
    },
    {
      title: "Categorias",
      icon: <Package className="h-5 w-5" />,
      path: "/admin/categories",
    },
    {
      title: "Pagamentos",
      icon: <CreditCard className="h-5 w-5" />,
      path: "/admin/payment-settings",
    },
  ];

  const toggleSidebar = () => {
    setCollapsed(!collapsed);
  };

  const isActive = (path: string) => {
    return location === path;
  };

  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };

  const confirmLogout = () => {
    // Fechamos o diálogo primeiro
    setLogoutDialogOpen(false);
    // Chamamos a função de logout
    try {
      logoutMutation.mutate(undefined);
    } catch (error) {
      console.error("Erro ao processar logout:", error);
    }
  };

  // Versão Mobile do Sidebar
  const MobileSidebar = () => (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden fixed top-4 left-4 z-50"
        onClick={() => setMobileOpen(true)}
      >
        <Menu className="h-6 w-6" />
      </Button>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="sm:max-w-[300px] p-0">
          <div className="bg-white rounded-lg overflow-hidden">
            <div className="p-4 bg-primary text-white flex justify-between items-center">
              <h2 className="font-bold text-xl">Admin</h2>
              <Button variant="ghost" size="icon" onClick={() => setMobileOpen(false)}>
                <X className="h-6 w-6 text-white" />
              </Button>
            </div>

            <div className="p-2">
              {menuItems.map((item) => (
                <Button
                  key={item.path}
                  variant={isActive(item.path) ? "default" : "ghost"}
                  className={`w-full justify-start mb-1 ${
                    isActive(item.path) ? "bg-primary text-white" : ""
                  }`}
                  onClick={() => {
                    setLocation(item.path);
                    setMobileOpen(false);
                  }}
                >
                  {item.icon}
                  <span className="ml-2">{item.title}</span>
                </Button>
              ))}

              <Separator className="my-2" />

              <Button
                variant="ghost"
                className="w-full justify-start text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-2" />
                Sair
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );

  // Versão Desktop do Sidebar
  const DesktopSidebar = () => (
    <div
      className={`hidden md:flex flex-col h-screen bg-white border-r border-gray-200 transition-all duration-300 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      <div
        className={`flex items-center ${
          collapsed ? "justify-center" : "justify-between"
        } p-4 bg-primary text-white`}
      >
        {!collapsed && <h2 className="font-bold text-xl">Admin</h2>}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="text-white hover:bg-primary-foreground/10"
        >
          {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex-1 py-4 overflow-y-auto">
        <div className="px-2 space-y-1">
          {menuItems.map((item) => (
            <Button
              key={item.path}
              variant={isActive(item.path) ? "default" : "ghost"}
              className={`w-full ${collapsed ? "justify-center px-2" : "justify-start"} ${
                isActive(item.path) ? "bg-primary text-white" : ""
              }`}
              onClick={() => setLocation(item.path)}
            >
              {item.icon}
              {!collapsed && <span className="ml-2">{item.title}</span>}
            </Button>
          ))}
        </div>
      </div>

      <div className="p-2 border-t border-gray-200">
        <Button
          variant="ghost"
          className={`w-full ${collapsed ? "justify-center px-2" : "justify-start"} text-red-500 hover:text-red-700 hover:bg-red-50`}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </div>
    </div>
  );

  return (
    <>
      <MobileSidebar />
      <DesktopSidebar />

      {/* Diálogo de confirmação para sair */}
      <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sair</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja sair da sua conta?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setLogoutDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? "Saindo..." : "Sim, sair"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}