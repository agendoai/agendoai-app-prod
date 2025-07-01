import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Tipos para os passos do assistente
type BookingStep = 'niche' | 'category' | 'service' | 'date' | 'providers';

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
  
  // Carregar nichos
  const { data: niches, isLoading: isNichesLoading } = useQuery<Niche[]>({
    queryKey: ['/api/niches'],
  });
  
  // Carregar categorias com base no nicho selecionado
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/niches', selectedNicheId, 'categories'],
    queryFn: async () => {
      if (!selectedNicheId) return [];
      const response = await fetch(`/api/niches/${selectedNicheId}/categories`);
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
      const response = await fetch(`/api/service-templates?categoryId=${selectedCategoryId}`);
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
  
  // Carregar horários disponíveis para o prestador selecionado na data selecionada
  const { data: availableSlots, isLoading: isSlotsLoading } = useQuery<{startTime: string, endTime: string}[]>({
    queryKey: ['/api/providers', selectedProvider?.id, 'availability', selectedDate, selectedServiceTemplate?.duration],
    queryFn: async () => {
      if (!selectedProvider || !selectedDate || !selectedServiceTemplate) return [];
      
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      const response = await fetch(`/api/providers/${selectedProvider.id}/availability?date=${formattedDate}&duration=${selectedServiceTemplate.duration}`);
      
      if (!response.ok) {
        throw new Error('Falha ao carregar horários disponíveis');
      }
      
      return response.json();
    },
    enabled: !!selectedProvider && !!selectedDate && !!selectedServiceTemplate,
  });
  
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
    
    // Encontrar o serviço específico para este prestador
    const matchingService = provider.services.find(service => 
      selectedServiceTemplate && service.name.includes(selectedServiceTemplate.name)
    );
    
    if (matchingService && selectedDate && availableSlots?.length && onComplete) {
      const formattedDate = format(selectedDate, 'yyyy-MM-dd');
      
      // Se houver apenas um horário disponível, selecioná-lo automaticamente
      if (availableSlots.length === 1) {
        setSelectedSlot(availableSlots[0]);
        
        onComplete({
          serviceId: matchingService.id,
          providerId: provider.id,
          date: formattedDate,
          startTime: availableSlots[0].startTime,
          endTime: availableSlots[0].endTime
        });
      } else {
        // Se houver múltiplos horários, permitir que o usuário escolha
        // Exibir os horários disponíveis (implementação dependente da interface)
      }
    } else if (matchingService && onComplete) {
      onComplete({
        serviceId: matchingService.id,
        providerId: provider.id
      });
    }
  };
  
  const handleTimeSlotSelect = (slot: {startTime: string, endTime: string}) => {
    setSelectedSlot(slot);
    
    if (selectedProvider && selectedServiceTemplate && selectedDate && onComplete) {
      // Encontrar o serviço específico para este prestador
      const matchingService = selectedProvider.services.find(service => 
        service.name.includes(selectedServiceTemplate.name)
      );
      
      if (matchingService) {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        
        onComplete({
          serviceId: matchingService.id,
          providerId: selectedProvider.id,
          date: formattedDate,
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
                      
                      {selectedDate && matchingService && (
                        <div className="mt-3">
                          <Separator className="mb-2" />
                          <div className="flex flex-wrap gap-1.5">
                            {isSlotsLoading ? (
                              <div className="w-full h-6 animate-pulse bg-neutral-100 rounded"></div>
                            ) : availableSlots && availableSlots.length > 0 ? (
                              <>
                                <p className="w-full text-xs text-muted-foreground mb-1">
                                  Horários disponíveis em {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}:
                                </p>
                                {availableSlots.slice(0, 3).map((slot, index) => (
                                  <Badge 
                                    key={index} 
                                    variant="outline" 
                                    className="h-7 hover:bg-primary/10 cursor-pointer"
                                  >
                                    {slot.startTime.substring(0, 5)}
                                  </Badge>
                                ))}
                                {availableSlots.length > 3 && (
                                  <Badge variant="outline" className="h-7 bg-background hover:bg-primary/10 cursor-pointer">
                                    +{availableSlots.length - 3} horários
                                  </Badge>
                                )}
                              </>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                Sem horários disponíveis para {format(selectedDate, "d 'de' MMMM", { locale: ptBR })}
                              </p>
                            )}
                          </div>
                        </div>
                      )}
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
        {currentStep === 'niche' && renderNicheStep()}
        {currentStep === 'category' && renderCategoryStep()}
        {currentStep === 'service' && renderServiceStep()}
        {currentStep === 'date' && renderDateStep()}
        {currentStep === 'providers' && renderProvidersStep()}
      </div>
    </div>
  );
}