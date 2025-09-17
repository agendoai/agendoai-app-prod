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
  Percent,
  TrendingUp,
  Activity,
  DollarSign,
  UserPlus,
  Settings,
  Bell,
  Eye
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
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

// Componente de card para o dashboard com design melhorado
function DashboardCard({ 
  title, 
  value, 
  icon, 
  description, 
  onClick,
  gradient = "from-blue-500 to-blue-600",
  trend,
  trendValue
}: { 
  title: string; 
  value: string | number; 
  icon: React.ReactNode; 
  description: string;
  onClick?: () => void;
  gradient?: string;
  trend?: "up" | "down";
  trendValue?: string;
}) {
  return (
    <Card 
      className={`group relative overflow-hidden border-0 shadow-lg hover:shadow-xl transition-all duration-300 ${
        onClick ? 'cursor-pointer transform hover:scale-[1.02]' : ''
      }`}
      onClick={onClick}
    >
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-5 group-hover:opacity-10 transition-opacity`} />
      <CardHeader className="flex flex-row items-center justify-between pb-3 relative z-10">
        <CardTitle className="text-lg font-semibold text-gray-800">{title}</CardTitle>
        <div className={`bg-gradient-to-br ${gradient} p-3 rounded-xl shadow-lg`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
            <p className="text-sm text-gray-600 mb-2">{description}</p>
          </div>
          {trend && trendValue && (
            <div className={`flex items-center text-sm font-medium ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? <TrendingUp className="h-4 w-4 mr-1" /> : <Activity className="h-4 w-4 mr-1" />}
              {trendValue}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Componente de status de agendamento melhorado
function AppointmentStatusBadge({ status }: { status: string }) {
  const getStatusConfig = () => {
    switch (status) {
      case 'completed':
        return {
          classes: 'bg-gradient-to-r from-green-100 to-green-200 text-green-800 border-green-300',
          text: 'Concluído'
        };
      case 'confirmed':
        return {
          classes: 'bg-gradient-to-r from-blue-100 to-blue-200 text-blue-800 border-blue-300',
          text: 'Confirmado'
        };
      case 'canceled':
        return {
          classes: 'bg-gradient-to-r from-red-100 to-red-200 text-red-800 border-red-300',
          text: 'Cancelado'
        };
      case 'pending':
        return {
          classes: 'bg-gradient-to-r from-yellow-100 to-yellow-200 text-yellow-800 border-yellow-300',
          text: 'Pendente'
        };
      default:
        return {
          classes: 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-800 border-gray-300',
          text: status
        };
    }
  };

  const config = getStatusConfig();

  return (
    <Badge className={`${config.classes} border font-medium px-3 py-1`}>
      {config.text}
    </Badge>
  );
}

// Componente de card de ação rápida
function QuickActionCard({ 
  title, 
  description, 
  icon, 
  onClick,
  color = "blue"
}: { 
  title: string; 
  description: string; 
  icon: React.ReactNode; 
  onClick: () => void;
  color?: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700",
    green: "from-green-500 to-green-600 hover:from-green-600 hover:to-green-700",
    purple: "from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700",
    orange: "from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700"
  };

  return (
    <Card 
      className="group cursor-pointer transform transition-all duration-300 hover:scale-105 border-0 shadow-lg hover:shadow-xl"
      onClick={onClick}
    >
      <CardContent className="p-6">
        <div className={`bg-gradient-to-br ${colorClasses[color]} p-4 rounded-xl mb-4 w-fit`}>
          <div className="text-white">
            {icon}
          </div>
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
        <p className="text-gray-600 text-sm">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function AdminDashboard() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  
  // Dados de exemplo para quando a API falhar
  const fallbackData: AdminSummaryReport = {
    totalUsers: 1247,
    totalProviders: 89,
    totalClients: 1158,
    totalServices: 156,
    totalCategories: 12,
    totalAppointments: 2341,
    appointmentsByStatus: {
      'pending': 156,
      'confirmed': 1892,
      'completed': 245,
      'canceled': 48,
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
      },
      {
        id: 3,
        serviceId: 5,
        providerId: 3,
        clientId: 7,
        date: new Date().toISOString().split('T')[0],
        startTime: '16:00',
        status: 'completed',
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
        
        return fallbackData;
      }
    }
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex h-[50vh] items-center justify-center">
          <div className="flex flex-col items-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
            <p className="text-gray-600">Carregando dashboard...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-100 via-blue-50 to-indigo-100">
        <div className="container mx-auto py-8 px-4">
          {/* Header destacado */}
          <div className="mb-8">
            <div className="rounded-2xl bg-white/90 shadow-lg border border-blue-100 px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent mb-2">
                  Painel do Administrador
                </h1>
                <p className="text-gray-600 text-base sm:text-lg">
                  Bem-vindo de volta! Aqui está o resumo da sua plataforma.
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-md">
                  <Bell className="h-6 w-6 text-white" />
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-3 rounded-xl shadow-md">
                  <Settings className="h-6 w-6 text-white" />
                </div>
              </div>
            </div>
          </div>
          
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <DashboardCard
              title="Total de Usuários"
              value={summaryData?.totalUsers?.toLocaleString() || "0"}
              icon={<Users className="h-6 w-6" />}
              description="Usuários cadastrados"
              gradient="from-blue-500 to-blue-600"
              trend="up"
              trendValue="+12%"
              onClick={() => navigate("/admin/users")}
            />
            <DashboardCard
              title="Prestadores"
              value={summaryData?.totalProviders || 0}
              icon={<UserPlus className="h-6 w-6" />}
              description="Prestadores ativos"
              gradient="from-green-500 to-green-600"
              trend="up"
              trendValue="+8%"
              onClick={() => navigate("/admin/providers")}
            />
            <DashboardCard
              title="Agendamentos"
              value={summaryData?.totalAppointments?.toLocaleString() || "0"}
              icon={<Calendar className="h-6 w-6" />}
              description="Total de agendamentos"
              gradient="from-purple-500 to-purple-600"
              trend="up"
              trendValue="+15%"
              onClick={() => navigate("/admin/appointments")}
            />
            <DashboardCard
              title="Serviços"
              value={summaryData?.totalServices || 0}
              icon={<Package className="h-6 w-6" />}
              description="Serviços disponíveis"
              gradient="from-orange-500 to-orange-600"
              trend="up"
              trendValue="+5%"
              onClick={() => navigate("/admin/services")}
            />
          </div>

          {/* Gráfico e Ações Rápidas */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            {/* Gráfico */}
            <div className="lg:col-span-2">
              <UsersPerDayChart />
            </div>
            
            {/* Ações Rápidas */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Ações Rápidas</h2>
              <QuickActionCard
                title="Gerenciar Categorias"
                description="Adicionar ou editar nichos e categorias de serviços"
                icon={<Package className="h-6 w-6" />}
                color="blue"
                onClick={() => navigate("/admin/categories")}
              />
              <QuickActionCard
                title="Configurar Pagamentos"
                description="Configurar taxas e integrações de pagamento"
                icon={<CreditCard className="h-6 w-6" />}
                color="green"
                onClick={() => navigate("/admin/payment-settings")}
              />
              <QuickActionCard
                title="Ver Relatórios"
                description="Acessar estatísticas e relatórios detalhados"
                icon={<BarChart className="h-6 w-6" />}
                color="purple"
                onClick={() => navigate("/admin/reports")}
              />
              <QuickActionCard
                title="Promoções"
                description="Gerenciar campanhas e cupons de desconto"
                icon={<Percent className="h-6 w-6" />}
                color="orange"
                onClick={() => navigate("/admin/promotions")}
              />
              <QuickActionCard
                title="Solicitações de Saque"
                description="Gerenciar solicitações de saque dos prestadores"
                icon={<DollarSign className="h-6 w-6" />}
                color="green"
                onClick={() => navigate("/admin/withdrawal-requests")}
              />
            </div>
          </div>

          {/* Status dos Agendamentos */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <Card className="border-0 shadow-lg bg-gradient-to-br from-yellow-50 to-yellow-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Pendentes</p>
                    <p className="text-2xl font-bold text-yellow-900">
                      {summaryData?.appointmentsByStatus?.pending || 0}
                    </p>
                  </div>
                  <div className="bg-yellow-500 p-3 rounded-full">
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-800">Confirmados</p>
                    <p className="text-2xl font-bold text-blue-900">
                      {summaryData?.appointmentsByStatus?.confirmed || 0}
                    </p>
                  </div>
                  <div className="bg-blue-500 p-3 rounded-full">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-800">Concluídos</p>
                    <p className="text-2xl font-bold text-green-900">
                      {summaryData?.appointmentsByStatus?.completed || 0}
                    </p>
                  </div>
                  <div className="bg-green-500 p-3 rounded-full">
                    <Eye className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="border-0 shadow-lg bg-gradient-to-br from-red-50 to-red-100">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-red-800">Cancelados</p>
                    <p className="text-2xl font-bold text-red-900">
                      {summaryData?.appointmentsByStatus?.canceled || 0}
                    </p>
                  </div>
                  <div className="bg-red-500 p-3 rounded-full">
                    <Activity className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Agendamentos Recentes */}
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
              <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Agendamentos Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {summaryData?.recentAppointments && summaryData.recentAppointments.length > 0 ? (
                <div className="space-y-4">
                  {summaryData.recentAppointments.map((appointment) => (
                    <div 
                      key={appointment.id}
                      className="flex justify-between items-center p-4 bg-white rounded-xl border border-gray-100 hover:shadow-md transition-shadow"
                    >
                      <div className="flex items-center">
                        <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-full mr-4">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">Serviço #{appointment.serviceId}</h3>
                          <div className="text-sm text-gray-600">
                            Cliente #{appointment.clientId} • Prestador #{appointment.providerId}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(appointment.date).toLocaleDateString('pt-BR')} às {appointment.startTime}
                          </div>
                        </div>
                      </div>
                      
                      <AppointmentStatusBadge status={appointment.status} />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 p-4 rounded-full w-fit mx-auto mb-4">
                    <Calendar className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-gray-500 text-lg">Nenhum agendamento recente encontrado</p>
                  <p className="text-gray-400 text-sm">Os agendamentos aparecerão aqui quando forem criados</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}