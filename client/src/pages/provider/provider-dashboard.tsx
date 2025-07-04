import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { 
  Calendar, 
  Scissors, 
  CalendarPlus,
  Clock,
  BellIcon,
  Info,
  ClipboardList,
  BarChart,
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  Settings,
  Sparkles,
  Target,
  Award,
  Activity,
  PlusCircle,
  Search,
  Home,
  User,
} from "lucide-react";
import { AppointmentItem } from "@/components/appointment-item";
import { NotificationsMenu } from "@/components/ui/notifications-menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatCurrency, formatDateToBR } from "@/lib/utils";
import { Appointment } from "@/types";
import AppHeader from "@/components/layout/app-header";
import { PageTransition } from "@/components/ui/page-transition";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import WeeklyCalendar, { WeeklyCalendarAppointment } from "@/components/dashboard/weekly-calendar";
import { toast } from "@/hooks/use-toast";
import ProviderLayout from "@/components/layout/provider-layout";

export default function ProviderDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  
  // Fetch provider settings
  const { 
    data: providerSettings, 
    isLoading: isSettingsLoading 
  } = useQuery({
    queryKey: ["/api/provider-settings"],
    refetchOnMount: true,
    staleTime: 30 * 1000,
    retry: 1,
  });
  
  // Fetch appointments
  const { 
    data: appointments = [], 
    isLoading: areAppointmentsLoading 
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    staleTime: 60 * 1000,
    retry: 1,
  });
  
  // Fetch provider services
  const { 
    data: services = [], 
    isLoading: areServicesLoading 
  } = useQuery({
    queryKey: [`/api/provider-services/provider/${user?.id}`],
    staleTime: 300 * 1000,
    retry: 1,
    enabled: !!user?.id,
  });
  
  // Online/Offline status
  const [isOnline, setIsOnline] = useState<boolean>(false);
  
  useEffect(() => {
    if (providerSettings && !isSettingsLoading) {
      setIsOnline(providerSettings.isOnline ?? false);
    }
  }, [providerSettings, isSettingsLoading]);
  
  // Update online status mutation
  const updateOnlineStatusMutation = useMutation({
    mutationFn: async (isOnline: boolean) => {
      const res = await apiRequest("PUT", "/api/provider-settings", { isOnline });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-settings"] });
    }
  });
  
  const handleOnlineToggle = (checked: boolean) => {
    setIsOnline(checked);
    updateOnlineStatusMutation.mutate(checked);
  };
  
  // Today's appointments
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments.filter(a => a.date === today);
  
  // Stats
  const stats = {
    todayAppointments: todayAppointments.length,
    monthlyRevenue: 245000,
    manualAppointments: 3,
    manualRevenue: 85000
  };
  
  // Upcoming appointments
  const upcomingAppointments = appointments
    .filter(a => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      return a.date >= today;
    })
    .sort((a, b) => {
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 5);
  
  // Convert appointments to calendar events
  const convertToCalendarEvents = (appointments: Appointment[]): WeeklyCalendarAppointment[] => {
    if (!appointments || !Array.isArray(appointments)) return [];
    
    return appointments.map(appointment => {
      let backgroundColor = '#3b82f6';
      let borderColor = '#2563eb';
      let textColor = '#ffffff';
      
      if (appointment.status === 'canceled') {
        backgroundColor = '#ef4444';
        borderColor = '#dc2626';
      } else if (appointment.status === 'pending') {
        backgroundColor = '#f97316';
        borderColor = '#ea580c';
      } else if (appointment.status === 'completed') {
        backgroundColor = '#22c55e';
        borderColor = '#16a34a';
      }
      
      const startDate = `${appointment.date}T${appointment.startTime}:00`;
      const endDate = `${appointment.date}T${appointment.endTime}:00`;
      
      return {
        id: appointment.id.toString(),
        title: appointment.serviceName || 'Agendamento',
        start: startDate,
        end: endDate,
        backgroundColor,
        borderColor,
        textColor,
        extendedProps: {
          client: appointment.clientName || '',
          status: appointment.status,
          serviceName: appointment.serviceName,
          notes: appointment.notes,
          isManuallyCreated: appointment.isManuallyCreated || false,
          clientPhone: appointment.clientPhone || '',
          clientEmail: appointment.clientEmail || '',
          price: appointment.price || 0,
          duration: 30,
          payment_status: appointment.payment_status
        }
      };
    });
  };
  
  const handleCalendarEventClick = (info: any) => {
    const appointmentId = info.event.id;
    toast({
      title: info.event.title,
      description: `Cliente: ${info.event.extendedProps.client || 'Não informado'} - Status: ${info.event.extendedProps.status || 'Não informado'}`,
    });
  };

  return (
    <ProviderLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 overflow-x-hidden">
        <PageTransition>
          <div className="container mx-auto py-6 px-1 sm:px-4 max-w-7xl w-full overflow-x-hidden">
            {/* Header */}
            <header className="flex flex-col items-center justify-center px-2 sm:px-4 pt-6 pb-2 w-full">
              <img src="/AgendoAilogo.png" alt="AgendoAI Logo" className="h-16 w-auto mb-2" />
            </header>

            {/* Quick Actions */}
            {/* Removido conforme solicitado: botões circulares de Novo Serviço e Buscar Cliente */}

            {/* User Info */}
            <motion.div 
              className="mb-8 flex items-center justify-between" 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center">
                <Avatar className="h-16 w-16 mr-6 shadow-lg">
                  <AvatarImage src={user?.profileImage || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-gray-900 to-gray-700 text-white text-xl font-bold">
                    {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "PR"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm text-gray-500 font-medium mb-1">Bem-vindo(a) de volta,</p>
                  <h1 className="text-3xl font-bold text-gray-900">{user?.name || "Prestador"}</h1>
                  <p className="text-gray-600 mt-1">Gerencie seus serviços e agendamentos</p>
                </div>
              </div>
              
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-right">
                  <p className="text-sm text-gray-500">Status</p>
                  <p className={`font-semibold ${isOnline ? 'text-green-600' : 'text-gray-500'}`}>
                    {isOnline ? 'Disponível' : 'Indisponível'}
                  </p>
                </div>
                <Switch 
                  checked={isOnline} 
                  onCheckedChange={handleOnlineToggle}
                />
              </div>
            </motion.div>
            
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2 mb-6 w-full max-w-full min-w-0 overflow-x-auto">
              <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white border-0 shadow-lg p-0">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Agendamentos Hoje</p>
                    <p className="text-white text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1">{stats.todayAppointments}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-600 to-green-700 text-white border-0 shadow-lg p-0">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Receita Mensal</p>
                    <p className="text-white text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1">{formatCurrency(stats.monthlyRevenue)}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-600 to-purple-700 text-white border-0 shadow-lg p-0">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <Users className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Clientes Atendidos</p>
                    <p className="text-white text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1">{stats.manualAppointments}</p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-600 to-orange-700 text-white border-0 shadow-lg p-0">
                <CardContent className="p-3 sm:p-6">
                  <div className="flex items-center justify-between mb-2 sm:mb-4">
                    <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-xl bg-white/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                  <div>
                    <p className="text-white/70 text-xs sm:text-sm font-medium mb-0.5 sm:mb-1">Taxa de Conversão</p>
                    <p className="text-white text-xl sm:text-2xl font-bold mb-0.5 sm:mb-1">85%</p>
                  </div>
                </CardContent>
              </Card>
            </div>
            
            {/* Tabs */}
            <Tabs defaultValue="summary" className="mb-8 w-full">
              <TabsList className="mb-6 bg-white/80 backdrop-blur-sm border border-gray-200 shadow-lg">
                <TabsTrigger value="summary" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                  <Activity className="h-4 w-4 mr-2" />
                  Resumo
                </TabsTrigger>
                <TabsTrigger value="calendar" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white">
                  <Calendar className="h-4 w-4 mr-2" />
                  Calendário Semanal
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="summary" className="space-y-8">
                {/* Quick Actions */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <Sparkles className="h-6 w-6 text-gray-700" />
                      Ações Rápidas
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2 w-full max-w-full min-w-0 overflow-x-auto">
                    <Button 
                      onClick={() => setLocation("/provider/manual-booking")}
                      className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300 text-xs sm:text-sm px-2 sm:px-0"
                    >
                      <CalendarPlus className="h-6 w-6" />
                      <span className="text-xs font-medium">Novo Agendamento</span>
                    </Button>
                    
                    <Button 
                      onClick={() => setLocation("/provider/schedule")}
                      variant="outline"
                      className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 text-xs sm:text-sm px-2 sm:px-0"
                    >
                      <Settings className="h-6 w-6 text-gray-700" />
                      <span className="text-xs font-medium text-gray-700">Configurar Horários</span>
                    </Button>
                    
                    <Button 
                      onClick={() => setLocation("/provider/services")}
                      variant="outline"
                      className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 text-xs sm:text-sm px-2 sm:px-0"
                    >
                      <Scissors className="h-6 w-6 text-gray-700" />
                      <span className="text-xs font-medium text-gray-700">Meus Serviços</span>
                    </Button>
                    
                    <Button 
                      onClick={() => setLocation("/provider/analytics")}
                      variant="outline"
                      className="h-16 sm:h-20 flex flex-col items-center justify-center space-y-1 sm:space-y-2 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300 text-xs sm:text-sm px-2 sm:px-0"
                    >
                      <BarChart className="h-6 w-6 text-gray-700" />
                      <span className="text-xs font-medium text-gray-700">Analytics</span>
                    </Button>
                  </div>
                </div>
                
                {/* Services */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <Scissors className="h-6 w-6 text-gray-700" />
                      Meus Serviços
                    </h2>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setLocation("/provider/services")}
                      className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      Ver todos →
                    </Button>
                  </div>
                  
                  {areServicesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                      {[...Array(4)].map((_, index) => (
                        <Card key={index} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                          <CardContent className="p-4">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-5 w-16 mb-3" />
                            <Skeleton className="h-3 w-20" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : services.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 w-full max-w-full min-w-0 overflow-x-auto">
                      {services.slice(0, 4).map((service) => (
                        <Card 
                          key={service.id} 
                          className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl cursor-pointer transition-all duration-300 group"
                          onClick={() => setLocation("/provider/services")}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                <Scissors className="h-4 w-4 text-white" />
                              </div>
                              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                {service.categoryName || "Categoria"}
                              </div>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2 truncate group-hover:text-blue-600 transition-colors break-words">
                              {service.serviceName}
                            </h3>
                            <p className="text-lg font-bold text-green-600">
                              {service.price != null ? formatCurrency(service.price) : service.defaultPrice ? formatCurrency(service.defaultPrice) : "R$ 0,00"}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50 p-4 sm:p-8 text-center w-full max-w-full">
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                        <Scissors className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum serviço cadastrado</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Comece criando seu primeiro serviço para receber agendamentos dos clientes
                      </p>
                      <Button 
                        onClick={() => setLocation("/provider/services")} 
                        size="lg"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                      >
                        <Plus className="h-5 w-5 mr-2" />
                        Cadastrar Primeiro Serviço
                      </Button>
                    </Card>
                  )}
                </div>
                
                {/* Today's Appointments */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <Calendar className="h-6 w-6 text-gray-700" />
                      Agendamentos de hoje
                    </h2>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {todayAppointments.length} agendamento{todayAppointments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {areAppointmentsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, index) => (
                        <Card key={index} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                          <CardContent className="p-4">
                            <div className="flex justify-between mb-3">
                              <Skeleton className="h-5 w-32" />
                              <Skeleton className="h-4 w-24" />
                            </div>
                            <div className="flex items-center">
                              <Skeleton className="w-12 h-12 rounded-xl mr-4" />
                              <div className="w-full">
                                <Skeleton className="h-4 w-28 mb-2" />
                                <Skeleton className="h-3 w-40" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : todayAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {todayAppointments.map((appointment) => (
                        <AppointmentItem 
                          key={appointment.id} 
                          appointment={appointment} 
                          userType="provider"
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm p-4 sm:p-8 text-center w-full max-w-full">
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum agendamento</h3>
                      <p className="text-gray-600">Não há agendamentos para hoje</p>
                    </Card>
                  )}
                </div>
                
                {/* Upcoming Appointments */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                      <Calendar className="h-6 w-6 text-gray-700" />
                      Próximos agendamentos
                    </h2>
                    <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {upcomingAppointments.length} agendamento{upcomingAppointments.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                  
                  {areAppointmentsLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, index) => (
                        <Card key={index} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                          <CardContent className="p-4">
                            <div className="flex justify-between mb-3">
                              <Skeleton className="h-5 w-32" />
                              <Skeleton className="h-4 w-24" />
                            </div>
                            <div className="flex items-center">
                              <Skeleton className="w-12 h-12 rounded-xl mr-4" />
                              <div className="w-full">
                                <Skeleton className="h-4 w-28 mb-2" />
                                <Skeleton className="h-3 w-40" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : upcomingAppointments.length > 0 ? (
                    <div className="space-y-4">
                      {upcomingAppointments.map((appointment) => (
                        <AppointmentItem 
                          key={appointment.id} 
                          appointment={appointment} 
                          userType="provider"
                        />
                      ))}
                    </div>
                  ) : (
                    <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm p-4 sm:p-8 text-center w-full max-w-full">
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum agendamento</h3>
                      <p className="text-gray-600">Não há agendamentos futuros</p>
                    </Card>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="calendar">
                <Card className="mb-6 border-0 shadow-xl bg-white/90 backdrop-blur-sm w-full max-w-full">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-2xl font-bold text-gray-900">
                      <Calendar className="h-6 w-6 mr-3 text-gray-700" />
                      Calendário de Agendamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-4 sm:p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between w-full max-w-full min-w-0">
                      <div className="flex items-center text-sm text-gray-600">
                        <Info className="h-4 w-4 mr-2" />
                        <span>Clique em um agendamento para ver mais detalhes</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLocation("/provider/manual-booking")}
                        className="bg-white hover:bg-gray-50 border-gray-300 shadow-sm"
                      >
                        <CalendarPlus className="h-4 w-4 mr-2" />
                        Novo Agendamento
                      </Button>
                    </div>
                  </CardContent>
                </Card>
                
                <WeeklyCalendar 
                  appointments={convertToCalendarEvents(appointments)}
                  isLoading={areAppointmentsLoading}
                  onEventClick={handleCalendarEventClick}
                />
              </TabsContent>
            </Tabs>

            {/* Bottom Navigation */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white shadow flex justify-around py-2 rounded-t-2xl z-50 w-full max-w-full">
              <button className="flex flex-col items-center text-blue-600 font-bold" aria-current="page">
                <Home className="h-6 w-6" />
                <span className="text-xs">Início</span>
              </button>
              <button className="flex flex-col items-center text-blue-600" onClick={() => setLocation('/provider/add-service-page')}>
                <PlusCircle className="h-6 w-6" />
                <span className="text-xs">Novo</span>
              </button>
              <button className="flex flex-col items-center text-blue-600" onClick={() => setLocation('/provider/clients-page')}>
                <Search className="h-6 w-6" />
                <span className="text-xs">Buscar</span>
              </button>
              <button className="flex flex-col items-center text-blue-600" onClick={() => setLocation('/provider/profile-page')}>
                <User className="h-6 w-6" />
                <span className="text-xs">Perfil</span>
              </button>
            </nav>
          </div>
        </PageTransition>
      </div>
    </ProviderLayout>
  );
}
