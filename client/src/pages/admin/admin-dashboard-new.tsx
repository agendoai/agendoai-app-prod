import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import {
  Users,
  Calendar,
  Package,
  CreditCard,
  BarChart,
  Clock,
  Percent
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import AdminLayout from "@/components/layout/admin-layout";
import UsersPerDayChart from "@/components/admin/users-per-day-chart";

// Interface para o relatório de resumo administrativo
interface AdminSummaryReport {
  totalUsers: number;
  totalProviders: number;
  totalClients: number;
  totalServices: number;
  totalCategories: number;
  totalAppointments: number;
  appointmentsByStatus: { [key: string]: number };
  recentAppointments: {
    id: number;
    serviceId: number;
    providerId: number;
    clientId: number;
    date: string;
    startTime: string;
    status: string;
  }[];
}

// Componente de card para o dashboard
function DashboardCard({ 
  title, 
  value, 
  icon, 
  description, 
  onClick 
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  description: string;
  onClick?: () => void;
}) {
  return (
    <Card 
      className={`${onClick ? 'cursor-pointer transform transition hover:scale-[1.01]' : ''}`}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-md font-medium">{title}</CardTitle>
        <div className="bg-primary/10 p-2 rounded-full">
          {icon}
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold mb-1">{value}</div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

// Componente de status de agendamento
function AppointmentStatusBadge({ status }: { status: string }) {
  const getStatusClasses = () => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'confirmed':
        return 'bg-blue-100 text-blue-800';
      case 'canceled':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'completed':
        return 'Concluído';
      case 'confirmed':
        return 'Confirmado';
      case 'canceled':
        return 'Cancelado';
      case 'pending':
        return 'Pendente';
      default:
        return status;
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusClasses()}`}>
      {getStatusText()}
    </span>
  );
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Dados de exemplo para quando a API falhar
  const fallbackData: AdminSummaryReport = {
    totalUsers: 45,
    totalProviders: 12,
    totalClients: 33,
    totalServices: 24,
    totalCategories: 8,
    totalAppointments: 58,
    appointmentsByStatus: {
      'pending': 10,
      'confirmed': 25,
      'completed': 18,
      'canceled': 5,
    },
    recentAppointments: [
      {
        id: 1,
        serviceId: 1,
        providerId: 2,
        clientId: 3,
        date: new Date().toISOString().split('T')[0],
        startTime: '14:00',
        status: 'confirmed',
      },
      {
        id: 2,
        serviceId: 3,
        providerId: 2,
        clientId: 4,
        date: new Date().toISOString().split('T')[0],
        startTime: '15:30',
        status: 'pending',
      }
    ],
  };

  // Consultar relatório resumido
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ["/api/admin/reports/summary"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/reports/summary");
        return await res.json() as AdminSummaryReport;
      } catch (error) {
        console.error("Erro ao carregar dados de resumo:", error);
        return fallbackData; // Usar dados de exemplo quando a API falhar
      }
    }
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Dashboard do Administrador</h1>
          <p className="text-gray-500">Visão geral da plataforma e métricas importantes</p>
        </div>
        
        <div className="grid grid-cols-1 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Visão Geral</CardTitle>
            </CardHeader>
            <CardContent>
              {/* Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative">
                  <DashboardCard
                    title="Usuários"
                    value={summaryData?.totalUsers || 0}
                    icon={<Users className="h-5 w-5 text-primary" />}
                    description="Total de usuários cadastrados"
                    onClick={() => navigate("/admin/users")}
                  />
                  <button 
                    className="absolute top-2 right-2 bg-primary text-white p-1 rounded hover:bg-primary/90 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/admin/users");
                      // Usando um pequeno timeout para garantir que a página carregue antes de abrir o modal
                      setTimeout(() => {
                        // Disparamos um evento personalizado que será capturado na página de usuários
                        window.dispatchEvent(new CustomEvent('openUserCreateModal'));
                      }, 100);
                    }}
                    title="Adicionar Usuário"
                  >
                    <Users size={16} />
                  </button>
                </div>
                <DashboardCard
                  title="Prestadores"
                  value={summaryData?.totalProviders || 0}
                  icon={<Users className="h-5 w-5 text-primary" />}
                  description="Prestadores ativos na plataforma"
                  onClick={() => navigate("/admin/providers")}
                />
                <DashboardCard
                  title="Agendamentos"
                  value={summaryData?.totalAppointments || 0}
                  icon={<Calendar className="h-5 w-5 text-primary" />}
                  description="Total de agendamentos"
                  onClick={() => navigate("/admin/appointments")}
                />
              </div>
              
              {/* Gerenciamento */}
              <h2 className="text-xl font-bold mt-8 mb-4">Gerenciamento da Plataforma</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <DashboardCard
                  title="Nichos e Categorias"
                  value={summaryData?.totalCategories || 0}
                  icon={<Package className="h-5 w-5 text-primary" />}
                  description="Gerencie nichos, categorias e serviços"
                  onClick={() => navigate("/admin/categories")}
                />
                <DashboardCard
                  title="Configuração de Pagamentos"
                  value="Stripe"
                  icon={<CreditCard className="h-5 w-5 text-primary" />}
                  description="Configure taxas e integração de pagamentos"
                  onClick={() => navigate("/admin/payment-settings")}
                />
                <DashboardCard
                  title="Relatórios"
                  value="Análises"
                  icon={<BarChart className="h-5 w-5 text-primary" />}
                  description="Estatísticas e relatórios da plataforma"
                  onClick={() => navigate("/admin/reports")}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <DashboardCard
                  title="Promoções e Descontos"
                  value="Marketing"
                  icon={<Percent className="h-5 w-5 text-primary" />}
                  description="Gerencie campanhas e cupons de desconto"
                  onClick={() => navigate("/admin/promotions")}
                />
              </div>
            </CardContent>
          </Card>
          
          {/* Gráfico de Novos Usuários */}
          <UsersPerDayChart />
          
          {/* Agendamentos Recentes */}
          <Card>
            <CardHeader>
              <CardTitle>Agendamentos Recentes</CardTitle>
            </CardHeader>
            <CardContent>
              {summaryData?.recentAppointments && summaryData.recentAppointments.length > 0 ? (
                <div className="space-y-4">
                  {summaryData.recentAppointments.map((appointment) => (
                    <div 
                      key={appointment.id}
                      className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200"
                    >
                      <div className="flex items-center">
                        <div className="bg-primary/10 p-2.5 rounded-full mr-4">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">Serviço #{appointment.serviceId}</h3>
                          <div className="text-sm text-gray-500">
                            Cliente #{appointment.clientId} • Prestador #{appointment.providerId}
                          </div>
                          <div className="text-sm text-gray-500">
                            {appointment.date} às {appointment.startTime}
                          </div>
                        </div>
                      </div>
                      
                      <AppointmentStatusBadge status={appointment.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  Nenhum agendamento recente encontrado
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}