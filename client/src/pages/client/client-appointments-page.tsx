import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Calendar, Clock, MapPin, Phone, RefreshCcw, Search,
  Filter, CalendarRange, Loader2, Check, X, Eye, SquarePen,
  Home, User
} from "lucide-react";
import AppHeader from "@/components/layout/app-header";
import ClientLayout from "@/components/layout/client-layout";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Appointment } from "@/types";
// Removido import de Spinner que não existe
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

// Função auxiliar para agrupar agendamentos por status
const groupAppointmentsByStatus = (appointments: Appointment[]) => {
  const upcoming = appointments.filter(
    (a) => a.status !== "completed" && a.status !== "canceled"
  ).sort((a, b) => {
    // Ordenar por data e hora
    const dateA = new Date(`${a.date}T${a.startTime}`);
    const dateB = new Date(`${b.date}T${b.startTime}`);
    return dateA.getTime() - dateB.getTime();
  });
  
  const completed = appointments.filter(
    (a) => a.status === "completed"
  ).sort((a, b) => {
    // Ordenar por data e hora (mais recentes primeiro)
    const dateA = new Date(`${a.date}T${a.startTime}`);
    const dateB = new Date(`${b.date}T${b.startTime}`);
    return dateB.getTime() - dateA.getTime();
  });
  
  const canceled = appointments.filter(
    (a) => a.status === "canceled"
  ).sort((a, b) => {
    // Ordenar por data e hora (mais recentes primeiro)
    const dateA = new Date(`${a.date}T${a.startTime}`);
    const dateB = new Date(`${b.date}T${b.startTime}`);
    return dateB.getTime() - dateA.getTime();
  });
  
  return { upcoming, completed, canceled };
};

// Função para formatar data em formato legível
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return format(date, "EEE, dd 'de' MMMM", { locale: ptBR });
};

// Componente para badge de status
const StatusBadge = ({ status }: { status: string | null }) => {
  if (!status) return null;
  
  let variant = "outline";
  let label = status;
  
  switch (status) {
    case "confirmed":
      variant = "default";
      label = "Confirmado";
      break;
    case "pending":
      variant = "secondary";
      label = "Pendente";
      break;
    case "completed":
      variant = "outline";
      label = "Concluído";
      break;
    case "canceled":
      variant = "destructive";
      label = "Cancelado";
      break;
    default:
      variant = "outline";
  }
  
  return (
    <Badge variant={variant as any} className="ml-2">
      {label}
    </Badge>
  );
};

