import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, Clock, MapPin, Phone, RefreshCcw, Search,
  Filter, CalendarRange, Loader2, Check, X, Eye, SquarePen,
  Home, User, ChevronRight, Star, MessageCircle, MoreHorizontal,
  CalendarDays, TrendingUp, CheckCircle2, AlertCircle, PlusCircle
} from "lucide-react";
import AppHeader from "@/components/layout/app-header";
import ClientLayout from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Appointment } from "@/types";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import Navbar from '@/components/layout/navbar';

// Função auxiliar para agrupar agendamentos por status
const groupAppointmentsByStatus = (appointments: Appointment[]) => {
  const pending = appointments.filter(
    (a) => a.status === "pending"
  );

  const executing = appointments.filter(
    (a) => a.status === "executing"
  );

  const completed = appointments.filter(
    (a) => a.status === "confirmed" || a.status === "confirmado"
  );

  const canceled = appointments.filter(
    (a) => a.status === "canceled"
  );

  const noShow = appointments.filter(
    (a) => a.status === "no-show"
  );

  // "Próximos" agora é igual aos pendentes
  const upcoming = pending;

  return { upcoming, pending, executing, completed, canceled, noShow };
};

// Função para formatar data em formato legível
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return format(date, "EEE, dd 'de' MMMM", { locale: ptBR });
};

// Função para formatar data relativa
const formatRelativeDate = (dateStr: string) => {
  const date = new Date(dateStr);
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  if (date.toDateString() === today.toDateString()) {
    return "Hoje";
  } else if (date.toDateString() === tomorrow.toDateString()) {
    return "Amanhã";
  } else {
    return format(date, "dd/MM");
  }
};

// Componente para badge de status
const StatusBadge = ({ status }: { status: string | null }) => {
  if (!status) return null;
  
  let variant = "outline";
  let label = status;
  let className = "";
  
  switch (status) {
    case "confirmed":
    case "confirmado":
      variant = "default";
      label = "Confirmado";
      className = "bg-green-100 text-green-800 border-green-200";
      break;
    case "pending":
      variant = "secondary";
      label = "Pendente";
      className = "bg-yellow-100 text-yellow-800 border-yellow-200";
      break;
    case "executing":
      variant = "outline";
      label = "Executando";
      className = "bg-blue-100 text-blue-800 border-blue-200";
      break;
    case "completed":
      variant = "outline";
      label = "Concluído";
      className = "bg-cyan-100 text-cyan-800 border-cyan-200";
      break;
    case "canceled":
      variant = "destructive";
      label = "Cancelado";
      className = "bg-red-100 text-red-800 border-red-200";
      break;
    case "no-show":
      variant = "outline";
      label = "Não Compareceu";
      className = "bg-orange-100 text-orange-800 border-orange-200";
      break;
    default:
      variant = "outline";
  }
  
  return (
    <Badge variant={variant as any} className={className}>
      {label}
    </Badge>
  );
};

