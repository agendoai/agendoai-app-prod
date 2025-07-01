import { useEffect, useState } from 'react';
import { useLocation, Link } from 'wouter';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { PageTransition } from '@/components/ui/page-transition';
import AppHeader from '@/components/layout/app-header';
import { CheckCircle, Home, CalendarDays, Loader2 } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function PaymentSuccessPage() {
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentDetails, setPaymentDetails] = useState<any>(null);
  
  // Extrair parâmetros da URL
  const searchParams = new URLSearchParams(window.location.search);
  const paymentIntentId = searchParams.get('payment_intent');
  const appointmentId = searchParams.get('appointmentId');
  
  // Verificar status do pagamento ao carregar a página
  useEffect(() => {
    const verifyPayment = async () => {
      try {
        // Verificar se temos ID de pagamento do Stripe
        if (paymentIntentId) {
          try {
            // Verificar status do pagamento
            const response = await apiRequest('GET', `/api/verify-payment/${paymentIntentId}`);
            const result = await response.json();
            
            if (result.status === 'succeeded') {
              setPaymentDetails({
                status: 'success',
                amount: result.amount,
                description: result.metadata?.description || 'Pagamento AgendoAI',
                appointmentId: result.metadata?.appointmentId
              });
            } else {
              setError(`Status do pagamento: ${result.status || 'desconhecido'}`);
            }
          } catch (stripeError) {
            console.error("Erro ao verificar status do pagamento Stripe:", stripeError);
            setError('Erro ao verificar status do pagamento');
          }
        } 
        // Verificar se temos ID de agendamento válido
        else if (appointmentId && appointmentId !== 'undefined' && appointmentId !== '') {
          try {
            // Buscar detalhes do agendamento
            const response = await apiRequest('GET', `/api/appointments/${appointmentId}`);
            const appointment = await response.json();
            
            if (appointment && appointment.id) {
              setPaymentDetails({
                status: 'success',
                amount: appointment.totalPrice,
                description: `Agendamento de ${appointment.serviceName}`,
                appointmentId: appointment.id
              });
            } else {
              setError('Agendamento não encontrado');
            }
          } catch (appointmentError) {
            console.error("Erro ao buscar agendamento:", appointmentError);
            setError('Erro ao buscar informações do agendamento');
          }
        } 
        // Nenhuma informação de pagamento ou agendamento
        else {
          setError('Informações de pagamento não encontradas');
        }
      } catch (error) {
        console.error("Erro geral:", error);
        setError('Erro ao processar informações');
      } finally {
        setLoading(false);
      }
    };
    
    verifyPayment();
  }, [paymentIntentId, appointmentId]);
  
  return (
    <div className="pb-20">
      <AppHeader 
        title="Pagamento Concluído" 
        showBackButton 
        backButtonAction={() => setLocation('/client/dashboard')}
      />
      
      <PageTransition>
        <div className="p-4 max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="mx-auto mb-4">
                {loading ? (
                  <Loader2 className="h-16 w-16 text-primary animate-spin" />
                ) : error ? (
                  <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mx-auto">
                    <span className="text-red-500 text-2xl">!</span>
                  </div>
                ) : (
                  <CheckCircle className="h-16 w-16 text-green-500" />
                )}
              </div>
              
              <CardTitle className="text-xl md:text-2xl">
                {loading ? 'Verificando pagamento...' :
                 error ? 'Erro no pagamento' :
                 'Pagamento Concluído com Sucesso!'}
              </CardTitle>
            </CardHeader>
            
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : error ? (
                <div className="bg-red-50 text-red-600 p-4 rounded-lg mb-4">
                  <p>{error}</p>
                  <p className="mt-2">Entre em contato com o suporte se o problema persistir.</p>
                </div>
              ) : (
                <>
                  <div className="p-4 bg-green-50 rounded-lg mb-4 text-center">
                    <p className="text-green-700">
                      Seu pagamento foi processado com sucesso!
                    </p>
                  </div>
                  
                  {paymentDetails && (
                    <div className="space-y-4">
                      <div>
                        <h3 className="text-sm font-medium text-neutral-500 mb-2">DETALHES DO PAGAMENTO</h3>
                        
                        {paymentDetails.amount && (
                          <div className="flex justify-between">
                            <span>Valor</span>
                            <span className="font-medium">R$ {parseFloat(paymentDetails.amount).toFixed(2)}</span>
                          </div>
                        )}
                        
                        {paymentDetails.appointmentId && (
                          <div className="flex justify-between">
                            <span>Agendamento</span>
                            <span className="font-medium">#{paymentDetails.appointmentId}</span>
                          </div>
                        )}
                        
                        <Separator className="my-2" />
                        
                        <div className="flex justify-between">
                          <span>Status</span>
                          <span className="font-medium text-green-600">Confirmado</span>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}
            </CardContent>
            
            <CardFooter className="flex flex-col space-y-3">
              <Button 
                className="w-full" 
                onClick={() => setLocation('/client/appointments')}
              >
                <CalendarDays className="mr-2 h-4 w-4" />
                Ver Meus Agendamentos
              </Button>
              
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={() => setLocation('/client/dashboard')}
              >
                <Home className="mr-2 h-4 w-4" />
                Voltar para o Dashboard
              </Button>
            </CardFooter>
          </Card>
        </div>
      </PageTransition>
    </div>
  );
}