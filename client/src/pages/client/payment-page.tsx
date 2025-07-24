import React, { useState, useEffect } from 'react';
import { useLocation, useSearchParams, useParams } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, CreditCard, QrCode, ArrowLeft, CheckCircle, Copy } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { apiJson } from '@/lib/api';

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
  const { appointmentId } = useParams();
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
  const [pixQrCodeImage, setPixQrCodeImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const [searchParams] = useSearchParams();

  useEffect(() => {
    if (appointmentId) {
      // Novo fluxo: buscar agendamento e status do pagamento existente
      (async () => {
        setIsLoading(true);
        try {
          // Buscar detalhes do agendamento
          const appointment = await apiJson(`/api/booking/${appointmentId}`);
          if (!appointment || !appointment.paymentId) {
            toast({
              title: 'Agendamento não possui pagamento vinculado',
              description: 'Entre em contato com o suporte.',
              variant: 'destructive',
            });
            setIsLoading(false);
            return;
          }
          setBookingData({
            providerId: appointment.providerId,
            serviceId: appointment.serviceId,
            date: appointment.date,
            startTime: appointment.startTime,
            endTime: appointment.endTime,
            totalPrice: appointment.totalPrice,
            paymentMethod: appointment.paymentMethod || 'pix',
          });
          // Buscar status do pagamento no Asaas
          const paymentStatusRes = await apiJson(`/api/asaas-marketplace/payments/${appointment.paymentId}/status`);
          if (paymentStatusRes.status === 'PENDING' || paymentStatusRes.status === 'pending') {
            // Exibir QR Code/link
            setPixQrCode(paymentStatusRes.pixQrCode || paymentStatusRes.qrCode || null);
            setPixQrCodeImage(paymentStatusRes.pixQrCodeImage || paymentStatusRes.qrCodeImage || null);
            setShowPixQR(true);
            setPaymentStatus('pending');
          } else if (paymentStatusRes.status === 'RECEIVED' || paymentStatusRes.status === 'paid') {
            setPaymentStatus('success');
            setShowPixQR(false);
          } else {
            setPaymentStatus('pending');
            setShowPixQR(false);
          }
        } catch (err) {
          toast({
            title: 'Erro ao buscar pagamento',
            description: err.message || 'Tente novamente ou entre em contato com o suporte.',
            variant: 'destructive',
          });
        } finally {
          setIsLoading(false);
        }
      })();
      return;
    }
    // Verificar se o usuário está autenticado
    if (!user) {
      setLocation('/auth?redirect=payment');
      return;
    }

    // Recuperar dados do agendamento do sessionStorage
    const storedData = sessionStorage.getItem('pendingBookingData');
    if (storedData) {
      try {
        const data: BookingData = JSON.parse(storedData);
        setBookingData(data);
        fetchProviderAndServiceData(data.providerId, data.serviceId);
        return;
      } catch (error) {}
    }

    // Se não houver dados no sessionStorage, tentar pegar da URL
    const amount = parseFloat(searchParams.get('amount') || '0');
    const paymentMethod = searchParams.get('paymentMethod') || 'pix';
    if (amount > 0) {
      const tempBooking = {
        providerId: 0,
        serviceId: 0,
        date: '',
        startTime: '',
        endTime: '',
        totalPrice: amount,
        paymentMethod,
      };
      setBookingData(tempBooking);
      setIsLoading(false);

      // Criar pagamento PIX automaticamente se for PIX
      if (paymentMethod === 'pix' && user?.asaasCustomerId) {
        (async () => {
          setIsProcessing(true);
          try {
            const payload = {
              amount: amount,
              description: `Pagamento PIX - Valor direto`,
              customerId: user.asaasCustomerId,
              metadata: {
                paymentMethod: 'pix',
              }
            };
            const paymentResponse = await fetch('/api/payments/create-payment-intent', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            const result = await paymentResponse.json();
            if (result.paymentId) {
              const qrRes = await fetch(`/api/payments/pixQrCode/${result.paymentId}`);
              if (qrRes.ok) {
                const qrData = await qrRes.json();
                setPixQrCode(qrData.pixQrCode);
                setPixQrCodeImage(qrData.pixQrCodeImage);
                setShowPixQR(true);
              }
            }
          } catch (err) {
            toast({
              title: 'Erro ao gerar pagamento PIX',
              description: 'Tente novamente ou entre em contato com o suporte.',
              variant: 'destructive',
            });
          } finally {
            setIsProcessing(false);
          }
        })();
      }
      return;
    } else {
      toast({
        title: "Dados não encontrados",
        description: "Por favor, inicie o agendamento novamente.",
        variant: "destructive",
      });
      setLocation('/');
    }
  }, [user, setLocation, toast, searchParams, appointmentId]);

  // Polling automático para atualizar status do pagamento
  useEffect(() => {
    if (appointmentId && paymentStatus === 'pending') {
      const interval = setInterval(async () => {
        try {
          const appointment = await apiJson(`/api/booking/${appointmentId}`);
          if (appointment && appointment.paymentId) {
            const paymentStatusRes = await apiJson(`/api/asaas-marketplace/payments/${appointment.paymentId}/status`);
            if (paymentStatusRes.status === 'RECEIVED' || paymentStatusRes.status === 'paid') {
              setPaymentStatus('success');
              setShowPixQR(false);
              clearInterval(interval);
            }
          }
        } catch {}
      }, 5000);
      return () => clearInterval(interval);
    }
  }, [appointmentId, paymentStatus]);

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
          appointmentType: bookingData.multipleServices ? 'consecutive' : 'single',
          duration: serviceData?.duration || 30 // <-- duração do serviço
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

      // Buscar o QR Code do PIX após criar o pagamento
      if (bookingData.paymentMethod === 'pix' && result.paymentId) {
        try {
          const qrRes = await fetch(`/api/payments/pixQrCode/${result.paymentId}`);
          if (qrRes.ok) {
            const qrData = await qrRes.json();
            setPixQrCode(qrData.pixQrCode);
            setPixQrCodeImage(qrData.pixQrCodeImage);
            setShowPixQR(true);
          }
        } catch (err) {
          console.error('Erro ao buscar QR Code do PIX:', err);
        }
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
          paymentMethod: 'pix',
          duration: serviceData?.duration || 30 // <-- duração do serviço
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

  const handleCopyPixCode = () => {
    if (pixQrCode) {
      navigator.clipboard.writeText(pixQrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
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

        {showPixQR && paymentStatus === 'pending' && (
          <div className="mb-4">
            <Badge variant="warning" className="mb-2">Aguardando pagamento</Badge>
            <div className="text-xs text-gray-600 mb-2">Se você já pagou, aguarde a confirmação. Não tente pagar novamente.</div>
            <div className="text-xs text-gray-500 mb-2">A confirmação pode levar alguns minutos. Você pode fechar esta tela e acompanhar o status no dashboard.</div>
          </div>
        )}
        {paymentStatus === 'success' && (
          <div className="mb-4">
            <Badge variant="success" className="mb-2">Pagamento confirmado!</Badge>
            <div className="text-xs text-green-700 mb-2">Seu pagamento foi confirmado. Você pode voltar ao dashboard.</div>
          </div>
        )}
        {showPixQR ? (
          <Card className="shadow-xl border-2 border-teal-100">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-700">
                <QrCode className="h-5 w-5" />
                Pagamento PIX
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <div className="bg-white p-6 rounded-xl shadow-lg mb-4 flex flex-col items-center">
                  {pixQrCodeImage ? (
                    <img
                    src={
                      pixQrCodeImage && !pixQrCodeImage.startsWith('data:image')
                        ? `data:image/png;base64,${pixQrCodeImage}`
                        : pixQrCodeImage
                    }
                      alt="QR Code PIX"
                      className="mx-auto mb-2 rounded-lg border border-gray-200 shadow"
                      style={{ width: 256, height: 256 }}
                    />
                  ) : (
                    <>
                      <QrCode className="h-32 w-32 mx-auto text-gray-400" />
                      <p className="text-sm text-gray-600 mt-2">
                        QR Code do PIX será exibido aqui
                      </p>
                    </>
                  )}
                  {pixQrCode && (
                    <div className="mt-4 w-full flex flex-col items-center">
                      <p className="text-xs text-gray-500 mb-1">Ou copie o código PIX:</p>
                      <div className="flex w-full items-center gap-2">
                        <textarea
                          value={pixQrCode}
                          readOnly
                          className="w-full text-xs bg-gray-100 p-2 rounded border border-gray-200 focus:outline-none focus:ring-2 focus:ring-teal-400 transition"
                          rows={2}
                          onClick={e => (e.target as HTMLTextAreaElement).select()}
                          style={{ resize: 'none' }}
                        />
                        <Button
                          type="button"
                          size="icon"
                          variant={copied ? "success" : "outline"}
                          onClick={handleCopyPixCode}
                          className="ml-1"
                          aria-label="Copiar código PIX"
                        >
                          {copied ? <CheckCircle className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
                        </Button>
                      </div>
                      {copied && <span className="text-xs text-green-600 mt-1">Copiado!</span>}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-700 font-medium">
                    Escaneie o QR Code com seu app bancário ou copie o código acima para pagar.
                  </p>
                  <p className="text-base text-gray-700">
                    Valor: <span className="font-semibold text-teal-700">R$ {bookingData.totalPrice.toFixed(2).replace(".", ",")}</span>
                  </p>
                </div>
                <div className="mt-6">
                  <Button 
                    onClick={() => checkPaymentStatus()}
                    disabled={isProcessing}
                    className="w-full h-12 text-lg bg-teal-600 hover:bg-teal-700 text-white shadow"
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
          <Card className="shadow-xl border-2 border-teal-100 bg-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-teal-700">
                <QrCode className="h-5 w-5" />
                Confirmar Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Resumo do agendamento */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg text-gray-800 flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-teal-500" />
                  Resumo do Agendamento
                </h3>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex flex-col gap-2">
                  {serviceData ? (
                    <>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium text-gray-900">{serviceData.name}</p>
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
                    </>
                  ) : (
                    <div className="flex flex-col gap-1">
                      <span className="text-gray-700 font-medium">Pagamento PIX direto</span>
                      <span className="text-xs text-gray-500">Preencha o valor e clique em pagar</span>
                    </div>
                  )}
                </div>
                {/* Valor total */}
                <div className="border-t pt-3">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-gray-700">Total a pagar:</span>
                    <span className="text-2xl font-bold text-teal-700 drop-shadow">
                      R$ {bookingData.totalPrice.toFixed(2).replace(".", ",")}
                    </span>
                  </div>
                </div>
              </div>
              {/* Botão de pagamento */}
              <Button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full h-14 text-lg bg-gradient-to-r from-teal-500 to-teal-700 hover:from-teal-600 hover:to-teal-800 text-white shadow-lg rounded-xl flex items-center justify-center gap-2 transition-all duration-150"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <QrCode className="h-6 w-6 mr-2" />
                    <span className="font-semibold">Pagar com PIX</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}
        <Button variant="outline" onClick={() => setLocation('/client/dashboard')} className="mt-4 w-full">Voltar ao Dashboard</Button>
      </div>
    </div>
  );
} 