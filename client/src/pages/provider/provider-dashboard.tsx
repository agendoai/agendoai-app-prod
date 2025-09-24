import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useNotifications } from "@/hooks/use-notifications";
import { useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  LogOut,
  UserCircle,
  ArrowDownCircle
} from "lucide-react";
import { AppointmentItem } from "@/components/appointment-item";
import { NotificationsMenu } from "@/components/ui/notifications-menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import "./provider-dashboard.css";

export default function ProviderDashboard() {
  const [, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  
  // Função personalizada de logout com reload
  const handleLogout = async () => {
    await logout();
    window.location.reload();
  };
  
  // Fetch provider settings
  const { 
    data: providerSettings, 
    isLoading: isSettingsLoading 
  } = useQuery<{
    isOnline?: boolean;
    // Add other properties as needed
  }>({
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
  } = useQuery<any[]>({
    queryKey: [`/api/provider-services/provider/${user?.id}`],
    staleTime: 300 * 1000,
    retry: 1,
    enabled: !!user?.id,
  });
  
  // Online/Offline status
  const [isOnline, setIsOnline] = useState<boolean>(false);
  
  // Revenue filter state
  const [revenueFilter, setRevenueFilter] = useState<string>("today");
  
  // Adicionar busca do status da conta Stripe Connect
  const { data: stripeStatus, isLoading: isStripeStatusLoading, refetch: refetchStripeStatus } = useQuery({
    queryKey: ["/api/provider/stripe-connect-status"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/provider/stripe-connect-status");
      if (!response.ok) throw new Error("Falha ao carregar status do Stripe");
      return response.json();
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (providerSettings && !isSettingsLoading && providerSettings.hasOwnProperty('isOnline')) {
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
  
  // Today's appointments - ordenados do mais recente para o mais antigo
  const today = new Date().toISOString().split('T')[0];
  const todayAppointments = appointments
    .filter(a => a.date === today)
    .sort((a, b) => {
      // Ordenação decrescente por horário: mais recentes primeiro
      return b.startTime.localeCompare(a.startTime);
    });
  
  // Helper function to filter appointments by date range
  const getFilteredAppointments = (filter: string) => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    switch (filter) {
      case "today":
        return appointments.filter(a => a.date === today);
      case "week":
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        return appointments.filter(a => {
          const appointmentDate = new Date(a.date);
          return appointmentDate >= startOfWeek && appointmentDate <= endOfWeek;
        });
      case "month":
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return appointments.filter(a => {
          const appointmentDate = new Date(a.date);
          return appointmentDate >= startOfMonth && appointmentDate <= endOfMonth;
        });
      default:
        return appointments;
    }
  };

  // Stats
  const filteredAppointments = getFilteredAppointments(revenueFilter);
  
  const paidAppointments = filteredAppointments.filter(a => {
    const hasCompletedStatus = a.status === 'completed';
    const hasPrice = a.totalPrice && a.totalPrice > 0;
    
    return hasCompletedStatus && hasPrice;
  });
  
  const totalRevenue = paidAppointments.reduce((sum, a) => {
    // Os valores já estão em reais no banco de dados
    const priceInReais = a.totalPrice || 0;
    return sum + priceInReais;
  }, 0);

  const stats = {
    todayAppointments: todayAppointments.length,
    // Calcula a receita total incluindo apenas appointments com status de pagamento confirmado
    monthlyRevenue: totalRevenue,
    manualAppointments: paidAppointments.length,
    manualRevenue: totalRevenue
  };
  
  // Upcoming appointments - ordenados do mais recente para o mais antigo
  const upcomingAppointments = appointments
    .filter(a => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      return a.date >= today;
    })
    .sort((a, b) => {
      // Ordenação decrescente: mais recentes primeiro
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return b.startTime.localeCompare(a.startTime);
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
          client: (appointment as any).clientName || '',
          status: appointment.status,
          serviceName: appointment.serviceName,
          notes: appointment.notes,
          isManuallyCreated: (appointment as any).isManuallyCreated || false,
          clientPhone: (appointment as any).clientPhone || '',
          clientEmail: (appointment as any).clientEmail || '',
          price: (appointment as any).totalPrice || 0,
          duration: 30,
          payment_status: appointment.paymentStatus || ''
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
    <ProviderLayout>
      <PageTransition>
        <div className="min-h-screen bg-white pb-20 w-full">
          <div className="w-full min-h-screen">
            {/* Header */}
            <header className="flex flex-row items-center justify-between px-4 py-4 w-full bg-[#58c9d1]">
              <div className="flex items-center">
                <h1 className="text-white text-lg font-semibold">Dashboard</h1>
              </div>
              
              <div className="flex items-center space-x-3">
                {/* Notification Icon - Always visible */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-white hover:bg-white/20 rounded-full p-2 relative"
                  onClick={() => setLocation("/provider/notifications")}
                >
                  <BellIcon className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <Badge 
                      variant="destructive" 
                      className="absolute h-6 min-w-6 flex items-center justify-center p-1 text-xs font-bold bg-red-600 text-white border-2 border-white shadow-2xl rounded-full"
                      style={{ 
                        position: 'absolute', 
                        top: '-8px', 
                        right: '-8px', 
                        zIndex: 99999,
                        backgroundColor: '#dc2626',
                        color: 'white',
                        fontSize: '12px',
                        fontWeight: 'bold'
                      }}
                    >
                        {unreadCount}
                      </Badge>
                  )}
                </Button>
                
                {/* Three-dot Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-white hover:bg-white/20 rounded-full p-2"
                    >
                      <div className="w-1 h-1 rounded-full bg-white mb-1"></div>
                      <div className="w-1 h-1 rounded-full bg-white mb-1"></div>
                      <div className="w-1 h-1 rounded-full bg-white"></div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-white shadow-lg border-gray-200">
                    <DropdownMenuItem onClick={() => setLocation("/provider/profile")}>
                      <UserCircle className="h-4 w-4 mr-2" />
                      <span>Perfil</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setLocation("/provider/analytics")}>
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      <span>Saque</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      <span>Sair da conta</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            {/* Quick Actions */}
            {/* Removido conforme solicitado: botões circulares de Novo Serviço e Buscar Cliente */}

            {/* User Info */}
            <motion.div 
              className="mb-6 mt-6 flex items-center justify-between px-4 md:px-6 lg:px-8" 
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
              <div className="mb-6 w-full overflow-hidden px-4 md:px-6 lg:px-8">
                <div>
                  {stripeStatus.status === "enabled" ? (
                    <div className="flex items-start gap-3 bg-green-50 border border-green-200 rounded-lg p-3 w-full overflow-hidden">
                      <CheckCircle className="text-green-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-green-700 text-sm break-words">Conta Stripe conectada e habilitada para receber pagamentos.</p>
                        <a href={stripeStatus.dashboardUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 hover:underline mt-1 text-xs" style={{color: '#58c9d1'}}>
                          <ExternalLink className="h-3 w-3" /> Acessar painel Stripe
                        </a>
                      </div>
                    </div>
                  ) : stripeStatus.status === "pending" ? (
                    <div className="flex items-start gap-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3 w-full overflow-hidden">
                      <AlertCircle className="text-yellow-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-yellow-700 text-sm break-words">Conta Stripe conectada, mas pendente de verificação.</p>
                        <button onClick={stripeStatus.onboardingUrl ? () => window.open(stripeStatus.onboardingUrl, '_blank') : undefined} className="inline-flex items-center gap-1 hover:underline mt-1 text-xs" style={{color: '#58c9d1'}}>
                          <ExternalLink className="h-3 w-3" /> Completar onboarding Stripe
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg p-3 w-full overflow-hidden">
                      <AlertCircle className="text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-red-700 text-sm break-words">Conta Stripe não conectada.</p>
                        <button onClick={stripeStatus.onboardingUrl ? () => window.open(stripeStatus.onboardingUrl, '_blank') : undefined} className="inline-flex items-center gap-1 hover:underline mt-1 text-xs" style={{color: '#58c9d1'}}>
                          <ExternalLink className="h-3 w-3" /> Conectar conta Stripe
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 lg:gap-6 mb-6 w-full overflow-hidden px-2 md:px-4 lg:px-6 max-w-full">
              <div className="col-span-1">
                <Card className="bg-white border border-neutral-200 rounded-lg shadow-sm w-full h-full">
                  <CardContent className="p-3 md:p-4 lg:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[#58c9d1]/10 flex items-center justify-center">
                        <Calendar className="h-4 w-4 md:h-5 md:w-5 text-[#58c9d1]" />
                      </div>
                      <span className="text-xs md:text-sm font-semibold text-neutral-500">Hoje</span>
                    </div>
                    <div className="text-lg md:text-xl lg:text-2xl font-bold text-neutral-900">{todayAppointments.length}</div>
                  </CardContent>
                </Card>
              </div>
              <div className="col-span-1">
                <Card className="bg-white border border-neutral-200 rounded-lg shadow-sm w-full h-full">
                  <CardContent className="p-3 md:p-4 lg:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[#58c9d1]/10 flex items-center justify-center">
                        <DollarSign className="h-4 w-4 md:h-5 md:w-5 text-[#58c9d1]" />
                      </div>
                      <Select value={revenueFilter} onValueChange={setRevenueFilter}>
                        <SelectTrigger className="w-16 md:w-20 h-6 text-xs border-0 bg-transparent p-0">
                          <SelectValue />
                        </SelectTrigger>
                      <SelectContent className="bg-white border-gray-200 shadow-lg">
                        <SelectItem value="all" className="hover:bg-gray-50">Total</SelectItem>
                        <SelectItem value="today" className="hover:bg-gray-50">Hoje</SelectItem>
                        <SelectItem value="week" className="hover:bg-gray-50">Semana</SelectItem>
                        <SelectItem value="month" className="hover:bg-gray-50">Mês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="text-lg md:text-xl lg:text-2xl font-bold text-neutral-900">{formatCurrency(totalRevenue || 0)}</div>
                </CardContent>
              </Card>
              </div>
              <div className="col-span-2 lg:col-span-1">
                <Card className="bg-white border border-neutral-200 rounded-lg shadow-sm w-full h-full">
                  <CardContent className="p-3 md:p-4 lg:p-5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg bg-[#58c9d1]/10 flex items-center justify-center">
                        <Users className="h-4 w-4 md:h-5 md:w-5 text-[#58c9d1]" />
                      </div>
                      <span className="text-xs md:text-sm font-semibold text-neutral-500">Clientes</span>
                    </div>
                    <div className="text-lg md:text-xl lg:text-2xl font-bold text-neutral-900">{paidAppointments.length}</div>
                  </CardContent>
                </Card>
              </div>
            </div>
            
            {/* Tabs */}
            <Tabs defaultValue="summary" className="mb-8 w-full px-0">
              <div className="px-4 md:px-6 lg:px-8">
                <TabsList className="mb-6 bg-gray-100/80 backdrop-blur-sm border border-gray-200 shadow-lg w-full md:w-auto">
                  <TabsTrigger value="summary" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white flex-1 md:flex-initial">
                    <Activity className="h-4 w-4 mr-2" />
                    Resumo
                  </TabsTrigger>
                  {/* Tab do calendário comentada para remover elemento invisível
                  <TabsTrigger value="calendar" className="data-[state=active]:bg-gray-900 data-[state=active]:text-white flex-1 md:flex-initial">
                    <Calendar className="h-4 w-4 mr-2" />
                    Calendário Semanal
                  </TabsTrigger>
                  */}
                </TabsList>
              </div>
              
              <TabsContent value="summary" className="w-full space-y-4 px-2 md:px-4 lg:px-6">
              {/* Ações rápidas */}
              <div className="w-full bg-white border border-gray-200 p-4 md:p-6 lg:p-8 rounded-lg shadow-sm mx-0 max-w-full">
                <div className="flex items-center mb-6">
                  <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Sparkles className="h-5 w-5 md:h-6 md:w-6 text-gray-600" />
                    <span>Ações Rápidas</span>
                  </h2>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
                  <Button 
                    onClick={() => setLocation("/provider/manual-booking")}
                    className="h-12 md:h-14 lg:h-16 flex flex-col md:flex-row items-center justify-center space-y-1 md:space-y-0 md:space-x-2 bg-white hover:bg-gray-50 border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-lg"
                    style={{color: '#58c9d1', borderColor: '#58c9d1'}}
                  >
                    <CalendarPlus className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="font-medium text-xs md:text-sm lg:text-base">Novo Agendamento</span>
                  </Button>
                  
                  <Button 
                    onClick={() => setLocation("/provider/schedule")}
                    className="h-12 md:h-14 lg:h-16 flex flex-col md:flex-row items-center justify-center space-y-1 md:space-y-0 md:space-x-2 bg-white hover:bg-gray-50 border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-lg"
                    style={{color: '#58c9d1', borderColor: '#58c9d1'}}
                  >
                    <Settings className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="font-medium text-xs md:text-sm lg:text-base">Horários</span>
                  </Button>
                  
                  <Button 
                    onClick={() => setLocation("/provider/services")}
                    className="h-12 md:h-14 lg:h-16 flex flex-col md:flex-row items-center justify-center space-y-1 md:space-y-0 md:space-x-2 bg-white hover:bg-gray-50 border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-lg"
                    style={{color: '#58c9d1', borderColor: '#58c9d1'}}
                  >
                    <Scissors className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="font-medium text-xs md:text-sm lg:text-base">Serviços</span>
                  </Button>
                  
                  <Button 
                    onClick={() => setLocation("/provider/analytics")}
                    className="h-12 md:h-14 lg:h-16 flex flex-col md:flex-row items-center justify-center space-y-1 md:space-y-0 md:space-x-2 bg-white hover:bg-gray-50 border-2 border-gray-200 shadow-sm hover:shadow-md transition-all duration-300 rounded-lg"
                    style={{color: '#58c9d1', borderColor: '#58c9d1'}}
                  >
                    <BarChart className="h-4 w-4 md:h-5 md:w-5" />
                    <span className="font-medium text-xs md:text-sm lg:text-base">Analytics</span>
                  </Button>
                </div>
              </div>

                {/* Services */}
                <div className="w-full bg-white border border-gray-200 p-4 md:p-6 lg:p-8 rounded-lg shadow-sm mx-0 max-w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Scissors className="h-5 w-5 md:h-6 md:w-6" style={{color: '#58c9d1'}} />
                      Meus Serviços
                    </h2>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setLocation("/provider/services")}
                      className="text-sm font-medium hover:text-gray-900 px-3 py-2 rounded-lg"
                      style={{color: '#58c9d1'}}
                    >
                      Ver todos →
                    </Button>
                  </div>
                  
                  {areServicesLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[...Array(4)].map((_, index) => (
                        <Card key={index} className="border-0 shadow-sm bg-gray-100/80 backdrop-blur-sm">
                          <CardContent className="p-4">
                            <Skeleton className="h-4 w-24 mb-2" />
                            <Skeleton className="h-6 w-16 mb-3" />
                            <Skeleton className="h-3 w-20" />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : services.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {services.slice(0, 4).map((service: any) => (
                        <Card 
                          key={service.id} 
                          className="border border-neutral-200 shadow-sm bg-white hover:shadow-md cursor-pointer transition-all duration-300 group"
                          onClick={() => setLocation("/provider/services")}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="w-6 h-6 rounded-lg bg-[#58c9d1]/10 flex items-center justify-center">
                                <Scissors className="h-4 w-4 text-[#58c9d1]" />
                              </div>
                              <div className="text-xs text-neutral-500 bg-neutral-100 px-2 py-1 rounded-full">
                                {service.categoryName || "Categoria"}
                              </div>
                            </div>
                            <h3 className="font-semibold text-neutral-900 mb-2 truncate group-hover:text-[#58c9d1] transition-colors">
                              {service.serviceName}
                            </h3>
                            <p className="text-lg font-bold text-green-600">
                              {service.price != null ? formatCurrency(service.price || 0) : service.defaultPrice ? formatCurrency(service.defaultPrice || 0) : "R$ 0,00"}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50 p-6 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                        <Scissors className="h-6 w-6 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum serviço</h3>
                      <p className="text-gray-600 mb-4 max-w-sm mx-auto">
                        Crie seu primeiro serviço para começar a receber agendamentos
                      </p>
                      <Button 
                        onClick={() => setLocation("/provider/services")} 
                        size="sm"
                        className="text-white shadow-lg hover:shadow-xl transition-all duration-300"
                        style={{background: 'linear-gradient(to right, #58c9d1, #4fb3c4)'}}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Cadastrar Serviço
                      </Button>
                    </Card>
                  )}
                </div>
                
                {/* Today's Appointments */}
                <div className="w-full bg-white border border-gray-200 p-4 md:p-6 lg:p-8 rounded-lg shadow-sm mx-0 max-w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Calendar className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                      Agendamentos de hoje
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                        {todayAppointments.length}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLocation("/provider/appointments-management")}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 px-3 py-2 rounded-lg"
                      >
                        Ver todos →
                      </Button>
                    </div>
                  </div>
                  
                  {areAppointmentsLoading ? (
                    <div className="space-y-3">
                      {[...Array(3)].map((_, index) => (
                        <Card key={index} className="border-0 shadow-sm bg-gray-100/80 backdrop-blur-sm">
                          <CardContent className="p-4">
                            <div className="flex justify-between mb-3">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="flex items-center">
                              <Skeleton className="w-10 h-10 rounded-xl mr-3" />
                              <div className="flex-1">
                                <Skeleton className="h-4 w-32 mb-2" />
                                <Skeleton className="h-3 w-40" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : todayAppointments.length > 0 ? (
                    <div>
                      <div className="space-y-3 max-h-80 overflow-y-auto pr-2" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#d1d5db #f3f4f6'
                      }}>
                        {todayAppointments.map((appointment) => (
                          <Card key={appointment.id} className="border-0 shadow-sm bg-gray-100/80 backdrop-blur-sm hover:bg-gray-200/90 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center mb-3">
                                <span className="font-medium text-gray-900">{appointment.clientName}</span>
                                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{appointment.time}</span>
                              </div>
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center mr-3" style={{background: 'linear-gradient(to bottom right, #58c9d1, #4fb3c4)'}}>
                                  <Calendar className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 truncate">{appointment.serviceName}</p>
                                  <p className="text-sm text-gray-600">Agendamento confirmado</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Card className="border-0 shadow-sm bg-gray-100/80 backdrop-blur-sm p-6 text-center">
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                        <Calendar className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum agendamento</h3>
                      <p className="text-gray-600">Não há agendamentos para hoje</p>
                    </Card>
                  )}
                </div>
                
                {/* Upcoming Appointments */}
                <div className="w-full bg-white border border-gray-200 p-4 md:p-6 lg:p-8 rounded-lg shadow-sm mx-0 max-w-full">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
                      <Calendar className="h-5 w-5 md:h-6 md:w-6 text-gray-700" />
                      Próximos agendamentos
                    </h2>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full font-medium">
                        {upcomingAppointments.length}
                      </span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLocation("/provider/appointments-management")}
                        className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      >
                        Ver todos →
                      </Button>
                    </div>
                  </div>
                  
                  {areAppointmentsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                      {[...Array(6)].map((_, index) => (
                        <Card key={index} className="border-0 shadow-sm bg-gray-100/80 backdrop-blur-sm">
                          <CardContent className="p-4">
                            <div className="flex justify-between mb-3">
                              <Skeleton className="h-4 w-24" />
                              <Skeleton className="h-4 w-20" />
                            </div>
                            <div className="flex items-center">
                              <Skeleton className="w-10 h-10 rounded-xl mr-3" />
                              <div className="flex-1">
                                <Skeleton className="h-4 w-32 mb-2" />
                                <Skeleton className="h-3 w-40" />
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : upcomingAppointments.length > 0 ? (
                    <div>
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 max-h-80 overflow-y-auto pr-2" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#d1d5db #f3f4f6'
                      }}>
                        {upcomingAppointments.map((appointment) => (
                          <Card key={appointment.id} className="border-0 shadow-sm bg-gray-100/80 backdrop-blur-sm hover:bg-gray-200/90 transition-colors">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center mb-3">
                                <span className="font-medium text-gray-900">{appointment.clientName}</span>
                                <span className="text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded-full">{appointment.time}</span>
                              </div>
                              <div className="flex items-center">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center mr-3">
                                  <Calendar className="h-5 w-5 text-white" />
                                </div>
                                <div className="flex-1">
                                  <p className="font-medium text-gray-900 truncate">{appointment.serviceName}</p>
                                  <p className="text-sm text-gray-600">Agendamento confirmado</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Card className="border-0 shadow-sm bg-gray-100/80 backdrop-blur-sm p-8 text-center">
                      <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-6">
                        <Calendar className="h-10 w-10 text-gray-400" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-3">Nenhum agendamento</h3>
                      <p className="text-gray-600">Não há agendamentos futuros</p>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
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
          icon: <User size={26} />,
          label: 'Perfil',
          href: '/provider/profile'
        }
      ]}
    />
      </PageTransition>
    </ProviderLayout>
  );
}
