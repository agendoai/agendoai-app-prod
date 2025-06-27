import { useLocation } from "wouter";
import {
  LayoutDashboard,
  Package,
  CreditCard,
  LogOut
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

export default function AdminSidebar() {
  const [location, setLocation] = useLocation();
  const { logoutMutation } = useAuth();

  const menuItems = [
    {
      title: "Dashboard",
      icon: <LayoutDashboard className="h-5 w-5 text-indigo-600" />,
      path: "/admin/dashboard",
    },
    {
      title: "Categorias",
      icon: <Package className="h-5 w-5 text-indigo-600" />,
      path: "/admin/categories",
    },
    {
      title: "Pagamentos",
      icon: <CreditCard className="h-5 w-5 text-indigo-600" />,
      path: "/admin/payment-settings",
    },
  ];

  const isActive = (path: string) => location === path;

  return (
    <aside className="hidden md:flex flex-col h-screen w-64 bg-white border-r border-gray-200">
      <div className="flex items-center h-16 px-6 border-b border-gray-100">
        <span className="text-2xl font-bold text-indigo-700 select-none">AgendoAI Admin</span>
      </div>
      <nav className="flex-1 py-6 px-2 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.path}
            onClick={() => setLocation(item.path)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium transition-colors
              ${isActive(item.path)
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-700 hover:bg-gray-50"}
            `}
          >
            {item.icon}
            <span>{item.title}</span>
          </button>
        ))}
      </nav>
      <div className="mt-auto p-4 border-t border-gray-100">
        <button
          onClick={() => logoutMutation.mutate()}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-base font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
}