// Página de assinatura para pagamentos recorrentes
import { useStripe, Elements, PaymentElement, useElements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import ClientLayout from '@/components/layout/client-layout';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet';
import { Loader2, Check, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

// Garantir que o Stripe seja carregado apenas uma vez
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Chave pública do Stripe não encontrada (VITE_STRIPE_PUBLIC_KEY)');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Componente de formulário de assinatura
const SubscribeForm = () => {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      toast({
        title: "Stripe não inicializado",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/client/subscription-confirmation`,
      },
    });

    if (error) {
      toast({
        title: "Falha na Assinatura",
        description: error.message || "Houve um erro ao processar a assinatura",
        variant: "destructive",
      });
    }

    setIsProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>Inscrever-se no Plano Premium</CardTitle>
          <CardDescription>Preencha os dados do seu cartão para iniciar sua assinatura</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <PaymentElement />
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full" 
            disabled={!stripe || isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : (
              "Assinar"
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
};

// Página principal de assinatura
export default function Subscribe() {
  const [clientSecret, setClientSecret] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Criar assinatura quando a página carrega
    const createSubscription = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("/api/get-or-create-subscription", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error?.message || "Erro ao criar assinatura");
        }

        const data = await response.json();
        
        if (!data.clientSecret) {
          throw new Error("Não foi possível iniciar o pagamento da assinatura");
        }
        
        setClientSecret(data.clientSecret);
      } catch (err: any) {
        setError(err.message);
        toast({
          title: "Erro",
          description: err.message,
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    createSubscription();
  }, [toast]);

  if (isLoading) {
    return (
      <ClientLayout>
        <div className="container mx-auto py-10 max-w-2xl">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2">Preparando sua assinatura...</span>
          </div>
        </div>
      </ClientLayout>
    );
  }

  if (error) {
    return (
      <ClientLayout>
        <div className="container mx-auto py-10 max-w-2xl">
          <Card className="p-6">
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {error}
              </AlertDescription>
            </Alert>
            
            <p className="mb-4">Possíveis causas:</p>
            <ul className="list-disc pl-5 mb-4 space-y-1">
              <li>O servidor pode não estar configurado com o ID de preço do Stripe</li>
              <li>Você pode precisar estar autenticado para assinar</li>
              <li>A conta do Stripe pode não estar configurada corretamente</li>
            </ul>
            
            <Button 
              className="mt-2" 
              variant="outline" 
              onClick={() => window.history.back()}
            >
              Voltar
            </Button>
          </Card>
        </div>
      </ClientLayout>
    );
  }

  // É essencial envolver o formulário com o componente Elements para fornecer o contexto do Stripe
  return (
    <ClientLayout>
      <Helmet>
        <title>Assinar Plano Premium | AgendoAI</title>
      </Helmet>
      
      <div className="container mx-auto py-10 max-w-2xl">
        <h1 className="text-2xl font-bold mb-6">Plano Premium</h1>
        
        <div className="mb-6">
          <Card className="mb-4">
            <CardHeader>
              <CardTitle>Benefícios do Plano Premium</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Agendamento prioritário com os melhores profissionais</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Descontos especiais em serviços selecionados</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Suporte prioritário</span>
                </li>
                <li className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
                  <span>Acesso a horários exclusivos</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter className="flex justify-between border-t pt-6">
              <span className="text-muted-foreground">Valor mensal:</span>
              <span className="font-semibold text-lg">R$ 19,90</span>
            </CardFooter>
          </Card>
        </div>
        
        {clientSecret && (
          <Elements 
            stripe={stripePromise} 
            options={{ 
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#10b981',
                  colorBackground: '#ffffff',
                  colorText: '#1f2937',
                }
              }
            }}
          >
            <SubscribeForm />
          </Elements>
        )}
      </div>
    </ClientLayout>
  );
}