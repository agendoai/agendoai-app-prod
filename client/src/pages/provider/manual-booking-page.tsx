import React, { useState, useEffect, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Service, User } from "@shared/schema";
import { ScissorsIcon } from "@/components/ui/scissors-icon";
import { PageTransition } from "@/components/ui/page-transition";
import ProviderLayout from "@/components/layout/provider-layout";
import { 
  Calendar, 
  Clock, 
  UserRound, 
  CheckCircle, 
  Search,
  UserPlus,
  Sparkles,
  AlertCircle,
  Info,
  BrainCircuit
} from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatCurrency, generateTimeSlots } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { format, addDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Navbar from "@/components/layout/navbar";

// Step indicators
const steps = [
  { id: 1, name: "Serviço" },
  { id: 2, name: "Data/Hora" },
  { id: 3, name: "Cliente" },
  { id: 4, name: "Confirmar" },
];

// Form schemas for each step
const serviceSchema = z.object({
  providerServiceId: z.string({ required_error: "Selecione um serviço" }),
});

const dateTimeSchema = z.object({
  date: z.string({ required_error: "Selecione uma data" }),
  time: z.string({ required_error: "Selecione um horário" }),
  forceBooking: z.boolean().default(false),
});

// Schema para validação do formulário de cliente
// Cria dois schemas separados para cada tipo de cliente
const existingClientSchema = z.object({
  clientType: z.literal("existing"),
  clientId: z.string({ required_error: "Selecione um cliente existente" }),
  clientName: z.string().optional(),
  clientEmail: z.string().optional(),
  clientPhone: z.string().optional(),
});

const newClientSchema = z.object({
  clientType: z.literal("new"),
  clientId: z.string().optional(),
  clientName: z.string({ required_error: "Nome do cliente é obrigatório" }),
  clientEmail: z.string({ required_error: "Email do cliente é obrigatório" }).email("Email inválido"),
  clientPhone: z.string({ required_error: "Telefone do cliente é obrigatório" }),
});

// Combina os dois schemas usando discriminated union
const clientSchema = z.discriminatedUnion("clientType", [
  existingClientSchema,
  newClientSchema
]);

const confirmationSchema = z.object({
  notes: z.string().optional(),
  sendNotification: z.boolean().default(true),
});

// Define type for manual booking data
type ManualBookingData = {
  providerServiceId: string;
  date: string;
  time: string;
  forceBooking: boolean;
  clientType: "existing" | "new";
  clientId?: string;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
  notes?: string;
  sendNotification: boolean;
};

// Tipo para slots de tempo inteligentes
type SmartTimeSlot = {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  availabilityId?: number;
  serviceDuration?: number;
  adaptationScore?: number;
  adaptationReason?: string;
};

// Tipo para exibir slots
type DisplayTimeSlot = {
  value: string;
  label: string;
  adaptationScore?: number;
  adaptationReason?: string;
};

export default function ManualBookingPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Current step state
  const [currentStep, setCurrentStep] = useState(1);
  
  // Estado para o sucesso do agendamento
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [createdAppointment, setCreatedAppointment] = useState<any>(null);
  
  // Booking data state
  const [bookingData, setBookingData] = useState<ManualBookingData>({
    providerServiceId: "",
    date: "",
    time: "",
    forceBooking: false,
    clientType: "existing",
    clientId: "",
    clientName: "",
    clientEmail: "",
    clientPhone: "",
    notes: "",
    sendNotification: true,
  });
  

  
  // Estado para toggle de otimização com IA
  const [useAiOptimization, setUseAiOptimization] = useState(true);
  
  // Form instances for each step
  const serviceForm = useForm<z.infer<typeof serviceSchema>>({
    resolver: zodResolver(serviceSchema),
    defaultValues: {
      providerServiceId: bookingData.providerServiceId,
    },
  });
  
  const dateTimeForm = useForm<z.infer<typeof dateTimeSchema>>({
    resolver: zodResolver(dateTimeSchema),
    defaultValues: {
      date: bookingData.date,
      time: bookingData.time,
      forceBooking: bookingData.forceBooking,
    },
  });
  
  const clientForm = useForm<z.infer<typeof clientSchema>>({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      clientType: bookingData.clientType,
      clientId: bookingData.clientId,
      clientName: bookingData.clientName,
      clientEmail: bookingData.clientEmail,
      clientPhone: bookingData.clientPhone,
    },
  });
  
  const confirmationForm = useForm<z.infer<typeof confirmationSchema>>({
    resolver: zodResolver(confirmationSchema),
    defaultValues: {
      notes: bookingData.notes,
      sendNotification: bookingData.sendNotification,
    },
  });
  
  // Fetch services from provider_services table
  const { data: providerServices = [], isLoading: isProviderServicesLoading } = useQuery({
    queryKey: [`/api/provider-services/provider/${user?.id}`],
    enabled: !!user?.id,
  });
  
  // Transformar os dados da API provider-services para o formato esperado
  const services = React.useMemo(() => {
    return providerServices.map((service: any) => ({
      id: service.id, // Usar o ID do provider_service
      serviceId: service.serviceId, // Guardar o serviceId original
      name: service.serviceName,
      description: service.serviceDescription || "",
      duration: service.executionTime || 30,
      price: service.price, // Corrigido: usar o preço personalizado do prestador
      categoryId: service.categoryId,
      providerId: service.providerId,
      isActive: true
    }));
  }, [providerServices]);
  
  const isServicesLoading = isProviderServicesLoading;
  
  // Get selected service details
  const selectedService = services.find(s => s.id.toString() === bookingData.providerServiceId);
  
  // Generate available dates (next 7 days)
  const availableDates = Array.from({ length: 7 }).map((_, index) => {
    const date = addDays(new Date(), index);
    return {
      value: format(date, "yyyy-MM-dd"),
      label: format(date, "EEE, dd/MM", { locale: ptBR }),
      day: format(date, "dd", { locale: ptBR })
    };
  });
  
  // Fetch clients for the "existing client" selection
  const { data: clients = [], isLoading: isClientsLoading } = useQuery<User[]>({
    queryKey: ["/api/clients"],
    enabled: !!user,
  });
  
  // Estado para armazenar slots de tempo otimizados pela IA
  const [optimizedTimeSlots, setOptimizedTimeSlots] = useState<SmartTimeSlot[]>([]);
  
  // Estado para controlar o carregamento durante a análise de IA
  const [isOptimizingSlots, setIsOptimizingSlots] = useState(false);

  // Estado para armazenar os time slots do prestador
  const [providerTimeSlots, setProviderTimeSlots] = useState<DisplayTimeSlot[]>([]);
  const [isLoadingTimeSlots, setIsLoadingTimeSlots] = useState(false);

  // Estado para busca de clientes
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  const [searchedClients, setSearchedClients] = useState<any[]>([]);
  const [isSearchingClients, setIsSearchingClients] = useState(false);
  const [clientSearchError, setClientSearchError] = useState("");
  
  // Estado para cliente selecionado
  const [selectedClient, setSelectedClient] = useState<any>(null);

  // Gera slots de tempo básicos (sem IA)
  const basicTimeSlots: DisplayTimeSlot[] = generateTimeSlots("09:00", "18:00", 30).map(time => ({
    value: time,
    label: time
  }));
  
  // Função para buscar clientes por CPF ou telefone
  const searchClients = useCallback(async (searchTerm: string) => {
    if (!searchTerm || searchTerm.trim().length === 0) {
      setSearchedClients([]);
      setClientSearchError("");
      return;
    }

    // Validar se tem pelo menos 8 dígitos para segurança
    const digitsOnly = searchTerm.replace(/\D/g, '');
    if (digitsOnly.length < 8) {
      setClientSearchError("Digite pelo menos 8 dígitos para buscar");
      setSearchedClients([]);
      return;
    }

    try {
      setIsSearchingClients(true);
      setClientSearchError("");

      const res = await apiRequest(
        "GET", 
        `/api/clients/search?q=${encodeURIComponent(searchTerm.trim())}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Falha ao buscar clientes');
      }

      const data = await res.json();
      setSearchedClients(data.clients || []);
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
      setClientSearchError(error instanceof Error ? error.message : 'Erro ao buscar clientes');
      setSearchedClients([]);
    } finally {
      setIsSearchingClients(false);
    }
  }, []);

  // Efeito para buscar clientes quando o termo de busca muda
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (clientSearchTerm.trim().length >= 8) {
        searchClients(clientSearchTerm);
      } else {
        setSearchedClients([]);
        setClientSearchError("");
      }
    }, 500); // Debounce de 500ms

    return () => clearTimeout(timeoutId);
  }, [clientSearchTerm, searchClients]);
  
  // Função para buscar time slots do prestador
  const fetchProviderTimeSlots = useCallback(async (date: string, serviceId: string) => {
    if (!user?.id || !date || !serviceId) return;
    
    try {
      setIsLoadingTimeSlots(true);
      
      console.log(`Buscando time slots para prestador ${user.id}, data ${date}, serviço ${serviceId}`);
      
      // Buscar time slots do prestador usando a API
      const res = await apiRequest(
        "GET", 
        `/api/time-slots?providerId=${user.id}&date=${date}&serviceId=${serviceId}`
      );
      
      if (!res.ok) {
        throw new Error('Falha ao buscar time slots');
      }
      
      const data = await res.json();
      console.log('Resposta da API time-slots:', data);
      
      // Converter os slots recebidos para o formato correto
      const formattedSlots: DisplayTimeSlot[] = data.timeSlots?.map((slot: any) => ({
        value: slot.startTime,
        label: slot.startTime,
        adaptationScore: slot.adaptationScore,
        adaptationReason: slot.adaptationReason
      })) || [];
      
      console.log('Slots formatados:', formattedSlots);
      setProviderTimeSlots(formattedSlots);
    } catch (error) {
      console.error("Erro ao buscar time slots do prestador:", error);
      toast({
        title: "Aviso",
        description: "Não foi possível buscar os horários do prestador. Usando horários padrão.",
        variant: "default"
      });
      
      // Em caso de erro, usa os slots básicos
      setProviderTimeSlots(basicTimeSlots);
    } finally {
      setIsLoadingTimeSlots(false);
    }
  }, [user, toast, basicTimeSlots]);
  
  // Função para buscar slots de tempo otimizados pela IA
  const fetchOptimizedTimeSlots = useCallback(async (date: string, serviceId: string) => {
    if (!user?.id || !date || !serviceId) return;
    
    try {
      setIsOptimizingSlots(true);
      
      // Mapeia os slots básicos para o formato esperado pela API
      const slotsForApi = basicTimeSlots.map(slot => ({
        startTime: slot.value,
        endTime: calculateEndTime(slot.value, 30), // usando 30 min como padrão
        isAvailable: true
      }));
      
      // Faz requisição à API de otimização de agenda
      const res = await apiRequest(
        "POST", 
        `/api/provider-agenda/optimize`, 
        {
          providerId: user.id,
          date: date,
          serviceId: parseInt(serviceId),
          timeSlots: slotsForApi
        }
      );
      
      const optimizedSlots = await res.json();
      
      // Convertendo os slots recebidos para o formato correto
      const formattedSlots: SmartTimeSlot[] = optimizedSlots.map((slot: any) => ({
        startTime: slot.startTime,
        endTime: slot.endTime,
        isAvailable: true,
        adaptationScore: slot.adaptationScore,
        adaptationReason: slot.adaptationReason
      }));
      
      setOptimizedTimeSlots(formattedSlots);
    } catch (error) {
      console.error("Erro ao otimizar slots:", error);
      toast({
        title: "Aviso",
        description: "Não foi possível otimizar os horários com IA. Usando horários padrão.",
        variant: "default"
      });
      
      // Em caso de erro, usa os slots básicos
      const fallbackSlots: SmartTimeSlot[] = basicTimeSlots.map(slot => ({
        startTime: slot.value,
        endTime: calculateEndTime(slot.value, selectedService?.duration || 30),
        isAvailable: true
      }));
      
      setOptimizedTimeSlots(fallbackSlots);
    } finally {
      setIsOptimizingSlots(false);
    }
  }, [user, toast, basicTimeSlots, selectedService?.duration]);
  
  // Efeito para buscar time slots do prestador quando a data muda
  useEffect(() => {
    // Configurar observador uma única vez
    const subscription = dateTimeForm.watch((value, { name }) => {
      if (name === "date" && value.date) {
        // Quando a data mudar, buscar time slots do prestador
        if (bookingData.providerServiceId && selectedService) {
          console.log("Data alterada, buscando time slots do prestador");
          fetchProviderTimeSlots(value.date, selectedService.serviceId.toString());
        }
      }
    });
    
    // Limpeza do observer quando o componente for desmontado
    return () => subscription.unsubscribe();
  }, [dateTimeForm, fetchProviderTimeSlots, bookingData.providerServiceId, selectedService]);
  
  // Efeito para buscar slots otimizados quando a data muda
  useEffect(() => {
    // Configurar observador uma única vez
    const subscription = dateTimeForm.watch((value, { name }) => {
      if (name === "date" && value.date) {
        // Quando a data mudar, buscar slots otimizados somente se IA estiver ativada
        if (useAiOptimization && selectedService) {
          // Evitando chamadas desnecessárias
          console.log("Data alterada, buscando slots otimizados");
          fetchOptimizedTimeSlots(value.date, selectedService.serviceId.toString());
        }
      }
    });
    
    // Limpeza do observer quando o componente for desmontado
    return () => subscription.unsubscribe();
  }, [dateTimeForm]); // Removido dependências que podem causar re-renders
  
  // Efeito para buscar slots apenas quando o toggle de IA é ATIVADO (não em cada render)
  const aiToggleRef = useRef(useAiOptimization);
  useEffect(() => {
    // Só executa quando o valor do toggle realmente muda
    if (aiToggleRef.current !== useAiOptimization) {
      const currentDate = dateTimeForm.getValues("date");
      if (useAiOptimization && currentDate && selectedService) {
        console.log("Status de IA alterado, buscando slots otimizados");
        fetchOptimizedTimeSlots(currentDate, selectedService.serviceId.toString());
      }
      // Atualiza a referência
      aiToggleRef.current = useAiOptimization;
    }
  }, [useAiOptimization]);
  
  // Slots a serem exibidos na interface (prioridade: prestador > otimizados pela IA > básicos)
  const displayTimeSlots: DisplayTimeSlot[] = providerTimeSlots.length > 0
    ? providerTimeSlots
    : useAiOptimization && optimizedTimeSlots.length > 0
      ? optimizedTimeSlots.map(slot => ({
          value: slot.startTime,
          label: slot.startTime,
          adaptationScore: slot.adaptationScore,
          adaptationReason: slot.adaptationReason
        }))
      : basicTimeSlots;
  
  // Create client mutation
  const createClientMutation = useMutation({
    mutationFn: async (clientData: any) => {
      const res = await apiRequest("POST", "/api/register", clientData);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente criado",
        description: "Novo cliente registrado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar cliente",
        description: error.message || "Não foi possível criar o novo cliente.",
        variant: "destructive",
      });
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const res = await apiRequest("POST", "/api/appointments", appointmentData);
      return await res.json();
    },
    onSuccess: (data) => {
      // Invalidate appointments query to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/appointments"] });
      
      // Armazenar o agendamento criado e marcar como sucesso
      setCreatedAppointment(data);
      setBookingSuccess(true);
      
      toast({
        title: "Agendamento criado",
        description: "O agendamento manual foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao agendar",
        description: error.message || "Não foi possível criar o agendamento manual.",
        variant: "destructive",
      });
    },
  });
  
  // Filter clients based on search term
  const filteredClients = clients.filter(client => {
    if (!clientSearchTerm) return true;
    const term = clientSearchTerm.toLowerCase();
    return (
      client.name?.toLowerCase().includes(term) ||
      client.email?.toLowerCase().includes(term) ||
      client.phone?.toLowerCase().includes(term)
    );
  });
  
  // Handle form submissions for each step
  const onServiceSubmit = (data: z.infer<typeof serviceSchema>) => {
    setBookingData({ ...bookingData, providerServiceId: data.providerServiceId });
    
    // Definir a data padrão como hoje se ainda não estiver selecionada
    if (!bookingData.date) {
      dateTimeForm.setValue("date", format(new Date(), "yyyy-MM-dd"));
    }
    
    setCurrentStep(2);
  };
  
  const onDateTimeSubmit = (data: z.infer<typeof dateTimeSchema>) => {
    // Log para depuração
    console.log("Dados de data/hora selecionados:", data);
    
    // Verificar se a data foi selecionada
    if (!data.date) {
      toast({
        title: "Data não selecionada",
        description: "Selecione uma data para o agendamento",
        variant: "destructive"
      });
      return;
    }
    
    // Verificar se o horário foi selecionado
    if (!data.time) {
      toast({
        title: "Horário não selecionado",
        description: "Selecione um horário para o agendamento",
        variant: "destructive"
      });
      return;
    }
    
    // Atualizar os dados do agendamento
    setBookingData({ 
      ...bookingData, 
      date: data.date, 
      time: data.time,
      forceBooking: data.forceBooking
    });
    
    // Mostrar toast de confirmação
    toast({
      title: "Data e hora selecionadas",
      description: `${format(parseISO(data.date), "dd/MM/yyyy", { locale: ptBR })} às ${data.time}`,
    });
    
    setCurrentStep(3);
  };
  
  const onClientSubmit = (data: z.infer<typeof clientSchema>) => {
    console.log("Cliente selecionado:", data);
    
    // Atualizar os dados do agendamento com as informações do cliente
    setBookingData({ 
      ...bookingData, 
      clientType: data.clientType,
      clientId: data.clientId,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone
    });
    
    // Definir o cliente selecionado
    if (data.clientType === "existing" && data.clientId) {
      const client = clients.find(c => c.id.toString() === data.clientId);
      setSelectedClient(client || null);
    } else {
      setSelectedClient({
        name: data.clientName,
        email: data.clientEmail,
        phone: data.clientPhone
      });
    }
    
    // Avançar para a próxima etapa
    setCurrentStep(4);
    
    // Para debug
    toast({
      title: "Cliente selecionado",
      description: data.clientType === "existing" 
        ? `Cliente existente ID: ${data.clientId}` 
        : `Novo cliente: ${data.clientName}`,
    });
  };
  
  const onConfirmationSubmit = async (data: z.infer<typeof confirmationSchema>) => {
    const completeBookingData = {
      ...bookingData,
      notes: data.notes,
      sendNotification: data.sendNotification
    };
    
    try {
      let clientId: number;
      
      // Se for cliente existente, usar o ID selecionado
      if (completeBookingData.clientType === "existing" && completeBookingData.clientId) {
        clientId = parseInt(completeBookingData.clientId);
      }
      // Se for novo cliente, criar um novo registro
      else if (completeBookingData.clientType === "new" && 
               completeBookingData.clientName && 
               completeBookingData.clientEmail) {
        try {
          // Dados para criar um novo cliente
          const newClientData = {
            name: completeBookingData.clientName,
            email: completeBookingData.clientEmail,
            phone: completeBookingData.clientPhone || "",
            password: Math.random().toString(36).substring(2, 10), // Senha temporária aleatória
            userType: "client",
          };
          
          // Tenta criar o novo cliente
          const response = await createClientMutation.mutateAsync(newClientData);
          clientId = response.id;
          
          // Atualiza a lista de clientes
          queryClient.invalidateQueries({ queryKey: ["/api/clients"] });
        } catch (error) {
          // Em caso de erro (como email já existe), exibir erro e não prosseguir
          console.error("Erro ao criar cliente:", error);
          toast({
            title: "Erro ao criar cliente",
            description: "Não foi possível criar o novo cliente. O email pode já estar em uso.",
            variant: "destructive",
          });
          return; // Interrompe a execução
        }
      }
      // Situação inesperada - sem cliente válido
      else {
        toast({
          title: "Erro ao agendar",
          description: "Informações de cliente incompletas.",
          variant: "destructive",
        });
        return; // Interrompe a execução
      }
      
      // Log para depuração
      console.log("Dados completos para agendamento:", completeBookingData);
      
      // Verifica se a data está presente
      if (!completeBookingData.date) {
        toast({
          title: "Erro no agendamento",
          description: "A data do agendamento não foi selecionada. Volte para a etapa 2.",
          variant: "destructive",
        });
        // Volta para a etapa de seleção de data/hora
        setCurrentStep(2);
        return;
      }
      
      // Prepara dados para a API de agendamentos
      // Obtém o providerServiceId correto do serviço selecionado
      const selectedProviderService = providerServices.find((ps: any) => 
        ps.id.toString() === completeBookingData.providerServiceId
      );
      
      if (!selectedProviderService) {
        toast({
          title: "Erro no agendamento",
          description: "Serviço não encontrado. Por favor, selecione um serviço válido.",
          variant: "destructive",
        });
        setCurrentStep(1);
        return;
      }
      
      const appointmentData = {
        providerId: user?.id,
        serviceId: selectedProviderService.serviceId, // ID do serviço base
        providerServiceId: parseInt(completeBookingData.providerServiceId), // ID do serviço do prestador
        date: completeBookingData.date,
        startTime: completeBookingData.time,
        endTime: calculateEndTime(completeBookingData.time!, selectedService?.duration || 30),
        status: "confirmed",
        notes: completeBookingData.notes,
        isManuallyCreated: true,
        clientId: clientId,
        // Para garantir que a duração seja correta
        duration: selectedService?.duration || 30,
        // Dados adicionais para notificação
        sendNotification: completeBookingData.sendNotification,
        clientName: completeBookingData.clientType === "new" ? completeBookingData.clientName : undefined,
        clientEmail: completeBookingData.clientType === "new" ? completeBookingData.clientEmail : undefined,
        clientPhone: completeBookingData.clientType === "new" ? completeBookingData.clientPhone : undefined,
      };
      
      // Log para depuração
      console.log("Dados enviados para API:", appointmentData);
      
      // Submete o agendamento
      createAppointmentMutation.mutate(appointmentData);
    } catch (error) {
      console.error("Erro no processo de agendamento:", error);
      toast({
        title: "Erro ao agendar",
        description: "Ocorreu um erro inesperado ao processar o agendamento.",
        variant: "destructive",
      });
    }
  };
  
  // Calculate end time based on start time and duration
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startMinutes = hours * 60 + minutes;
    const endMinutes = startMinutes + durationMinutes;
    const endHours = Math.floor(endMinutes / 60);
    const endMinutesRemainder = endMinutes % 60;
    return `${endHours.toString().padStart(2, '0')}:${endMinutesRemainder.toString().padStart(2, '0')}`;
  };
  
  // Handle going back to the previous step
  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    } else {
      setLocation("/provider/dashboard");
    }
  };
  
  // Função para voltar ao dashboard
  const handleReturnToDashboard = () => {
    setLocation("/provider/dashboard");
  };
  
  // Função para iniciar novo agendamento
  const handleNewBooking = () => {
    // Resetar todos os estados
    setBookingSuccess(false);
    setCreatedAppointment(null);
    setCurrentStep(1);
    setBookingData({
      providerServiceId: "",
      date: "",
      time: "",
      forceBooking: false,
      clientType: "existing",
      clientId: "",
      clientName: "",
      clientEmail: "",
      clientPhone: "",
      notes: "",
      sendNotification: true,
    });
    
    // Resetar todos os formulários
    serviceForm.reset({ providerServiceId: "" });
    dateTimeForm.reset({ date: "", time: "", forceBooking: false });
    clientForm.reset({ 
      clientType: "existing", 
      clientId: "", 
      clientName: "", 
      clientEmail: "", 
      clientPhone: "" 
    });
    confirmationForm.reset({ notes: "", sendNotification: true });
  };

  return (
    <ProviderLayout title="Novo Agendamento" showBackButton>
      <PageTransition>
        <div className="w-full max-w-md mx-auto bg-white min-h-screen px-4 py-6">
          {bookingSuccess && createdAppointment ? (
            <div className="text-center py-8 px-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-center mb-2 text-neutral-900">Agendamento Confirmado!</h2>
              <p className="text-neutral-600 text-center mb-8">
                O agendamento foi criado com sucesso e o cliente foi notificado.
              </p>
              
              <Card className="w-full mb-8 bg-white border border-neutral-200 rounded-xl shadow-sm">
                <CardContent className="pt-6 p-6">
                  <div className="space-y-4">
                    {/* Detalhes do serviço */}
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-[#58c9d1]/10 rounded-lg mr-3 flex items-center justify-center">
                        <ScissorsIcon className="h-5 w-5 text-[#58c9d1]" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">{selectedService?.name}</p>
                        <p className="text-sm text-neutral-600">
                          {selectedService?.duration} min • {formatCurrency((selectedService?.price || 0) / 100)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Detalhes da data/hora */}
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-[#58c9d1]/10 rounded-lg mr-3 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-[#58c9d1]" />
                      </div>
                      <div>
                        <p className="font-medium text-neutral-900">
                          {bookingData.date && format(parseISO(bookingData.date), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-neutral-600">
                          {bookingData.time && `${bookingData.time} - ${calculateEndTime(bookingData.time, selectedService?.duration || 30)}`}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex flex-col w-full space-y-3">
                <Button 
                  onClick={handleNewBooking}
                  className="w-full bg-[#58c9d1] text-white hover:bg-[#58c9d1]/90"
                >
                  Novo Agendamento
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={handleReturnToDashboard}
                  className="w-full border-neutral-200 text-neutral-700 hover:bg-neutral-50"
                >
                  Voltar ao Dashboard
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stepper */}
              <div className="py-3 border-b border-neutral-200 bg-white">
                <div className="flex items-center justify-between px-2">
                  {steps.map((step) => (
                    <div key={step.id} className="flex flex-col items-center">
                      <div 
                        className={`w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                          step.id === currentStep 
                            ? "bg-[#58c9d1] text-white" 
                            : step.id < currentStep 
                              ? "bg-[#58c9d1]/20 text-[#58c9d1]" 
                              : "bg-neutral-200 text-neutral-500"
                        }`}
                      >
                        {step.id < currentStep ? (
                          <CheckCircle className="h-4 w-4" />
                        ) : (
                          step.id
                        )}
                      </div>
                      <span className={`text-xs mt-1 px-1 text-center ${
                        step.id === currentStep 
                          ? "text-[#58c9d1]" 
                          : step.id < currentStep 
                            ? "text-[#58c9d1]" 
                            : "text-neutral-500"
                      }`}>
                        {step.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
          
              {/* Step Content */}
              <div className="px-3 py-4 bg-white">
                {/* Step 1: Service Selection */}
                {currentStep === 1 && (
                  <Form {...serviceForm}>
                    <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} className="space-y-3">
                      <h2 className="text-lg font-semibold mb-3 text-neutral-900">Selecione o serviço</h2>
                      
                      <FormField
                        control={serviceForm.control}
                        name="providerServiceId"
                        render={({ field }) => (
                          <FormItem>
                            <div className="space-y-3">
                              <RadioGroup 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                className="flex flex-col space-y-1"
                              >
                                {isServicesLoading ? (
                                  <div className="text-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#58c9d1] mx-auto"></div>
                                    <p className="text-neutral-600 mt-2">Carregando serviços...</p>
                                  </div>
                                ) : services.length > 0 ? (
                                  services.map((service) => (
                                    <Label
                                      key={service.id}
                                      htmlFor={`service-${service.id}`}
                                      className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all ${
                                        field.value === service.id.toString()
                                          ? "bg-[#58c9d1]/5 border-[#58c9d1] shadow-sm"
                                          : "border-neutral-200 hover:border-neutral-300"
                                      }`}
                                    >
                                      <div className="flex items-center">
                                        <div className="w-8 h-8 bg-[#58c9d1]/10 rounded-lg mr-3 flex items-center justify-center">
                                          <ScissorsIcon className="h-4 w-4 text-[#58c9d1]" />
                                        </div>
                                        <div>
                                          <p className="font-medium text-neutral-900">{service.name}</p>
                                                                                  <p className="text-sm text-neutral-600">
                                          {service.duration} min • {formatCurrency((service.price || 0) / 100)}
                                        </p>
                                        </div>
                                      </div>
                                      <RadioGroupItem 
                                        value={service.id.toString()} 
                                        id={`service-${service.id}`} 
                                      />
                                    </Label>
                                  ))
                                ) : (
                                  <div className="text-center py-8">
                                    <AlertCircle className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                                    <p className="text-neutral-600">Nenhum serviço encontrado.</p>
                                    <p className="text-sm text-neutral-500 mt-1">Adicione serviços no seu perfil.</p>
                                  </div>
                                )}
                              </RadioGroup>
                            </div>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full mt-4 bg-[#58c9d1] text-white hover:bg-[#58c9d1]/90"
                        disabled={isServicesLoading || services.length === 0}
                      >
                        Continuar
                      </Button>
                    </form>
                  </Form>
                )}
                
                {/* Step 2: Date/Time Selection */}
                {currentStep === 2 && selectedService && (
                  <Form {...dateTimeForm}>
                    <form onSubmit={dateTimeForm.handleSubmit(onDateTimeSubmit)} className="space-y-3">
                      <div className="flex items-center mb-3">
                        <Calendar className="h-5 w-5 mr-2 text-primary" />
                        <h2 className="font-medium">Selecione data e horário</h2>
                      </div>
                      
                      <FormField
                        control={dateTimeForm.control}
                        name="date"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Data</FormLabel>
                            <RadioGroup 
                              onValueChange={field.onChange} 
                              defaultValue={field.value}
                              className="grid grid-cols-2 gap-2"
                            >
                              {availableDates.map((date) => (
                                <Label
                                  key={date.value}
                                  htmlFor={`date-${date.value}`}
                                  className={`flex flex-col items-center p-3 rounded-lg border cursor-pointer transition-all ${
                                    field.value === date.value
                                      ? "bg-[#58c9d1]/5 border-[#58c9d1]"
                                      : "border-neutral-200 hover:border-neutral-300"
                                  }`}
                                >
                                  <span className="text-sm font-medium text-neutral-900">{date.label}</span>
                                  <span className="text-xs text-neutral-600">{date.day}</span>
                                  <RadioGroupItem 
                                    value={date.value} 
                                    id={`date-${date.value}`} 
                                  />
                                </Label>
                              ))}
                            </RadioGroup>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={dateTimeForm.control}
                        name="time"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Horário</FormLabel>
                            {isLoadingTimeSlots ? (
                              <div className="text-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#58c9d1] mx-auto"></div>
                                <p className="text-neutral-600 mt-2">Carregando horários do prestador...</p>
                              </div>
                            ) : displayTimeSlots.length > 0 ? (
                              <RadioGroup 
                                onValueChange={field.onChange} 
                                defaultValue={field.value}
                                className="grid grid-cols-3 gap-2"
                              >
                                {displayTimeSlots.map((slot, index) => (
                                  <Label
                                    key={`${slot.value}-${index}`}
                                    htmlFor={`time-${slot.value}-${index}`}
                                    className={`flex flex-col items-center p-2 rounded-lg border cursor-pointer transition-all ${
                                      field.value === slot.value
                                        ? "bg-[#58c9d1]/5 border-[#58c9d1]"
                                        : "border-neutral-200 hover:border-neutral-300"
                                    }`}
                                  >
                                    <span className="text-sm font-medium text-neutral-900">{slot.label}</span>
                                    {slot.adaptationScore && (
                                      <span className="text-xs text-neutral-600">
                                        {slot.adaptationReason}
                                      </span>
                                    )}
                                    <RadioGroupItem 
                                      value={slot.value} 
                                      id={`time-${slot.value}-${index}`} 
                                    />
                                  </Label>
                                ))}
                              </RadioGroup>
                            ) : (
                              <div className="text-center py-8">
                                <Clock className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                                <p className="text-neutral-600">Nenhum horário disponível.</p>
                                <p className="text-sm text-neutral-500 mt-1">Configure sua agenda primeiro.</p>
                              </div>
                            )}
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={dateTimeForm.control}
                        name="forceBooking"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                            <div className="space-y-0.5">
                              <FormLabel className="text-sm">Agendamento forçado</FormLabel>
                              <FormDescription className="text-xs text-neutral-600">
                                Ignora conflitos de horário
                              </FormDescription>
                            </div>
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={handleBack}
                          className="flex-1"
                        >
                          Voltar
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1 bg-[#58c9d1] text-white hover:bg-[#58c9d1]/90"
                        >
                          Continuar
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
                
                {/* Step 3: Client Selection */}
                {currentStep === 3 && (
                  <Form {...clientForm}>
                    <form onSubmit={clientForm.handleSubmit(onClientSubmit)} className="space-y-3">
                                              <div className="flex items-center mb-3">
                          <UserRound className="h-5 w-5 mr-2 text-primary" />
                          <h2 className="font-medium">Informações do cliente</h2>
                        </div>
                      
                      <Tabs defaultValue="existing" className="w-full">
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="existing">Cliente existente</TabsTrigger>
                          <TabsTrigger value="new">Novo cliente</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="existing" className="space-y-4">
                          {/* Campo de busca por CPF ou telefone */}
                          <div className="space-y-3">
                            <div>
                              <Label htmlFor="clientSearch" className="text-sm font-medium text-neutral-700">
                                Buscar cliente por CPF ou telefone
                              </Label>
                              <div className="relative">
                                <Input
                                  id="clientSearch"
                                  type="text"
                                  placeholder="Digite CPF ou telefone (mínimo 8 dígitos)"
                                  value={clientSearchTerm}
                                  onChange={(e) => setClientSearchTerm(e.target.value)}
                                  className="pr-10"
                                />
                                {isSearchingClients && (
                                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#58c9d1]"></div>
                                  </div>
                                )}
                              </div>
                              {clientSearchError && (
                                <p className="text-sm text-red-600 mt-1">{clientSearchError}</p>
                              )}
                            </div>

                          </div>

                          <div className="border-t pt-4">
                            <FormField
                              control={clientForm.control}
                              name="clientId"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Ou selecione da lista completa</FormLabel>
                                  <RadioGroup 
                                    onValueChange={field.onChange} 
                                    value={field.value}
                                    className="space-y-1"
                                  >
                                    {/* Clientes encontrados na busca */}
                                    {searchedClients.length > 0 && (
                                      <>
                                        <div className="mb-3">
                                          <Label className="text-sm font-medium text-neutral-700">
                                            Clientes encontrados
                                          </Label>
                                        </div>
                                        {searchedClients.map((client) => (
                                          <Label
                                            key={`searched-${client.id}`}
                                            htmlFor={`searched-client-${client.id}`}
                                            className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all cursor-pointer ${
                                              field.value === client.id.toString()
                                                ? "bg-[#58c9d1]/5 border-[#58c9d1] shadow-sm"
                                                : "border-neutral-200 hover:border-neutral-300"
                                            }`}
                                          >
                                            <div className="flex items-center">
                                              <div className="w-8 h-8 bg-[#58c9d1]/10 rounded-lg mr-3 flex items-center justify-center">
                                                <UserRound className="h-4 w-4 text-[#58c9d1]" />
                                              </div>
                                              <div>
                                                <p className="font-medium text-neutral-900">{client.name}</p>
                                                <p className="text-sm text-neutral-600">{client.email}</p>
                                                {client.cpf && (
                                                  <p className="text-xs text-neutral-500">CPF: {client.cpf}</p>
                                                )}
                                              </div>
                                            </div>
                                            <RadioGroupItem 
                                              value={client.id.toString()} 
                                              id={`searched-client-${client.id}`} 
                                            />
                                          </Label>
                                        ))}
                                        {clients.length > 0 && (
                                          <div className="mt-3 mb-3">
                                            <Label className="text-sm font-medium text-neutral-700">
                                              Todos os clientes
                                            </Label>
                                          </div>
                                        )}
                                      </>
                                    )}

                                    {/* Lista completa de clientes */}
                                    {isClientsLoading ? (
                                      <div className="text-center py-8">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#58c9d1] mx-auto"></div>
                                        <p className="text-neutral-600 mt-2">Carregando clientes...</p>
                                      </div>
                                    ) : clients.length > 0 ? (
                                      clients.map((client) => (
                                        <Label
                                          key={client.id}
                                          htmlFor={`client-${client.id}`}
                                          className={`w-full flex items-center justify-between p-2 rounded-lg border transition-all ${
                                            field.value === client.id.toString()
                                              ? "bg-[#58c9d1]/5 border-[#58c9d1] shadow-sm"
                                              : "border-neutral-200 hover:border-neutral-300"
                                          }`}
                                        >
                                          <div className="flex items-center">
                                            <div className="w-8 h-8 bg-[#58c9d1]/10 rounded-lg mr-3 flex items-center justify-center">
                                              <UserRound className="h-4 w-4 text-[#58c9d1]" />
                                            </div>
                                            <div>
                                              <p className="font-medium text-neutral-900">{client.name}</p>
                                              <p className="text-sm text-neutral-600">{client.email}</p>
                                            </div>
                                          </div>
                                          <RadioGroupItem 
                                            value={client.id.toString()} 
                                            id={`client-${client.id}`} 
                                          />
                                        </Label>
                                      ))
                                    ) : (
                                      <div className="text-center py-8">
                                        <UserRound className="h-12 w-12 text-neutral-400 mx-auto mb-3" />
                                        <p className="text-neutral-600">Nenhum cliente encontrado.</p>
                                        <p className="text-sm text-neutral-500 mt-1">Adicione clientes primeiro.</p>
                                      </div>
                                    )}
                                  </RadioGroup>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </TabsContent>
                        
                        <TabsContent value="new" className="space-y-4">
                          <FormField
                            control={clientForm.control}
                            name="clientName"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Nome completo</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Digite o nome completo" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={clientForm.control}
                            name="clientEmail"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Email</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    type="email"
                                    placeholder="Digite o email" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={clientForm.control}
                            name="clientPhone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Telefone (opcional)</FormLabel>
                                <FormControl>
                                  <Input 
                                    {...field} 
                                    placeholder="Digite o telefone" 
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </TabsContent>
                      </Tabs>
                      
                      <div className="flex space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={handleBack}
                          className="flex-1"
                        >
                          Voltar
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1 bg-[#58c9d1] text-white hover:bg-[#58c9d1]/90"
                        >
                          Continuar
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
                
                {/* Step 4: Confirmation */}
                {currentStep === 4 && (
                  <Form {...confirmationForm}>
                    <form onSubmit={confirmationForm.handleSubmit(onConfirmationSubmit)} className="space-y-3">
                                              <div className="flex items-center mb-3">
                          <CheckCircle className="h-5 w-5 mr-2 text-primary" />
                          <h2 className="font-medium">Confirmar agendamento</h2>
                        </div>
                      
                      <Card className="bg-white border border-neutral-200 rounded-xl shadow-sm">
                        <CardContent className="p-6">
                          <div className="space-y-4">
                            {/* Service details */}
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-[#58c9d1]/10 rounded-lg mr-3 flex items-center justify-center">
                                <ScissorsIcon className="h-5 w-5 text-[#58c9d1]" />
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900">{selectedService?.name}</p>
                                                                  <p className="text-sm text-neutral-600">
                                    {selectedService?.duration} min • {formatCurrency((selectedService?.price || 0) / 100)}
                                  </p>
                              </div>
                            </div>
                            
                            {/* Date/Time details */}
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-[#58c9d1]/10 rounded-lg mr-3 flex items-center justify-center">
                                <Calendar className="h-5 w-5 text-[#58c9d1]" />
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900">
                                  {bookingData.date && format(parseISO(bookingData.date), "dd 'de' MMMM", { locale: ptBR })}
                                </p>
                                <p className="text-sm text-neutral-600">
                                  {bookingData.time && `${bookingData.time} - ${calculateEndTime(bookingData.time, selectedService?.duration || 30)}`}
                                </p>
                              </div>
                            </div>
                            
                            {/* Client details */}
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-[#58c9d1]/10 rounded-lg mr-3 flex items-center justify-center">
                                <UserRound className="h-5 w-5 text-[#58c9d1]" />
                              </div>
                              <div>
                                <p className="font-medium text-neutral-900">{selectedClient?.name || bookingData.clientName}</p>
                                <p className="text-sm text-neutral-600">{selectedClient?.email || bookingData.clientEmail}</p>
                              </div>
                            </div>
                            
                            {/* Force booking warning */}
                            {bookingData.forceBooking && (
                              <Alert className="bg-yellow-50 border-yellow-200">
                                <AlertCircle className="h-4 w-4 text-yellow-600" />
                                <AlertTitle className="text-yellow-600">Atenção: Agendamento forçado</AlertTitle>
                                <AlertDescription className="text-yellow-600">
                                  Este agendamento ignorará conflitos de horários.
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                      
                      {/* Additional notes */}
                      <FormField
                        control={confirmationForm.control}
                        name="notes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Observações (opcional)</FormLabel>
                            <FormControl>
                              <Textarea 
                                {...field} 
                                placeholder="Adicione observações sobre este agendamento" 
                                value={field.value || ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      {/* Send notification option */}
                      <FormField
                        control={confirmationForm.control}
                        name="sendNotification"
                        render={({ field }) => (
                          <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                            <FormControl>
                              <input
                                type="checkbox"
                                checked={field.value}
                                onChange={field.onChange}
                                className="sr-only"
                                id="send-notification"
                              />
                            </FormControl>
                            <div className={`w-10 h-5 rounded-full relative ${field.value ? "bg-primary" : "bg-neutral-200"}`}>
                              <div 
                                className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${field.value ? "left-[calc(100%-20px)]" : "left-0.5"}`}
                                onClick={() => field.onChange(!field.value)}
                              />
                            </div>
                            <FormLabel
                              htmlFor="send-notification"
                              className="text-sm cursor-pointer"
                              onClick={() => field.onChange(!field.value)}
                            >
                              Enviar notificação ao cliente
                            </FormLabel>
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex space-x-2 pt-4">
                        <Button 
                          type="button" 
                          variant="outline"
                          onClick={handleBack}
                        >
                          Voltar
                        </Button>
                        <Button 
                          type="submit" 
                          className="flex-1"
                          disabled={createAppointmentMutation.isPending}
                        >
                          {createAppointmentMutation.isPending ? (
                            <>
                              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-background border-t-transparent" />
                              Agendando...
                            </>
                          ) : (
                            "Confirmar agendamento"
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>
                )}
              </div>
            </div>
          )}
        </div>
      </PageTransition>
      <Navbar />
    </ProviderLayout>
  );
}