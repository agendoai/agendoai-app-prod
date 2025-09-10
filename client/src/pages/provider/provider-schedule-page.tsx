import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { 
  format, addDays, parseISO, isValid, isBefore, startOfDay, 
  isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, 
  isEqual, addMonths, subMonths 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { queryClient, apiRequest } from '@/lib/queryClient';
import ProviderLayout from '@/components/layout/provider-layout';
import { PageTransition } from '@/components/ui/page-transition';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Edit, 
  Settings, 
  AlertCircle, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Plus,
  X,
  Check,
  RefreshCw,
  ArrowLeft,
  Users,
  CalendarDays,
  Shield
} from 'lucide-react';
import Navbar from "@/components/layout/navbar";

// Type definitions
interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  id?: number;
  status?: string;
}

interface DailySchedule {
  date: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  intervalMinutes: number;
  id?: number;
}

interface BlockedTime {
  id?: number;
  startTime: string;
  endTime: string;
  date: string;
  reason: string;
  providerId: number;
}

interface AvailabilityDay {
  id?: number;
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  intervalMinutes: number;
  providerId: number;
}

interface ManualBookingData {
  date: string;
  startTime: string;
  endTime: string;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceId?: number;
  notes?: string;
  status: string;
}

// Main component
export default function ProviderSchedulePage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const providerId = user?.id;
  
  // States for date selection and view management
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  
  // Default weekly schedule states
  const [weeklySchedule, setWeeklySchedule] = useState<AvailabilityDay[]>([
    { dayOfWeek: 0, startTime: "09:00", endTime: "17:00", isAvailable: false, intervalMinutes: 30, providerId: providerId || 0 },
    { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", isAvailable: true, intervalMinutes: 30, providerId: providerId || 0 },
    { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", isAvailable: true, intervalMinutes: 30, providerId: providerId || 0 },
    { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", isAvailable: true, intervalMinutes: 30, providerId: providerId || 0 },
    { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", isAvailable: true, intervalMinutes: 30, providerId: providerId || 0 },
    { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", isAvailable: true, intervalMinutes: 30, providerId: providerId || 0 },
    { dayOfWeek: 6, startTime: "09:00", endTime: "17:00", isAvailable: false, intervalMinutes: 30, providerId: providerId || 0 },
  ]);
  
  // Queries and mutations
  const { data: availabilityData, isLoading: isLoadingAvailability } = useQuery({
    queryKey: [`/api/availability/provider/${providerId}`],
    queryFn: async () => {
      if (!providerId) return null;
      const response = await apiRequest('GET', `/api/availability/provider/${providerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch availability');
      }
      return response.json();
    },
    enabled: !!providerId
  });
  
  const { data: blockedTimesData, isLoading: isLoadingBlockedTimes } = useQuery({
    queryKey: [`/api/availability/blocked-times/provider/${providerId}`],
    queryFn: async () => {
      if (!providerId) return null;
      const response = await apiRequest('GET', `/api/availability/blocked-times/provider/${providerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch blocked times');
      }
      return response.json();
    },
    enabled: !!providerId
  });
  
  const { data: appointmentsData, isLoading: isLoadingAppointments } = useQuery({
    queryKey: [`/api/appointments/provider/${providerId}`],
    queryFn: async () => {
      if (!providerId) return null;
      const response = await apiRequest('GET', `/api/appointments`);
      if (!response.ok) {
        throw new Error('Failed to fetch appointments');
      }
      return response.json();
    },
    enabled: !!providerId
  });
  
  const { data: providerServicesData } = useQuery({
    queryKey: [`/api/provider-services/provider/${providerId}`],
    queryFn: async () => {
      if (!providerId) return null;
      const response = await apiRequest('GET', `/api/provider-services/provider/${providerId}`);
      if (!response.ok) {
        throw new Error('Failed to fetch provider services');
      }
      return response.json();
    },
    enabled: !!providerId
  });
  
  // Effect to set weekly schedule from API data
  useEffect(() => {
    if (availabilityData && Array.isArray(availabilityData)) {
      // Map API data to our weekly schedule format
      const newWeeklySchedule = [...weeklySchedule];
      
      availabilityData.forEach((item: AvailabilityDay) => {
        const dayIndex = newWeeklySchedule.findIndex(d => d.dayOfWeek === item.dayOfWeek);
        if (dayIndex !== -1) {
          newWeeklySchedule[dayIndex] = {
            ...item,
            providerId: providerId || 0
          };
        }
      });
      
      setWeeklySchedule(newWeeklySchedule);
    }
  }, [availabilityData, providerId]);
  
  // Mutations for managing schedule
  const blockTimeMutation = useMutation({
    mutationFn: async (blockData: BlockedTime) => {
      if (!providerId) throw new Error('Provider ID not found');
      
      const payload = {
        ...blockData,
        providerId
      };
      
      const response = await apiRequest('POST', '/api/availability/blocked-times', payload);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to block time');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/availability/blocked-times/provider/${providerId}`] });
      
      toast({
        title: "Horário bloqueado",
        description: "O horário foi bloqueado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao bloquear horário",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const updateWeeklyScheduleMutation = useMutation({
    mutationFn: async (scheduleData: AvailabilityDay[]) => {
      if (!providerId) throw new Error('Provider ID not found');
      // Garante que todos os dias tenham providerId
      const days = scheduleData.map(day => ({ ...day, providerId }));
      const payload = {
        providerId,
        days
      };
      const response = await apiRequest('POST', '/api/availability/weekly', payload);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update weekly schedule');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/availability/provider/${providerId}`] });
      
      toast({
        title: "Agenda semanal atualizada",
        description: "Sua disponibilidade semanal foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar agenda",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Helper functions for date handling
  const formatDate = (date: Date | string): string => {
    const parsedDate = typeof date === 'string' ? parseISO(date) : date;
    return format(parsedDate, 'yyyy-MM-dd');
  };
  
  const getTimeSlots = useCallback((date: Date): TimeSlot[] => {
    const formattedDate = formatDate(date);
    const dayOfWeek = date.getDay();
    
    // Find the availability for this day of week
    const dayAvailability = weeklySchedule.find(d => d.dayOfWeek === dayOfWeek);
    
    if (!dayAvailability || !dayAvailability.isAvailable) {
      return [];
    }
    
    // Generate time slots based on day availability
    const slots: TimeSlot[] = [];
    let currentTime = dayAvailability.startTime;
    
    while (currentTime < dayAvailability.endTime) {
      const startTimeParts = currentTime.split(':');
      const startHour = parseInt(startTimeParts[0]);
      const startMinute = parseInt(startTimeParts[1]);
      
      let endHour = startHour;
      let endMinute = startMinute + dayAvailability.intervalMinutes;
      
      if (endMinute >= 60) {
        endHour += Math.floor(endMinute / 60);
        endMinute = endMinute % 60;
      }
      
      const endTime = `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
      
      // Check if this slot is blocked
      let isBlocked = false;
      if (blockedTimesData && Array.isArray(blockedTimesData)) {
        isBlocked = blockedTimesData.some((block: BlockedTime) => {
          if (block.date !== formattedDate) return false;
          
          const blockStart = block.startTime;
          const blockEnd = block.endTime;
          
          return (
            (currentTime >= blockStart && currentTime < blockEnd) ||
            (endTime > blockStart && endTime <= blockEnd) ||
            (currentTime <= blockStart && endTime >= blockEnd)
          );
        });
      }
      
      // Check if this slot has an appointment
      let appointmentStatus = '';
      if (appointmentsData && Array.isArray(appointmentsData)) {
        const appointment = appointmentsData.find((appt: any) => {
          if (appt.date !== formattedDate) return false;
          
          const apptStart = appt.startTime;
          const apptEnd = appt.endTime;
          
          return (
            (currentTime >= apptStart && currentTime < apptEnd) ||
            (endTime > apptStart && endTime <= apptEnd) ||
            (currentTime <= apptStart && endTime >= apptEnd)
          );
        });
        
        if (appointment) {
          appointmentStatus = appointment.status;
        }
      }
      
      slots.push({
        startTime: currentTime,
        endTime,
        isAvailable: !isBlocked && !appointmentStatus,
        status: appointmentStatus
      });
      
      currentTime = endTime;
    }
    
    return slots;
  }, [weeklySchedule, blockedTimesData, appointmentsData]);
  
  const handleBlockTime = () => {
    if (!selectedDate) {
      toast({
        title: "Selecione uma data",
        description: "Por favor, selecione uma data para bloquear.",
        variant: "destructive",
      });
      return;
    }
    
    blockTimeMutation.mutate({
      startTime: blockStartTime,
      endTime: blockEndTime,
      date: formatDate(selectedDate),
      reason: blockNotes,
      providerId: providerId || 0
    });
  };
  
  const handleUpdateWeeklySchedule = () => {
    updateWeeklyScheduleMutation.mutate(weeklySchedule);
  };
  
  // Calculate busy days for the calendar
  const busyDays = useMemo(() => {
    const days = new Set<string>();
    
    // Add days with appointments
    if (appointmentsData && Array.isArray(appointmentsData)) {
      appointmentsData.forEach((appointment: any) => {
        days.add(appointment.date);
      });
    }
    
    // Add days with blocked times
    if (blockedTimesData && Array.isArray(blockedTimesData)) {
      blockedTimesData.forEach((block: BlockedTime) => {
        days.add(block.date);
      });
    }
    
    return Array.from(days).map(date => parseISO(date));
  }, [appointmentsData, blockedTimesData]);
  
  // Calculate unavailable days (days where the provider is not available)
  const unavailableDays = useMemo(() => {
    const unavailableDayNumbers = weeklySchedule
      .filter(day => !day.isAvailable)
      .map(day => day.dayOfWeek);
    
    const currentMonth = selectedMonth;
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
    
    return daysInMonth.filter(day => unavailableDayNumbers.includes(day.getDay()));
  }, [weeklySchedule, selectedMonth]);
  
  const timeSlots = useMemo(() => {
    return getTimeSlots(selectedDate);
  }, [selectedDate, getTimeSlots]);
  
  const isLoading = isLoadingAvailability || isLoadingBlockedTimes || isLoadingAppointments;
  
  // No formulário de bloqueio de horário:
  const [blockStartTime, setBlockStartTime] = useState("09:00");
  const [blockEndTime, setBlockEndTime] = useState("10:00");
  const [blockNotes, setBlockNotes] = useState("");
  
  if (!providerId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto py-8 px-4">
          <Alert variant="destructive" className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Erro de Autenticação</AlertTitle>
            <AlertDescription>
              Você precisa estar autenticado como prestador para acessar esta página.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    );
  }
  
  return (
    <ProviderLayout title="Gerenciamento de Agenda" showBackButton>
      <PageTransition>
        <div className="w-full max-w-full py-6 px-2 sm:px-4 overflow-x-hidden bg-white min-h-screen" style={{ maxWidth: '100vw', width: '100%' }}>
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-4">
              <h1 className="text-xl font-bold text-neutral-900">Gerenciamento de Agenda</h1>
            </div>
            <p className="text-neutral-600 text-sm max-w-full">
              Configure seus horários de trabalho, bloqueie períodos e gerencie sua disponibilidade para receber agendamentos.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-2 mb-6">
            <Button 
              variant="outline"
              onClick={() => {}}
              className="w-full border-neutral-200 hover:bg-neutral-50 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Settings className="h-4 w-4 mr-2" />
              Configurar Agenda Semanal
            </Button>
            <Button 
              variant="outline"
              onClick={() => {}}
              className="w-full border-neutral-200 hover:bg-neutral-50 shadow-sm hover:shadow-md transition-all duration-300"
            >
              <Shield className="h-4 w-4 mr-2" />
              Bloquear Horário
            </Button>
          </div>
          
          {/* Main Content Grid */}
          <div className="grid grid-cols-1 gap-4">
            {/* Calendar Card */}
            <div>
              <Card className="border border-neutral-200 shadow-sm bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <CalendarIcon className="h-4 w-4 text-[#58c9d1]" />
                    Calendário
                  </CardTitle>
                  <CardDescription className="text-neutral-600 text-sm">
                    Selecione uma data para gerenciar horários
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(date) => date && setSelectedDate(date)}
                    onMonthChange={setSelectedMonth}
                    modifiers={{
                      busy: busyDays,
                      unavailable: unavailableDays
                    }}
                    modifiersStyles={{
                      busy: { backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#1d4ed8' },
                      unavailable: { backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#dc2626' }
                    }}
                    className="rounded-lg border-gray-200"
                  />
                </CardContent>
                <CardFooter className="pt-3 border-t border-neutral-200 bg-neutral-50/50">
                  <div className="w-full space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-[#58c9d1]/20 border border-[#58c9d1]/30"></div>
                        <span className="text-xs text-neutral-600 font-medium">Ocupado</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/30"></div>
                        <span className="text-xs text-neutral-600 font-medium">Indisponível</span>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => {}}
                      className="w-full border-neutral-200 hover:bg-neutral-50 shadow-sm hover:shadow-md"
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Bloquear Horário
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>
            
            {/* Time Slots Card */}
            <div className="lg:col-span-2">
              <Card className="border border-neutral-200 shadow-sm bg-white">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                    <Clock className="h-4 w-4 text-[#58c9d1]" />
                    {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </CardTitle>
                  <CardDescription className="text-neutral-600 text-sm">
                    Horários disponíveis e agendamentos do dia
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-4">
                  {isLoading ? (
                    <div className="flex justify-center items-center p-12">
                      <div className="text-center">
                        <RefreshCw className="h-12 w-12 animate-spin text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-600 font-medium">Carregando horários...</p>
                      </div>
                    </div>
                  ) : timeSlots.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="w-16 h-16 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-4">
                        <CalendarDays className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Dia Indisponível</h3>
                      <p className="text-gray-600 mb-6 max-w-md mx-auto">
                        Este dia não está configurado como disponível na sua agenda semanal.
                      </p>
                      <Button 
                        variant="outline"
                        onClick={() => {}}
                        className="border-gray-300 hover:bg-gray-50"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar Agenda
                      </Button>
                    </div>
                  ) : (
                    <ScrollArea className="h-[500px] pr-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {timeSlots.map((slot, index) => (
                          <div 
                            key={index}
                            className={cn(
                              "p-4 rounded-xl border transition-all duration-300 hover:shadow-md",
                              !slot.isAvailable && slot.status 
                                ? "bg-blue-50 border-blue-200" 
                                : !slot.isAvailable 
                                  ? "bg-gray-50 border-gray-200" 
                                  : "bg-green-50 border-green-200 hover:border-green-300"
                            )}
                          >
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <h3 className="font-semibold text-gray-900 text-lg">
                                  {slot.startTime} - {slot.endTime}
                                </h3>
                                {slot.status && (
                                  <Badge 
                                    variant={
                                      slot.status === 'confirmed' ? "default" : 
                                      slot.status === 'completed' ? "secondary" :
                                      slot.status === 'canceled' ? "destructive" : "outline"
                                    }
                                    className="mt-2"
                                  >
                                    {slot.status === 'confirmed' ? "Confirmado" : 
                                     slot.status === 'completed' ? "Concluído" :
                                     slot.status === 'canceled' ? "Cancelado" : 
                                     slot.status === 'pending' ? "Pendente" : slot.status}
                                  </Badge>
                                )}
                              </div>
                              {slot.isAvailable ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button 
                                        size="sm" 
                                        variant="outline"
                                        className="border-green-300 hover:bg-green-50 hover:border-green-400"
                                        onClick={() => {
                                          setBlockStartTime(slot.startTime);
                                          setBlockEndTime(slot.endTime);
                                        }}
                                      >
                                        <Plus className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      <p>Bloquear este horário</p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                !slot.status && (
                                  <Badge variant="outline" className="bg-gray-100 text-gray-600">
                                    Bloqueado
                                  </Badge>
                                )
                              )}
                            </div>
                            
                            {slot.isAvailable && !slot.status && (
                              <div className="flex items-center gap-2 text-sm text-green-600">
                                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                <span>Disponível para agendamento</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Block Time Dialog */}
          <Card className="border border-neutral-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Shield className="h-4 w-4 text-[#58c9d1]" />
                Bloquear Horário
              </CardTitle>
              <CardDescription className="text-neutral-600 text-sm">
                Bloqueie um período na sua agenda para pausas, reuniões ou outros compromissos.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <Label htmlFor="blockDate" className="text-neutral-700 text-sm font-medium">Data</Label>
                    <div className="p-3 border border-neutral-200 rounded-md bg-white shadow-sm">
                      {format(selectedDate, "dd/MM/yyyy")}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="blockStartTime" className="text-neutral-700 text-sm font-medium">Hora de início</Label>
                    <Select 
                      value={blockStartTime} 
                      onValueChange={setBlockStartTime}
                    >
                      <SelectTrigger id="blockStartTime" className="bg-white border-neutral-200 shadow-sm hover:shadow-md transition-all">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-neutral-200 shadow-lg">
                        {Array.from({ length: 24 }).map((_, hour) => 
                          Array.from({ length: 2 }).map((_, halfHour) => {
                            const time = `${hour.toString().padStart(2, '0')}:${halfHour * 30 === 0 ? '00' : '30'}`;
                            return (
                              <SelectItem key={time} value={time} className="hover:bg-neutral-50">{time}</SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="blockEndTime" className="text-neutral-700 text-sm font-medium">Hora de término</Label>
                    <Select 
                      value={blockEndTime} 
                      onValueChange={setBlockEndTime}
                    >
                      <SelectTrigger id="blockEndTime" className="bg-white border-neutral-200 shadow-sm hover:shadow-md transition-all">
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-neutral-200 shadow-lg">
                        {Array.from({ length: 24 }).map((_, hour) => 
                          Array.from({ length: 2 }).map((_, halfHour) => {
                            const time = `${hour.toString().padStart(2, '0')}:${halfHour * 30 === 0 ? '00' : '30'}`;
                            return (
                              <SelectItem key={time} value={time} className="hover:bg-neutral-50">{time}</SelectItem>
                            );
                          })
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="blockReason" className="text-neutral-700 text-sm font-medium">Motivo</Label>
                  <Input 
                    id="blockReason" 
                    value={blockNotes} 
                    onChange={(e) => setBlockNotes(e.target.value)} 
                    placeholder="Almoço, reunião, etc."
                    className="bg-white border-neutral-200 shadow-sm hover:shadow-md transition-all"
                  />
                </div>
              </div>
              <CardFooter className="pt-3 border-t border-neutral-200 bg-neutral-50/50">
                <div className="w-full space-y-3">
                  <Button 
                    variant="outline" 
                    onClick={() => {}}
                    className="border-neutral-200 hover:bg-neutral-50 shadow-sm hover:shadow-md"
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={handleBlockTime}
                    disabled={blockTimeMutation.isPending}
                    className="bg-[#58c9d1] text-white hover:bg-[#58c9d1]/90 shadow-sm hover:shadow-md"
                  >
                    {blockTimeMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Bloquear
                  </Button>
                </div>
              </CardFooter>
            </CardContent>
          </Card>
          
          {/* Edit Weekly Schedule Dialog */}
          <Card className="border border-neutral-200 shadow-sm bg-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-bold text-neutral-900 flex items-center gap-2">
                <Settings className="h-4 w-4 text-[#58c9d1]" />
                Configurar Agenda Semanal
              </CardTitle>
              <CardDescription className="text-neutral-600 text-sm">
                Defina seus horários de atendimento para cada dia da semana.
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="py-4">
                <div className="grid gap-4">
                  {weeklySchedule.map((day, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex flex-col md:flex-row md:items-center gap-4 p-3 border rounded-lg shadow-sm transition-all duration-200",
                        day.isAvailable
                          ? "bg-gradient-to-r from-[#58c9d1]/10 to-white border-[#58c9d1]/20"
                          : "bg-neutral-50 border-neutral-200 opacity-70"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-[180px]">
                        <Switch
                          checked={day.isAvailable}
                          onCheckedChange={(checked) => {
                            const newSchedule = [...weeklySchedule];
                            newSchedule[index] = {
                              ...newSchedule[index],
                              isAvailable: checked,
                            };
                            setWeeklySchedule(newSchedule);
                          }}
                          className={day.isAvailable ? "data-[state=checked]:bg-[#58c9d1]" : ""}
                        />
                        <Label
                          className={cn(
                            "font-semibold text-base",
                            day.isAvailable ? "text-[#58c9d1]" : "text-neutral-400 line-through"
                          )}
                        >
                          {['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][day.dayOfWeek]}
                        </Label>
                        {day.isAvailable ? (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-[#58c9d1]/20 text-[#58c9d1] font-medium">Ativo</span>
                        ) : (
                          <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-neutral-200 text-neutral-500 font-medium">Inativo</span>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                        <div>
                          <Label className="text-neutral-700 text-sm font-medium">Hora de início</Label>
                          <Select
                            value={day.startTime}
                            onValueChange={(time) => {
                              const newSchedule = [...weeklySchedule];
                              newSchedule[index] = {
                                ...newSchedule[index],
                                startTime: time,
                              };
                              setWeeklySchedule(newSchedule);
                            }}
                            disabled={!day.isAvailable}
                          >
                            <SelectTrigger className="mt-1 bg-white border-neutral-200 shadow-sm hover:shadow-md transition-all" disabled={!day.isAvailable}>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-neutral-200 shadow-lg">
                              {Array.from({ length: 24 }).map((_, hour) =>
                                Array.from({ length: 2 }).map((_, halfHour) => {
                                  const time = `${hour.toString().padStart(2, '0')}:${halfHour * 30 === 0 ? '00' : '30'}`;
                                  return (
                                    <SelectItem key={time} value={time} className="hover:bg-neutral-50">{time}</SelectItem>
                                  );
                                })
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-neutral-700 text-sm font-medium">Hora de término</Label>
                          <Select
                            value={day.endTime}
                            onValueChange={(time) => {
                              const newSchedule = [...weeklySchedule];
                              newSchedule[index] = {
                                ...newSchedule[index],
                                endTime: time,
                              };
                              setWeeklySchedule(newSchedule);
                            }}
                            disabled={!day.isAvailable}
                          >
                            <SelectTrigger className="mt-1 bg-white border-neutral-200 shadow-sm hover:shadow-md transition-all" disabled={!day.isAvailable}>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-neutral-200 shadow-lg">
                              {Array.from({ length: 24 }).map((_, hour) =>
                                Array.from({ length: 2 }).map((_, halfHour) => {
                                  const time = `${hour.toString().padStart(2, '0')}:${halfHour * 30 === 0 ? '00' : '30'}`;
                                  return (
                                    <SelectItem key={time} value={time} className="hover:bg-neutral-50">{time}</SelectItem>
                                  );
                                })
                              )}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-neutral-700 text-sm font-medium">Intervalo (minutos)</Label>
                          <Select
                            value={day.intervalMinutes.toString()}
                            onValueChange={(interval) => {
                              const newSchedule = [...weeklySchedule];
                              newSchedule[index] = {
                                ...newSchedule[index],
                                intervalMinutes: parseInt(interval),
                              };
                              setWeeklySchedule(newSchedule);
                            }}
                            disabled={!day.isAvailable}
                          >
                            <SelectTrigger className="mt-1 bg-white border-neutral-200 shadow-sm hover:shadow-md transition-all" disabled={!day.isAvailable}>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent className="bg-white border-neutral-200 shadow-lg">
                              {[15, 30, 45, 60, 90, 120].map((interval) => (
                                <SelectItem key={interval} value={interval.toString()} className="hover:bg-neutral-50">
                                  {interval} minutos
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <CardFooter className="pt-3 border-t border-neutral-200 bg-neutral-50/50">
                <div className="w-full space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => {}}
                    className="border-neutral-200 hover:bg-neutral-50 shadow-sm hover:shadow-md"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleUpdateWeeklySchedule}
                    disabled={updateWeeklyScheduleMutation.isPending}
                    className="bg-[#58c9d1] text-white hover:bg-[#58c9d1]/90 shadow-sm hover:shadow-md"
                  >
                    {updateWeeklyScheduleMutation.isPending ? (
                      <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Salvar Alterações
                  </Button>
                </div>
              </CardFooter>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
      <Navbar 
        items={[
          {
            icon: <CalendarIcon size={26} />,
            label: 'Início',
            href: '/provider/dashboard'
          },
          {
            icon: <CalendarDays size={26} />,
            label: 'Agenda',
            href: '/provider/schedule'
          },
          {
            icon: <Plus size={32} className="animate-pulse" />,
            label: 'Novo',
            href: '/provider/manual-booking'
          },
          {
            icon: <Users size={26} />,
            label: 'Perfil',
            href: '/provider/profile'
          }
        ]}
      />
    </ProviderLayout>
  );
}