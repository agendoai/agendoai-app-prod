import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import ProviderLayout from '@/components/layout/provider-layout';
import { PageTransition } from '@/components/ui/page-transition';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

// Carrega o objeto Stripe fora do componente para evitar recriação a cada renderização
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Chave pública do Stripe não configurada: VITE_STRIPE_PUBLIC_KEY');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Componente do formulário de pagamento
const CheckoutForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaid, setIsPaid] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: window.location.origin + '/provider/dashboard',
        },
        redirect: 'if_required'
      });

      if (error) {
        toast({
          title: "Falha no Pagamento",
          description: error.message || "Ocorreu um erro ao processar o pagamento.",
          variant: "destructive",
        });
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        toast({
          title: "Pagamento Realizado com Sucesso",
          description: "Obrigado pela sua assinatura!",
        });
        setIsPaid(true);
      } else {
        toast({
          title: "Pagamento em Processamento",
          description: "O seu pagamento está sendo processado.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro de Processamento",
        description: error.message || "Ocorreu um erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  }

  if (isPaid) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-10">
        <CheckCircle2 className="h-16 w-16 text-green-500" />
        <h2 className="text-xl font-semibold">Pagamento Confirmado!</h2>
        <p className="text-center text-muted-foreground max-w-md">
          Sua assinatura foi ativada com sucesso. Agora você tem acesso a todos os recursos premium do AgendoAI.
        </p>
        <Button className="mt-4" onClick={() => window.location.href = '/provider/dashboard'}>
          Ir para o Dashboard
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <PaymentElement />
        <div className="text-xs text-muted-foreground mt-4">
          <p>• O seu cartão será processado com segurança pelo Stripe</p>
          <p>• Nenhum dado do cartão é armazenado em nossos servidores</p>
        </div>
      </div>
      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || isProcessing}
      >
        {isProcessing ? (
          <>
            <LoadingSpinner className="mr-2 h-4 w-4" />
            Processando...
          </>
        ) : (
          "Confirmar Pagamento"
        )}
      </Button>
    </form>
  );
};

export default function PaymentPage() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Cria o PaymentIntent assim que a página carrega
    const createPaymentIntent = async () => {
      try {
        setIsLoading(true);
        const response = await apiRequest("POST", "/api/create-payment-intent", { 
          // Plano mensal - R$ 29,90
          amount: 29.90,
          description: "Assinatura Mensal AgendoAI"
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Erro ao criar sessão de pagamento");
        }

        const data = await response.json();
        setClientSecret(data.clientSecret);
      } catch (error: any) {
        console.error("Erro:", error);
        setError(error.message || "Não foi possível processar seu pagamento neste momento");
        toast({
          title: "Erro",
          description: error.message || "Não foi possível iniciar o pagamento",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    createPaymentIntent();
  }, [toast]);

  return (
    <PageTransition>
      <ProviderLayout title="Pagamento">
        <div className="container max-w-3xl mx-auto px-4 py-6">
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="text-2xl">Assinatura Premium</CardTitle>
              <CardDescription>
                Aproveite todos os recursos avançados do AgendoAI
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-6 p-4 bg-muted rounded-lg">
                <div className="flex justify-between mb-2">
                  <span className="font-medium">Assinatura Mensal</span>
                  <span className="font-bold">R$ 29,90</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Acesso a todos os recursos premium, incluindo gestão de agenda avançada, 
                  automação de lembretes e análises detalhadas.
                </p>
              </div>

              {isLoading && (
                <div className="flex flex-col items-center justify-center py-10">
                  <LoadingSpinner className="h-8 w-8 mb-4" />
                  <p className="text-muted-foreground">Carregando informações de pagamento...</p>
                </div>
              )}

              {error && (
                <div className="flex flex-col items-center justify-center py-6">
                  <AlertCircle className="h-10 w-10 text-destructive mb-2" />
                  <h3 className="text-lg font-medium mb-2">Erro no Processamento</h3>
                  <p className="text-center text-muted-foreground">{error}</p>
                  <Button 
                    variant="outline" 
                    className="mt-4"
                    onClick={() => window.location.reload()}
                  >
                    Tentar Novamente
                  </Button>
                </div>
              )}

              {!isLoading && !error && clientSecret && (
                <Elements stripe={stripePromise} options={{ clientSecret, locale: 'pt-BR' }}>
                  <CheckoutForm />
                </Elements>
              )}
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 text-sm text-muted-foreground border-t pt-6">
              <div className="w-full">
                <p className="mb-2 font-medium">O que está incluído:</p>
                <ul className="space-y-2">
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                    <span>Gestão de agenda avançada com sincronização</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                    <span>Lembretes automáticos para clientes (WhatsApp e email)</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                    <span>Relatórios detalhados de faturamento e agendamentos</span>
                  </li>
                  <li className="flex items-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 mt-0.5 text-green-500" />
                    <span>Suporte prioritário 24/7</span>
                  </li>
                </ul>
              </div>
            </CardFooter>
          </Card>
        </div>
      </ProviderLayout>
    </PageTransition>
  );
}