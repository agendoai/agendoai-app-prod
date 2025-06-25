import React, { useState, useEffect, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import timeGridPlugin from '@fullcalendar/timegrid';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { format, startOfWeek, endOfWeek, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Calendar,
  Download,
  FileText,
  Clock,
  User,
  Clipboard,
  BarChart3,
  Info,
  AlertCircle,
  PhoneCall,
  Mail
} from 'lucide-react';
import { formatStatus, formatCurrency } from '@/lib/utils';

export interface WeeklyCalendarAppointment {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    client?: string;
    service?: string;
    serviceName?: string;
    status?: string;
    notes?: string;
    payment_status?: string;
    isManuallyCreated?: boolean;
    clientPhone?: string;
    clientEmail?: string;
    price?: number; // Preço em centavos
    duration?: number; // Duração em minutos
  };
}

interface WeeklyCalendarProps {
  appointments: WeeklyCalendarAppointment[];
  isLoading?: boolean;
  onEventClick?: (info: any) => void;
}

// Interfaces para estatísticas
interface DayStatistics {
  date: string;
  formattedDate: string;
  totalAppointments: number;
  revenue: number;
  manualAppointments: number;
}

interface AppointmentStatistics {
  totalAppointments: number;
  totalRevenue: number;
  byStatus: Record<string, number>;
  byDays: DayStatistics[];
  manualAppointments: number;
  manualRevenue: number;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({
  appointments,
  isLoading = false,
  onEventClick
}) => {
  const [currentView, setCurrentView] = useState<'timeGridWeek' | 'dayGridMonth'>('timeGridWeek');
  const [selectedAppointment, setSelectedAppointment] = useState<WeeklyCalendarAppointment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [calendarApi, setCalendarApi] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'calendar' | 'stats'>('calendar');

  // Função para renderizar o conteúdo do evento personalizado com melhorias visuais
  const renderEventContent = (eventInfo: any) => {
    const appointment = eventInfo.event;
    const isManual = appointment.extendedProps.isManuallyCreated;
    const status = appointment.extendedProps.status;
    
    return (
      <div className="flex flex-col w-full overflow-hidden p-1">
        <div className="font-semibold text-xs truncate flex items-center">
          {appointment.title}
          {isManual && (
            <Badge variant="outline" className="ml-1 text-[8px] py-0 h-3 bg-orange-100 text-orange-700 border-orange-300">
              Manual
            </Badge>
          )}
        </div>
        <div className="text-[10px] truncate flex items-center justify-between">
          <span>
            {appointment.extendedProps.client && (
              <div className="flex items-center">
                <User className="h-2.5 w-2.5 mr-0.5" />
                <span>{appointment.extendedProps.client}</span>
              </div>
            )}
          </span>
          <span>
            {appointment.extendedProps.duration && (
              <div className="flex items-center opacity-80">
                <Clock className="h-2.5 w-2.5 mr-0.5" />
                <span>{appointment.extendedProps.duration}min</span>
              </div>
            )}
          </span>
        </div>
      </div>
    );
  };

  // Função aprimorada para lidar com cliques em eventos
  const handleEventClick = useCallback((info: any) => {
    const event = info.event;
    setSelectedAppointment({
      id: event.id,
      title: event.title,
      start: event.startStr,
      end: event.endStr,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      textColor: event.textColor,
      extendedProps: event.extendedProps
    });
    setIsDetailsOpen(true);
    
    // Chamar o manipulador de evento passado via prop se existir
    if (onEventClick) {
      onEventClick(info);
    }
  }, [onEventClick]);

  // Calcular estatísticas da semana atual
  const statistics = useMemo((): AppointmentStatistics => {
    if (!appointments || appointments.length === 0) {
      return {
        totalAppointments: 0,
        totalRevenue: 0,
        byStatus: {},
        byDays: [],
        manualAppointments: 0,
        manualRevenue: 0
      };
    }

    // Obter datas da semana atual
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Segunda-feira
    const weekDays = Array.from({ length: 7 }, (_, i) => 
      format(addDays(weekStart, i), 'yyyy-MM-dd')
    );
    
    // Inicializar estatísticas por dia
    const dayStats: Record<string, DayStatistics> = {};
    weekDays.forEach(date => {
      dayStats[date] = {
        date,
        formattedDate: format(parseISO(date), 'EEE, dd/MM', { locale: ptBR }),
        totalAppointments: 0,
        revenue: 0,
        manualAppointments: 0
      };
    });

    // Variáveis para contabilizar totais
    let totalAppointments = 0;
    let totalRevenue = 0;
    let manualAppointments = 0;
    let manualRevenue = 0;
    const byStatus: Record<string, number> = {};

    // Processar cada agendamento
    appointments.forEach(appointment => {
      const date = appointment.start.split('T')[0];
      const price = appointment.extendedProps.price || 0;
      const status = appointment.extendedProps.status || 'confirmado';
      const isManual = appointment.extendedProps.isManuallyCreated;
      
      // Contabilizar apenas agendamentos da semana atual
      if (weekDays.includes(date)) {
        totalAppointments++;
        totalRevenue += price;
        
        // Contabilizar por status
        byStatus[status] = (byStatus[status] || 0) + 1;
        
        // Contabilizar agendamentos manuais
        if (isManual) {
          manualAppointments++;
          manualRevenue += price;
        }
        
        // Adicionar às estatísticas do dia
        if (dayStats[date]) {
          dayStats[date].totalAppointments++;
          dayStats[date].revenue += price;
          if (isManual) {
            dayStats[date].manualAppointments++;
          }
        }
      }
    });

    return {
      totalAppointments,
      totalRevenue,
      byStatus,
      byDays: Object.values(dayStats),
      manualAppointments,
      manualRevenue
    };
  }, [appointments]);

  // Função para exportar agendamentos
  const exportAppointments = useCallback((format: 'csv' | 'pdf') => {
    if (!appointments || appointments.length === 0) {
      alert('Não há agendamentos para exportar');
      return;
    }
    
    if (format === 'csv') {
      // Criar CSV dos agendamentos
      const headers = ['ID', 'Título', 'Cliente', 'Serviço', 'Início', 'Fim', 'Status', 'Observações', 'Tipo'];
      const rows = appointments.map(appointment => [
        appointment.id,
        appointment.title,
        appointment.extendedProps.client || '',
        appointment.extendedProps.serviceName || '',
        appointment.start,
        appointment.end,
        appointment.extendedProps.status || '',
        appointment.extendedProps.notes || '',
        appointment.extendedProps.isManuallyCreated ? 'Manual' : 'Automático'
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      // Criar link para download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `agendamentos_${format(new Date(), 'yyyy-MM-dd')}.csv`);
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Alerta simples para PDF (em produção, usaríamos uma biblioteca real de PDF)
      alert('Exportação para PDF será implementada em breve!');
    }
  }, [appointments]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <div className="p-4">
            <Skeleton className="h-[400px] w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-0">
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-xl font-semibold flex items-center">
              <Calendar className="w-5 h-5 mr-2 text-primary" />
              Agenda Semanal
            </CardTitle>
            <CardDescription>
              Visualize e gerencie todos os seus agendamentos
            </CardDescription>
          </div>
          <div className="flex space-x-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportAppointments('csv')}
                    className="flex items-center"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    <span className="hidden sm:inline">Exportar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Exportar agendamentos em CSV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="h-9">
              <TabsList className="h-9">
                <TabsTrigger value="calendar" className="h-8 px-3">
                  <Calendar className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Calendário</span>
                </TabsTrigger>
                <TabsTrigger value="stats" className="h-8 px-3">
                  <BarChart3 className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Estatísticas</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-2 pt-4">
        <div className="p-2 bg-muted/20 flex flex-wrap items-center gap-2 text-xs border rounded-md mb-3">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#10b981] mr-1"></div>
            <span>Confirmado</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#f59e0b] mr-1"></div>
            <span>Pendente</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#ef4444] mr-1"></div>
            <span>Cancelado</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-[#3b82f6] mr-1"></div>
            <span>Concluído</span>
          </div>
          <div className="flex items-center ml-auto">
            <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-300">
              Manual
            </Badge>
            <span className="ml-1">Agendamento manual</span>
          </div>
        </div>
        
        {activeTab === 'calendar' && (
          <div className="min-h-[600px] pb-4">
            <FullCalendar
              plugins={[timeGridPlugin, dayGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'timeGridWeek,dayGridMonth'
              }}
              locale={ptBrLocale}
              slotMinTime="06:00:00"
              slotMaxTime="22:00:00"
              events={appointments}
              height="auto"
              eventContent={renderEventContent}
              dayMaxEvents={true}
              allDaySlot={false}
              nowIndicator={true}
              businessHours={{
                daysOfWeek: [1, 2, 3, 4, 5],
                startTime: '08:00',
                endTime: '18:00',
              }}
              eventClick={handleEventClick}
              viewDidMount={(view) => {
                setCurrentView(view.view.type as any);
                setCalendarApi(view.view.calendar);
              }}
              eventDisplay="block"
              eventTimeFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false,
                hour12: false
              }}
              slotLabelFormat={{
                hour: '2-digit',
                minute: '2-digit',
                meridiem: false,
                hour12: false
              }}
            />
          </div>
        )}
        
        {activeTab === 'stats' && (
          <div className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="bg-primary/5 border-primary/20">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total de Agendamentos</p>
                      <p className="text-2xl font-bold">{statistics.totalAppointments}</p>
                    </div>
                    <Calendar className="h-8 w-8 text-primary opacity-70" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-green-50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Receita Estimada</p>
                      <p className="text-2xl font-bold">{formatCurrency(statistics.totalRevenue)}</p>
                    </div>
                    <FileText className="h-8 w-8 text-green-600 opacity-70" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-orange-50 border-orange-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Agendamentos Manuais</p>
                      <p className="text-2xl font-bold">{statistics.manualAppointments}</p>
                    </div>
                    <Clipboard className="h-8 w-8 text-orange-600 opacity-70" />
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Agendamentos por Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(statistics.byStatus).length > 0 ? (
                      Object.entries(statistics.byStatus).map(([status, count]) => (
                        <div key={status} className="flex items-center">
                          <div className={`w-3 h-3 rounded-full mr-2 ${
                            status === 'confirmado' ? 'bg-[#10b981]' :
                            status === 'pendente' ? 'bg-[#f59e0b]' :
                            status === 'cancelado' ? 'bg-[#ef4444]' :
                            status === 'concluido' ? 'bg-[#3b82f6]' :
                            'bg-gray-400'
                          }`} />
                          <div className="flex-1 flex justify-between items-center">
                            <span className="capitalize">{formatStatus(status)}</span>
                            <div className="flex items-center">
                              <span className="font-medium">{count}</span>
                              <span className="text-xs text-muted-foreground ml-1">
                                ({Math.round((count / statistics.totalAppointments) * 100)}%)
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Info className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p>Nenhum dado disponível</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Agendamentos por Dia</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[200px] pr-4">
                    <div className="space-y-3">
                      {statistics.byDays.map((day) => (
                        <Card key={day.date} className="p-2 border-muted/70">
                          <div className="flex justify-between items-center">
                            <div>
                              <p className="font-medium capitalize">{day.formattedDate}</p>
                              <div className="text-xs text-muted-foreground flex items-center mt-1">
                                <Calendar className="h-3 w-3 mr-1" />
                                <span>{day.totalAppointments} agendamentos</span>
                                {day.manualAppointments > 0 && (
                                  <Badge variant="outline" className="ml-2 h-4 text-[9px] bg-orange-100 text-orange-700 border-orange-300">
                                    {day.manualAppointments} manual
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{formatCurrency(day.revenue)}</p>
                              <p className="text-xs text-muted-foreground">Receita estimada</p>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </CardContent>
      
      {/* Diálogo de detalhes do agendamento */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Detalhes do Agendamento</DialogTitle>
            <DialogDescription>
              Informações completas sobre este agendamento
            </DialogDescription>
          </DialogHeader>
          
          {selectedAppointment && (
            <div className="space-y-4">
              <div className="p-3 rounded-md" style={{ backgroundColor: `${selectedAppointment.backgroundColor}15` }}>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{selectedAppointment.title}</h3>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(selectedAppointment.start), 'dd/MM/yyyy')}
                    </div>
                    <div className="text-sm">
                      {format(new Date(selectedAppointment.start), 'HH:mm')} - {format(new Date(selectedAppointment.end), 'HH:mm')}
                    </div>
                  </div>
                  
                  <div>
                    <Badge 
                      style={{ 
                        backgroundColor: selectedAppointment.backgroundColor,
                        color: selectedAppointment.textColor,
                      }}
                    >
                      {formatStatus(selectedAppointment.extendedProps.status || 'confirmado')}
                    </Badge>
                    
                    {selectedAppointment.extendedProps.isManuallyCreated && (
                      <Badge variant="outline" className="ml-2 bg-orange-100 text-orange-700 border-orange-300">
                        Manual
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Informações do cliente */}
              <div className="rounded-lg border p-3">
                <h4 className="font-medium mb-2 flex items-center text-sm">
                  <User className="h-4 w-4 mr-1" />
                  Informações do Cliente
                </h4>
                
                <div className="flex items-center mb-3">
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {selectedAppointment.extendedProps.client?.[0]?.toUpperCase() || "C"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">{selectedAppointment.extendedProps.client || "Cliente não informado"}</p>
                    
                    <div className="flex items-center space-x-3 mt-1 text-sm">
                      {selectedAppointment.extendedProps.clientPhone && (
                        <a href={`tel:${selectedAppointment.extendedProps.clientPhone}`} className="flex items-center text-xs text-primary">
                          <PhoneCall className="h-3 w-3 mr-1" /> Ligar
                        </a>
                      )}
                      
                      {selectedAppointment.extendedProps.clientEmail && (
                        <a href={`mailto:${selectedAppointment.extendedProps.clientEmail}`} className="flex items-center text-xs text-primary">
                          <Mail className="h-3 w-3 mr-1" /> Email
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Informações do serviço */}
              <div className="rounded-lg border p-3">
                <h4 className="font-medium mb-2 flex items-center text-sm">
                  <Info className="h-4 w-4 mr-1" />
                  Informações do Serviço
                </h4>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground">Serviço</p>
                    <p>{selectedAppointment.extendedProps.serviceName || selectedAppointment.title}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Duração</p>
                    <p>{selectedAppointment.extendedProps.duration || '-'} minutos</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Valor</p>
                    <p>{selectedAppointment.extendedProps.price ? formatCurrency(selectedAppointment.extendedProps.price) : '-'}</p>
                  </div>
                  
                  <div>
                    <p className="text-muted-foreground">Status</p>
                    <p className="capitalize">{formatStatus(selectedAppointment.extendedProps.status || 'confirmado')}</p>
                  </div>
                </div>
                
                {selectedAppointment.extendedProps.notes && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-muted-foreground text-sm">Observações</p>
                    <p className="text-sm mt-1">{selectedAppointment.extendedProps.notes}</p>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                  Fechar
                </Button>
                
                <Button>
                  Gerenciar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default WeeklyCalendar;