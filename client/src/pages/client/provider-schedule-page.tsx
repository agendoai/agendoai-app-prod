import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useLocation, useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, addDays, parse, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import ClientLayout from "@/components/layout/client-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CalendarIcon, Clock, Info, Lightbulb } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AITimeRecommendations } from "@/components/ai-time-recommendations";

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  availabilityId?: number;
}

interface AvailabilitySlot {
  id: number;
  providerId: number;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  intervalMinutes?: number | null;
  date?: string | null;
}

interface ProviderData {
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    profileImage: string | null;
    userType: string;
  };
  settings: {
    businessName: string | null;
    isOnline: boolean | null;
    address: string | null;
    description: string | null;
    [key: string]: any;
  };
}

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  description: string | null;
  categoryId: number;
}

export default function ProviderSchedulePage() {
  const [, setLocation] = useLocation();
  const { providerId, serviceId } = useParams<{ providerId: string; serviceId: string }>();
  const parsedProviderId = parseInt(providerId);
  const parsedServiceId = parseInt(serviceId);

  // Verificar se o usuário está tentando acessar diretamente a agenda do prestador
  // Se sim, redirecionar para o fluxo correto de agendamento
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isDirectAccess = !urlParams.get('fromWizard');
    
    if (isDirectAccess) {
      console.log('🔒 Acesso direto à agenda do prestador detectado. Redirecionando para o fluxo correto...');
      // Redirecionar para o wizard de agendamento com os parâmetros
      const params = new URLSearchParams();
      params.append('providerId', providerId);
      params.append('serviceId', serviceId);
      setLocation(`/client/booking-wizard?${params.toString()}`);
      return;
    }
  }, [providerId, serviceId, setLocation]);

  // Verificar se há uma data na URL
  const searchParams = new URLSearchParams(window.location.search);
  const dateParam = searchParams.get('date');
  const initialDate = dateParam ? parse(dateParam, 'yyyy-MM-dd', new Date()) : undefined;

  // Estado para controlar a data selecionada pelo cliente
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(
    initialDate && isValid(initialDate) ? initialDate : undefined
  );
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Estado para mostrar datas disponíveis destacadas no calendário
  const [availableDates, setAvailableDates] = useState<Date[]>([]);

  // Formatar data para a API (YYYY-MM-DD)
  const formattedDate = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  // Buscar dados do prestador
  const { data: providerData, isLoading: isLoadingProvider, error: providerError } = useQuery<ProviderData>({
    queryKey: ['/api/providers', parsedProviderId],
    queryFn: () => {
      console.log(`Buscando prestador ID: ${parsedProviderId}`);
      return fetch(`/api/providers/${parsedProviderId}`)
        .then(res => {
          console.log(`Resposta do prestador: ${res.status}`);
          if (!res.ok) {
            throw new Error(`Erro ao buscar prestador: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log("Dados do prestador:", data);
          return data;
        })
        .catch(err => {
          console.error("Erro na busca do prestador:", err);
          throw err;
        });
    },
    enabled: !isNaN(parsedProviderId)
  });

  // Buscar dados do serviço
  const { data: service, isLoading: isLoadingService, error: serviceError } = useQuery<Service>({
    queryKey: ['/api/services', parsedServiceId],
    queryFn: () => {
      console.log(`Buscando serviço ID: ${parsedServiceId}`);
      return fetch(`/api/services/${parsedServiceId}`)
        .then(res => {
          console.log(`Resposta do serviço: ${res.status}`);
          if (!res.ok) {
            throw new Error(`Erro ao buscar serviço: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log("Dados do serviço:", data);
          return data;
        })
        .catch(err => {
          console.error("Erro na busca do serviço:", err);
          throw err;
        });
    },
    enabled: !isNaN(parsedServiceId)
  });

  // Buscar disponibilidade do prestador para determinar dias disponíveis
  const { data: availabilityData, isLoading: isLoadingAvailability } = useQuery<AvailabilitySlot[]>({
    queryKey: ['/api/providers', parsedProviderId, 'availability'],
    queryFn: () => {
      console.log(`Buscando disponibilidade do prestador: ${parsedProviderId}`);
      return fetch(`/api/providers/${parsedProviderId}/availability`).then(res => {
        console.log("Resposta da API de disponibilidade:", res.status);
        if (res.status === 401) {
          throw new Error("Unauthorized");
        }
        if (!res.ok) {
          throw new Error(`Falha na requisição: ${res.status}`);
        }
        return res.json().then(data => {
          console.log("Dados de disponibilidade recebidos:", data);
          return data;
        });
      }).catch(error => {
        console.error("Erro ao buscar disponibilidade:", error);
        throw error;
      });
    },
    enabled: !isNaN(parsedProviderId)
  });

  // Processar disponibilidade quando os dados chegarem
  useEffect(() => {
    if (availabilityData && Array.isArray(availabilityData) && availabilityData.length > 0) {
      // Gerar datas disponíveis para os próximos 60 dias com base nos dias da semana disponíveis
      const nextDays = generateAvailableDates(availabilityData, 60);
      setAvailableDates(nextDays);
    }
  }, [availabilityData]);

  // Buscar slots de tempo disponíveis
  const { 
    data: timeSlots, 
    isLoading: isLoadingTimeSlots,
    refetch: refetchTimeSlots
  } = useQuery<TimeSlot[]>({
    queryKey: ['/api/providers', parsedProviderId, 'time-slots', formattedDate],
    queryFn: () => {
      const url = `/api/providers/${parsedProviderId}/time-slots?date=${formattedDate}`;
      console.log("Buscando slots de tempo:", url);
      return fetch(url).then(res => {
        console.log("Resposta da API de slots:", res.status);
        if (res.status === 401) {
          throw new Error("Unauthorized");
        }
        if (!res.ok) {
          throw new Error(`Request failed with status ${res.status}`);
        }
        return res.json().then(data => {
          console.log("Time slots recebidos:", data);
          return data;
        });
      }).catch(error => {
        console.error("Erro ao buscar slots de tempo:", error);
        throw error;
      });
    },
    enabled: !isNaN(parsedProviderId) && !!formattedDate
  });

  // Função para gerar datas disponíveis com base na disponibilidade configurada pelo prestador
  const generateAvailableDates = (availabilityConfig: AvailabilitySlot[], daysAhead: number): Date[] => {
    const dates: Date[] = [];
    const now = new Date();

    // Extrair dias da semana que o prestador está disponível (0 = domingo, 6 = sábado)
    const availableDaysOfWeek = availabilityConfig
      .filter(slot => slot.isAvailable)
      .map(slot => slot.dayOfWeek);

    // Se não há dias disponíveis, retorna array vazio
    if (availableDaysOfWeek.length === 0) return dates;

    // Gerar datas para os próximos `daysAhead` dias
    for (let i = 0; i < daysAhead; i++) {
      const date = addDays(now, i);
      const dayOfWeek = date.getDay(); // 0 = domingo, 6 = sábado

      // Se este dia da semana está na lista de disponíveis
      if (availableDaysOfWeek.includes(dayOfWeek)) {
        dates.push(date);
      }
    }

    return dates;
  };

  // Manipuladores de eventos
  const handleDateChange = (date: Date | undefined) => {
    setSelectedDate(date);
    setSelectedSlot(null); // Resetar slot selecionado ao mudar a data
  };

  const handleTimeSlotSelect = (slot: TimeSlot) => {
    if (slot.isAvailable) {
      setSelectedSlot(slot);
    }
  };

  const handleContinue = () => {
    if (selectedDate && selectedSlot) {
      // Navegar para a tela de confirmação com os dados selecionados
      const formattedDate = format(selectedDate, "yyyy-MM-dd");

      // Verificar se o usuário está autenticado antes de continuar
      fetch('/api/user')
        .then((res) => {
          if (res.status === 401) {
            // Se não estiver autenticado, redirecionar para a página de login
            // Armazenar dados do agendamento em sessionStorage para usar após login
            const bookingData = {
              providerId,
              serviceId,
              date: formattedDate,
              startTime: selectedSlot.startTime,
              endTime: selectedSlot.endTime,
              availabilityId: selectedSlot.availabilityId // Incluir ID da disponibilidade
            };
            sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
            setLocation('/auth?redirect=booking');
          } else {
            // Se estiver autenticado, continuar para a confirmação de agendamento unificada
            // Incluir availabilityId na URL se existir
            const availabilityIdParam = selectedSlot.availabilityId ? `/${selectedSlot.availabilityId}` : '';
            // Usar apenas o componente booking-confirmation para manter o fluxo consistente
            setLocation(`/client/booking-confirmation/${providerId}/${serviceId}/${formattedDate}/${selectedSlot.startTime}/${selectedSlot.endTime}${availabilityIdParam}`);
          }
        })
        .catch(() => {
          // Em caso de erro, assume que o usuário não está autenticado
          setLocation('/auth?redirect=booking');
        });
    }
  };

  const formatTimeDisplay = (timeString: string): string => {
    try {
      const [hours, minutes] = timeString.split(':');
      return `${hours}:${minutes}`;
    } catch (error) {
      console.error("Erro ao formatar horário:", error);
      return timeString;
    }
  };

  // Função para calcular a duração entre dois horários
  const calculateDuration = (startTime: string, endTime: string): number => {
    try {
      // Verificar se o serviço existe e tem a duração definida
      if (service?.duration) {
        return service.duration;
      }

      // Caso contrário, calcular a diferença entre startTime e endTime
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const startDate = new Date(`${today}T${startTime}`);
      const endDate = new Date(`${today}T${endTime}`);

      // Calcular a diferença em minutos
      const diffMs = endDate.getTime() - startDate.getTime();
      const diffMinutes = Math.round(diffMs / 60000);

      // Certificar-se de que a duração não é negativa
      return Math.max(diffMinutes, 0);
    } catch (error) {
      console.error("Erro ao calcular duração:", error);
      // Caso haja algum erro, retornar a duração do serviço como fallback
      return service?.duration || 45; // Padrão de 45 minutos se tudo falhar
    }
  };

  const provider = providerData?.user;
  const settings = providerData?.settings;

  // Loading state
  if (isLoadingProvider || isLoadingService) {
    return (
      <ClientLayout>
        <div className="container py-8">
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  // Error state
  if (!provider || !service) {
    console.log('Erro: dados não encontrados', { 
      providerId: parsedProviderId, 
      serviceId: parsedServiceId,
      providerData,
      service
    });

    return (
      <ClientLayout>
        <div className="container py-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">Informações não encontradas</h2>
            <p className="text-muted-foreground">
              O prestador ou serviço que você está procurando não existe ou não está mais disponível.
            </p>
            <div className="text-sm text-muted-foreground mt-2">
              {!provider && <p>Prestador não encontrado (ID: {parsedProviderId})</p>}
              {!service && <p>Serviço não encontrado (ID: {parsedServiceId})</p>}
            </div>
            <Button onClick={() => window.history.back()} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  return (
    <>
      <Helmet>
        <title>Agendar Serviço | AgendoAI</title>
      </Helmet>

      <ClientLayout>
        <div className="container py-6 space-y-6 max-w-4xl">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="mr-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold">Agendar Serviço</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coluna da esquerda - Calendário */}
            <div className="md:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Selecione uma data</CardTitle>
                  <CardDescription>
                    {isLoadingAvailability ? (
                      "Carregando datas disponíveis..."
                    ) : availableDates.length > 0 ? (
                      "Selecione uma data disponível para o agendamento"
                    ) : (
                      "Sem disponibilidade cadastrada para o prestador"
                    )}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  <div>
                    {availableDates.length === 0 && !isLoadingAvailability ? (
                      <Alert variant="destructive" className="mb-4">
                        <AlertTitle>Sem disponibilidade</AlertTitle>
                        <AlertDescription>
                          Este prestador não possui horários disponíveis no momento.
                        </AlertDescription>
                      </Alert>
                    ) : (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full justify-start text-left font-normal mb-4",
                              !selectedDate && "text-muted-foreground"
                            )}
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
                            selected={selectedDate}
                            onSelect={handleDateChange}
                            disabled={(date) => {
                              // Desabilitar datas passadas e mais de 60 dias no futuro
                              const isOutOfRange = date < new Date() || date > addDays(new Date(), 60);
                              // Desabilitar datas que não estão na lista de disponíveis
                              const isNotAvailable = availableDates.length > 0 && !availableDates.some(
                                availableDate => 
                                  availableDate.getDate() === date.getDate() && 
                                  availableDate.getMonth() === date.getMonth() && 
                                  availableDate.getFullYear() === date.getFullYear()
                              );
                              return isOutOfRange || isNotAvailable;
                            }}
                            modifiers={{
                              available: availableDates,
                            }}
                            modifiersClassNames={{
                              available: "bg-green-100 hover:bg-green-200 text-green-700"
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    )}

                    <div className="text-sm mt-4">
                      <h4 className="font-medium mb-2">Detalhes do serviço</h4>
                      <p><strong>Prestador:</strong> {provider?.name}</p>
                      <p><strong>Serviço:</strong> {service?.name}</p>
                      <p><strong>Duração:</strong> {service?.duration} minutos</p>
                      <p className="mt-2"><strong>Preço:</strong> {service?.price ? new Intl.NumberFormat('pt-BR', { 
                        style: 'currency', 
                        currency: 'BRL' 
                      }).format(service.price / 100) : 'Carregando...'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Alert>
                <Info className="h-4 w-4" />
                <AlertTitle>Política de Cancelamento</AlertTitle>
                <AlertDescription>
                  Cancelamentos devem ser feitos com pelo menos 24 horas de antecedência para reembolso total.
                </AlertDescription>
              </Alert>
            </div>

            {/* Coluna da direita - Horários disponíveis */}
            <div className="md:col-span-2">
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="text-lg">Agenda do Prestador</CardTitle>
                  <CardDescription>
                    {selectedDate
                      ? `Selecione um horário disponível para ${format(selectedDate, "EEEE, dd 'de' MMMM", { locale: ptBR })}`
                      : "Selecione uma data para ver os horários disponíveis"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-2">
                  {isLoadingTimeSlots ? (
                    <div className="flex justify-center py-8">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
                    </div>
                  ) : timeSlots && timeSlots.length > 0 ? (
                    <>
                      {/* Componente de Recomendações de IA */}
                      {selectedDate && (
                        <AITimeRecommendations
                          providerId={parsedProviderId}
                          serviceId={parsedServiceId}
                          date={formattedDate}
                          availableTimeSlots={timeSlots}
                          onSelectTimeSlot={handleTimeSlotSelect}
                          selectedSlot={selectedSlot}
                        />
                      )}
                      <div className="space-y-4">
                      {/* Visão de Grade */}
                      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-6">
                        {timeSlots.map((slot, index) => (
                          <button
                            key={index}
                            className={cn(
                              "px-3 py-2 text-sm rounded-md flex flex-col items-center justify-center transition-colors",
                              slot.isAvailable
                                ? selectedSlot === slot
                                  ? "bg-primary text-primary-foreground"
                                  : "bg-secondary hover:bg-secondary/80"
                                : "bg-muted cursor-not-allowed opacity-50"
                            )}
                            onClick={() => slot.isAvailable && handleTimeSlotSelect(slot)}
                            disabled={!slot.isAvailable}
                          >
                            <div className="flex items-center mb-1">
                              <Clock className="h-3 w-3 mr-1" />
                              {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                            </div>
                            <div className="text-xs opacity-80">
                              {service && calculateDuration(slot.startTime, slot.endTime)} min
                            </div>
                          </button>
                        ))}
                      </div>

                      {/* Visão de Tabela */}
                      <div className="rounded-md border overflow-hidden">
                        <table className="w-full caption-bottom text-sm">
                          <thead className="border-b bg-muted/50">
                            <tr className="text-left">
                              <th className="p-2 font-medium">Horário</th>
                              <th className="p-2 font-medium">Duração</th>
                              <th className="p-2 font-medium">Status</th>
                              <th className="p-2 font-medium">Ação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {timeSlots.map((slot, index) => (
                              <tr 
                                key={index} 
                                className={cn(
                                  "border-b transition-colors",
                                  selectedSlot === slot && "bg-primary/10",
                                  !slot.isAvailable && "bg-muted/30"
                                )}
                              >
                                <td className="p-2 font-medium">
                                  {formatTimeDisplay(slot.startTime)} - {formatTimeDisplay(slot.endTime)}
                                </td>
                                <td className="p-2">
                                  {service && calculateDuration(slot.startTime, slot.endTime)} min
                                </td>
                                <td className="p-2">
                                  {slot.isAvailable ? (
                                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs bg-green-100 text-green-800">
                                      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-green-600"></span>
                                      Disponível
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs bg-red-100 text-red-800">
                                      <span className="mr-1 h-1.5 w-1.5 rounded-full bg-red-600"></span>
                                      Ocupado
                                    </span>
                                  )}
                                </td>
                                <td className="p-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className={cn(
                                      selectedSlot === slot && "bg-primary text-primary-foreground"
                                    )}
                                    disabled={!slot.isAvailable}
                                    onClick={() => slot.isAvailable && handleTimeSlotSelect(slot)}
                                  >
                                    {selectedSlot === slot ? "Selecionado" : "Selecionar"}
                                  </Button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {selectedDate ? (
                        <p>Não há horários disponíveis para esta data. Por favor, selecione outra data.</p>
                      ) : (
                        <p>Selecione uma data para ver os horários disponíveis.</p>
                      )}
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-4">
                  <Button 
                    className="w-full" 
                    disabled={!selectedDate || !selectedSlot}
                    onClick={handleContinue}
                  >
                    Continuar
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>
      </ClientLayout>
    </>
  );
}