import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import { useLocation, useParams } from 'wouter';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { StripeCheckoutForm } from '@/components/checkout/stripe-checkout-form';
import type { Appointment } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { formatCurrency } from '@/lib/utils';

// Inicializar Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

export default function StripeCheckoutPage() {
  const { appointmentId } = useParams();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [clientSecret, setClientSecret] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Verificar se o usuário está autenticado
    if (!user) {
      navigate('/auth');
      return;
    }

    // Verificar se o ID do agendamento foi fornecido
    if (!appointmentId) {
      navigate('/client/appointments');
      return;
    }

    const fetchAppointmentAndCreateIntent = async () => {
      try {
        // Buscar detalhes do agendamento
        const appointmentResp = await apiRequest(
          'GET', 
          `/api/appointments/${appointmentId}`
        );
        const appointmentData = await appointmentResp.json();
        setAppointment(appointmentData);

        // Verificar se o agendamento pertence ao usuário logado
        if (appointmentData.clientId !== user.id) {
          toast({
            title: 'Acesso negado',
            description: 'Este agendamento não pertence ao seu usuário',
            variant: 'destructive',
          });
          navigate('/client/appointments');
          return;
        }

        // Criar um payment intent no Stripe
        const response = await apiRequest(
          'POST', 
          '/api/stripe/create-payment-intent', 
          { appointmentId: Number(appointmentId) }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Erro ao criar o pagamento');
        }

        const { clientSecret } = await response.json();
        setClientSecret(clientSecret);
      } catch (err: any) {
        console.error('Erro:', err);
        setError(err.message || 'Ocorreu um erro ao preparar o pagamento');
        toast({
          title: 'Erro',
          description: err.message || 'Ocorreu um erro ao preparar o pagamento',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };

    fetchAppointmentAndCreateIntent();
  }, [appointmentId, navigate, toast, user]);

  const handleSuccess = () => {
    toast({
      title: 'Pagamento confirmado!',
      description: 'Seu agendamento foi confirmado com sucesso.',
      variant: 'default',
    });
    navigate('/client/appointments');
  };

  const handleCancel = () => {
    navigate(`/client/appointments`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto max-w-3xl py-10">
        <Card className="border-red-200">
          <CardHeader>
            <CardTitle className="text-red-600">Erro ao processar pagamento</CardTitle>
            <CardDescription>
              Ocorreu um problema ao configurar o pagamento. Tente novamente mais tarde.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-red-600">{error}</p>
            <button
              onClick={() => navigate('/client/appointments')}
              className="mt-4 px-4 py-2 bg-primary text-white rounded-md"
            >
              Voltar para Agendamentos
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-3xl py-10">
      <Card>
        <CardHeader>
          <CardTitle>Finalizar Pagamento</CardTitle>
          <CardDescription>
            Complete o pagamento para confirmar seu agendamento
          </CardDescription>
        </CardHeader>
        <CardContent>
          {appointment && (
            <div className="mb-6 border-b pb-4">
              <h3 className="font-medium text-lg">{appointment.serviceName}</h3>
              <p className="text-muted-foreground">
                {appointment.providerName} • {appointment.date} • {appointment.startTime}
              </p>
              <div className="mt-2 flex justify-between items-center">
                <span>Valor total</span>
                <span className="font-medium text-lg">
                  {formatCurrency(appointment.totalPrice || 0)}
                </span>
              </div>
            </div>
          )}

          {clientSecret && (
            <Elements
              stripe={stripePromise}
              options={{
                clientSecret,
                appearance: {
                  theme: 'stripe',
                  variables: {
                    colorPrimary: '#0891b2',
                    borderRadius: '4px',
                  },
                },
                locale: 'pt-BR',
              }}
            >
              <StripeCheckoutForm
                appointmentId={Number(appointmentId)}
                onSuccess={handleSuccess}
                onCancel={handleCancel}
              />
            </Elements>
          )}
        </CardContent>
      </Card>
    </div>
  );
}