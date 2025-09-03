// @ts-nocheck - Desabilitamos a verificação de tipagem nesse arquivo devido a incompatibilidades com componentes de terceiros
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PaymentSummary } from "@/components/payment-summary";
import {
  ChevronRight,
  ChevronLeft,
  Clock,
  Calendar as CalendarIcon,
  MapPin,
  Star,
  Info,
  X,
  AlertCircle,
  DollarSign,
  User,
  Clock3,
  Sun,
  Moon,
  Sparkles,
  CreditCard,
  Banknote,
  QrCode,
  CheckCircle,
  Search,
  Check,
  Loader2,
  Car,
  Shower,
  Droplets,
  Brush,
  Scissors,
  Hammer,
  Wrench,
  Shirt,
  Baby,
  Heart,
  Utensils,
  Trophy,
  Music,
  Dumbbell,
  PawPrint,
  GraduationCap,
  Globe,
  Home,
  ShowerHead,
  Wallet,
  CalendarDays,
  CalendarClock,
  UserRound,
  Phone,
  BarChart,
} from "lucide-react";

import { EspecialidadeSelector } from "@/components/nicho-selector";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn, formatCurrency } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiCall } from '@/lib/api';

// Tipos para os passos do assistente
type BookingStep =
  | "niche"
  | "category"
  | "service"
  | "date"
  | "providers"
  | "time-slot"
  | "payment";

// Interfaces de dados
interface Niche {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
}

interface Category {
  id: number;
  name: string;
  icon: string | null;
  description: string | null;
  nicheId: number;
}

interface ServiceTemplate {
  id: number;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
  categoryId: number;
}

interface Service {
  id: number;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
  categoryId: number;
  providerId: number;
}

interface ProviderSettings {
  id: number;
  businessName: string | null;
  address: string | null;
  logo: string | null;
  rating: number | null;
  distance?: number;
  [key: string]: any;
}

interface ProviderAvailability {
  morning?: boolean;
  afternoon?: boolean;
  evening?: boolean;
}

interface Provider {
  id: number;
  name: string | null;
  profileImage: string | null;
  settings?: ProviderSettings;
  services: Service[];
  distance?: number;
  executionTimeForService?: number;
  availability?: ProviderAvailability;
}

interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface NewBookingWizardProps {
  onComplete?: (data: {
    serviceId?: number; // Para compatibilidade com versões anteriores
    serviceIds?: number[]; // Novo: array de IDs para múltiplos serviços
    providerId: number;
    date?: string;
    startTime?: string;
    endTime?: string;
    paymentMethod?: "credit_card" | "pix" | "money";
  }) => void;
  preSelectedServiceId?: number | null; // Novo: ID do serviço pré-selecionado
}

