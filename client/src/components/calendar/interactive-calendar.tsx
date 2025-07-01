import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import ptBrLocale from '@fullcalendar/core/locales/pt-br';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parse, addMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Appointment {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  extendedProps: {
    client?: string;
    client_id?: number;
    service?: string;
    service_id?: number;
    status: string;
    notes?: string;
    payment_status?: string;
  };
}

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
}

interface Client {
  id: number;
  name: string;
  email: string;
}

const appointmentSchema = z.object({
  title: z.string().min(1, "Título é obrigatório"),
  client_id: z.string().min(1, "Cliente é obrigatório"),
  service_id: z.string().min(1, "Serviço é obrigatório"),
  date: z.string().min(1, "Data é obrigatória"),
  start_time: z.string().min(1, "Horário de início é obrigatório"),
  end_time: z.string().optional(),
  notes: z.string().optional(),
  payment_method: z.enum(["pix", "cartao", "dinheiro"]).default("pix"),
});

const InteractiveCalendar = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [events, setEvents] = useState<Appointment[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<Appointment | null>(null);
  const [actionDate, setActionDate] = useState<Date | null>(null);
  const [actionSlot, setActionSlot] = useState<string | null>(null);
  const [availabilityDate, setAvailabilityDate] = useState<Date | null>(null);
  const [availabilitySlots, setAvailabilitySlots] = useState<{ startTime: string, endTime: string }[]>([]);
  const [loadingAvailabilities, setLoadingAvailabilities] = useState(false);
  const [existingAvailabilities, setExistingAvailabilities] = useState<{ id: number, startTime: string, endTime: string }[]>([]);

  const form = useForm<z.infer<typeof appointmentSchema>>({
    resolver: zodResolver(appointmentSchema),
    defaultValues: {
      title: "",
      client_id: "",
      service_id: "",
      date: "",
      start_time: "",
      notes: "",
      payment_method: "pix",
    },
  });

  // Buscar agendamentos
  const appointmentsQuery = useQuery({
    queryKey: ['/api/provider/appointments'],
    enabled: !!user && user.role === "provider",
  });
  
  const appointments = appointmentsQuery.data;
  const isLoadingAppointments = appointmentsQuery.isLoading;

  // Buscar serviços do prestador
  const servicesQuery = useQuery<Service[]>({
    queryKey: ['/api/provider/services'],
    enabled: !!user && user.role === "provider"
  });
  
  const services = servicesQuery.data;
  const isLoadingServices = servicesQuery.isLoading;
  
  // Log para depuração quando os dados são carregados
  useEffect(() => {
    if (servicesQuery.data) {
      console.log('Serviços carregados:', servicesQuery.data);
    }
    if (servicesQuery.error) {
      console.error('Erro ao carregar serviços:', servicesQuery.error);
    }
  }, [servicesQuery.data, servicesQuery.error]);

  // Buscar clientes
  const clientsQuery = useQuery<Client[]>({
    queryKey: ['/api/provider/clients'],
    enabled: !!user && user.role === "provider"
  });
  
  const clients = clientsQuery.data;
  const isLoadingClients = clientsQuery.isLoading;
  
  // Log para depuração quando os dados são carregados
  useEffect(() => {
    if (clientsQuery.data) {
      console.log('Clientes carregados:', clientsQuery.data);
    }
    if (clientsQuery.error) {
      console.error('Erro ao carregar clientes:', clientsQuery.error);
    }
  }, [clientsQuery.data, clientsQuery.error]);

  // Criar novo agendamento
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: z.infer<typeof appointmentSchema>) => {
      console.log("Criando agendamento manual:", data);
      
      // Estruturar os dados conforme esperado pela API
      const appointmentData = {
        title: data.title,
        clientId: parseInt(data.client_id),
        providerId: user?.id, // Usar o ID do provedor logado
        serviceId: parseInt(data.service_id),
        date: data.date,
        startTime: data.start_time,
        endTime: data.end_time,
        notes: data.notes || "",
        status: "confirmado", // Status padrão para agendamentos manuais
        paymentMethod: data.payment_method,
        isManuallyCreated: true
      };

      const res = await apiRequest('POST', '/api/appointments', appointmentData);
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Agendamento criado com sucesso:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/provider/appointments'] });
      toast({
        title: "Agendamento criado",
        description: "O agendamento foi criado com sucesso!",
      });
      form.reset();
    },
    onError: (error: Error) => {
      console.error("Erro ao criar agendamento:", error);
      toast({
        title: "Erro ao criar agendamento",
        description: error.message || "Não foi possível criar o agendamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Atualizar agendamento
  const updateAppointmentMutation = useMutation({
    mutationFn: async (data: { id: string } & z.infer<typeof appointmentSchema>) => {
      console.log("Atualizando agendamento:", data);
      
      const { id, ...formData } = data;
      
      // Estruturar os dados conforme esperado pela API
      const appointmentData = {
        title: formData.title,
        clientId: parseInt(formData.client_id),
        providerId: user?.id, // Usar o ID do provedor logado
        serviceId: parseInt(formData.service_id),
        date: formData.date,
        startTime: formData.start_time,
        endTime: formData.end_time,
        notes: formData.notes || "",
        paymentMethod: formData.payment_method,
        // Mantemos o status atual
        status: "confirmado"
      };

      const res = await apiRequest('PUT', `/api/appointments/${id}`, appointmentData);
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Agendamento atualizado com sucesso:", data);
      queryClient.invalidateQueries({ queryKey: ['/api/provider/appointments'] });
      toast({
        title: "Agendamento atualizado",
        description: "O agendamento foi atualizado com sucesso!",
      });
      form.reset();
    },
    onError: (error: Error) => {
      console.error("Erro ao atualizar agendamento:", error);
      toast({
        title: "Erro ao atualizar agendamento",
        description: error.message || "Não foi possível atualizar o agendamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Excluir agendamento
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      console.log("Excluindo agendamento:", id);
      
      const res = await apiRequest('DELETE', `/api/appointments/${id}`);
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Agendamento excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ['/api/provider/appointments'] });
      toast({
        title: "Agendamento excluído",
        description: "O agendamento foi excluído com sucesso!",
      });
      setSelectedEvent(null);
    },
    onError: (error: Error) => {
      console.error("Erro ao excluir agendamento:", error);
      toast({
        title: "Erro ao excluir agendamento",
        description: error.message || "Não foi possível excluir o agendamento. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Converter os agendamentos para o formato do FullCalendar
  useEffect(() => {
    if (appointments && Array.isArray(appointments)) {
      const formattedEvents: Appointment[] = appointments.map((appointment: any) => {
        // Determinar a cor com base no status
        let backgroundColor = '#10b981'; // verde para confirmado
        let borderColor = '#059669';
        let textColor = '#ffffff';

        if (appointment.status === 'pendente') {
          backgroundColor = '#f59e0b'; // amarelo para pendente
          borderColor = '#d97706';
        } else if (appointment.status === 'cancelado') {
          backgroundColor = '#ef4444'; // vermelho para cancelado
          borderColor = '#dc2626';
        } 
        
        // Modificar a aparência para agendamentos manuais
        if (appointment.isManuallyCreated) {
          // Adicionar um tom laranja para destacar agendamentos manuais
          if (appointment.status === 'confirmado') {
            backgroundColor = '#38bdf8'; // azul para agendamentos manuais confirmados
            borderColor = '#0284c7';
          } else if (appointment.status === 'pendente') {
            backgroundColor = '#fb923c'; // laranja mais forte para agendamentos manuais pendentes
            borderColor = '#ea580c';
          }
        }

        const start = `${appointment.date}T${appointment.start_time}`;
        const end = `${appointment.date}T${appointment.end_time}`;

        return {
          id: String(appointment.id),
          title: appointment.title,
          start,
          end,
          backgroundColor,
          borderColor,
          textColor,
          extendedProps: {
            client: appointment.client_name,
            client_id: appointment.client_id,
            service: appointment.service_name,
            service_id: appointment.service_id,
            status: appointment.status,
            notes: appointment.notes,
            payment_status: appointment.payment_status,
            isManuallyCreated: appointment.isManuallyCreated || false,
          }
        };
      });

      setEvents(formattedEvents);
    }
  }, [appointments]);

  // Manipular clique em evento existente
  const handleEventClick = (info: any) => {
    const event = info.event;
    const eventData = {
      id: String(event.id),
      title: event.title,
      start: event.start,
      end: event.end,
      backgroundColor: event.backgroundColor,
      borderColor: event.borderColor,
      textColor: event.textColor,
      extendedProps: event.extendedProps,
    };

    setSelectedEvent(eventData);

    // Formatando a data e hora para o formulário
    const date = format(new Date(event.start), 'yyyy-MM-dd');
    const start_time = format(new Date(event.start), 'HH:mm');

    form.reset({
      title: event.title,
      client_id: String(event.extendedProps.client_id || ""),
      service_id: String(event.extendedProps.service_id || ""),
      date,
      start_time,
      notes: event.extendedProps.notes || "",
      payment_method: "pix", // Valor padrão
    });
  };

  // NOVO: Buscar horários disponíveis do backend ao abrir o modal
  const fetchAvailabilities = async (date: Date) => {
    if (!user?.id) return;
    setLoadingAvailabilities(true);
    try {
      const res = await apiRequest('GET', `/api/provider/${user.id}/availability?date=${format(date, 'yyyy-MM-dd')}`);
      const data = await res.json();
      setExistingAvailabilities(Array.isArray(data) ? data : []);
    } catch (e) {
      setExistingAvailabilities([]);
    } finally {
      setLoadingAvailabilities(false);
    }
  };

  // Manipular novo agendamento por clique em data
  const handleDateClick = (info: any) => {
    setAvailabilityDate(info.date);
    setAvailabilitySlots([{ startTime: '', endTime: '' }]);
    fetchAvailabilities(info.date);
  };

  // Manipular arrastar e soltar
  const handleEventDrop = async (info: any) => {
    const event = info.event;
    
    const newDate = format(new Date(event.start), 'yyyy-MM-dd');
    const newStartTime = format(new Date(event.start), 'HH:mm');
    const newEndTime = format(new Date(event.end), 'HH:mm');
    
    console.log("Movendo agendamento:", event.id, { newDate, newStartTime, newEndTime });

    try {
      await apiRequest('PUT', `/api/appointments/${event.id}`, {
        date: newDate,
        startTime: newStartTime,
        endTime: newEndTime
      });

      toast({
        title: "Agendamento atualizado",
        description: "O agendamento foi movido com sucesso!",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/provider/appointments'] });
    } catch (error) {
      console.error("Erro ao mover agendamento:", error);
      info.revert();
      toast({
        title: "Erro ao mover agendamento",
        description: "Não foi possível mover o agendamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Manipular redimensionamento de eventos
  const handleEventResize = async (info: any) => {
    const event = info.event;
    
    const newEndTime = format(new Date(event.end), 'HH:mm');
    console.log("Redimensionando agendamento:", event.id, { newEndTime });

    try {
      await apiRequest('PUT', `/api/appointments/${event.id}`, {
        endTime: newEndTime
      });

      toast({
        title: "Agendamento atualizado",
        description: "A duração do agendamento foi alterada com sucesso!",
      });

      queryClient.invalidateQueries({ queryKey: ['/api/provider/appointments'] });
    } catch (error) {
      console.error("Erro ao redimensionar agendamento:", error);
      info.revert();
      toast({
        title: "Erro ao alterar duração",
        description: "Não foi possível alterar a duração do agendamento. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função auxiliar para calcular o horário de término com base no serviço selecionado
  const calculateEndTime = (startTime: string, serviceDuration: number) => {
    if (!startTime) return "";
    
    try {
      const parsedTime = parse(startTime, 'HH:mm', new Date());
      const endTime = addMinutes(parsedTime, serviceDuration);
      return format(endTime, 'HH:mm');
    } catch (e) {
      console.error("Erro ao calcular horário de término:", e);
      return "";
    }
  };

  // Manipular alteração do serviço selecionado
  const handleServiceChange = (serviceId: string) => {
    form.setValue("service_id", serviceId);
    const startTime = form.getValues("start_time");
    
    if (startTime && serviceId && services) {
      const selectedService = services.find(s => s.id === Number(serviceId));
      if (selectedService) {
        // Atualizar o título do agendamento com o nome do serviço
        if (!form.getValues("title")) {
          form.setValue("title", selectedService.name);
        }
        
        // Atualizar horário de término com base na duração do serviço
        if (startTime) {
          const endTime = calculateEndTime(startTime, selectedService.duration);
          form.setValue("end_time", endTime);
        }
      }
    }
  };
  
  // Manipular alteração do cliente selecionado
  const handleClientChange = (clientId: string) => {
    form.setValue("client_id", clientId);
    
    // Se título estiver vazio e um serviço estiver selecionado, atualizar o título
    const serviceId = form.getValues("service_id");
    const title = form.getValues("title");
    
    if ((!title || title === "") && serviceId) {
      const selectedService = services?.find(s => s.id === Number(serviceId));
      if (selectedService) {
        form.setValue("title", selectedService.name);
      }
    }
  };

  // Manipular envio do formulário
  const onSubmit = (data: z.infer<typeof appointmentSchema>) => {
    const selectedService = services?.find(s => s.id === Number(data.service_id));
    
    // Calcular horário de término
    const endTime = calculateEndTime(data.start_time, selectedService?.duration || 60);
    
    if (selectedEvent) {
      updateAppointmentMutation.mutate({
        id: selectedEvent.id,
        ...data,
        end_time: endTime,
      });
    } else {
      createAppointmentMutation.mutate({
        ...data,
        end_time: endTime,
      });
    }
  };

  // Manipular exclusão de agendamento
  const handleDeleteAppointment = () => {
    if (selectedEvent) {
      deleteAppointmentMutation.mutate(selectedEvent.id);
    }
  };

  // Definir a função handleRemoveAvailability antes do JSX
  const handleRemoveAvailability = async (id: number) => {
    if (!user?.id) return;
    await apiRequest('DELETE', `/api/provider/${user.id}/availability/${id}`);
    if (availabilityDate) fetchAvailabilities(availabilityDate);
  };

  if (isLoadingAppointments || isLoadingServices || isLoadingClients) {
    return <div className="flex justify-center items-center h-64">Carregando calendário...</div>;
  }
  
  // Função para renderizar o conteúdo do evento personalizado
  const renderEventContent = (eventInfo: any) => {
    const appointment = eventInfo.event;
    const isManual = appointment.extendedProps.isManuallyCreated;
    
    return (
      <div className="flex flex-col w-full overflow-hidden p-1">
        <div className="font-semibold text-xs truncate flex items-center">
          {appointment.title}
          {isManual && (
            <span className="ml-1 text-[8px] py-0 px-1 rounded bg-white/20 text-white border border-white/30">
              Manual
            </span>
          )}
        </div>
        <div className="text-[10px] truncate">
          {appointment.extendedProps.client && (
            <span>Cliente: {appointment.extendedProps.client}</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-0">
          <Tabs defaultValue="week">
            <div className="flex justify-between items-center p-4 border-b">
              <TabsList>
                <TabsTrigger value="month">Mês</TabsTrigger>
                <TabsTrigger value="week">Semana</TabsTrigger>
                <TabsTrigger value="day">Dia</TabsTrigger>
              </TabsList>
            </div>
            
            <div className="p-3 bg-muted/20 flex flex-wrap items-center gap-2 text-xs border-b">
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
                <div className="w-3 h-3 rounded-full bg-[#38bdf8] mr-1"></div>
                <span>Manual</span>
              </div>
            </div>

            <TabsContent value="month" className="p-0">
              <div className="h-[650px] md:h-[750px]">
                <FullCalendar
                  plugins={[dayGridPlugin, interactionPlugin]}
                  initialView="dayGridMonth"
                  locale={ptBrLocale}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: ''
                  }}
                  events={events}
                  eventClick={handleEventClick}
                  dateClick={handleDateClick}
                  editable={true}
                  droppable={true}
                  eventDrop={handleEventDrop}
                  eventContent={renderEventContent}
                  height="100%"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="week" className="p-0">
              <div className="h-[650px] md:h-[750px]">
                <FullCalendar
                  plugins={[timeGridPlugin, interactionPlugin]}
                  initialView="timeGridWeek"
                  locale={ptBrLocale}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: ''
                  }}
                  events={events}
                  eventClick={handleEventClick}
                  dateClick={handleDateClick}
                  editable={true}
                  droppable={true}
                  eventDrop={handleEventDrop}
                  eventResize={handleEventResize}
                  eventContent={renderEventContent}
                  slotDuration="00:30:00"
                  slotLabelInterval="01:00"
                  slotMinTime="07:00:00"
                  slotMaxTime="22:00:00"
                  allDaySlot={false}
                  height="100%"
                />
              </div>
            </TabsContent>
            
            <TabsContent value="day" className="p-0">
              <div className="h-[650px] md:h-[750px]">
                <FullCalendar
                  plugins={[timeGridPlugin, interactionPlugin]}
                  initialView="timeGridDay"
                  locale={ptBrLocale}
                  headerToolbar={{
                    left: 'prev,next today',
                    center: 'title',
                    right: ''
                  }}
                  events={events}
                  eventClick={handleEventClick}
                  dateClick={handleDateClick}
                  editable={true}
                  droppable={true}
                  eventDrop={handleEventDrop}
                  eventResize={handleEventResize}
                  eventContent={renderEventContent}
                  slotDuration="00:15:00"
                  slotLabelInterval="01:00"
                  slotMinTime="07:00:00"
                  slotMaxTime="22:00:00"
                  allDaySlot={false}
                  height="100%"
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Área fixa de gerenciamento de horários abaixo do calendário */}
      <div className="mt-6 p-4 bg-white rounded shadow border max-w-lg mx-auto">
        {availabilityDate ? (
          <>
            <div className="mb-2 font-semibold text-lg text-center">
              Horários para {format(availabilityDate, 'dd/MM/yyyy')}
            </div>
            {loadingAvailabilities ? (
              <div className="text-center text-gray-500">Carregando horários...</div>
            ) : (
              <>
                {existingAvailabilities.length > 0 ? (
                  <div className="mb-3">
                    <div className="font-medium text-sm mb-1">Já cadastrados:</div>
                    <div className="flex flex-wrap gap-2">
                      {existingAvailabilities.map(avail => (
                        <div key={avail.id} className="flex items-center gap-2 bg-gray-100 px-3 py-1 rounded">
                          <span className="font-mono">{avail.startTime} - {avail.endTime}</span>
                          <Button size="sm" variant="ghost" onClick={() => handleRemoveAvailability(avail.id)} title="Remover horário">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="mb-3 text-gray-500 text-sm text-center">Nenhum horário cadastrado para este dia.</div>
                )}
                <div className="flex items-end gap-2 justify-center">
                  <div>
                    <label className="block text-xs font-medium mb-1">Início</label>
                    <Input type="time" value={availabilitySlots[0]?.startTime || ''} onChange={e => {
                      const newSlots = [...availabilitySlots];
                      newSlots[0].startTime = e.target.value;
                      setAvailabilitySlots(newSlots);
                    }} className="w-28" />
                  </div>
                  <span className="pb-2">até</span>
                  <div>
                    <label className="block text-xs font-medium mb-1">Fim</label>
                    <Input type="time" value={availabilitySlots[0]?.endTime || ''} onChange={e => {
                      const newSlots = [...availabilitySlots];
                      newSlots[0].endTime = e.target.value;
                      setAvailabilitySlots(newSlots);
                    }} className="w-28" />
                  </div>
                  <Button
                    className="mb-1"
                    onClick={async () => {
                      if (!availabilityDate || !user?.id) return;
                      if (!availabilitySlots[0].startTime || !availabilitySlots[0].endTime) return;
                      await apiRequest('POST', `/api/provider/${user.id}/availability`, {
                        date: format(availabilityDate, 'yyyy-MM-dd'),
                        slots: [{ startTime: availabilitySlots[0].startTime, endTime: availabilitySlots[0].endTime }]
                      });
                      setAvailabilitySlots([{ startTime: '', endTime: '' }]);
                      fetchAvailabilities(availabilityDate);
                    }}
                    disabled={!availabilitySlots[0].startTime || !availabilitySlots[0].endTime}
                  >
                    + Adicionar horário
                  </Button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-center text-gray-400">Selecione um dia no calendário para gerenciar horários.</div>
        )}
      </div>
    </div>
  );
};

export default InteractiveCalendar;