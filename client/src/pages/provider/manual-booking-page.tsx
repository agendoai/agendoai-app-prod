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
  
  // Client search state
  const [clientSearchTerm, setClientSearchTerm] = useState("");
  
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
      price: service.defaultPrice || 0,
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
    };
  });
  
  // Fetch clients for the "existing client" selection
  const { data: clients = [] } = useQuery<User[]>({
    queryKey: ["/api/clients"],
    enabled: !!user,
  });
  
  // Estado para armazenar slots de tempo otimizados pela IA
  const [optimizedTimeSlots, setOptimizedTimeSlots] = useState<SmartTimeSlot[]>([]);
  
  // Estado para controlar o carregamento durante a análise de IA
  const [isOptimizingSlots, setIsOptimizingSlots] = useState(false);

  // Gera slots de tempo básicos (sem IA)
  const basicTimeSlots: DisplayTimeSlot[] = generateTimeSlots("09:00", "18:00", 30).map(time => ({
    value: time,
    label: time
  }));
  
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
  
  // Efeito para buscar slots otimizados quando a data muda
  useEffect(() => {
    // Configurar observador uma única vez
    const subscription = dateTimeForm.watch((value, { name }) => {
      if (name === "date" && value.date) {
        // Quando a data mudar, buscar slots otimizados somente se IA estiver ativada
        if (useAiOptimization && bookingData.serviceId) {
          // Evitando chamadas desnecessárias
          console.log("Data alterada, buscando slots otimizados");
          fetchOptimizedTimeSlots(value.date, bookingData.serviceId);
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
      if (useAiOptimization && currentDate && bookingData.serviceId) {
        console.log("Status de IA alterado, buscando slots otimizados");
        fetchOptimizedTimeSlots(currentDate, bookingData.serviceId);
      }
      // Atualiza a referência
      aiToggleRef.current = useAiOptimization;
    }
  }, [useAiOptimization]);
  
  // Slots a serem exibidos na interface (otimizados pela IA ou básicos)
  const displayTimeSlots: DisplayTimeSlot[] = useAiOptimization && optimizedTimeSlots.length > 0
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

  // Removendo versão duplicada da função (já existe abaixo)
  
  return (
    <PageTransition>
      <ProviderLayout title="Agendamento Manual" showBackButton={true}>
      
      {/* Tela de sucesso */}
      {bookingSuccess && createdAppointment ? (
        <div className="p-4 flex flex-col items-center">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mt-8 mb-6">
            <CheckCircle className="h-12 w-12 text-green-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-center mb-2">Agendamento Confirmado!</h2>
          <p className="text-neutral-500 text-center mb-8">
            O agendamento foi criado com sucesso e o cliente foi notificado.
          </p>
          
          <Card className="w-full mb-8">
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Detalhes do serviço */}
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg mr-3 flex items-center justify-center">
                    <ScissorsIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{selectedService?.name}</p>
                    <p className="text-sm text-neutral-500">
                      {selectedService?.duration} min • {formatCurrency(selectedService?.price || 0)}
                    </p>
                  </div>
                </div>
                
                {/* Detalhes da data/hora */}
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg mr-3 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {bookingData.date && format(parseISO(bookingData.date), "dd 'de' MMMM", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-neutral-500">
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
              className="w-full"
            >
              Novo Agendamento
            </Button>
            
            <Button 
              variant="outline"
              onClick={handleReturnToDashboard}
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Stepper */}
          <div className="px-4 py-3 border-b">
            <div className="flex items-center justify-between">
              {steps.map((step) => (
                <div key={step.id} className="flex flex-col items-center">
                  <div 
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      step.id === currentStep 
                        ? "bg-primary text-white" 
                        : step.id < currentStep 
                          ? "bg-primary/20 text-primary" 
                          : "bg-neutral-200 text-neutral-500"
                    }`}
                  >
                    {step.id < currentStep ? (
                      <CheckCircle className="h-5 w-5" />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span className={`text-xs mt-1 ${
                    step.id === currentStep 
                      ? "text-primary" 
                      : "text-neutral-500"
                  }`}>
                    {step.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
      
      {/* Step Content */}
      <div className="p-4">
        {/* Step 1: Service Selection */}
        {currentStep === 1 && (
          <Form {...serviceForm}>
            <form onSubmit={serviceForm.handleSubmit(onServiceSubmit)} className="space-y-4">
              <h2 className="font-medium mb-4">Selecione o serviço</h2>
              
              <FormField
                control={serviceForm.control}
                name="providerServiceId"
                render={({ field }) => (
                  <FormItem>
                    <div className="space-y-2">
                      <RadioGroup 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        className="flex flex-col space-y-2"
                      >
                        {isServicesLoading ? (
                          <p>Carregando serviços...</p>
                        ) : services.length > 0 ? (
                          services.map((service) => (
                            <Label
                              key={service.id}
                              htmlFor={`service-${service.id}`}
                              className={`w-full flex items-center justify-between p-4 rounded-lg border ${
                                field.value === service.id.toString()
                                  ? "bg-primary/5 border-primary"
                                  : "border-neutral-200"
                              }`}
                            >
                              <div className="flex items-center">
                                <div className="w-12 h-12 bg-primary/10 rounded-lg mr-3 flex items-center justify-center">
                                  <ScissorsIcon className="h-6 w-6 text-primary" />
                                </div>
                                <div>
                                  <p className="font-medium">{service.name}</p>
                                  <p className="text-sm text-neutral-500">
                                    {service.duration} min • {formatCurrency(service.price || 0)}
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
                          <p>Nenhum serviço encontrado. Adicione serviços no seu perfil.</p>
                        )}
                      </RadioGroup>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <Button 
                type="submit" 
                className="w-full mt-4"
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
            <form onSubmit={dateTimeForm.handleSubmit(onDateTimeSubmit)} className="space-y-4">
              <div className="flex items-center mb-4">
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
                      className="flex overflow-x-auto space-x-2 pb-2"
                    >
                      {availableDates.map((date) => (
                        <Label
                          key={date.value}
                          htmlFor={`date-${date.value}`}
                          className={`flex flex-col items-center p-2 min-w-[80px] rounded-lg border ${
                            field.value === date.value
                              ? "bg-primary/5 border-primary"
                              : "border-neutral-200"
                          }`}
                        >
                          <RadioGroupItem 
                            value={date.value} 
                            id={`date-${date.value}`} 
                            className="sr-only"
                          />
                          <span className="text-sm">{date.label}</span>
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
                    <div className="space-y-4">
                      {/* Opção de IA */}
                      <div className="flex flex-row items-center space-x-2 space-y-0 bg-primary/5 p-3 rounded-lg">
                        <input
                          type="checkbox"
                          checked={useAiOptimization}
                          onChange={(e) => setUseAiOptimization(e.target.checked)}
                          className="sr-only"
                          id="use-ai-optimization"
                        />
                        <div className={`w-10 h-5 rounded-full relative ${useAiOptimization ? "bg-primary" : "bg-neutral-200"}`}>
                          <div 
                            className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${useAiOptimization ? "left-[calc(100%-20px)]" : "left-0.5"}`}
                          />
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center">
                            <Label 
                              htmlFor="use-ai-optimization" 
                              className="text-sm font-medium cursor-pointer"
                              onClick={() => setUseAiOptimization(!useAiOptimization)}
                            >
                              Otimizar horários com IA
                            </Label>
                            <BrainCircuit className="ml-1 h-4 w-4 text-primary" />
                          </div>
                          <span className="text-xs text-muted-foreground">
                            Recomenda horários ideais baseados no serviço e histórico
                          </span>
                        </div>
                      </div>
                      
                      {/* Indicador de loading da IA */}
                      {isOptimizingSlots && (
                        <div className="flex items-center justify-center p-4">
                          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
                          <span className="ml-3 text-sm">Analisando agenda com IA...</span>
                        </div>
                      )}
                      
                      <RadioGroup 
                        onValueChange={field.onChange} 
                        defaultValue={field.value}
                        className="grid grid-cols-3 gap-2"
                      >
                        {displayTimeSlots.map((slot, idx) => {
                          const hasScore = slot.adaptationScore !== undefined;
                          const score = slot.adaptationScore || 0;
                          const reason = slot.adaptationReason || '';
                          
                          return (
                            <div key={idx}>
                              {hasScore && reason ? (
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Label
                                        htmlFor={`time-${idx}`}
                                        className={`relative flex justify-center p-2 rounded-lg border ${
                                          field.value === slot.value
                                            ? "bg-primary/5 border-primary"
                                            : hasScore && score > 75
                                              ? "bg-green-50 border-green-200"
                                              : hasScore && score > 50
                                                ? "bg-blue-50 border-blue-200"
                                                : "border-neutral-200"
                                        }`}
                                      >
                                        <RadioGroupItem 
                                          value={slot.value} 
                                          id={`time-${idx}`} 
                                          className="sr-only"
                                        />
                                        <span className="text-sm">{slot.label}</span>
                                        {hasScore && score > 60 && (
                                          <Sparkles className="absolute top-0 right-0 h-3 w-3 -mt-1 -mr-1 text-primary" />
                                        )}
                                      </Label>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="max-w-xs">
                                      <div className="space-y-1">
                                        <p className="text-sm font-medium">Recomendação da IA</p>
                                        <p className="text-xs text-muted-foreground">{reason}</p>
                                        <div className="flex items-center space-x-1 pt-1">
                                          <div className="h-1.5 flex-1 rounded-full bg-neutral-100 overflow-hidden">
                                            <div
                                              className={`h-full ${
                                                score > 75
                                                  ? "bg-green-500"
                                                  : score > 50
                                                  ? "bg-blue-500"
                                                  : score > 30
                                                  ? "bg-yellow-500"
                                                  : "bg-neutral-500"
                                              }`}
                                              style={{ width: `${score}%` }}
                                            />
                                          </div>
                                          <span className="text-xs font-medium">{Math.round(score)}%</span>
                                        </div>
                                      </div>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ) : (
                                <Label
                                  htmlFor={`time-${idx}`}
                                  className={`relative flex justify-center p-2 rounded-lg border ${
                                    field.value === slot.value
                                      ? "bg-primary/5 border-primary"
                                      : "border-neutral-200"
                                  }`}
                                >
                                  <RadioGroupItem 
                                    value={slot.value} 
                                    id={`time-${idx}`} 
                                    className="sr-only"
                                  />
                                  <span className="text-sm">{slot.label}</span>
                                </Label>
                              )}
                            </div>
                          );
                        })}
                      </RadioGroup>
                    </div>
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
                      <input
                        type="checkbox"
                        checked={field.value}
                        onChange={field.onChange}
                        className="sr-only"
                        id="force-booking"
                      />
                    </FormControl>
                    <div className={`w-10 h-5 rounded-full relative ${field.value ? "bg-primary" : "bg-neutral-200"}`}>
                      <div 
                        className={`absolute w-4 h-4 rounded-full bg-white top-0.5 transition-all ${field.value ? "left-[calc(100%-20px)]" : "left-0.5"}`}
                        onClick={() => field.onChange(!field.value)}
                      />
                    </div>
                    <FormLabel
                      htmlFor="force-booking"
                      className="text-sm cursor-pointer"
                      onClick={() => field.onChange(!field.value)}
                    >
                      Forçar agendamento (ignorar conflitos)
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
            <form onSubmit={(e) => {
                e.preventDefault();
                console.log("Formulário enviado. Erros:", clientForm.formState.errors);
                clientForm.handleSubmit(onClientSubmit)(e);
              }} className="space-y-4">
              <div className="flex items-center mb-4">
                <UserRound className="h-5 w-5 mr-2 text-primary" />
                <h2 className="font-medium">Selecione o cliente</h2>
              </div>
              
              <FormField
                control={clientForm.control}
                name="clientType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de cliente</FormLabel>
                    <Tabs
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        
                        // Limpar campos quando alterna entre tabs
                        if (value === "existing") {
                          // Limpar campos de novo cliente
                          clientForm.setValue("clientName", "");
                          clientForm.setValue("clientEmail", "");
                          clientForm.setValue("clientPhone", "");
                          
                          // Limpar erros de novo cliente
                          clientForm.clearErrors("clientName");
                          clientForm.clearErrors("clientEmail");
                          clientForm.clearErrors("clientPhone");
                        } else {
                          // Limpar cliente selecionado e seu erro
                          clientForm.setValue("clientId", "");
                          clientForm.clearErrors("clientId");
                        }
                      }}
                      className="w-full"
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="existing">Cliente cadastrado</TabsTrigger>
                        <TabsTrigger value="new">Novo cliente</TabsTrigger>
                      </TabsList>
                      
                      <TabsContent value="existing" className="pt-4">
                        {/* Existing client selection */}
                        <div className="mb-4">
                          <div className="relative">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-neutral-500" />
                            <Input
                              placeholder="Buscar cliente por nome, email ou telefone"
                              value={clientSearchTerm}
                              onChange={(e) => setClientSearchTerm(e.target.value)}
                              className="pl-9"
                            />
                          </div>
                        </div>
                        
                        <FormField
                          control={clientForm.control}
                          name="clientId"
                          render={({ field }) => (
                            <FormItem>
                              <RadioGroup 
                                onValueChange={(value) => {
                                  field.onChange(value);
                                  // Limpar erro quando um cliente é selecionado
                                  clientForm.clearErrors("clientId");
                                }} 
                                value={field.value} // Use value em vez de defaultValue para controle total
                                className="flex flex-col space-y-2 max-h-[300px] overflow-y-auto"
                              >
                                {filteredClients.length > 0 ? (
                                  filteredClients.map((client) => (
                                    <Label
                                      key={client.id}
                                      htmlFor={`client-${client.id}`}
                                      className={`w-full flex items-center justify-between p-3 rounded-lg border ${
                                        field.value === client.id.toString()
                                          ? "bg-primary/5 border-primary"
                                          : "border-neutral-200"
                                      }`}
                                    >
                                      <div className="flex items-center">
                                        <div className="w-10 h-10 bg-neutral-200 rounded-full mr-3 flex items-center justify-center overflow-hidden">
                                          {client.profileImage ? (
                                            <img 
                                              src={client.profileImage} 
                                              alt={client.name || 'Cliente'} 
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <UserRound className="h-5 w-5 text-neutral-500" />
                                          )}
                                        </div>
                                        <div>
                                          <p className="font-medium">{client.name}</p>
                                          <p className="text-xs text-neutral-500">
                                            {client.email} • {client.phone || "Sem telefone"}
                                          </p>
                                        </div>
                                      </div>
                                      <RadioGroupItem 
                                        value={client.id.toString()} 
                                        id={`client-${client.id}`} 
                                      />
                                    </Label>
                                  ))
                                ) : (
                                  <div className="text-center py-6">
                                    <UserRound className="mx-auto h-8 w-8 text-neutral-300" />
                                    <p className="mt-2 text-sm text-neutral-500">
                                      Nenhum cliente encontrado com os termos de busca
                                    </p>
                                  </div>
                                )}
                              </RadioGroup>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                      
                      <TabsContent value="new" className="pt-4 space-y-4">
                        {/* New client form */}
                        <FormField
                          control={clientForm.control}
                          name="clientName"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nome completo</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="Nome do cliente" value={field.value || ""} />
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
                                <Input {...field} type="email" placeholder="email@exemplo.com" value={field.value || ""} />
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
                              <FormLabel>Telefone</FormLabel>
                              <FormControl>
                                <Input {...field} placeholder="(11) 98765-4321" value={field.value || ""} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                    </Tabs>
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
                >
                  Continuar
                </Button>
              </div>
            </form>
          </Form>
        )}
        
        {/* Step 4: Confirmation */}
        {currentStep === 4 && selectedService && (
          <Form {...confirmationForm}>
            <form onSubmit={confirmationForm.handleSubmit(onConfirmationSubmit)} className="space-y-4">
              <div className="flex items-center mb-4">
                <CheckCircle className="h-5 w-5 mr-2 text-primary" />
                <h2 className="font-medium">Confirmar agendamento</h2>
              </div>
              
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    {/* Service details */}
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg mr-3 flex items-center justify-center">
                        <ScissorsIcon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{selectedService.name}</p>
                        <p className="text-sm text-neutral-500">
                          {selectedService.duration} min • {formatCurrency(selectedService.price)}
                        </p>
                      </div>
                    </div>
                    
                    {/* Date/Time details */}
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg mr-3 flex items-center justify-center">
                        <Calendar className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">
                          {bookingData.date && format(parseISO(bookingData.date), "dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-neutral-500">
                          {bookingData.time && `${bookingData.time} - ${calculateEndTime(bookingData.time, selectedService.duration)}`}
                        </p>
                      </div>
                    </div>
                    
                    {/* Client details */}
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-primary/10 rounded-lg mr-3 flex items-center justify-center">
                        <UserRound className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        {bookingData.clientType === "existing" && bookingData.clientId ? (
                          <div>
                            {clients.filter(c => c.id.toString() === bookingData.clientId).map(client => (
                              <div key={client.id}>
                                <p className="font-medium">{client.name}</p>
                                <p className="text-sm text-neutral-500">
                                  {client.email} • {client.phone}
                                </p>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div>
                            <p className="font-medium">{bookingData.clientName}</p>
                            <p className="text-sm text-neutral-500">
                              {bookingData.clientEmail} • {bookingData.clientPhone}
                            </p>
                          </div>
                        )}
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
      </>
      )}
      </ProviderLayout>
    </PageTransition>
  );
}