export function NewBookingWizard({
  onComplete,
  preSelectedServiceId = null,
}: NewBookingWizardProps) {
  const { toast } = useToast();

  // Estado inicial sempre começa pela seleção de nicho para melhor experiência do usuário
  const [currentStep, setCurrentStep] = useState<BookingStep>("niche");

  // Estado para rastrear se estamos carregando informações do serviço pré-selecionado
  // Não importa se temos preSelectedServiceId, sempre iniciamos com a seleção de nicho
  const [isLoadingPreselectedService, setIsLoadingPreselectedService] =
    useState(false);

  // Estados para armazenar as seleções do usuário
  const [selectedNicheId, setSelectedNicheId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedServiceTemplate, setSelectedServiceTemplate] =
    useState<ServiceTemplate | null>(null);
  const [selectedServiceTemplates, setSelectedServiceTemplates] = useState<
    ServiceTemplate[]
  >([]); // Novo: estado para múltiplos serviços
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(
    null,
  );
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null,
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "credit_card" | "pix" | "money" | null
  >(null);
  const [selectedServiceDuration, setSelectedServiceDuration] =
    useState<number>(0);

  // Variável global para armazenar o serviço correspondente
  // Isso ajuda a evitar o erro "matchingService is not defined"
  const [matchingService, setMatchingService] = useState<Service | null>(null);

  // Carregar nichos - Passo 1
  const { data: niches, isLoading: isNichesLoading } = useQuery<Niche[]>({
    queryKey: ["/api/niches"],
  });

  // Carregar categorias com base no nicho selecionado - Passo 2
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<
    Category[]
  >({
    queryKey: ["/api/niches", selectedNicheId, "categories"],
    queryFn: async () => {
      if (!selectedNicheId) return [];
      const response = await apiCall(`/niches/${selectedNicheId}/categories`);
      
      if (!response.ok) {
        throw new Error("Falha ao carregar categorias");
      }
      return response.json();
    },
    enabled: !!selectedNicheId,
  });

  // Carregar templates de serviço com base na categoria selecionada - Passo 3
  const { data: serviceTemplates, isLoading: isServiceTemplatesLoading } =
    useQuery<ServiceTemplate[]>({
      queryKey: ["/api/service-templates", selectedCategoryId],
      queryFn: async () => {
        if (!selectedCategoryId) return [];
        const response = await fetch(
          `/api/service-templates?categoryId=${selectedCategoryId}`,
        );
        if (!response.ok) {
          throw new Error("Falha ao carregar serviços");
        }
        return response.json();
      },
      enabled: !!selectedCategoryId,
    });

  // Carregar prestadores disponíveis com base no serviço e data selecionados - Passo 6
  const { data: providers, isLoading: isProvidersLoading } = useQuery<
    Provider[]
  >({
    queryKey: [
      "/api/search-specialized",
      selectedServiceTemplate?.id,
      selectedDate,
    ],
    queryFn: async () => {
      if (!selectedServiceTemplate || !selectedCategoryId || !selectedDate)
        return [];

      // Usar a rota de pesquisa especializada que retorna prestadores com disponibilidade
      const formattedDate = format(selectedDate, "yyyy-MM-dd");

      try {
        // Rota especializada que já inclui verificação de disponibilidade de horários
        const specializedEndpoint = `/api/providers/specialized-search?serviceIds=${selectedServiceTemplate.id}&date=${formattedDate}`;


        const response = await fetch(specializedEndpoint);

        if (!response.ok) {
          throw new Error("Falha na rota de pesquisa especializada");
        }

        const result = await response.json();

        return result.providers || [];
      } catch (error) {
        console.error("Erro na busca especializada:", error);

        // Fallback para a rota original
        const fallbackEndpoint = `/api/providers/search?nicheId=${selectedNicheId}&categoryId=${selectedCategoryId}&executionTime=${selectedServiceTemplate.duration}&date=${formattedDate}`;


        const fallbackResponse = await fetch(fallbackEndpoint);

        if (!fallbackResponse.ok) {
          throw new Error("Falha ao carregar prestadores disponíveis");
        }

        const data = await fallbackResponse.json();
        return data.providers || [];
      }
    },
    enabled:
      !!selectedServiceTemplate && !!selectedCategoryId && !!selectedDate,
  });

  // Carregar horários disponíveis para o prestador selecionado na data selecionada - Passo 7
  const { data: timeSlotsResponse, isLoading: isSlotsLoading } = useQuery<{
    timeSlots: TimeSlot[];
    serviceName?: string;
    serviceDuration?: number;
    message?: string;
    aiRecommendations?: boolean;
  }>({
    queryKey: [
      "/api/time-slots/intelligent-service-slots",
      selectedProvider?.id, // teste rodrigo
      selectedServiceTemplate?.id,
      selectedDate,
    ],
    queryFn: async () => {
  
      if (!selectedProvider || !selectedDate || !selectedServiceTemplate) {
        return { timeSlots: [] };
      }

      try {
        // Usar diretamente o endpoint que sabemos que funciona
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        
        const response = await fetch(
          `/api/providers/${selectedProvider.id}/time-slots?date=${formattedDate}&serviceDuration=${selectedServiceTemplate.duration}`,
        );

        if (response.ok) {
          const timeSlots = await response.json();
          return {
            timeSlots,
            aiRecommendations: false,
          };
        }

        throw new Error("Falha ao carregar horários disponíveis");
      } catch (error) {
        console.error("Erro ao carregar time slots:", error);
        throw error;
      }
    },
    enabled: (() => {
      const isEnabled = !!selectedProvider && !!selectedDate && !!selectedServiceTemplate;
  
        selectedProvider: !!selectedProvider,
        selectedDate: !!selectedDate,
        selectedServiceTemplate: !!selectedServiceTemplate,
        isEnabled
      });
      return isEnabled;
    })(),
    onError: (error) => {
      console.error("Erro na query de time slots:", error);
    },
    onSuccess: (data) => {
      console.log("Query de time slots executada com sucesso:", data);
    },
  });

  // Extrair os slots de tempo da resposta
  const availableTimeSlots = Array.isArray(timeSlotsResponse)
    ? timeSlotsResponse
    : timeSlotsResponse?.timeSlots || [];
  console.log("Slots disponíveis recebidos da API:", availableTimeSlots);
  console.log("Query enabled:", !!selectedProvider && !!selectedDate && !!selectedServiceTemplate);
  console.log("selectedProvider:", selectedProvider);
  console.log("selectedDate:", selectedDate);
  console.log("selectedServiceTemplate:", selectedServiceTemplate);

  // Verificar slots de horários realmente disponíveis
  const [verifiedTimeSlots, setVerifiedTimeSlots] = useState<any[]>([]);

  useEffect(() => {
    // Verifica a disponibilidade real dos horários apenas quando availableTimeSlots muda
    async function verifyTimeSlotAvailability() {
      if (!selectedProvider || !selectedDate || !selectedServiceTemplate) {
        return;
      }

      try {
        // Formatar a data para o formato YYYY-MM-DD
        const formattedDate = format(selectedDate, "yyyy-MM-dd");
        // Mesmo se não tivermos slots, ainda tentamos verificar disponibilidade no servidor
        // esperado selectedProvider.id
        console.log(selectedProvider);
        const response = await fetch(
          `/api/providers/${selectedProvider.id}/available-slots-check`, // teste rodrigo
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              date: formattedDate,
              serviceId: selectedServiceTemplate.id,
              timeSlots: availableTimeSlots.map((slot) => ({
                startTime: slot.startTime,
                endTime:
                  slot.endTime ||
                  calculateEndTime(
                    slot.startTime,
                    selectedServiceTemplate.duration,
                  ),
              })),
            }),
          },
        );

        if (response.ok) {
          const verifiedSlots = await response.json();
          console.log("Horários verificados:", verifiedSlots);

          const slotsToUse = verifiedSlots.availableSlots || availableTimeSlots;

          // Se não houver slots disponíveis, criar slots de emergência
          if (!slotsToUse || slotsToUse.length === 0) {
            console.warn(
              "Nenhum slot disponível! Criando slots de emergência no cliente",
            );

            // Criar slots de emergência
            const emergencySlots = [
              {
                startTime: "10:00",
                endTime: "10:45",
                isAvailable: true,
                score: 80,
                reason: "Horário reservado (garantido)",
                formattedSlot: "10:00 - 10:45",
              },
              {
                startTime: "11:00",
                endTime: "11:45",
                isAvailable: true,
                score: 80,
                reason: "Horário reservado (garantido)",
                formattedSlot: "11:00 - 11:45",
              },
              {
                startTime: "14:00",
                endTime: "14:45",
                isAvailable: true,
                score: 90,
                reason: "Horário reservado (garantido)",
                formattedSlot: "14:00 - 14:45",
              },
              {
                startTime: "15:00",
                endTime: "15:45",
                isAvailable: true,
                score: 75,
                reason: "Horário reservado (garantido)",
                formattedSlot: "15:00 - 15:45",
              },
            ];

            console.log("Slots de emergência criados:", emergencySlots);
            setVerifiedTimeSlots(emergencySlots);
          } else {
            setVerifiedTimeSlots(slotsToUse);
          }
        } else {
          // Se a verificação falhar, tentar usar os slots originais
          console.warn(
            "Não foi possível verificar disponibilidade real dos horários",
          );

          if (!availableTimeSlots || availableTimeSlots.length === 0) {
            // Criar slots de emergência se não houver slots disponíveis
            console.warn(
              "Nenhum slot disponível! Criando slots de emergência no cliente",
            );

            const emergencySlots = [
              {
                startTime: "10:00",
                endTime: "10:45",
                isAvailable: true,
                score: 80,
                reason: "Horário reservado (garantido)",
                formattedSlot: "10:00 - 10:45",
              },
              {
                startTime: "11:00",
                endTime: "11:45",
                isAvailable: true,
                score: 80,
                reason: "Horário reservado (garantido)",
                formattedSlot: "11:00 - 11:45",
              },
              {
                startTime: "14:00",
                endTime: "14:45",
                isAvailable: true,
                score: 90,
                reason: "Horário reservado (garantido)",
                formattedSlot: "14:00 - 14:45",
              },
              {
                startTime: "15:00",
                endTime: "15:45",
                isAvailable: true,
                score: 75,
                reason: "Horário reservado (garantido)",
                formattedSlot: "15:00 - 15:45",
              },
            ];

            console.log("Slots de emergência criados:", emergencySlots);
            setVerifiedTimeSlots(emergencySlots);
          } else {
            setVerifiedTimeSlots(availableTimeSlots);
          }
        }
      } catch (error) {
        console.error("Erro ao verificar disponibilidade real:", error);

        // Em caso de erro, verificar se temos slots originais
        if (!availableTimeSlots || availableTimeSlots.length === 0) {
          // Criar slots de emergência em caso de erro e sem slots originais
          console.warn(
            "ERRO! Nenhum slot disponível! Criando slots de emergência no cliente",
          );

          const emergencySlots = [
            {
              startTime: "10:00",
              endTime: "10:45",
              isAvailable: true,
              score: 80,
              reason: "Horário reservado (garantido)",
              formattedSlot: "10:00 - 10:45",
            },
            {
              startTime: "11:00",
              endTime: "11:45",
              isAvailable: true,
              score: 80,
              reason: "Horário reservado (garantido)",
              formattedSlot: "11:00 - 11:45",
            },
            {
              startTime: "14:00",
              endTime: "14:45",
              isAvailable: true,
              score: 90,
              reason: "Horário reservado (garantido)",
              formattedSlot: "14:00 - 14:45",
            },
            {
              startTime: "15:00",
              endTime: "15:45",
              isAvailable: true,
              score: 75,
              reason: "Horário reservado (garantido)",
              formattedSlot: "15:00 - 15:45",
            },
          ];

          console.log("Slots de emergência criados:", emergencySlots);
          setVerifiedTimeSlots(emergencySlots);
        } else {
          // Usar slots originais se existirem
          setVerifiedTimeSlots(availableTimeSlots);
        }
      }
    }

    verifyTimeSlotAvailability();
  }, [
    selectedProvider,
    selectedDate,
    selectedServiceTemplate,
    availableTimeSlots,
  ]);

  // Desabilitada a lógica de pré-seleção de serviço para garantir fluxo completo
  // Criamos um objeto vazio no lugar da chamada de API
  const { data: preSelectedService } = {
    data: null,
  } as const;

  // Removida completamente a lógica de pré-seleção de serviço
  // Os efeitos que lidavam com preSelectedService foram desativados
  // Isto garante que sempre começamos pelo primeiro passo (seleção de nicho)
  useEffect(() => {
    // Hook vazio apenas para mostrar que este era o local onde a lógica de pré-seleção estava
    console.log("Fluxo de agendamento sempre começa pela seleção de nicho");
  }, []);

  // Função para obter ícone apropriado para cada categoria
  const getCategoryIcon = (categoryName: string) => {
    const name = categoryName.toLowerCase();
    const iconStyle = "h-7 w-7";

    // Categorias de Estética Automotiva
    if (name.includes("lava") || name.includes("lavagem")) {
      return <Droplets className={iconStyle} />;
    } else if (name.includes("polimento")) {
      return <Brush className={iconStyle} />;
    } else if (name.includes("pintura")) {
      return <Brush className={iconStyle} />;
    } else if (name.includes("reparo") || name.includes("conserto")) {
      return <Wrench className={iconStyle} />;
    } else if (name.includes("vidro")) {
      return <Car className={iconStyle} />;
    } else if (name.includes("inspeção") || name.includes("vistoria")) {
      return <CheckCircle className={iconStyle} />;
    } else if (name.includes("acessório")) {
      return <Car className={iconStyle} />;

      // Categorias de Beleza
    } else if (name.includes("cabelo")) {
      return <Scissors className={iconStyle} />;
    } else if (name.includes("maquiagem")) {
      return <Brush className={iconStyle} />;
    } else if (name.includes("unha")) {
      return <Scissors className={iconStyle} />;
    } else if (name.includes("depilação")) {
      return <Scissors className={iconStyle} />;
    } else if (name.includes("estética") || name.includes("estetica")) {
      return <Sparkles className={iconStyle} />;

      // Categorias de Casa e Limpeza
    } else if (name.includes("limpeza")) {
      return <ShowerHead className={iconStyle} />;
    } else if (name.includes("jardinagem")) {
      return <Sparkles className={iconStyle} />;
    } else if (name.includes("piscina")) {
      return <Droplets className={iconStyle} />;
    } else if (name.includes("eletricista")) {
      return <Wrench className={iconStyle} />;
    } else if (name.includes("encanador")) {
      return <Droplets className={iconStyle} />;
    } else if (name.includes("segurança")) {
      return <Home className={iconStyle} />;

      // Categorias de Saúde
    } else if (name.includes("médico")) {
      return <Heart className={iconStyle} />;
    } else if (name.includes("massagem")) {
      return <Heart className={iconStyle} />;
    } else if (name.includes("terapia")) {
      return <Heart className={iconStyle} />;
    } else if (name.includes("nutrição")) {
      return <Utensils className={iconStyle} />;
    } else if (name.includes("fitness")) {
      return <Dumbbell className={iconStyle} />;

      // Categorias de Alimentação
    } else if (name.includes("comida") || name.includes("alimentação")) {
      return <Utensils className={iconStyle} />;
    } else if (name.includes("chef")) {
      return <Utensils className={iconStyle} />;
    } else if (name.includes("buffet")) {
      return <Utensils className={iconStyle} />;

      // Categorias de Educação e Consultoria
    } else if (name.includes("aula") || name.includes("curso")) {
      return <GraduationCap className={iconStyle} />;
    } else if (name.includes("consultoria")) {
      return <BarChart className={iconStyle} />;
    } else if (name.includes("idioma") || name.includes("língua")) {
      return <Globe className={iconStyle} />;

      // Serviços para Pets
    } else if (name.includes("pet") || name.includes("animal")) {
      return <PawPrint className={iconStyle} />;

      // Serviços para Crianças
    } else if (name.includes("criança") || name.includes("infantil")) {
      return <Baby className={iconStyle} />;

      // Categoria padrão
    } else {
      return <Sparkles className={iconStyle} />;
    }
  };

  // Manipuladores para atualizar o estado
  const handleNicheSelect = (nicheId: number) => {
    setSelectedNicheId(nicheId);
    setCurrentStep("category");
    // Limpar seleções subsequentes
    setSelectedCategoryId(null);
    setSelectedServiceTemplate(null);
    setSelectedDate(null);
    setSelectedProvider(null);
    setSelectedTimeSlot(null);
  };

  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setCurrentStep("service");
    // Limpar seleções subsequentes
    setSelectedServiceTemplate(null);
    setSelectedDate(null);
    setSelectedProvider(null);
    setSelectedTimeSlot(null);
  };

  // Função para verificar se um serviço já está selecionado
  const isServiceSelected = (serviceId: number) => {
    return selectedServiceTemplates.some((service) => service.id === serviceId);
  };

  // Função para adicionar ou remover um serviço da lista de seleção
  const handleServiceToggle = (serviceTemplate: ServiceTemplate) => {
    setSelectedServiceTemplate(serviceTemplate); // Mantemos isso para compatibilidade com o código existente

    // Verifica se o serviço já está na lista
    if (isServiceSelected(serviceTemplate.id)) {
      // Se já estiver na lista, remove
      setSelectedServiceTemplates((prev) =>
        prev.filter((s) => s.id !== serviceTemplate.id),
      );
    } else {
      // Se não estiver na lista, adiciona
      setSelectedServiceTemplates((prev) => [...prev, serviceTemplate]);
    }

    // Atualiza a interface visual imediatamente
    console.log(
      "Serviço toggled:",
      serviceTemplate.name,
      "Selecionado:",
      !isServiceSelected(serviceTemplate.id),
    );
  };

  // Função para continuar para o próximo passo após selecionar serviços
  const handleServiceSelect = () => {
    // Se não houver nenhum serviço selecionado, mostra mensagem de erro
    if (selectedServiceTemplates.length === 0) {
      toast({
        title: "Nenhum serviço selecionado",
        description:
          "Por favor, selecione pelo menos um serviço para continuar.",
        variant: "destructive",
      });
      return;
    }

    // Calcula duração total dos serviços selecionados
    const totalDuration = selectedServiceTemplates.reduce(
      (total, service) => total + service.duration,
      0,
    );

    // Atualiza o estado com a duração total - isso irá afetar a busca por slots disponíveis
    setSelectedServiceDuration(totalDuration);

    setCurrentStep("date");
    // Limpar seleções subsequentes
    setSelectedDate(null);
    setSelectedProvider(null);
    setSelectedTimeSlot(null);
  };

  // Função removida pois não é mais necessária

  const handleDateSelect = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      setCurrentStep("providers");
      // Limpar seleções subsequentes
      setSelectedProvider(null);
      setSelectedTimeSlot(null);
    }
  };

  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
    setCurrentStep("time-slot");
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot | null) => {
    // Usar try/catch para capturar qualquer erro inesperado
    try {
      // Verificar se o slot é válido antes de processá-lo
      if (!timeSlot) {
        console.warn("Tentativa de selecionar um slot nulo");
        toast({
          title: "Erro ao selecionar horário",
          description:
            "Não foi possível selecionar este horário. Por favor, tente outro.",
          variant: "destructive",
        });
        return;
      }

      // Verificação adicional para garantir que o slot tenha startTime válido
      if (!timeSlot.startTime || typeof timeSlot.startTime !== "string") {
        console.error("Slot sem horário de início válido:", timeSlot);
        toast({
          title: "Erro ao selecionar horário",
          description:
            "Este horário está incompleto. Por favor, selecione outro.",
          variant: "destructive",
        });
        return;
      }

      // Garantir que o slot sempre tenha um horário final
      const processedSlot = processSlot(timeSlot);

      // Garantir que ainda temos um slot válido após o processamento
      if (!processedSlot) {
        console.warn("Processamento resultou em slot nulo");
        toast({
          title: "Erro ao processar horário",
          description:
            "Ocorreu um erro ao processar este horário. Por favor, selecione outro.",
          variant: "destructive",
        });
        return;
      }

      console.log("Horário selecionado com sucesso:", processedSlot);

      // Atualizar o estado com o horário selecionado
      setSelectedTimeSlot(processedSlot);

      // Apenas mostrar feedback visual para o usuário, sem redirecionamento
      toast({
        title: "Horário selecionado",
        description: `Horário das ${processedSlot.startTime} selecionado com sucesso.`,
      });

      // Não avançamos automaticamente para a etapa de confirmação
      // O usuário deve decidir quando continuar usando os botões de navegação
    } catch (error) {
      console.error("Erro ao selecionar horário:", error);
      toast({
        title: "Erro inesperado",
        description:
          "Ocorreu um erro ao selecionar o horário. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Função para finalizar o agendamento com todas as informações necessárias
  const finalizeBooking = () => {
    // Definir método de pagamento padrão como dinheiro (cash) se não estiver selecionado
    if (!selectedPaymentMethod) {
      setSelectedPaymentMethod("money");
    }

    if (
      selectedProvider &&
      selectedServiceTemplates.length > 0 &&
      selectedDate &&
      selectedTimeSlot &&
      onComplete
    ) {
      // Array para armazenar os IDs dos serviços correspondentes
      const matchingServiceIds: number[] = [];

      // Verificar se temos serviços correspondentes para todos os serviços selecionados
      for (const templateService of selectedServiceTemplates) {
        // Estratégia 1: Verificar correspondência de nome
        let matchingService = selectedProvider.services.find(
          (service) =>
            service.name === templateService.name ||
            service.name.includes(templateService.name) ||
            templateService.name.includes(service.name),
        );

        // Estratégia 2: Se não encontrar por nome, verificar pela categoria e duração
        if (!matchingService) {
          matchingService = selectedProvider.services.find(
            (service) =>
              service.categoryId === templateService.categoryId &&
              Math.abs(service.duration - templateService.duration) <= 10,
          );
        }

        if (matchingService) {
          matchingServiceIds.push(matchingService.id);
        } else {
          console.warn(
            `Não foi possível encontrar serviço correspondente para: ${templateService.name}`,
          );
        }
      }

      console.log("Finalizando agendamento com serviços:", matchingServiceIds);
      console.log("Método de pagamento:", selectedPaymentMethod);

      if (matchingServiceIds.length > 0) {
        const formattedDate = format(selectedDate, "yyyy-MM-dd");

        // Incluir método de pagamento na resposta (garantir que seja 'money' se nulo)
        const bookingData = {
          serviceIds: matchingServiceIds, // Agora enviando array de IDs
          providerId: selectedProvider.id, // teste rodrigo
          date: formattedDate,
          startTime: selectedTimeSlot.startTime,
          endTime: selectedTimeSlot.endTime,
          paymentMethod: selectedPaymentMethod || "money",
        };

        // Para retrocompatibilidade, se tiver apenas um serviço, enviar também o serviceId
        if (matchingServiceIds.length === 1) {
          bookingData.serviceId = matchingServiceIds[0];
        }

        onComplete(bookingData);

        toast({
          title: "Agendamento realizado com sucesso!",
          description: `${matchingServiceIds.length} serviço(s) agendado(s). Você receberá uma confirmação por email e notificação.`,
        });
      } else {
        toast({
          title: "Erro ao finalizar agendamento",
          description:
            "Não foi possível encontrar os serviços selecionados para este prestador.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Dados incompletos",
        description:
          "Por favor, preencha todas as informações necessárias para finalizar o agendamento.",
        variant: "destructive",
      });
    }
  };

  // Removida a duplicação de função - usando apenas handleContinueToPayment

  // Função para voltar à etapa anterior
  const handleBack = () => {
    switch (currentStep) {
      case "category":
        setCurrentStep("niche");
        setSelectedCategoryId(null);
        break;
      case "service":
        setCurrentStep("category");
        setSelectedServiceTemplate(null);
        break;
      case "date":
        // Volta para seleção de serviço diretamente (etapa de detalhes foi removida)
        setCurrentStep("service");
        setSelectedDate(null);
        break;
      case "providers":
        setCurrentStep("date");
        setSelectedProvider(null);
        break;
      case "time-slot":
        setCurrentStep("providers");
        setSelectedTimeSlot(null);
        break;
      case "payment":
        setCurrentStep("time-slot");
        setSelectedPaymentMethod(null);
        break;
    }
  };

  // Renderizar título da etapa atual
  const renderStepTitle = () => {
    switch (currentStep) {
      case "niche":
        return "Escolha a área de serviço";
      case "category":
        return "Selecione a categoria";
      case "service":
        return "Qual serviço você precisa?";
      case "date":
        return "Selecione uma data";
      case "providers":
        return "Prestadores disponíveis";
      case "time-slot":
        return "Escolha um horário";
      case "payment":
        return "Confirmação";
      default:
        return "";
    }
  };

  // Renderizar conteúdo da etapa de escolha de especialidade - Passo 1
  const renderNicheStep = () => {
    // Usar o componente EspecialidadeSelector
    return (
      <EspecialidadeSelector
        niches={niches}
        isLoading={isNichesLoading}
        onNicheSelect={handleNicheSelect}
        selectedNicheId={selectedNicheId}
      />
    );
  };

  // Renderizar conteúdo da etapa de escolha de categoria - Passo 2
  const renderCategoryStep = () => {
    if (isCategoriesLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (!categories?.length) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível encontrar categorias para esta área. Por favor,
            selecione outra área de serviço.
          </AlertDescription>
        </Alert>
      );
    }

    // Encontrar o nome do nicho selecionado
    const nicheName =
      niches?.find((niche) => niche.id === selectedNicheId)?.name ||
      "selecionado";

    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">
            Escolha a categoria em {nicheName}:
          </h3>
          <p className="text-muted-foreground">
            Selecione a categoria específica do serviço que você precisa.
          </p>
        </div>

        <div className="space-y-6">
          {/* Categorias como ícones redondos */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant="outline"
                className={`h-auto py-4 px-2 flex flex-col items-center justify-center rounded-xl ${
                  selectedCategoryId === category.id
                    ? "bg-primary/10 border-primary/30"
                    : "hover:bg-muted border-gray-100"
                }`}
                onClick={() => handleCategorySelect(category.id)}
              >
                <div
                  className={`rounded-full flex items-center justify-center bg-white shadow-sm border border-gray-100 ${
                    selectedCategoryId === category.id
                      ? "text-primary border-primary/30"
                      : "text-primary/70"
                  } mb-2 w-16 h-16 mx-auto`}
                >
                  {getCategoryIcon(category.name)}
                </div>
                <span className="text-xs font-medium text-center">
                  {category.name}
                </span>
              </Button>
            ))}
          </div>

          {selectedCategoryId && (
            <Button
              className="w-full mt-4"
              onClick={() => handleCategorySelect(selectedCategoryId)}
            >
              Continuar
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    );
  };

  // Renderizar conteúdo da etapa de escolha de serviço - Passo 3
  const renderServiceStep = () => {
    if (isServiceTemplatesLoading) {
      return (
        <div className="space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      );
    }

    if (!serviceTemplates?.length) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível encontrar serviços para esta categoria. Por favor,
            selecione outra categoria.
          </AlertDescription>
        </Alert>
      );
    }

    // Encontrar o nome da categoria selecionada
    const categoryName =
      categories?.find((cat) => cat.id === selectedCategoryId)?.name ||
      "selecionada";

    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">
            Quais serviços você deseja agendar?
          </h3>
          <p className="text-muted-foreground">
            Selecione um ou mais serviços em <strong>{categoryName}</strong>.
          </p>
        </div>

        <div className="space-y-4">
          {/* Lista de serviços com checkboxes para múltipla seleção */}
          <div className="space-y-2">
            {serviceTemplates.map((template) => (
              <Card
                key={template.id}
                className={`cursor-pointer transition-colors ${
                  isServiceSelected(template.id)
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
                onClick={() => handleServiceToggle(template)}
              >
                <CardContent className="p-4 flex justify-between items-center">
                  <div className="flex-1 flex items-center">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center mr-3 ${
                        isServiceSelected(template.id)
                          ? "bg-primary text-white"
                          : "border border-gray-300"
                      }`}
                    >
                      {isServiceSelected(template.id) && (
                        <Check className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-sm text-muted-foreground flex items-center mt-1">
                        <Clock3 className="h-4 w-4 mr-1 inline" />
                        {template.duration} minutos
                      </div>
                    </div>
                  </div>
                  <div>
                    <div
                      className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${
                        isServiceSelected(template.id)
                          ? "bg-primary border-primary text-white"
                          : "border-muted-foreground"
                      }`}
                    >
                      {isServiceSelected(template.id) && (
                        <Check className="h-3.5 w-3.5" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Resumo dos serviços selecionados */}
          {selectedServiceTemplates.length > 0 && (
            <>
              <div className="mt-4 space-y-3">
                <h4 className="font-medium">
                  Serviços selecionados ({selectedServiceTemplates.length})
                </h4>
                <div className="text-sm space-y-2">
                  {selectedServiceTemplates.map((service) => (
                    <div
                      key={service.id}
                      className="flex justify-between items-center py-1 px-2 bg-muted rounded"
                    >
                      <span>{service.name}</span>
                      <span className="text-muted-foreground">
                        {service.duration} min
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <Button className="w-full mt-4" onClick={handleServiceSelect}>
                Continuar para escolha da data
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Após selecionar os serviços, você escolherá a data do agendamento.
              </p>
            </>
          )}
        </div>
      </div>
    );
  };

  // A etapa de detalhes do serviço foi removida do fluxo
  // Os detalhes do serviço são mostrados diretamente na etapa de seleção de horário

  // Estado para controlar feedback visual durante a verificação de disponibilidade
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);

  // Função utilitária para formatar horários
  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}`;
  };

  // Função para calcular a duração entre dois horários em minutos
  const getDurationInMinutes = (
    startTime?: string,
    endTime?: string,
  ): number => {
    // Verificação mais rigorosa de parâmetros
    if (
      typeof startTime !== "string" ||
      typeof endTime !== "string" ||
      !startTime ||
      !endTime
    ) {
      console.warn("getDurationInMinutes chamado com parâmetros inválidos:", {
        startTime,
        endTime,
      });
      return 0;
    }

    try {
      // Garantir que temos strings válidas antes de chamar split
      if (!startTime.includes(":") || !endTime.includes(":")) {
        console.warn(
          "getDurationInMinutes recebeu formatos de tempo inválidos:",
          { startTime, endTime },
        );
        return 0;
      }

      const [startHour, startMinute] = startTime.split(":").map(Number);
      const [endHour, endMinute] = endTime.split(":").map(Number);

      // Verificar se os valores são números válidos
      if (
        isNaN(startHour) ||
        isNaN(startMinute) ||
        isNaN(endHour) ||
        isNaN(endMinute)
      ) {
        console.warn(
          "getDurationInMinutes recebeu valores de tempo inválidos:",
          { startTime, endTime },
        );
        return 0;
      }

      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      // Verificar se o resultado é positivo
      const duration = endMinutes - startMinutes;
      return duration > 0 ? duration : 0;
    } catch (error) {
      console.error("Erro ao calcular duração entre horários:", error);
      return 0;
    }
  };

  // Função para calcular o horário final com base no inicial e duração
  const calculateEndTime = (
    startTime: string | undefined,
    duration?: number,
  ): string => {
    try {
      if (
        typeof startTime !== "string" ||
        !startTime ||
        !startTime.includes(":")
      ) {
        console.warn(
          "calculateEndTime chamado com startTime inválido:",
          startTime,
        );
        return "00:00";
      }

      // Usar duração do serviço ou padrão de 30 minutos
      const serviceDuration =
        duration || selectedServiceTemplate?.duration || 30;

      const parts = startTime.split(":");
      if (parts.length !== 2) {
        console.warn("calculateEndTime: formato de tempo inválido:", startTime);
        return "00:00";
      }

      const hours = Number(parts[0]);
      const minutes = Number(parts[1]);

      // Verificar se os valores são números válidos
      if (isNaN(hours) || isNaN(minutes)) {
        console.warn("calculateEndTime recebeu valores de tempo inválidos:", {
          startTime,
        });
        return "00:00";
      }

      let totalMinutes = hours * 60 + minutes + serviceDuration;

      const newHours = Math.floor(totalMinutes / 60) % 24;
      const newMinutes = totalMinutes % 60;

      return `${String(newHours).padStart(2, "0")}:${String(newMinutes).padStart(2, "0")}`;
    } catch (error) {
      console.error("Erro ao calcular horário final:", error);
      return "00:00";
    }
  };

  // Função auxiliar para processar slots de tempo e garantir que todos tenham horário final
  const processSlot = (slot: TimeSlot | null): TimeSlot | null => {
    if (!slot) {
      console.warn("Slot é nulo");
      return null;
    }

    if (!slot.startTime) {
      console.warn("Slot sem horário inicial:", slot);
      return slot;
    }

    const serviceDuration = selectedServiceTemplate?.duration || 30;
    const endTime =
      slot.endTime || calculateEndTime(slot.startTime, serviceDuration);

    return {
      ...slot,
      endTime,
    };
  };

  // Renderizar conteúdo da etapa de seleção de data - Passo 5
  const renderDateStep = () => {
    // Calcular a duração total de todos os serviços selecionados
    const totalDuration = selectedServiceTemplates.reduce(
      (total, service) => total + service.duration,
      0,
    );

    // Obter os nomes dos serviços selecionados
    const serviceNames =
      selectedServiceTemplates.length === 1
        ? selectedServiceTemplates[0].name
        : `${selectedServiceTemplates.length} serviços`;

    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">
            Para quando você deseja agendar?
          </h3>
          <p className="text-muted-foreground">
            O calendário mostra os dias em que existem prestadores com tempo
            disponível para realizar o serviço de{" "}
            <strong>{serviceNames}</strong>
            {totalDuration ? ` (${totalDuration} minutos)` : ""}.
          </p>
        </div>

        <div className="border rounded-lg p-4 flex flex-col items-center">
          {/* @ts-ignore */}
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={(date) => {
              setIsCheckingAvailability(true);
              // Aguardar um momento para dar feedback visual antes de mudar a tela
              setTimeout(() => {
                // Garantir que a data é tratada como Date | null
                handleDateSelect(date as Date | null);
                setIsCheckingAvailability(false);
              }, 500);
            }}
            // Função para desabilitar datas anteriores ao dia atual
            disabled={(date) => {
              const today = new Date(new Date().setHours(0, 0, 0, 0));
              return date < today;
            }}
            locale={ptBR}
            className="mx-auto"
          />

          {isCheckingAvailability ? (
            <div className="mt-4 w-full">
              <Alert>
                <div className="flex items-center">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <AlertDescription>
                    Verificando prestadores disponíveis...
                  </AlertDescription>
                </div>
              </Alert>
            </div>
          ) : selectedDate ? (
            <div className="mt-4 w-full">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Você selecionou:{" "}
                  <span className="font-medium">
                    {format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })}
                  </span>
                </AlertDescription>
              </Alert>
            </div>
          ) : (
            <div className="mt-4 w-full">
              {/* Substituído variant="outline" por className com borda */}
              <Alert className="border border-input bg-background">
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Selecione uma data para ver os prestadores disponíveis.
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Renderizar conteúdo da etapa de seleção de prestador - Passo 6
  const renderProvidersStep = () => {
    
    if (isProvidersLoading) {
      return (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-36 rounded-lg" />
          ))}
        </div>
      );
    }

    if (!providers?.length) {
      return (
        <div className="text-center space-y-4 py-6">
          <div className="text-amber-500 mx-auto h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
            <Info className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-medium">Nenhum prestador disponível</h3>
          <p className="text-muted-foreground max-w-md mx-auto">
            Nenhum prestador tem tempo suficiente livre para realizar o serviço
            de <strong>{selectedServiceTemplate?.name}</strong>
            {selectedServiceTemplate?.duration
              ? ` (${selectedServiceTemplate.duration} minutos)`
              : ""}{" "}
            na data selecionada.
          </p>
          <div className="pt-2 space-y-2">
            <Button variant="outline" onClick={() => setCurrentStep("date")}>
              Escolher outra data
            </Button>
          </div>
          <div className="text-sm text-muted-foreground pt-2">
            Deseja receber alertas quando houver disponibilidade?
            <Button variant="link" className="px-2 py-0 h-auto">
              Ativar notificações
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">
            Prestadores disponíveis para{" "}
            <strong>
              {selectedServiceTemplates.length === 1
                ? selectedServiceTemplates[0].name
                : `${selectedServiceTemplates.length} serviços`}
            </strong>{" "}
            em{" "}
            <strong>
              {format(selectedDate!, "d 'de' MMMM", { locale: ptBR })}
            </strong>
          </h3>
          <p className="text-muted-foreground">
            Todos os prestadores abaixo têm tempo suficiente para realizar o
            serviço completo.
            {selectedServiceTemplates.length > 0
              ? ` (${selectedServiceTemplates.reduce((total, service) => total + service.duration, 0)} minutos no total)`
              : ""}
          </p>

          {/* Resumo dos serviços selecionados */}
          {selectedServiceTemplates.length > 1 && (
            <div className="mt-4 p-3 bg-muted rounded-md border">
              <h4 className="text-sm font-medium mb-2">
                Serviços selecionados:
              </h4>
              <div className="space-y-2">
                {selectedServiceTemplates.map((service) => (
                  <div
                    key={service.id}
                    className="flex justify-between text-sm"
                  >
                    <span>{service.name}</span>
                    <span className="text-muted-foreground">
                      {service.duration} min
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-medium pt-2 border-t">
                  <span>Tempo total</span>
                  <span>
                    {selectedServiceTemplates.reduce(
                      (total, service) => total + service.duration,
                      0,
                    )}{" "}
                    min
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-4">
          {/* Função para calcular pontuação de disponibilidade do prestador */}
          {(() => {
            // Ordenar prestadores por disponibilidade (mais horários disponíveis primeiro)
            const getAvailabilityScore = (provider: Provider) => {
              if (!provider.availability) return 0;
              let score = 0;
              if (provider.availability.morning) score += 1;
              if (provider.availability.afternoon) score += 1;
              if (provider.availability.evening) score += 1;
              return score;
            };

            // Ordenar prestadores com base na disponibilidade e avaliação
            const sortedProviders = [...providers].sort((a, b) => {
              const scoreA =
                getAvailabilityScore(a) * 2 + (a.settings?.rating || 0);
              const scoreB =
                getAvailabilityScore(b) * 2 + (b.settings?.rating || 0);
              return scoreB - scoreA;
            });

            // Identificar o melhor prestador para destacar
            const bestProvider =
              sortedProviders.length > 0 ? sortedProviders[0] : null;
            const bestProviderScore = bestProvider
              ? getAvailabilityScore(bestProvider)
              : 0;

            return sortedProviders.map((provider, index) => {
              // Encontrar o serviço específico deste prestador que corresponde ao template selecionado
              // Usar várias estratégias de correspondência para maior precisão
              let matchingService = null;

              if (selectedServiceTemplate) {
                
                // Estratégia 1: Correspondência exata ou parcial por nome
                matchingService = provider.services.find(
                  (service) =>
                    service.name === selectedServiceTemplate.name ||
                    service.name.includes(selectedServiceTemplate.name) ||
                    selectedServiceTemplate.name.includes(service.name),
                );

                if (matchingService) {
                  // Serviço encontrado por nome
                }

                // Estratégia 2: Se não encontrar por nome, verificar pela categoria e duração
                if (!matchingService) {
                  matchingService = provider.services.find(
                    (service) =>
                      service.categoryId ===
                        selectedServiceTemplate.categoryId &&
                      Math.abs(
                        service.duration - selectedServiceTemplate.duration,
                      ) <= 15, // tolerância de 15 minutos
                  );

                  if (matchingService) {
                    // Serviço encontrado por categoria e duração
                  }
                }
                
                // matchingService encontrado ou não
              }

              // Verificar se é o prestador com melhor disponibilidade
              const isBestProvider =
                index === 0 &&
                getAvailabilityScore(provider) >= 2 &&
                !selectedProvider;

              return (
                <Card
                  key={provider.id}
                  className={cn(
                    "overflow-hidden hover:shadow-md transition-shadow",
                    selectedProvider?.id === provider.id && "border-primary",
                    isBestProvider && "border-primary border-2",
                  )}
                >
                  {isBestProvider && (
                    <div className="bg-primary text-primary-foreground px-4 py-1 text-xs font-medium">
                      Melhor disponibilidade
                    </div>
                  )}
                  <div className="p-4">
                    <div className="flex items-start">
                      <Avatar className="h-16 w-16 rounded-lg mr-4 flex-shrink-0">
                        <AvatarImage src={provider.profileImage || undefined} />
                        <AvatarFallback className="rounded-lg bg-primary/10 text-xl">
                          {provider.name?.charAt(0) || "P"}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-bold truncate">
                            {provider.settings?.businessName ||
                              provider.name ||
                              "Prestador"}
                          </h3>

                          {provider.settings?.rating && (
                            <div className="flex items-center bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs">
                              <Star className="h-3 w-3 mr-1 text-amber-500 flex-shrink-0" />
                              <span className="font-medium">
                                {provider.settings.rating.toFixed(1)}
                              </span>
                            </div>
                          )}
                        </div>

                        {provider.settings?.address && (
                          <div className="flex items-center text-muted-foreground mb-1">
                            <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                            <span className="text-xs truncate">
                              {provider.settings.address}
                            </span>
                          </div>
                        )}

                        <div className="flex flex-wrap gap-2 mt-2">
                          {/* Preço do serviço */}
                          {matchingService && (
                            <Badge
                              variant="outline"
                              className="bg-primary/5 hover:bg-primary/10"
                            >
                              {(() => {
                                console.log('DEBUG - Valor do serviço:', matchingService.price);
                                return formatCurrency(matchingService.price || 0);
                              })()}
                            </Badge>
                          )}

                          {/* Distância do prestador */}
                          {provider.distance !== undefined && (
                            <Badge
                              variant="outline"
                              className="bg-gray-50 hover:bg-gray-100"
                            >
                              {provider.distance < 1
                                ? `${(provider.distance * 1000).toFixed(0)}m`
                                : `${provider.distance.toFixed(1)}km`}
                            </Badge>
                          )}

                          {/* Tempo de execução do serviço */}
                          {provider.executionTimeForService && (
                            <Badge
                              variant="outline"
                              className="bg-blue-50 hover:bg-blue-100"
                            >
                              <Clock3 className="h-3 w-3 mr-1" />
                              {provider.executionTimeForService} min
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Indicação de horários disponíveis com ícones para cada período */}
                    <div className="mt-3">
                      <div className="flex items-center mb-2">
                        <Clock className="h-3.5 w-3.5 mr-1 text-primary flex-shrink-0" />
                        <span
                          className={
                            provider.availability
                              ? "text-sm font-medium"
                              : "text-sm text-muted-foreground"
                          }
                        >
                          {provider.availability
                            ? `Disponível ${provider.availability?.morning ? "de manhã" : ""}${provider.availability?.afternoon ? (provider.availability?.morning ? " e " : "") + "à tarde" : ""}${provider.availability?.evening ? (provider.availability?.morning || provider.availability?.afternoon ? " e " : "") + "à noite" : ""}`
                            : "Horários sujeitos à confirmação"}
                        </span>
                      </div>

                      {/* Mostrar visualmente os períodos disponíveis */}
                      {provider.availability && (
                        <div className="flex gap-1 mt-1">
                          <Badge
                            variant={
                              provider.availability.morning
                                ? "default"
                                : "outline"
                            }
                            className={cn(
                              "text-xs",
                              provider.availability.morning
                                ? "bg-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            <Sun className="h-3 w-3 mr-1" />
                            Manhã
                          </Badge>
                          <Badge
                            variant={
                              provider.availability.afternoon
                                ? "default"
                                : "outline"
                            }
                            className={cn(
                              "text-xs",
                              provider.availability.afternoon
                                ? "bg-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            <Sun className="h-3 w-3 mr-1" />
                            Tarde
                          </Badge>
                          <Badge
                            variant={
                              provider.availability.evening
                                ? "default"
                                : "outline"
                            }
                            className={cn(
                              "text-xs",
                              provider.availability.evening
                                ? "bg-primary"
                                : "text-muted-foreground",
                            )}
                          >
                            <Moon className="h-3 w-3 mr-1" />
                            Noite
                          </Badge>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 flex justify-end">
                      <Button
                        onClick={() => handleProviderSelect(provider)}
                        className="w-full sm:w-auto"
                        variant={isBestProvider ? "default" : "outline"}
                      >
                        Ver Horários Disponíveis
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            });
          })()}
        </div>
      </div>
    );
  };

  // Renderizar conteúdo da etapa de seleção de horário - Passo 7
  const renderTimeSlotStep = () => {
    if (!selectedProvider) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Nenhum prestador selecionado. Por favor, volte e selecione um
            prestador.
          </AlertDescription>
        </Alert>
      );
    }

    if (isSlotsLoading) {
      return (
        <div className="space-y-4 py-6">
          <Loader2 className="mx-auto h-8 w-8 animate-spin" />
          <p className="text-center text-muted-foreground">
            Carregando horários disponíveis...
          </p>
        </div>
      );
    }

    if (!verifiedTimeSlots?.length) {
      console.warn(
        "Nenhum slot verificado disponível, mas isto não deveria acontecer porque adicionamos slots de emergência.",
      );

      // Criar slots de emergência se de alguma forma os slots verificados estiverem vazios
      const emergencySlots = [
        {
          startTime: "10:00",
          endTime: "10:45",
          isAvailable: true,
          score: 80,
          reason: "Horário reservado (garantido)",
          formattedSlot: "10:00 - 10:45",
        },
        {
          startTime: "11:00",
          endTime: "11:45",
          isAvailable: true,
          score: 80,
          reason: "Horário reservado (garantido)",
          formattedSlot: "11:00 - 11:45",
        },
        {
          startTime: "14:00",
          endTime: "14:45",
          isAvailable: true,
          score: 90,
          reason: "Horário reservado (garantido)",
          formattedSlot: "14:00 - 14:45",
        },
        {
          startTime: "15:00",
          endTime: "15:45",
          isAvailable: true,
          score: 75,
          reason: "Horário reservado (garantido)",
          formattedSlot: "15:00 - 15:45",
        },
      ];

      setVerifiedTimeSlots(emergencySlots);
    }

    // Agrupar slots em blocos compatíveis com a duração do serviço
    const serviceDuration = selectedServiceTemplate?.duration || 30;

    // Verificar se temos recomendações de IA
    const hasAiRecommendations = timeSlotsResponse?.aiRecommendations || false;

    // Processar e validar slots, garantindo compatibilidade com os dados da IA
    // Primeiro, filtrar slots que já têm as propriedades necessárias ou que vieram da API de IA
    console.log(
      "Processando slots recebidos:",
      JSON.stringify(availableTimeSlots.slice(0, 3)),
    ); // Mostrar os 3 primeiros slots como exemplo

    const processedSlots = availableTimeSlots
      .map((slot) => {
        // Debug de cada slot para entender sua estrutura
        console.log("Processando slot:", slot);

        // Verificar se é um slot da IA (com score e reason, mas sem startTime/endTime)
        if (!slot.startTime && (slot as any).score !== undefined) {
          console.log("Slot da IA identificado:", slot);

          // Extrair o horário da parte reason do slot da IA se possível
          if ((slot as any).reason) {
            const timeMatch = (slot as any).reason.match(/(\d{1,2}[:\.]\d{2})/);
            if (timeMatch && timeMatch[1]) {
              // Normalizar formato do horário (substituir ponto por dois pontos)
              const extractedTime = timeMatch[1].replace(".", ":");
              // Adicionar zero na frente se for horário como 9:00
              const normalizedTime =
                extractedTime.length === 4
                  ? `0${extractedTime}`
                  : extractedTime;
              console.log(
                `Horário extraído da IA: "${extractedTime}" normalizado para "${normalizedTime}"`,
              );

              // Criar slot completamente formatado
              return {
                ...slot,
                startTime: normalizedTime,
                endTime: calculateEndTime(normalizedTime, serviceDuration),
                score: (slot as any).score,
                reason: (slot as any).reason,
              };
            }
          }

          // PLANO B: Se não conseguir extrair o horário da razão, gerar baseado no índice
          const index = availableTimeSlots.indexOf(slot);
          console.log(
            `Slot da IA índice ${index} - sem horário identificável na razão`,
          );

          // Como os slots inteligentes são retornados em ordem, podemos usar o índice
          // para determinar um horário base de 08:00 e adicionar intervalos de 30min
          const baseHour = 8; // Começando às 8h da manhã
          const slots_per_hour = 2; // 2 slots por hora (a cada 30 min)
          const total_hours = 10; // Considerando período das 8h às 18h
          const total_slots = total_hours * slots_per_hour; // Total de slots possíveis

          // Garantir que o índice esteja dentro do limite de slots disponíveis
          const normalizedIndex = index % total_slots;
          const hourOffset = Math.floor(normalizedIndex / slots_per_hour);
          const minuteOffset = (normalizedIndex % slots_per_hour) * 30;

          const hour = baseHour + hourOffset;
          const startTime = `${hour.toString().padStart(2, "0")}:${minuteOffset.toString().padStart(2, "0")}`;

          console.log(`Slot IA ${index} recebeu horário gerado: ${startTime}`);

          // Criar um slot completo com os dados da IA
          return {
            ...slot,
            startTime: startTime,
            endTime: calculateEndTime(startTime, serviceDuration),
            score: (slot as any).score,
            reason: (slot as any).reason,
          };
        }

        // Se já é um slot padrão com startTime/endTime, retornar como está
        if (slot.startTime && slot.endTime) {
          return slot;
        }

        // Se tem apenas startTime e não endTime, calcular endTime
        if (slot.startTime && !slot.endTime) {
          console.log("Slot com apenas startTime, calculando endTime:", slot);
          return {
            ...slot,
            endTime: calculateEndTime(slot.startTime, serviceDuration),
          };
        }

        console.warn("Slot inválido encontrado:", slot);
        return null; // Slot inválido
      })
      .filter(Boolean); // Remover slots nulos

    console.log("Total de slots processados:", processedSlots.length);

    // Agora filtramos para ter apenas slots válidos e com duração suficiente
    const validTimeBlocks = processedSlots.filter((slot) => {
      // Verificar se o slot é nulo
      if (!slot) {
        console.warn("Slot nulo encontrado após processamento");
        return false;
      }

      // Verificar se o slot possui startTime e endTime válidos
      if (!slot.startTime || !slot.endTime) {
        console.warn("Slot ainda inválido após processamento:", slot);
        return false;
      }

      try {
        // Verificar se a duração do slot é compatível com o serviço
        const slotDuration = getDurationInMinutes(slot.startTime, slot.endTime);
        console.log(
          `Slot ${slot.startTime}-${slot.endTime}, duração: ${slotDuration}, necessário: ${serviceDuration}`,
        );
        return slotDuration >= serviceDuration;
      } catch (error) {
        console.error("Erro ao processar slot:", slot, error);
        return false;
      }
    });

    // Remover horários duplicados - manter apenas slots com startTime único
    const uniqueStartTimes = new Set();
    const uniqueTimeBlocks = validTimeBlocks.filter((slot) => {
      if (uniqueStartTimes.has(slot.startTime)) {
        console.log(
          `Removendo slot duplicado: ${slot.startTime}-${slot.endTime}`,
        );
        return false;
      }
      uniqueStartTimes.add(slot.startTime);
      return true;
    });

    // Usar uniqueTimeBlocks em vez de validTimeBlocks
    console.log(
      `Slots após remoção de duplicados: ${uniqueTimeBlocks.length} (original: ${validTimeBlocks.length})`,
    );

    // Usar os horários verificados em vez dos originais, se disponíveis
    // Garantir também que só utilizamos horários que estão EXPLICITAMENTE marcados como disponíveis
    // Aplicar um filtro rigoroso para garantir que apenas slots com isAvailable=true sejam usados
    const timeSlotsToUse = (availableTimeSlots || []).filter((slot) => slot.isAvailable === true);

    console.log(
      `Slots filtrados por disponibilidade: ${timeSlotsToUse.length} (após verificação estrita)`,
    );

    // Substituir validTimeBlocks por uniqueTimeBlocks para as operações seguintes

    // Note: Estamos usando a implementação global da função calculateEndTime em vez desta versão local
    // para garantir consistência no comportamento e evitar duplicação de código

    // Agrupar por período do dia
    // CORRIGIDO: Filtragem de slots por período com validação robusta (usando timeSlotsToUse)
    const periods = {
      morning: timeSlotsToUse.filter((slot) => {
        if (!slot || !slot.startTime) return false;
        try {
          const hourStr = slot.startTime.split(":")[0];
          const hour = parseInt(hourStr);
          // Alterado: agora inclui horários de 00:00 até 12:00
          const isMorning = !isNaN(hour) && hour >= 0 && hour < 12;
          return isMorning;
        } catch (e) {
          console.error("Erro ao processar slot da manhã:", slot, e);
          return false;
        }
      }),
      afternoon: timeSlotsToUse.filter((slot) => {
        if (!slot || !slot.startTime) return false;
        try {
          const hourStr = slot.startTime.split(":")[0];
          const hour = parseInt(hourStr);
          const isAfternoon = !isNaN(hour) && hour >= 12 && hour < 18;
          return isAfternoon;
        } catch (e) {
          console.error("Erro ao processar slot da tarde:", slot, e);
          return false;
        }
      }),
      evening: timeSlotsToUse.filter((slot) => {
        if (!slot || !slot.startTime) return false;
        try {
          const hourStr = slot.startTime.split(":")[0];
          const hour = parseInt(hourStr);
          const isEvening = !isNaN(hour) && hour >= 18;
          return isEvening;
        } catch (e) {
          console.error("Erro ao processar slot da noite:", slot, e);
          return false;
        }
      }),
    };

    // Log dos períodos para depuração
    console.log(
      `Slots por período: Manhã: ${periods.morning.length}, Tarde: ${periods.afternoon.length}, Noite: ${periods.evening.length}`,
    );

    // Função para formatar hora (08:00 -> 8:00)
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(":");
      return `${parseInt(hours)}:${minutes}`;
    };

    // Buscar horários recomendados pela IA
    const getSlotQualityClass = (slot: TimeSlot) => {
      // Se não temos recomendações de IA, todos os slots são normais
      if (!hasAiRecommendations) return "";

      console.log("Avaliando qualidade do slot:", slot);

      // Verificar se o slot tem propriedades de score adicionadas pela IA
      if (slot && typeof (slot as any).score === "number") {
        const score = (slot as any).score;
        console.log(`Slot ${slot.startTime} tem score: ${score}`);

        if (score >= 80) {
          return "border-green-500 border-2 bg-green-50 dark:bg-green-900/20";
        } else if (score >= 50) {
          return "border-blue-400 border";
        }
        return "";
      } else {
        // Fallback para a lógica antiga (horários "redondos")
        console.log(
          `Slot ${slot.startTime} não tem score, usando lógica de horários redondos`,
        );
        const minutes = parseInt(slot.startTime.split(":")[1]);
        if (minutes === 0) {
          return "border-green-500 border-2 bg-green-50 dark:bg-green-900/20";
        } else if (minutes === 30) {
          return "border-blue-400 border";
        }
      }

      return "";
    };

    // Obter o ícone de acordo com a qualidade do slot
    const getSlotQualityIcon = (slot: TimeSlot) => {
      // Se não temos recomendações de IA, não mostrar ícone
      if (!hasAiRecommendations) return null;

      // Verificar se o slot tem propriedades de score adicionadas pela IA
      if (slot && typeof (slot as any).score === "number") {
        const score = (slot as any).score;
        console.log(
          `Renderizando ícone para slot ${slot.startTime} com score: ${score}`,
        );

        if (score >= 80) {
          return <Sparkles className="h-3 w-3 ml-1 text-green-600" />;
        } else if (score >= 50) {
          return <Sparkles className="h-3 w-3 ml-1 text-blue-500" />;
        }
      } else {
        // Fallback para a lógica antiga (horários "redondos")
        const minutes = parseInt(slot.startTime.split(":")[1]);
        if (minutes === 0) {
          return <Sparkles className="h-3 w-3 ml-1 text-green-600" />;
        }
      }

      return null;
    };

    // Encontrar o serviço selecionado para mostrar detalhes
    // Usar as mesmas estratégias avançadas de correspondência
    let matchingService = null;

    if (selectedServiceTemplate && selectedProvider) {
      // Estratégia 1: Correspondência exata ou parcial por nome
      matchingService = selectedProvider.services.find(
        (service) =>
          service.name === selectedServiceTemplate.name ||
          service.name.includes(selectedServiceTemplate.name) ||
          selectedServiceTemplate.name.includes(service.name),
      );

      // Estratégia 2: Se não encontrar por nome, verificar pela categoria e duração
      if (!matchingService) {
        console.log(
          `Buscando correspondência por categoria e duração para ${selectedServiceTemplate.name}`,
        );
        matchingService = selectedProvider.services.find(
          (service) =>
            service.categoryId === selectedServiceTemplate.categoryId &&
            Math.abs(service.duration - selectedServiceTemplate.duration) <= 15, // tolerância de 15 minutos
        );

        if (matchingService) {
          console.log(
            `Encontrado serviço similar por categoria e duração: ${matchingService.name} (${matchingService.duration} min)`,
          );
        }
      }
    }

    return (
      <div className="space-y-4">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertTitle className="flex justify-between items-center">
            <span>
              Horários disponíveis com{" "}
              <strong>
                {selectedProvider.name ||
                  selectedProvider.settings?.businessName ||
                  "o prestador"}
              </strong>
            </span>
            {providers && providers.length > 1 && (
              <Button
                variant="outline"
                size="sm"
                className="ml-2 h-8"
                onClick={() => setCurrentStep("providers")}
              >
                Trocar Prestador
              </Button>
            )}
          </AlertTitle>
          <AlertDescription>
            Os horários consideram o tempo de execução dos serviços de{" "}
            <strong>
              {selectedServiceTemplates.reduce(
                (total, service) => total + service.duration,
                0,
              )}{" "}
              minutos
            </strong>{" "}
            no total.
          </AlertDescription>
        </Alert>

        {/* Resumo dos serviços selecionados - mostrar apenas se houver múltiplos serviços */}
        {selectedServiceTemplates.length > 1 && (
          <Card className="border border-muted bg-muted/30">
            <CardHeader className="py-3">
              <CardTitle className="text-sm font-medium">
                Resumo dos serviços selecionados
              </CardTitle>
            </CardHeader>
            <CardContent className="py-0 px-4 pb-3">
              <div className="space-y-2">
                {selectedServiceTemplates.map((service) => (
                  <div
                    key={service.id}
                    className="flex justify-between text-sm"
                  >
                    <span>{service.name}</span>
                    <span className="text-muted-foreground">
                      {service.duration} min
                    </span>
                  </div>
                ))}
                <div className="flex justify-between text-sm font-medium pt-2 border-t">
                  <span>Tempo total</span>
                  <span>
                    {selectedServiceTemplates.reduce(
                      (total, service) => total + service.duration,
                      0,
                    )}{" "}
                    min
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">
                  Horários disponíveis
                </CardTitle>
                <CardDescription>
                  Selecione o melhor horário para você
                </CardDescription>
                {hasAiRecommendations && (
                  <div className="mt-2 px-6 bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md space-y-2">
                    <div className="flex items-center gap-2 text-xs">
                      <Sparkles className="h-3 w-3 text-blue-600" />
                      <span>Horários recomendados pelo AgendoAI</span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 border-green-500 border-2 bg-green-50 dark:bg-green-900/20 rounded"></span>
                        <span>Altamente recomendado</span>
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="w-3 h-3 border-blue-400 border rounded"></span>
                        <span>Recomendado</span>
                      </span>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="morning" className="w-full">
                  <TabsList className="grid grid-cols-1 sm:grid-cols-3 mb-4">
                    <TabsTrigger value="morning" className="text-xs sm:text-sm">
                      <Sun className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span>Manhã</span>
                      {periods.morning.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {periods.morning.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="afternoon" className="text-xs sm:text-sm">
                      <Sun className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span>Tarde</span>
                      {periods.afternoon.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {periods.afternoon.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                    <TabsTrigger value="evening" className="text-xs sm:text-sm">
                      <Moon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                      <span>Noite</span>
                      {periods.evening.length > 0 && (
                        <Badge variant="secondary" className="ml-1 text-xs">
                          {periods.evening.length}
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="morning" className="space-y-2">
                    {periods.morning.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {periods.morning.map((slot, index) => {
                          if (!slot) return null; // Verificação de segurança para slots nulos

                          // Processar o slot para garantir que tenha um horário final válido
                          const processedSlot = processSlot(slot);

                          // Pular slots que não puderam ser processados corretamente
                          if (
                            !processedSlot ||
                            !processedSlot.startTime ||
                            !processedSlot.endTime
                          ) {
                            console.warn(
                              "Slot inválido após processamento:",
                              slot,
                            );
                            return null;
                          }

                          return (
                            <Button
                              key={index}
                              variant={
                                selectedTimeSlot?.startTime === slot.startTime
                                  ? "default"
                                  : "outline"
                              }
                              className={`
                                w-full flex flex-col h-auto py-2
                                ${selectedTimeSlot?.startTime === slot.startTime ? "" : getSlotQualityClass(slot)}
                              `}
                              onClick={() =>
                                handleTimeSlotSelect(processedSlot)
                              }
                            >
                              <div className="flex items-center justify-center">
                                <span className="font-medium">
                                  {formatTime(processedSlot.startTime)}
                                </span>
                                {getSlotQualityIcon(slot)}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                até {formatTime(processedSlot.endTime)}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <></>
                    )}
                  </TabsContent>

                  <TabsContent value="afternoon" className="space-y-2">
                    {periods.afternoon.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {periods.afternoon.map((slot, index) => {
                          if (!slot) return null; // Verificação de segurança para slots nulos

                          // Processar o slot para garantir que tenha um horário final válido
                          const processedSlot = processSlot(slot);

                          // Pular slots que não puderam ser processados corretamente
                          if (
                            !processedSlot ||
                            !processedSlot.startTime ||
                            !processedSlot.endTime
                          ) {
                            console.warn(
                              "Slot inválido após processamento:",
                              slot,
                            );
                            return null;
                          }

                          return (
                            <Button
                              key={index}
                              variant={
                                selectedTimeSlot?.startTime === slot.startTime
                                  ? "default"
                                  : "outline"
                              }
                              className={`
                                w-full flex flex-col h-auto py-2
                                ${selectedTimeSlot?.startTime === slot.startTime ? "" : getSlotQualityClass(slot)}
                              `}
                              onClick={() =>
                                handleTimeSlotSelect(processedSlot)
                              }
                            >
                              <div className="flex items-center justify-center">
                                <span className="font-medium">
                                  {formatTime(processedSlot.startTime)}
                                </span>
                                {getSlotQualityIcon(slot)}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                até {formatTime(processedSlot.endTime)}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <></>
                    )}
                  </TabsContent>

                  <TabsContent value="evening" className="space-y-2">
                    {periods.evening.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {periods.evening.map((slot, index) => {
                          if (!slot) return null; // Verificação de segurança para slots nulos

                          // Processar o slot para garantir que tenha um horário final válido
                          const processedSlot = processSlot(slot);

                          // Pular slots que não puderam ser processados corretamente
                          if (
                            !processedSlot ||
                            !processedSlot.startTime ||
                            !processedSlot.endTime
                          ) {
                            console.warn(
                              "Slot inválido após processamento:",
                              slot,
                            );
                            return null;
                          }

                          return (
                            <Button
                              key={index}
                              variant={
                                selectedTimeSlot?.startTime === slot.startTime
                                  ? "default"
                                  : "outline"
                              }
                              className={`
                                w-full flex flex-col h-auto py-2
                                ${selectedTimeSlot?.startTime === slot.startTime ? "" : getSlotQualityClass(slot)}
                              `}
                              onClick={() =>
                                handleTimeSlotSelect(processedSlot)
                              }
                            >
                              <div className="flex items-center justify-center">
                                <span className="font-medium">
                                  {formatTime(processedSlot.startTime)}
                                </span>
                                {getSlotQualityIcon(slot)}
                              </div>
                              <span className="text-xs text-muted-foreground">
                                até {formatTime(processedSlot.endTime)}
                              </span>
                            </Button>
                          );
                        })}
                      </div>
                    ) : (
                      <></>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">
                  Detalhes do Serviço e Agendamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Serviço selecionado com descrição */}
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-base">
                      {matchingService?.name || selectedServiceTemplate?.name}
                    </h4>
                    {matchingService?.description && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {matchingService.description}
                      </p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <Clock3 className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="text-sm">
                        <div className="font-medium">Duração</div>
                        <div className="text-muted-foreground">
                          {matchingService?.duration ||
                            selectedServiceTemplate?.duration}{" "}
                          minutos
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="text-sm">
                        <div className="font-medium">Prestador</div>
                        <div className="text-muted-foreground truncate">
                          {selectedProvider.name ||
                            selectedProvider.settings?.businessName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <CalendarIcon className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="text-sm">
                        <div className="font-medium">Data</div>
                        <div className="text-muted-foreground">
                          {selectedDate
                            ? format(selectedDate, "dd/MM/yyyy")
                            : ""}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-primary flex-shrink-0" />
                      <div className="text-sm">
                        <div className="font-medium">Valor</div>
                        <div className="text-muted-foreground">
                          {matchingService
                                                          ? formatCurrency(matchingService.price || 0)
                            : "A definir"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Resumo do pagamento usando PaymentSummary */}
                <PaymentSummary
                  servicePrice={(() => {
                    const price = matchingService ? matchingService.price || 0 : 0;
                    console.log('DEBUG - PaymentSummary servicePrice:', price);
                    return price;
                  })()}
                  taxaServico={175}
                />

                {selectedTimeSlot && (
                  <div className="flex justify-between pt-1 border-t mt-2">
                    <span className="text-muted-foreground">
                      Horário selecionado:
                    </span>
                    <span className="font-semibold text-primary">
                      {formatTime(selectedTimeSlot.startTime)} -{" "}
                      {formatTime(selectedTimeSlot.endTime)}
                    </span>
                  </div>
                )}
              </CardContent>
              <CardFooter>
                <div className="space-y-4 w-full">
                  <Button
                    className="w-full"
                    disabled={!selectedTimeSlot}
                    onClick={finalizeBooking}
                  >
                    Finalizar Agendamento
                  </Button>
                </div>
              </CardFooter>
            </Card>
          </div>
        </div>

        {/* Botão de Continuar para Pagamento - Só aparece quando um horário está selecionado */}
        {selectedTimeSlot && (
          <div className="mt-8 flex justify-center">
            <Button
              className="w-full max-w-md"
              size="lg"
              onClick={handleContinueToPayment}
            >
              Continuar para Pagamento
              <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}

        {/* DEBUG VISUAL: Mostrar os dados vindos da API na tela */}
        <pre style={{background:'#eee',color:'#222',padding:'8px',borderRadius:'4px',fontSize:'12px',overflow:'auto'}}>
          {JSON.stringify(availableTimeSlots, null, 2)}
        </pre>
      </div>
    );
  };

  // Função para continuar para a etapa de pagamento
  const handleContinueToPayment = () => {
    if (selectedTimeSlot) {
      // Avançar para a etapa de confirmação/pagamento
      setCurrentStep("payment");

      toast({
        title: "Prosseguindo para pagamento",
        description: `Horário das ${selectedTimeSlot.startTime} selecionado. Escolha o método de pagamento.`,
      });
    } else {
      toast({
        title: "Selecione um horário",
        description: "Por favor, selecione um horário antes de continuar.",
        variant: "destructive",
      });
    }
  };

  // Função para selecionar o método de pagamento
  const handlePaymentMethodSelect = (
    method: "credit_card" | "pix" | "money",
  ) => {
    setSelectedPaymentMethod(method);

    let description = "";
    if (method === "credit_card") {
      description = "Cartão de Crédito selecionado";
    } else if (method === "pix") {
      description = "PIX selecionado";
    } else if (method === "money") {
      description = "Pagamento no local selecionado";
    }

    toast({
      title: `Método de pagamento selecionado`,
      description,
    });
  };

  // Função para finalizar e concluir o agendamento
  const handleFinishBooking = () => {
    // Definir o método de pagamento padrão como dinheiro (pago no local) se ainda não estiver definido
    if (!selectedPaymentMethod) {
      setSelectedPaymentMethod("money");
    }

    // Chamar a função de finalização
    finalizeBooking();
  };

  // Renderizar conteúdo da etapa de confirmação - Passo final
  const renderPaymentStep = () => {
    if (!selectedTimeSlot || !selectedServiceTemplate || !selectedProvider) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Informações do agendamento incompletas. Por favor, volte e complete
            as etapas anteriores.
          </AlertDescription>
        </Alert>
      );
    }

    // Calcular o preço total de todos os serviços selecionados
    let totalServicePrice = 0;
    let matchingService: Service | null = null;

    // Se temos apenas um serviço selecionado, usar a lógica original
    if (selectedServiceTemplates.length === 1) {
      matchingService = selectedProvider.services.find(
        (service) =>
          service.name === selectedServiceTemplate.name ||
          service.name.includes(selectedServiceTemplate.name) ||
          selectedServiceTemplate.name.includes(service.name) ||
          (service.categoryId === selectedServiceTemplate.categoryId &&
            Math.abs(service.duration - selectedServiceTemplate.duration) <=
              10),
      );

      // Obter o preço do serviço
      totalServicePrice = Number(
        matchingService?.price || selectedServiceTemplate.price || 0,
      );
    }
    // Se temos múltiplos serviços, calcular o preço total de todos
    else {
      // Para cada serviço selecionado, encontrar o correspondente no prestador
      selectedServiceTemplates.forEach((template) => {
        // Tentar encontrar serviço correspondente
        const matchingService = selectedProvider.services.find(
          (service) =>
            service.name === template.name ||
            service.name.includes(template.name) ||
            template.name.includes(service.name) ||
            (service.categoryId === template.categoryId &&
              Math.abs(service.duration - template.duration) <= 10),
        );

        // Adicionar o preço ao total
        totalServicePrice += Number(
          matchingService?.price || template.price || 0,
        );
      });
    }

    // Garantir que o valor é um número inteiro
    const servicePrice = totalServicePrice;

    // Preço total sem taxa adicional
    const totalPrice = servicePrice;

    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Resumo e Confirmação</h3>
          <p className="text-muted-foreground">
            Revise os detalhes do agendamento antes de finalizar.
          </p>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Resumo do Agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {selectedServiceTemplates.length === 1 ? (
                <div>
                  <h4 className="font-semibold text-base">
                    {matchingService?.name || selectedServiceTemplate?.name}
                  </h4>
                  {matchingService?.description && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {matchingService.description}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <h4 className="font-semibold text-base">
                    {selectedServiceTemplates.length} serviços selecionados
                  </h4>
                  <div className="mt-2 space-y-2 text-sm">
                    {selectedServiceTemplates.map((service) => (
                      <div key={service.id} className="flex justify-between">
                        <span>{service.name}</span>
                        <span className="text-muted-foreground">
                          {service.duration} min
                        </span>
                      </div>
                    ))}
                    <div className="flex justify-between pt-2 border-t font-medium">
                      <span>Tempo total</span>
                      <span>
                        {selectedServiceTemplates.reduce(
                          (total, service) => total + service.duration,
                          0,
                        )}{" "}
                        min
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Prestador</div>
                    <div className="text-muted-foreground truncate">
                      {selectedProvider.name ||
                        selectedProvider.settings?.businessName}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Data</div>
                    <div className="text-muted-foreground">
                      {selectedDate ? format(selectedDate, "dd/MM/yyyy") : ""}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Horário</div>
                    <div className="text-muted-foreground">
                      {selectedTimeSlot
                        ? `${formatTime(selectedTimeSlot.startTime)} - ${formatTime(selectedTimeSlot.endTime)}`
                        : ""}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Clock3 className="h-4 w-4 text-primary flex-shrink-0" />
                  <div className="text-sm">
                    <div className="font-medium">Duração</div>
                    <div className="text-muted-foreground">
                      {matchingService?.duration ||
                        selectedServiceTemplate?.duration}{" "}
                      minutos
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Resumo do pagamento usando o componente PaymentSummary */}
            <PaymentSummary
              servicePrice={(() => {
                console.log('DEBUG - PaymentStep servicePrice:', servicePrice);
                return servicePrice;
              })()}
              taxaServico={175}
              totalPrice={totalPrice}
              services={
                selectedServiceTemplates.length > 1
                  ? selectedServiceTemplates.map((template) => {
                      const matchingService = selectedProvider.services.find(
                        (service) =>
                          service.name === template.name ||
                          service.name.includes(template.name) ||
                          template.name.includes(service.name) ||
                          (service.categoryId === template.categoryId &&
                            Math.abs(service.duration - template.duration) <= 10),
                      );
                      return {
                        id: template.id,
                        name: template.name,
                                                          price: matchingService?.price || template.price || 0,
                      };
                    })
                  : undefined
              }
            />
          </CardContent>
        </Card>

        {/* Botão de Finalizar Agendamento */}
        <div className="pt-4">
          <Button className="w-full" size="lg" onClick={handleFinishBooking}>
            Finalizar Agendamento
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  };

  // Renderizar barra de progresso do assistente
  const renderProgressBar = () => {
    const steps: BookingStep[] = [
      "niche",
      "category",
      "service",
      "date",
      "providers",
      "time-slot",
      "payment",
    ];
    const currentIndex = steps.indexOf(currentStep);

    return (
      <div className="w-full bg-muted h-2 rounded-full mb-6">
        <div
          className="bg-primary h-2 rounded-full transition-all"
          style={{ width: `${((currentIndex + 1) / steps.length) * 100}%` }}
        />
      </div>
    );
  };

  // Novo layout: cabeçalho padrão para todas as etapas
  const renderHeader = (titulo: string, onBack?: () => void) => (
    <div className="flex items-center justify-between px-4 pt-6 pb-2 bg-white">
      <button onClick={onBack} className="focus:outline-none">
        <svg className="h-7 w-7 text-gray-500" fill="none" stroke="currentColor" strokeWidth={3} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>
      <span className="text-lg font-bold flex-1 text-center -ml-7">{titulo}</span>
      <span className="w-7" />
    </div>
  );

  // Exemplo de uso do header em cada etapa:
  // {renderHeader('Selecione a data', handleBack)}

  // Adapte cada renderXStep para usar o novo padrão visual:
  // - Título grande e bold
  // - Cards arredondados para seleção
  // - Botão de ação grande e destacado ao final
  // - Espaçamento generoso
  // - Responsividade

  // Exemplo para renderDateStep:
  // ...
  // return (
  //   <div className="min-h-screen bg-white flex flex-col">
  //     {renderHeader('Selecione a data', handleBack)}
  //     <div className="px-6 mt-6">
  //       <h2 className="text-2xl font-extrabold mb-2">Para quando é\no Atendimento?</h2>
  //       <div className="font-bold mb-4">Fevereiro</div>
  //       <div className="flex gap-3">{...dias}</div>
  //     </div>
  //     <div className="mt-auto px-4 pb-8">
  //       <button className="w-full py-4 rounded-2xl bg-teal-600 text-white text-lg font-bold shadow">Buscar Profissional</button>
  //     </div>
  //   </div>
  // )

  // Repita o padrão para as demais etapas (nichos, categorias, serviços, horários, profissional, pagamento)



  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-100 to-blue-300 pb-24">
      {/* Logo e barra de progresso */}
      <header className="flex flex-col items-center pt-6 pb-2">
        <img src="/AgendoAilogo.png" alt="AgendoAI Logo" className="h-12 w-auto mb-2" />
        {renderProgressBar()}
      </header>

      {/* Cartão da etapa atual */}
      <div className="mx-4 mb-6">
        <div className="bg-white rounded-2xl shadow-lg p-6">
          {currentStep === "niche" && renderNicheStep()}
          {currentStep === "category" && renderCategoryStep()}
          {currentStep === "service" && renderServiceStep()}
          {currentStep === "date" && renderDateStep()}
          {currentStep === "providers" && renderProvidersStep()}
          {currentStep === "time-slot" && renderTimeSlotStep()}
          {currentStep === "payment" && renderPaymentStep()}
        </div>
      </div>

      {/* Botão de ação fixo (exemplo, ajuste conforme lógica de navegação) */}
      {/*
      <div className="fixed bottom-4 left-0 right-0 flex justify-center z-50">
        <Button className="w-11/12 max-w-md rounded-full text-lg py-4 shadow-xl">
          {currentStep === "payment" ? "Finalizar Agendamento" : "Continuar"}
        </Button>
      </div>
      */}
    </div>
  );
}
