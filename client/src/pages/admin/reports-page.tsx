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
  TrendingUp
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

  const { data, isLoading } = useQuery({
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
        <div className="container mx-auto py-6">
          <h1 className="text-2xl font-bold mb-6">Relatórios e Análises</h1>
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Relatórios e Análises</h1>
          
          <div className="flex items-center gap-2 mt-4 md:mt-0">
            <Select
              value={period}
              onValueChange={setPeriod}
            >
              <SelectTrigger className="w-[180px]">
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
            
            <Button variant="outline" onClick={exportToCSV}>
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </div>
        
        {/* Cards de resumo */}
        <div className="grid gap-4 mb-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{data?.totalUsers || 0}</div>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <span className={data?.userGrowth && data.userGrowth > 0 ? "text-green-500" : "text-red-500"}>
                      {data?.userGrowth ? (data.userGrowth > 0 ? "+" : "") + data.userGrowth + "%" : "0%"}
                    </span>
                    <ArrowUpRight className={`ml-1 h-3 w-3 ${data?.userGrowth && data.userGrowth > 0 ? "text-green-500" : "text-red-500"}`} />
                    <span className="text-muted-foreground ml-1">vs. período anterior</span>
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total de Agendamentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{data?.totalAppointments || 0}</div>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <span className={data?.appointmentGrowth && data.appointmentGrowth > 0 ? "text-green-500" : "text-red-500"}>
                      {data?.appointmentGrowth ? (data.appointmentGrowth > 0 ? "+" : "") + data.appointmentGrowth + "%" : "0%"}
                    </span>
                    <ArrowUpRight className={`ml-1 h-3 w-3 ${data?.appointmentGrowth && data.appointmentGrowth > 0 ? "text-green-500" : "text-red-500"}`} />
                    <span className="text-muted-foreground ml-1">vs. período anterior</span>
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{formatCurrency(data?.totalRevenue || 0)}</div>
                  <p className="text-xs text-muted-foreground flex items-center mt-1">
                    <span className={data?.revenueGrowth && data.revenueGrowth > 0 ? "text-green-500" : "text-red-500"}>
                      {data?.revenueGrowth ? (data.revenueGrowth > 0 ? "+" : "") + data.revenueGrowth + "%" : "0%"}
                    </span>
                    <ArrowUpRight className={`ml-1 h-3 w-3 ${data?.revenueGrowth && data.revenueGrowth > 0 ? "text-green-500" : "text-red-500"}`} />
                    <span className="text-muted-foreground ml-1">vs. período anterior</span>
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Prestadores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold">{data?.totalProviders || 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Taxa de conversão: {data?.totalProviders && data?.totalUsers ? ((data.totalProviders / data.totalUsers) * 100).toFixed(1) : 0}%
                  </p>
                </div>
                <div className="p-2 bg-primary/10 rounded-full">
                  <Users className="h-5 w-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="general" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="general" className="flex items-center gap-2">
              <BarChartIcon className="h-4 w-4" />
              <span>Geral</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <PieChartIcon className="h-4 w-4" />
              <span>Serviços</span>
            </TabsTrigger>
            <TabsTrigger value="providers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Prestadores</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="general">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Gráfico de agendamentos por dia */}
              <Card>
                <CardHeader>
                  <CardTitle>Agendamentos por Dia</CardTitle>
                  <CardDescription>
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
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [`${value} agendamentos`, 'Quantidade']}
                          labelFormatter={(label) => `Data: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone"
                          dataKey="count"
                          name="Agendamentos"
                          stroke="#8884d8"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Gráfico de receita por dia */}
              <Card>
                <CardHeader>
                  <CardTitle>Receita por Dia</CardTitle>
                  <CardDescription>
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
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [`R$ ${Number(value).toFixed(2).replace('.', ',')}`, 'Valor']}
                          labelFormatter={(label) => `Data: ${label}`}
                        />
                        <Legend />
                        <Line 
                          type="monotone"
                          dataKey="formattedAmount"
                          name="Receita"
                          stroke="#82ca9d"
                          activeDot={{ r: 8 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Distribuição de status */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Status</CardTitle>
                  <CardDescription>
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
                        />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Novos usuários por dia */}
              <Card>
                <CardHeader>
                  <CardTitle>Novos Usuários por Dia</CardTitle>
                  <CardDescription>
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
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value) => [`${value} usuários`, 'Quantidade']}
                          labelFormatter={(label) => `Data: ${label}`}
                        />
                        <Legend />
                        <Bar dataKey="count" name="Novos Usuários" fill="#0088FE" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="services">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Top serviços */}
              <Card>
                <CardHeader>
                  <CardTitle>Serviços Mais Populares</CardTitle>
                  <CardDescription>
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
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={80}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value) => [`${value} agendamentos`, 'Quantidade']}
                        />
                        <Legend />
                        <Bar dataKey="count" name="Agendamentos" fill="#00C49F" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Distribuição por categorias (fictício) */}
              <Card>
                <CardHeader>
                  <CardTitle>Distribuição por Categoria</CardTitle>
                  <CardDescription>
                    Agendamentos por categoria de serviço
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-80">
                  <div className="text-center text-muted-foreground">
                    <p>Dados para esta visualização ainda não estão disponíveis.</p>
                    <p className="mt-2">Por favor, verifique novamente mais tarde.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="providers">
            <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
              {/* Top prestadores */}
              <Card>
                <CardHeader>
                  <CardTitle>Prestadores Mais Ativos</CardTitle>
                  <CardDescription>
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
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis 
                          type="category" 
                          dataKey="name" 
                          width={80}
                          tick={{ fontSize: 12 }}
                        />
                        <Tooltip
                          formatter={(value) => [`${value} agendamentos`, 'Quantidade']}
                        />
                        <Legend />
                        <Bar dataKey="count" name="Agendamentos" fill="#FFBB28" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
              
              {/* Taxa de conversão (fictício) */}
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas de Prestadores</CardTitle>
                  <CardDescription>
                    Métricas adicionais sobre prestadores
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center justify-center h-80">
                  <div className="text-center text-muted-foreground">
                    <p>Dados para esta visualização ainda não estão disponíveis.</p>
                    <p className="mt-2">Por favor, verifique novamente mais tarde.</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}