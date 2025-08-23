import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  ChevronRight, 
  ChevronLeft, 
  Clock, 
  Calendar as CalendarIcon, 
  MapPin,
  Star,
  Info,
  X
} from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { cn, formatCurrency } from '@/lib/utils';
import { apiCall } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Tipos para os passos do assistente
type BookingStep = 'niche' | 'category' | 'service' | 'date' | 'providers' | 'slots';

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

interface Provider {
  id: number;
  name: string | null;
  profileImage: string | null;
  settings?: ProviderSettings;
  services: Service[];
  distance?: number;
  executionTimeForService?: number;
}

export interface BookingWizardProps {
  onComplete?: (data: {
    serviceId: number;
    providerId: number;
    date?: string;
    startTime?: string;
    endTime?: string;
  }) => void;
}

// Novo hook para buscar horários de vários dias
function useMultiDaySlots(providerId: number | null, serviceTemplate: ServiceTemplate | null, days: number = 30) {
  const [slotsByDate, setSlotsByDate] = useState<Record<string, {startTime: string, endTime: string}[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!providerId || !serviceTemplate) return;
    setIsLoading(true);
    setError(null);
    const today = new Date();
    const fetchAll = async () => {
      const results: Record<string, {startTime: string, endTime: string}[]> = {};
      for (let i = 0; i < days; i++) {
        const date = addDays(today, i);
        const formattedDate = format(date, 'yyyy-MM-dd');
        try {
          const resp = await apiCall(`/providers/${providerId}/availability?date=${formattedDate}&duration=${serviceTemplate.duration}`);
          if (resp.ok) {
            const slots = await resp.json();
            if (Array.isArray(slots) && slots.length > 0) {
              results[formattedDate] = slots;
            }
          }
        } catch (e) {
          setError('Erro ao buscar horários disponíveis');
        }
      }
      setSlotsByDate(results);
      setIsLoading(false);
    };
    fetchAll();
  }, [providerId, serviceTemplate, days]);

  return { slotsByDate, isLoading, error };
}

