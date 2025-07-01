import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import ProviderLayout from "@/components/layout/provider-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { formatCurrency, formatDate } from "@/lib/utils";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { DollarSign, ArrowDownCircle, Wallet, CreditCard, Calendar, RefreshCcw, HelpCircle } from "lucide-react";

type ProviderBalance = {
  id: number;
  providerId: number;
  availableBalance: number;
  pendingBalance: number;
  totalEarnings: number;
  lastUpdated: string;
};

type ProviderTransaction = {
  id: number;
  providerId: number;
  type: 'PAYMENT' | 'FEE' | 'WITHDRAWAL' | 'ADJUSTMENT';
  amount: number;
  fee: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'CANCELED';
  description: string;
  appointmentId?: number;
  transactionDate: string;
  metadata?: any;
};

export default function ProviderFinancesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>("");
  const [withdrawalDialogOpen, setWithdrawalDialogOpen] = useState(false);
  const providerId = user?.id;

  // Saldo do prestador (marketplace removido)
  const { 
    data: balance = {
      providerId: user?.id || 0,
      availableBalance: 0,
      pendingBalance: 0,
      totalEarnings: 0,
      lastUpdated: new Date().toISOString()
    }, 
    isLoading: isLoadingBalance,
    refetch: refetchBalance
  } = useQuery<ProviderBalance>({
    queryKey: ["/api/provider/balance"],
    refetchOnWindowFocus: false,
    enabled: false, // Desativado, pois o marketplace foi removido
  });

  // Transações do prestador (marketplace removido)
  const { 
    data: transactions = [], 
    isLoading: isLoadingTransactions,
    refetch: refetchTransactions
  } = useQuery<ProviderTransaction[]>({
    queryKey: ["/api/provider/transactions"],
    refetchOnWindowFocus: false,
    enabled: false, // Desativado, pois o marketplace foi removido
  });

  // Mutação para solicitar saque
  const requestWithdrawalMutation = useMutation({
    mutationFn: async (amount: number) => {
      // Marketplace removido - função desativada
      toast({
        title: "Funcionalidade desativada",
        description: "O sistema de marketplace foi removido. Esta funcionalidade não está mais disponível.",
        variant: "destructive"
      });
      return null;
    },
    onSuccess: () => {
      toast({
        title: "Solicitação enviada",
        description: "Sua solicitação de saque foi enviada com sucesso e será processada em breve.",
      });
      setWithdrawalDialogOpen(false);
      setWithdrawalAmount("");
      refetchBalance();
      refetchTransactions();
    },
    onError: (error: any) => {
      toast({
        title: "Erro na solicitação",
        description: error.message || "Ocorreu um erro ao processar sua solicitação de saque.",
        variant: "destructive",
      });
    }
  });

  const handleWithdrawalRequest = () => {
    const amount = parseFloat(withdrawalAmount.replace(/[^\d.]/g, ""));

    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Valor inválido",
        description: "Por favor, insira um valor válido para saque.",
        variant: "destructive",
      });
      return;
    }

    if (balance && amount > balance.availableBalance) {
      toast({
        title: "Saldo insuficiente",
        description: "O valor solicitado excede seu saldo disponível para saque.",
        variant: "destructive",
      });
      return;
    }

    requestWithdrawalMutation.mutate(amount);
  };

  // Formatar tipo de transação para exibição
  const formatTransactionType = (type: string) => {
    const types: Record<string, string> = {
      'PAYMENT': 'Pagamento',
      'FEE': 'Taxa',
      'WITHDRAWAL': 'Saque',
      'ADJUSTMENT': 'Ajuste'
    };
    return types[type] || type;
  };

  // Formatar status da transação para exibição
  const formatTransactionStatus = (status: string) => {
    const statuses: Record<string, string> = {
      'PENDING': 'Pendente',
      'COMPLETED': 'Concluído',
      'FAILED': 'Falhou',
      'CANCELED': 'Cancelado'
    };
    return statuses[status] || status;
  };

  // Obter classe CSS para o status
  const getStatusClass = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'text-green-600';
      case 'PENDING':
        return 'text-yellow-600';
      case 'FAILED':
      case 'CANCELED':
        return 'text-red-600';
      default:
        return '';
    }
  };

  // Obter classe CSS para o tipo de transação (para exibição de ícones ou cores)
  const getTransactionTypeClass = (type: string, amount: number) => {
    if (type === 'PAYMENT') return 'text-green-600';
    if (type === 'FEE' || type === 'WITHDRAWAL') return 'text-red-600';
    if (type === 'ADJUSTMENT') {
      return amount >= 0 ? 'text-green-600' : 'text-red-600';
    }
    return '';
  };

  return (
    <ProviderLayout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Finanças</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Card de Saldo Disponível */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Wallet className="h-5 w-5 text-primary" />
                Saldo Disponível
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <div className="text-3xl font-bold text-primary">
                  {formatCurrency(balance?.availableBalance || 0)}
                </div>
              )}
              <div className="mt-4">
                <Button 
                  onClick={() => setWithdrawalDialogOpen(true)}
                  disabled={isLoadingBalance || !balance || balance.availableBalance <= 0}
                >
                  <ArrowDownCircle className="mr-2 h-4 w-4" />
                  Solicitar Saque
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Card de Saldo Pendente */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-yellow-500" />
                Saldo Pendente
              </CardTitle>
              <CardDescription>
                Valores em processamento
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <div className="text-3xl font-bold text-yellow-500">
                  {formatCurrency(balance?.pendingBalance || 0)}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Card de Ganhos Totais */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Ganhos Totais
              </CardTitle>
              <CardDescription>
                Desde o início
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBalance ? (
                <Skeleton className="h-10 w-32" />
              ) : (
                <div className="text-3xl font-bold text-green-500">
                  {formatCurrency(balance?.totalEarnings || 0)}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="transactions" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="transactions">Transações</TabsTrigger>
            <TabsTrigger value="withdrawals">Saques</TabsTrigger>
          </TabsList>

          <TabsContent value="transactions">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Histórico de Transações</span>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => refetchTransactions()}
                    disabled={isLoadingTransactions}
                  >
                    <RefreshCcw className="h-4 w-4 mr-2" />
                    Atualizar
                  </Button>
                </CardTitle>
                <CardDescription>
                  Seus pagamentos recebidos e taxas cobradas são listados aqui.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTransactions ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : transactions && transactions.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((transaction) => (
                        <TableRow key={transaction.id}>
                          <TableCell>{formatDate(new Date(transaction.transactionDate))}</TableCell>
                          <TableCell>
                            <span className={getTransactionTypeClass(transaction.type, transaction.amount)}>
                              {formatTransactionType(transaction.type)}
                            </span>
                          </TableCell>
                          <TableCell>{transaction.description}</TableCell>
                          <TableCell className={getTransactionTypeClass(transaction.type, transaction.amount)}>
                            {transaction.type === 'PAYMENT' || (transaction.type === 'ADJUSTMENT' && transaction.amount >= 0)
                              ? `+${formatCurrency(transaction.amount)}`
                              : `-${formatCurrency(Math.abs(transaction.amount))}`}
                          </TableCell>
                          <TableCell>
                            <span className={getStatusClass(transaction.status)}>
                              {formatTransactionStatus(transaction.status)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    Nenhuma transação encontrada.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdrawals">
            <Card>
              <CardHeader>
                <CardTitle>Histórico de Saques</CardTitle>
                <CardDescription>
                  Seus pedidos de saque e status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoadingTransactions ? (
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : transactions ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions
                        .filter(t => t.type === 'WITHDRAWAL')
                        .map((withdrawal) => (
                          <TableRow key={withdrawal.id}>
                            <TableCell>{formatDate(new Date(withdrawal.transactionDate))}</TableCell>
                            <TableCell>{formatCurrency(withdrawal.amount)}</TableCell>
                            <TableCell>
                              <span className={getStatusClass(withdrawal.status)}>
                                {formatTransactionStatus(withdrawal.status)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      {transactions.filter(t => t.type === 'WITHDRAWAL').length === 0 && (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                            Nenhum saque encontrado.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center text-muted-foreground py-10">
                    Nenhum saque encontrado.
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog para solicitação de saque */}
        <Dialog open={withdrawalDialogOpen} onOpenChange={setWithdrawalDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Solicitar Saque</DialogTitle>
              <DialogDescription>
                Solicite o saque de fundos disponíveis em sua conta.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <Label htmlFor="withdrawal-amount">Valor para saque</Label>
                <div className="flex items-center mt-1">
                  <span className="bg-muted px-3 py-2 border border-r-0 rounded-l-md">R$</span>
                  <Input
                    id="withdrawal-amount"
                    placeholder="0,00"
                    value={withdrawalAmount}
                    onChange={(e) => setWithdrawalAmount(e.target.value)}
                    className="rounded-l-none"
                  />
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  Saldo disponível: {formatCurrency(balance?.availableBalance || 0)}
                </div>
              </div>

              <div className="flex justify-between items-center pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWithdrawalDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={handleWithdrawalRequest}
                  disabled={requestWithdrawalMutation.isPending || !withdrawalAmount}
                >
                  {requestWithdrawalMutation.isPending ? (
                    <>
                      <RefreshCcw className="mr-2 h-4 w-4 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <ArrowDownCircle className="mr-2 h-4 w-4" />
                      Solicitar Saque
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </ProviderLayout>
  );
}