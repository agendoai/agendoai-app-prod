// Página de confirmação após o processamento da assinatura
import { useEffect, useState } from 'react';
import ClientLayout from '@/components/layout/client-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet';
import { useLocation, Link } from 'wouter';
import { Loader2, CheckCircle, AlertTriangle, XCircle, ArrowLeft, CreditCard } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export default function SubscriptionConfirmation() {
  const [isLoading, setIsLoading] = useState(true);
  const [location] = useLocation();
  const { toast } = useToast();
  const [status, setStatus] = useState<'success' | 'processing' | 'failed' | null>(null);
  
  useEffect(() => {
    // Extrair os parâmetros da URL
    const params = new URLSearchParams(window.location.search);
    const paymentIntent = params.get('payment_intent');
    const paymentIntentClientSecret = params.get('payment_intent_client_secret');
    const redirectStatus = params.get('redirect_status');
    
    if (!paymentIntent || !paymentIntentClientSecret) {
      setStatus('failed');
      toast({
        title: "Erro na assinatura",
        description: "Informações da assinatura incompletas",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }
    
    // Definir o status com base no redirect_status
    if (redirectStatus === 'succeeded') {
      setStatus('success');
      toast({
        title: "Assinatura confirmada",
        description: "Sua assinatura foi ativada com sucesso!",
      });
    } else if (redirectStatus === 'processing') {
      setStatus('processing');
      toast({
        title: "Assinatura em processamento",
        description: "Sua assinatura está sendo processada. Atualizaremos você assim que for concluída.",
      });
    } else {
      setStatus('failed');
      toast({
        title: "Falha na assinatura",
        description: "Ocorreu um problema com sua assinatura. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
    
    setIsLoading(false);
  }, [toast]);
  
  return (
    <ClientLayout>
      <Helmet>
        <title>
          {status === 'success' 
            ? 'Assinatura Confirmada'
            : status === 'processing'
              ? 'Assinatura em Processamento'
              : 'Falha na Assinatura'} | AgendoAI
        </title>
      </Helmet>
      
      <div className="container mx-auto py-10 max-w-2xl">
        <div className="mb-4">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/client/dashboard">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Dashboard
            </Link>
          </Button>
        </div>
        
        {isLoading ? (
          <Card>
            <CardContent className="py-10 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Verificando status da assinatura...</span>
            </CardContent>
          </Card>
        ) : status === 'success' ? (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-center mb-4">
                <CheckCircle className="h-16 w-16 text-green-500" />
              </div>
              <CardTitle className="text-center text-2xl">Assinatura Ativada!</CardTitle>
              <CardDescription className="text-center">
                Seu plano Premium foi ativado com sucesso.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="rounded-lg bg-green-50 p-4 text-green-800">
                <p>Detalhes da assinatura:</p>
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li>Status: Ativo</li>
                  <li>Plano: Premium</li>
                  <li>Renovação: Mensal</li>
                  <li>Início: {new Date().toLocaleDateString()}</li>
                </ul>
              </div>
              
              <div className="rounded-lg bg-blue-50 p-4 text-blue-800 flex items-start">
                <CreditCard className="h-5 w-5 mr-2 mt-0.5" />
                <div>
                  <p className="font-medium">Próxima cobrança:</p>
                  <p className="text-sm mt-1">
                    Sua próxima cobrança de R$ 19,90 será em {
                      new Date(new Date().setMonth(new Date().getMonth() + 1)).toLocaleDateString()
                    }
                  </p>
                </div>
              </div>
              
              <div className="flex flex-col space-y-2 mt-6">
                <Button asChild>
                  <Link to="/client/dashboard">
                    Explorar Recursos Premium
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/client/payment-methods">
                    Gerenciar Métodos de Pagamento
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : status === 'processing' ? (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-center mb-4">
                <AlertTriangle className="h-16 w-16 text-yellow-500" />
              </div>
              <CardTitle className="text-center text-2xl">Assinatura em Processamento</CardTitle>
              <CardDescription className="text-center">
                Sua assinatura está sendo processada pela operadora do cartão.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="rounded-lg bg-yellow-50 p-4 text-yellow-800">
                <p>Informações importantes:</p>
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li>O processamento pode levar alguns minutos</li>
                  <li>Você receberá uma notificação quando for concluído</li>
                  <li>Não é necessário refazer a assinatura</li>
                </ul>
              </div>
              
              <div className="flex flex-col space-y-2 mt-6">
                <Button asChild>
                  <Link to="/client/dashboard">
                    Voltar ao Dashboard
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader className="pb-4">
              <div className="flex justify-center mb-4">
                <XCircle className="h-16 w-16 text-red-500" />
              </div>
              <CardTitle className="text-center text-2xl">Falha na Assinatura</CardTitle>
              <CardDescription className="text-center">
                Ocorreu um problema ao processar sua assinatura.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0 space-y-4">
              <div className="rounded-lg bg-red-50 p-4 text-red-800">
                <p>Possíveis causas:</p>
                <ul className="mt-2 list-disc list-inside text-sm">
                  <li>Cartão recusado pela operadora</li>
                  <li>Fundos insuficientes</li>
                  <li>Informações incorretas do cartão</li>
                  <li>Problema temporário no processamento</li>
                </ul>
              </div>
              
              <div className="flex flex-col space-y-2 mt-6">
                <Button asChild>
                  <Link to="/client/subscribe">
                    Tentar Novamente
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/client/payment-methods">
                    Gerenciar Métodos de Pagamento
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ClientLayout>
  );
}