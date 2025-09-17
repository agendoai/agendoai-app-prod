import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layout/admin-layout';
import AppointmentDetailsModal from '@/components/admin/appointment-details-modal';
import AppointmentRowActions from '@/components/admin/appointment-row-actions';
import { ValidationCodeModal } from '@/components/validation-code-modal';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle, 
  CardFooter
} from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Loader2, 
  MoreHorizontal, 
  Eye, 
  SquarePen, 
  Check, 
  X, 
  Calendar, 
  AlertTriangle,
  Search,
  RefreshCw,
  Bell,
  Clock,
  BarChart4,
  CalendarRange,
  Users,
  Filter,
  CheckCircle,
  XCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose
} from "@/components/ui/dialog";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// Interface para o tipo de agendamento
interface Appointment {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  providerId: number;
  clientId: number;
  serviceId: number;
  notes: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  totalPrice: number | null;
  serviceName: string | null;
  providerName: string | null;
  clientName: string | null;
  createdAt: string | null;
}

// Estatísticas de agendamentos
interface AppointmentStats {
  total: number;
  pending: number;
  confirmed: number;
  completed: number;
  canceled: number;
  today: number;
  upcoming: number;
  revenue: number;
}

export default function AppointmentsPage() {
  const { toast } = useToast();
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("monitor");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [newAppointments, setNewAppointments] = useState<Appointment[]>([]);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentAppointment, setCurrentAppointment] = useState<Appointment | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<number | null>(null);
  const queryClient = useQueryClient();
  
  // Consulta de agendamentos com refetch automático
  const { data: appointments, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['/api/admin/appointments', { date: dateFilter?.toISOString().split('T')[0] }],
    queryFn: async () => {
      try {
        const dateParam = dateFilter ? `?date=${dateFilter.toISOString().split('T')[0]}` : '';
        const response = await apiRequest('GET', `/api/admin/appointments${dateParam}`);
        return await response.json() as Promise<Appointment[]>;
      } catch (error) {
        
        return [];
      }
    },
    refetchInterval: autoRefresh ? 10000 : false, // Refetch a cada 10 segundos se autoRefresh estiver ativado
  });
  
  // Detectar novos agendamentos
  useEffect(() => {
    if (appointments && appointments.length > 0) {
      // Verificar se existem agendamentos novos (menos de 10 minutos)
      const now = new Date();
      const recentAppointments = appointments.filter(appt => {
        if (!appt.createdAt) return false;
        const createdAt = new Date(appt.createdAt);
        const diffInMinutes = (now.getTime() - createdAt.getTime()) / (1000 * 60);
        return diffInMinutes < 10 && appt.status === 'pending';
      });
      
      if (recentAppointments.length > 0 && newAppointments.length !== recentAppointments.length) {
        setNewAppointments(recentAppointments);
        // Notificar sobre novos agendamentos
        if (newAppointments.length < recentAppointments.length) {
          toast({
            title: "Novos agendamentos",
            description: `${recentAppointments.length - newAppointments.length} novos agendamentos recebidos.`,
          });
        }
      }
    }
  }, [appointments, newAppointments.length, toast]);
  
  // Forçar atualização manual
  const handleManualRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['/api/admin/appointments'] });
    toast({
      title: "Atualizando dados",
      description: "Os dados estão sendo atualizados...",
    });
  }, [queryClient, toast]);
  
  // Calcular estatísticas
  const appointmentStats: AppointmentStats = useMemo(() => {
    if (!appointments) {
      return {
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        canceled: 0,
        today: 0,
        upcoming: 0,
        revenue: 0
      };
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    return {
      total: appointments.length,
      pending: appointments.filter(a => a.status === 'pending').length,
      confirmed: appointments.filter(a => a.status === 'confirmed').length,
      completed: appointments.filter(a => a.status === 'completed').length,
      canceled: appointments.filter(a => a.status === 'canceled').length,
      today: appointments.filter(a => a.date === today).length,
      upcoming: appointments.filter(a => new Date(a.date) > new Date() && a.status !== 'canceled').length,
      revenue: appointments
        .filter(a => a.status === 'completed')
        .reduce((sum, a) => sum + (a.totalPrice || 0), 0)
    };
  }, [appointments]);

  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<Appointment> }) => {
      try {
        // Validação básica antes de enviar
        if (!id || id <= 0) {
          throw new Error("ID de agendamento inválido");
        }
        
        if (!data || Object.keys(data).length === 0) {
          throw new Error("Dados de atualização ausentes");
        }
        
        // Fazer a requisição usando apiRequest
        const response = await apiRequest('PUT', `/api/admin/appointments/${id}`, data);
        return await response.json();
      } catch (error) {
        
        throw error;
      }
    },
    onSuccess: (data) => {
      
      queryClient.invalidateQueries({ queryKey: ['/api/admin/appointments'] });
      toast({
        title: "Agendamento atualizado",
        description: "O agendamento foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      
      toast({
        title: "Erro ao atualizar agendamento",
        description: error.message || "Ocorreu um erro ao tentar atualizar o agendamento",
        variant: "destructive",
      });
    }
  });

  // Abrir modal de detalhes do agendamento
  const openAppointmentDetails = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setIsEditMode(false);
    setIsDetailsOpen(true);
  };

  // Abrir modal para edição do agendamento
  const openAppointmentEdit = (appointment: Appointment) => {
    setCurrentAppointment(appointment);
    setIsEditMode(true);
    setIsDetailsOpen(true);
  };

  // Fechar o modal
  const closeAppointmentDetails = () => {
    setIsDetailsOpen(false);
    setCurrentAppointment(null);
    setIsEditMode(false);
  };

  const updateStatus = (appointmentId: number, newStatus: string) => {
    if (newStatus === 'completed') {
      // Para conclusão, abrir modal de validação
      setAppointmentToComplete(appointmentId);
      setShowValidationModal(true);
    } else {
      // Para outros status, atualizar diretamente
      updateAppointmentMutation.mutate({
        id: appointmentId,
        data: { status: newStatus }
      });
    }
  };

  const handleValidationSuccess = () => {
    // O backend já atualiza o status para 'completed' quando a validação é bem-sucedida
    // Apenas recarregamos os dados para refletir a mudança
    setAppointmentToComplete(null);
    window.location.reload();
  };

  const handleCloseValidationModal = () => {
    setShowValidationModal(false);
    setAppointmentToComplete(null);
  };

  // Função para renderizar o badge de status
  const renderStatusBadge = (status: string) => {
    let badgeClass = "";
    let statusText = "";

    switch (status) {
      case "completed":
        badgeClass = "bg-green-100 text-green-800 hover:bg-green-100 text-xs";
        statusText = "Concluído";
        break;
      case "confirmed":
        badgeClass = "bg-blue-100 text-blue-800 hover:bg-blue-100 text-xs";
        statusText = "Confirmado";
        break;
      case "canceled":
        badgeClass = "bg-red-100 text-red-800 hover:bg-red-100 text-xs";
        statusText = "Cancelado";
        break;
      case "pending":
        badgeClass = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100 text-xs";
        statusText = "Pendente";
        break;
      default:
        badgeClass = "bg-gray-100 text-gray-800 hover:bg-gray-100 text-xs";
        statusText = status;
    }

    return (
      <Badge variant="outline" className={badgeClass}>
        {statusText}
      </Badge>
    );
  };

  // Função para formatar a data (DD/MM/YYYY)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Função para formatar preço (R$ XX,XX)
  const formatPrice = (price: number | null) => {
    if (price === null) return "N/A";
    return `R$ ${(price / 100).toFixed(2).replace('.', ',')}`;
  };

  // Filtrar agendamentos
  const filteredAppointments = appointments?.filter(appointment => {
    // Filtro por status
    if (statusFilter && appointment.status !== statusFilter) {
      return false;
    }
    
    // Filtro por pesquisa (nome do cliente, prestador ou serviço)
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const clientName = (appointment.clientName || "").toLowerCase();
      const providerName = (appointment.providerName || "").toLowerCase();
      const serviceName = (appointment.serviceName || "").toLowerCase();
      
      return (
        clientName.includes(query) || 
        providerName.includes(query) ||
        serviceName.includes(query)
      );
    }
    
    return true;
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6">
          <h1 className="text-xl sm:text-2xl font-bold mb-6">Gerenciamento de Agendamentos</h1>
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
        

      </AdminLayout>
    );
  }

  // Remover o renderAppointmentDetailsModal já que agora usamos o componente separado

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="container mx-auto py-4 sm:py-6 px-4 sm:px-6">
          {/* Header com gradiente */}
          <div className="bg-gradient-to-r from-white to-blue-50 rounded-2xl shadow-lg border border-blue-100 p-6 mb-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">
                    Monitor de Agendamentos
                  </h1>
                  <p className="text-sm text-gray-600 mt-1">
                    Gerencie e acompanhe todos os agendamentos da plataforma
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                <Button 
                  variant="outline" 
                  size="sm"
                  className="gap-1 text-xs sm:text-sm bg-white/80 backdrop-blur-sm border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all duration-200 shadow-sm"
                  onClick={handleManualRefresh}
                >
                  <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Atualizar</span>
                  <span className="sm:hidden">Atualizar</span>
                </Button>
                
                <Button
                  variant={autoRefresh ? "default" : "outline"} 
                  size="sm"
                  className={`gap-1 text-xs sm:text-sm transition-all duration-200 shadow-sm ${
                    autoRefresh 
                      ? "bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white" 
                      : "bg-white/80 backdrop-blur-sm border-gray-200 hover:bg-gray-50"
                  }`}
                  onClick={() => setAutoRefresh(!autoRefresh)}
                >
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{autoRefresh ? "Auto (10s)" : "Manual"}</span>
                  <span className="sm:hidden">{autoRefresh ? "Auto" : "Manual"}</span>
                </Button>
                
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1 text-xs sm:text-sm bg-white/80 backdrop-blur-sm border-purple-200 hover:bg-purple-50 hover:border-purple-300 transition-all duration-200 shadow-sm">
                      <CalendarRange className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">{dateFilter ? format(dateFilter, 'dd/MM/yyyy') : "Todas as datas"}</span>
                      <span className="sm:hidden">{dateFilter ? format(dateFilter, 'dd/MM') : "Data"}</span>
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 shadow-xl border-0 rounded-xl" align="end">
                    <CalendarComponent
                      mode="single"
                      selected={dateFilter}
                      onSelect={setDateFilter}
                      locale={ptBR}
                      initialFocus
                      className="rounded-xl"
                    />
                    {dateFilter && (
                      <div className="p-3 border-t border-gray-100 flex justify-end bg-gradient-to-r from-gray-50 to-white">
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => setDateFilter(undefined)}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          Remover filtro
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
          
          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total de Agendamentos</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">{appointments.length}</p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Confirmados</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">
                    {appointments.filter(a => a.status === 'confirmed').length}
                  </p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <CheckCircle className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-yellow-500 to-orange-500 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Pendentes</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">
                    {appointments.filter(a => a.status === 'pending').length}
                  </p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl shadow-lg p-6 text-white transform hover:scale-105 transition-all duration-300">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-100 text-sm font-medium">Cancelados</p>
                  <p className="text-2xl sm:text-3xl font-bold mt-1">
                    {appointments.filter(a => a.status === 'canceled').length}
                  </p>
                </div>
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                  <XCircle className="h-6 w-6 sm:h-8 sm:w-8" />
                </div>
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="monitor" value={activeTab} onValueChange={setActiveTab} className="mb-6">
            <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3">
              <TabsTrigger value="monitor" className="flex items-center gap-2 text-xs sm:text-sm">
                <Bell className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Monitor</span>
                {newAppointments.length > 0 && (
                  <Badge className="ml-1 sm:ml-auto h-4 sm:h-5 px-1 bg-red-500 hover:bg-red-600 text-xs">
                    {newAppointments.length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="all" className="flex items-center gap-2 text-xs sm:text-sm">
                <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Todos</span>
              </TabsTrigger>
              <TabsTrigger value="statistics" className="flex items-center gap-2 text-xs sm:text-sm">
                <BarChart4 className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Estatísticas</span>
              </TabsTrigger>
            </TabsList>
            
            {/* Tab content */}
            <TabsContent value="monitor">
              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle>Monitor em Tempo Real</CardTitle>
                      <CardDescription>
                        Visualize e gerencie os agendamentos mais recentes
                      </CardDescription>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Atualizado: {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "--:--:--"}
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 items-start sm:items-center mt-4">
                    <div className="flex-1 relative w-full">
                      <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Buscar por cliente, prestador ou serviço..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-8 text-sm"
                      />
                    </div>
                    <div className="w-full sm:w-40">
                      <Select
                        value={statusFilter || "all"}
                        onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
                      >
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos</SelectItem>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="confirmed">Confirmado</SelectItem>
                          <SelectItem value="completed">Concluído</SelectItem>
                          <SelectItem value="canceled">Cancelado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  {newAppointments.length > 0 && (
                    <div className="mb-6 animate-pulse">
                      <Card className="border-red-300 bg-red-50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-sm sm:text-base flex items-center">
                            <Bell className="h-3 w-3 sm:h-4 sm:w-4 mr-2 text-red-600" />
                            Novos Agendamentos
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid gap-3">
                            {newAppointments.map(appointment => (
                              <div key={appointment.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-3 rounded-md border border-red-200 gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-sm sm:text-base truncate">
                                    {appointment.clientName || `Cliente #${appointment.clientId}`}
                                  </div>
                                  <div className="text-xs sm:text-sm mt-1 text-gray-600">
                                    {appointment.serviceName || `Serviço #${appointment.serviceId}`} • {formatDate(appointment.date)} • {appointment.startTime}
                                  </div>
                                </div>
                                <div className="flex gap-2 w-full sm:w-auto">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-blue-600 text-xs flex-1 sm:flex-none"
                                    onClick={() => updateStatus(appointment.id, "confirmed")}
                                  >
                                    <Calendar className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    <span className="hidden sm:inline">Confirmar</span>
                                    <span className="sm:hidden">OK</span>
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 text-xs flex-1 sm:flex-none"
                                    onClick={() => updateStatus(appointment.id, "canceled")}
                                  >
                                    <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                                    <span className="hidden sm:inline">Recusar</span>
                                    <span className="sm:hidden">X</span>
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  )}
                
                  {filteredAppointments && filteredAppointments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">ID</TableHead>
                            <TableHead className="text-xs sm:text-sm">Data</TableHead>
                            <TableHead className="text-xs sm:text-sm">Horário</TableHead>
                            <TableHead className="text-xs sm:text-sm">Cliente</TableHead>
                            <TableHead className="text-xs sm:text-sm">Prestador</TableHead>
                            <TableHead className="text-xs sm:text-sm">Serviço</TableHead>
                            <TableHead className="text-xs sm:text-sm">Valor</TableHead>
                            <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            <TableHead className="text-right text-xs sm:text-sm">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell className="font-medium text-xs sm:text-sm">{appointment.id}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{formatDate(appointment.date)}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{appointment.startTime} - {appointment.endTime}</TableCell>
                              <TableCell className="text-xs sm:text-sm max-w-20 sm:max-w-none truncate">{appointment.clientName || `Cliente #${appointment.clientId}`}</TableCell>
                              <TableCell className="text-xs sm:text-sm max-w-20 sm:max-w-none truncate">{appointment.providerName || `Prestador #${appointment.providerId}`}</TableCell>
                              <TableCell className="text-xs sm:text-sm max-w-20 sm:max-w-none truncate">{appointment.serviceName || `Serviço #${appointment.serviceId}`}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{formatPrice(appointment.totalPrice)}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{renderStatusBadge(appointment.status)}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-8 sm:w-8">
                                      <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="text-xs sm:text-sm">
                                    <DropdownMenuItem className="cursor-pointer">
                                      <Eye className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                      <span>Ver Detalhes</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer">
                                      <SquarePen className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                      <span>Editar</span>
                                    </DropdownMenuItem>
                                    {appointment.status !== "confirmed" && (
                                      <DropdownMenuItem 
                                        className="cursor-pointer text-blue-600"
                                        onClick={() => updateStatus(appointment.id, "confirmed")}
                                      >
                                        <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                        <span>Confirmar</span>
                                      </DropdownMenuItem>
                                    )}
                                    {appointment.status !== "completed" && (
                                      <DropdownMenuItem 
                                        className="cursor-pointer text-green-600"
                                        onClick={() => updateStatus(appointment.id, "completed")}
                                      >
                                        <Check className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                        <span>Concluir</span>
                                      </DropdownMenuItem>
                                    )}
                                    {appointment.status !== "canceled" && (
                                      <DropdownMenuItem 
                                        className="cursor-pointer text-red-600"
                                        onClick={() => updateStatus(appointment.id, "canceled")}
                                      >
                                        <X className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                        <span>Cancelar</span>
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="py-6">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Nenhum agendamento encontrado</AlertTitle>
                        <AlertDescription>
                          Não foram encontrados agendamentos com os filtros aplicados.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
                
                <CardFooter className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                  <div className="text-muted-foreground">
                    Mostrando {filteredAppointments?.length || 0} de {appointments?.length || 0} agendamentos
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    <span>
                      {autoRefresh ? 'Atualização automática ativada' : 'Atualização automática desativada'}
                    </span>
                  </div>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="all">
              <Card>
                <CardHeader>
                  <CardTitle>Todos os Agendamentos</CardTitle>
                  <CardDescription>
                    Visualize e filtre todos os agendamentos da plataforma
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {filteredAppointments && filteredAppointments.length > 0 ? (
                    <div className="overflow-x-auto">
                      <Table className="min-w-full">
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm">ID</TableHead>
                            <TableHead className="text-xs sm:text-sm">Data</TableHead>
                            <TableHead className="text-xs sm:text-sm">Horário</TableHead>
                            <TableHead className="text-xs sm:text-sm">Cliente</TableHead>
                            <TableHead className="text-xs sm:text-sm">Prestador</TableHead>
                            <TableHead className="text-xs sm:text-sm">Serviço</TableHead>
                            <TableHead className="text-xs sm:text-sm">Valor</TableHead>
                            <TableHead className="text-xs sm:text-sm">Status</TableHead>
                            <TableHead className="text-right text-xs sm:text-sm">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredAppointments.map((appointment) => (
                            <TableRow key={appointment.id}>
                              <TableCell className="font-medium text-xs sm:text-sm">{appointment.id}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{formatDate(appointment.date)}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{appointment.startTime} - {appointment.endTime}</TableCell>
                              <TableCell className="text-xs sm:text-sm max-w-20 sm:max-w-none truncate">{appointment.clientName || `Cliente #${appointment.clientId}`}</TableCell>
                              <TableCell className="text-xs sm:text-sm max-w-20 sm:max-w-none truncate">{appointment.providerName || `Prestador #${appointment.providerId}`}</TableCell>
                              <TableCell className="text-xs sm:text-sm max-w-20 sm:max-w-none truncate">{appointment.serviceName || `Serviço #${appointment.serviceId}`}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{formatPrice(appointment.totalPrice)}</TableCell>
                              <TableCell className="text-xs sm:text-sm">{renderStatusBadge(appointment.status)}</TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-6 w-6 sm:h-8 sm:w-8">
                                      <MoreHorizontal className="h-3 w-3 sm:h-4 sm:w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="text-xs sm:text-sm">
                                    <DropdownMenuItem className="cursor-pointer">
                                      <Eye className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                      <span>Ver Detalhes</span>
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="cursor-pointer">
                                      <SquarePen className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                      <span>Editar</span>
                                    </DropdownMenuItem>
                                    {appointment.status !== "confirmed" && (
                                      <DropdownMenuItem 
                                        className="cursor-pointer text-blue-600"
                                        onClick={() => updateStatus(appointment.id, "confirmed")}
                                      >
                                        <Calendar className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                        <span>Confirmar</span>
                                      </DropdownMenuItem>
                                    )}
                                    {appointment.status !== "completed" && (
                                      <DropdownMenuItem 
                                        className="cursor-pointer text-green-600"
                                        onClick={() => updateStatus(appointment.id, "completed")}
                                      >
                                        <Check className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                        <span>Concluir</span>
                                      </DropdownMenuItem>
                                    )}
                                    {appointment.status !== "canceled" && (
                                      <DropdownMenuItem 
                                        className="cursor-pointer text-red-600"
                                        onClick={() => updateStatus(appointment.id, "canceled")}
                                      >
                                        <X className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                                        <span>Cancelar</span>
                                      </DropdownMenuItem>
                                    )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="py-6">
                      <Alert>
                        <AlertTriangle className="h-4 w-4" />
                        <AlertTitle>Nenhum agendamento encontrado</AlertTitle>
                        <AlertDescription>
                          Não foram encontrados agendamentos com os filtros aplicados.
                        </AlertDescription>
                      </Alert>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="statistics">
              <Card>
                <CardHeader>
                  <CardTitle>Estatísticas de Agendamentos</CardTitle>
                  <CardDescription>
                    Visualize métricas importantes sobre os agendamentos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {/* Estatísticas gerais */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm sm:text-base">Visão Geral</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 sm:space-y-4">
                          <div className="flex justify-between py-2 border-b">
                            <span className="font-medium text-xs sm:text-sm">Total de Agendamentos</span>
                            <span className="text-xs sm:text-sm">{appointmentStats.total}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="font-medium text-xs sm:text-sm">Agendamentos Hoje</span>
                            <span className="text-xs sm:text-sm">{appointmentStats.today}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="font-medium text-xs sm:text-sm">Próximos Agendamentos</span>
                            <span className="text-xs sm:text-sm">{appointmentStats.upcoming}</span>
                          </div>
                          <div className="flex justify-between py-2 border-b">
                            <span className="font-medium text-xs sm:text-sm">Receita Total</span>
                            <span className="text-xs sm:text-sm">{formatPrice(appointmentStats.revenue)}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Distribuição de status */}
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm sm:text-base">Distribuição por Status</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="mt-2 space-y-2">
                          <div className="w-full bg-muted rounded-full h-3 sm:h-4 overflow-hidden">
                            {appointmentStats.total > 0 && (
                              <>
                                <div 
                                  className="h-full bg-yellow-400" 
                                  style={{ 
                                    width: `${(appointmentStats.pending / appointmentStats.total) * 100}%`,
                                    float: 'left'
                                  }} 
                                />
                                <div 
                                  className="h-full bg-blue-400" 
                                  style={{ 
                                    width: `${(appointmentStats.confirmed / appointmentStats.total) * 100}%`,
                                    float: 'left'
                                  }} 
                                />
                                <div 
                                  className="h-full bg-green-400" 
                                  style={{ 
                                    width: `${(appointmentStats.completed / appointmentStats.total) * 100}%`,
                                    float: 'left'
                                  }} 
                                />
                                <div 
                                  className="h-full bg-red-400" 
                                  style={{ 
                                    width: `${(appointmentStats.canceled / appointmentStats.total) * 100}%`,
                                    float: 'left'
                                  }} 
                                />
                              </>
                            )}
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                              <span className="text-xs sm:text-sm">Pendentes: {appointmentStats.pending}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                              <span className="text-xs sm:text-sm">Confirmados: {appointmentStats.confirmed}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                              <span className="text-xs sm:text-sm">Concluídos: {appointmentStats.completed}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                              <span className="text-xs sm:text-sm">Cancelados: {appointmentStats.canceled}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      {/* Renderizar o modal de detalhes de agendamento */}
      <AppointmentDetailsModal
        appointment={currentAppointment}
        isOpen={isDetailsOpen}
        isEditMode={isEditMode}
        onClose={closeAppointmentDetails}
        onEdit={openAppointmentEdit}
        onStatusChange={updateStatus}
        renderStatusBadge={renderStatusBadge}
      />
      
      {/* Modal de validação para conclusão de agendamentos */}
      {appointmentToComplete && (
        <ValidationCodeModal
          isOpen={showValidationModal}
          onClose={handleCloseValidationModal}
          appointmentId={appointmentToComplete}
          onSuccess={handleValidationSuccess}
          isLoading={updateAppointmentMutation.isPending}
        />
      )}
    </AdminLayout>
  );
}