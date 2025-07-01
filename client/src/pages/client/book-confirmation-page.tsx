import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from '@/hooks/use-toast';
import { useLocation } from 'wouter';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { CheckCircle, Calendar, Clock, User, Scissors, ArrowLeft, CheckCheck, Loader2 } from 'lucide-react';
import { formatDate, formatTime, calculateDuration } from '@/lib/utils';
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

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

export default function BookConfirmationPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Estado para controle de carregamento inicial da página
  const [isLoading, setIsLoading] = useState(true);
  
  // Estado para as notas/comentários adicionais
  const [notes, setNotes] = useState('');
  
  // Estado do agendamento recuperado do sessionStorage
  const [bookingState, setBookingState] = useState<BookingState | null>(null);

  // Recuperar dados do sessionStorage ao carregar a página
  useEffect(() => {
    const savedBookingState = sessionStorage.getItem('bookingState');
    
    if (savedBookingState) {
      try {
        const parsedState = JSON.parse(savedBookingState);
        setBookingState(parsedState);
      } catch (error) {
        console.error('Erro ao parsear o estado do agendamento:', error);
        toast({
          title: "Erro",
          description: "Houve um problema ao recuperar os dados do agendamento",
          variant: "destructive"
        });
        // Redirecionar para a página inicial em caso de erro
        setLocation('/client/services');
      }
    } else {
      // Se não houver dados de agendamento, redirecionar
      toast({
        title: "Agendamento não encontrado",
        description: "Por favor, inicie um novo agendamento",
        variant: "destructive"
      });
      setLocation('/client/services');
    }
    
    setIsLoading(false);
  }, [toast, setLocation]);

  // Mutation para criar o agendamento
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest('POST', '/api/appointments', appointmentData);
      return await response.json();
    },
    onSuccess: (data) => {
      // Limpar o estado do agendamento do sessionStorage
      sessionStorage.removeItem('bookingState');
      
      // Mostrar mensagem de sucesso
      toast({
        title: "Agendamento realizado com sucesso!",
        description: "Você receberá uma confirmação em breve.",
        variant: "default"
      });
      
      // Invalidar cache de agendamentos
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Redirecionar para a página de detalhes do agendamento
      setLocation(`/client/appointments/${data.id}`);
    },
    onError: (error: any) => {
      console.error('Erro ao criar agendamento:', error);
      toast({
        title: "Erro ao agendar",
        description: error.message || "Ocorreu um erro ao realizar o agendamento. Por favor, tente novamente.",
        variant: "destructive"
      });
    }
  });

  // Função para confirmar e criar o agendamento
  const handleConfirmBooking = () => {
    if (!bookingState?.serviceId || !bookingState?.providerId || !bookingState?.date || !bookingState?.timeSlot) {
      toast({
        title: "Dados incompletos",
        description: "Faltam informações necessárias para realizar o agendamento",
        variant: "destructive"
      });
      return;
    }

    // Preparar dados para envio
    const appointmentData = {
      serviceId: bookingState.serviceId,
      providerId: bookingState.providerId,
      date: bookingState.date,
      startTime: bookingState.timeSlot.startTime,
      endTime: bookingState.timeSlot.endTime,
      notes: notes.trim() || null,
      availabilityId: bookingState.timeSlot.availabilityId,
    };

    // Enviar requisição para criar o agendamento
    createAppointmentMutation.mutate(appointmentData);
  };

  // Função para voltar à etapa anterior
  const handleBack = () => {
    setLocation(`/client/book/${bookingState?.providerId}/${bookingState?.serviceId}`);
  };

  // Se estiver carregando ou não houver dados do agendamento, mostrar loader
  if (isLoading || !bookingState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Confirmar Agendamento</h1>
        <p className="text-muted-foreground">
          Revise os detalhes e confirme seu agendamento
        </p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle className="mr-2 h-5 w-5 text-primary" />
            Detalhes do Agendamento
          </CardTitle>
          <CardDescription>
            Confira se todos os detalhes estão corretos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start">
              <Scissors className="h-5 w-5 mr-3 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">{bookingState.serviceName}</div>
                <div className="text-sm text-muted-foreground">
                  {calculateDuration(bookingState.serviceDuration)}
                </div>
              </div>
            </div>
            
            <div className="flex items-start">
              <User className="h-5 w-5 mr-3 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">{bookingState.providerName}</div>
                <div className="text-sm text-muted-foreground">
                  Profissional
                </div>
              </div>
            </div>
            
            <div className="flex items-start">
              <Calendar className="h-5 w-5 mr-3 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">
                  {bookingState.date ? formatDate(bookingState.date) : 'Data não selecionada'}
                </div>
                <div className="text-sm text-muted-foreground">
                  Data do atendimento
                </div>
              </div>
            </div>
            
            <div className="flex items-start">
              <Clock className="h-5 w-5 mr-3 text-muted-foreground mt-0.5" />
              <div>
                <div className="font-medium">
                  {bookingState.timeSlot 
                    ? `${formatTime(bookingState.timeSlot.startTime)} - ${formatTime(bookingState.timeSlot.endTime)}`
                    : 'Horário não selecionado'
                  }
                </div>
                <div className="text-sm text-muted-foreground">
                  Horário do atendimento
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seção para notas/comentários */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Informações Adicionais</CardTitle>
          <CardDescription>
            Adicione qualquer informação ou solicitação especial para o prestador
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="notes">Notas/Observações (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Ex: Tenho preferência por corte com navalha, tenho alergia a determinado produto..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
        </CardContent>
      </Card>

      {/* Botões de ação */}
      <div className="flex flex-col-reverse sm:flex-row sm:justify-between gap-3">
        <Button
          variant="outline"
          onClick={handleBack}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <Button
          onClick={handleConfirmBooking}
          disabled={createAppointmentMutation.isPending}
          className="w-full sm:w-auto"
        >
          {createAppointmentMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CheckCheck className="h-4 w-4 mr-2" />
              Confirmar Agendamento
            </>
          )}
        </Button>
      </div>
    </div>
  );
}