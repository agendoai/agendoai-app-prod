import React, { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import ClientLayout from "@/components/layout/client-layout";
import AppHeader from "@/components/layout/app-header";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { formatCurrency, getStatusBadgeProps, formatStatus } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Star, Calendar, Clock, MapPin, CreditCard, FileText, Phone, Mail, User, Building } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useAuth } from "@/hooks/use-auth";

// Definindo a interface extendida para o agendamento com campos adicionais
interface AppointmentDetails {
  id: number;
  clientId: number;
  providerId: number;
  serviceId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  serviceName: string;
  providerName: string;
  providerAddress?: string;
  clientName?: string;
  totalPrice?: number;
  paymentMethod?: string;
  notes?: string;
  price?: number;
  observations?: string;
}

const reviewSchema = z.object({
  rating: z.number().min(1).max(5),
  comment: z.string().optional(),
  isPublic: z.boolean().default(true),
});

type ReviewFormValues = z.infer<typeof reviewSchema>;

export default function AppointmentDetailsPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [rating, setRating] = useState(5);

  // Verificação adicional para garantir que o ID é um número válido
  const appointmentId = id ? parseInt(id) : 0;
  
  // Logging para debug
  console.log('Acessando detalhes do agendamento ID:', id, 'parsed:', appointmentId);

  const { data: appointment, isLoading, error } = useQuery<AppointmentDetails>({
    queryKey: ['/api/appointments', appointmentId],
    queryFn: async () => {
      try {
        const user = await queryClient.fetchQuery({
          queryKey: ['/api/user'],
          staleTime: 0 // Força uma nova requisição para verificar a autenticação
        });
        
        if (!user) {
          console.error('Usuário não autenticado. Redirecionando para login...');
          navigate('/auth');
          throw new Error('Usuário não autenticado');
        }
        
        const response = await apiRequest('GET', `/api/appointments/${appointmentId}`);
        
        if (!response.ok) {
          console.error('Erro na resposta do servidor:', response.status, response.statusText);
          throw new Error(`Erro ao carregar dados do agendamento: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Dados do agendamento recebidos:', data);
        
        // Adicionando campos personalizados para garantir compatibilidade
        return {
          ...data,
          totalPrice: data.totalPrice || (data.price || 0),
          paymentMethod: data.paymentMethod || 'credit_card',
          notes: data.notes || data.observations || ''
        } as AppointmentDetails;
      } catch (err) {
        console.error('Exceção ao carregar agendamento:', err);
        throw err;
      }
    },
    enabled: !!appointmentId && !isNaN(appointmentId),
    retry: 1,
    staleTime: 0 // Não usar cache para este endpoint
  });

  const { data: review } = useQuery({
    queryKey: ['/api/appointments', appointmentId, 'review'],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/appointments/${appointmentId}/review`);
      if (response.status === 404) {
        return null;
      }
      return await response.json();
    },
    enabled: !!appointmentId && !isNaN(appointmentId),
  });

  const form = useForm<ReviewFormValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      rating: 5,
      comment: '',
      isPublic: true,
    },
  });

  const reviewMutation = useMutation({
    mutationFn: async (data: ReviewFormValues) => {
      const response = await apiRequest('POST', `/api/appointments/${appointmentId}/review`, data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Avaliação enviada",
        description: "Obrigado por avaliar o serviço!",
      });
      setIsReviewModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId, 'review'] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar avaliação",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', `/api/appointments/${appointmentId}/cancel`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Agendamento cancelado",
        description: "Seu agendamento foi cancelado com sucesso",
      });
      setIsCancelModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao cancelar agendamento",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  const onSubmitReview = (values: ReviewFormValues) => {
    reviewMutation.mutate({ ...values, rating });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !appointment) {
    console.log("Detalhes do erro:", error);
    console.log("ID do agendamento:", appointmentId);
    
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <h1 className="text-2xl font-bold mb-4">Agendamento não encontrado</h1>
          <p className="mb-6">Não foi possível encontrar os detalhes deste agendamento.</p>
          <p className="text-sm text-muted-foreground mb-4">
            ID do agendamento: {appointmentId}<br/>
            Erro: {error ? (error as Error).message : "Dados não disponíveis"}
          </p>
          <Button onClick={() => navigate('/client/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Dashboard
          </Button>
        </div>
      </div>
    );
  }

  const { bg, text } = getStatusBadgeProps(appointment.status);
  const formattedDate = format(new Date(appointment.date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  const canCancel = ['pending', 'confirmed'].includes(appointment.status);
  const canReview = appointment.status === 'completed' && !review;
  const isCompleted = appointment.status === 'completed';
  const isCanceled = appointment.status === 'canceled';

  return (
    <ClientLayout>
      <AppHeader title="Detalhes do Agendamento" />
      <div className="container mx-auto px-4 py-4">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => navigate('/client/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para o Dashboard
          </Button>
        </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl">{appointment.serviceName}</CardTitle>
                  <CardDescription className="mt-1">{appointment.providerName}</CardDescription>
                </div>
                <Badge className={`${bg} ${text}`}>{formatStatus(appointment.status)}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-start gap-2">
                  <Calendar className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Data</h3>
                    <p className="text-sm text-muted-foreground">{formattedDate}</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Horário</h3>
                    <p className="text-sm text-muted-foreground">
                      {appointment.startTime} - {appointment.endTime}
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <CreditCard className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className="font-medium">Valor</h3>
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(appointment.totalPrice || 0)}
                    </p>
                  </div>
                </div>
              </div>

              {appointment.notes && (
                <div className="pt-4 border-t">
                  <div className="flex items-start gap-2">
                    <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                    <div>
                      <h3 className="font-medium">Observações</h3>
                      <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-wrap gap-2 justify-end border-t pt-6">
              {canCancel && (
                <Button variant="outline" onClick={() => setIsCancelModalOpen(true)}>
                  Cancelar Agendamento
                </Button>
              )}
              {canReview && (
                <Button onClick={() => setIsReviewModalOpen(true)}>
                  Avaliar Serviço
                </Button>
              )}
              {isCanceled && (
                <div className="w-full text-center text-sm text-muted-foreground mt-2">
                  Este agendamento foi cancelado.
                </div>
              )}
              {review && (
                <div className="w-full text-center text-sm text-muted-foreground mt-2">
                  Você já avaliou este serviço. Obrigado pelo feedback!
                </div>
              )}
            </CardFooter>
          </Card>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Prestador de Serviço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-2">
                <User className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium">Nome</h3>
                  <p className="text-sm text-muted-foreground">{appointment.providerName}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium">Telefone</h3>
                  <p className="text-sm text-muted-foreground">
                    {"Informação não disponível"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Building className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-medium">Endereço</h3>
                  <p className="text-sm text-muted-foreground">
                    {"Informação não disponível"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de Avaliação */}
      <Dialog open={isReviewModalOpen} onOpenChange={setIsReviewModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Avaliar Serviço</DialogTitle>
            <DialogDescription>
              Conte-nos como foi sua experiência com este serviço.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmitReview)} className="space-y-4">
              <div className="flex justify-center py-2">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <Star
                      key={value}
                      className={`h-8 w-8 cursor-pointer ${
                        value <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
                      }`}
                      onClick={() => {
                        setRating(value);
                        form.setValue('rating', value);
                      }}
                    />
                  ))}
                </div>
              </div>

              <FormField
                control={form.control}
                name="comment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Comentário</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Compartilhe sua experiência com este serviço..." 
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="space-y-3">
                    <FormLabel>Visibilidade</FormLabel>
                    <FormControl>
                      <RadioGroup
                        onValueChange={(value) => field.onChange(value === 'true')}
                        defaultValue={field.value ? 'true' : 'false'}
                        className="flex flex-col space-y-1"
                      >
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="true" id="public" />
                          <Label htmlFor="public">Pública - Visível para todos</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="false" id="private" />
                          <Label htmlFor="private">Privada - Visível apenas para o prestador</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>
                      Escolha se sua avaliação ficará visível para outros clientes.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button 
                  type="submit" 
                  disabled={reviewMutation.isPending}
                >
                  {reviewMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Avaliação'
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal de Cancelamento */}
      <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Cancelar Agendamento</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCancelModalOpen(false)}>
              Voltar
            </Button>
            <Button 
              variant="destructive" 
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelando...
                </>
              ) : (
                'Sim, Cancelar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
    </ClientLayout>
  );
}