export default function ClientAppointmentsPage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("cards");
  const [cardFilter, setCardFilter] = useState("upcoming");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<Date | undefined>(undefined);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  
  // Buscar agendamentos com configuração de staleTime e refetch
  const { 
    data: appointments = [], 
    isLoading,
    refetch,
    isRefetching
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments", { date: dateFilter?.toISOString().split('T')[0] }],
    staleTime: 30 * 1000, // 30 segundos - tempo mais curto para garantir que novos agendamentos apareçam
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
  
  // Verificar rotas de entrada - se vier do /client/new-booking, atualizar automaticamente
  useEffect(() => {
    const checkPathAndRefresh = async () => {
      const referrer = document.referrer;
      // Se vier da página de criação de agendamento, atualizar automaticamente
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
  
  // Agrupar agendamentos por status (usado para a visualização em cards)
  // Garantir que appointments é um array antes de processar
  const groupedAppointments = groupAppointmentsByStatus(Array.isArray(appointments) ? appointments : []);
  
  // Filtrar agendamentos para a visualização em tabela
  const filteredAppointments = appointments?.filter(appointment => {
    // Filtro por status
    if (statusFilter && appointment.status !== statusFilter) {
      return false;
    }
    
    // Filtro por pesquisa (nome do prestador ou serviço)
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
  });



  return (
    <ClientLayout>
      <AppHeader title="Meus Agendamentos" />
      
      <div className="p-4">
        <Tabs defaultValue="cards" value={activeTab} onValueChange={setActiveTab}>
          <div className="flex justify-between items-center mb-4">
            <TabsList>
              <TabsTrigger value="todos">Tabela</TabsTrigger>
              <TabsTrigger value="cards">Cards</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
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
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleRefresh} 
                disabled={isLoading || isRefetching || isManualRefreshing}
                className="gap-1"
              >
                <RefreshCcw className={`h-4 w-4 ${(isRefetching || isManualRefreshing) ? 'animate-spin' : ''}`} />
                {isManualRefreshing ? 'Atualizando...' : 'Atualizar'}
              </Button>
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <TabsContent value="todos">
                <Card>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-center">
                      <CardTitle>Meus Agendamentos</CardTitle>
                      <div className="flex items-center gap-2">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            type="search" 
                            placeholder="Buscar..." 
                            className="pl-8 w-[200px]" 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                        </div>
                        
                        <Select value={statusFilter || "todos"} onValueChange={(value) => setStatusFilter(value === "todos" ? null : value)}>
                          <SelectTrigger className="w-[160px]">
                            <SelectValue placeholder="Todos os status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os status</SelectItem>
                            <SelectItem value="pending">Pendentes</SelectItem>
                            <SelectItem value="confirmed">Confirmados</SelectItem>
                            <SelectItem value="completed">Concluídos</SelectItem>
                            <SelectItem value="canceled">Cancelados</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </CardHeader>
                  
                  <CardContent>
                    {filteredAppointments.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>ID</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Horário</TableHead>
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
                              <TableCell>{formatTableDate(appointment.date)}</TableCell>
                              <TableCell>{appointment.startTime} - {appointment.endTime}</TableCell>
                              <TableCell>{appointment.providerName || `Prestador #${appointment.providerId}`}</TableCell>
                              <TableCell>{appointment.serviceName || `Serviço #${appointment.serviceId}`}</TableCell>
                              <TableCell>{formatPrice(appointment.totalPrice)}</TableCell>
                              <TableCell>{renderStatusBadge(appointment.status)}</TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setLocation(`/client/appointments/${appointment.id}`)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="flex flex-col items-center py-6 text-neutral-500 dark:text-neutral-400">
                        <svg width="64" height="64" fill="none" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#F3F4F6"/><path d="M32 20v12l8 4" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        <p className="mt-2">Nenhum agendamento encontrado.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="cards">
                {/* Cards de estatísticas */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:shadow-lg transition-all">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-blue-700">Próximos</p>
                          <p className="text-3xl font-bold text-blue-900 mt-2">{groupedAppointments.upcoming.length}</p>
                          <p className="text-xs text-blue-600 mt-1">Agendamentos futuros</p>
                        </div>
                        <div className="p-3 bg-blue-200 rounded-full">
                          <Calendar className="h-6 w-6 text-blue-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 hover:shadow-lg transition-all">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-green-700">Concluídos</p>
                          <p className="text-3xl font-bold text-green-900 mt-2">{groupedAppointments.completed.length}</p>
                          <p className="text-xs text-green-600 mt-1">Serviços realizados</p>
                        </div>
                        <div className="p-3 bg-green-200 rounded-full">
                          <Check className="h-6 w-6 text-green-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200 hover:shadow-lg transition-all">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-sm font-medium text-red-700">Cancelados</p>
                          <p className="text-3xl font-bold text-red-900 mt-2">{groupedAppointments.canceled.length}</p>
                          <p className="text-xs text-red-600 mt-1">Agendamentos cancelados</p>
                        </div>
                        <div className="p-3 bg-red-200 rounded-full">
                          <X className="h-6 w-6 text-red-700" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Filtros por status */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Button
                    variant={cardFilter === "upcoming" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardFilter("upcoming")}
                    className="flex items-center gap-2"
                  >
                    <Calendar className="h-4 w-4" />
                    Próximos
                    {groupedAppointments.upcoming.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {groupedAppointments.upcoming.length}
                      </Badge>
                    )}
                  </Button>
                  
                  <Button
                    variant={cardFilter === "completed" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardFilter("completed")}
                    className="flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Concluídos
                    {groupedAppointments.completed.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {groupedAppointments.completed.length}
                      </Badge>
                    )}
                  </Button>
                  
                  <Button
                    variant={cardFilter === "canceled" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCardFilter("canceled")}
                    className="flex items-center gap-2"
                  >
                    <X className="h-4 w-4" />
                    Cancelados
                    {groupedAppointments.canceled.length > 0 && (
                      <Badge variant="secondary" className="ml-1">
                        {groupedAppointments.canceled.length}
                      </Badge>
                    )}
                  </Button>
                </div>
                
                {/* Grid de cards de agendamentos */}
                {cardFilter === "upcoming" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedAppointments.upcoming.length > 0 ? (
                      groupedAppointments.upcoming.map((appointment) => (
                        <AppointmentCard key={appointment.id} appointment={appointment} />
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <div className="flex flex-col items-center">
                          <Calendar className="h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento próximo</h3>
                          <p className="text-gray-500">Você não possui agendamentos futuros no momento.</p>
                          <Button 
                            className="mt-4" 
                            onClick={() => setLocation('/client/new-booking-wizard-page')}
                          >
                            Fazer novo agendamento
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {cardFilter === "completed" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedAppointments.completed.length > 0 ? (
                      groupedAppointments.completed.map((appointment) => (
                        <AppointmentCard key={appointment.id} appointment={appointment} />
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <div className="flex flex-col items-center">
                          <Check className="h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento concluído</h3>
                          <p className="text-gray-500">Você ainda não possui agendamentos concluídos.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {cardFilter === "canceled" && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {groupedAppointments.canceled.length > 0 ? (
                      groupedAppointments.canceled.map((appointment) => (
                        <AppointmentCard key={appointment.id} appointment={appointment} />
                      ))
                    ) : (
                      <div className="col-span-full text-center py-12">
                        <div className="flex flex-col items-center">
                          <X className="h-16 w-16 text-gray-300 mb-4" />
                          <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum agendamento cancelado</h3>
                          <p className="text-gray-500">Você não possui agendamentos cancelados.</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>
            </>
          )}
        </Tabs>
      </div>
    </ClientLayout>
  );
}

// Componente de card de agendamento
function AppointmentCard({ appointment }: { appointment: Appointment }) {
  const [, navigate] = useLocation();
  
  const goToAppointmentDetails = () => {
    navigate(`/client/appointments/${appointment.id}`);
  };

  // Determinar cor baseada no status
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'border-blue-200 bg-blue-50';
      case 'pending':
        return 'border-yellow-200 bg-yellow-50';
      case 'completed':
        return 'border-green-200 bg-green-50';
      case 'canceled':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  // Formatar preço
  const formatPrice = (price?: number | null) => {
    if (price === null || price === undefined) return "N/A";
    return `R$ ${(price / 100).toFixed(2).replace('.', ',')}`;
  };
  
  return (
    <Card className={`rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border-2 ${getStatusColor(appointment.status)} hover:scale-[1.02] cursor-pointer`} onClick={goToAppointmentDetails}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold text-gray-900 mb-1">
              {appointment.serviceName || `Serviço #${appointment.serviceId}`}
            </CardTitle>
            <p className="text-sm text-gray-600 font-medium">
              {appointment.providerName || `Prestador #${appointment.providerId}`}
            </p>
          </div>
          <StatusBadge status={appointment.status} />
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Data e Hora */}
        <div className="space-y-3 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Calendar className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">{formatDate(appointment.date)}</p>
              <p className="text-xs text-gray-500">Data do agendamento</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
              <Clock className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {appointment.startTime} - {appointment.endTime}
              </p>
              <p className="text-xs text-gray-500">Horário</p>
            </div>
          </div>
        </div>

        {/* Endereço se disponível */}
        {appointment.providerAddress && (
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm">
              <MapPin className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {appointment.providerAddress}
              </p>
              <p className="text-xs text-gray-500">Local</p>
            </div>
          </div>
        )}

        {/* Preço */}
        {appointment.totalPrice && (
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200 mb-4">
            <span className="text-sm font-medium text-gray-700">Valor total:</span>
            <span className="text-lg font-bold text-green-600">
              {formatPrice(appointment.totalPrice)}
            </span>
          </div>
        )}

        {/* Ações */}
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <Button 
            variant="outline" 
            size="sm" 
            className="flex-1 text-xs"
            onClick={(e) => {
              e.stopPropagation();
              goToAppointmentDetails();
            }}
          >
            <Eye className="h-3 w-3 mr-1" />
            Ver detalhes
          </Button>
          
          {appointment.status !== "canceled" && appointment.status !== "completed" && (
            <Button 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={(e) => {
                e.stopPropagation();
                // Implementar contato via WhatsApp ou telefone
                // TODO: Adicionar providerPhone ao tipo Appointment quando disponível
                toast({
                  title: "Contato",
                  description: "Funcionalidade de contato será implementada em breve.",
                });
              }}
            >
              <Phone className="h-3 w-3 mr-1" />
              Contatar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}