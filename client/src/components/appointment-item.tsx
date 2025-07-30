import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { Check, Ban, Star, Calendar, MessageSquare, X, AlertCircle, MoreVertical, Play, CheckCircle, CreditCard } from 'lucide-react';
import { 
  Card, 
  CardContent, 
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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

// Função para formatar status de pagamento
const formatPaymentStatus = (paymentStatus: string) => {
  switch (paymentStatus) {
    case 'paid':
      return { text: 'Pago', color: 'bg-green-100 text-green-800', icon: <CreditCard className="h-3 w-3" /> };
    case 'pending':
      return { text: 'Aguardando', color: 'bg-yellow-100 text-yellow-800', icon: <AlertCircle className="h-3 w-3" /> };
    case 'failed':
      return { text: 'Falhou', color: 'bg-red-100 text-red-800', icon: <X className="h-3 w-3" /> };
    case 'refunded':
      return { text: 'Reembolsado', color: 'bg-gray-100 text-gray-800', icon: <Ban className="h-3 w-3" /> };
    case 'paid_externally':
      return { text: 'Pago ext.', color: 'bg-blue-100 text-blue-800', icon: <CreditCard className="h-3 w-3" /> };
    default:
      return { text: 'Não informado', color: 'bg-gray-100 text-gray-600', icon: <AlertCircle className="h-3 w-3" /> };
  }
};

// Mapeamento de classes de cores por status
const statusColorMap = {
  pending: 'bg-yellow-50 border-yellow-200',
  confirmed: 'bg-blue-50 border-blue-200',
  executing: 'bg-purple-50 border-purple-200',
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

  const handleConfirm = () => {
    updateStatusMutation.mutate({ appointmentId: appointment.id, status: 'confirmed' });
  };

  const handleExecute = () => {
    updateStatusMutation.mutate({ appointmentId: appointment.id, status: 'executing' });
  };

  const handleMarkAsPaid = () => {
    updateStatusMutation.mutate({ 
      appointmentId: appointment.id, 
      paymentStatus: 'paid' // marca como pago sem alterar o status
    });
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
    <Card
      className={`relative border-0 shadow-xl rounded-2xl mb-4 transition-transform duration-200 hover:-translate-y-1 hover:shadow-2xl hover:ring-2 hover:ring-blue-200 bg-white/90 group`}
    >
      <CardContent className="p-5 flex items-center gap-4">
        {/* Avatar */}
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-100 to-blue-200 flex items-center justify-center text-2xl font-bold text-blue-700 shadow-md">
          {userType === 'client' ? (
            <span>{appointment.providerName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}</span>
          ) : (
            <span>{appointment.clientName?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}</span>
          )}
        </div>
        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-lg text-gray-900 truncate">
              {userType === 'client' ? appointment.providerName : appointment.clientName}
            </span>
          </div>
          
          {/* Status badges em linha separada para melhor organização */}
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1
              ${appointment.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                appointment.status === 'confirmed' ? 'bg-blue-100 text-blue-800' :
                appointment.status === 'executing' ? 'bg-purple-100 text-purple-800' :
                appointment.status === 'completed' ? 'bg-green-100 text-green-800' :
                appointment.status === 'canceled' ? 'bg-red-100 text-red-800' :
                'bg-gray-100 text-gray-600'}
            `}>
              {appointment.status === 'pending' && <AlertCircle className="h-3 w-3" />}
              {appointment.status === 'confirmed' && <Check className="h-3 w-3" />}
              {appointment.status === 'executing' && <Play className="h-3 w-3" />}
              {appointment.status === 'completed' && <Star className="h-3 w-3" />}
              {appointment.status === 'canceled' && <X className="h-3 w-3" />}
              {appointment.status === 'no_show' && <Ban className="h-3 w-3" />}
              {formatStatus(appointment.status)}
            </span>
            
            {/* Indicador de pagamento */}
            {appointment.paymentStatus && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1 ${
                formatPaymentStatus(appointment.paymentStatus).color
              }`}>
                {formatPaymentStatus(appointment.paymentStatus).icon}
                {formatPaymentStatus(appointment.paymentStatus).text}
              </span>
            )}
          </div>
          
          <div className="text-sm text-gray-500 truncate mb-1">{appointment.serviceName}</div>
          <div className="flex items-center gap-3 text-xs text-gray-500">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {formattedDate}, {appointment.startTime}</span>
            <span className="flex items-center gap-1 font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full ml-2">
              R$ {((appointment.totalPrice || 0) / 100).toFixed(2)}
            </span>
          </div>
        </div>
        {/* Actions */}
        {showActions && (
          <div className="flex items-center gap-2 ml-4">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={handleViewDetails}
              className="h-8 w-8 p-0 border-gray-300 hover:border-blue-400"
              title="Detalhes"
            >
              <Calendar className="h-4 w-4" />
            </Button>
            
            {/* Menu de ações com 3 pontos */}
            {userType === 'provider' && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8 p-0 border-gray-300 hover:border-blue-400"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 bg-white border border-gray-200 shadow-lg">
                  
                  {/* Mostrar todas as opções de status disponíveis */}
                  {appointment.status === 'pending' && (
                    <DropdownMenuItem onClick={handleConfirm}>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirmado
                    </DropdownMenuItem>
                  )}
                  
                  {appointment.status === 'confirmed' && (
                    <DropdownMenuItem onClick={handleExecute}>
                      <Play className="mr-2 h-4 w-4" />
                      Executando
                    </DropdownMenuItem>
                  )}
                  
                  {appointment.status === 'executing' && (
                    <>
                      <DropdownMenuItem onClick={handleComplete}>
                        <Check className="mr-2 h-4 w-4" />
                        Concluído
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleConfirm}>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Voltar para Confirmado
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {/* Opções sempre disponíveis (exceto para agendamentos cancelados/concluídos) */}
                  {appointment.status !== 'canceled' && appointment.status !== 'completed' && (
                    <>
                      <DropdownMenuItem onClick={handleNoShow}>
                        <AlertCircle className="mr-2 h-4 w-4" />
                        Não compareceu
                      </DropdownMenuItem>
                      
                      <DropdownMenuItem onClick={handleCancel} className="text-red-600">
                        <X className="mr-2 h-4 w-4" />
                        Cancelar
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {/* Opção para marcar como pago (sempre disponível exceto para cancelados) */}
                  {appointment.status !== 'canceled' && appointment.paymentStatus !== 'paid' && (
                    <DropdownMenuItem onClick={handleMarkAsPaid} className="text-green-600">
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pago
                    </DropdownMenuItem>
                  )}
                  
                  {/* Opções de transição de status (para mostrar o fluxo completo) */}
                  {appointment.status === 'pending' && (
                    <>
                      <DropdownMenuItem onClick={handleExecute}>
                        <Play className="mr-2 h-4 w-4" />
                        Executando
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleComplete}>
                        <Check className="mr-2 h-4 w-4" />
                        Concluído
                      </DropdownMenuItem>
                    </>
                  )}
                  
                  {appointment.status === 'confirmed' && (
                    <DropdownMenuItem onClick={handleComplete}>
                      <Check className="mr-2 h-4 w-4" />
                      Concluído
                    </DropdownMenuItem>
                  )}
                  
                  {/* Separador visual */}
                  {appointment.status !== 'canceled' && appointment.status !== 'completed' && (
                    <div className="h-px bg-gray-200 my-1" />
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}