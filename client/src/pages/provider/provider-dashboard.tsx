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
                
                <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 lg:gap-8">
                  {/* Novo Agendamento */}
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Button 
                      onClick={() => setLocation("/provider/manual-booking")}
                      className="group h-16 md:h-18 lg:h-20 w-full flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-[#58c9d1] via-[#4aadb5] to-[#3d9ba3] hover:from-[#4aadb5] hover:via-[#3d9ba3] hover:to-[#58c9d1] text-white border-0 shadow-lg hover:shadow-xl hover:shadow-[#58c9d1]/30 transition-all duration-300 rounded-2xl relative overflow-hidden"
                    >
                      {/* Efeito de brilho */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                      
                      <div className="relative z-10 flex flex-col items-center space-y-2">
                        <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-all duration-300">
                          <CalendarPlus className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <span className="font-semibold text-xs md:text-sm lg:text-base text-center leading-tight">
                          Novo Agendamento
                        </span>
                      </div>
                    </Button>
                  </motion.div>
                  
                  {/* Horários */}
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Button 
                      onClick={() => setLocation("/provider/schedule")}
                      className="group h-16 md:h-18 lg:h-20 w-full flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-[#58c9d1] via-[#4aadb5] to-[#3d9ba3] hover:from-[#4aadb5] hover:via-[#3d9ba3] hover:to-[#58c9d1] text-white border-0 shadow-lg hover:shadow-xl hover:shadow-[#58c9d1]/30 transition-all duration-300 rounded-2xl relative overflow-hidden"
                    >
                      {/* Efeito de brilho */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                      
                      <div className="relative z-10 flex flex-col items-center space-y-2">
                        <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-all duration-300">
                          <Settings className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <span className="font-semibold text-xs md:text-sm lg:text-base text-center leading-tight">
                          Horários
                        </span>
                      </div>
                    </Button>
                  </motion.div>
                  
                  {/* Serviços */}
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Button 
                      onClick={() => setLocation("/provider/services")}
                      className="group h-16 md:h-18 lg:h-20 w-full flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-[#58c9d1] via-[#4aadb5] to-[#3d9ba3] hover:from-[#4aadb5] hover:via-[#3d9ba3] hover:to-[#58c9d1] text-white border-0 shadow-lg hover:shadow-xl hover:shadow-[#58c9d1]/30 transition-all duration-300 rounded-2xl relative overflow-hidden"
                    >
                      {/* Efeito de brilho */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                      
                      <div className="relative z-10 flex flex-col items-center space-y-2">
                        <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-all duration-300">
                          <Scissors className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <span className="font-semibold text-xs md:text-sm lg:text-base text-center leading-tight">
                          Serviços
                        </span>
                      </div>
                    </Button>
                  </motion.div>
                  
                  {/* Analytics */}
                  <motion.div
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  >
                    <Button 
                      onClick={() => setLocation("/provider/analytics")}
                      className="group h-16 md:h-18 lg:h-20 w-full flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-[#58c9d1] via-[#4aadb5] to-[#3d9ba3] hover:from-[#4aadb5] hover:via-[#3d9ba3] hover:to-[#58c9d1] text-white border-0 shadow-lg hover:shadow-xl hover:shadow-[#58c9d1]/30 transition-all duration-300 rounded-2xl relative overflow-hidden"
                    >
                      {/* Efeito de brilho */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-out"></div>
                      
                      <div className="relative z-10 flex flex-col items-center space-y-2">
                        <div className="p-2 bg-white/20 rounded-xl group-hover:bg-white/30 transition-all duration-300">
                          <BarChart className="h-5 w-5 md:h-6 md:w-6" />
                        </div>
                        <span className="font-semibold text-xs md:text-sm lg:text-base text-center leading-tight">
                          Analytics
                        </span>
                      </div>
                    </Button>
                  </motion.div>
                </div>
              </div>

                {/* Services */}
                <div className="w-full bg-white border border-[#58c9d1]/20 p-4 md:p-6 lg:p-8 rounded-2xl shadow-lg shadow-[#58c9d1]/10 mx-0 max-w-full relative overflow-hidden">
                  {/* Subtle background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#58c9d1]/5 via-transparent to-[#58c9d1]/5 pointer-events-none"></div>
                  
                  <div className="relative z-10 flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-[#58c9d1] to-[#4aadb5] rounded-2xl shadow-lg shadow-[#58c9d1]/30">
                        <Scissors className="h-6 w-6 md:h-7 md:w-7 text-white" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] bg-clip-text text-transparent">
                        Meus Serviços
                      </h2>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setLocation("/provider/services")}
                      className="group text-sm font-semibold hover:bg-[#58c9d1]/10 px-4 py-2 rounded-xl transition-all duration-300 border border-[#58c9d1]/20 hover:border-[#58c9d1]/40"
                      style={{color: '#58c9d1'}}
                    >
                      <span className="group-hover:translate-x-1 transition-transform duration-300">Ver todos →</span>
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
                        <motion.div
                          key={service.id}
                          whileHover={{ scale: 1.02, y: -2 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ type: "spring", stiffness: 300, damping: 20 }}
                        >
                          <Card 
                            className="border border-[#58c9d1]/20 shadow-lg shadow-[#58c9d1]/10 bg-white hover:shadow-xl hover:shadow-[#58c9d1]/20 cursor-pointer transition-all duration-300 group relative overflow-hidden"
                            onClick={() => setLocation("/provider/services")}
                          >
                            {/* Subtle background gradient */}
                            <div className="absolute inset-0 bg-gradient-to-br from-[#58c9d1]/5 via-transparent to-[#58c9d1]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            
                            <CardContent className="p-5 relative z-10">
                              <div className="flex items-center justify-between mb-3">
                                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#58c9d1] to-[#4aadb5] flex items-center justify-center shadow-lg shadow-[#58c9d1]/30">
                                  <Scissors className="h-4 w-4 text-white" />
                                </div>
                                <div className="text-xs text-[#58c9d1] bg-[#58c9d1]/10 px-3 py-1 rounded-full font-medium border border-[#58c9d1]/20">
                                  {service.categoryName || "Categoria"}
                                </div>
                              </div>
                              <h3 className="font-bold text-gray-900 mb-3 truncate group-hover:text-[#58c9d1] transition-colors duration-300">
                                {service.serviceName}
                              </h3>
                              <p className="text-xl font-bold bg-gradient-to-r from-green-600 to-green-500 bg-clip-text text-transparent">
                                {service.price != null ? formatCurrency(service.price || 0) : service.defaultPrice ? formatCurrency(service.defaultPrice || 0) : "R$ 0,00"}
                              </p>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Card className="border-2 border-dashed border-[#58c9d1]/30 bg-gradient-to-br from-[#58c9d1]/5 to-[#58c9d1]/10 p-8 text-center relative overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-4 right-4 w-16 h-16 bg-[#58c9d1]/10 rounded-full blur-xl"></div>
                        <div className="absolute bottom-4 left-4 w-12 h-12 bg-[#58c9d1]/10 rounded-full blur-lg"></div>
                        
                        <div className="relative z-10">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#58c9d1] to-[#4aadb5] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#58c9d1]/30">
                            <Scissors className="h-8 w-8 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-3">Nenhum serviço cadastrado</h3>
                          <p className="text-gray-600 mb-6 max-w-sm mx-auto leading-relaxed">
                            Crie seu primeiro serviço para começar a receber agendamentos dos seus clientes
                          </p>
                          <Button 
                            onClick={() => setLocation("/provider/services")} 
                            size="lg"
                            className="group text-white shadow-lg hover:shadow-xl transition-all duration-300 rounded-xl px-6 py-3 bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] hover:from-[#4aadb5] hover:to-[#58c9d1] transform hover:scale-105"
                          >
                            <Plus className="h-5 w-5 mr-2 group-hover:rotate-90 transition-transform duration-300" />
                            Cadastrar Primeiro Serviço
                          </Button>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </div>
                
                {/* Today's Appointments */}
                <div className="w-full bg-white border border-[#58c9d1]/20 p-4 md:p-6 lg:p-8 rounded-2xl shadow-lg shadow-[#58c9d1]/10 mx-0 max-w-full relative overflow-hidden">
                  {/* Subtle background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#58c9d1]/5 via-transparent to-[#58c9d1]/5 pointer-events-none"></div>
                  
                  <div className="relative z-10 flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-[#58c9d1] to-[#4aadb5] rounded-2xl shadow-lg shadow-[#58c9d1]/30">
                        <Calendar className="h-6 w-6 md:h-7 md:w-7 text-white" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] bg-clip-text text-transparent">
                        Agendamentos de hoje
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#58c9d1]/10 px-4 py-2 rounded-xl border border-[#58c9d1]/20">
                        <div className="w-2 h-2 bg-[#58c9d1] rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-[#58c9d1]">
                          {todayAppointments.length}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLocation("/provider/appointments-management")}
                        className="group text-sm font-semibold hover:bg-[#58c9d1]/10 px-4 py-2 rounded-xl transition-all duration-300 border border-[#58c9d1]/20 hover:border-[#58c9d1]/40"
                        style={{color: '#58c9d1'}}
                      >
                        <span className="group-hover:translate-x-1 transition-transform duration-300">Ver todos →</span>
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
                      <div className="space-y-4 max-h-80 overflow-y-auto pr-2" style={{
                        scrollbarWidth: 'thin',
                        scrollbarColor: '#58c9d1 #f3f4f6'
                      }}>
                        {todayAppointments.map((appointment, index) => (
                          <motion.div
                            key={appointment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                          >
                            <Card className="border border-[#58c9d1]/20 shadow-lg shadow-[#58c9d1]/10 bg-white hover:shadow-xl hover:shadow-[#58c9d1]/20 transition-all duration-300 group relative overflow-hidden">
                              {/* Subtle background gradient */}
                              <div className="absolute inset-0 bg-gradient-to-br from-[#58c9d1]/5 via-transparent to-[#58c9d1]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              
                              <CardContent className="p-5 relative z-10">
                                <div className="flex justify-between items-center mb-4">
                                  <span className="font-bold text-gray-900 group-hover:text-[#58c9d1] transition-colors">{appointment.clientName}</span>
                                  <div className="flex items-center gap-2 bg-[#58c9d1]/10 px-3 py-1 rounded-xl border border-[#58c9d1]/20">
                                    <div className="w-2 h-2 bg-[#58c9d1] rounded-full animate-pulse"></div>
                                    <span className="text-sm font-semibold text-[#58c9d1]">{appointment.time}</span>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#58c9d1] to-[#4aadb5] flex items-center justify-center mr-4 shadow-lg shadow-[#58c9d1]/30">
                                    <Calendar className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-bold text-gray-900 truncate group-hover:text-[#58c9d1] transition-colors">{appointment.serviceName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <p className="text-sm text-green-600 font-medium">Agendamento confirmado</p>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Card className="border-2 border-dashed border-[#58c9d1]/30 bg-gradient-to-br from-[#58c9d1]/5 to-[#58c9d1]/10 p-8 text-center relative overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-4 right-4 w-16 h-16 bg-[#58c9d1]/10 rounded-full blur-xl"></div>
                        <div className="absolute bottom-4 left-4 w-12 h-12 bg-[#58c9d1]/10 rounded-full blur-lg"></div>
                        
                        <div className="relative z-10">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#58c9d1] to-[#4aadb5] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#58c9d1]/30">
                            <Calendar className="h-8 w-8 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-3">Nenhum agendamento hoje</h3>
                          <p className="text-gray-600 leading-relaxed">
                            Que tal aproveitar para organizar sua agenda ou atualizar seus serviços?
                          </p>
                        </div>
                      </Card>
                    </motion.div>
                  )}
                </div>
                
                {/* Upcoming Appointments */}
                <div className="w-full bg-white border border-[#58c9d1]/20 p-4 md:p-6 lg:p-8 rounded-2xl shadow-lg shadow-[#58c9d1]/10 mx-0 max-w-full relative overflow-hidden">
                  {/* Subtle background gradient */}
                  <div className="absolute inset-0 bg-gradient-to-br from-[#58c9d1]/5 via-transparent to-[#58c9d1]/5 pointer-events-none"></div>
                  
                  <div className="relative z-10 flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-gradient-to-br from-[#58c9d1] to-[#4aadb5] rounded-2xl shadow-lg shadow-[#58c9d1]/30">
                        <Calendar className="h-6 w-6 md:h-7 md:w-7 text-white" />
                      </div>
                      <h2 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] bg-clip-text text-transparent">
                        Próximos agendamentos
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2 bg-[#58c9d1]/10 px-4 py-2 rounded-xl border border-[#58c9d1]/20">
                        <div className="w-2 h-2 bg-[#58c9d1] rounded-full animate-pulse"></div>
                        <span className="text-sm font-semibold text-[#58c9d1]">
                          {upcomingAppointments.length}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => setLocation("/provider/appointments-management")}
                        className="group text-sm font-semibold hover:bg-[#58c9d1]/10 px-4 py-2 rounded-xl transition-all duration-300 border border-[#58c9d1]/20 hover:border-[#58c9d1]/40"
                        style={{color: '#58c9d1'}}
                      >
                        <span className="group-hover:translate-x-1 transition-transform duration-300">Ver todos →</span>
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
                        scrollbarColor: '#58c9d1 #f3f4f6'
                      }}>
                        {upcomingAppointments.map((appointment, index) => (
                          <motion.div
                            key={appointment.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                          >
                            <Card className="border border-[#58c9d1]/20 shadow-lg shadow-[#58c9d1]/10 bg-white hover:shadow-xl hover:shadow-[#58c9d1]/20 transition-all duration-300 group relative overflow-hidden">
                              {/* Subtle background gradient */}
                              <div className="absolute inset-0 bg-gradient-to-br from-[#58c9d1]/5 via-transparent to-[#58c9d1]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                              
                              <CardContent className="p-5 relative z-10">
                                <div className="flex justify-between items-center mb-4">
                                  <span className="font-bold text-gray-900 group-hover:text-[#58c9d1] transition-colors">{appointment.clientName}</span>
                                  <div className="flex items-center gap-2 bg-[#58c9d1]/10 px-3 py-1 rounded-xl border border-[#58c9d1]/20">
                                    <div className="w-2 h-2 bg-[#58c9d1] rounded-full animate-pulse"></div>
                                    <span className="text-sm font-semibold text-[#58c9d1]">{appointment.time}</span>
                                  </div>
                                </div>
                                <div className="flex items-center">
                                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#58c9d1] to-[#4aadb5] flex items-center justify-center mr-4 shadow-lg shadow-[#58c9d1]/30">
                                    <Calendar className="h-6 w-6 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className="font-bold text-gray-900 truncate group-hover:text-[#58c9d1] transition-colors">{appointment.serviceName}</p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                      <p className="text-sm text-green-600 font-medium">Agendamento confirmado</p>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Card className="border-2 border-dashed border-[#58c9d1]/30 bg-gradient-to-br from-[#58c9d1]/5 to-[#58c9d1]/10 p-8 text-center relative overflow-hidden">
                        {/* Decorative elements */}
                        <div className="absolute top-4 right-4 w-16 h-16 bg-[#58c9d1]/10 rounded-full blur-xl"></div>
                        <div className="absolute bottom-4 left-4 w-12 h-12 bg-[#58c9d1]/10 rounded-full blur-lg"></div>
                        
                        <div className="relative z-10">
                          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#58c9d1] to-[#4aadb5] flex items-center justify-center mx-auto mb-6 shadow-lg shadow-[#58c9d1]/30">
                            <Calendar className="h-8 w-8 text-white" />
                          </div>
                          <h3 className="text-xl font-bold text-gray-900 mb-3">Nenhum agendamento futuro</h3>
                          <p className="text-gray-600 leading-relaxed">
                            Os próximos agendamentos aparecerão aqui quando seus clientes fizerem reservas
                          </p>
                        </div>
                      </Card>
                    </motion.div>
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