export function BookingWizard({ onComplete }: BookingWizardProps) {
  // Estado para controlar o passo atual do assistente
  const [currentStep, setCurrentStep] = useState<BookingStep>('niche');
  
  // Estados para armazenar as seleções do usuário
  const [selectedNicheId, setSelectedNicheId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedServiceTemplate, setSelectedServiceTemplate] = useState<ServiceTemplate | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{startTime: string, endTime: string} | null>(null);
  
  // Verificar parâmetros da URL para pré-seleção
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const providerIdParam = urlParams.get('providerId');
    const serviceIdParam = urlParams.get('serviceId');
    
    if (providerIdParam && serviceIdParam) {
      // Se temos providerId e serviceId na URL, vamos para o passo de prestadores
      setCurrentStep('providers');
      
      // Buscar dados do prestador e serviço
      const fetchPreSelectedData = async () => {
        try {
          const providerId = parseInt(providerIdParam);
          const serviceId = parseInt(serviceIdParam);
          
          // Buscar dados do prestador
          const providerResponse = await apiCall(`/providers/${providerId}`);
          if (providerResponse.ok) {
            const providerData = await providerResponse.json();
            setSelectedProvider(providerData);
          }
          
          // Buscar dados do serviço
          const serviceResponse = await apiCall(`/services/${serviceId}`);
          if (serviceResponse.ok) {
            const serviceData = await serviceResponse.json();
            // Buscar o template correspondente
            const templateResponse = await apiCall(`/service-templates?categoryId=${serviceData.categoryId}`);
            if (templateResponse.ok) {
              const templates = await templateResponse.json();
              const matchingTemplate = templates.find((t: ServiceTemplate) => 
                t.name.toLowerCase().includes(serviceData.name.toLowerCase())
              );
              if (matchingTemplate) {
                setSelectedServiceTemplate(matchingTemplate);
                setSelectedCategoryId(serviceData.categoryId);
                // Buscar o nicho correspondente
                const categoryResponse = await apiCall(`/categories/${serviceData.categoryId}`);
                if (categoryResponse.ok) {
                  const categoryData = await categoryResponse.json();
                  setSelectedNicheId(categoryData.nicheId);
                }
              }
            }
          }
        } catch (error) {
          console.error('Erro ao carregar dados pré-selecionados:', error);
        }
      };
      
      fetchPreSelectedData();
    } else if (providerIdParam) {
      // Se temos apenas providerId, vamos para o passo de prestadores
      setCurrentStep('providers');
      
      // Buscar dados do prestador
      const fetchProviderData = async () => {
        try {
          const providerId = parseInt(providerIdParam);
          const providerResponse = await apiCall(`/providers/${providerId}`);
          if (providerResponse.ok) {
            const providerData = await providerResponse.json();
            setSelectedProvider(providerData);
          }
        } catch (error) {
          console.error('Erro ao carregar dados do prestador:', error);
        }
      };
      
      fetchProviderData();
    }
  }, []);
  
  // Carregar nichos
  const { data: niches, isLoading: isNichesLoading } = useQuery<Niche[]>({
    queryKey: ['/api/niches'],
  });
  
  // Carregar categorias com base no nicho selecionado
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/niches', selectedNicheId, 'categories'],
    queryFn: async () => {
      if (!selectedNicheId) return [];
      const response = await apiCall(`/niches/${selectedNicheId}/categories`);
      if (!response.ok) {
        throw new Error('Falha ao carregar categorias');
      }
      return response.json();
    },
    enabled: !!selectedNicheId,
  });
  
  // Carregar templates de serviço com base na categoria selecionada
  const { data: serviceTemplates, isLoading: isServiceTemplatesLoading } = useQuery<ServiceTemplate[]>({
    queryKey: ['/api/service-templates', selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      const response = await apiCall(`/service-templates?categoryId=${selectedCategoryId}`);
      if (!response.ok) {
        throw new Error('Falha ao carregar serviços');
      }
      return response.json();
    },
    enabled: !!selectedCategoryId,
  });
  
  // Carregar prestadores disponíveis com base no serviço e data selecionados
  const { data: providers, isLoading: isProvidersLoading } = useQuery<Provider[]>({
    queryKey: ['/api/providers/search', selectedServiceTemplate?.id, selectedDate],
    queryFn: async () => {
      if (!selectedServiceTemplate || !selectedCategoryId) return [];
      
      // Construir URL base
      let endpoint = `/api/providers/search?categoryId=${selectedCategoryId}&executionTime=${selectedServiceTemplate.duration}`;
      
      // Adicionar filtro de data se uma data for selecionada
      if (selectedDate) {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        endpoint += `&date=${formattedDate}`;
      }
      
      // Buscar prestadores
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Falha ao carregar prestadores disponíveis');
      }
      
      const allProviders = await response.json();
      
      // Filtrar apenas prestadores que possuem o serviço específico selecionado
      return allProviders.filter((provider: Provider) => 
        provider.services.some((service: Service) => 
          service.name.includes(selectedServiceTemplate.name)
        )
      );
    },
    enabled: !!selectedServiceTemplate && !!selectedCategoryId,
  });
  
  // Novo: buscar todos os horários disponíveis ao selecionar o prestador
  const { slotsByDate, isLoading: isLoadingMultiDaySlots, error: slotsError } = useMultiDaySlots(
    selectedProvider?.id ?? null,
    selectedServiceTemplate,
    30 // dias
  );

  // Função para redirecionar para a agenda do prestador com parâmetro de segurança
  const redirectToProviderSchedule = (providerId: number, serviceId: number) => {
    const params = new URLSearchParams();
    params.append('fromWizard', 'true');
    window.location.href = `/client/provider-schedule/${providerId}/${serviceId}?${params.toString()}`;
  };
  
  // Manipuladores para atualizar o estado
  const handleNicheSelect = (nicheId: number) => {
    setSelectedNicheId(nicheId);
    setCurrentStep('category');
    // Limpar seleções subsequentes
    setSelectedCategoryId(null);
    setSelectedServiceTemplate(null);
    setSelectedDate(null);
    setSelectedProvider(null);
    setSelectedSlot(null);
  };
  
  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setCurrentStep('service');
    // Limpar seleções subsequentes
    setSelectedServiceTemplate(null);
    setSelectedDate(null);
    setSelectedProvider(null);
    setSelectedSlot(null);
  };
  
  const handleServiceSelect = (serviceTemplate: ServiceTemplate) => {
    setSelectedServiceTemplate(serviceTemplate);
    setCurrentStep('date');
    // Limpar seleções subsequentes
    setSelectedDate(null);
    setSelectedProvider(null);
    setSelectedSlot(null);
  };
  
  const handleDateSelect = (date: Date | null) => {
    setSelectedDate(date);
    if (date) {
      setCurrentStep('providers');
      // Limpar seleções subsequentes
      setSelectedProvider(null);
      setSelectedSlot(null);
    }
  };
  
  const handleProviderSelect = (provider: Provider) => {
    setSelectedProvider(provider);
    setCurrentStep('slots'); // novo passo
    setSelectedSlot(null);
  };
  
  const handleTimeSlotSelect = (slot: {startTime: string, endTime: string, date?: string}) => {
    setSelectedSlot(slot);
    if (selectedProvider && selectedServiceTemplate && slot.date && onComplete) {
      // Encontrar o serviço específico para este prestador
      const matchingService = selectedProvider.services.find(service => 
        service.name.includes(selectedServiceTemplate.name)
      );
      if (matchingService) {
        onComplete({
          serviceId: matchingService.id,
          providerId: selectedProvider.id,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime
        });
      }
    }
  };
  
  // Função para voltar à etapa anterior
  const handleBack = () => {
    switch (currentStep) {
      case 'category':
        setCurrentStep('niche');
        setSelectedCategoryId(null);
        break;
      case 'service':
        setCurrentStep('category');
        setSelectedServiceTemplate(null);
        break;
      case 'date':
        setCurrentStep('service');
        setSelectedDate(null);
        break;
      case 'providers':
        setCurrentStep('date');
        setSelectedProvider(null);
        setSelectedSlot(null);
        break;
    }
  };
  
  // Renderizar título da etapa atual
  const renderStepTitle = () => {
    switch (currentStep) {
      case 'niche':
        return 'Escolha uma Área de Serviço';
      case 'category':
        return 'Escolha uma Categoria';
      case 'service':
        return 'Qual serviço você precisa?';
      case 'date':
        return 'Selecione uma Data';
      case 'providers':
        return 'Prestadores Disponíveis';
      case 'slots':
        return 'Escolha um Horário';
      default:
        return '';
    }
  };
  
  // Renderizar conteúdo da etapa de escolha de nicho
  const renderNicheStep = () => {
    if (isNichesLoading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      );
    }
    
    if (!niches?.length) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível carregar as áreas de serviço. Por favor, tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {niches.map((niche) => (
          <Card 
            key={niche.id}
            className="cursor-pointer border-2 hover:border-primary hover:bg-primary/5 transition-colors"
            onClick={() => handleNicheSelect(niche.id)}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 text-center h-full">
              {niche.icon && (
                <div className="text-4xl mb-3">{niche.icon}</div>
              )}
              <h3 className="font-medium text-lg">{niche.name}</h3>
              {niche.description && (
                <p className="text-sm text-muted-foreground mt-1">{niche.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  // Renderizar conteúdo da etapa de escolha de categoria
  const renderCategoryStep = () => {
    if (isCategoriesLoading) {
      return (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-lg" />
          ))}
        </div>
      );
    }
    
    if (!categories?.length) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível encontrar categorias para esta área. Por favor, selecione outra área de serviço.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {categories.map((category) => (
          <Card 
            key={category.id}
            className="cursor-pointer border-2 hover:border-primary hover:bg-primary/5 transition-colors"
            onClick={() => handleCategorySelect(category.id)}
          >
            <CardContent className="flex flex-col items-center justify-center p-4 text-center h-full">
              {category.icon && (
                <div className="text-4xl mb-3">{category.icon}</div>
              )}
              <h3 className="font-medium text-lg">{category.name}</h3>
              {category.description && (
                <p className="text-sm text-muted-foreground mt-1">{category.description}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  // Renderizar conteúdo da etapa de escolha de serviço
  const renderServiceStep = () => {
    if (isServiceTemplatesLoading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      );
    }
    
    if (!serviceTemplates?.length) {
      return (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível encontrar serviços para esta categoria. Por favor, selecione outra categoria.
          </AlertDescription>
        </Alert>
      );
    }
    
    return (
      <div className="space-y-3">
        {serviceTemplates.map((template) => (
          <Card 
            key={template.id}
            className="cursor-pointer hover:bg-primary/5 transition-colors"
            onClick={() => handleServiceSelect(template)}
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{template.name}</h3>
                  {template.description && (
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-3 mt-2">
                    <div className="flex items-center text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      <span className="text-sm">{template.duration} min</span>
                    </div>
                    {template.price !== null && (
                      <div className="font-medium">
                        {formatCurrency(template.price)}
                      </div>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };
  
  // Renderizar conteúdo da etapa de seleção de data
  const renderDateStep = () => {
    return (
      <div className="space-y-6">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Selecione uma data para o agendamento</h3>
          <p className="text-muted-foreground">
            Escolha a data em que você deseja receber o serviço.
          </p>
        </div>
        
        <div className="border rounded-lg p-4 flex flex-col items-center">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={handleDateSelect}
            disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
            locale={ptBR}
            className="mx-auto"
          />
          
          {selectedDate && (
            <div className="mt-4 w-full">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Você selecionou: <span className="font-medium">{format(selectedDate, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>
      </div>
    );
  };
  
  // Renderizar conteúdo da etapa de seleção de prestador
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
            {selectedDate ? (
              `Não encontramos prestadores disponíveis para ${format(selectedDate, "d 'de' MMMM", { locale: ptBR })} para este serviço.`
            ) : (
              'Não encontramos prestadores disponíveis para este serviço com as opções selecionadas.'
            )}
          </p>
          <div className="pt-2 space-y-2">
            <Button
              variant="outline"
              onClick={() => setCurrentStep('date')}
            >
              Escolher outra data
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-lg font-medium">Prestadores Disponíveis</h3>
          <p className="text-muted-foreground">
            {providers.length === 1 
              ? 'Encontramos 1 prestador disponível para você.'
              : `Encontramos ${providers.length} prestadores disponíveis para você.`
            }
          </p>
        </div>
        
        <div className="space-y-4">
          {providers.map((provider) => {
            // Encontrar o serviço específico deste prestador que corresponde ao template selecionado
            const matchingService = provider.services.find(service => 
              selectedServiceTemplate && service.name.includes(selectedServiceTemplate.name)
            );
            
            return (
              <Card 
                key={provider.id}
                className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleProviderSelect(provider)}
              >
                <div className="p-4">
                  <div className="flex items-start">
                    <Avatar className="h-16 w-16 rounded-lg mr-4 flex-shrink-0">
                      <AvatarImage src={provider.profileImage || undefined} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-xl">
                        {provider.name?.charAt(0) || 'P'}
                      </AvatarFallback>
                    </Avatar>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold truncate">
                        {provider.settings?.businessName || provider.name || 'Prestador'}
                      </h3>
                      
                      {provider.settings?.address && (
                        <div className="flex items-center text-muted-foreground mb-1">
                          <MapPin className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                          <span className="text-xs truncate">{provider.settings.address}</span>
                        </div>
                      )}
                      
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        {provider.settings?.rating && (
                          <div className="flex items-center">
                            <Star className="h-4 w-4 text-amber-500 mr-1 flex-shrink-0" />
                            <span className="text-sm font-medium">{provider.settings.rating.toFixed(1)}</span>
                          </div>
                        )}
                        
                        {matchingService && (
                          <div className="flex items-center text-primary">
                            <span className="text-sm font-semibold">
                              {formatCurrency(matchingService.price || 0)}
                            </span>
                          </div>
                        )}
                        
                        {provider.distance !== undefined && (
                          <div className="flex items-center text-muted-foreground">
                            <span className="text-xs">{provider.distance < 1 ? `${(provider.distance * 1000).toFixed(0)}m` : `${provider.distance.toFixed(1)}km`}</span>
                          </div>
                        )}
                        
                        <div className="flex items-center text-muted-foreground">
                          <Clock className="h-3.5 w-3.5 mr-1 flex-shrink-0" />
                          <span className="text-xs">
                            {provider.executionTimeForService || (matchingService?.duration || selectedServiceTemplate?.duration)} min
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <ChevronRight className="h-5 w-5 text-muted-foreground ml-2 self-center" />
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    );
  };
  
  // Novo: renderizar todos os horários disponíveis agrupados por data
  const renderSlotsStep = () => {
    if (isLoadingMultiDaySlots) {
      return <div className="p-6 text-center">Carregando horários disponíveis...</div>;
    }
    if (slotsError) {
      return <div className="p-6 text-center text-red-500">{slotsError}</div>;
    }
    const dates = Object.keys(slotsByDate);
    if (dates.length === 0) {
      return <div className="p-6 text-center text-neutral-500">Nenhum horário disponível nos próximos 30 dias.</div>;
    }
    return (
      <div className="p-4">
        <h3 className="font-bold mb-4">Escolha um horário disponível</h3>
        {dates.map(date => (
          <div key={date} className="mb-6">
            <div className="font-semibold text-primary mb-2">{format(new Date(date), 'EEEE, dd/MM/yyyy', { locale: ptBR })}</div>
            <div className="flex flex-wrap gap-2">
              {slotsByDate[date].map((slot, idx) => (
                <Button
                  key={idx}
                  variant={selectedSlot === slot ? 'default' : 'outline'}
                  onClick={() => handleTimeSlotSelect({ ...slot, date })}
                >
                  {slot.startTime} - {slot.endTime}
                </Button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Adicionar novo passo 'slots' ao renderizador principal
  const renderStep = () => {
    switch (currentStep) {
      case 'niche': return renderNicheStep();
      case 'category': return renderCategoryStep();
      case 'service': return renderServiceStep();
      case 'date': return renderDateStep();
      case 'providers': return renderProvidersStep();
      case 'slots': return renderSlotsStep();
      default: return null;
    }
  };

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">{renderStepTitle()}</h2>
          {currentStep === 'providers' && selectedServiceTemplate && (
            <p className="text-sm text-muted-foreground">
              {selectedServiceTemplate.name} - {selectedServiceTemplate.duration} minutos
            </p>
          )}
        </div>
        
        {currentStep !== 'niche' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="flex items-center"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
        )}
      </div>
      
      <div>
        {renderStep()}
      </div>
    </div>
  );
}