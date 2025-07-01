import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Calendar, Clock, User, Phone, MapPin, BadgeCheck, Ban, AlertTriangle, Search, Plus, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProviderLayout from "@/components/layout/provider-layout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { format, isToday, parseISO, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";

interface Appointment {
  id: number;
  clientId: number;
  clientName: string;
  clientPhone?: string;
  serviceId: number;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  price: number;
  location?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  completed: "bg-green-100 text-green-800 hover:bg-green-200",
  canceled: "bg-red-100 text-red-800 hover:bg-red-200",
  no_show: "bg-gray-100 text-gray-800 hover:bg-gray-200",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  canceled: "Cancelado",
  no_show: "Não Compareceu",
};

const statusIcons: Record<string, React.ReactNode> = {
  pending: <AlertTriangle className="h-4 w-4 mr-1" />,
  confirmed: <BadgeCheck className="h-4 w-4 mr-1" />,
  completed: <BadgeCheck className="h-4 w-4 mr-1" />,
  canceled: <Ban className="h-4 w-4 mr-1" />,
  no_show: <AlertTriangle className="h-4 w-4 mr-1" />,
};

export default function ProviderAppointmentsPage() {
  const [activeTab, setActiveTab] = useState("upcoming");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);

  // Buscar agendamentos do prestador
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    retry: 1,
  });

  // Filtrar agendamentos
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment: Appointment) => {
      const isUpcoming = new Date(`${appointment.date}T${appointment.startTime}`) >= new Date();
      
      if (activeTab === "upcoming" && !isUpcoming) return false;
      if (activeTab === "past" && isUpcoming) return false;
      if (filterStatus && appointment.status !== filterStatus) return false;
      
      return true;
    });
  }, [appointments, activeTab, filterStatus]);

  // Estado para controlar a data selecionada
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  // Extrair o mês e ano para exibição
  const currentMonthYear = format(selectedDate, 'MMMM, yyyy', { locale: ptBR });
  
  // Avançar para o próximo dia
  const goToNextDay = () => {
    setSelectedDate(prev => addDays(prev, 1));
  };
  
  // Voltar para o dia anterior
  const goToPreviousDay = () => {
    setSelectedDate(prev => addDays(prev, -1));
  };
  
  // Formatar dia da semana e dia do mês
  const formattedDayAndDate = format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR });
  
  // Definir paletas de cores para os cards de agendamento
  const serviceColors = [
    { bg: 'bg-orange-100', border: 'border-orange-300', text: 'text-orange-800', icon: 'bg-orange-400' },
    { bg: 'bg-blue-100', border: 'border-blue-300', text: 'text-blue-800', icon: 'bg-blue-400' },
    { bg: 'bg-green-100', border: 'border-green-300', text: 'text-green-800', icon: 'bg-green-400' },
    { bg: 'bg-purple-100', border: 'border-purple-300', text: 'text-purple-800', icon: 'bg-purple-400' },
    { bg: 'bg-pink-100', border: 'border-pink-300', text: 'text-pink-800', icon: 'bg-pink-400' },
  ];
  
  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  
  // Filtrar agendamentos para a data selecionada
  const appointmentsForSelectedDate = useMemo(() => {
    if (!appointments || !Array.isArray(appointments)) return [];
    
    return appointments.filter((appointment: Appointment) => {
      const appointmentDate = parseISO(appointment.date);
      return isSameDay(appointmentDate, selectedDate);
    }).sort((a: Appointment, b: Appointment) => {
      // Ordenar por hora de início
      return a.startTime.localeCompare(b.startTime);
    });
  }, [appointments, selectedDate]);
  
  // Função para extrair a hora de um horário no formato "HH:MM"
  const getHourFromTime = (time: string) => {
    return parseInt(time.split(':')[0], 10);
  };
  
  // Agrupar agendamentos por hora
  const appointmentsByHour = useMemo(() => {
    const hourGroups: Record<number, Appointment[]> = {};
    
    appointmentsForSelectedDate.forEach((appointment: Appointment) => {
      const hour = getHourFromTime(appointment.startTime);
      if (!hourGroups[hour]) {
        hourGroups[hour] = [];
      }
      hourGroups[hour].push(appointment);
    });
    
    return hourGroups;
  }, [appointmentsForSelectedDate]);
  
  // Renderizar o grid por hora com os agendamentos
  const renderAppointmentsByHour = () => {
    if (isLoading) {
      return (
        <div className="space-y-6">
          {Array(5).fill(0).map((_, index) => (
            <div key={index} className="flex items-start">
              <div className="w-12 text-right pr-4">
                <Skeleton className="h-6 w-8 ml-auto" />
              </div>
              <div className="flex-1">
                <Skeleton className="h-24 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      );
    }
    
    if (appointmentsForSelectedDate.length === 0) {
      return (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <Calendar className="w-12 h-12 mx-auto text-gray-400 mb-3" />
          <p className="text-gray-500">Nenhum agendamento para esta data.</p>
          <Button variant="outline" size="sm" className="mt-4">
            <Plus className="w-4 h-4 mr-2" />
            Criar Agendamento
          </Button>
        </div>
      );
    }
    
    // Gerar horários de 7h às 18h para exibição
    const hoursToDisplay = Array.from({ length: 12 }, (_, i) => i + 7);
    
    return (
      <div className="space-y-4">
        {hoursToDisplay.map((hour) => {
          const appointmentsAtHour = appointmentsByHour[hour] || [];
          const hasAppointments = appointmentsAtHour.length > 0;
          
          return (
            <div key={hour} className="flex items-start group">
              <div className="w-12 text-right pr-4 text-gray-500 text-sm pt-2 group-hover:text-gray-700">
                {hour}:00
              </div>
              <div className="flex-1">
                {hasAppointments ? (
                  <div className="space-y-2">
                    {appointmentsAtHour.map((appointment, idx) => {
                      const colorSet = serviceColors[idx % serviceColors.length];
                      
                      return (
                        <motion.div
                          key={appointment.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          className={`p-3 rounded-lg border ${colorSet.bg} ${colorSet.border} ${colorSet.text}`}
                        >
                          <div className="flex items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white ${colorSet.icon} mr-3`}>
                              {appointment.serviceName.substring(0, 1).toUpperCase()}
                            </div>
                            <div className="flex-1">
                              <p className="font-semibold">{appointment.serviceName}</p>
                              <div className="flex items-center text-sm">
                                <Clock className="w-3 h-3 mr-1" />
                                <span>
                                  {appointment.startTime} - {appointment.endTime}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center">
                            <div className="flex -space-x-2">
                              {Array(Math.min(3, appointment.clientName.split(' ').length)).fill(0).map((_, i) => (
                                <Avatar key={i} className="w-6 h-6 border-2 border-white">
                                  <AvatarFallback className="text-[10px]">
                                    {appointment.clientName.split(' ')[i]?.charAt(0) || '?'}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                            </div>
                            <span className="text-xs ml-1">
                              {appointment.clientName}
                            </span>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="h-4 border-b border-dashed border-gray-200"></div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <ProviderLayout>
      <div className="max-w-md mx-auto bg-white min-h-screen">
        {/* Header com mês e ano */}
        <div className="px-4 pt-4 pb-2 bg-gray-50 border-b">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center">
              <span className="text-lg font-semibold capitalize">{currentMonthYear}</span>
              <ChevronDown className="w-5 h-5 ml-1 text-gray-500" />
            </div>
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full h-9 w-9"
                asChild
              >
                <Link href="/provider/services">
                  <Search className="h-5 w-5 text-gray-600" />
                </Link>
              </Button>
              <Avatar className="h-8 w-8 ml-2">
                <AvatarFallback className="bg-primary text-white text-sm">
                  PR
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
          
          {/* Mensagem de boas-vindas e contagem de eventos */}
          <div className="my-3">
            <p className="text-gray-600 text-sm">Olá Prestador,</p>
            <h1 className="text-2xl font-bold flex items-baseline">
              Você tem <span className="text-primary mx-1">{appointmentsForSelectedDate.length}</span> 
              {appointmentsForSelectedDate.length === 1 ? ' Evento' : ' Eventos'} 
              <span className="ml-1 text-gray-700 font-normal">Aguardando Por Você Hoje</span>
            </h1>
          </div>
          
          {/* Mini-calendário dos dias da semana */}
          <div className="flex justify-between items-center pb-2 mb-2 mt-4">
            {[-2, -1, 0, 1, 2].map((dayOffset) => {
              const date = addDays(selectedDate, dayOffset);
              const isSelected = isSameDay(date, selectedDate);
              const dayNumber = format(date, 'd');
              const dayName = format(date, 'EEE', { locale: ptBR });
              
              return (
                <button
                  key={dayOffset}
                  onClick={() => setSelectedDate(date)}
                  className={`flex flex-col items-center justify-center w-10 h-14 rounded-full ${
                    isSelected 
                      ? 'bg-primary text-white font-bold' 
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <span className="text-xs capitalize">{dayName}</span>
                  <span className="text-lg">{dayNumber}</span>
                </button>
              );
            })}
          </div>
          
          {/* Data completa e navegação */}
          <div className="flex items-center justify-between text-sm text-gray-500 pt-2 border-t">
            <button 
              onClick={goToPreviousDay}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <p className="capitalize">{formattedDayAndDate}</p>
            <button 
              onClick={goToNextDay}
              className="p-2 hover:bg-gray-100 rounded-full"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
        
        {/* Conteúdo principal - Agendamentos por hora */}
        <div className="p-4">
          {renderAppointmentsByHour()}
        </div>
        
        {/* Botão flutuante para adicionar agendamento */}
        <div className="fixed bottom-20 right-4">
          <Button 
            className="h-14 w-14 rounded-full shadow-lg"
            onClick={() => window.location.href = '/provider/manual-booking'}
          >
            <Plus className="h-6 w-6" />
          </Button>
        </div>
      </div>
    </ProviderLayout>
  );
}