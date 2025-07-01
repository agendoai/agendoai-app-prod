import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useMutation } from "@tanstack/react-query";
import { memo, useCallback, useState, useEffect, Suspense } from "react";
import { 
  Calendar, 
  Scissors, 
  CalendarPlus,
  ArrowUp,
  Clock,
  BellIcon,
  Info,
  ClipboardList,
  BarChart,
  Copy,
  PenSquare,
  Plus,
  TrendingUp,
  Users,
  DollarSign,
  Settings,
  Sparkles,
  Target,
  Award,
  Activity,
} from "lucide-react";
import { AppointmentItem } from "@/components/appointment-item";
import { NotificationsMenu } from "@/components/ui/notifications-menu";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import ProviderNavbar from "@/components/layout/provider-navbar";
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
// Remover importação de imagem não encontrada
// import providerProfileImg from "@assets/Perfil e informacoes do prestador.png";

// Componentes otimizados para a dashboard do prestador

// Componente de cabeçalho memoizado
const ProviderHeader = memo(({ 
  user, 
  isOnline, 
  onToggleOnline, 
  isToggleDisabled 
}: { 
  user: any, 
  isOnline: boolean, 
  onToggleOnline: (checked: boolean) => void, 
  isToggleDisabled: boolean 
}) => (
  <div className="p-6 flex justify-between items-center border-b border-gray-200 bg-white/80 backdrop-blur-sm">
    <div className="flex items-center">
      <div className="w-12 h-12 rounded-xl overflow-hidden mr-4 shadow-lg">
        {user?.profileImage ? (
          <img
            src={user.profileImage}
            alt={user.name || "Provider"}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = "https://via.placeholder.com/48?text=User";
            }}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center">
            <Scissors className="h-6 w-6 text-white" />
          </div>
        )}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">Bem-vindo(a),</p>
        <p className="font-bold text-xl text-gray-900">{user?.name || "Prestador"}</p>
      </div>
    </div>
    <div className="flex items-center space-x-4">
      <div className="flex items-center bg-gray-100 rounded-lg px-4 py-2">
        <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-500' : 'bg-gray-400'}`}></div>
        <span className="text-sm font-medium text-gray-700 mr-3">{isOnline ? "Online" : "Offline"}</span>
        <Switch 
          checked={isOnline} 
          onCheckedChange={onToggleOnline}
          disabled={isToggleDisabled}
        />
      </div>
      <div className="flex items-center space-x-2">
        <NotificationsMenu />
        <Button variant="ghost" size="sm" className="w-10 h-10 rounded-lg">
          <Calendar className="h-5 w-5 text-gray-700" />
        </Button>
      </div>
    </div>
  </div>
));

