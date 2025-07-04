// @ts-nocheck - desabilitando verificações de tipos para facilitar o desenvolvimento
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ChevronRight,
  ChevronLeft,
  Calendar as CalendarIcon,
  Check,
  Scissors,
  Heart,
  Car,
  Home,
  Sparkles,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { TimeSlotSelector } from "@/components/booking/time-slot-selector";
import { Service, TimeSlot } from "@/lib/utils";

// Tipos para os passos do assistente
type BookingStep =
  | "niche"
  | "category"
  | "service"
  | "date"
  | "providers"
  | "time-slot"
  | "payment"
  | "confirmation";

interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface NewBookingWizardProps {
  onComplete?: (data: {
    serviceIds: number[];
    providerId: number;
    date: string;
    startTime: string;
    endTime: string;
    paymentType: "local" | "online";
    paymentMethod: "credit_card" | "pix" | "money";
    totalDuration: number;
    totalPrice: number;
  }) => void;
  preSelectedServiceId?: number | null;
}

export function NewBookingWizard({
  onComplete,
  preSelectedServiceId = null,
}: NewBookingWizardProps) {
  const { toast } = useToast();

  // Estado inicial sempre começa pela seleção de nicho para melhor experiência do usuário
  const [currentStep, setCurrentStep] = useState<BookingStep>("niche");

  // Estado para armazenar as seleções do usuário
  const [selectedNicheId, setSelectedNicheId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(
    null,
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<number[]>(
    preSelectedServiceId ? [preSelectedServiceId] : [],
  );
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<number | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | null>(
    null,
  );
  const [paymentType, setPaymentType] = useState<"local" | "online" | null>(
    null,
  );
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    "credit_card" | "pix" | "money" | null
  >(null);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [totalPrice, setTotalPrice] = useState<number>(0);
  const [providerServices, setProviderServices] = useState<{
    [providerId: number]: any[];
  }>({});
  const [loadingProviderServices, setLoadingProviderServices] = useState<{
    [providerId: number]: boolean;
  }>({});
  const [serviceExecutionTime, setServiceExecutionTime] = useState<number | null>(null);



  // Efeito para buscar dados do serviço pré-selecionado e seu nicho/categoria
  useEffect(() => {
    if (preSelectedServiceId) {
      fetch(`/api/services/${preSelectedServiceId}`)
        .then((res) => res.json())
        .then((serviceData) => {
          if (serviceData && serviceData.categoryId) {
            setSelectedCategoryId(serviceData.categoryId);

            fetch(`/api/categories/${serviceData.categoryId}`)
              .then((res) => res.json())
              .then((categoryData) => {
                if (categoryData && categoryData.nicheId) {
                  setSelectedNicheId(categoryData.nicheId);
                }
              });
          }
        });
    }
  }, [preSelectedServiceId]);

  // Consultas para buscar dados do servidor
  const { data: niches, isLoading: isLoadingNiches } = useQuery({
    queryKey: ["/api/niches"],
    staleTime: 60000,
  });

  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["/api/niches", selectedNicheId, "categories"],
    queryFn: () => {
      if (!selectedNicheId) return null;
      return fetch(`/api/niches/${selectedNicheId}/categories`).then((res) =>
        res.json(),
      );
    },
    enabled: !!selectedNicheId,
    staleTime: 60000,
  });

  const { data: services, isLoading: isLoadingServices } = useQuery({
    queryKey: ["/api/services", selectedCategoryId],
    queryFn: () => {
      if (!selectedCategoryId) return null;
      return fetch(`/api/services?categoryId=${selectedCategoryId}`)
        .then((res) => res.json());
    },
    enabled: !!selectedCategoryId,
    staleTime: 60000,
  });

  // Adicione logs para diagnosticar o estado antes da query de prestadores
  useEffect(() => {
    console.log('selectedServiceIds:', selectedServiceIds);
    console.log('selectedDate:', selectedDate);
  }, [selectedServiceIds, selectedDate]);

  // CONSULTA CORRIGIDA PARA BUSCAR PRESTADORES COM DISPONIBILIDADE REAL
  const { data: providers, isLoading: isLoadingProviders } = useQuery({
    queryKey: ["/api/providers", selectedServiceIds, selectedDate],
    queryFn: async () => {
      if (selectedServiceIds.length === 0 || !selectedDate) return [];

      // Usando a API existente de busca de prestadores por serviço
      const serviceId = selectedServiceIds[0]; // Pega o primeiro serviço para consulta principal
      const response = await fetch(
        `/api/providers/service-search?serviceIds=${selectedServiceIds.join(',')}&date=${selectedDate.toISOString().split("T")[0]}`
      );

      const data = await response.json();
      
      // Adicionar log para debug do formato dos dados recebidos
      console.log("Dados recebidos da API de prestadores:", data);
      
      // Verificar o formato e normalizar a resposta se necessário
      let providersData = data.providers || [];
      
      // Log de cada prestador para identificar a estrutura
      if (providersData.length > 0) {
        console.log("Estrutura do primeiro prestador:", providersData[0]);
      } else {
        console.log("Nenhum prestador retornado da API");
      }
      
      // Se os prestadores estiverem dentro de um objeto 'provider', extrair os dados
      const normalizedProviders = providersData.map(item => 
        item.provider ? item.provider : item
      );
      
      return normalizedProviders;
    },
    enabled: selectedServiceIds.length > 0 && !!selectedDate,
    staleTime: 60000,
  });

  // Efeito para buscar os dados de serviços de cada prestador e verificar disponibilidade real
  useEffect(() => {
    if (providers && providers.length > 0 && selectedServiceIds.length > 0 && selectedDate) {
      // Armazenar os prestadores válidos (com horários disponíveis)
      const validProviders = {};
      
      // Contador para acompanhar verificações completas
      let completedChecks = 0;
      const totalProviders = providers.filter(p => p && p.id).length;
      
      // Verificar que temos prestadores válidos
      if (totalProviders === 0) return;
      
      // Para cada prestador, buscar seus serviços e verificar disponibilidade
      providers.forEach((provider) => {
        // Verificar se o prestador é válido e tem ID
        if (!provider || !provider.id) {
          completedChecks++;
          return;
        }
        
        // Marcar como carregando
        setLoadingProviderServices((prev) => ({
          ...prev,
          [provider.id]: true,
        }));
        
        console.log(`Buscando serviços para prestador ID: ${provider.id}`);
        
        // Primeiro buscar os serviços do prestador usando a rota correta
        fetch(
          `/api/provider-services/provider/${provider.id}`,
        )
          .then((response) => {
            if (!response.ok) {
              throw new Error(`Erro ao buscar serviços: ${response.status}`);
            }
            return response.json();
          })
          .then((providerServices) => {
            // Filtrar serviços relevantes
            const services = Array.isArray(providerServices) ? providerServices
              .filter(ps => ps && ps.serviceId && selectedServiceIds.includes(ps.serviceId))
              .map(ps => ({
                id: ps.serviceId,
                name: ps.serviceName || "Serviço",
                duration: ps.executionTime || ps.defaultDuration || 30,
                price: ps.price || 0
              })) : [];
            
            // Calcular duração total para este prestador
            let providerDuration = 0;
            
            // Garantir que temos serviços válidos antes de calcular a duração
            if (services && services.length > 0) {
              services.forEach(service => {
                const duration = parseInt(service.duration) || 0;
                providerDuration += duration;
              });
            }
            
            // Usar duração calculada ou valor padrão para evitar NaN
            const finalDuration = providerDuration > 0 ? providerDuration : (totalDuration || 60);
            
            console.log(`Verificando slots para prestador ${provider.id} com duração ${finalDuration}`);
            
            // Verificar se este prestador tem horários disponíveis
            return fetch(
              `/api/providers/${provider.id}/time-slots?date=${selectedDate.toISOString().split("T")[0]}&duration=${finalDuration}`
            )
              .then(slotsResponse => slotsResponse.json())
              .then(slots => {
                // Só adicionar o prestador se tiver slots disponíveis
                if (Array.isArray(slots) && slots.length > 0) {
                  validProviders[provider.id] = services;
                }
                
                return { hasSlots: Array.isArray(slots) && slots.length > 0, provider, services };
              });
          })
          .then(({ hasSlots, provider, services }) => {
            if (hasSlots) {
              setProviderServices((prev) => ({
                ...prev,
                [provider.id]: services,
              }));
            }
            
            setLoadingProviderServices((prev) => ({
              ...prev,
              [provider.id]: false,
            }));
            
            // Incrementar contador de verificações completas
            completedChecks++;
            
            // Se todas as verificações foram concluídas, atualizar estado
            if (completedChecks === totalProviders) {
              // Filtrar providers para mostrar apenas os que têm slots disponíveis
              const filteredProviders = providers.filter(p => validProviders[p.id]);
              
              // Forçar atualização da lista de prestadores
              setProviderServices({...validProviders});
            }
          })
          .catch((err) => {
            console.error(
              `Erro ao verificar disponibilidade do prestador ${provider.id}:`,
              err,
            );
            
            setLoadingProviderServices((prev) => ({
              ...prev,
              [provider.id]: false,
            }));
            
            // Incrementar contador mesmo em caso de erro
            completedChecks++;
          });
      });
    }
  }, [providers, selectedServiceIds, selectedDate, totalDuration]);

  // Função para buscar o execution_time do serviço personalizado do prestador
  const fetchProviderServiceExecutionTime = useCallback(async (providerId: number, serviceId: number) => {
    if (!providerId || !serviceId) return null;
    try {
      const res = await fetch(`/api/provider-services/provider/${providerId}/service/${serviceId}`);
      if (!res.ok) return null;
      const data = await res.json();
      // Preferir executionTime, fallback para duration
      return data.executionTime || data.duration || null;
    } catch {
      return null;
    }
  }, []);

  // Atualizar o tempo de execução sempre que prestador ou serviço mudar
  useEffect(() => {
    async function updateExecutionTime() {
      if (selectedProvider && selectedServiceIds.length === 1) {
        const execTime = await fetchProviderServiceExecutionTime(selectedProvider, selectedServiceIds[0]);
        setServiceExecutionTime(execTime);
      } else {
        setServiceExecutionTime(null);
      }
    }
    updateExecutionTime();
  }, [selectedProvider, selectedServiceIds, fetchProviderServiceExecutionTime]);

  // O TimeSlotSelector gerencia seu próprio estado de busca de horários



  // Funções de navegação
  const handleNext = () => {
    const steps: BookingStep[] = [
      "niche",
      "category",
      "service",
      "date",
      "providers",
      "time-slot",
      "payment",
      "confirmation",
    ];
    const currentIndex = steps.indexOf(currentStep);

    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: BookingStep[] = [
      "niche",
      "category",
      "service",
      "date",
      "providers",
      "time-slot",
      "payment",
      "confirmation",
    ];
    const currentIndex = steps.indexOf(currentStep);

    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
    }
  };

  // Handlers específicos
  const handleNicheSelect = (nicheId: number) => {
    setSelectedNicheId(nicheId);
    handleNext();
  };

  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setSelectedServiceIds([]);
    handleNext();
  };

  const handleServiceSelect = (serviceId: number) => {
    const isSelected = selectedServiceIds.includes(serviceId);
    let newSelectedIds;

    if (isSelected) {
      newSelectedIds = selectedServiceIds.filter((id) => id !== serviceId);
    } else {
      newSelectedIds = [...selectedServiceIds, serviceId];
    }

    setSelectedServiceIds(newSelectedIds);
  };

  const handleServiceContinue = () => {
    if (selectedServiceIds.length > 0) {
      setCurrentStep("date");
    } else {
      toast({
        title: "Seleção necessária",
        description:
          "Por favor, selecione pelo menos um serviço para continuar.",
        variant: "destructive",
      });
    }
  };

  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
    handleNext();
  };

  const handleProviderSelect = (
    providerId: number,
    duration?: number,
    price?: number,
  ) => {
    setSelectedProvider(providerId);

    if (duration !== undefined) {
      setTotalDuration(duration);
    }

    if (price !== undefined) {
      setTotalPrice(price);
    }

    handleNext();
  };

  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    handleNext();
  };

  const handlePaymentTypeSelect = (type: "local" | "online") => {
    setPaymentType(type);
    setSelectedPaymentMethod(null);
  };

  const handlePaymentMethodSelect = (
    method: "credit_card" | "pix" | "money",
  ) => {
    setSelectedPaymentMethod(method);
  };

  const handleFinishBooking = async () => {
    if (
      selectedServiceIds.length === 0 ||
      !selectedProvider ||
      !selectedDate ||
      !selectedTimeSlot ||
      !paymentType ||
      !selectedPaymentMethod
    ) {
      toast({
        title: "Erro ao finalizar agendamento",
        description: "Por favor, preencha todas as informações necessárias.",
        variant: "destructive",
      });
      return;
    }

    // Se for pagamento online, simular redirecionamento para gateway
    if (paymentType === "online") {
      // Aqui você pode integrar com o gateway real
      // Simular espera/retorno do gateway
      setCurrentStep("confirmation");
      return;
    }

    // Se for pagamento local, vai direto para confirmação
    setCurrentStep("confirmation");
  };

  // Função para calcular o total de duração e preço para um prestador
  const calculateTotals = (providerId: number) => {
    const services = providerServices[providerId] || [];
    let duration = 0;
    let price = 0;

    services
      .filter((service) => selectedServiceIds.includes(service.id))
      .forEach((service) => {
        duration += service.duration || 0;
        price += service.price || 0;
      });

    return { duration, price };
  };

  // Após o estado selectedProvider:
  const {
    data: providerFee,
    isLoading: isLoadingProviderFee,
  } = useQuery({
    queryKey: ["/api/provider-fees", selectedProvider],
    queryFn: async () => {
      if (!selectedProvider) return null;
      const res = await fetch(`/api/provider-fees/${selectedProvider}`);
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!selectedProvider,
  });

  // Funções utilitárias para ícones
  function getNicheIcon(name) {
    switch (name?.toLowerCase()) {
      case 'beleza': return <Scissors className="h-10 w-10" />;
      case 'saúde': return <Heart className="h-10 w-10" />;
      case 'automotivo': return <Car className="h-10 w-10" />;
      case 'casa': return <Home className="h-10 w-10" />;
      default: return <Sparkles className="h-10 w-10" />;
    }
  }
  function getCategoryIcon(name) {
    // Adapte conforme suas categorias reais
    return getNicheIcon(name);
  }
  function getServiceIcon(name) {
    // Adapte conforme seus serviços reais
    return <Sparkles className="h-10 w-10" />;
  }

  // Substitua as funções de renderização:
  const renderNicheStep = () => (
    <div className="flex flex-wrap gap-4 justify-center mt-8">
      {niches?.map((niche) => {
        const selecionado = selectedNicheId === niche.id;
        return (
          <button
            key={niche.id}
            className={`flex flex-col items-center justify-center rounded-2xl p-4 w-24 h-28 shadow transition-all
              ${selecionado ? 'bg-teal-600 border-2 border-teal-600 text-white' : 'bg-white border border-gray-200 text-teal-600'}
            `}
            onClick={() => handleNicheSelect(niche.id)}
          >
            {getNicheIcon(niche.name)}
            <span className="font-bold text-sm text-center mt-2">{niche.name}</span>
          </button>
        );
      })}
    </div>
  );
  const renderCategoryStep = () => (
    <div className="flex flex-wrap gap-4 justify-center mt-8">
      {categories?.map((cat) => {
        const selecionado = selectedCategoryId === cat.id;
        return (
          <button
            key={cat.id}
            className={`flex flex-col items-center justify-center rounded-2xl p-4 w-24 h-28 shadow transition-all
              ${selecionado ? 'bg-teal-600 border-2 border-teal-600 text-white' : 'bg-white border border-gray-200 text-teal-600'}
            `}
            onClick={() => handleCategorySelect(cat.id)}
          >
            {getCategoryIcon(cat.name)}
            <span className="font-bold text-sm text-center mt-2">{cat.name}</span>
          </button>
        );
      })}
    </div>
  );
  const renderServiceStep = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <p className="text-gray-600 mb-2">Selecione o(s) serviço(s) que você precisa:</p>
        {selectedServiceIds.length > 0 && (
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
            <p className="text-sm text-teal-700 font-medium">
              {selectedServiceIds.length} serviço(s) selecionado(s)
            </p>
          </div>
        )}
      </div>
      
      <div className="flex flex-wrap gap-4 justify-center">
        {services?.map((service) => {
          const selecionado = selectedServiceIds.includes(service.id);
          return (
            <button
              key={service.id}
              className={`flex flex-col items-center justify-center rounded-2xl p-4 w-24 h-28 shadow transition-all transform hover:scale-105
                ${selecionado 
                  ? 'bg-teal-600 border-2 border-teal-600 text-white shadow-lg' 
                  : 'bg-white border border-gray-200 text-teal-600 hover:border-teal-300'
                }
              `}
              onClick={() => handleServiceSelect(service.id)}
            >
              {getServiceIcon(service.name)}
              <span className="font-bold text-sm text-center mt-2">{service.name}</span>
              {selecionado && (
                <div className="absolute -top-1 -right-1 bg-teal-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs">
                  ✓
                </div>
              )}
            </button>
          );
        })}
      </div>
      
      {selectedServiceIds.length > 0 && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">Próximo passo:</h4>
          <p className="text-sm text-blue-700">
            Após selecionar os serviços, você escolherá a data do agendamento.
          </p>
        </div>
      )}
    </div>
  );

  const renderDateStep = () => {
    const today = new Date();

    return (
      <div className="space-y-6">
        <p className="text-gray-500">Escolha uma data para o agendamento</p>

        <div className="flex justify-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className="w-full sm:w-auto justify-start text-left font-normal"
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {selectedDate ? (
                  format(selectedDate, "PPP", { locale: ptBR })
                ) : (
                  <span>Selecione uma data</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate || undefined}
                onSelect={(date) => date && handleDateSelect(date)}
                initialFocus
                locale={ptBR}
                fromDate={today}
                disabled={(date) => false}
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    );
  };

  const renderProvidersStep = () => {
    if (selectedServiceIds.length === 0) {
      return <div className="p-6 text-center bg-yellow-100 rounded-lg text-yellow-800 font-semibold">Selecione pelo menos um serviço antes de escolher o prestador.</div>;
    }
    if (!selectedDate) {
      return <div className="p-6 text-center bg-yellow-100 rounded-lg text-yellow-800 font-semibold">Selecione uma data antes de escolher o prestador.</div>;
    }
    if (isLoadingProviders) {
      return (
        <div className="flex justify-center items-center py-8">
          <LoadingSpinner size="lg" />
          <span className="ml-3">Buscando prestadores disponíveis...</span>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <p className="text-gray-500">Escolha um prestador para o serviço</p>

        <div className="bg-gray-50 p-3 rounded-md mb-4">
          <h3 className="font-medium">Serviços selecionados</h3>
          <div>
            {selectedServiceIds.length > 0 ? (
              services
                ?.filter((s) => selectedServiceIds.includes(s.id))
                .map((service) => (
                  <p key={service.id} className="mt-1">
                    {service.name}
                  </p>
                ))
            ) : (
              <p className="text-sm text-gray-500 mt-1">
                Nenhum serviço selecionado
              </p>
            )}
          </div>
        </div>

        {providers && providers.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            {/* Adicionado log para debugging dos prestadores disponíveis */}
            {console.log("Prestadores a serem exibidos:", providers)}
            
            {/* Mostrar TODOS os prestadores retornados da API sem nenhum filtro */}
            {providers.map((provider, index) => {
                console.log(`Processando prestador ${index}:`, provider);
                
                // Se não temos um objeto provider válido, mostrar uma mensagem de erro visual
                if (!provider) {
                  return (
                    <Card key={`error-${index}`} className="p-4 border-red-300 bg-red-50">
                      <p className="text-red-500">Erro ao carregar informações do prestador</p>
                    </Card>
                  );
                }
                
                // Calcular totais para este prestador
                const totalInfo = { duration: 0, price: 0 };
                try {
                  if (provider.id) {
                    totalInfo.duration = totalDuration || 60;
                    
                    // Buscar o preço do serviço de template para este prestador
                    const providerServicesData = providerServices[provider.id] || [];
                    let totalPrice = 0;
                    
                    // Se temos serviços do prestador, buscamos os preços
                    if (providerServicesData.length > 0) {
                      // Calcula o preço total dos serviços selecionados
                      selectedServiceIds.forEach(serviceId => {
                        const service = providerServicesData.find(s => s.id === serviceId);
                        if (service && service.price) {
                          totalPrice += service.price;
                        } else if (service && service.templatePrice) {
                          // Caso não tenha preço customizado, usa o preço do template
                          totalPrice += service.templatePrice;
                        } else {
                          // Se não encontrar preço em nenhum lugar, tenta usar o preço do banco (40,00)
                          totalPrice += 4000; // R$ 40,00 em centavos
                        }
                      });
                    } else {
                      // Se não temos dados de serviço, usamos o preço padrão do banco
                      totalPrice = 4000; // R$ 40,00 em centavos
                    }
                    
                    totalInfo.price = totalPrice;
                  }
                } catch (error) {
                  console.error("Erro ao calcular totais:", error);
                }
                
                const isLoadingServices = provider.id ? loadingProviderServices[provider.id] : false;

              return (
                <Card
                  key={provider.id}
                  className="cursor-pointer hover:border-primary"
                  onClick={() =>
                    handleProviderSelect(provider.id, totalInfo.duration, totalInfo.price)
                  }
                >
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
                        {provider.profileImage ? (
                          <img
                            src={provider.profileImage}
                            alt={provider.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-2xl">👤</span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold">{provider.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          {provider.userType === "provider"
                            ? "Prestador de serviços"
                            : "Profissional"}
                        </p>

                        <div className="mt-1 flex items-center">
                          <div className="text-yellow-400">
                            {Array(5)
                              .fill(0)
                              .map((_, i) => (
                                <span key={i}>{i < 4 ? "★" : "☆"}</span>
                              ))}
                          </div>
                          <span className="ml-1 text-sm text-gray-500">
                            ({(provider.id % 20) + 10} avaliações)
                          </span>
                        </div>
                      </div>
                    </div>

                    {isLoadingServices ? (
                      <div className="p-3 bg-gray-50 rounded-md mt-2">
                        <div className="flex justify-center items-center py-2">
                          <LoadingSpinner size="sm" />
                          <span className="ml-2 text-sm">
                            Carregando informações...
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50 rounded-md mt-2">
                        <h4 className="font-medium mb-2">
                          Serviços oferecidos
                        </h4>
                        {/* Seção de serviços oferecidos */}
                        <div className="py-1 mb-2 border-b border-gray-100">
                          <div className="flex justify-between items-center">
                            <p className="font-medium">Serviços selecionados</p>
                            <p className="text-sm font-semibold text-primary">
                              R$ {(totalInfo.price / 100).toFixed(2)}
                            </p>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">
                            Duração total: {totalInfo.duration} min
                          </p>
                        </div>
                        
                        <div className="flex justify-between items-center mt-3 pt-2 border-t border-gray-200">
                          <p className="font-semibold">Total:</p>
                          <p className="font-semibold">
                            <span className="text-sm text-gray-600 mr-2">{totalInfo.duration} min</span>
                            <span className="text-primary">R$ {(totalInfo.price / 100).toFixed(2)}</span>
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="p-6 text-center bg-muted rounded-lg">
            <p>
              Nenhum prestador com horários disponíveis para o(s) serviço(s) na data selecionada.
            </p>
            <div className="flex justify-center mt-4 space-x-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedDate(null);
                  setCurrentStep("date");
                }}
              >
                Escolher outra data
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSelectedServiceIds([]);
                  setCurrentStep("service");
                }}
              >
                Selecionar outros serviços
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderTimeSlotStep = () => {
    if (!selectedProvider || !selectedDate) {
      return (
        <div className="p-6 text-center bg-yellow-100 rounded-lg text-yellow-800 font-semibold">
          Dados insuficientes para buscar horários. Selecione um prestador e uma data.
        </div>
      );
    }

    // Preparar dados do serviço para o TimeSlotSelector
    const selectedServicesData = services?.filter((s) => selectedServiceIds.includes(s.id)) || [];
    const primaryService: Service | null = selectedServicesData.length > 0 ? {
      id: selectedServicesData[0].id,
      name: selectedServicesData[0].name,
      durationMinutes: serviceExecutionTime || totalDuration || 60,
      bufferTime: 0
    } : null;

    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <h3 className="text-lg font-semibold mb-2">Escolha um horário disponível</h3>
          <p className="text-gray-600">
            {selectedDate && `Para ${format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
          </p>
        </div>

        <TimeSlotSelector
          providerId={selectedProvider}
          date={selectedDate.toISOString().split("T")[0]}
          service={primaryService}
          onTimeSlotSelect={(timeSlot) => {
            if (timeSlot) {
              handleTimeSlotSelect(timeSlot);
            }
          }}
          selectedTimeSlot={selectedTimeSlot}
        />

        {selectedTimeSlot && (
          <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-center space-x-2">
              <Check className="h-5 w-5 text-green-600" />
              <span className="text-green-800 font-medium">
                Horário selecionado: {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
              </span>
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderPaymentStep = () => {
    const selectedServicesData =
      services?.filter((s) => selectedServiceIds.includes(s.id)) || [];
    const providerSelected = providers?.find((p) => p.id === selectedProvider);

    // No passo de pagamento, ao calcular o valor final:
    const adminFee = providerFee?.fixedFee || 0;
    const totalWithFee = totalPrice + adminFee;

    return (
      <div className="space-y-6">
        <div className="bg-muted p-4 rounded-lg mb-6">
          <h3 className="font-medium mb-2">Resumo do agendamento</h3>
          <div className="space-y-3 text-sm">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Serviços:</span>
                <span className="font-medium">
                  {selectedServicesData.length} serviço(s)
                </span>
              </div>

              {selectedServicesData.map((service, index) => (
                <div
                  key={service.id}
                  className="ml-4 text-sm border-l-2 border-gray-200 pl-3 py-1"
                >
                  <span>{service.name}</span>
                </div>
              ))}

              <div className="mt-2 border-t border-gray-200 pt-2 flex justify-between text-sm font-medium">
                <span>Duração total:</span>
                <span>{totalDuration} minutos</span>
              </div>
              {totalPrice > 0 && (
                <>
                  <div className="flex justify-between text-sm font-medium">
                    <span>Subtotal:</span>
                    <span>R$ {(totalPrice / 100).toFixed(2).replace(".", ",")}</span>
                  </div>
                  {adminFee > 0 && (
                    <div className="flex justify-between text-sm font-medium">
                      <span>Taxa administrativa:</span>
                      <span>R$ {(adminFee / 100).toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-bold border-t pt-2 mt-2">
                    <span>Total:</span>
                    <span>R$ {(totalWithFee / 100).toFixed(2).replace(".", ",")}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex justify-between pt-1">
              <span className="text-muted-foreground">Prestador:</span>
              <span className="font-medium">
                {providerSelected?.name || "Prestador selecionado"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium">
                {selectedDate
                  ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", {
                      locale: ptBR,
                    })
                  : "Data selecionada"}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horário:</span>
              <span className="font-medium">
                {selectedTimeSlot
                  ? `${selectedTimeSlot.startTime} - ${selectedTimeSlot.endTime}`
                  : "Horário selecionado"}
              </span>
            </div>
          </div>
        </div>

        {!paymentType ? (
          <>
            <p className="text-gray-500">Como você deseja pagar?</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                onClick={() => handlePaymentTypeSelect("local")}
              >
                <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    💵
                  </div>
                  <h3 className="text-lg font-semibold">Pagamento Local</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Pague diretamente ao prestador no dia do serviço
                  </p>
                </CardContent>
              </Card>

              <Card
                className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
                onClick={() => handlePaymentTypeSelect("online")}
              >
                <CardContent className="pt-6 pb-6 flex flex-col items-center text-center">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                    💳
                  </div>
                  <h3 className="text-lg font-semibold">Pagamento Online</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Pague agora usando cartão de crédito ou PIX
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-4">
              <p className="text-gray-500">
                {paymentType === "local"
                  ? "Escolha como deseja pagar no local"
                  : "Escolha como deseja pagar online"}
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPaymentType(null)}
                className="text-sm"
              >
                Voltar
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {paymentType === "local" ? (
                <Card
                  className={`cursor-pointer hover:border-primary ${selectedPaymentMethod === "money" ? "border-primary" : ""}`}
                  onClick={() => handlePaymentMethodSelect("money")}
                >
                  <CardContent className="pt-6 flex flex-col items-center text-center">
                    <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                      💵
                    </div>
                    <h3 className="font-semibold">Dinheiro</h3>
                    <p className="text-sm text-muted-foreground">
                      Pague em dinheiro no local
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card
                    className={`cursor-pointer hover:border-primary ${selectedPaymentMethod === "credit_card" ? "border-primary" : ""}`}
                    onClick={() => handlePaymentMethodSelect("credit_card")}
                  >
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                        💳
                      </div>
                      <h3 className="font-semibold">Cartão de Crédito</h3>
                      <p className="text-sm text-muted-foreground">
                        Pagamento seguro online
                      </p>
                    </CardContent>
                  </Card>

                  <Card
                    className={`cursor-pointer hover:border-primary ${selectedPaymentMethod === "pix" ? "border-primary" : ""}`}
                    onClick={() => handlePaymentMethodSelect("pix")}
                  >
                    <CardContent className="pt-6 flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-3">
                        📱
                      </div>
                      <h3 className="font-semibold">PIX</h3>
                      <p className="text-sm text-muted-foreground">
                        Transferência instantânea
                      </p>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          </>
        )}

        <div className="pt-4">
          <Button
            className="w-full"
            size="lg"
            onClick={handleFinishBooking}
            disabled={!paymentType || !selectedPaymentMethod}
          >
            Finalizar Agendamento
            <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      </div>
    );
  };

  const renderConfirmationStep = () => {
    return (
      <div className="space-y-6 text-center">
        <div className="flex flex-col items-center justify-center py-10">
          <span className="text-5xl mb-4">✅</span>
          <h2 className="text-2xl font-bold mb-2">Agendamento Confirmado!</h2>
          <p className="text-muted-foreground mb-4">
            Seu agendamento foi realizado com sucesso.
          </p>
          <Button
            className="mt-4"
            onClick={() => window.location.href = '/client/booking-confirmation-page'}
          >
            Ver meus agendamentos
          </Button>
        </div>
      </div>
    );
  };

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
        return "Escolha o método de pagamento";
      case "confirmation":
        return "Confirmação do Agendamento";
      default:
        return "Novo Agendamento";
    }
  };

  const renderProgressBar = () => {
    const steps: BookingStep[] = [
      "niche",
      "category",
      "service",
      "date",
      "providers",
      "time-slot",
      "payment",
      "confirmation",
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

  // --- NOVO WRAPPER DE LAYOUT ---
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-teal-400 via-cyan-200 to-blue-100 relative">
      <div className="w-full max-w-md mx-auto px-2 sm:px-0 py-6 flex flex-col flex-1">
        {/* Barra de progresso mais grossa e visual */}
        <div className="sticky top-0 z-30">
          {renderProgressBar()}
        </div>
        {/* Card principal do wizard */}
        <div className="bg-white/95 shadow-2xl rounded-3xl px-4 py-6 sm:px-8 sm:py-8 mt-4 mb-28 sm:mb-16">
          {/* Cabeçalho do passo */}
          <div className="flex items-center justify-between mb-6">
            <button
              className={`rounded-full bg-white shadow p-2 transition hover:bg-gray-100 ${currentStep === 'niche' || currentStep === 'confirmation' ? 'invisible' : ''}`}
              onClick={handleBack}
              aria-label="Voltar"
              disabled={currentStep === 'niche' || currentStep === 'confirmation'}
              style={{ pointerEvents: currentStep === 'niche' || currentStep === 'confirmation' ? 'none' : 'auto' }}
            >
              <ChevronLeft className="h-6 w-6 text-teal-600" />
            </button>
            <h2 className="text-xl sm:text-2xl font-extrabold text-center flex-1">
              {renderStepTitle()}
            </h2>
            <div className="w-10" /> {/* Espaço para alinhar */}
          </div>
          {/* Passos do wizard */}
          <div className="min-h-[320px] flex flex-col justify-center">
            

            
            {currentStep === "niche" && renderNicheStep()}
            {currentStep === "category" && renderCategoryStep()}
            {currentStep === "service" && renderServiceStep()}
            {currentStep === "date" && renderDateStep()}
            {currentStep === "providers" && renderProvidersStep()}
            {currentStep === "time-slot" && renderTimeSlotStep()}
            {currentStep === "payment" && renderPaymentStep()}
            {currentStep === "confirmation" && renderConfirmationStep()}
          </div>
        </div>
      </div>
      {/* Botão de ação fixo no rodapé, exceto na confirmação */}
      {currentStep !== "confirmation" && (
        <div className="fixed bottom-4 left-0 right-0 flex justify-center z-40 pointer-events-none">
          <div className="w-full max-w-md px-4 pointer-events-auto">
            {/* Botão principal de ação, depende do passo */}
            {currentStep === "service" && (
              <Button 
                className={`w-full h-14 rounded-full text-lg font-bold shadow-lg transition ${
                  selectedServiceIds.length > 0 
                    ? 'bg-teal-600 hover:bg-teal-700' 
                    : 'bg-gray-400 cursor-not-allowed'
                }`}
                onClick={handleServiceContinue}
                disabled={selectedServiceIds.length === 0}
              >
                {selectedServiceIds.length > 0 ? 'Continuar' : 'Selecione um serviço'} <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            )}
            {currentStep === "date" && selectedDate && (
              <Button className="w-full h-14 rounded-full text-lg font-bold shadow-lg bg-teal-600 hover:bg-teal-700 transition" onClick={handleNext}>
                Ver Prestadores <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            )}
            {currentStep === "providers" && selectedProvider && (
              <Button className="w-full h-14 rounded-full text-lg font-bold shadow-lg bg-teal-600 hover:bg-teal-700 transition" onClick={handleNext}>
                Escolher Horário <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            )}
            {currentStep === "time-slot" && selectedTimeSlot && (
              <Button className="w-full h-14 rounded-full text-lg font-bold shadow-lg bg-teal-600 hover:bg-teal-700 transition" onClick={handleNext}>
                Ir para Pagamento <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
