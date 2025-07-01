import { useEffect, useState } from "react";
import { useRoute, Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import type { Stripe } from '@stripe/stripe-js';
import { CheckoutForm } from "@/components/checkout/checkout-form";
import { PixPaymentForm } from "@/components/checkout/pix-payment-form";
import { ClientNavbar } from "@/components/layout/client-navbar";
import { BookingDetails } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  ArrowLeft,
  AlertCircle,
  Loader2,
  Calendar,
  Clock,
  User,
  CreditCard,
  CheckCircle2,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

// Estados de pagamento
type PaymentStatus = "initial" | "processing" | "success" | "error";

interface PaymentSettings {
  stripeEnabled: boolean;
  stripePublicKey: string;
}

export default function CheckoutPage() {
  const [match, params] = useRoute("/checkout/:bookingId");
  const { toast } = useToast();
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [clientSecret, setClientSecret] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("initial");
  const [paymentError, setPaymentError] = useState("");
  const [bookingData, setBookingData] = useState<BookingDetails | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>({
    stripeEnabled: false,
    stripePublicKey: "",
  });
  
  // Buscar configurações de pagamento
  const { data: paymentSettingsData, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/payment-settings"],
    queryFn: getQueryFn({ on401: "throw" }),
    retry: 1
  });
  
  // Atualizar configurações quando os dados são carregados
  useEffect(() => {
    if (paymentSettingsData) {
      const settings = paymentSettingsData as PaymentSettings;
      setPaymentSettings(settings);
      if (settings.stripePublicKey) {
        setStripePromise(loadStripe(settings.stripePublicKey));
      }
    }
  }, [paymentSettingsData]);
  
  // Buscar detalhes da reserva
  const { data: bookingDetails, isLoading: isLoadingBooking, error: bookingError } = useQuery<BookingDetails>({
    queryKey: ["/api/bookings", params?.bookingId],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!params?.bookingId,
    retry: 1
  });
  
  // Atualizar dados da reserva quando carregados
  useEffect(() => {
    if (bookingDetails) {
      setBookingData(bookingDetails);
      
      // Já criar a intent de pagamento se o Stripe estiver habilitado
      if (paymentSettings.stripeEnabled && bookingDetails.paymentMethod === "credit_card") {
        createPaymentIntentMutation.mutate({
          amount: bookingDetails.price,
          bookingId: parseInt(params?.bookingId || "0"),
          metadata: {
            serviceName: bookingDetails.serviceName,
            providerName: bookingDetails.providerName,
            date: bookingDetails.date,
            time: bookingDetails.time
          }
        });
      }
    }
  }, [bookingDetails, paymentSettings.stripeEnabled, params?.bookingId]);
  
  // Lidar com erros de carregamento
  useEffect(() => {
    if (bookingError) {
      toast({
        title: "Erro ao carregar reserva",
        description: bookingError instanceof Error ? bookingError.message : "Erro desconhecido",
        variant: "destructive",
      });
    }
  }, [bookingError, toast]);
  
  // Mutation para criar PaymentIntent
  const createPaymentIntentMutation = useMutation({
    mutationFn: async (data: { amount: number, bookingId: number, metadata: any }) => {
      const response = await apiRequest("POST", "/api/create-payment-intent", data);
      return response.json();
    },
    onSuccess: (data) => {
      setClientSecret(data.clientSecret);
    },
    onError: (error: Error) => {
      setPaymentStatus("error");
      setPaymentError(`Erro ao preparar pagamento: ${error.message}`);
      toast({
        title: "Erro ao processar pagamento",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation para confirmar pagamento local (sem Stripe)
  const confirmLocalPaymentMutation = useMutation({
    mutationFn: async (bookingId: number) => {
      const response = await apiRequest("POST", `/api/bookings/${bookingId}/confirm-local-payment`, {});
      return response.json();
    },
    onSuccess: () => {
      setPaymentStatus("success");
      queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
      toast({
        title: "Pagamento local confirmado",
        description: "Seu agendamento foi confirmado com pagamento local.",
      });
    },
    onError: (error: Error) => {
      setPaymentStatus("error");
      setPaymentError(`Erro ao confirmar pagamento: ${error.message}`);
      toast({
        title: "Erro ao confirmar pagamento",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Processar pagamento local
  const handleLocalPayment = () => {
    if (!bookingData) return;
    
    setPaymentStatus("processing");
    const bookingId = parseInt(params?.bookingId || "0");
    confirmLocalPaymentMutation.mutate(bookingId);
  };
  
  // Callback para quando o pagamento é concluído
  const handlePaymentSuccess = () => {
    setPaymentStatus("success");
    queryClient.invalidateQueries({ queryKey: ["/api/bookings"] });
    toast({
      title: "Pagamento concluído",
      description: "Seu pagamento foi processado com sucesso.",
    });
  };
  
  // Callback para erros de pagamento
  const handlePaymentError = (error: string) => {
    setPaymentStatus("error");
    setPaymentError(error);
    toast({
      title: "Erro no pagamento",
      description: error,
      variant: "destructive",
    });
  };
  
  const isLoading = isLoadingSettings || isLoadingBooking || createPaymentIntentMutation.isPending;
  
  // Se não temos ID da reserva, redirecionar para página inicial
  if (!params?.bookingId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
        <h2 className="text-2xl font-bold mb-2">Reserva não encontrada</h2>
        <p className="text-gray-600 mb-6">Não foi possível encontrar os detalhes da reserva.</p>
        <Link href="/">
          <Button>Voltar para o início</Button>
        </Link>
      </div>
    );
  }
  
  // Renderização condicionada ao estado do pagamento
  if (paymentStatus === "success") {
    return (
      <div className="min-h-screen bg-white">
        <ClientNavbar />
        <main className="container max-w-lg mx-auto p-4 py-8">
          <div className="text-center mb-8">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold mb-2">Pagamento Concluído!</h1>
            <p className="text-gray-600">
              Seu agendamento foi confirmado com sucesso.
            </p>
          </div>
          
          {bookingData && (
            <Card>
              <CardHeader>
                <CardTitle>Detalhes do Agendamento</CardTitle>
                <CardDescription>
                  Confira as informações do seu serviço agendado
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{bookingData.providerName}</p>
                    <p className="text-sm text-muted-foreground">{bookingData.serviceName}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <div>{bookingData.date}</div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>{bookingData.time}</div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                  <div>
                    {bookingData.paymentMethod === "credit_card" 
                      ? "Cartão de Crédito" 
                      : bookingData.paymentMethod === "pix" 
                        ? "PIX" 
                        : "Pagamento Local"}
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-medium">
                  <p>Total</p>
                  <p>{formatCurrency(bookingData.price)}</p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center">
                <Button variant="outline" asChild>
                  <Link href="/appointments">
                    Ver meus agendamentos
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          )}
        </main>
      </div>
    );
  }
  
  // Enquanto carrega
  if (isLoading || !bookingData) {
    return (
      <div className="min-h-screen bg-white">
        <ClientNavbar />
        <main className="container max-w-lg mx-auto p-4 py-8">
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p>Preparando seu pagamento...</p>
          </div>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-white">
      <ClientNavbar />
      
      <main className="container max-w-lg mx-auto p-4 py-8">
        <div className="mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.history.back()}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          
          <h1 className="text-2xl font-bold">Finalizar Reserva</h1>
          <p className="text-muted-foreground">Complete o pagamento para confirmar seu agendamento</p>
        </div>
        
        {/* Detalhes da reserva */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detalhes do Agendamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <User className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-medium">{bookingData.providerName}</p>
                <p className="text-sm text-muted-foreground">{bookingData.serviceName}</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>{bookingData.date}</div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Clock className="h-5 w-5 text-muted-foreground" />
              <div>{bookingData.time}</div>
            </div>
            
            <Separator />
            
            <div className="flex justify-between font-medium">
              <p>Total</p>
              <p>{formatCurrency(bookingData.price)}</p>
            </div>
          </CardContent>
        </Card>
        
        {/* Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle>Pagamento</CardTitle>
            <CardDescription>
              {bookingData.paymentMethod === "credit_card" 
                ? "Complete seu pagamento com cartão de crédito" 
                : bookingData.paymentMethod === "pix" 
                  ? "Complete seu pagamento via PIX"
                  : "Você escolheu pagar diretamente ao prestador de serviço"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {paymentStatus === "error" && (
              <Alert variant="destructive" className="mb-6">
                <AlertCircle className="h-4 w-4 mr-2" />
                <AlertTitle>Erro no pagamento</AlertTitle>
                <AlertDescription>{paymentError}</AlertDescription>
              </Alert>
            )}
            
            {/* Formulário de cartão de crédito */}
            {bookingData.paymentMethod === "credit_card" && paymentSettings.stripeEnabled && clientSecret && stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm 
                  onSuccess={handlePaymentSuccess}
                  onError={handlePaymentError}
                  isProcessing={paymentStatus === "processing"}
                />
              </Elements>
            ) : bookingData.paymentMethod === "local" ? (
              <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-md text-sm">
                  <p className="font-medium mb-2">Instruções para pagamento local:</p>
                  <ul className="list-disc ml-5 space-y-1">
                    <li>O pagamento será feito diretamente ao prestador de serviço</li>
                    <li>Tenha o valor exato para facilitar o pagamento</li>
                    <li>O prestador poderá oferecer formas adicionais de pagamento no local</li>
                  </ul>
                </div>
                
                <Button 
                  className="w-full"
                  onClick={handleLocalPayment}
                  disabled={paymentStatus === "processing"}
                >
                  {paymentStatus === "processing" ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      <span>Processando...</span>
                    </>
                  ) : (
                    "Confirmar Agendamento com Pagamento Local"
                  )}
                </Button>
              </div>
            ) : bookingData.paymentMethod === "pix" ? (
              <div className="space-y-4">
                <PixPaymentForm 
                  pixCode={bookingData.pixCode || "00020126580014br.gov.bcb.pix0136example.com/pix/transfer/x53u4nKXlIcdGZfOlCfA=="}
                  pixQrCodeUrl={bookingData.pixQrCodeUrl}
                  amount={bookingData.price || 0}
                  expiresIn={15}
                  onCheckStatus={async () => {
                    try {
                      const response = await apiRequest(
                        "GET", 
                        `/api/payments/check-pix/${params?.bookingId}`
                      );
                      const data = await response.json();
                      
                      if (data.status === "paid") {
                        handlePaymentSuccess();
                      }
                      
                      return data;
                    } catch (error) {
                      console.error("Erro ao verificar pagamento:", error);
                      return { status: "error" };
                    }
                  }}
                  isProcessing={paymentStatus === "processing"}
                />
              </div>
            ) : (
              <div className="p-6 text-center">
                <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">Opção de pagamento indisponível</h3>
                <div className="text-muted-foreground mb-4">
                  A opção de pagamento selecionada não está disponível no momento.
                </div>
                <Button variant="outline" onClick={() => window.history.back()}>
                  Voltar e selecionar outra opção
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}