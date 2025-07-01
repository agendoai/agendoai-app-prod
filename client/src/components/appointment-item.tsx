import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Check, Ban, Star, Calendar, MessageSquare, X, AlertCircle } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { formatStatus } from '@/lib/utils';

// Mapeamento de classes de cores por status
const statusColorMap = {
  pending: 'bg-yellow-50 border-yellow-200',
  confirmed: 'bg-blue-50 border-blue-200',
  completed: 'bg-green-50 border-green-200',
  canceled: 'bg-red-50 border-red-200',
  no_show: 'bg-gray-50 border-gray-200',
};

type AppointmentStatusUpdateParams = {
  appointmentId: number;
  status: string;
};

type AppointmentReviewParams = {
  appointmentId: number;
  rating: number;
  comment: string;
};

export function AppointmentItem({ 
  appointment, 
  userType = 'client',
  onViewDetails,
  showActions = true
}: { 
  appointment: any; 
  userType?: 'client' | 'provider' | 'admin' | 'support';
  onViewDetails?: (id: number) => void;
  showActions?: boolean;
}) {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  
  // Formatação de data e hora - corrigindo problema de timezone
  // A string de data vem como YYYY-MM-DD, então precisamos garantir que não ocorra mudança de dia 
  // devido ao fuso horário ao criar o objeto Date
  const [year, month, day] = appointment.date.split('-').map(Number);
  const appointmentDate = new Date(year, month - 1, day); // mês começa do zero em JavaScript
  const formattedDate = appointmentDate.toLocaleDateString('pt-BR');
  const statusColor = statusColorMap[appointment.status as keyof typeof statusColorMap] || 'bg-gray-50 border-gray-200';
  
  // Determinar se o agendamento é futuro (para mostrar apenas opções relevantes)
  // Usando a mesma lógica de criação de data para evitar problemas de timezone
  const appointmentDateTime = new Date(year, month - 1, day);
  const [hours, minutes] = appointment.startTime.split(':').map(Number);
  appointmentDateTime.setHours(hours, minutes, 0, 0);
  const isFutureAppointment = appointmentDateTime > new Date();
  
  // Determinar se o agendamento está concluído (para mostrar opção de avaliação para clientes)
  const isCompleted = appointment.status === 'completed';
  
  // Tipos estendidos para parâmetros com opções de pagamento
type AppointmentStatusUpdateParams = {
  appointmentId: number;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  paymentId?: string;
};

// Mutação para atualizar status do agendamento
  const updateStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, status, paymentStatus, paymentMethod, paymentId }: AppointmentStatusUpdateParams) => {
      const response = await apiRequest('PUT', `/api/appointments/${appointmentId}/status`, { 
        status, 
        paymentStatus,
        paymentMethod,
        paymentId
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/client/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/provider/appointments'] });
      
      const actionTexts = {
        'canceled': 'cancelado',
        'completed': 'marcado como concluído',
        'no_show': 'marcado como não comparecimento'
      };
      
      toast({
        title: 'Status atualizado',
        description: `O agendamento foi ${actionTexts[status as keyof typeof actionTexts] || 'atualizado'} com sucesso.`,
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Não foi possível atualizar o status: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
  
  // Mutação para criar avaliação
  const createReviewMutation = useMutation({
    mutationFn: async ({ appointmentId, rating, comment }: AppointmentReviewParams) => {
      const response = await apiRequest('POST', `/api/appointments/${appointmentId}/review`, { 
        rating, 
        comment 
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      setShowRatingDialog(false);
      setRating(5);
      setComment('');
      
      toast({
        title: 'Avaliação enviada',
        description: 'Sua avaliação foi enviada com sucesso. Obrigado pelo feedback!',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro',
        description: `Não foi possível enviar a avaliação: ${error.message}`,
        variant: 'destructive',
      });
    }
  });
  
  // Funções de manipulação para atualização de status
  const handleCancel = () => {
    updateStatusMutation.mutate({ appointmentId: appointment.id, status: 'canceled' });
  };
  
  const handleComplete = () => {
    updateStatusMutation.mutate({ appointmentId: appointment.id, status: 'completed' });
  };
  
  const handleNoShow = () => {
    updateStatusMutation.mutate({ appointmentId: appointment.id, status: 'no_show' });
  };
  
  // Função para enviar avaliação
  const handleSubmitReview = () => {
    createReviewMutation.mutate({
      appointmentId: appointment.id,
      rating,
      comment
    });
  };
  
  // Função para ver detalhes
  const handleViewDetails = () => {
    if (onViewDetails) {
      onViewDetails(appointment.id);
    } else {
      // Corrigindo a rota para os detalhes do agendamento
      if (userType === 'client') {
        console.log('Navegando para detalhes de agendamento:', appointment.id);
        setLocation(`/client/appointment/${appointment.id}`);
      } else {
        setLocation(`/${userType}/appointments/${appointment.id}`);
      }
    }
  };
  
  // Renderizar estrelas para avaliação
  const renderStars = () => {
    return (
      <div className="flex gap-1 mt-2">
        {[1, 2, 3, 4, 5].map((value) => (
          <button
            key={value}
            type="button"
            onClick={() => setRating(value)}
            className={`text-xl ${
              value <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
          >
            ★
          </button>
        ))}
      </div>
    );
  };
  
  return (
    <Card className={`border ${statusColor} mb-3`}>
      <CardHeader className="p-3 pb-0">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base font-medium">{appointment.serviceName}</CardTitle>
          <span className="text-xs bg-gray-100 rounded-full px-2 py-1">
            {formatStatus(appointment.status)}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="p-3 pt-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-neutral-100 overflow-hidden flex items-center justify-center">
            {userType === 'client' ? (
              <div className="text-gray-500 font-medium text-sm">
                {appointment.providerName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            ) : (
              <div className="text-gray-500 font-medium text-sm">
                {appointment.clientName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            )}
          </div>
          
          <div className="flex-1">
            <p className="font-medium text-sm">
              {userType === 'client' ? appointment.providerName : appointment.clientName}
            </p>
            <div className="flex justify-between">
              <p className="text-xs text-neutral-500">
                {formattedDate}, {appointment.startTime}
              </p>
              <p className="text-xs font-medium">
                R$ {((appointment.totalPrice || 0) / 100).toFixed(2)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
      
      {showActions && (
        <CardFooter className="p-3 pt-0 flex gap-2 flex-wrap justify-end">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handleViewDetails}
            className="h-8 text-xs"
          >
            <Calendar className="h-3 w-3 mr-1" /> Detalhes
          </Button>
          
          {/* Botões de ação específicos por tipo de usuário e status do agendamento */}
          {userType === 'client' && isFutureAppointment && appointment.status !== 'canceled' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-8 text-xs"
                >
                  <X className="h-3 w-3 mr-1" /> Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar agendamento</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Não, manter</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Sim, cancelar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {userType === 'client' && isCompleted && (
            <Dialog open={showRatingDialog} onOpenChange={setShowRatingDialog}>
              <DialogTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-8 text-xs"
                >
                  <Star className="h-3 w-3 mr-1" /> Avaliar
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Avaliar serviço</DialogTitle>
                  <DialogDescription>
                    Conte-nos como foi sua experiência com este serviço.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="py-4">
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-1">Sua avaliação</label>
                    {renderStars()}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium mb-1">Comentário (opcional)</label>
                    <Textarea
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Compartilhe sua experiência..."
                      className="resize-none"
                    />
                  </div>
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setShowRatingDialog(false)}>Cancelar</Button>
                  <Button onClick={handleSubmitReview} disabled={createReviewMutation.isPending}>
                    {createReviewMutation.isPending ? 'Enviando...' : 'Enviar avaliação'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          {userType === 'provider' && isFutureAppointment && appointment.status !== 'canceled' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="destructive" 
                  size="sm" 
                  className="h-8 text-xs"
                >
                  <X className="h-3 w-3 mr-1" /> Cancelar
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Cancelar agendamento</AlertDialogTitle>
                  <AlertDialogDescription>
                    Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Não, manter</AlertDialogCancel>
                  <AlertDialogAction onClick={handleCancel}>Sim, cancelar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {userType === 'provider' && isFutureAppointment && appointment.status !== 'canceled' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="h-8 text-xs"
                >
                  <AlertCircle className="h-3 w-3 mr-1" /> Não compareceu
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Marcar como não comparecimento</AlertDialogTitle>
                  <AlertDialogDescription>
                    Confirma que o cliente não compareceu a este agendamento?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleNoShow}>Confirmar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {userType === 'provider' && appointment.status !== 'completed' && appointment.status !== 'canceled' && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button 
                  variant="default" 
                  size="sm" 
                  className="h-8 text-xs bg-green-600 hover:bg-green-700"
                >
                  <Check className="h-3 w-3 mr-1" /> Concluído
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Confirmação de Cobrança</AlertDialogTitle>
                  <AlertDialogDescription>
                    <div className="space-y-6 py-4">
                      <div>
                        <p className="font-medium mb-2">Você já realizou a cobrança deste atendimento?</p>
                        <p className="text-sm text-muted-foreground mb-4">💳 Método de pagamento: {appointment.paymentMethod === 'money' ? 'Pagar no local' : appointment.paymentMethod}</p>
                      </div>
                      
                      <div className="space-y-2">
                        <Button 
                          type="button" 
                          variant="default" 
                          className="w-full justify-start" 
                          onClick={() => {
                            // Abrir deeplink do SumUp para cobrança Tap to Pay
                            const amount = appointment.totalPrice ? (appointment.totalPrice / 100).toFixed(2) : "0.00";
                            const orderId = appointment.id.toString();
                            const title = `Agendamento #${orderId}`;
                            
                            // Formatação para o URI do SumUp - usando a chave de afiliado da aplicação
                            const sumupDeeplink = `sumupmerchant://pay/1.0` + 
                              `?affiliate-key=sup_afk_cJWRDlQTDiGv4sKAGlxGTTcncW7ZcwBF` + 
                              `&app-id=com.agendoai.app` + 
                              `&total=${amount}` + 
                              `&currency=BRL` + 
                              `&title=${encodeURIComponent(title)}` + 
                              `&foreign-tx-id=${orderId}` +
                              `&callback=agendoai://payment_result`;
                            
                            // Log para debug
                            console.log('Abrindo SumUp deeplink:', sumupDeeplink);
                            
                            // Abrir deeplink
                            window.open(sumupDeeplink, '_blank');
                            
                            // Atualizar status do agendamento para "processing_payment"
                            updateStatusMutation.mutate({ 
                              appointmentId: appointment.id, 
                              status: 'processing_payment',
                              paymentMethod: 'card_sumup'
                            });
                          }}
                        >
                          Fazer cobrança pelo app (Tap to Pay)
                          <span className="text-xs ml-2 text-muted-foreground">→ Você será redirecionado para o SumUp</span>
                        </Button>
                        
                        <Button 
                          type="button" 
                          variant="outline" 
                          className="w-full justify-start" 
                          onClick={() => {
                            // Marcar como cobrado externamente
                            updateStatusMutation.mutate({ 
                              appointmentId: appointment.id, 
                              status: 'completed',
                              paymentStatus: 'paid_externally'
                            });
                          }}
                        >
                          Registrar como cobrado externamente
                          <span className="text-xs ml-2 text-muted-foreground">→ Pago em dinheiro, PIX ou outro meio</span>
                        </Button>
                        
                        <Button 
                          type="button" 
                          variant="ghost" 
                          className="w-full justify-start" 
                          onClick={() => {
                            // Marcar como concluído, pendente cobrança
                            updateStatusMutation.mutate({ 
                              appointmentId: appointment.id, 
                              status: 'completed',
                              paymentStatus: 'pending'
                            });
                          }}
                        >
                          Ainda não realizei a cobrança
                          <span className="text-xs ml-2 text-muted-foreground">→ Será marcado como pendente de cobrança</span>
                        </Button>
                      </div>
                    </div>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          
          {(userType === 'admin' || userType === 'support') && (
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8 text-xs"
                onClick={() => setLocation(`/admin/appointments/${appointment.id}`)}
              >
                <MessageSquare className="h-3 w-3 mr-1" /> Gerenciar
              </Button>
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}