import { useStripe, useElements, Elements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageTransition } from '@/components/ui/page-transition';
import AppHeader from '@/components/layout/app-header';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  CheckCircle, 
  CreditCard, 
  Loader2,
  QrCode,
  Banknote,
  Clock
} from 'lucide-react';

// Carregamento do Stripe fora do componente para evitar múltiplas instâncias
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error('Chave pública do Stripe não configurada (VITE_STRIPE_PUBLIC_KEY)');
}
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Tipos de pagamento
type PaymentMethod = 'card' | 'pix' | 'cash';

// Componente do formulário de pagamento com cartão
const CardPaymentForm = ({ amount, description, appointmentId }: { 
  amount: number, 
  description: string,
  appointmentId?: string 
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const { toast } = useToast();
  const [, setLocation] = useLocation();

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
          return_url: `${window.location.origin}/client/payment-success${appointmentId ? `?appointmentId=${appointmentId}` : ''}`,
        },
        redirect: 'if_required',
      });

      if (error) {
        toast({
          title: "Falha no pagamento",
          description: error.message || "Ocorreu um erro ao processar o pagamento",
          variant: "destructive",
        });
        setIsProcessing(false);
      } else {
        // Pagamento bem-sucedido sem redirecionamento
        setIsCompleted(true);
        toast({
          title: "Pagamento concluído",
          description: "Seu pagamento foi processado com sucesso!",
        });
        
        // Redirecionar para página de sucesso
        setLocation(`/client/payment-success?payment_intent=${paymentIntent?.id || ''}${appointmentId ? `&appointmentId=${appointmentId}` : ''}`);
      }
    } catch (error: any) {
      toast({
        title: "Erro no processamento",
        description: error.message || "Ocorreu um erro ao processar o pagamento",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  if (isCompleted) {
    return (
      <div className="text-center py-10">
        <CheckCircle className="w-16 h-16 mx-auto text-green-500 mb-4" />
        <h2 className="text-2xl font-semibold mb-2">Pagamento Concluído</h2>
        <p className="text-neutral-600 mb-6">Seu pagamento foi processado com sucesso!</p>
        <p className="text-neutral-600 mb-6">Redirecionando...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="p-4 bg-neutral-50 rounded-lg">
        <PaymentElement />
      </div>
      
      <Button 
        type="submit" 
        className="w-full py-6" 
        disabled={!stripe || !elements || isProcessing}
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processando...
          </>
        ) : (
          <>
            <CreditCard className="mr-2 h-4 w-4" />
            Pagar R$ {amount.toFixed(2)}
          </>
        )}
      </Button>
    </form>
  );
};

// Componente para Pagamento com PIX
const PixPaymentForm = ({ amount, description, appointmentId }: { 
  amount: number, 
  description: string,
  appointmentId?: string
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [pixCode, setPixCode] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Simulação de geração de QR Code para PIX
  const generatePixQrCode = async () => {
    setIsGenerating(true);
    
    try {
      // Aqui seria integração real com API de PIX
      // Por enquanto, apenas simularemos um sucesso após 2 segundos
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setPixCode("00020126580014BR.GOV.BCB.PIX0136example@email.com52040000530398654040.005802BR5913Agendo AI6008Sao Paulo62070503***6304A1B2");
      setQrCodeUrl("https://chart.googleapis.com/chart?cht=qr&chl=00020126580014BR.GOV.BCB.PIX0136example@email.com52040000530398654040.005802BR5913Agendo+AI6008Sao+Paulo62070503***6304A1B2&chs=300x300");
      
      toast({
        title: "PIX gerado com sucesso",
        description: "Escaneie o QR Code ou copie o código PIX",
      });
    } catch (error) {
      toast({
        title: "Erro ao gerar PIX",
        description: "Não foi possível gerar o QR Code para pagamento PIX",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };
  
  const copyPixCode = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      toast({
        title: "Código copiado!",
        description: "O código PIX foi copiado para sua área de transferência",
      });
    }
  };
  
  const handleContinue = () => {
    // Na implementação real, verificaríamos se o pagamento foi confirmado
    // Por enquanto, apenas simulamos que o pagamento foi feito
    setLocation(`/client/payment-success?method=pix${appointmentId ? `&appointmentId=${appointmentId}` : ''}`);
  };
  
  return (
    <div className="space-y-6 py-2">
      {!pixCode ? (
        <>
          <div className="bg-neutral-50 p-4 rounded-lg text-center">
            <QrCode className="w-16 h-16 mx-auto text-primary mb-4" />
            <h3 className="text-lg font-medium mb-1">Pagamento via PIX</h3>
            <p className="text-sm text-neutral-600 mb-4">
              Gere um QR Code para pagamento instantâneo via PIX
            </p>
            <Button 
              onClick={generatePixQrCode} 
              className="w-full"
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Gerando PIX...
                </>
              ) : (
                <>
                  <QrCode className="mr-2 h-4 w-4" />
                  Gerar QR Code PIX
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        <div className="bg-neutral-50 p-4 rounded-lg text-center">
          <h3 className="text-lg font-medium mb-3">PIX Gerado</h3>
          
          {qrCodeUrl && (
            <div className="mb-4 flex justify-center">
              <img 
                src={qrCodeUrl} 
                alt="QR Code PIX" 
                className="w-40 h-40 mx-auto border border-neutral-200 rounded"
              />
            </div>
          )}
          
          <div className="mb-4">
            <p className="text-xs text-neutral-500 mb-1">CÓDIGO PIX COPIA E COLA</p>
            <div className="relative">
              <div className="p-2 bg-white border border-neutral-200 rounded text-xs text-neutral-700 break-all overflow-hidden max-h-20 overflow-y-auto">
                {pixCode}
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                className="absolute top-2 right-2 h-6 text-xs py-0 px-2"
                onClick={copyPixCode}
              >
                Copiar
              </Button>
            </div>
          </div>
          
          <div className="text-sm text-neutral-700 mb-4">
            <p className="mb-2">1. Abra o aplicativo do seu banco</p>
            <p className="mb-2">2. Escolha pagar com PIX</p>
            <p className="mb-2">3. Escaneie o QR Code ou cole o código</p>
            <p className="mb-2">4. Confirme o valor de <strong>R$ {amount.toFixed(2)}</strong></p>
          </div>
          
          <p className="text-xs text-neutral-500 mb-4">
            Após realizar o pagamento, clique no botão abaixo para continuar
          </p>
          
          <Button 
            onClick={handleContinue} 
            className="w-full"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Já realizei o pagamento
          </Button>
        </div>
      )}
    </div>
  );
};

// Componente para Pagamento em Dinheiro (presencial)
const CashPaymentForm = ({ amount, description, appointmentId }: { 
  amount: number, 
  description: string,
  appointmentId?: string
}) => {
  const [, setLocation] = useLocation();
  
  const handleConfirm = () => {
    setLocation(`/client/payment-success?method=cash${appointmentId ? `&appointmentId=${appointmentId}` : ''}`);
  };
  
  return (
    <div className="space-y-6 py-2">
      <div className="bg-neutral-50 p-4 rounded-lg">
        <div className="text-center mb-4">
          <Banknote className="w-16 h-16 mx-auto text-green-600 mb-3" />
          <h3 className="text-lg font-medium">Pagamento Presencial</h3>
          <p className="text-sm text-neutral-600 mt-1">
            Você optou por pagar presencialmente no momento do serviço
          </p>
        </div>
        
        <div className="mb-6 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <h4 className="text-sm font-medium text-yellow-800 flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            Informações importantes
          </h4>
          <ul className="text-sm text-yellow-700 mt-2 list-disc pl-5 space-y-1">
            <li>O pagamento será feito diretamente ao prestador de serviço</li>
            <li>Tenha o valor exato para facilitar o troco</li>
            <li>Solicite sempre o recibo de pagamento</li>
          </ul>
        </div>
        
        <div className="bg-white p-3 border border-neutral-200 rounded-lg mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm">Valor a pagar:</span>
            <span className="font-semibold">R$ {amount.toFixed(2)}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm">Serviço:</span>
            <span className="text-sm text-neutral-600">{description}</span>
          </div>
        </div>
        
        <Button onClick={handleConfirm} className="w-full">
          Confirmar pagamento presencial
        </Button>
      </div>
    </div>
  );
};

// Componente principal
export default function Checkout() {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [, params] = useLocation();
  
  // Pegar valores da URL ou usar valores padrão para teste
  const searchParams = new URLSearchParams(window.location.search);
  const amount = parseFloat(searchParams.get('amount') || '0');
  const description = searchParams.get('description') || 'Pagamento de serviço';
  const appointmentId = searchParams.get('appointmentId');
  const initialMethod = (searchParams.get('method') || 'card') as PaymentMethod;

  useEffect(() => {
    setPaymentMethod(initialMethod);
    
    if (!amount || amount <= 0) {
      setError('Valor de pagamento inválido');
      setLoading(false);
      return;
    }
    
    // Criar Payment Intent apenas se o método for cartão
    if (initialMethod === 'card') {
      const createPaymentIntent = async () => {
        try {
          const response = await apiRequest(
            'POST', 
            '/api/create-payment-intent', 
            { amount, description, appointmentId }
          );
          const data = await response.json();
          
          if (data.clientSecret) {
            setClientSecret(data.clientSecret);
          } else {
            setError('Não foi possível iniciar o pagamento');
          }
        } catch (err: any) {
          setError(err.message || 'Erro ao inicializar pagamento');
        } finally {
          setLoading(false);
        }
      };

      createPaymentIntent();
    } else {
      // Para outros métodos, não precisamos do Stripe
      setLoading(false);
    }
  }, [amount, description, appointmentId, initialMethod]);

  return (
    <div className="pb-20">
      <AppHeader 
        title="Pagamento" 
        showBackButton 
        backButtonAction={() => window.history.back()}
      />

      <PageTransition>
        <div className="p-4 max-w-md mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Escolha como pagar</CardTitle>
              <CardDescription>
                Selecione o método de pagamento de sua preferência
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {/* Detalhes do pagamento */}
              <div className="mb-6">
                <h3 className="text-sm font-medium mb-2 text-neutral-500">RESUMO DO PEDIDO</h3>
                <div className="flex justify-between mb-2">
                  <span>{description}</span>
                  <span className="font-medium">R$ {amount.toFixed(2)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span>Total</span>
                  <span>R$ {amount.toFixed(2)}</span>
                </div>
              </div>
              
              {/* Tabs para diferentes métodos de pagamento */}
              <Tabs 
                defaultValue={paymentMethod} 
                value={paymentMethod}
                onValueChange={(value) => setPaymentMethod(value as PaymentMethod)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-3 mb-6">
                  <TabsTrigger value="card" className="flex items-center gap-1">
                    <CreditCard className="h-4 w-4" />
                    <span className="hidden sm:inline">Cartão</span>
                  </TabsTrigger>
                  <TabsTrigger value="pix" className="flex items-center gap-1">
                    <QrCode className="h-4 w-4" />
                    <span className="hidden sm:inline">PIX</span>
                  </TabsTrigger>
                  <TabsTrigger value="cash" className="flex items-center gap-1">
                    <Banknote className="h-4 w-4" />
                    <span className="hidden sm:inline">Dinheiro</span>
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="card">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                      <span className="ml-2">Carregando pagamento...</span>
                    </div>
                  ) : error ? (
                    <div className="bg-red-50 text-red-600 p-4 rounded-lg">
                      <p className="font-semibold">Erro</p>
                      <p>{error}</p>
                    </div>
                  ) : clientSecret ? (
                    <Elements 
                      stripe={stripePromise} 
                      options={{ 
                        clientSecret,
                        appearance: { 
                          theme: 'stripe',
                          variables: { colorPrimary: '#7c3aed' }
                        }
                      }}
                    >
                      <CardPaymentForm 
                        amount={amount} 
                        description={description} 
                        appointmentId={appointmentId || undefined}
                      />
                    </Elements>
                  ) : (
                    <div className="text-center py-4">
                      <p>Não foi possível inicializar o pagamento com cartão.</p>
                    </div>
                  )}
                </TabsContent>
                
                <TabsContent value="pix">
                  <PixPaymentForm 
                    amount={amount} 
                    description={description} 
                    appointmentId={appointmentId || undefined}
                  />
                </TabsContent>
                
                <TabsContent value="cash">
                  <CashPaymentForm 
                    amount={amount} 
                    description={description} 
                    appointmentId={appointmentId || undefined}
                  />
                </TabsContent>
              </Tabs>
            </CardContent>
            
            <CardFooter className="flex-col space-y-2">
              <div className="w-full text-center text-xs text-neutral-500">
                {paymentMethod === 'card' && 'Pagamentos com cartão processados com segurança via Stripe'}
                {paymentMethod === 'pix' && 'PIX é um método de pagamento instantâneo do Banco Central do Brasil'}
                {paymentMethod === 'cash' && 'Você será cobrado pelo prestador no momento do serviço'}
              </div>
            </CardFooter>
          </Card>
        </div>
      </PageTransition>
    </div>
  );
}