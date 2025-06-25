import { useEffect, useState } from 'react';
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TimeSlotSelector } from '@/components/booking/time-slot-selector';
import { useToast } from '@/hooks/use-toast';
import { useLocation, useRoute } from 'wouter';
import { ptBR } from 'date-fns/locale';
import { format, addDays, startOfDay, subDays } from 'date-fns';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useQuery } from '@tanstack/react-query';
import { LoaderCircle, Calendar as CalendarIcon, Clock, ChevronRight } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  availabilityId?: number;
}

interface BookingState {
  serviceId: number;
  serviceName: string;
  servicePrice: number;
  serviceDuration: number;
  providerId: number;
  providerName: string;
  date?: string; // YYYY-MM-DD
  timeSlot?: TimeSlot;
}

export default function BookTimeSlotPage() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute('/client/book/:providerId/:serviceId');
  const { toast } = useToast();
  
  // Estado do agendamento
  const [bookingState, setBookingState] = useState<BookingState>({
    serviceId: match ? parseInt(params?.serviceId || '0') : 0,
    serviceName: '',
    servicePrice: 0,
    serviceDuration: 0,
    providerId: match ? parseInt(params?.providerId || '0') : 0,
    providerName: '',
  });
  
  // Estado da seleção de data e hora
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(addDays(new Date(), 1));
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | undefined>();
  
  // Buscar detalhes do serviço e do prestador
  const { isLoading: isLoadingService } = useQuery({
    queryKey: [`/api/services/${bookingState.serviceId}`],
    enabled: !!bookingState.serviceId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    refetchOnWindowFocus: false
  });

  // Efeito para atualizar os dados do serviço quando a consulta é bem-sucedida
  const serviceData = queryClient.getQueryData<any>([`/api/services/${bookingState.serviceId}`]);
  useEffect(() => {
    if (serviceData) {
      setBookingState(prev => ({
        ...prev,
        serviceName: serviceData.name || '',
        servicePrice: serviceData.price || 0,
        serviceDuration: serviceData.duration || 0
      }));
    }
  }, [serviceData]);

  const { isLoading: isLoadingProvider } = useQuery({
    queryKey: [`/api/providers/${bookingState.providerId}`],
    enabled: !!bookingState.providerId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 2,
    refetchOnWindowFocus: false
  });

  // Efeito para atualizar os dados do prestador quando a consulta é bem-sucedida
  const providerData = queryClient.getQueryData<any>([`/api/providers/${bookingState.providerId}`]);
  useEffect(() => {
    if (providerData) {
      setBookingState(prev => ({
        ...prev,
        providerName: providerData.name || ''
      }));
    }
  }, [providerData]);

  // Formatação de data
  const formattedDate = selectedDate 
    ? format(selectedDate, "yyyy-MM-dd")
    : '';

  // Atualizar estado do agendamento quando a data ou horário for selecionado
  useEffect(() => {
    if (formattedDate) {
      setBookingState(prev => ({
        ...prev,
        date: formattedDate
      }));
    }
  }, [formattedDate]);

  // Lidar com a seleção de horário
  const handleTimeSlotSelect = (timeSlot: TimeSlot) => {
    setSelectedTimeSlot(timeSlot);
    setBookingState(prev => ({
      ...prev,
      timeSlot
    }));
  };

  // Função para continuar para a próxima etapa
  const handleContinue = () => {
    if (!selectedDate || !selectedTimeSlot) {
      toast({
        title: "Selecione uma data e horário",
        description: "Por favor, escolha uma data e um horário disponível para continuar",
        variant: "destructive"
      });
      return;
    }

    // Guarda o estado do agendamento em sessionStorage para uso na próxima página
    sessionStorage.setItem('bookingState', JSON.stringify(bookingState));
    
    // Navega para a página de confirmação
    setLocation('/client/book/confirm');
  };

  const isLoading = isLoadingService || isLoadingProvider;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoaderCircle className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Agendamento de Serviço</h1>
        <p className="text-muted-foreground">
          Selecione a data e horário para {bookingState.serviceName} com {bookingState.providerName}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Calendário */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5" />
              Selecione a data
            </CardTitle>
            <CardDescription>
              Escolha o dia para o seu agendamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              locale={ptBR}
              fromDate={addDays(new Date(), 1)} // Permitir agendamentos a partir de amanhã
              toDate={addDays(new Date(), 60)} // Permitir agendamentos até 60 dias no futuro
              className="border rounded-md p-3"
            />
          </CardContent>
        </Card>

        {/* Seletor de horários */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="mr-2 h-5 w-5" />
              Selecione o horário
            </CardTitle>
            <CardDescription>
              {selectedDate 
                ? `Horários disponíveis para ${formatDate(selectedDate)}`
                : 'Selecione uma data para ver os horários disponíveis'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedDate ? (
              <TimeSlotSelector
                providerId={bookingState.providerId}
                serviceId={bookingState.serviceId}
                date={formattedDate}
                onTimeSlotSelect={handleTimeSlotSelect}
                selectedTimeSlot={selectedTimeSlot}
              />
            ) : (
              <div className="py-6 text-center text-muted-foreground">
                Selecione uma data no calendário
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detalhes do agendamento e botão de continuar */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Detalhes do agendamento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Serviço:</span>
              <span className="font-medium">{bookingState.serviceName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Prestador:</span>
              <span className="font-medium">{bookingState.providerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Data:</span>
              <span className="font-medium">
                {selectedDate ? formatDate(selectedDate) : 'Não selecionada'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Horário:</span>
              <span className="font-medium">
                {selectedTimeSlot?.startTime ? `${selectedTimeSlot.startTime} - ${selectedTimeSlot.endTime}` : 'Não selecionado'}
              </span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button
            onClick={handleContinue}
            disabled={!selectedDate || !selectedTimeSlot}
            className="w-full md:w-auto"
          >
            Continuar
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}