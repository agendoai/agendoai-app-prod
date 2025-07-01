import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { loadStripe } from '@stripe/stripe-js';
import {
  PaymentElement,
  Elements,
  useStripe,
  useElements,
  AddressElement
} from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { AlertCircle, CreditCard, CheckCircle2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Verificar se a chave pública do Stripe está definida
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  console.error('VITE_STRIPE_PUBLIC_KEY não definida. Pagamentos não funcionarão.');
}

// Inicializar o Stripe fora da função do componente para evitar recriações
const stripePromise = import.meta.env.VITE_STRIPE_PUBLIC_KEY 
  ? loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY as string)
  : null;

// Componente de formulário de pagamento do Stripe
const CheckoutForm = ({ amount, description }: { amount: number, description?: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [cardComplete, setCardComplete] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setPaymentError(null);

    try {
      // Confirmar o pagamento usando o PaymentElement
      const { error } = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/payment-success`,
          payment_method_data: {
            billing_details: {
              address: {
                country: 'BR',
              },
            },
          },
        },
      });

      if (error) {
        setPaymentError(error.message || "Ocorreu um erro ao processar o pagamento.");
        toast({
          title: "Falha no pagamento",
          description: error.message || "Ocorreu um erro ao processar o pagamento.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      setPaymentError(error.message || "Ocorreu um erro inesperado.");
      toast({
        title: "Erro no pagamento",
        description: error.message || "Ocorreu um erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {paymentError && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro no pagamento</AlertTitle>
          <AlertDescription>{paymentError}</AlertDescription>
        </Alert>
      )}
      
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Informações do cartão</h3>
        <PaymentElement 
          onChange={(e) => setCardComplete(e.complete)}
          options={{
            layout: {
              type: 'tabs',
              defaultCollapsed: false,
            }
          }}
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">Endereço de cobrança</h3>
        <AddressElement 
          options={{
            mode: 'billing',
            fields: {
              phone: 'always',
            },
            validation: {
              phone: {
                required: 'always',
              },
            },
            defaultValues: {
              address: {
                country: 'BR',
              },
            },
          }}
        />
      </div>
      
      <div className="pt-4">
        <Button 
          type="submit" 
          className="w-full flex items-center justify-center gap-2"
          disabled={!stripe || isProcessing || !cardComplete}
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Processando...</span>
            </>
          ) : (
            <>
              <CreditCard className="h-4 w-4" />
              <span>Pagar R$ {(amount / 100).toFixed(2)}</span>
            </>
          )}
        </Button>
        
        <p className="text-xs text-center text-gray-500 mt-4">
          Pagamento processado de forma segura pelo Stripe.
          {description && (
            <span className="block mt-1">{description}</span>
          )}
        </p>
      </div>
    </form>
  );
};

// Página principal de checkout
const CheckoutPage = () => {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [amount, setAmount] = useState(0);
  const [paymentDescription, setPaymentDescription] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(10);
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  // Obter parâmetros da URL
  const urlParams = new URLSearchParams(window.location.search);
  const appointmentId = urlParams.get('appointmentId');
  const serviceId = urlParams.get('serviceId');
  const amountParam = urlParams.get('amount');
  const description = urlParams.get('description');

  useEffect(() => {
    const initPayment = async () => {
      if (!appointmentId && !amountParam) {
        setError('Informações de pagamento incompletas na URL');
        setIsLoading(false);
        return;
      }

      try {
        setProgress(30);
        const amountValue = amountParam ? parseInt(amountParam, 10) : 0;
        setAmount(amountValue);
        
        if (description) {
          setPaymentDescription(decodeURIComponent(description));
        }

        setProgress(50);
        // Criar um PaymentIntent no servidor
        const response = await apiRequest("POST", "/api/payments/create-payment-intent", {
          amount: amountValue / 100, // Converter de centavos para reais
          description: paymentDescription,
          metadata: {
            appointmentId: appointmentId || 'none',
            serviceId: serviceId || 'none'
          }
        });

        setProgress(70);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Erro ao criar sessão de pagamento');
        }

        setProgress(90);
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error('Erro ao inicializar pagamento:', err);
        setError(err.message || 'Não foi possível iniciar o pagamento');
        toast({
          title: "Erro",
          description: err.message || "Não foi possível iniciar o pagamento",
          variant: "destructive",
        });
      } finally {
        setProgress(100);
        setIsLoading(false);
      }
    };

    initPayment();
  }, [appointmentId, serviceId, amountParam, description, toast]);

  if (isLoading) {
    return (
      <div className="container max-w-md mx-auto flex flex-col items-center justify-center h-screen p-4">
        <h2 className="text-xl font-medium mb-6">Preparando Pagamento</h2>
        <Progress value={progress} className="w-full mb-4" />
        <p className="text-sm text-muted-foreground">
          {progress < 50 ? 'Carregando informações de pagamento...' : 
           progress < 90 ? 'Conectando com o gateway de pagamento...' : 
           'Quase pronto...'}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container max-w-md mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-red-500">Erro no Pagamento</CardTitle>
            <CardDescription className="text-center">
              Não foi possível iniciar o processo de pagamento
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Falha ao conectar</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col gap-2">
            <Button onClick={() => window.history.back()} className="w-full">Voltar</Button>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()} 
              className="w-full"
            >
              Tentar novamente
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (!stripePromise) {
    return (
      <div className="container max-w-md mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-center text-red-500">Configuração Incompleta</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Serviço indisponível</AlertTitle>
              <AlertDescription>
                O sistema de pagamentos está temporariamente indisponível. 
                Por favor, tente novamente mais tarde ou entre em contato com o suporte.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button onClick={() => window.history.back()} className="w-full">Voltar</Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto p-4">
      <Card className="border-primary/10">
        <CardHeader className="pb-4">
          <CardTitle className="text-center flex items-center justify-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <span>Finalizar Pagamento</span>
          </CardTitle>
          <CardDescription className="text-center">
            Preencha os dados para concluir seu pagamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <div className="flex flex-col gap-2 p-4 bg-primary/5 rounded-lg">
              <div className="flex justify-between items-center">
                <span className="text-sm">Valor a pagar:</span>
                <span className="font-semibold text-lg">R$ {(amount / 100).toFixed(2)}</span>
              </div>
              
              {paymentDescription && (
                <div className="text-sm text-gray-600">
                  {paymentDescription}
                </div>
              )}
              
              {appointmentId && (
                <div className="text-xs text-gray-500 mt-2">
                  Reserva #{appointmentId}
                </div>
              )}
            </div>
            <Separator className="my-6" />
          </div>

          {clientSecret && (
            <Elements 
              stripe={stripePromise} 
              options={{ 
                clientSecret,
                appearance: { 
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#6366f1',
                    colorBackground: '#ffffff',
                    colorText: '#1f2937',
                  }
                },
                locale: 'pt-BR'
              }}
            >
              <CheckoutForm 
                amount={amount} 
                description={paymentDescription}
              />
            </Elements>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CheckoutPage;