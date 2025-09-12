import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChevronLeft, BarChart4, Calendar, TrendingUp, DollarSign, Users, Clock, Home, ClipboardList, Scissors, User, CreditCard, Banknote, ArrowDownToLine, CheckCircle, AlertCircle, XCircle } from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatCurrencyFromReais } from "@/lib/utils";
import ProviderLayout from "@/components/layout/provider-layout";
import AppHeader from "@/components/layout/app-header";
import type { ProviderAnalytics } from "@/types";
import { apiCall } from '@/lib/api';

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
  const { toast } = useToast();
  const [period, setPeriod] = useState<string>("month");
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const [withdrawalAmount, setWithdrawalAmount] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [pixKeyType, setPixKeyType] = useState<string>("cpf");
  
  // Buscar dados de análise
  const { data: analytics, isLoading } = useQuery<ProviderAnalytics>({
    queryKey: ["/api/provider/analytics", period],
    queryFn: async ({ queryKey }) => {
      const [_, selectedPeriod] = queryKey;
      const response = await apiCall(`/api/providers/analytics?period=${selectedPeriod}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar dados de análise');
      }
      return response.json();
    }
  });

  // Buscar solicitações de saque
  const { data: withdrawalRequests, isLoading: isLoadingWithdrawals, refetch: refetchWithdrawals } = useQuery({
    queryKey: ["/api/provider/withdrawal-requests"],
    queryFn: async () => {
      const response = await apiCall('/api/provider/withdrawal-requests');
      if (!response.ok) {
        throw new Error('Falha ao carregar solicitações de saque');
      }
      const result = await response.json();
      return result.data || [];
    }
  });

  // Mutation para solicitar saque
  const withdrawalMutation = useMutation({
    mutationFn: async (withdrawalData: {
      amount: number;
      pixKey: string;
      pixKeyType: string;
    }) => {
      const response = await apiCall('/api/provider/withdrawal-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(withdrawalData),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Erro ao solicitar saque');
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Solicitação enviada!",
        description: "Sua solicitação de saque foi enviada com sucesso. O pagamento será processado toda quinta-feira.",
      });
      setWithdrawalDialogOpen(false);
      setWithdrawalAmount("");
      setPixKey("");
      refetchWithdrawals(); // Refresh withdrawal requests list
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na solicitação",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleWithdrawalSubmit = () => {
    if (!withdrawalAmount || !pixKey) {
      toast({
        title: "Campos obrigatórios",
        description: "Por favor, preencha o valor e a chave PIX.",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(withdrawalAmount);
    if (amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "O valor deve ser maior que zero.",
        variant: "destructive",
      });
      return;
    }

    // Check if user already made a request today
    const today = new Date().toDateString();
    const hasRequestToday = withdrawalRequests?.some((request: any) => 
      new Date(request.requestedAt).toDateString() === today
    );

    if (hasRequestToday) {
      toast({
        title: "Limite diário atingido",
        description: "Você já fez uma solicitação de saque hoje. Apenas uma solicitação por dia é permitida.",
        variant: "destructive",
      });
      return;
    }

    withdrawalMutation.mutate({
      amount,
      pixKey,
      pixKeyType,
    });
  };

  const handlePeriodChange = (value: string) => {
    setPeriod(value);
  };

  // Check if user can make a withdrawal request today
  const today = new Date().toDateString();
  const hasRequestToday = withdrawalRequests?.some((request: any) => 
    new Date(request.requestedAt).toDateString() === today
  );

  return (
    <ProviderLayout>
      <div className="min-h-screen w-full bg-white relative overflow-hidden">
        {/* Professional Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#58c9d1]/8 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#58c9d1]/6 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(88,201,209,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(88,201,209,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40"></div>
        </div>
        
        <div className="relative z-10">
          <AppHeader title="Análise de Desempenho" showBackButton showUserInfo={false} showNotificationIcon={false} showMenuIcon={false} />
          
          <div className="p-4 md:p-6 lg:p-8 xl:p-12 space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12 w-full">
            {/* Header Section */}
            <div className="flex items-center justify-between mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] shadow-xl shadow-[#58c9d1]/30 mb-4">
                <BarChart4 className="h-8 w-8 text-white" />
              </div>
              <div className="flex items-center space-x-4">
                <Select value={period} onValueChange={handlePeriodChange}>
                  <SelectTrigger className="w-32 border-[#58c9d1]/30">
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
            </div>

        {isLoading ? (
          // Skeleton loading state
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="border border-[#58c9d1]/20">
                  <CardContent className="p-4">
                    <Skeleton className="h-4 w-1/2 mb-2" />
                    <Skeleton className="h-8 w-3/4" />
                  </CardContent>
                </Card>
              ))}
            </div>
            
            <Card className="border border-[#58c9d1]/20">
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
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg mb-2">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm text-neutral-500 font-medium">Total de agendamentos</p>
                  <p className="text-2xl font-medium text-[#58c9d1]">{analytics?.totalAppointments || 0}</p>
                </CardContent>
              </Card>
              
              <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                <CardContent className="p-4 flex flex-col items-center justify-center">
                  <div className="p-2 bg-gradient-to-r from-green-500 to-green-600 rounded-xl shadow-lg mb-2">
                    <DollarSign className="h-6 w-6 text-white" />
                  </div>
                  <p className="text-sm text-neutral-500 font-medium">Faturamento</p>
                  <p className="text-2xl font-medium text-[#58c9d1]">
                    {analytics?.totalRevenue ? formatCurrency(analytics.totalRevenue) : "R$ 0,00"}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Withdrawal Requests Section - MOVED TO TOP */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Withdrawal Request Form */}
              <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl md:text-2xl flex items-center font-medium">
                    <div className="p-3 bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] rounded-xl mr-4 shadow-lg">
                      <Banknote className="h-6 w-6 text-white" />
                    </div>
                    <span className="bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] bg-clip-text text-transparent">
                      Solicitação de Saque
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-col space-y-4">
                    <div className="flex-1">
                      <p className="text-sm text-neutral-600 mb-2 font-medium">
                        📅 <strong>Informação importante:</strong> O saque é feito para sua conta toda quinta-feira e contém taxa de transações do banco.
                      </p>
                      <p className="text-xs text-neutral-500">
                        Solicite seu saque e receba o valor em sua conta PIX nas próximas quintas-feiras.
                      </p>
                      {hasRequestToday && (
                        <p className="text-xs text-amber-600 mt-2 font-medium">
                          ⚠️ Você já fez uma solicitação de saque hoje. Apenas uma solicitação por dia é permitida.
                        </p>
                      )}
                    </div>
                    <Dialog open={withdrawalDialogOpen} onOpenChange={(open) => {
                      if (!hasRequestToday) {
                        setWithdrawalDialogOpen(open);
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          className="w-full bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] hover:from-[#4aadb5] hover:to-[#58c9d1] text-white font-medium shadow-lg shadow-[#58c9d1]/30 hover:shadow-xl hover:shadow-[#58c9d1]/40 transition-all duration-300 transform hover:scale-105 border-0 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                          size="lg"
                          disabled={hasRequestToday}
                        >
                          <ArrowDownToLine className="h-5 w-5 mr-2" />
                          <span className="font-medium">
                            {hasRequestToday ? "Limite Diário Atingido" : "Solicitar Saque"}
                          </span>
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-lg bg-gradient-to-br from-white/95 via-white/90 to-slate-50/80 backdrop-blur-2xl border-0 shadow-3xl shadow-slate-900/20 rounded-3xl overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#58c9d1]/5 via-transparent to-[#58c9d1]/5 opacity-50"></div>
                        <DialogHeader className="relative z-10">
                          <DialogTitle className="text-2xl font-medium bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] bg-clip-text text-transparent flex items-center">
                            <div className="p-2 bg-gradient-to-br from-[#58c9d1] to-[#4aadb5] rounded-xl mr-3 shadow-lg">
                              <CreditCard className="h-6 w-6 text-white" />
                            </div>
                            💰 Solicitar Saque
                          </DialogTitle>
                          <DialogDescription className="text-lg text-slate-700 font-medium mt-3">
                            Preencha os dados para solicitar seu saque via PIX
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 relative z-10">
                          <div>
                            <Label htmlFor="amount" className="text-sm font-medium text-neutral-700">Valor do Saque (R$)</Label>
                            <Input
                              id="amount"
                              type="number"
                              step="0.01"
                              min="0"
                              value={withdrawalAmount}
                              onChange={(e) => setWithdrawalAmount(e.target.value)}
                              placeholder="0,00"
                              className="mt-1 border-[#58c9d1]/30 focus:border-[#58c9d1]"
                            />
                          </div>
                          <div>
                            <Label htmlFor="pixKeyType" className="text-sm font-medium text-neutral-700">Tipo da Chave PIX</Label>
                            <Select value={pixKeyType} onValueChange={setPixKeyType}>
                              <SelectTrigger className="mt-1 border-[#58c9d1]/30">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="z-[10001] bg-white">
                                <SelectItem value="cpf">CPF</SelectItem>
                                <SelectItem value="cnpj">CNPJ</SelectItem>
                                <SelectItem value="email">E-mail</SelectItem>
                                <SelectItem value="phone">Telefone</SelectItem>
                                <SelectItem value="random">Chave Aleatória</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="pixKey" className="text-sm font-medium text-neutral-700">Chave PIX</Label>
                            <Input
                              id="pixKey"
                              value={pixKey}
                              onChange={(e) => setPixKey(e.target.value)}
                              placeholder={`Digite sua chave PIX (${pixKeyType})`}
                              className="mt-1 border-[#58c9d1]/30 focus:border-[#58c9d1]"
                            />
                          </div>
                          <div className="flex space-x-4 mt-6">
                            <Button 
                              variant="outline" 
                              onClick={() => setWithdrawalDialogOpen(false)}
                              className="flex-1 border-[#58c9d1]/30 text-[#58c9d1] hover:bg-[#58c9d1]/10"
                            >
                              Cancelar
                            </Button>
                            <Button 
                              onClick={handleWithdrawalSubmit}
                              disabled={withdrawalMutation.isPending}
                              className="flex-1 bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] hover:from-[#4aadb5] hover:to-[#58c9d1] text-white font-medium shadow-lg shadow-[#58c9d1]/30 hover:shadow-xl hover:shadow-[#58c9d1]/40 transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:transform-none border-0 rounded-xl"
                            >
                              {withdrawalMutation.isPending ? "Enviando..." : "Solicitar Saque"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* My Withdrawal Requests - Quick View */}
              <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-[#58c9d1] flex items-center">
                    <ClipboardList className="h-5 w-5 mr-2" />
                    Minhas Solicitações Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingWithdrawals ? (
                    <div className="space-y-3">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                          <div className="space-y-2">
                            <div className="h-4 bg-neutral-200 rounded w-20"></div>
                            <div className="h-3 bg-neutral-100 rounded w-24"></div>
                          </div>
                          <div className="h-6 bg-neutral-200 rounded w-16"></div>
                        </div>
                      ))}
                    </div>
                  ) : withdrawalRequests && withdrawalRequests.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {withdrawalRequests.slice(0, 3).map((request: any) => {
                        const getStatusIcon = (status: string) => {
                          switch (status) {
                            case 'completed':
                              return <CheckCircle className="h-4 w-4 text-green-500" />;
                            case 'pending':
                              return <AlertCircle className="h-4 w-4 text-yellow-500" />;
                            case 'processing':
                              return <Clock className="h-4 w-4 text-blue-500" />;
                            case 'failed':
                              return <XCircle className="h-4 w-4 text-red-500" />;
                            default:
                              return <AlertCircle className="h-4 w-4 text-gray-500" />;
                          }
                        };

                        const getStatusText = (status: string) => {
                          switch (status) {
                            case 'completed': return 'Concluído';
                            case 'pending': return 'Pendente';
                            case 'processing': return 'Processando';
                            case 'failed': return 'Falhou';
                            default: return status;
                          }
                        };

                        return (
                          <div key={request.id} className="flex items-center justify-between p-3 border border-neutral-100 rounded-lg hover:bg-neutral-50 transition-colors">
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(request.status)}
                              <div>
                                <p className="font-medium text-sm text-gray-900">
                                  {formatCurrencyFromReais(request.amount)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(request.requestedAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-600">
                              {getStatusText(request.status)}
                            </span>
                          </div>
                        );
                      })}
                      {withdrawalRequests.length > 3 && (
                        <div className="text-center pt-2">
                          <p className="text-xs text-gray-500">Ver todas na aba "Saques"</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Banknote className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Nenhuma solicitação ainda</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Abas para os diferentes tipos de dados */}
            <Tabs defaultValue="appointments" className="w-full">
              <TabsList className="w-full justify-start mb-4 overflow-x-auto whitespace-nowrap bg-white border border-[#58c9d1]/20 shadow-lg shadow-[#58c9d1]/10 rounded-xl p-1">
                <TabsTrigger value="appointments" className="flex items-center text-sm md:text-base px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#58c9d1] data-[state=active]:to-[#4aadb5] data-[state=active]:text-white data-[state=active]:shadow-md font-medium transition-all duration-300 rounded-lg">
                  <BarChart4 className="h-4 w-4 mr-2" />
                  <span>Agendamentos</span>
                </TabsTrigger>
                <TabsTrigger value="revenue" className="flex items-center text-sm md:text-base px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#58c9d1] data-[state=active]:to-[#4aadb5] data-[state=active]:text-white data-[state=active]:shadow-md font-medium transition-all duration-300 rounded-lg">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span>Faturamento</span>
                </TabsTrigger>

                <TabsTrigger value="withdrawals" className="flex items-center text-sm md:text-base px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#58c9d1] data-[state=active]:to-[#4aadb5] data-[state=active]:text-white data-[state=active]:shadow-md font-medium transition-all duration-300 rounded-lg">
                  <Banknote className="h-4 w-4 mr-2" />
                  <span>Saques</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Conteúdo: Agendamentos */}
              <TabsContent value="appointments">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status dos agendamentos */}
                  <Card className="md:col-span-1 border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-[#58c9d1]">Status dos agendamentos</CardTitle>
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
                  <Card className="md:col-span-2 border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-[#58c9d1]">Agendamentos por mês</CardTitle>
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
              

              
              {/* Conteúdo: Solicitações de Saque */}
              <TabsContent value="withdrawals">
                <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-[#58c9d1] flex items-center">
                      <Banknote className="h-5 w-5 mr-2" />
                      Minhas Solicitações de Saque
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingWithdrawals ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                            <div className="space-y-2">
                              <div className="h-4 bg-neutral-200 rounded w-24"></div>
                              <div className="h-3 bg-neutral-100 rounded w-32"></div>
                            </div>
                            <div className="h-6 bg-neutral-200 rounded w-16"></div>
                          </div>
                        ))}
                      </div>
                    ) : withdrawalRequests && withdrawalRequests.length > 0 ? (
                      <div className="space-y-3">
                        {withdrawalRequests.map((request: any) => {
                          const getStatusIcon = (status: string) => {
                            switch (status) {
                              case 'completed':
                                return <CheckCircle className="h-5 w-5 text-green-500" />;
                              case 'pending':
                                return <AlertCircle className="h-5 w-5 text-yellow-500" />;
                              case 'processing':
                                return <Clock className="h-5 w-5 text-blue-500" />;
                              case 'failed':
                                return <XCircle className="h-5 w-5 text-red-500" />;
                              default:
                                return <AlertCircle className="h-5 w-5 text-gray-500" />;
                            }
                          };

                          const getStatusText = (status: string) => {
                            switch (status) {
                              case 'completed':
                                return 'Concluído';
                              case 'pending':
                                return 'Pendente';
                              case 'processing':
                                return 'Processando';
                              case 'failed':
                                return 'Falhou';
                              default:
                                return status;
                            }
                          };

                          const getStatusColor = (status: string) => {
                            switch (status) {
                              case 'completed':
                                return 'text-green-600 bg-green-50 border-green-200';
                              case 'pending':
                                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
                              case 'processing':
                                return 'text-blue-600 bg-blue-50 border-blue-200';
                              case 'failed':
                                return 'text-red-600 bg-red-50 border-red-200';
                              default:
                                return 'text-gray-600 bg-gray-50 border-gray-200';
                            }
                          };

                          return (
                            <div key={request.id} className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(request.status)}
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {formatCurrencyFromReais(request.amount)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {request.pixInfo?.pixKey} ({request.pixInfo?.pixKeyType?.toUpperCase()})
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                                  {getStatusText(request.status)}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(request.requestedAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg font-medium">Nenhuma solicitação de saque encontrada</p>
                        <p className="text-gray-400 text-sm mt-1">Suas solicitações de saque aparecerão aqui</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
    </ProviderLayout>
  );
                              {withdrawalMutation.isPending ? "Enviando..." : "Solicitar Saque"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>

              {/* My Withdrawal Requests - Quick View */}
              <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                <CardHeader>
                  <CardTitle className="text-lg font-medium text-[#58c9d1] flex items-center">
                    <ClipboardList className="h-5 w-5 mr-2" />
                    Minhas Solicitações Recentes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {isLoadingWithdrawals ? (
                    <div className="space-y-3">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between p-3 border border-neutral-200 rounded-lg">
                          <div className="space-y-2">
                            <div className="h-4 bg-neutral-200 rounded w-20"></div>
                            <div className="h-3 bg-neutral-100 rounded w-24"></div>
                          </div>
                          <div className="h-6 bg-neutral-200 rounded w-16"></div>
                        </div>
                      ))}
                    </div>
                  ) : withdrawalRequests && withdrawalRequests.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {withdrawalRequests.slice(0, 3).map((request: any) => {
                        const getStatusIcon = (status: string) => {
                          switch (status) {
                            case 'completed':
                              return <CheckCircle className="h-4 w-4 text-green-500" />;
                            case 'pending':
                              return <AlertCircle className="h-4 w-4 text-yellow-500" />;
                            case 'processing':
                              return <Clock className="h-4 w-4 text-blue-500" />;
                            case 'failed':
                              return <XCircle className="h-4 w-4 text-red-500" />;
                            default:
                              return <AlertCircle className="h-4 w-4 text-gray-500" />;
                          }
                        };

                        const getStatusText = (status: string) => {
                          switch (status) {
                            case 'completed': return 'Concluído';
                            case 'pending': return 'Pendente';
                            case 'processing': return 'Processando';
                            case 'failed': return 'Falhou';
                            default: return status;
                          }
                        };

                        return (
                          <div key={request.id} className="flex items-center justify-between p-3 border border-neutral-100 rounded-lg hover:bg-neutral-50 transition-colors">
                            <div className="flex items-center space-x-3">
                              {getStatusIcon(request.status)}
                              <div>
                                <p className="font-medium text-sm text-gray-900">
                                  {formatCurrencyFromReais(request.amount)}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {new Date(request.requestedAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-gray-600">
                              {getStatusText(request.status)}
                            </span>
                          </div>
                        );
                      })}
                      {withdrawalRequests.length > 3 && (
                        <div className="text-center pt-2">
                          <p className="text-xs text-gray-500">Ver todas na aba "Saques"</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6">
                      <Banknote className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-gray-500 text-sm">Nenhuma solicitação ainda</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
            
            {/* Abas para os diferentes tipos de dados */}
            <Tabs defaultValue="appointments" className="w-full">
              <TabsList className="w-full justify-start mb-4 overflow-x-auto whitespace-nowrap bg-white border border-[#58c9d1]/20 shadow-lg shadow-[#58c9d1]/10 rounded-xl p-1">
                <TabsTrigger value="appointments" className="flex items-center text-sm md:text-base px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#58c9d1] data-[state=active]:to-[#4aadb5] data-[state=active]:text-white data-[state=active]:shadow-md font-medium transition-all duration-300 rounded-lg">
                  <BarChart4 className="h-4 w-4 mr-2" />
                  <span>Agendamentos</span>
                </TabsTrigger>
                <TabsTrigger value="revenue" className="flex items-center text-sm md:text-base px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#58c9d1] data-[state=active]:to-[#4aadb5] data-[state=active]:text-white data-[state=active]:shadow-md font-medium transition-all duration-300 rounded-lg">
                  <DollarSign className="h-4 w-4 mr-2" />
                  <span>Faturamento</span>
                </TabsTrigger>

                <TabsTrigger value="withdrawals" className="flex items-center text-sm md:text-base px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#58c9d1] data-[state=active]:to-[#4aadb5] data-[state=active]:text-white data-[state=active]:shadow-md font-medium transition-all duration-300 rounded-lg">
                  <Banknote className="h-4 w-4 mr-2" />
                  <span>Saques</span>
                </TabsTrigger>
              </TabsList>
              
              {/* Conteúdo: Agendamentos */}
              <TabsContent value="appointments">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Status dos agendamentos */}
                  <Card className="md:col-span-1 border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-[#58c9d1]">Status dos agendamentos</CardTitle>
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
                  <Card className="md:col-span-2 border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                    <CardHeader>
                      <CardTitle className="text-lg font-medium text-[#58c9d1]">Agendamentos por mês</CardTitle>
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
              

              
              {/* Conteúdo: Solicitações de Saque */}
              <TabsContent value="withdrawals">
                <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                  <CardHeader>
                    <CardTitle className="text-lg font-medium text-[#58c9d1] flex items-center">
                      <Banknote className="h-5 w-5 mr-2" />
                      Minhas Solicitações de Saque
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {isLoadingWithdrawals ? (
                      <div className="space-y-3">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg">
                            <div className="space-y-2">
                              <div className="h-4 bg-neutral-200 rounded w-24"></div>
                              <div className="h-3 bg-neutral-100 rounded w-32"></div>
                            </div>
                            <div className="h-6 bg-neutral-200 rounded w-16"></div>
                          </div>
                        ))}
                      </div>
                    ) : withdrawalRequests && withdrawalRequests.length > 0 ? (
                      <div className="space-y-3">
                        {withdrawalRequests.map((request: any) => {
                          const getStatusIcon = (status: string) => {
                            switch (status) {
                              case 'completed':
                                return <CheckCircle className="h-5 w-5 text-green-500" />;
                              case 'pending':
                                return <AlertCircle className="h-5 w-5 text-yellow-500" />;
                              case 'processing':
                                return <Clock className="h-5 w-5 text-blue-500" />;
                              case 'failed':
                                return <XCircle className="h-5 w-5 text-red-500" />;
                              default:
                                return <AlertCircle className="h-5 w-5 text-gray-500" />;
                            }
                          };

                          const getStatusText = (status: string) => {
                            switch (status) {
                              case 'completed':
                                return 'Concluído';
                              case 'pending':
                                return 'Pendente';
                              case 'processing':
                                return 'Processando';
                              case 'failed':
                                return 'Falhou';
                              default:
                                return status;
                            }
                          };

                          const getStatusColor = (status: string) => {
                            switch (status) {
                              case 'completed':
                                return 'text-green-600 bg-green-50 border-green-200';
                              case 'pending':
                                return 'text-yellow-600 bg-yellow-50 border-yellow-200';
                              case 'processing':
                                return 'text-blue-600 bg-blue-50 border-blue-200';
                              case 'failed':
                                return 'text-red-600 bg-red-50 border-red-200';
                              default:
                                return 'text-gray-600 bg-gray-50 border-gray-200';
                            }
                          };

                          return (
                            <div key={request.id} className="flex items-center justify-between p-4 border border-neutral-200 rounded-lg hover:bg-neutral-50 transition-colors">
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  {getStatusIcon(request.status)}
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {formatCurrencyFromReais(request.amount)}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {request.pixInfo?.pixKey} ({request.pixInfo?.pixKeyType?.toUpperCase()})
                                    </p>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(request.status)}`}>
                                  {getStatusText(request.status)}
                                </span>
                                <p className="text-xs text-gray-500 mt-1">
                                  {new Date(request.requestedAt).toLocaleDateString('pt-BR')}
                                </p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <Banknote className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg font-medium">Nenhuma solicitação de saque encontrada</p>
                        <p className="text-gray-400 text-sm mt-1">Suas solicitações de saque aparecerão aqui</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </ProviderLayout>
  );
}

export default AnalyticsPage;
