import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  getAsaasProviderSubAccountBalance, 
  getAsaasProviderPayments, 
  releaseAsaasProviderEscrowValue 
} from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  Shield, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  RefreshCw,
  ArrowRight
} from "lucide-react";

export default function AsaasPaymentsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPayment, setSelectedPayment] = useState<any>(null);

  // Usar o ID do usuário logado
  const providerId = user?.id || 0;

  // Consultar saldo da subconta
  const { data: balanceData, isLoading: balanceLoading } = useQuery({
    queryKey: ['asaas-provider-balance', providerId],
    queryFn: () => getAsaasProviderSubAccountBalance(providerId),
    enabled: !!providerId
  });

  // Consultar pagamentos da subconta
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ['asaas-provider-payments', providerId],
    queryFn: () => getAsaasProviderPayments(providerId),
    enabled: !!providerId
  });

  // Mutation para liberar valor da custódia
  const releaseMutation = useMutation({
    mutationFn: ({ providerId, amount }: { providerId: number; amount: number }) =>
      releaseAsaasProviderEscrowValue(providerId, amount),
    onSuccess: () => {
      toast({
        title: "Valor liberado!",
        description: "O valor foi transferido para sua conta com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['asaas-provider-balance'] });
      queryClient.invalidateQueries({ queryKey: ['asaas-provider-payments'] });
      setSelectedPayment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao liberar valor",
        description: error.message || "Erro interno do servidor",
        variant: "destructive",
      });
    }
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value / 100); // Converter de centavos
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getPaymentStatus = (payment: any) => {
    switch (payment.status) {
      case 'RECEIVED':
        return { label: 'Recebido', color: 'bg-green-100 text-green-800' };
      case 'PENDING':
        return { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' };
      case 'OVERDUE':
        return { label: 'Vencido', color: 'bg-red-100 text-red-800' };
      default:
        return { label: 'Desconhecido', color: 'bg-gray-100 text-gray-800' };
    }
  };

  const handleReleasePayment = (payment: any) => {
    if (payment.status === 'RECEIVED' && payment.value > 0) {
      releaseMutation.mutate({
        providerId: providerId,
        amount: payment.value
      });
    }
  };

  if (balanceLoading || paymentsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <RefreshCw className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Meus Pagamentos Asaas</h1>
        <Button
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: ['asaas-provider-balance'] });
            queryClient.invalidateQueries({ queryKey: ['asaas-provider-payments'] });
          }}
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Saldo da Subconta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Saldo da Conta
          </CardTitle>
          <CardDescription>
            Valores disponíveis na sua subconta Asaas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {balanceData?.success ? (
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency(balanceData.balance || 0)}
            </div>
          ) : (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Erro ao carregar saldo: {balanceData?.error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Informações sobre Custódia */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          <strong>Como funciona a custódia:</strong><br />
          • Os valores dos serviços ficam retidos na sua subconta até você confirmar que o serviço foi realizado<br />
          • Após a confirmação, o valor é liberado e transferido para sua conta bancária<br />
          • A taxa da plataforma (R$ 1,75) vai direto para a empresa
        </AlertDescription>
      </Alert>

      {/* Lista de Pagamentos */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Pagamentos</CardTitle>
          <CardDescription>
            Pagamentos recebidos e valores retidos na custódia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsData?.success && paymentsData.payments?.length > 0 ? (
            <div className="space-y-4">
              {paymentsData.payments.map((payment: any) => {
                const status = getPaymentStatus(payment);
                return (
                  <div key={payment.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">
                          {formatCurrency(payment.value)}
                        </span>
                        <Badge className={status.color}>
                          {status.label}
                        </Badge>
                      </div>
                      <span className="text-sm text-gray-500">
                        {formatDate(payment.dueDate)}
                      </span>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {payment.description || 'Pagamento de serviço'}
                    </p>

                    {payment.status === 'RECEIVED' && payment.value > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">
                          Valor retido na custódia
                        </span>
                        <Button
                          onClick={() => handleReleasePayment(payment)}
                          disabled={releaseMutation.isPending}
                          size="sm"
                        >
                          {releaseMutation.isPending ? (
                            <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <ArrowRight className="h-4 w-4 mr-2" />
                          )}
                          Liberar Valor
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Nenhum pagamento encontrado</p>
              <p className="text-sm">Os pagamentos aparecerão aqui quando você receber agendamentos</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
} 