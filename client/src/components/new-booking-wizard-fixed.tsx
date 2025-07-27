// @ts-nocheck - desabilitando verificações de tipos para facilitar o desenvolvimento
import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useLocation } from 'wouter';
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
import { useAuth } from "@/hooks/use-auth";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Badge } from "@/components/ui/badge";
import { TimeSlotSelector } from "@/components/booking/time-slot-selector";
import { Service, TimeSlot } from "@/lib/utils";
import React from "react"; // Added missing import

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
  console.log('NewBookingWizard RENDERIZADO');
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

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
    'credit_card' | 'debit_card' | 'pix' | 'money' | null
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
  const [timeSlots, setTimeSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [selectedServiceDetails, setSelectedServiceDetails] = useState<any>(null);
  const [showServiceModal, setShowServiceModal] = useState(false);

  // Buscar horários da API
  React.useEffect(() => {
    if (!selectedProvider || !selectedDate || currentStep !== "time-slot") return;
    
    const fetchTimeSlots = async () => {
      setLoadingSlots(true);
      try {
        const duration = serviceExecutionTime || totalDuration || 30;
        const url = `/api/providers/${selectedProvider}/time-slots?date=${selectedDate.toISOString().split("T")[0]}&duration=${duration}`;
        const response = await fetch(url);
        const data = await response.json();
        console.log('[API] /api/providers/:id/time-slots - RESPOSTA:', data);
        setTimeSlots(Array.isArray(data) ? data : data.timeSlots || []);
      } catch (error) {
        console.error('Erro ao buscar horários:', error);
      } finally {
        setLoadingSlots(false);
      }
    };
    
    fetchTimeSlots();
  }, [selectedProvider, selectedDate, serviceExecutionTime, totalDuration, currentStep]);

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
      console.log('DADOS RECEBIDOS DA API /api/providers/service-search:', data);
      
      // Verificar o formato e normalizar a resposta se necessário
      let providersData = data.providers || [];
      
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
            
            // Verificar se este prestador tem horários disponíveis
            return fetch(
              `/api/providers/${provider.id}/time-slots?date=${selectedDate.toISOString().split("T")[0]}&duration=${finalDuration}`
            )
              .then(slotsResponse => slotsResponse.json())
              .then(slots => {
                console.log('[API] /api/providers/:id/time-slots - RESPOSTA:', slots);
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

  // Avançar automaticamente para a etapa de data quando selectedServiceIds for atualizado
  useEffect(() => {
    if (currentStep === 'service' && selectedServiceIds.length > 0) {
      setCurrentStep('date');
    }
    // Limpar seleção de data, prestador, horários e serviços do prestador ao trocar serviço
    setSelectedDate(null);
    setSelectedProvider(null);
    setSelectedTimeSlot(null);
    setProviderServices({});
  }, [selectedServiceIds]);

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
      newSelectedIds = [serviceId]; // Permitir apenas um serviço por vez
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
  };

  const handlePaymentTypeSelect = (type: "local" | "online") => {
    setPaymentType(type);
    setSelectedPaymentMethod(null);
  };

  const handlePaymentMethodSelect = (
    method: 'credit_card' | 'debit_card' | 'pix' | 'money',
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

    // Calcular o valor total com taxas
    const adminFee = providerFee?.fixedFee || 0;
    const totalWithFee = totalPrice + adminFee;

    // Para pagamentos online (PIX/Cartão), redirecionar para página de pagamento
    if (selectedPaymentMethod === 'pix' || selectedPaymentMethod === 'credit_card' || selectedPaymentMethod === 'debit_card') {
      // Preparar dados do agendamento para a página de pagamento
      const bookingData = {
        providerId: selectedProvider,
        serviceId: selectedServiceIds[0],
        date: selectedDate.toISOString().split('T')[0],
        startTime: selectedTimeSlot.startTime,
        endTime: selectedTimeSlot.endTime,
        totalPrice: totalWithFee,
        paymentMethod: selectedPaymentMethod,
        // Dados adicionais para múltiplos serviços
        ...(selectedServiceIds.length > 1 && {
          multipleServices: true,
          serviceIds: selectedServiceIds,
          services: selectedServiceIds.map(id => {
            const service = (providerServices[selectedProvider] || []).find(s => s.id === id);
            return {
              serviceId: id,
              duration: service?.duration || 30
            };
          })
        })
      };

      // Salvar dados do agendamento no sessionStorage
      sessionStorage.setItem('pendingBookingData', JSON.stringify(bookingData));
      
      // Redirecionar para página de pagamento
      setLocation(`/client/payment?amount=${totalWithFee}&paymentMethod=${selectedPaymentMethod}`);
      return;
    }

    // Para pagamentos locais (dinheiro), criar agendamento direto
    try {
      // Obter dados do usuário e serviços
      const selectedServicesData = services?.filter((s) => selectedServiceIds.includes(s.id)) || [];
      const providerSelected = providers?.find((p) => p.id === selectedProvider);
      
      let response;
      if (selectedServiceIds.length === 1) {
        // Agendamento simples
        response = await fetch('/api/booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: selectedProvider,
            serviceId: selectedServiceIds[0],
            date: selectedDate.toISOString().split('T')[0],
            startTime: selectedTimeSlot.startTime,
            paymentMethod: selectedPaymentMethod,
            totalPrice: totalWithFee,
            paymentStatus: 'pending',
            serviceName: selectedServicesData[0]?.name || 'Serviço',
            clientName: user?.name || 'Cliente',
          })
        });
      } else {
        // Agendamento de múltiplos serviços consecutivos
        response = await fetch('/api/booking/consecutive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: selectedProvider,
            date: selectedDate.toISOString().split('T')[0],
            startTime: selectedTimeSlot.startTime,
            paymentMethod: selectedPaymentMethod,
            totalPrice: totalWithFee,
            paymentStatus: 'pending',
            serviceName: selectedServicesData.map(s => s.name).join(', '),
            clientName: user?.name || 'Cliente',
            services: selectedServiceIds.map(id => {
              const service = (providerServices[selectedProvider] || []).find(s => s.id === id);
              return {
                serviceId: id,
                duration: service?.duration || 30
              };
            })
          })
        });
      }
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao criar agendamento');
      }
      
      setCurrentStep("confirmation");
    } catch (error) {
      toast({
        title: "Erro ao criar agendamento",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
    }
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
  function getServiceIcon(name, isSmall = false) {
    // Adapte conforme seus serviços reais
    if (isSmall) {
      return <Sparkles className="h-8 w-8" />;
    }
    return <Sparkles className="h-10 w-10" />;
  }

  // Substitua as funções de renderização:
  const renderNicheStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-4">
          <span className="text-2xl">🎯</span>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Escolha sua área</h3>
        <p className="text-gray-600">Selecione a categoria que melhor atende sua necessidade</p>
      </div>
      {isLoadingNiches ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {niches?.map((niche) => (
            <button
              key={niche.id}
              className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-[1.02] ${
                selectedNicheId === niche.id
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-xl'
                  : 'bg-white border border-gray-200 hover:border-teal-300 hover:shadow-lg'
              }`}
              onClick={() => handleNicheSelect(niche.id)}
              disabled={isLoadingNiches}
            >
              <div className="flex items-center space-x-4">
                <div className={`text-2xl transition-transform group-hover:scale-110 ${
                  selectedNicheId === niche.id ? 'text-white' : 'text-teal-500'
                }`}>
                  {getNicheIcon(niche.name)}
                </div>
                <div className="text-left">
                  <span className={`font-semibold text-lg ${
                    selectedNicheId === niche.id ? 'text-white' : 'text-gray-800'
                  }`}>
                    {niche.name}
                  </span>
                  <p className={`text-sm mt-1 ${
                    selectedNicheId === niche.id ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    Serviços especializados
                  </p>
                </div>
              </div>
              {selectedNicheId === niche.id && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
  const renderCategoryStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-4">
          <span className="text-2xl">📂</span>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Selecione a categoria</h3>
        <p className="text-gray-600">Escolha o tipo de serviço que você precisa</p>
      </div>
      {isLoadingCategories ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {categories?.map((cat) => (
            <button
              key={cat.id}
              className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-[1.02] ${
                selectedCategoryId === cat.id
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-xl'
                  : 'bg-white border border-gray-200 hover:border-teal-300 hover:shadow-lg'
              }`}
              onClick={() => handleCategorySelect(cat.id)}
              disabled={isLoadingCategories}
            >
              <div className="flex items-center space-x-4">
                <div className={`text-2xl transition-transform group-hover:scale-110 ${
                  selectedCategoryId === cat.id ? 'text-white' : 'text-teal-500'
                }`}>
                  {getCategoryIcon(cat.name)}
                </div>
                <div className="text-left">
                  <span className={`font-semibold text-lg ${
                    selectedCategoryId === cat.id ? 'text-white' : 'text-gray-800'
                  }`}>
                    {cat.name}
                  </span>
                  <p className={`text-sm mt-1 ${
                    selectedCategoryId === cat.id ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    Serviços disponíveis
                  </p>
                </div>
              </div>
              {selectedCategoryId === cat.id && (
                <div className="absolute top-3 right-3">
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
  const renderServiceStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-4">
          <span className="text-2xl">🛠️</span>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Escolha seus serviços</h3>
        <p className="text-gray-600">Selecione um ou mais serviços que você precisa</p>
      </div>
      {isLoadingServices ? (
        <div className="flex justify-center py-8"><LoadingSpinner /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {services?.map((service) => (
            <div
              key={service.id}
              className={`group relative overflow-hidden rounded-xl transition-all duration-300 transform hover:scale-[1.01] ${
                selectedServiceIds.includes(service.id)
                  ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-xl'
                  : 'bg-white border border-gray-200 hover:border-teal-300 hover:shadow-lg'
              }`}
              onClick={() => {
                if (!isLoadingServices) handleServiceSelect(service.id);
              }}
              style={{ cursor: isLoadingServices ? 'not-allowed' : 'pointer' }}
            >
              <div className="p-3 sm:p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-4">
                    <div className={`w-8 h-8 sm:w-12 sm:h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-105 ${
                      selectedServiceIds.includes(service.id) 
                        ? 'bg-white/20' 
                        : 'bg-teal-100'
                    }`}>
                      <span className="text-lg sm:text-xl">{getServiceIcon(service.name, true)}</span>
                    </div>
                    <div className="text-left">
                      <h3 className={`font-semibold text-base sm:text-lg ${
                        selectedServiceIds.includes(service.id) ? 'text-white' : 'text-gray-800'
                      }`}>
                        {service.name}
                      </h3>
                      <p className={`text-xs sm:text-sm mt-1 ${
                        selectedServiceIds.includes(service.id) ? 'text-white/80' : 'text-gray-600'
                      }`}>
                        {service.description.length > 40 
                          ? `${service.description.substring(0, 40)}...` 
                          : service.description
                        }
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                  </div>
                </div>
              </div>
              {selectedServiceIds.includes(service.id) && (
                <div className="absolute top-2 right-2 sm:top-3 sm:right-3">
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white/20 rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      
      {/* Botão de continuar dentro da etapa */}
      {/* Removido para fluxo automático */}
    </div>
  );

  const renderDateStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-4">
          <span className="text-2xl">📅</span>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Escolha a data</h3>
        <p className="text-gray-600">Selecione quando você gostaria de agendar</p>
      </div>
      
      <div className="flex justify-center">
        <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-200">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => {
              // Permitir agendamento para hoje e dias futuros
              const today = new Date();
              today.setHours(0, 0, 0, 0);
              return date < today;
            }}
            className="rounded-xl"
          />
        </div>
      </div>
      
      {/* Botão de continuar dentro da etapa */}
      {selectedDate && (
        <div className="pt-6">
          <Button 
            className="w-full h-14 rounded-xl text-lg font-bold shadow-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white transition-all transform hover:scale-[1.02]" 
            onClick={handleNext}
            disabled={isLoadingProviders}
          >
            Ver Prestadores <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderProvidersStep = () => (
    <div className="space-y-8">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-4">
          <span className="text-2xl">👥</span>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">Escolha o prestador</h3>
        <p className="text-gray-600">Selecione quem irá realizar seu serviço</p>
      </div>
      
      {isLoadingProviders ? (
        <div className="text-center py-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-6">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-white"></div>
          </div>
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Buscando prestadores...</h3>
          <p className="text-gray-600">Carregando profissionais disponíveis para sua data</p>
        </div>
      ) : providers && providers.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {providers.map((provider, index) => {
            const totals = calculateTotals(provider.id);
            const isProviderLoading = loadingProviderServices[provider.id];
            
            return (
              <button
                key={provider.id}
                className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-[1.02] ${
                  selectedProvider === provider.id
                    ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-xl'
                    : 'bg-white border border-gray-200 hover:border-teal-300 hover:shadow-lg'
                } ${isProviderLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={() => {
                  if (!isProviderLoading && !isLoadingProviders) {
                    handleProviderSelect(provider.id, totals.duration, totals.price);
                  }
                }}
                disabled={isProviderLoading || isLoadingProviders}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-transform group-hover:scale-110 ${
                      selectedProvider === provider.id 
                        ? 'bg-white/20' 
                        : 'bg-teal-100'
                    }`}>
                      <span className="text-lg">👤</span>
                    </div>
                    <div className="text-left">
                      <h3 className={`font-semibold text-lg ${
                        selectedProvider === provider.id ? 'text-white' : 'text-gray-800'
                      }`}>
                        {provider.name}
                      </h3>
                      <p className={`text-sm mt-1 ${
                        selectedProvider === provider.id ? 'text-white/80' : 'text-gray-600'
                      }`}>
                        {isProviderLoading ? 'Carregando serviços...' : 'Prestador disponível'}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {providerServices[provider.id] && providerServices[provider.id].length > 0 && providerServices[provider.id].map((service, idx) => (
                      <div key={service.id} className="text-sm font-semibold text-neutral-800">
                        {service.name} - R$ {Number(service.price).toFixed(2).replace('.', ',')}
                      </div>
                    ))}
                    <div className={`text-sm ${
                      selectedProvider === provider.id ? 'text-white/70' : 'text-gray-500'
                    }`}>
                      {totals.duration} min
                    </div>
                  </div>
                </div>
                {selectedProvider === provider.id && (
                  <div className="absolute top-3 right-3">
                    <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                      <Check className="w-4 h-4 text-white" />
                    </div>
                  </div>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
            <span className="text-2xl">😔</span>
          </div>
          <p className="text-gray-500 font-medium">Nenhum prestador disponível para esta data.</p>
        </div>
      )}
      
      {/* Botão de continuar dentro da etapa */}
      {selectedProvider && (
        <div className="pt-6">
          <Button 
            className="w-full h-14 rounded-xl text-lg font-bold shadow-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white transition-all transform hover:scale-[1.02]" 
            onClick={handleNext}
            disabled={loadingProviderServices[selectedProvider] || isLoadingProviders}
          >
            Escolher Horário <ChevronRight className="ml-2 h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );

  const renderTimeSlotStep = () => {
    if (!selectedProvider || !selectedDate) {
      return (
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-2xl mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-yellow-800 font-semibold">Dados insuficientes para buscar horários.</p>
          <p className="text-yellow-700 text-sm mt-1">Selecione um prestador e uma data.</p>
        </div>
      );
    }

    return (
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-4">
            <span className="text-2xl">⏰</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Escolha o horário</h3>
          <p className="text-gray-600">
            {selectedDate && `Para ${format(selectedDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`}
          </p>
        </div>

        {loadingSlots && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500"></div>
            </div>
            <p className="text-gray-600 font-medium">Carregando horários disponíveis...</p>
          </div>
        )}

        {!loadingSlots && timeSlots.length === 0 && (
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-2xl mb-4">
              <span className="text-2xl">😔</span>
            </div>
            <p className="text-gray-500 font-medium">Nenhum horário disponível para esta data.</p>
          </div>
        )}

        {!loadingSlots && timeSlots.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {timeSlots.map((slot, index) => (
              <button
                key={index}
                className={`group relative overflow-hidden rounded-2xl p-4 transition-all duration-300 transform hover:scale-[1.02] ${
                  selectedTimeSlot?.startTime === slot.startTime
                    ? 'bg-gradient-to-br from-teal-500 to-cyan-500 text-white shadow-xl'
                    : 'bg-white border border-gray-200 hover:border-teal-300 hover:shadow-lg'
                }`}
                onClick={() => handleTimeSlotSelect(slot)}
              >
                <div className="text-center">
                  <div className={`font-bold text-lg ${
                    selectedTimeSlot?.startTime === slot.startTime ? 'text-white' : 'text-gray-800'
                  }`}>
                    {slot.startTime}
                  </div>
                  <div className={`text-sm ${
                    selectedTimeSlot?.startTime === slot.startTime ? 'text-white/80' : 'text-gray-500'
                  }`}>
                    até {slot.endTime}
                  </div>
                </div>
                {selectedTimeSlot?.startTime === slot.startTime && (
                  <div className="absolute top-2 right-2">
                    <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">
                      <Check className="w-3 h-3 text-white" />
                    </div>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}

        {selectedTimeSlot && (
          <div className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl">
            <div className="flex items-center justify-center space-x-3">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                <Check className="h-4 w-4 text-white" />
              </div>
              <span className="text-green-800 font-semibold">
                Horário selecionado: {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
              </span>
            </div>
          </div>
        )}
        
        {/* Botão de continuar dentro da etapa */}
        {selectedTimeSlot && (
          <div className="pt-6">
            <Button 
              className="w-full h-14 rounded-xl text-lg font-bold shadow-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white transition-all transform hover:scale-[1.02]" 
              onClick={handleNext}
              disabled={loadingSlots}
            >
              Ir para Pagamento <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
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
      <div className="space-y-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-2xl mb-4">
            <span className="text-2xl">💳</span>
          </div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Método de pagamento</h3>
          <p className="text-gray-600">Escolha como você deseja pagar</p>
        </div>

        <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 rounded-2xl border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center">
            <span className="mr-2">📋</span>
            Resumo do agendamento
          </h3>
          <div className="space-y-4 text-sm">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-gray-600">Serviços:</span>
                <span className="font-semibold text-gray-800">
                  {selectedServicesData.length} serviço(s)
                </span>
              </div>

              {selectedServicesData.map((service, index) => (
                <div
                  key={service.id}
                  className="ml-4 text-sm border-l-2 border-teal-200 pl-3 py-1 bg-white/50 rounded-r-lg"
                >
                  <span className="text-gray-700">{service.name}</span>
                </div>
              ))}

              <div className="mt-3 border-t border-gray-200 pt-3 flex justify-between text-sm font-semibold">
                <span>Duração total:</span>
                <span className="text-teal-600">{totalDuration} minutos</span>
              </div>
              {totalPrice > 0 && (
                <>
                  <div className="flex justify-between text-sm font-semibold">
                    <span>Subtotal:</span>
                    <span className="text-teal-600">R$ {totalPrice.toFixed(2).replace(".", ",")}</span>
                  </div>
                  {adminFee > 0 && (
                    <div className="flex justify-between text-sm font-semibold">
                      <span>Taxa administrativa:</span>
                      <span className="text-teal-600">R$ {adminFee.toFixed(2).replace(".", ",")}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-lg font-bold border-t border-teal-200 pt-3 mt-3 bg-white/50 rounded-lg p-3">
                    <span>Total:</span>
                    <span className="text-teal-600">R$ {totalWithFee.toFixed(2).replace(".", ",")}</span>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3 pt-3 border-t border-gray-200">
              <div className="flex justify-between">
                <span className="text-gray-600">Prestador:</span>
                <span className="font-semibold text-gray-800">
                  {providerSelected?.name || "Prestador selecionado"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Data:</span>
                <span className="font-semibold text-gray-800">
                  {selectedDate
                    ? format(selectedDate, "dd 'de' MMMM 'de' yyyy", {
                        locale: ptBR,
                      })
                    : "Data selecionada"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Horário:</span>
                <span className="font-semibold text-gray-800">
                  {selectedTimeSlot
                    ? `${selectedTimeSlot.startTime} - ${selectedTimeSlot.endTime}`
                    : "Horário selecionado"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {!paymentType ? (
          <>
            <div className="grid grid-cols-1 gap-4">
              <button
                className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-[1.02] bg-white border border-gray-200 hover:border-teal-300 hover:shadow-lg"
                onClick={() => handlePaymentTypeSelect("local")}
                disabled={isLoadingProviderFee}
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110">
                    <span className="text-2xl">💵</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg text-gray-800">Pagamento Local</h3>
                    <p className="text-gray-600 mt-1">
                      Pague diretamente ao prestador no dia do serviço
                    </p>
                  </div>
                </div>
              </button>

              <button
                className="group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform opacity-60 cursor-not-allowed bg-white border border-gray-200"
                disabled
                title="Em breve disponível"
              >
                <div className="flex items-center space-x-4">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-400 to-gray-500 rounded-2xl flex items-center justify-center">
                    <span className="text-2xl">💳</span>
                  </div>
                  <div className="text-left">
                    <h3 className="font-bold text-lg text-gray-500">Pagamento Online</h3>
                    <p className="text-gray-400 mt-1">
                      Em breve disponível
                    </p>
                  </div>
                </div>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h4 className="font-semibold text-gray-800">
                {paymentType === "local"
                  ? "Escolha como deseja pagar no local"
                  : "Escolha como deseja pagar online"}
              </h4>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPaymentType(null)}
                className="text-sm hover:bg-gray-100"
                disabled={isLoadingProviderFee}
              >
                Voltar
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {paymentType === "local" ? (
                <button
                  className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-[1.02] ${
                    selectedPaymentMethod === "money"
                      ? 'bg-gradient-to-br from-green-500 to-emerald-500 text-white shadow-xl'
                      : 'bg-white border border-gray-200 hover:border-green-300 hover:shadow-lg'
                  }`}
                  onClick={() => handlePaymentMethodSelect("money")}
                  disabled={isLoadingProviderFee}
                >
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                      selectedPaymentMethod === "money" ? 'bg-white/20' : 'bg-green-100'
                    }`}>
                      <span className="text-xl">💵</span>
                    </div>
                    <div className="text-left">
                      <h3 className={`font-semibold text-lg ${
                        selectedPaymentMethod === "money" ? 'text-white' : 'text-gray-800'
                      }`}>
                        Dinheiro
                      </h3>
                      <p className={`text-sm mt-1 ${
                        selectedPaymentMethod === "money" ? 'text-white/80' : 'text-gray-600'
                      }`}>
                        Pagamento em dinheiro
                      </p>
                    </div>
                  </div>
                  {selectedPaymentMethod === "money" && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                        <Check className="w-4 h-4 text-white" />
                      </div>
                    </div>
                  )}
                </button>
              ) : (
                <>
                  <button
                    className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-[1.02] ${
                      selectedPaymentMethod === "credit_card"
                        ? 'bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-xl'
                        : 'bg-white border border-gray-200 hover:border-blue-300 hover:shadow-lg'
                    }`}
                    onClick={() => handlePaymentMethodSelect("credit_card")}
                    disabled={isLoadingProviderFee}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        selectedPaymentMethod === "credit_card" ? 'bg-white/20' : 'bg-blue-100'
                      }`}>
                        <span className="text-xl">💳</span>
                      </div>
                      <div className="text-left">
                        <h3 className={`font-semibold text-lg ${
                          selectedPaymentMethod === "credit_card" ? 'text-white' : 'text-gray-800'
                        }`}>
                          Cartão de Crédito
                        </h3>
                        <p className={`text-sm mt-1 ${
                          selectedPaymentMethod === "credit_card" ? 'text-white/80' : 'text-gray-600'
                        }`}>
                          Pague com cartão de crédito
                        </p>
                      </div>
                    </div>
                    {selectedPaymentMethod === "credit_card" && (
                      <div className="absolute top-3 right-3">
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </button>

                  <button
                    className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-[1.02] ${
                      selectedPaymentMethod === "debit_card"
                        ? 'bg-gradient-to-br from-green-500 to-cyan-500 text-white shadow-xl'
                        : 'bg-white border border-gray-200 hover:border-green-300 hover:shadow-lg'
                    }`}
                    onClick={() => handlePaymentMethodSelect("debit_card")}
                    disabled={isLoadingProviderFee}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        selectedPaymentMethod === "debit_card" ? 'bg-white/20' : 'bg-green-100'
                      }`}>
                        <span className="text-xl">🏦</span>
                      </div>
                      <div className="text-left">
                        <h3 className={`font-semibold text-lg ${
                          selectedPaymentMethod === "debit_card" ? 'text-white' : 'text-gray-800'
                        }`}>
                          Cartão de Débito
                        </h3>
                        <p className={`text-sm mt-1 ${
                          selectedPaymentMethod === "debit_card" ? 'text-white/80' : 'text-gray-600'
                        }`}>
                          Pague com cartão de débito
                        </p>
                      </div>
                    </div>
                    {selectedPaymentMethod === "debit_card" && (
                      <div className="absolute top-3 right-3">
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </button>

                  <button
                    className={`group relative overflow-hidden rounded-2xl p-6 transition-all duration-300 transform hover:scale-[1.02] ${
                      selectedPaymentMethod === "pix"
                        ? 'bg-gradient-to-br from-yellow-400 to-green-400 text-white shadow-xl'
                        : 'bg-white border border-gray-200 hover:border-yellow-400 hover:shadow-lg'
                    }`}
                    onClick={() => handlePaymentMethodSelect("pix")}
                    disabled={isLoadingProviderFee}
                  >
                    <div className="flex items-center space-x-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 ${
                        selectedPaymentMethod === "pix" ? 'bg-white/20' : 'bg-yellow-100'
                      }`}>
                        <span className="text-xl">⚡</span>
                      </div>
                      <div className="text-left">
                        <h3 className={`font-semibold text-lg ${
                          selectedPaymentMethod === "pix" ? 'text-white' : 'text-gray-800'
                        }`}>
                          PIX
                        </h3>
                        <p className={`text-sm mt-1 ${
                          selectedPaymentMethod === "pix" ? 'text-white/80' : 'text-gray-600'
                        }`}>
                          Pague com PIX (QR Code)
                        </p>
                      </div>
                    </div>
                    {selectedPaymentMethod === "pix" && (
                      <div className="absolute top-3 right-3">
                        <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      </div>
                    )}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Botão de continuar dentro da etapa */}
        {paymentType && selectedPaymentMethod && (
          <div className="pt-6">
            <Button 
              className="w-full h-14 rounded-xl text-lg font-bold shadow-lg bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white transition-all transform hover:scale-[1.02]" 
              onClick={handleFinishBooking}
              disabled={isLoadingProviderFee}
            >
              Finalizar Agendamento <ChevronRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        )}
      </div>
    );
  };

  const renderConfirmationStep = () => {
    return (
      <div className="space-y-8 text-center">
        <div className="flex flex-col items-center justify-center py-8">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-6 shadow-xl">
            <span className="text-4xl">✅</span>
          </div>
          <h2 className="text-3xl font-bold mb-3 text-gray-800">Agendamento Confirmado!</h2>
          <p className="text-gray-600 mb-6 text-lg">
            Seu agendamento foi realizado com sucesso.
          </p>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-6 rounded-2xl border border-green-200 mb-6">
            <p className="text-green-800 font-semibold">
              Você receberá uma confirmação por email em breve.
            </p>
          </div>
          <Button
            className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transition-all transform hover:scale-105"
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

  // Array de passos para o progress bar
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

  // --- NOVO WRAPPER DE LAYOUT ---
  return (
    <div className="min-h-screen w-full bg-white relative overflow-hidden">
      {/* Background decorativo */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-blue-500/5 rounded-full blur-2xl"></div>
      </div>

      {/* Header flutuante */}
      <div className="relative z-10 pt-6 pb-4">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 border border-white/20">
            <div className="flex items-center justify-between">
              <button
                className={`rounded-xl bg-gray-100 p-3 transition-all hover:bg-gray-200 hover:scale-105 ${
                  currentStep === 'niche' || currentStep === 'confirmation' ? 'invisible' : ''
                }`}
                onClick={handleBack}
                aria-label="Voltar"
                disabled={currentStep === 'niche' || currentStep === 'confirmation'}
                style={{ pointerEvents: currentStep === 'niche' || currentStep === 'confirmation' ? 'none' : 'auto' }}
              >
                <ChevronLeft className="h-5 w-5 text-neutral-700" />
              </button>
              <h2 className="text-lg font-extrabold text-neutral-900 text-center flex-1">
                {renderStepTitle()}
              </h2>
              <div className="w-10" />
            </div>
            {/* Progress bar moderna */}
            <div className="mt-4">
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-teal-400 to-cyan-400 h-2 rounded-full transition-all duration-500 ease-out"
                  style={{ width: `${((steps.indexOf(currentStep) + 1) / steps.length) * 100}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-neutral-500">
                <span>Passo {steps.indexOf(currentStep) + 1}</span>
                <span>de {steps.length}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Conteúdo principal */}
      <div className="relative z-10 px-4 pb-8">
        <div className="max-w-md mx-auto">
          <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
            <div className="p-6">
              <div className="min-h-[400px] flex flex-col justify-center">
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
        </div>
      </div>
      
      {/* Modal de Detalhes do Serviço */}
      {showServiceModal && selectedServiceDetails && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-teal-100 rounded-full flex items-center justify-center">
                  <span className="text-xl">{getServiceIcon(selectedServiceDetails.name)}</span>
                </div>
                <h3 className="text-xl font-bold text-gray-800">{selectedServiceDetails.name}</h3>
              </div>
              <button
                onClick={() => setShowServiceModal(false)}
                className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition-colors"
              >
                <span className="text-gray-600">×</span>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-800 mb-2">Descrição</h4>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {selectedServiceDetails.description}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Preço</div>
                  <div className="font-bold text-teal-600 text-lg">
                    R$ {(selectedServiceDetails.price / 100).toFixed(2).replace(".", ",")}
                  </div>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <div className="text-sm text-gray-600">Duração</div>
                  <div className="font-bold text-gray-800 text-lg">
                    {selectedServiceDetails.duration} min
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowServiceModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Fechar
              </button>
              <button
                onClick={() => {
                  handleServiceSelect(selectedServiceDetails.id);
                  setShowServiceModal(false);
                }}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedServiceIds.includes(selectedServiceDetails.id)
                    ? 'bg-gray-500 text-white'
                    : 'bg-teal-500 text-white hover:bg-teal-600'
                }`}
              >
                {selectedServiceIds.includes(selectedServiceDetails.id) ? 'Já Selecionado' : 'Selecionar Serviço'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
