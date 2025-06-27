import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import AdminLayout from '@/components/layout/admin-layout';
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { 
  Loader2, 
  BarChart as BarChartIcon, 
  Users, 
  Calendar,
  ArrowUpRight,
  Download,
  PieChart as PieChartIcon,
  TrendingUp,
  DollarSign,
  Activity,
  Target,
  BarChart3,
  FileText,
  RefreshCw
} from "lucide-react";

// Tipos para os dados de relatórios
interface DashboardData {
  usersPerDay: { date: string; count: number }[];
  appointmentsPerDay: { date: string; count: number }[];
  revenuePerDay: { date: string; amount: number }[];
  topServices: { name: string; count: number }[];
  topProviders: { name: string; count: number }[];
  statusDistribution: { status: string; count: number }[];
  totalUsers: number;
  totalProviders: number;
  totalAppointments: number;
  totalRevenue: number;
  userGrowth: number;
  appointmentGrowth: number;
  revenueGrowth: number;
}

// Cores para os gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

// Status em português
const STATUS_NAMES: Record<string, string> = {
  'pending': 'Pendente',
  'confirmed': 'Confirmado',
  'completed': 'Concluído',
  'canceled': 'Cancelado'
};

export default function ReportsPage() {
  const [period, setPeriod] = useState('30'); // Período em dias (7, 15, 30, 60, 90)
  const [activeTab, setActiveTab] = useState('general');
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['/api/admin/reports/dashboard', { period }],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/admin/reports/dashboard?period=${period}`);
        if (!response.ok) {
          throw new Error('Falha ao carregar dados do relatório');
        }
        return response.json() as Promise<DashboardData>;
      } catch (error) {
        console.error('Erro ao carregar dados do relatório:', error);
        return {
          usersPerDay: [],
          appointmentsPerDay: [],
          revenuePerDay: [],
          topServices: [],
          topProviders: [],
          statusDistribution: [],
          totalUsers: 0,
          totalProviders: 0,
          totalAppointments: 0,
          totalRevenue: 0,
          userGrowth: 0,
          appointmentGrowth: 0,
          revenueGrowth: 0
        } as DashboardData;
      }
    }
  });

  // Função para formatar data (DD/MM)
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}`;
  };

  // Função para formatar valores monetários (R$)
  const formatCurrency = (value: number) => {
    return `R$ ${(value / 100).toFixed(2).replace('.', ',')}`;
  };

  // Função para exportar dados para CSV
  const exportToCSV = () => {
    if (!data) {
      toast({
        title: "Erro ao exportar",
        description: "Não há dados disponíveis para exportar",
        variant: "destructive"
      });
      return;
    }

    let csvContent = "";
    let filename = "";
    
    // Cabeçalho do CSV com BOM para garantir caracteres especiais
    const BOM = "\uFEFF";
    
    try {
      // Exportar dados com base na aba ativa
      switch (activeTab) {
        case 'general':
          // Agendamentos por dia
          csvContent = BOM + "Data,Quantidade de Agendamentos\n";
          data.appointmentsPerDay.forEach(item => {
            csvContent += `${formatDate(item.date)},${item.count}\n`;
          });
          filename = `agendamentos_por_dia_${new Date().toISOString().split('T')[0]}.csv`;
          break;
          
        case 'services':
          // Serviços mais populares
          csvContent = BOM + "Serviço,Quantidade de Agendamentos\n";
          data.topServices.forEach(item => {
            csvContent += `"${item.name}",${item.count}\n`;
          });
          filename = `servicos_populares_${new Date().toISOString().split('T')[0]}.csv`;
          break;
          
        case 'providers':
          // Prestadores mais ativos
          csvContent = BOM + "Prestador,Quantidade de Agendamentos\n";
          data.topProviders.forEach(item => {
            csvContent += `"${item.name}",${item.count}\n`;
          });
          filename = `prestadores_ativos_${new Date().toISOString().split('T')[0]}.csv`;
          break;
          
        default:
          // Resumo geral
          csvContent = BOM + "Métrica,Valor\n";
          csvContent += `Total de Usuários,${data.totalUsers}\n`;
          csvContent += `Total de Prestadores,${data.totalProviders}\n`;
          csvContent += `Total de Agendamentos,${data.totalAppointments}\n`;
          csvContent += `Receita Total,${(data.totalRevenue / 100).toFixed(2)}\n`;
          filename = `resumo_geral_${new Date().toISOString().split('T')[0]}.csv`;
      }
      
      // Criar link de download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast({
        title: "Relatório exportado com sucesso",
        description: `O arquivo ${filename} foi baixado.`,
      });
      
    } catch (error) {
      console.error("Erro ao exportar relatório:", error);
      toast({
        title: "Erro ao exportar",
        description: "Ocorreu um erro ao gerar o arquivo CSV",
        variant: "destructive"
      });
    }
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="container mx-auto py-8 px-6">
            <div className="flex flex-col items-center justify-center h-64">
              <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center mb-4">
                <Loader2 className="h-8 w-8 animate-spin text-white" />
              </div>
              <p className="text-gray-600">Carregando relatórios...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Header da Página */}
        <div className="bg-white border-b border-blue-100 shadow-sm">
          <div className="container mx-auto py-8 px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                    <BarChart3 className="h-8 w-8 text-white" />
                  </div>
                  Relatórios e Análises
                </h1>
                <p className="text-gray-600 mt-2">
                  Visualize métricas e insights sobre o desempenho da plataforma
                </p>
              </div>
              
              <div className="flex items-center gap-3">
                <Select
                  value={period}
                  onValueChange={setPeriod}
                >
                  <SelectTrigger className="w-[180px] rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Últimos 7 dias</SelectItem>
                    <SelectItem value="15">Últimos 15 dias</SelectItem>
                    <SelectItem value="30">Últimos 30 dias</SelectItem>
                    <SelectItem value="60">Últimos 60 dias</SelectItem>
                    <SelectItem value="90">Últimos 90 dias</SelectItem>
                  </SelectContent>
                </Select>
                
                <Button 
                  variant="outline" 
                  onClick={() => refetch()}
                  className="rounded-lg border-blue-200 hover:bg-blue-100"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Atualizar
                </Button>
                
                <Button 
                  variant="outline" 
                  onClick={exportToCSV}
                  className="rounded-lg border-blue-200 hover:bg-blue-100"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-8 px-6">
          {/* Cards de resumo */}
          <div className="grid gap-6 mb-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50 hover:shadow-2xl transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Total de Usuários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{data?.totalUsers || 0}</div>
                    <p className="text-xs text-gray-600 flex items-center mt-2">
                      <span className={`font-semibold ${data?.userGrowth && data.userGrowth > 0 ? "text-green-600" : "text-red-600"}`}>
                        {data?.userGrowth ? (data.userGrowth > 0 ? "+" : "") + data.userGrowth + "%" : "0%"}
                      </span>
                      <ArrowUpRight className={`ml-1 h-3 w-3 ${data?.userGrowth && data.userGrowth > 0 ? "text-green-600" : "text-red-600"}`} />
                      <span className="text-gray-500 ml-1">vs. período anterior</span>
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg">
                    <Users className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-green-50 hover:shadow-2xl transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-green-800 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Total de Agendamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{data?.totalAppointments || 0}</div>
                    <p className="text-xs text-gray-600 flex items-center mt-2">
                      <span className={`font-semibold ${data?.appointmentGrowth && data.appointmentGrowth > 0 ? "text-green-600" : "text-red-600"}`}>
                        {data?.appointmentGrowth ? (data.appointmentGrowth > 0 ? "+" : "") + data.appointmentGrowth + "%" : "0%"}
                      </span>
                      <ArrowUpRight className={`ml-1 h-3 w-3 ${data?.appointmentGrowth && data.appointmentGrowth > 0 ? "text-green-600" : "text-red-600"}`} />
                      <span className="text-gray-500 ml-1">vs. período anterior</span>
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-lg">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-purple-50 hover:shadow-2xl transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-purple-800 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Receita Total
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{formatCurrency(data?.totalRevenue || 0)}</div>
                    <p className="text-xs text-gray-600 flex items-center mt-2">
                      <span className={`font-semibold ${data?.revenueGrowth && data.revenueGrowth > 0 ? "text-green-600" : "text-red-600"}`}>
                        {data?.revenueGrowth ? (data.revenueGrowth > 0 ? "+" : "") + data.revenueGrowth + "%" : "0%"}
                      </span>
                      <ArrowUpRight className={`ml-1 h-3 w-3 ${data?.revenueGrowth && data.revenueGrowth > 0 ? "text-green-600" : "text-red-600"}`} />
                      <span className="text-gray-500 ml-1">vs. período anterior</span>
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-purple-500 to-pink-600 rounded-full shadow-lg">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-orange-50 hover:shadow-2xl transition-all">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-semibold text-orange-800 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Prestadores
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-gray-900">{data?.totalProviders || 0}</div>
                    <p className="text-xs text-gray-600 mt-2">
                      Taxa de conversão: <span className="font-semibold text-orange-600">
                        {data?.totalProviders && data?.totalUsers ? ((data.totalProviders / data.totalUsers) * 100).toFixed(1) : 0}%
                      </span>
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-full shadow-lg">
                    <Target className="h-6 w-6 text-white" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <Tabs defaultValue="general" onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 bg-white shadow-lg rounded-xl p-1">
              <TabsTrigger 
                value="general" 
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs sm:text-sm"
              >
                <BarChartIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Geral</span>
              </TabsTrigger>
              <TabsTrigger 
                value="services" 
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs sm:text-sm"
              >
                <PieChartIcon className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Serviços</span>
              </TabsTrigger>
              <TabsTrigger 
                value="providers" 
                className="flex items-center gap-2 rounded-lg data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md text-xs sm:text-sm"
              >
                <Users className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Prestadores</span>
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="general" className="space-y-6">
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Gráfico de agendamentos por dia */}
                <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
                      <Activity className="h-5 w-5 text-blue-500" />
                      Agendamentos por Dia
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Número de agendamentos realizados por dia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={data?.appointmentsPerDay.map(item => ({
                            ...item,
                            date: formatDate(item.date)
                          }))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" stroke="#6b7280" />
                          <YAxis stroke="#6b7280" />
                          <Tooltip 
                            formatter={(value) => [`${value} agendamentos`, 'Quantidade']}
                            labelFormatter={(label) => `Data: ${label}`}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone"
                            dataKey="count"
                            name="Agendamentos"
                            stroke="#3b82f6"
                            strokeWidth={3}
                            activeDot={{ r: 8, fill: '#3b82f6' }}
                            dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Gráfico de receita por dia */}
                <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-green-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-green-900 flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-green-500" />
                      Receita por Dia
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Valor total de agendamentos por dia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={data?.revenuePerDay.map(item => ({
                            ...item,
                            date: formatDate(item.date),
                            formattedAmount: item.amount / 100
                          }))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" stroke="#6b7280" />
                          <YAxis stroke="#6b7280" />
                          <Tooltip 
                            formatter={(value) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, 'Valor']}
                            labelFormatter={(label) => `Data: ${label}`}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend />
                          <Line 
                            type="monotone"
                            dataKey="formattedAmount"
                            name="Receita"
                            stroke="#10b981"
                            strokeWidth={3}
                            activeDot={{ r: 8, fill: '#10b981' }}
                            dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Distribuição de status */}
                <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-purple-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-purple-900 flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-purple-500" />
                      Distribuição por Status
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Distribuição dos agendamentos por status
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={data?.statusDistribution.map(item => ({
                              ...item,
                              name: STATUS_NAMES[item.status] || item.status
                            }))}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="count"
                            nameKey="name"
                            label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          >
                            {data?.statusDistribution.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            formatter={(value) => [`${value} agendamentos`, 'Quantidade']}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Novos usuários por dia */}
                <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-orange-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-orange-900 flex items-center gap-2">
                      <Users className="h-5 w-5 text-orange-500" />
                      Novos Usuários por Dia
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Número de novos cadastros por dia
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={data?.usersPerDay.map(item => ({
                            ...item,
                            date: formatDate(item.date)
                          }))}
                          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="date" stroke="#6b7280" />
                          <YAxis stroke="#6b7280" />
                          <Tooltip 
                            formatter={(value) => [`${value} usuários`, 'Quantidade']}
                            labelFormatter={(label) => `Data: ${label}`}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="count" name="Novos Usuários" fill="#f97316" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="services" className="space-y-6">
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Top serviços */}
                <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-green-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-green-900 flex items-center gap-2">
                      <BarChartIcon className="h-5 w-5 text-green-500" />
                      Serviços Mais Populares
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Serviços com maior número de agendamentos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={data?.topServices || []}
                          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" stroke="#6b7280" />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            width={80}
                            tick={{ fontSize: 12 }}
                            stroke="#6b7280"
                          />
                          <Tooltip
                            formatter={(value) => [`${value} agendamentos`, 'Quantidade']}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="count" name="Agendamentos" fill="#10b981" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Distribuição por categorias (fictício) */}
                <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
                      <PieChartIcon className="h-5 w-5 text-blue-500" />
                      Distribuição por Categoria
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Agendamentos por categoria de serviço
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center h-80">
                    <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                      <FileText className="h-12 w-12 text-blue-500" />
                    </div>
                    <div className="text-center text-gray-600">
                      <p className="font-semibold">Dados em desenvolvimento</p>
                      <p className="mt-2 text-sm">Esta visualização estará disponível em breve.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="providers" className="space-y-6">
              <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
                {/* Top prestadores */}
                <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-purple-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-purple-900 flex items-center gap-2">
                      <Users className="h-5 w-5 text-purple-500" />
                      Prestadores Mais Ativos
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Prestadores com maior número de agendamentos
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={data?.topProviders || []}
                          margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis type="number" stroke="#6b7280" />
                          <YAxis 
                            type="category" 
                            dataKey="name" 
                            width={80}
                            tick={{ fontSize: 12 }}
                            stroke="#6b7280"
                          />
                          <Tooltip
                            formatter={(value) => [`${value} agendamentos`, 'Quantidade']}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                          <Legend />
                          <Bar dataKey="count" name="Agendamentos" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Taxa de conversão (fictício) */}
                <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-pink-50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-bold text-pink-900 flex items-center gap-2">
                      <Target className="h-5 w-5 text-pink-500" />
                      Estatísticas de Prestadores
                    </CardTitle>
                    <CardDescription className="text-gray-600">
                      Métricas adicionais sobre prestadores
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-col items-center justify-center h-80">
                    <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                      <BarChart3 className="h-12 w-12 text-pink-500" />
                    </div>
                    <div className="text-center text-gray-600">
                      <p className="font-semibold">Dados em desenvolvimento</p>
                      <p className="mt-2 text-sm">Esta visualização estará disponível em breve.</p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </AdminLayout>
  );
}