// Card de estatística memoizado com design melhorado
const StatCard = memo(({ 
  icon: Icon,
  bgClass, 
  textColorClass, 
  label, 
  value, 
  trend, 
  trendText,
  subtitle
}: { 
  icon: any,
  bgClass: string, 
  textColorClass: string, 
  label: string, 
  value: React.ReactNode, 
  trend?: boolean, 
  trendText?: string,
  subtitle?: string
}) => (
  <Card className={`${bgClass} border-0 shadow-lg hover:shadow-xl transition-all duration-300`}>
    <CardContent className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl ${textColorClass}/10 flex items-center justify-center`}>
          <Icon className={`h-6 w-6 ${textColorClass}`} />
        </div>
        {trend !== undefined && trendText && (
          <div className={`flex items-center ${textColorClass}/80 text-xs font-medium px-2 py-1 rounded-full bg-white/20`}>
            <ArrowUp className="h-3 w-3 mr-1" />
            <span>{trendText}</span>
          </div>
        )}
      </div>
      <div>
        <p className={`${textColorClass}/70 text-sm font-medium mb-1`}>{label}</p>
        <p className={`${textColorClass} text-2xl font-bold mb-1`}>{value}</p>
        {subtitle && (
          <p className={`${textColorClass}/60 text-xs`}>{subtitle}</p>
        )}
      </div>
    </CardContent>
  </Card>
));

// Componente de estatísticas com layout melhorado
const StatsGrid = memo(({ stats }: { stats: any }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    <StatCard 
      icon={Calendar}
      bgClass="bg-gradient-to-br from-blue-600 to-blue-700 text-white"
      textColorClass="text-white"
      label="Agendamentos Hoje"
      value={stats.todayAppointments}
      trend={true}
      trendText="+25%"
      subtitle="vs. ontem"
    />
    
    <StatCard 
      icon={DollarSign}
      bgClass="bg-gradient-to-br from-green-600 to-green-700 text-white"
      textColorClass="text-white"
      label="Receita Mensal"
      value={formatCurrency(stats.monthlyRevenue)}
      trend={true}
      trendText="+12%"
      subtitle="vs. mês anterior"
    />
    
    <StatCard 
      icon={Users}
      bgClass="bg-gradient-to-br from-purple-600 to-purple-700 text-white"
      textColorClass="text-white"
      label="Clientes Atendidos"
      value={stats.manualAppointments}
      trendText="Este mês"
    />
    
    <StatCard 
      icon={TrendingUp}
      bgClass="bg-gradient-to-br from-orange-600 to-orange-700 text-white"
      textColorClass="text-white"
      label="Taxa de Conversão"
      value="85%"
      trend={true}
      trendText="+8%"
      subtitle="vs. semana passada"
    />
  </div>
));

// Componente de esqueleto para estatísticas
const StatsGridSkeleton = memo(() => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
    {[...Array(4)].map((_, index) => (
      <Card key={index} className="border-0 shadow-lg">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="w-12 h-12 rounded-xl" />
            <Skeleton className="w-16 h-6 rounded-full" />
          </div>
          <Skeleton className="h-4 w-24 mb-2" />
          <Skeleton className="h-8 w-20 mb-2" />
          <Skeleton className="h-3 w-16" />
        </CardContent>
      </Card>
    ))}
  </div>
));

// Componente de ações rápidas com design melhorado
const QuickActions = memo(({ 
  onManualBooking, 
  onScheduleConfig,
  onTemplatesClick,
  onAnalyticsClick,
  onServicesClick
}: { 
  onManualBooking: () => void, 
  onScheduleConfig: () => void,
  onTemplatesClick: () => void,
  onAnalyticsClick: () => void,
  onServicesClick: () => void
}) => (
  <div className="mb-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
        <Sparkles className="h-6 w-6 text-gray-700" />
        Ações Rápidas
      </h2>
      <p className="text-gray-600 text-sm">Gerencie seus serviços e agendamentos</p>
    </div>
    
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      <Button 
        onClick={onManualBooking}
        className="h-20 flex flex-col items-center justify-center space-y-2 bg-gradient-to-br from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white border-0 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <CalendarPlus className="h-6 w-6" />
        <span className="text-xs font-medium">Novo Agendamento</span>
      </Button>
      
      <Button 
        onClick={onScheduleConfig}
        variant="outline"
        className="h-20 flex flex-col items-center justify-center space-y-2 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <Settings className="h-6 w-6 text-gray-700" />
        <span className="text-xs font-medium text-gray-700">Configurar Horários</span>
      </Button>
      
      <Button 
        onClick={onServicesClick}
        variant="outline"
        className="h-20 flex flex-col items-center justify-center space-y-2 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <Scissors className="h-6 w-6 text-gray-700" />
        <span className="text-xs font-medium text-gray-700">Meus Serviços</span>
      </Button>
      
      <Button 
        onClick={onAnalyticsClick}
        variant="outline"
        className="h-20 flex flex-col items-center justify-center space-y-2 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <BarChart className="h-6 w-6 text-gray-700" />
        <span className="text-xs font-medium text-gray-700">Analytics</span>
      </Button>
      
      <Button 
        onClick={onTemplatesClick}
        variant="outline"
        className="h-20 flex flex-col items-center justify-center space-y-2 border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 shadow-lg hover:shadow-xl transition-all duration-300"
      >
        <ClipboardList className="h-6 w-6 text-gray-700" />
        <span className="text-xs font-medium text-gray-700">Templates</span>
      </Button>
    </div>
  </div>
));

// Componente de esqueleto para itens de agendamento (somente para fallback)
const AppointmentItemSkeleton = memo(() => (
  <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
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
));

// Componente de serviços do prestador com design melhorado
const ProviderServices = memo(({ 
  services = [], 
  isLoading, 
  onAddService,
  onViewServices
}: { 
  services: any[], 
  isLoading: boolean,
  onAddService: () => void,
  onViewServices: () => void
}) => (
  <div className="mb-8">
    <div className="flex items-center justify-between mb-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
        <Scissors className="h-6 w-6 text-gray-700" />
        Meus Serviços
      </h2>
      <Button 
        variant="ghost" 
        size="sm"
        onClick={onViewServices}
        className="text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100"
      >
        Ver todos →
      </Button>
    </div>
    
    {isLoading ? (
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.slice(0, 4).map((service) => (
          <Card 
            key={service.id} 
            className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl cursor-pointer transition-all duration-300 group"
            onClick={() => onViewServices()}
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
              <h3 className="font-semibold text-gray-900 mb-2 truncate group-hover:text-blue-600 transition-colors">
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
      <Card className="border-2 border-dashed border-gray-300 bg-gray-50/50 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
          <Scissors className="h-8 w-8 text-gray-400" />
        </div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum serviço cadastrado</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Comece criando seu primeiro serviço para receber agendamentos dos clientes
        </p>
        <Button 
          onClick={onAddService} 
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Plus className="h-5 w-5 mr-2" />
          Cadastrar Primeiro Serviço
        </Button>
      </Card>
    )}
  </div>
));

// Componente de esqueleto para agendamentos
const AppointmentsSkeleton = memo(() => (
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
));

// Componente de lista de agendamentos com design melhorado
const AppointmentsList = memo(({ 
  appointments, 
  isLoading,
  title = "Próximos agendamentos"
}: { 
  appointments: Appointment[], 
  isLoading: boolean,
  title?: string
}) => {
  if (isLoading) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="h-6 w-6 text-gray-700" />
            {title}
          </h2>
        </div>
        <AppointmentsSkeleton />
      </div>
    );
  }

  if (appointments.length === 0) {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Calendar className="h-6 w-6 text-gray-700" />
            {title}
          </h2>
        </div>
        <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
            <Calendar className="h-8 w-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum agendamento</h3>
          <p className="text-gray-600">
            {title.includes("hoje") ? "Não há agendamentos para hoje" : "Não há agendamentos futuros"}
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
          <Calendar className="h-6 w-6 text-gray-700" />
          {title}
        </h2>
        <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
          {appointments.length} agendamento{appointments.length !== 1 ? 's' : ''}
        </span>
      </div>
      
      <div className="space-y-4">
        {appointments.map((appointment) => (
          <Card key={appointment.id} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:shadow-xl transition-all duration-300">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {appointment.serviceName || "Serviço"}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {appointment.clientName || "Cliente"}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {appointment.startTime} - {appointment.endTime}
                  </div>
                  <div className="text-xs text-gray-500">
                    {formatDateToBR(appointment.date)}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-600">
                      {30} min
                    </span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <DollarSign className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-green-600">
                      {appointment.totalPrice ? formatCurrency(appointment.totalPrice) : "R$ 0,00"}
                    </span>
                  </div>
                </div>
                
                <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                  appointment.status === 'confirmado' ? 'bg-green-100 text-green-700' :
                  appointment.status === 'pendente' ? 'bg-yellow-100 text-yellow-700' :
                  appointment.status === 'cancelado' ? 'bg-red-100 text-red-700' :
                  appointment.status === 'concluido' ? 'bg-blue-100 text-blue-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {appointment.status === 'confirmado' ? 'Confirmado' :
                   appointment.status === 'pendente' ? 'Pendente' :
                   appointment.status === 'cancelado' ? 'Cancelado' :
                   appointment.status === 'concluido' ? 'Concluído' :
                   appointment.status || 'Desconhecido'}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
});

// Componente principal
export default function ProviderDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [showMockup, setShowMockup] = useState(false); // Desativamos o mockup por padrão
  
  // Fetch provider settings com otimizações de staleTime
  const { 
    data: providerSettings, 
    isLoading: isSettingsLoading 
  } = useQuery({
    queryKey: ["/api/provider-settings"],
    refetchOnMount: true,
    staleTime: 30 * 1000, // 30 segundos
    retry: 1,
  });
  
  // Fetch today's appointments com otimizações
  const { 
    data: appointments = [], 
    isLoading: areAppointmentsLoading 
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    staleTime: 60 * 1000, // 1 minuto
    retry: 1,
  });
  
  // Fetch provider services diretamente da tabela provider_services
  const { 
    data: services = [], 
    isLoading: areServicesLoading 
  } = useQuery({
    queryKey: [`/api/provider-services/provider/${user?.id}`],
    staleTime: 300 * 1000, // 5 minutos
    retry: 1,
    enabled: !!user?.id,
  });
  
  // Online/Offline status toggling com estado derivado
  const [isOnline, setIsOnline] = useState<boolean>(false);
  
  // Efeito para sincronizar o estado com os dados do servidor
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
  
  // Callbacks memoizados para evitar re-renderizações
  const handleOnlineToggle = useCallback((checked: boolean) => {
    setIsOnline(checked);
    updateOnlineStatusMutation.mutate(checked);
  }, [updateOnlineStatusMutation]);
  
  const navigateToManualBooking = useCallback(() => {
    setLocation("/provider/manual-booking");
  }, [setLocation]);
  
  const navigateToScheduleConfig = useCallback(() => {
    setLocation("/provider/schedule");
  }, [setLocation]);
  
  const navigateToTemplates = useCallback(() => {
    setLocation("/provider/service-templates");
  }, [setLocation]);
  
  const navigateToAnalytics = useCallback(() => {
    setLocation("/provider/analytics");
  }, [setLocation]);
  
  const navigateToServices = useCallback(() => {
    setLocation("/provider/services");
  }, [setLocation]);
  
  // Computação memoizada para estatísticas do dia atual
  const today = new Date().toISOString().split('T')[0];
  
  // Filtrar agendamentos do dia atual 
  const todayAppointments = appointments.filter(a => a.date === today);
  
  // Utilizar useMemo para cálculos pesados em dados 
  const stats = {
    todayAppointments: todayAppointments.length,
    monthlyRevenue: 245000, // In cents (R$ 2.450,00)
    manualAppointments: 3,
    manualRevenue: 85000 // In cents (R$ 850,00)
  };
  
  // Processamento eficiente dos agendamentos (usando cache)
  const upcomingAppointments = appointments
    .filter(a => {
      const now = new Date();
      const today = now.toISOString().split('T')[0];
      return a.date >= today;
    })
    .sort((a, b) => {
      // Sort by date and time
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 5); // Show only the next 5 appointments
  
  // Função para converter agendamentos para o formato do calendário semanal
  const convertToCalendarEvents = useCallback((appointments: Appointment[]): WeeklyCalendarAppointment[] => {
    if (!appointments || !Array.isArray(appointments)) return [];
    
    return appointments.map(appointment => {
      // Determinar a cor com base no status
      let backgroundColor = '#3b82f6'; // Azul (confirmado)
      let borderColor = '#2563eb';
      let textColor = '#ffffff';
      
      if (appointment.status === 'cancelado') {
        backgroundColor = '#ef4444'; // Vermelho
        borderColor = '#dc2626';
      } else if (appointment.status === 'pendente') {
        backgroundColor = '#f97316'; // Laranja
        borderColor = '#ea580c';
      } else if (appointment.status === 'concluido') {
        backgroundColor = '#22c55e'; // Verde
        borderColor = '#16a34a';
      } else if (appointment.status === 'no_show') {
        backgroundColor = '#6b7280'; // Cinza
        borderColor = '#4b5563';
      }
      
      // Formato: 2025-04-22T15:30:00
      const startDate = `${appointment.date}T${appointment.startTime}:00`;
      const endDate = `${appointment.date}T${appointment.endTime}:00`;
      
      // Calcular duração em minutos
      const calcDurationInMinutes = () => {
        try {
          if (appointment.startTime && appointment.endTime) {
            const [startHour, startMinute] = appointment.startTime.split(':').map(Number);
            const [endHour, endMinute] = appointment.endTime.split(':').map(Number);
            
            const startTotalMinutes = startHour * 60 + startMinute;
            const endTotalMinutes = endHour * 60 + endMinute;
            
            // Lidar com casos em que o agendamento cruza a meia-noite
            return endTotalMinutes >= startTotalMinutes 
              ? endTotalMinutes - startTotalMinutes 
              : (24 * 60 - startTotalMinutes) + endTotalMinutes;
          }
          return 30; // Use 30 min as fallback
        } catch (error) {
          console.error("Erro ao calcular duração:", error);
          return 30; // Use 30 min as fallback
        }
      };
      
      return {
        id: appointment.id.toString(),
        title: appointment.serviceName || appointment.title || 'Agendamento',
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
          // Novos campos adicionados para suportar o WeeklyCalendar aprimorado
          clientPhone: appointment.clientPhone || appointment.client?.phone || '',
          clientEmail: appointment.clientEmail || appointment.client?.email || '',
          price: appointment.price || 0,
          duration: calcDurationInMinutes(),
          payment_status: appointment.payment_status
        }
      };
    });
  }, []);
  
  // Manipulador de clique em evento do calendário
  const handleCalendarEventClick = useCallback((info: any) => {
    const appointmentId = info.event.id;
    toast({
      title: info.event.title,
      description: `Cliente: ${info.event.extendedProps.client || 'Não informado'} - Status: ${info.event.extendedProps.status || 'Não informado'}`,
    });
    
    // Opcionalmente, navegar para a página de detalhes do agendamento
    // setLocation(`/provider/appointments/${appointmentId}`);
  }, []);

  // Mockup temporariamente desativado porque a imagem não está disponível
  if (showMockup) {
    return (
      <div className="relative">
        <div className="w-full h-[600px] bg-gray-100 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md shadow-lg">
            <p className="text-center font-medium text-lg">Carregando interface do prestador...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <AppHeader 
        title="Dashboard do Prestador" 
        userType="provider"
        showMenuIcon
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white/20 rounded-lg px-4 py-2 backdrop-blur-sm">
            <div className={`w-2 h-2 rounded-full mr-2 ${isOnline ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <span className="text-sm font-medium text-white mr-3">{isOnline ? "Online" : "Offline"}</span>
            <Switch 
              checked={isOnline} 
              onCheckedChange={handleOnlineToggle}
              disabled={updateOnlineStatusMutation.isPending}
            />
          </div>
          <NotificationsMenu color="white" />
        </div>
      </AppHeader>
      
      <PageTransition>
        <div className="container mx-auto py-8 px-4 max-w-7xl">
          {/* Header com informações do usuário */}
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
            </div>
          </motion.div>
          
          {/* Tabs da dashboard com design melhorado */}
          <Tabs defaultValue="summary" className="mb-8">
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
              {/* Stats Cards */}
              <Suspense fallback={<StatsGridSkeleton />}>
                {isSettingsLoading ? (
                  <StatsGridSkeleton />
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: 0.1 }}
                  >
                    <StatsGrid stats={stats} />
                  </motion.div>
                )}
              </Suspense>
              
              {/* Quick Actions */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.2 }}
              >
                <QuickActions 
                  onManualBooking={navigateToManualBooking}
                  onScheduleConfig={navigateToScheduleConfig}
                  onTemplatesClick={navigateToTemplates}
                  onAnalyticsClick={navigateToAnalytics}
                  onServicesClick={navigateToServices}
                />
              </motion.div>
              
              {/* Meus Serviços */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.25 }}
              >
                <ProviderServices 
                  services={services}
                  isLoading={areServicesLoading}
                  onAddService={navigateToServices}
                  onViewServices={navigateToServices}
                />
              </motion.div>
              
              {/* Agendamentos do dia atual */}
              <Suspense fallback={<AppointmentsSkeleton />}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.3 }}
                >
                  <AppointmentsList 
                    appointments={todayAppointments.filter(a => {
                      // Verificação extra para garantir que os agendamentos são deste dia
                      const todayStr = new Date().toISOString().split('T')[0];
                      console.log(`Verificando agendamento ${a.id}: data ${a.date} vs hoje ${todayStr}`);
                      return a.date === todayStr;
                    })}
                    isLoading={areAppointmentsLoading}
                    title="Agendamentos de hoje"
                  />
                </motion.div>
              </Suspense>
              
              {/* Próximos agendamentos */}
              <Suspense fallback={<AppointmentsSkeleton />}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.4 }}
                >
                  <AppointmentsList 
                    appointments={upcomingAppointments.filter(a => a.date !== today)}
                    isLoading={areAppointmentsLoading}
                    title="Próximos agendamentos"
                  />
                </motion.div>
              </Suspense>
            </TabsContent>
            
            <TabsContent value="calendar">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <Card className="mb-6 border-0 shadow-xl bg-white/90 backdrop-blur-sm">
                  <CardHeader className="pb-4">
                    <CardTitle className="flex items-center text-2xl font-bold text-gray-900">
                      <Calendar className="h-6 w-6 mr-3 text-gray-700" />
                      Calendário de Agendamentos
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="p-6 bg-gradient-to-r from-gray-50 to-gray-100 border-t border-gray-200 flex items-center justify-between">
                      <div className="flex items-center text-sm text-gray-600">
                        <Info className="h-4 w-4 mr-2" />
                        <span>Clique em um agendamento para ver mais detalhes</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={navigateToManualBooking}
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
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </PageTransition>
      
      <ProviderNavbar />
    </div>
  );
}
