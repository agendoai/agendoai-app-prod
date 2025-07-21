import React, { useState, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, QrCode, ArrowLeft, CheckCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface BookingData {
  providerId: number;
  serviceId: number;
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  paymentMethod: string;
  multipleServices?: boolean;
  serviceIds?: number[];
  services?: Array<{
    serviceId: number;
    duration: number;
  }>;
}

export default function PaymentPage() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [bookingData, setBookingData] = useState<BookingData | null>(null);
  const [providerData, setProviderData] = useState<any>(null);
  const [serviceData, setServiceData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'failed'>('pending');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentIntentId, setPaymentIntentId] = useState<string | null>(null);
  const [showPixQR, setShowPixQR] = useState(false);
  // Adicionar estados para QR Code, link de pagamento e status
  const [pixQrCode, setPixQrCode] = useState<string | null>(null);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se o usuário está autenticado
    if (!user) {
      setLocation('/auth?redirect=payment');
      return;
    }

    // Recuperar dados do agendamento do sessionStorage
    const storedData = sessionStorage.getItem('pendingBookingData');
    if (!storedData) {
      toast({
        title: "Dados não encontrados",
        description: "Por favor, inicie o agendamento novamente.",
        variant: "destructive",
      });
      setLocation('/');
      return;
    }

    try {
      const data: BookingData = JSON.parse(storedData);
      setBookingData(data);
      
      // Buscar dados do prestador e serviço
      fetchProviderAndServiceData(data.providerId, data.serviceId);
    } catch (error) {
      console.error('Erro ao processar dados do agendamento:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Por favor, tente novamente.",
        variant: "destructive",
      });
      setLocation('/');
    }
  }, [user, setLocation, toast]);

  const fetchProviderAndServiceData = async (providerId: number, serviceId: number) => {
    try {
      // Buscar dados do prestador
      const providerResponse = await fetch(`/api/providers/${providerId}`);
      if (providerResponse.ok) {
        const provider = await providerResponse.json();
        setProviderData(provider);
      }

      // Buscar dados do serviço
      const serviceResponse = await fetch(`/api/services/${serviceId}`);
      if (serviceResponse.ok) {
        const service = await serviceResponse.json();
        setServiceData(service);
      }
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePayment = async () => {
    if (!bookingData) return;

    setIsProcessing(true);
    setPaymentStatus('processing');

    try {
      const payload = {
        amount: bookingData.totalPrice,
        description: `Agendamento - ${serviceData?.name || 'Serviço'} com ${providerData?.name || 'Prestador'}`,
        customerId: user?.asaasCustomerId,
        metadata: {
          providerId: bookingData.providerId,
          serviceId: bookingData.serviceId,
          date: bookingData.date,
          startTime: bookingData.startTime,
          paymentMethod: bookingData.paymentMethod,
          appointmentType: bookingData.multipleServices ? 'consecutive' : 'single'
        }
      };
      console.log('user:', user);
      console.log('Payload enviado:', payload);
      // Chamar backend para criar pagamento no Asaas
      const paymentResponse = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const result = await paymentResponse.json();
      if (!paymentResponse.ok) {
        throw new Error(result.error || 'Erro ao criar pagamento');
      }

      // Exemplo: se vier QR Code do PIX
      if (bookingData.paymentMethod === 'pix' && result.pixQrCode) {
        setPixQrCode(result.pixQrCode);
        setPaymentStatus('pending');
      } else if ((bookingData.paymentMethod === 'credit_card' || bookingData.paymentMethod === 'debit_card') && result.paymentLink) {
        setPaymentLink(result.paymentLink);
        setPaymentStatus('pending');
      } else {
        setPaymentStatus('pending');
      }

      // Aqui você pode implementar polling para checar status do pagamento
      // e só criar o agendamento após confirmação
    } catch (error) {
      setPaymentStatus('failed');
      toast({
        title: 'Erro no pagamento',
        description: error.message || 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processPixPayment = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        amount: bookingData.totalPrice,
        description: `Agendamento - ${bookingData.date} às ${bookingData.startTime}`,
        customerId: user?.asaasCustomerId,
        metadata: {
          providerId: String(bookingData.providerId),
          serviceId: String(bookingData.serviceId),
          date: bookingData.date,
          startTime: bookingData.startTime,
          paymentMethod: 'pix'
        }
      };
      console.log('user:', user);
      console.log('Payload enviado:', payload);
      // Criar payment intent para PIX
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Erro ao processar pagamento PIX');
      }

      const { clientSecret, paymentIntentId } = await response.json();
      
      // Para PIX, redirecionar para página de sucesso com QR Code
      setPaymentIntentId(paymentIntentId);
      setPaymentStatus('pending');
      setShowPixQR(true);
      
    } catch (error) {
      console.error('Erro no pagamento PIX:', error);
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível processar o pagamento PIX. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const processCardPayment = async () => {
    setIsProcessing(true);
    try {
      const payload = {
        amount: bookingData.totalPrice,
        description: `Agendamento - ${bookingData.date} às ${bookingData.startTime}`,
        customerId: user?.asaasCustomerId,
        metadata: {
          providerId: String(bookingData.providerId),
          serviceId: String(bookingData.serviceId),
          date: bookingData.date,
          startTime: bookingData.startTime,
          paymentMethod: 'card'
        }
      };
      console.log('user:', user);
      console.log('Payload enviado:', payload);
      // Criar payment intent para cartão
      const response = await fetch('/api/payments/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error('Erro ao processar pagamento com cartão');
      }

      const { clientSecret, paymentIntentId } = await response.json();
      
      // Para cartão, redirecionar para página de checkout do Stripe
      setLocation(`/checkout?clientSecret=${clientSecret}&amount=${Math.round(bookingData.totalPrice * 100)}&description=${encodeURIComponent(`Agendamento - ${bookingData.date} às ${bookingData.startTime}`)}`);
      
    } catch (error) {
      console.error('Erro no pagamento com cartão:', error);
      toast({
        title: "Erro no pagamento",
        description: "Não foi possível processar o pagamento com cartão. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const createAppointmentAfterPayment = async () => {
    if (!bookingData) return;

    try {
      let response;
      
      if (bookingData.multipleServices) {
        // Agendamento de múltiplos serviços
        response = await fetch('/api/booking/consecutive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: bookingData.providerId,
            date: bookingData.date,
            startTime: bookingData.startTime,
            paymentMethod: bookingData.paymentMethod,
            totalPrice: bookingData.totalPrice,
            services: bookingData.services
          })
        });
      } else {
        // Agendamento simples
        response = await fetch('/api/booking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: bookingData.providerId,
            serviceId: bookingData.serviceId,
            date: bookingData.date,
            startTime: bookingData.startTime,
            paymentMethod: bookingData.paymentMethod,
            totalPrice: bookingData.totalPrice,
          })
        });
      }

      if (!response.ok) {
        throw new Error('Erro ao criar agendamento');
      }

      const appointment = await response.json();
      
      // Limpar dados do sessionStorage
      sessionStorage.removeItem('pendingBookingData');
      
      // Redirecionar para página de sucesso
      setLocation(`/client/booking-success?appointmentId=${appointment.id || appointment.appointmentId}`);

    } catch (error) {
      console.error('Erro ao criar agendamento:', error);
      toast({
        title: "Erro ao criar agendamento",
        description: "Pagamento realizado, mas houve erro ao criar o agendamento. Entre em contato com o suporte.",
        variant: "destructive",
      });
    }
  };

  const handleBack = () => {
    setLocation(-1);
  };

  const checkPaymentStatus = async () => {
    if (!paymentIntentId) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch(`/api/payments/check-status/${paymentIntentId}`);
      
      if (!response.ok) {
        throw new Error('Erro ao verificar status do pagamento');
      }
      
      const paymentData = await response.json();
      
      if (paymentData.status === 'succeeded') {
        setPaymentStatus('success');
        toast({
          title: "Pagamento confirmado!",
          description: "Seu agendamento foi criado com sucesso.",
        });
        
        // Limpar dados da sessão
        sessionStorage.removeItem('bookingData');
        
        // Redirecionar para página de sucesso
        setTimeout(() => {
          setLocation('/client/payment-success');
        }, 2000);
      } else {
        toast({
          title: "Pagamento pendente",
          description: "O pagamento ainda não foi confirmado. Tente novamente em alguns segundos.",
        });
      }
    } catch (error) {
      console.error('Erro ao verificar status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar o status do pagamento.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Carregando dados do pagamento...</p>
        </div>
      </div>
    );
  }

  if (!bookingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Dados do agendamento não encontrados.</p>
          <Button onClick={handleBack} className="mt-4">
            Voltar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-md mx-auto">
        <Button
          variant="ghost"
          onClick={() => setLocation('/client/new-booking-wizard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>

        {showPixQR ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="h-5 w-5" />
                Pagamento PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="bg-gray-100 p-4 rounded-lg mb-4">
                  <QrCode className="h-32 w-32 mx-auto text-gray-400" />
                  <p className="text-sm text-gray-600 mt-2">
                    QR Code do PIX será exibido aqui
                  </p>
                </div>
                
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Escaneie o QR Code com seu app bancário
                  </p>
                  <p className="text-sm text-gray-600">
                    Valor: <span className="font-semibold">R$ {bookingData.totalPrice.toFixed(2).replace(".", ",")}</span>
                  </p>
                </div>

                <div className="mt-4">
                  <Button 
                    onClick={() => checkPaymentStatus()}
                    disabled={isProcessing}
                    className="w-full"
                  >
                    {isProcessing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Verificando pagamento...
                      </>
                    ) : (
                      "Verificar pagamento"
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Confirmar Pagamento</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resumo do agendamento */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Resumo do Agendamento</h3>
                
                {serviceData && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{serviceData.name}</p>
                        <p className="text-sm text-gray-600">
                          {format(new Date(bookingData.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </p>
                        <p className="text-sm text-gray-600">
                          {bookingData.startTime} - {bookingData.endTime}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {bookingData.paymentMethod === 'pix' ? 'PIX' : 'Cartão'}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Valor total */}
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold">Total a pagar:</span>
                    <span className="text-xl font-bold text-teal-600">
                      R$ {bookingData.totalPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Botão de pagamento */}
              <Button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full h-12 text-lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    {bookingData.paymentMethod === 'pix' ? (
                      <>
                        <QrCode className="h-5 w-5 mr-2" />
                        Pagar com PIX
                      </>
                    ) : (
                      <>
                        <CreditCard className="h-5 w-5 mr-2" />
                        Pagar com Cartão
                      </>
                    )}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 