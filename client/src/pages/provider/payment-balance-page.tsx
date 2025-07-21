import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '../../hooks/use-auth';
import { getAsaasProviderBalance, getAsaasProvider } from '../../lib/api';
import { Button } from '../../components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { 
  Loader2, 
  RefreshCw, 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Banknote,
  CreditCard
} from 'lucide-react';

interface BalanceData {
  balance: number;
  walletId: string;
}

interface ProviderData {
  id: number;
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  asaasWalletId: string;
  bankAccount: {
    bank: string;
    accountNumber: string;
    accountDigit: string;
    branchNumber: string;
    branchDigit?: string;
    accountType: 'CHECKING' | 'SAVINGS';
  };
  createdAt: string;
}

const banks = [
  { code: '001', name: 'Banco do Brasil' },
  { code: '104', name: 'Caixa Econômica Federal' },
  { code: '033', name: 'Santander' },
  { code: '341', name: 'Itaú' },
  { code: '237', name: 'Bradesco' },
  { code: '756', name: 'Sicoob' },
  { code: '748', name: 'Sicredi' },
  { code: '212', name: 'Banco Original' },
  { code: '077', name: 'Inter' },
  { code: '260', name: 'Nubank' },
];

export default function PaymentBalancePage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [balanceData, setBalanceData] = useState<BalanceData | null>(null);
  const [providerData, setProviderData] = useState<ProviderData | null>(null);

  const loadData = async () => {
    try {
      setError(null);
      
      // Carregar dados do prestador
      const providerResult = await getAsaasProvider(user?.id || 0);
      if (providerResult.success) {
        setProviderData(providerResult.provider);
        
        // Carregar saldo
        const balanceResult = await getAsaasProviderBalance(providerResult.provider.id);
        if (balanceResult.success) {
          setBalanceData(balanceResult);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getBankName = (code: string) => {
    const bank = banks.find(b => b.code === code);
    return bank ? bank.name : code;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Carregando dados de pagamento...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Erro ao carregar dados
              </h2>
              <p className="text-gray-600 mb-4">{error}</p>
              <Button onClick={handleRefresh} disabled={refreshing}>
                {refreshing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Tentando novamente...
                  </>
                ) : (
                  'Tentar novamente'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!providerData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <Banknote className="w-16 h-16 text-blue-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                Conta de Pagamentos não configurada
              </h2>
              <p className="text-gray-600 mb-4">
                Você precisa configurar sua conta de pagamentos para receber os valores dos seus clientes.
              </p>
              <Button onClick={() => setLocation('/provider/asaas-onboarding')}>
                Configurar Agora
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <DollarSign className="w-8 h-8 mr-3 text-green-600" />
              Meus Pagamentos
            </h1>
            <p className="text-gray-600 mt-2">
              Gerencie seus recebimentos e consulte seu saldo
            </p>
          </div>
          <Button onClick={handleRefresh} disabled={refreshing} variant="outline">
            {refreshing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                Atualizar
              </>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Saldo Atual */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-green-600" />
                Saldo Disponível
              </CardTitle>
              <CardDescription>
                Valor disponível para saque
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600 mb-2">
                {balanceData ? formatCurrency(balanceData.balance) : 'R$ 0,00'}
              </div>
              <Badge variant="secondary" className="text-sm">
                Wallet ID: {balanceData?.walletId?.slice(0, 8)}...
              </Badge>
            </CardContent>
          </Card>

          {/* Informações da Conta */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                Dados da Conta
              </CardTitle>
              <CardDescription>
                Informações bancárias para recebimento
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Banco</p>
                  <p className="text-gray-900">{getBankName(providerData.bankAccount.bank)}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Tipo de Conta</p>
                  <p className="text-gray-900">
                    {providerData.bankAccount.accountType === 'CHECKING' ? 'Conta Corrente' : 'Conta Poupança'}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Agência</p>
                  <p className="text-gray-900">
                    {providerData.bankAccount.branchNumber}
                    {providerData.bankAccount.branchDigit && `-${providerData.bankAccount.branchDigit}`}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Conta</p>
                  <p className="text-gray-900">
                    {providerData.bankAccount.accountNumber}-{providerData.bankAccount.accountDigit}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Como funciona */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-orange-600" />
              Como funciona o pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  1
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Cliente agenda</h4>
                <p className="text-sm text-gray-600">Cliente agenda e paga o serviço</p>
              </div>
              
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="w-8 h-8 bg-orange-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  2
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Taxa descontada</h4>
                <p className="text-sm text-gray-600">R$ 1,75 vai para a plataforma</p>
              </div>
              
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <div className="w-8 h-8 bg-yellow-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  3
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Valor retido</h4>
                <p className="text-sm text-gray-600">Valor do serviço fica em custódia</p>
              </div>
              
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center mx-auto mb-2 text-sm font-bold">
                  4
                </div>
                <h4 className="font-medium text-gray-900 mb-1">Liberação</h4>
                <p className="text-sm text-gray-600">Após confirmação, valor é liberado</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Alertas importantes */}
        <div className="space-y-4">
          <Alert>
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Segurança:</strong> Seus dados bancários são criptografados e usados apenas para processar pagamentos.
            </AlertDescription>
          </Alert>
          
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Importante:</strong> O valor dos serviços fica retido até que o serviço seja confirmado como concluído.
            </AlertDescription>
          </Alert>
        </div>
      </div>
    </div>
  );
} 