import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
type Params = { id: string };
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import ProviderLayout from '@/components/layout/provider-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Clock,
  Calendar,
  User,
  Phone,
  MapPin,
  Package,
  Banknote,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowLeft,
  MessageSquare
} from 'lucide-react';
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
import { Dialog, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface Appointment {
  id: number;
  clientId: number;
  providerId: number;
  serviceId: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  cancellationReason?: string;
  cancellationDate?: string;
  cancellationBy?: string;
  isManuallyCreated?: boolean;
  paymentMethod?: string;
  totalPrice?: number;

  // Campos adicionais que vêm do backend
  serviceName?: string;
  serviceDescription?: string;
  servicePrice?: number;
  clientName?: string;
  clientPhone?: string;
  clientEmail?: string;
  clientImage?: string;
}

export default function ProviderAppointmentDetailsPage() {
  const { id } = useParams<Params>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCompleteModalOpen, setIsCompleteModalOpen] = useState(false);
  const [isNoShowModalOpen, setIsNoShowModalOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  
  const appointmentId = parseInt(id || '0');

  // Carregar dados do agendamento
  const { data: appointment, isLoading, error } = useQuery({
    queryKey: ['/api/appointments', appointmentId],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', `/api/appointments/${appointmentId}`);
        
        if (!response.ok) {
          console.error('Erro na resposta do servidor:', response.status, response.statusText);
          throw new Error(`Erro ao carregar dados do agendamento: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Dados do agendamento recebidos:', data);
        return data as Appointment;
      } catch (err) {
        console.error('Exceção ao carregar agendamento:', err);
        throw err;
      }
    },
    enabled: !!appointmentId && !isNaN(appointmentId),
    retry: 1
  });

  // Mutação para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ status, reason }: { status: string; reason?: string }) => {
      const payload: any = { status };
      if (reason) {
        payload.cancellationReason = reason;
      }
      
      const response = await apiRequest('PUT', `/api/appointments/${appointmentId}/status`, payload);
      if (!response.ok) {
        throw new Error('Não foi possível atualizar o status do agendamento');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments', appointmentId] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      toast({
        title: 'Status atualizado',
        description: 'O status do agendamento foi atualizado com sucesso',
      });
      
      setIsCancelModalOpen(false);
      setIsCompleteModalOpen(false);
      setIsNoShowModalOpen(false);
      setCancellationReason('');
    },
    onError: (error) => {
      toast({
        variant: 'destructive',
        title: 'Erro',
        description: `Ocorreu um erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      });
    }
  });

  // Funções de manipulação
  const handleCancel = () => {
    updateStatusMutation.mutate({ 
      status: 'canceled', 
      reason: cancellationReason || 'Cancelado pelo prestador'
    });
  };

  const handleComplete = () => {
    updateStatusMutation.mutate({ status: 'completed' });
  };

  const handleNoShow = () => {
    updateStatusMutation.mutate({ status: 'no_show' });
  };

  const formatDate = (dateString: string) => {
    try {
      return format(parseISO(dateString), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (e) {
      return dateString;
    }
  };

  const getStatusBadgeColor = (status: string) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-blue-100 text-blue-800',
      completed: 'bg-green-100 text-green-800',
      canceled: 'bg-red-100 text-red-800',
      no_show: 'bg-gray-100 text-gray-800',
    };
    
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status: string) => {
    const statusMap: Record<string, string> = {
      pending: 'Pendente',
      confirmed: 'Confirmado',
      completed: 'Concluído',
      canceled: 'Cancelado',
      no_show: 'Não compareceu',
    };
    
    return statusMap[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'canceled':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'no_show':
        return <AlertTriangle className="h-5 w-5 text-amber-500" />;
      default:
        return null;
    }
  };

  // Verificar se o agendamento está no futuro para determinar se ações são possíveis
  const isAppointmentInFuture = () => {
    if (!appointment) return false;
    const appointmentDateTime = new Date(`${appointment.date}T${appointment.startTime}`);
    return appointmentDateTime > new Date();
  };

  if (isLoading) {
    return (
      <ProviderLayout>
        <div className="flex justify-center items-center min-h-[70vh]">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="h-40 bg-gray-200 rounded w-full"></div>
            <div className="h-40 bg-gray-200 rounded w-full"></div>
          </div>
        </div>
      </ProviderLayout>
    );
  }

  if (error || !appointment) {
    return (
      <ProviderLayout>
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="text-center py-10">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Erro ao carregar agendamento</h2>
            <p className="text-gray-600 mb-6">Não foi possível carregar os detalhes deste agendamento. Verifique se o ID está correto ou tente novamente mais tarde.</p>
            <Button onClick={() => navigate('/provider/appointments')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para agendamentos
            </Button>
          </div>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/provider/appointments')}
            className="mr-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold">Detalhes do Agendamento</h1>
        </div>

        <Card className="mb-6">
          <CardHeader className="pb-2">
            <div className="flex justify-between items-center">
              <CardTitle className="text-xl">{appointment.serviceName}</CardTitle>
              <span 
                className={`px-3 py-1 rounded-full text-sm font-medium inline-flex items-center ${getStatusBadgeColor(appointment.status)}`}
              >
                {getStatusIcon(appointment.status)}
                <span className={getStatusIcon(appointment.status) ? "ml-1" : ""}>
                  {formatStatus(appointment.status)}
                </span>
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center">
              <Calendar className="h-5 w-5 text-gray-500 mr-3" />
              <span>{formatDate(appointment.date)}</span>
            </div>
            <div className="flex items-center">
              <Clock className="h-5 w-5 text-gray-500 mr-3" />
              <span>{`${appointment.startTime} às ${appointment.endTime}`}</span>
            </div>
            <Separator />
            <div className="flex items-center">
              <User className="h-5 w-5 text-gray-500 mr-3" />
              <span>{appointment.clientName || 'Cliente'}</span>
            </div>
            {appointment.clientPhone && (
              <div className="flex items-center">
                <Phone className="h-5 w-5 text-gray-500 mr-3" />
                <span>{appointment.clientPhone}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center">
              <Package className="h-5 w-5 text-gray-500 mr-3" />
              <div>
                <p className="font-medium">{appointment.serviceName}</p>
                {appointment.serviceDescription && (
                  <p className="text-sm text-gray-500 mt-1">{appointment.serviceDescription}</p>
                )}
              </div>
            </div>
            <div className="flex items-center">
              <Banknote className="h-5 w-5 text-gray-500 mr-3" />
              <span>R$ {((appointment.totalPrice || appointment.servicePrice || 0) / 100).toFixed(2)}</span>
            </div>
            {appointment.notes && (
              <div className="pt-2">
                <div className="flex items-start">
                  <FileText className="h-5 w-5 text-gray-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Observações</p>
                    <p className="text-sm text-gray-600">{appointment.notes}</p>
                  </div>
                </div>
              </div>
            )}
            {appointment.status === 'canceled' && appointment.cancellationReason && (
              <div className="pt-2">
                <div className="flex items-start">
                  <XCircle className="h-5 w-5 text-red-500 mr-3 mt-0.5" />
                  <div>
                    <p className="font-medium mb-1">Motivo do cancelamento</p>
                    <p className="text-sm text-gray-600">{appointment.cancellationReason}</p>
                    {appointment.cancellationDate && (
                      <p className="text-xs text-gray-500 mt-1">
                        Cancelado em {format(new Date(appointment.cancellationDate), "dd/MM/yyyy 'às' HH:mm")}
                        {appointment.cancellationBy === 'provider' ? ' por você' : ' pelo cliente'}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-2 flex flex-wrap gap-2 justify-end">
            {/* Botões de ação com base no status atual */}
            {appointment.status !== 'completed' && 
             appointment.status !== 'canceled' && 
             appointment.status !== 'no_show' && (
              <>
                {/* Botão Concluir */}
                <AlertDialog open={isCompleteModalOpen} onOpenChange={setIsCompleteModalOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="default" className="bg-green-600 hover:bg-green-700">
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Marcar como concluído
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmar conclusão</AlertDialogTitle>
                      <AlertDialogDescription>
                        Tem certeza que deseja marcar este agendamento como concluído?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleComplete}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                {/* Botão Cancelar */}
                <Dialog open={isCancelModalOpen} onOpenChange={setIsCancelModalOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive">
                      <XCircle className="h-4 w-4 mr-1" />
                      Cancelar agendamento
                    </Button>
                  </AlertDialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Cancelar agendamento</DialogTitle>
                      <DialogDescription>
                        Por favor, informe o motivo do cancelamento.
                      </DialogDescription>
                    </DialogHeader>
                    <Textarea
                      value={cancellationReason}
                      onChange={(e) => setCancellationReason(e.target.value)}
                      placeholder="Motivo do cancelamento"
                      className="min-h-[100px]"
                    />
                    <DialogFooter className="mt-4">
                      <Button
                        variant="outline"
                        onClick={() => setIsCancelModalOpen(false)}
                      >
                        Voltar
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleCancel}
                        disabled={updateStatusMutation.isPending}
                      >
                        {updateStatusMutation.isPending ? 'Processando...' : 'Confirmar cancelamento'}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Botão Não Compareceu */}
                <AlertDialog open={isNoShowModalOpen} onOpenChange={setIsNoShowModalOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline">
                      <AlertTriangle className="h-4 w-4 mr-1" />
                      Não compareceu
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
                      <AlertDialogCancel>Voltar</AlertDialogCancel>
                      <AlertDialogAction onClick={handleNoShow}>
                        Confirmar
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
          </CardFooter>
        </Card>
      </div>
    </ProviderLayout>
  );
}