// Componente para badge de status de pagamento
const PaymentStatusBadge = ({ status }: { status: string | null | undefined }) => {
  if (!status || status === 'pending' || status === 'aguardando_pagamento') {
    return <Badge variant="warning" className="bg-yellow-100 text-yellow-800 border-yellow-200">Aguardando pagamento</Badge>;
  }
  if (status === 'confirmado' || status === 'paid') {
    return <Badge variant="success" className="bg-green-100 text-green-800 border-green-200">Pago</Badge>;
  }
  if (status === 'failed') {
    return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Pagamento falhou</Badge>;
  }
  if (status === 'refunded') {
    return <Badge variant="info" className="bg-blue-100 text-blue-800 border-blue-200">Pagamento reembolsado</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
};

export default function ClientAppointmentsPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  
  // Buscar agendamentos
  const { 
    data: appointments = [], 
    isLoading,
    refetch,
    isRefetching
  } = useQuery<Appointment[]>({
    queryKey: ["/api/client/appointments"],
    staleTime: 30 * 1000,
  });
  
  // Função para atualizar manualmente os agendamentos
  const handleRefresh = async () => {
    setIsManualRefreshing(true);
    try {
      await refetch();
      toast({
        title: "Agendamentos atualizados",
        description: "Lista de agendamentos atualizada com sucesso",
      });
    } catch (error) {
      toast({
        title: "Erro ao atualizar",
        description: "Não foi possível atualizar os agendamentos",
        variant: "destructive"
      });
    } finally {
      setIsManualRefreshing(false);
    }
  };
  
  // Verificar rotas de entrada
  useEffect(() => {
    const checkPathAndRefresh = async () => {
      const referrer = document.referrer;
      if (referrer && (referrer.includes('/client/new-booking') || referrer.includes('/client/booking-confirmation'))) {
        await refetch();
      }
    };
    
    checkPathAndRefresh();
  }, [refetch]);
  
  // Função para formatar data no formato DD/MM/YYYY
  const formatTableDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Função para formatar preço (R$ XX,XX)
  const formatPrice = (price?: number | null) => {
    if (price === null || price === undefined) return "N/A";
    return `R$ ${(price / 100).toFixed(2).replace('.', ',')}`;
  };

  // Renderizar o badge de status
  const renderStatusBadge = (status: string) => {
    let badgeClass = "";
    let statusText = "";

    switch (status) {
      case "completed":
        badgeClass = "bg-cyan-100 text-cyan-800 hover:bg-cyan-100";
        statusText = "Concluído";
        break;
      case "confirmed":
      case "confirmado":
        badgeClass = "bg-green-100 text-green-800 hover:bg-green-100";
        statusText = "Confirmado";
        break;
      case "executing":
        badgeClass = "bg-blue-100 text-blue-800 hover:bg-blue-100";
        statusText = "Executando";
        break;
      case "canceled":
        badgeClass = "bg-red-100 text-red-800 hover:bg-red-100";
        statusText = "Cancelado";
        break;
      case "pending":
        badgeClass = "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
        statusText = "Pendente";
        break;
      case "no-show":
        badgeClass = "bg-orange-100 text-orange-800 hover:bg-orange-100";
        statusText = "Não Compareceu";
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
  
  // Agrupar agendamentos por status
  const groupedAppointments = groupAppointmentsByStatus(appointments);
  
  // Filtrar agendamentos
  const filteredAppointments = appointments?.filter(appointment => {
    if (dateFilter) {
      const appointmentDate = new Date(appointment.date);
      const filterDate = new Date(dateFilter);
      if (appointmentDate.toDateString() !== filterDate.toDateString()) {
        return false;
      }
    }
    
    if (statusFilter) {
      if (statusFilter === "confirmed") {
        if (appointment.status !== "confirmed" && appointment.status !== "confirmado") {
          return false;
        }
      } else if (appointment.status !== statusFilter) {
        return false;
      }
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const providerName = (appointment.providerName || "").toLowerCase();
      const serviceName = (appointment.serviceName || "").toLowerCase();
      
      return (
        providerName.includes(query) ||
        serviceName.includes(query)
      );
    }
    
    return true;
  }).sort((a, b) => {
    const dateA = new Date(`${a.date}T${a.startTime}`);
    const dateB = new Date(`${b.date}T${b.startTime}`);
    return dateB.getTime() - dateA.getTime();
  });

  // NOVO: Filtrados para overview
  const filteredOverviewAppointments = filteredAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed' || a.status === 'confirmado' || a.status === 'executing');
  const filteredOverviewCanceled = filteredAppointments.filter(a => a.status === 'canceled' || a.status === 'no-show');

  return (
    <div className="min-h-screen w-full bg-white pb-24 flex justify-center items-start">
      <div className="w-full max-w-md mx-auto px-2 sm:px-0">
        {/* Header */}
        <header className="flex flex-col items-center justify-center pt-6 pb-2 relative">
          <img src="/AgendoAilogo.png" alt="AgendoAI Logo" className="h-12 w-auto mb-1 drop-shadow-2xl" />
          <h1 className="text-xl sm:text-2xl font-extrabold text-cyan-700 text-center mb-2 mt-1 tracking-tight drop-shadow-sm">
            Meus Agendamentos
          </h1>
        </header>



        <div className="pt-1 pb-4 space-y-5">
          {/* Cards de estatísticas */}
          <div className="mb-1">
            <h2 className="text-[1.1rem] font-bold mb-2 text-neutral-900 border-l-4 border-cyan-400 pl-2 tracking-wide">Resumo</h2>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-1">
              <div className="bg-gradient-to-br from-cyan-50 to-white border border-cyan-200 rounded-lg p-2 text-center">
                <div className="text-sm sm:text-lg font-bold text-cyan-700">{groupedAppointments.upcoming.length}</div>
                <div className="text-[8px] sm:text-[10px] text-cyan-600 font-medium">Próximos</div>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-lg p-2 text-center">
                <div className="text-sm sm:text-lg font-bold text-blue-700">{groupedAppointments.executing.length}</div>
                <div className="text-[8px] sm:text-[10px] text-blue-600 font-medium">Executando</div>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-white border border-green-200 rounded-lg p-2 text-center">
                <div className="text-sm sm:text-lg font-bold text-green-700">{groupedAppointments.completed.length}</div>
                <div className="text-[8px] sm:text-[10px] text-green-600 font-medium">Concluídos</div>
              </div>
              <div className="bg-gradient-to-br from-yellow-50 to-white border border-yellow-200 rounded-lg p-2 text-center">
                <div className="text-sm sm:text-lg font-bold text-yellow-700">
                  {groupedAppointments.pending.length}
                </div>
                <div className="text-[8px] sm:text-[10px] text-yellow-600 font-medium">Pendentes</div>
              </div>
              <div className="bg-gradient-to-br from-red-50 to-white border border-red-200 rounded-lg p-2 text-center">
                <div className="text-sm sm:text-lg font-bold text-red-700">{groupedAppointments.canceled.length}</div>
                <div className="text-[8px] sm:text-[10px] text-red-600 font-medium">Cancelados</div>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-lg p-2 text-center">
                <div className="text-sm sm:text-lg font-bold text-orange-700">{groupedAppointments.noShow.length}</div>
                <div className="text-[8px] sm:text-[10px] text-orange-600 font-medium">Não Compareceu</div>
              </div>
            </div>
          </div>

          {/* Filtros */}
          <div className="mb-1">
            <h2 className="text-[1.1rem] font-bold mb-2 text-neutral-900 border-l-4 border-cyan-400 pl-2 tracking-wide">Filtros</h2>
            <div className="space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  type="search" 
                  placeholder="Buscar por prestador ou serviço..." 
                  className="pl-10 rounded-full bg-gray-50 border border-gray-200 shadow-sm focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 py-2 text-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              
              <div className="flex gap-2 flex-wrap">
                <Select value={statusFilter || "todos"} onValueChange={(value) => setStatusFilter(value === "todos" ? null : value)}>
                  <SelectTrigger className="flex-1 rounded-full bg-gray-50 border border-gray-200 shadow-sm focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 text-sm">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                                     <SelectContent className="bg-white">
                     <SelectItem value="todos">Todos</SelectItem>
                     <SelectItem value="pending">Pendentes</SelectItem>
                     <SelectItem value="executing">Executando</SelectItem>
                     <SelectItem value="confirmed">Confirmados</SelectItem>
                     <SelectItem value="completed">Concluídos</SelectItem>
                     <SelectItem value="canceled">Cancelados</SelectItem>
                     <SelectItem value="no-show">Não Compareceu</SelectItem>
                   </SelectContent>
                </Select>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2 rounded-full bg-gray-50 border border-gray-200 shadow-sm focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 text-sm">
                      <CalendarRange className="h-4 w-4" />
                      {dateFilter ? format(dateFilter, 'dd/MM') : "Data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white" align="end">
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
                          Limpar
                        </Button>
                      </div>
                    )}
                  </PopoverContent>
                </Popover>
                <Button 
                  variant="outline" 
                  onClick={handleRefresh} 
                  disabled={isLoading || isRefetching || isManualRefreshing}
                  className="gap-2 rounded-full bg-gray-50 border border-gray-200 shadow-sm focus:border-cyan-400 focus:ring-2 focus:ring-cyan-100 text-sm"
                >
                  <RefreshCcw className={`h-4 w-4 ${(isRefetching || isManualRefreshing) ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </div>
          </div>

          {/* Conteúdo principal */}
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-cyan-500" />
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12">
              <div className="flex flex-col items-center">
                <Calendar className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento encontrado</h3>
                <p className="text-gray-500 mb-6">Você ainda não possui agendamentos.</p>
                <Button 
                  onClick={() => setLocation('/client/new-booking')}
                  className="gap-2 bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400"
                >
                  <Calendar className="h-4 w-4" />
                  Fazer primeiro agendamento
                </Button>
              </div>
            </div>
          ) : (
            <div className="mb-1">
              <div className="flex items-center justify-between mb-2">
                <h2 className="text-[1.1rem] font-bold text-neutral-900 border-l-4 border-cyan-400 pl-2 tracking-wide">
                  Agendamentos
                </h2>
              </div>
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="overview" className="text-xs">Visão Geral</TabsTrigger>
                  <TabsTrigger value="list" className="text-xs">Lista</TabsTrigger>
                </TabsList>
                
                <TabsContent value="overview" className="mt-0">
                  <div className="space-y-2">
                    {filteredOverviewAppointments.length > 0 ? (
                      filteredOverviewAppointments.slice(0, 6).map((appointment) => (
                        <AppointmentCard key={appointment.id} appointment={appointment} />
                      ))
                    ) : (
                      <div className="flex flex-col items-center py-4 text-neutral-400 text-sm">
                        Nenhum agendamento próximo.
                      </div>
                    )}
                  </div>
                  {/* Seção de agendamentos cancelados */}
                  {filteredOverviewCanceled.length > 0 && (
                    <div className="mt-6">
                      <h2 className="font-bold text-red-700 text-base tracking-wide">Cancelados</h2>
                      <div className="space-y-2">
                        {filteredOverviewCanceled.map((appointment) => (
                          <AppointmentCard key={appointment.id} appointment={appointment} hidePaymentStatus />
                        ))}
                      </div>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="list" className="mt-0">
                  <div className="space-y-2">
                    {filteredAppointments.length > 0 ? (
                      filteredAppointments.map((appointment) => (
                        <AppointmentCard key={appointment.id} appointment={appointment} />
                      ))
                    ) : (
                      <div className="flex flex-col items-center py-4 text-neutral-400 text-sm">
                        Nenhum agendamento encontrado com os filtros aplicados.
                      </div>
                    )}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>
      </div>
      
      {/* Navegação inferior */}
      <Navbar />
    </div>
  );
}

// Componente de card de agendamento seguindo o padrão do dashboard
function AppointmentCard({ appointment, hidePaymentStatus }: { appointment: Appointment, hidePaymentStatus?: boolean }) {
  const [, navigate] = useLocation();
  
  const goToAppointmentDetails = () => {
    navigate(`/client/appointments/${appointment.id}`);
  };

  // Determinar cor baseada no status (seguindo o padrão do dashboard)
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'confirmado':
        return 'bg-green-50';
      case 'pending':
        return 'bg-yellow-50';
      case 'executing':
        return 'bg-blue-50';
      case 'completed':
        return 'bg-cyan-50';
      case 'canceled':
        return 'bg-red-50';
      case 'no-show':
        return 'bg-orange-50';
      default:
        return 'bg-cyan-50';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
      case 'confirmado':
        return <CheckCircle2 className="text-green-400" size={22} />;
      case 'pending':
        return <Clock className="text-yellow-500" size={22} />;
      case 'executing':
        return <Clock className="text-blue-500" size={22} />;
      case 'completed':
        return <CheckCircle2 className="text-cyan-400" size={22} />;
      case 'canceled':
        return <X className="text-red-400" size={22} />;
      case 'no-show':
        return <X className="text-orange-400" size={22} />;
      default:
        return <CheckCircle2 className="text-cyan-400" size={22} />;
    }
  };

  // Função para traduzir status do pagamento
  const getPaymentStatusText = (status: string | null | undefined) => {
    if (!status || status === 'pending' || status === 'aguardando_pagamento') return 'Aguardando pagamento';
    if (status === 'confirmado' || status === 'paid') return 'Pago';
    if (status === 'failed') return 'Pagamento falhou';
    if (status === 'refunded') return 'Pagamento reembolsado';
    return status;
  };

  // Função para traduzir status do agendamento
  const getAppointmentStatusText = (status: string | null | undefined) => {
    if (!status || status === 'pending') return 'Pendente';
    if (status === 'confirmed' || status === 'confirmado') return 'Confirmado';
    if (status === 'executing' || status === 'executando') return 'Executando';
    if (status === 'completed' || status === 'concluído') return 'Concluído';
    if (status === 'canceled' || status === 'cancelado') return 'Cancelado';
    if (status === 'no-show') return 'Não Compareceu';
    return status;
  };

  // Formatar preço
  const formatPrice = (price?: number | null) => {
    if (price === null || price === undefined) return "N/A";
    return `R$ ${(price / 100).toFixed(2).replace('.', ',')}`;
  };
  
  return (
    <div 
      className={`flex items-start bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-2xl shadow p-4 mb-4 hover:shadow-lg transition-all duration-150 cursor-pointer ${{
        'pending': 'min-h-[4.5rem]',
        'default': 'min-h-[3.5rem]'
      }[appointment.status]}`}
      onClick={goToAppointmentDetails}
      style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.04)' }}
    >
      <div className={`flex items-center justify-center w-12 h-12 rounded-full mr-3 mt-1 ${getStatusColor(appointment.status)}`}>
        {getStatusIcon(appointment.status)}
      </div>
      <div className="flex-1 min-w-0 flex flex-col">
        <div className="font-semibold text-[1rem] text-neutral-900 truncate leading-tight mb-1">
          {appointment.serviceName || `Serviço #${appointment.serviceId}`}
        </div>
        <div className="text-xs text-cyan-700 font-medium leading-tight mb-0.5">
          {appointment.startTime} - {appointment.endTime}
          {(() => {
            const today = new Date().toISOString().split('T')[0];
            const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
            if (appointment.date === today) {
              return ' • Hoje';
            } else if (appointment.date === tomorrow) {
              return ' • Amanhã';
            }
            return '';
          })()}
        </div>
        <div className="text-xs text-neutral-400 truncate leading-tight mb-0.5">
          {appointment.providerName || `Prestador #${appointment.providerId}`}
        </div>
        {/* Status do agendamento */}
        <div className="flex flex-col gap-1 mt-1">
          <span className="text-xs font-medium text-neutral-700 flex items-center gap-1">
            <StatusBadge status={appointment.status} />
          </span>
          {!hidePaymentStatus && (
            <span className="text-xs font-medium text-neutral-700 flex items-center gap-1">
              <PaymentStatusBadge status={appointment.paymentStatus} />
            </span>
          )}
        </div>
        {appointment.totalPrice && appointment.totalPrice > 0 && (
          <div className="text-xs text-neutral-600 font-medium leading-tight mt-1">
            {formatPrice(appointment.totalPrice)}
          </div>
        )}
        {/* Botões de ação */}
        <div className="flex flex-row gap-2 mt-3 justify-end">
          <button
            className="px-4 py-1.5 text-xs rounded-full bg-gray-100 text-cyan-700 font-semibold shadow-sm hover:bg-cyan-100 hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-200"
            onClick={(e) => {
              e.stopPropagation();
              goToAppointmentDetails();
            }}
          >
            Ver
          </button>
          {(appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'confirmado') && (
            <button
              className="px-4 py-1.5 text-xs rounded-full bg-red-100 text-red-700 font-semibold shadow-sm hover:bg-red-200 hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-200"
              onClick={(e) => {
                e.stopPropagation();
                // TODO: implementar lógica de cancelamento (abrir modal de confirmação, chamar API, etc)
                alert('Funcionalidade de cancelamento em breve!');
              }}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}