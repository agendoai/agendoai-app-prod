import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChevronLeft, BarChart4, Calendar, TrendingUp, PieChart as PieChartIcon, DollarSign, Users, Clock } from "lucide-react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import ProviderLayout from "@/components/layout/provider-layout";
import type { ProviderAnalytics } from "@/types";

// Cores para gráficos
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
const STATUS_COLORS = {
  completed: '#16a34a',  // verde
  pending: '#3b82f6',    // azul
  confirmed: '#8b5cf6',  // roxo
  canceled: '#ef4444'    // vermelho
};

// Nomes dos dias da semana
const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

// Função para formatar os labels dos meses
const formatMonth = (month: string) => {
  const [year, monthNum] = month.split('-');
  const date = new Date(parseInt(year), parseInt(monthNum) - 1);
  return date.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });
};

export default function AnalyticsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [period, setPeriod] = useState<string>("month");
  
  // Buscar dados de análise
  const { data: analytics, isLoading } = useQuery<ProviderAnalytics>({
    queryKey: ["/api/provider/analytics", period],
    queryFn: async ({ queryKey }) => {
      const [_, selectedPeriod] = queryKey;
      const response = await fetch(`/api/provider/analytics?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar dados de análise');
      }
      return response.json();
    }
  });

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
  };

  return (
    <ProviderLayout>
      <div className="p-4">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate("/provider/dashboard")}
              className="mr-2"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-2xl font-bold">Análise de Desempenho</h1>
          </div>
          <Select value={period} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">Semana</SelectItem>
              <SelectItem value="month">Mês</SelectItem>
              <SelectItem value="year">Ano</SelectItem>
              <SelectItem value="all">Tudo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          // Skeleton loading state
          <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-8 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Cartões de resumo */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-blue-50">
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <Calendar className="h-8 w-8 text-blue-500 mb-2" />
                  <p className="text-sm text-neutral-500">Total de agendamentos</p>
                  <p className="text-2xl font-bold">{analytics?.totalAppointments || 0}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50">
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <DollarSign className="h-8 w-8 text-green-500 mb-2" />
                  <p className="text-sm text-neutral-500">Faturamento</p>
                  <p className="text-2xl font-bold">{formatCurrency(analytics?.totalRevenue)}</p>
                </CardContent>
              </Card>
              
              <Card className="bg-purple-50">
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <Users className="h-8 w-8 text-purple-500 mb-2" />
                  <p className="text-sm text-neutral-500">Avaliações</p>
                  <p className="text-2xl font-bold flex items-center">
                    {analytics?.averageRating || 0}<span className="text-sm ml-1">({analytics?.totalReviews || 0})</span>
                  </p>
                </CardContent>
              </Card>
              
              <Card className="bg-amber-50">
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <TrendingUp className="h-8 w-8 text-amber-500 mb-2" />
                  <p className="text-sm text-neutral-500">Taxa de conclusão</p>
                  <p className="text-2xl font-bold">
                    {analytics && analytics.totalAppointments > 0
                      ? `${Math.round((analytics.completedAppointments / analytics.totalAppointments) * 100)}%`
                      : '0%'
                    }
                  </p>
                </CardContent>
              </Card>
            </div>
            
            {/* Abas para os diferentes tipos de dados */}
            <Tabs defaultValue="appointments" className="w-full">
              <TabsList className="w-full justify-start mb-4 overflow-x-auto whitespace-nowrap">
                <TabsTrigger value="appointments" className="flex items-center">
                  <BarChart4 className="h-4 w-4 mr-2" />
                  <span>Agendamentos</span>
                </TabsTrigger>
                <TabsTrigger value="revenue" className="flex items-center">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span>Faturamento</span>
                </TabsTrigger>
                <TabsTrigger value="services" className="flex items-center">
                  <PieChartIcon className="h-4 w-4 mr-2" />
                  <span>Serviços</span>
                </TabsTrigger>
                <TabsTrigger value="timing" className="flex items-center">
                  <Clock className="h-4 w-4 mr-2" />
                  <span>Horários</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Conteúdo: Agendamentos */}
              <TabsContent value="appointments">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status dos agendamentos */}
                  <Card className="md:col-span-1">
                    <CardHeader>
                      <CardTitle className="text-lg">Status dos agendamentos</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics && (
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: 'Concluídos', value: analytics.completedAppointments },
                                { name: 'Pendentes', value: analytics.pendingAppointments },
                                { name: 'Cancelados', value: analytics.canceledAppointments }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={40}
                              outerRadius={80}
                              fill="#8884d8"
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                              labelLine={false}
                            >
                              <Cell key="completed" fill={STATUS_COLORS.completed} />
                              <Cell key="pending" fill={STATUS_COLORS.pending} />
                              <Cell key="canceled" fill={STATUS_COLORS.canceled} />
                            </Pie>
                            <Tooltip formatter={(value) => [value, 'Quantidade']} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                      <div className="grid grid-cols-3 text-center mt-4">
                        <div>
                          <div className="w-3 h-3 bg-green-500 rounded-full inline-block mr-1"></div>
                          <p className="text-xs">Concluídos</p>
                          <p className="font-bold">{analytics?.completedAppointments || 0}</p>
                        </div>
                        <div>
                          <div className="w-3 h-3 bg-blue-500 rounded-full inline-block mr-1"></div>
                          <p className="text-xs">Pendentes</p>
                          <p className="font-bold">{analytics?.pendingAppointments || 0}</p>
                        </div>
                        <div>
                          <div className="w-3 h-3 bg-red-500 rounded-full inline-block mr-1"></div>
                          <p className="text-xs">Cancelados</p>
                          <p className="font-bold">{analytics?.canceledAppointments || 0}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Agendamentos por mês */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="text-lg">Agendamentos por mês</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics?.appointmentsByMonth && analytics.appointmentsByMonth.length > 0 ? (
                        <ResponsiveContainer width="100%" height={250}>
                          <BarChart
                            data={analytics.appointmentsByMonth.map(item => ({
                              ...item,
                              month: formatMonth(item.month)
                            }))}
                            margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                              angle={-45} 
                              textAnchor="end" 
                              height={70}
                              interval={0}
                            />
                            <YAxis />
                            <Tooltip formatter={(value) => [value, 'Agendamentos']} />
                            <Bar dataKey="count" fill="#3b82f6" barSize={30} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[250px] flex items-center justify-center">
                          <p className="text-neutral-500">Dados insuficientes para exibir o gráfico</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Tendências de agendamentos */}
                  {analytics?.appointmentTrends && analytics.appointmentTrends.length > 0 && (
                    <Card className="md:col-span-3">
                      <CardHeader>
                        <CardTitle className="text-lg">Tendências de agendamentos</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Período</th>
                                <th className="text-right p-2">Atual</th>
                                <th className="text-right p-2">Anterior</th>
                                <th className="text-right p-2">Variação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.appointmentTrends.map((trend, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                  <td className="p-2">{formatMonth(trend.month)}</td>
                                  <td className="text-right p-2">{trend.count}</td>
                                  <td className="text-right p-2">{trend.previousCount}</td>
                                  <td className={`text-right p-2 ${trend.percentChange > 0 ? 'text-green-500' : trend.percentChange < 0 ? 'text-red-500' : ''}`}>
                                    {trend.percentChange > 0 ? '+' : ''}{trend.percentChange}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
              
              {/* Conteúdo: Faturamento */}
              <TabsContent value="revenue">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Receita por mês */}
                  <Card className="md:col-span-3">
                    <CardHeader>
                      <CardTitle className="text-lg">Receita por mês</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics?.revenueByMonth && analytics.revenueByMonth.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <LineChart
                            data={analytics.revenueByMonth.map(item => ({
                              ...item,
                              month: formatMonth(item.month),
                              formattedTotal: item.total / 100 // Para exibir em reais no tooltip
                            }))}
                            margin={{ top: 10, right: 30, left: 0, bottom: 30 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis 
                              dataKey="month" 
                              angle={-45} 
                              textAnchor="end" 
                              height={70}
                              interval={0}
                            />
                            <YAxis />
                            <Tooltip 
                              formatter={(value, name) => {
                                if (name === "total") return [formatCurrency(value as number), "Receita"];
                                return [value, name];
                              }} 
                            />
                            <Line 
                              type="monotone" 
                              dataKey="total" 
                              stroke="#16a34a" 
                              strokeWidth={2} 
                              dot={{ r: 4 }} 
                              activeDot={{ r: 6 }} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center">
                          <p className="text-neutral-500">Dados insuficientes para exibir o gráfico</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Tendências de receita */}
                  {analytics?.revenueTrends && analytics.revenueTrends.length > 0 && (
                    <Card className="md:col-span-3">
                      <CardHeader>
                        <CardTitle className="text-lg">Tendências de receita</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Período</th>
                                <th className="text-right p-2">Atual</th>
                                <th className="text-right p-2">Anterior</th>
                                <th className="text-right p-2">Variação</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.revenueTrends.map((trend, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                  <td className="p-2">{formatMonth(trend.month)}</td>
                                  <td className="text-right p-2">{formatCurrency(trend.total)}</td>
                                  <td className="text-right p-2">{formatCurrency(trend.previousTotal)}</td>
                                  <td className={`text-right p-2 ${trend.percentChange > 0 ? 'text-green-500' : trend.percentChange < 0 ? 'text-red-500' : ''}`}>
                                    {trend.percentChange > 0 ? '+' : ''}{trend.percentChange}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
              
              {/* Conteúdo: Serviços */}
              <TabsContent value="services">
                {/* Serviços mais populares */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Serviços mais populares</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {analytics?.topServices && analytics.topServices.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={analytics.topServices}
                                cx="50%"
                                cy="50%"
                                labelLine={false}
                                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="count"
                              >
                                {analytics.topServices.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <Tooltip formatter={(value, name, props) => {
                                const service = analytics.topServices.find(s => s.count === value);
                                return [value, service?.name || ''];
                              }} />
                            </PieChart>
                          </ResponsiveContainer>
                        </div>
                        
                        <div>
                          <table className="w-full">
                            <thead>
                              <tr className="border-b">
                                <th className="text-left p-2">Serviço</th>
                                <th className="text-right p-2">Agendamentos</th>
                                <th className="text-right p-2">Receita</th>
                              </tr>
                            </thead>
                            <tbody>
                              {analytics.topServices.map((service, index) => (
                                <tr key={index} className="border-b hover:bg-gray-50">
                                  <td className="p-2">
                                    <div className="flex items-center">
                                      <div 
                                        className="w-3 h-3 rounded-full mr-2" 
                                        style={{ backgroundColor: COLORS[index % COLORS.length] }}
                                      ></div>
                                      {service.name}
                                    </div>
                                  </td>
                                  <td className="text-right p-2">{service.count}</td>
                                  <td className="text-right p-2">{formatCurrency(service.revenue)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ) : (
                      <div className="h-[300px] flex items-center justify-center">
                        <p className="text-neutral-500">Dados insuficientes para exibir o gráfico</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Conteúdo: Horários */}
              <TabsContent value="timing">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Horários mais ocupados */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Horários mais ocupados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics?.busyHours && analytics.busyHours.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={analytics.busyHours.map(item => ({
                              ...item,
                              hour: `${item.hour}h`
                            }))}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="hour" />
                            <YAxis />
                            <Tooltip formatter={(value) => [value, 'Agendamentos']} />
                            <Bar dataKey="count" fill="#8884d8" barSize={30} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center">
                          <p className="text-neutral-500">Dados insuficientes para exibir o gráfico</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                  
                  {/* Dias mais ocupados */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Dias mais ocupados</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {analytics?.busyDays && analytics.busyDays.length > 0 ? (
                        <ResponsiveContainer width="100%" height={300}>
                          <BarChart
                            data={analytics.busyDays.map(item => ({
                              ...item,
                              day: DAYS_OF_WEEK[item.day]
                            }))}
                            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip formatter={(value) => [value, 'Agendamentos']} />
                            <Bar dataKey="count" fill="#82ca9d" barSize={30} />
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="h-[300px] flex items-center justify-center">
                          <p className="text-neutral-500">Dados insuficientes para exibir o gráfico</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
            
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}