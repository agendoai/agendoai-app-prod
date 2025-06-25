import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layout/admin-layout';
import AppointmentDetailsModal from '@/components/admin/appointment-details-modal';
import AppointmentRowActions from '@/components/admin/appointment-row-actions';
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
  Filter
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
  const queryClient = useQueryClient();
  
  // Consulta de agendamentos com refetch automático
  const { data: appointments, isLoading, dataUpdatedAt } = useQuery({
    queryKey: ['/api/admin/appointments', { date: dateFilter?.toISOString().split('T')[0] }],
    queryFn: async () => {
      try {
        const dateParam = dateFilter ? `?date=${dateFilter.toISOString().split('T')[0]}` : '';
        const response = await fetch(`/api/admin/appointments${dateParam}`);
        if (!response.ok) {
          throw new Error('Falha ao carregar agendamentos');
        }
        return response.json() as Promise<Appointment[]>;
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
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
        
        // Fazer a requisição com cabeçalhos adequados
        const response = await fetch(`/api/admin/appointments/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(data),
          credentials: 'include'
        });
        
        // Log da resposta para diagnóstico
        console.log(`Resposta da atualização ${id}:`, {
          status: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries([...response.headers.entries()])
        });
        
        // Processar resposta
        if (!response.ok) {
          let errorMessage = `Erro ${response.status}: ${response.statusText}`;
          
          try {
            const errorData = await response.text();
            console.error("Corpo da resposta de erro:", errorData);
            
            // Tentar interpretar como JSON se possível
            try {
              const jsonError = JSON.parse(errorData);
              errorMessage = jsonError.error || jsonError.message || errorMessage;
              console.log("Erro JSON parseado:", jsonError);
            } catch (jsonParseError) {
              // Se não for JSON, usar o texto como mensagem de erro
              if (errorData && errorData.trim()) {
                errorMessage = `Erro: ${errorData.substring(0, 100)}${errorData.length > 100 ? '...' : ''}`;
              }
            }
          } catch (bodyReadError) {
            console.error("Erro ao ler corpo da resposta:", bodyReadError);
          }
          
          throw new Error(errorMessage);
        }
        
        // Obter o resultado como JSON ou texto
        try {
          const contentType = response.headers.get('content-type');
          // Se a resposta for vazia ou não for JSON, retornamos um objeto simples
          if (!contentType || !contentType.includes('application/json')) {
            console.log("Resposta não é JSON:", contentType);
            // Para uma resposta bem-sucedida não-JSON, criamos um objeto de sucesso
            return { success: true, status: response.status };
          }
          
          // Tentar analisar como JSON
          const textResponse = await response.text();
          console.log("Texto da resposta:", textResponse);
          
          if (!textResponse || textResponse.trim() === '') {
            console.log("Resposta vazia, retornando objeto padrão");
            return { success: true, status: response.status };
          }
          
          // Tentar parsear o JSON
          try {
            return JSON.parse(textResponse);
          } catch (parseError) {
            console.error("Erro ao parsear JSON:", parseError, "Texto:", textResponse);
            // Criar objeto simples para evitar quebrar o fluxo
            return { 
              success: true, 
              status: response.status,
              message: "Agendamento atualizado"
            };
          }
        } catch (jsonError) {
          console.error("Erro ao processar resposta:", jsonError);
          // Não lançar erro para evitar quebrar o fluxo, retornar objeto de sucesso
          return { 
            success: true, 
            status: response.status,
            message: "Agendamento atualizado com aviso"
          };
        }
      } catch (error) {
        console.error("Erro completo na atualização:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Agendamento atualizado com sucesso:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/appointments'] });
      toast({
        title: "Agendamento atualizado",
        description: "O agendamento foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      console.error("Erro na mutation:", error);
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
    updateAppointmentMutation.mutate({
      id: appointmentId,
      data: { status: newStatus }
    });
  };

  // Função para renderizar o badge de status
  const renderStatusBadge = (status: string) => {
    let badgeClass = "";
    let statusText = "";

    switch (status) {
      case "completed":
        badgeClass = "bg-green-100 text-green-800 hover:bg-green-100";
        statusText = "Concluído";
        break;
      case "confirmed":
        badgeClass = "bg-blue-100 text-blue-800 hover:bg-blue-100";
        statusText = "Confirmado";
        break;
      case "canceled":
        badgeClass = "bg-red-100 text-red-800 hover:bg-red-100";
        statusText = "Cancelado";
        break;
      case "pending":
        badgeClass = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
        statusText = "Pendente";
        break;
      default:
        badgeClass = "bg-gray-100 text-gray-800 hover:bg-gray-100";
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
        <div className="container mx-auto py-6">
          <h1 className="text-2xl font-bold mb-6">Gerenciamento de Agendamentos</h1>
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
      </AdminLayout>
    );
  }

  // Remover o renderAppointmentDetailsModal já que agora usamos o componente separado

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Monitor de Agendamentos</h1>
          
          <div className="flex items-center gap-3">
            <Button 
              variant="outline" 
              size="sm"
              className="gap-1"
              onClick={handleManualRefresh}
            >
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
            
            <Button
              variant={autoRefresh ? "default" : "outline"} 
              size="sm"
              className="gap-1"
              onClick={() => setAutoRefresh(!autoRefresh)}
            >
              <Clock className="h-4 w-4" />
              {autoRefresh ? "Auto (10s)" : "Manual"}
            </Button>
            
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1">
                  <CalendarRange className="h-4 w-4" />
                  {dateFilter ? format(dateFilter, 'dd/MM/yyyy') : "Todas as datas"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <CalendarComponent
                  mode="single"
                  selected={dateFilter}
                  onSelect={setDateFilter}
                  locale={ptBR}
                  initialFocus
                />
                {dateFilter && (
                  <div className="p-3 border-t border-border flex justify-end">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setDateFilter(undefined)}
                    >
                      Remover filtro
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
        
        {/* Cards de estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card className="bg-amber-50">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-amber-800">Pendentes</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{appointmentStats.pending}</p>
                </div>
                <div className="p-2 bg-amber-200 rounded-full">
                  <Clock className="h-5 w-5 text-amber-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-blue-800">Confirmados</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{appointmentStats.confirmed}</p>
                </div>
                <div className="p-2 bg-blue-200 rounded-full">
                  <Calendar className="h-5 w-5 text-blue-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-green-800">Concluídos</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">{appointmentStats.completed}</p>
                </div>
                <div className="p-2 bg-green-200 rounded-full">
                  <Check className="h-5 w-5 text-green-700" />
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-50">
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-medium text-slate-800">Hoje</p>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{appointmentStats.today}</p>
                </div>
                <div className="p-2 bg-slate-200 rounded-full">
                  <BarChart4 className="h-5 w-5 text-slate-700" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="monitor" value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="grid grid-cols-3 md:w-[400px]">
            <TabsTrigger value="monitor" className="flex items-center gap-2">
              <Bell className="h-4 w-4" />
              <span>Monitor</span>
              {newAppointments.length > 0 && (
                <Badge className="ml-auto h-5 px-1 bg-red-500 hover:bg-red-600">
                  {newAppointments.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Todos</span>
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center gap-2">
              <BarChart4 className="h-4 w-4" />
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
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mt-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por cliente, prestador ou serviço..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <div className="w-full md:w-40">
                    <Select
                      value={statusFilter || "all"}
                      onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
                    >
                      <SelectTrigger>
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
                        <CardTitle className="text-base flex items-center">
                          <Bell className="h-4 w-4 mr-2 text-red-600" />
                          Novos Agendamentos
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid gap-3">
                          {newAppointments.map(appointment => (
                            <div key={appointment.id} className="flex justify-between items-center bg-white p-3 rounded-md border border-red-200">
                              <div>
                                <div className="font-medium">
                                  {appointment.clientName || `Cliente #${appointment.clientId}`}
                                </div>
                                <div className="text-sm mt-1">
                                  {appointment.serviceName || `Serviço #${appointment.serviceId}`} • {formatDate(appointment.date)} • {appointment.startTime}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-blue-600"
                                  onClick={() => updateStatus(appointment.id, "confirmed")}
                                >
                                  <Calendar className="h-4 w-4 mr-1" />
                                  Confirmar
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-red-600"
                                  onClick={() => updateStatus(appointment.id, "canceled")}
                                >
                                  <X className="h-4 w-4 mr-1" />
                                  Recusar
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
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Prestador</TableHead>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell className="font-medium">{appointment.id}</TableCell>
                          <TableCell>{formatDate(appointment.date)}</TableCell>
                          <TableCell>{appointment.startTime} - {appointment.endTime}</TableCell>
                          <TableCell>{appointment.clientName || `Cliente #${appointment.clientId}`}</TableCell>
                          <TableCell>{appointment.providerName || `Prestador #${appointment.providerId}`}</TableCell>
                          <TableCell>{appointment.serviceName || `Serviço #${appointment.serviceId}`}</TableCell>
                          <TableCell>{formatPrice(appointment.totalPrice)}</TableCell>
                          <TableCell>{renderStatusBadge(appointment.status)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="cursor-pointer">
                                  <Eye className="mr-2 h-4 w-4" />
                                  <span>Ver Detalhes</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <SquarePen className="mr-2 h-4 w-4" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                                {appointment.status !== "confirmed" && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer text-blue-600"
                                    onClick={() => updateStatus(appointment.id, "confirmed")}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    <span>Confirmar</span>
                                  </DropdownMenuItem>
                                )}
                                {appointment.status !== "completed" && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer text-green-600"
                                    onClick={() => updateStatus(appointment.id, "completed")}
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    <span>Concluir</span>
                                  </DropdownMenuItem>
                                )}
                                {appointment.status !== "canceled" && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer text-red-600"
                                    onClick={() => updateStatus(appointment.id, "canceled")}
                                  >
                                    <X className="mr-2 h-4 w-4" />
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
              
              <CardFooter className="border-t pt-4 text-xs text-muted-foreground flex justify-between">
                <div>
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
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center mt-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por cliente, prestador ou serviço..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <div className="w-full md:w-40">
                    <Select
                      value={statusFilter || "all"}
                      onValueChange={(value) => setStatusFilter(value === "all" ? null : value)}
                    >
                      <SelectTrigger>
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
                {filteredAppointments && filteredAppointments.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>ID</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Horário</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Prestador</TableHead>
                        <TableHead>Serviço</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredAppointments.map((appointment) => (
                        <TableRow key={appointment.id}>
                          <TableCell className="font-medium">{appointment.id}</TableCell>
                          <TableCell>{formatDate(appointment.date)}</TableCell>
                          <TableCell>{appointment.startTime} - {appointment.endTime}</TableCell>
                          <TableCell>{appointment.clientName || `Cliente #${appointment.clientId}`}</TableCell>
                          <TableCell>{appointment.providerName || `Prestador #${appointment.providerId}`}</TableCell>
                          <TableCell>{appointment.serviceName || `Serviço #${appointment.serviceId}`}</TableCell>
                          <TableCell>{formatPrice(appointment.totalPrice)}</TableCell>
                          <TableCell>{renderStatusBadge(appointment.status)}</TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem className="cursor-pointer">
                                  <Eye className="mr-2 h-4 w-4" />
                                  <span>Ver Detalhes</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <SquarePen className="mr-2 h-4 w-4" />
                                  <span>Editar</span>
                                </DropdownMenuItem>
                                {appointment.status !== "confirmed" && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer text-blue-600"
                                    onClick={() => updateStatus(appointment.id, "confirmed")}
                                  >
                                    <Calendar className="mr-2 h-4 w-4" />
                                    <span>Confirmar</span>
                                  </DropdownMenuItem>
                                )}
                                {appointment.status !== "completed" && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer text-green-600"
                                    onClick={() => updateStatus(appointment.id, "completed")}
                                  >
                                    <Check className="mr-2 h-4 w-4" />
                                    <span>Concluir</span>
                                  </DropdownMenuItem>
                                )}
                                {appointment.status !== "canceled" && (
                                  <DropdownMenuItem 
                                    className="cursor-pointer text-red-600"
                                    onClick={() => updateStatus(appointment.id, "canceled")}
                                  >
                                    <X className="mr-2 h-4 w-4" />
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Estatísticas gerais */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Visão Geral</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between py-2 border-b">
                          <span className="font-medium">Total de Agendamentos</span>
                          <span>{appointmentStats.total}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="font-medium">Agendamentos Hoje</span>
                          <span>{appointmentStats.today}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="font-medium">Próximos Agendamentos</span>
                          <span>{appointmentStats.upcoming}</span>
                        </div>
                        <div className="flex justify-between py-2 border-b">
                          <span className="font-medium">Receita Total</span>
                          <span>{formatPrice(appointmentStats.revenue)}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Distribuição de status */}
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Distribuição por Status</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mt-2 space-y-2">
                        <div className="w-full bg-muted rounded-full h-4 overflow-hidden">
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
                        
                        <div className="grid grid-cols-2 gap-2 mt-4">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-yellow-400 rounded-full"></div>
                            <span className="text-sm">Pendentes: {appointmentStats.pending}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
                            <span className="text-sm">Confirmados: {appointmentStats.confirmed}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                            <span className="text-sm">Concluídos: {appointmentStats.completed}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 bg-red-400 rounded-full"></div>
                            <span className="text-sm">Cancelados: {appointmentStats.canceled}</span>
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
    </AdminLayout>
  );
}