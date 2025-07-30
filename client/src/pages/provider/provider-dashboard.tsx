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
  AlertCircle,
  CheckCircle,
  ExternalLink,
  CalendarCheck,
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
import Navbar from "@/components/layout/navbar";

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
  
  // Adicionar busca do status da conta Stripe Connect
  const { data: stripeStatus, isLoading: isStripeStatusLoading, refetch: refetchStripeStatus } = useQuery({
    queryKey: ["/api/provider/stripe-status"],
    retry: 1,
  });

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

  // Itens de navegação para prestador
  const providerNavItems = [
    {
      icon: <Home size={26} />, label: "Início", href: "/provider/dashboard"
    },
    {
      icon: <Calendar size={26} />, label: "Agenda", href: "/provider/schedule"
    },
    {
      icon: <ClipboardList size={26} />, label: "Agendamentos", href: "/provider/appointments"
    },
    {
      icon: <Users size={26} />, label: "Clientes", href: "/provider/clients"
    },
    {
      icon: <Scissors size={26} />, label: "Serviços", href: "/provider/services-page"
    },
    {
      icon: <User size={26} />, label: "Perfil", href: "/provider/profile-page"
    },
  ];

  return (
    <div className="min-h-screen bg-white pb-20 overflow-x-hidden">
      {/* Conteúdo do dashboard aqui, ajuste os cards para usar border-neutral-200, bg-white, espaçamento consistente, etc. */}
      <ProviderLayout>
        <PageTransition>
          <div className="w-full max-w-full py-6 px-2 sm:px-4 overflow-x-hidden bg-white min-h-screen" style={{ maxWidth: '100vw', width: '100%' }}>
            {/* Header */}
            <header className="flex flex-row items-center justify-around px-6 sm:px-8 pt-4 pb-2 w-full">
              <img src="/AgendoAilogo.png" alt="AgendoAI Logo" className="h-12 w-auto" />
            </header>

            {/* Quick Actions */}
            {/* Removido conforme solicitado: botões circulares de Novo Serviço e Buscar Cliente */}

            {/* User Info */}
            <motion.div 
              className="mb-6 flex items-center justify-between" 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="flex items-center">
                <Avatar className="h-12 w-12 mr-4 shadow-lg">
                  <AvatarImage src={user?.profileImage || ""} />
                  <AvatarFallback className="bg-gradient-to-br from-[#58c9d1] to-[#58c9d1]/80 text-white text-lg font-bold">
                    {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || "PR"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs text-neutral-500 font-medium mb-1">Bem-vindo(a) de volta,</p>
                  <h1 className="text-xl font-bold text-neutral-900">{user?.name || "Prestador"}</h1>
                  <p className="text-neutral-600 text-sm mt-1">Gerencie seus serviços e agendamentos</p>
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
            
            {/* Stripe Connect Status */}
            {!isStripeStatusLoading && stripeStatus && (
              <div className="mb-6 w-full max-w-full overflow-hidden">
                {stripeStatus.status === "enabled" ? (
                  <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3 w-full max-w-full overflow-hidden">
                    <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-green-700 text-sm break-words">Conta Stripe conectada e habilitada para receber pagamentos.</p>
                      <a href={stripeStatus.dashboardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-blue-700 hover:underline mt-1 text-xs">
                        <ExternalLink className="h-3 w-3" /> Acessar painel Stripe
                      </a>
                    </div>
                  </div>
                ) : stripeStatus.status === "pending" ? (
                  <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 w-full max-w-full overflow-hidden">
                    <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-yellow-700 text-sm break-words">Conta Stripe conectada, mas pendente de verificação.</p>
                      <button onClick={stripeStatus.onboardingUrl ? () => window.open(stripeStatus.onboardingUrl, '_blank') : undefined} className="inline-flex items-center gap-1 text-blue-700 hover:underline mt-1 text-xs">
                        <ExternalLink className="h-3 w-3" /> Completar onboarding Stripe
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 w-full max-w-full overflow-hidden">
                    <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-red-700 text-sm break-words">Conta Stripe não conectada.</p>
                      <button onClick={stripeStatus.onboardingUrl ? () => window.open(stripeStatus.onboardingUrl, '_blank') : undefined} className="inline-flex items-center gap-1 text-blue-700 hover:underline mt-1 text-xs">
                        <ExternalLink className="h-3 w-3" /> Conectar conta Stripe
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-2 mb-4 w-full max-w-full overflow-hidden">
                              <Card className="bg-white border border-neutral-200 rounded-lg shadow-sm w-full max-w-full">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="w-6 h-6 rounded-lg bg-[#58c9d1]/10 flex items-center justify-center">
                        <Calendar className="h-4 w-4 text-[#58c9d1]" />
                      </div>
                      <span className="text-xs font-semibold text-neutral-500">Hoje</span>
                    </div>
                    <div className="text-lg font-bold text-neutral-900">{todayAppointments.length}</div>
                  </CardContent>
                </Card>
              <Card className="bg-white border border-neutral-200 rounded-lg shadow-sm w-full max-w-full">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="w-6 h-6 rounded-lg bg-[#58c9d1]/10 flex items-center justify-center">
                      <DollarSign className="h-4 w-4 text-[#58c9d1]" />
                    </div>
                    <span className="text-xs font-semibold text-neutral-500">Receita</span>
                  </div>
                  <div className="text-lg font-bold text-neutral-900">{formatCurrency((stats.monthlyRevenue || 0) / 100)}</div>
                </CardContent>
              </Card>
              <Card className="bg-white border border-neutral-200 rounded-lg shadow-sm w-full max-w-full">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="w-6 h-6 rounded-lg bg-[#58c9d1]/10 flex items-center justify-center">
                      <Users className="h-4 w-4 text-[#58c9d1]" />
                    </div>
                    <span className="text-xs font-semibold text-neutral-500">Clientes</span>
                  </div>
                  <div className="text-lg font-bold text-neutral-900">{stats.manualAppointments}</div>
                </CardContent>
              </Card>
              <Card className="bg-white border border-neutral-200 rounded-lg shadow-sm w-full max-w-full">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="w-6 h-6 rounded-lg bg-[#58c9d1]/10 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-[#58c9d1]" />
                    </div>
                    <span className="text-xs font-semibold text-neutral-500">Conversão</span>
                  </div>
                  <div className="text-lg font-bold text-neutral-900">85%</div>
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
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3 max-w-full overflow-hidden">
                      <Sparkles className="h-5 w-5 text-gray-700 flex-shrink-0" />
                      <span className="truncate">Ações Rápidas</span>
                    </h2>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 w-full overflow-x-hidden">
                    <Button 
                      onClick={() => setLocation("/provider/manual-booking")}
                      className="h-12 flex flex-col items-center justify-center space-y-1 bg-[#58c9d1] hover:bg-[#58c9d1]/90 text-white border-0 shadow-sm hover:shadow-md transition-all duration-300 text-xs px-2 w-full max-w-full"
                    >
                      <CalendarPlus className="h-4 w-4" />
                      <span className="text-xs font-medium">Novo</span>
                    </Button>
                    
                    <Button 
                      onClick={() => setLocation("/provider/schedule")}
                      variant="outline"
                      className="h-12 flex flex-col items-center justify-center space-y-1 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 shadow-sm hover:shadow-md transition-all duration-300 text-xs px-2"
                    >
                      <Settings className="h-4 w-4 text-neutral-700" />
                      <span className="text-xs font-medium text-neutral-700">Horários</span>
                    </Button>
                    
                    <Button 
                      onClick={() => setLocation("/provider/services")}
                      variant="outline"
                      className="h-12 flex flex-col items-center justify-center space-y-1 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 shadow-sm hover:shadow-md transition-all duration-300 text-xs px-2"
                    >
                      <Scissors className="h-4 w-4 text-neutral-700" />
                      <span className="text-xs font-medium text-neutral-700">Serviços</span>
                    </Button>
                    
                    <Button 
                      onClick={() => setLocation("/provider/analytics")}
                      variant="outline"
                      className="h-12 flex flex-col items-center justify-center space-y-1 border border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 shadow-sm hover:shadow-md transition-all duration-300 text-xs px-2"
                    >
                      <BarChart className="h-4 w-4 text-neutral-700" />
                      <span className="text-xs font-medium text-neutral-700">Analytics</span>
                    </Button>
                  </div>
                </div>
                
                {/* Services */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3 max-w-full overflow-hidden">
                      <Scissors className="h-5 w-5 text-gray-700 flex-shrink-0" />
                      <span className="truncate">Meus Serviços</span>
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
                    <div className="grid grid-cols-1 gap-0.5 w-full max-w-full overflow-hidden">
                      {[...Array(4)].map((_, index) => (
                        <Card key={index} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm w-full max-w-full">
                          <CardContent className="p-1 w-full max-w-full">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-5 w-16 mb-3" />
                            <Skeleton className="h-3 w-20" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : services.length > 0 ? (
                    <div className="grid grid-cols-1 gap-0.5 w-full max-w-full overflow-hidden">
                      {services.slice(0, 4).map((service) => (
                        <Card 
                          key={service.id} 
                          className="border border-neutral-200 shadow-sm bg-white hover:shadow-md cursor-pointer transition-all duration-300 group"
                          onClick={() => setLocation("/provider/services")}
                        >
                          <CardContent className="p-3 w-full max-w-full">
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-6 h-6 rounded-lg bg-[#58c9d1]/10 flex items-center justify-center">
                                <Scissors className="h-4 w-4 text-[#58c9d1]" />
                              </div>
                              <div className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
                                {service.categoryName || "Categoria"}
                              </div>
                            </div>
                            <h3 className="font-semibold text-neutral-900 mb-1 truncate group-hover:text-[#58c9d1] transition-colors break-words text-sm">
                              {service.serviceName}
                            </h3>
                            <p className="text-base font-bold text-green-600">
                              {service.price != null ? formatCurrency((service.price || 0) / 100) : service.defaultPrice ? formatCurrency((service.defaultPrice || 0) / 100) : "R$ 0,00"}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50 p-1 text-center w-full max-w-full overflow-hidden">
                      <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-2">
                        <Scissors className="h-5 w-5 text-gray-400" />
                      </div>
                      <h3 className="text-base font-semibold text-gray-900 mb-1">Nenhum serviço cadastrado</h3>
                      <p className="text-gray-600 mb-2 max-w-full mx-auto text-xs break-words">
                        Comece criando seu primeiro serviço para receber agendamentos dos clientes
                      </p>
                      <Button 
                        onClick={() => setLocation("/provider/services")} 
                        size="sm"
                        className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300 text-xs px-2 py-1"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Cadastrar Serviço
                      </Button>
                    </Card>
                  )}
                </div>
                
                {/* Today's Appointments */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3 max-w-full overflow-hidden">
                      <Calendar className="h-5 w-5 text-gray-700 flex-shrink-0" />
                      <span className="truncate">Agendamentos de hoje</span>
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
                    <div>
                      {todayAppointments.length > 3 && (
                        <div className="mb-3 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border">
                          📜 Mostrando 3 de {todayAppointments.length} agendamentos. Role para ver mais.
                        </div>
                      )}
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#d1d5db #f3f4f6'
                      }}>
                        {todayAppointments.map((appointment) => (
                          <AppointmentItem 
                            key={appointment.id} 
                            appointment={appointment} 
                            userType="provider"
                          />
                        ))}
                      </div>
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
                    <h2 className="text-xl font-bold text-gray-900 flex items-center gap-3 max-w-full overflow-hidden">
                      <Calendar className="h-5 w-5 text-gray-700 flex-shrink-0" />
                      <span className="truncate">Próximos agendamentos</span>
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
                    <div>
                      {upcomingAppointments.length > 3 && (
                        <div className="mb-3 text-xs text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border">
                          📜 Mostrando 3 de {upcomingAppointments.length} agendamentos. Role para ver mais.
                        </div>
                      )}
                      <div className="space-y-4 max-h-96 overflow-y-auto pr-2" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#d1d5db #f3f4f6'
                      }}>
                        {upcomingAppointments.map((appointment) => (
                          <AppointmentItem 
                            key={appointment.id} 
                            appointment={appointment} 
                            userType="provider"
                          />
                        ))}
                      </div>
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
          </div>
        </PageTransition>
      </ProviderLayout>
      <Navbar 
        items={[
          {
            icon: <Home size={26} />,
            label: 'Início',
            href: '/provider/dashboard'
          },
          {
            icon: <CalendarCheck size={26} />,
            label: 'Agenda',
            href: '/provider/schedule'
          },
          {
            icon: <PlusCircle size={32} className="animate-pulse" />,
            label: 'Novo',
            href: '/provider/manual-booking'
          },
          {
            icon: <Search size={26} />,
            label: 'Buscar',
            href: '/provider/search'
          },
          {
            icon: <User size={26} />,
            label: 'Perfil',
            href: '/provider/profile'
          }
        ]}
      />
    </div>
  );
}
