import { useState, useEffect } from 'react';
import {
  useStripe,
  useElements,
  PaymentElement,
  AddressElement
} from '@stripe/react-stripe-js';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import { useLocation } from 'wouter';

interface StripeCheckoutFormProps {
  appointmentId: number;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function StripeCheckoutForm({ appointmentId, onSuccess, onCancel }: StripeCheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Verificar status do pagamento na URL após redirecionamento
    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      return;
    }

    stripe.retrievePaymentIntent(clientSecret).then(({ paymentIntent }) => {
      if (!paymentIntent) return;

      switch (paymentIntent.status) {
        case 'succeeded':
          toast({
            title: 'Pagamento confirmado!',
            description: 'Seu agendamento foi confirmado com sucesso.',
            variant: 'default',
          });
          if (onSuccess) onSuccess();
          break;
        case 'processing':
          toast({
            title: 'Pagamento em processamento',
            description: 'Aguarde enquanto processamos seu pagamento.',
            variant: 'default',
          });
          break;
        case 'requires_payment_method':
          toast({
            title: 'Pagamento falhou',
            description: 'Por favor, tente novamente com outro método de pagamento.',
            variant: 'destructive',
          });
          break;
        default:
          toast({
            title: 'Algo deu errado',
            description: 'Tente novamente mais tarde.',
            variant: 'destructive',
          });
          break;
      }
    });
  }, [stripe, toast, onSuccess]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      // Stripe.js ainda não carregou
      // Desabilitar o botão de formulário até que o Stripe.js tenha carregado
      return;
    }

    setProcessing(true);

    // Confirmar o pagamento com o servidor
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.origin + '/client/appointments',
      },
      redirect: 'if_required',
    });

    if (error) {
      setErrorMessage(error.message || 'Ocorreu um erro ao processar o pagamento.');
      toast({
        title: 'Erro no pagamento',
        description: error.message || 'Ocorreu um erro ao processar o pagamento.',
        variant: 'destructive',
      });
    } else {
      // Pagamento bem-sucedido
      toast({
        title: 'Pagamento confirmado!',
        description: 'Seu agendamento foi confirmado com sucesso.',
        variant: 'default',
      });
      
      // Atualizar o status do agendamento para 'confirmed'
      try {
        await apiRequest('PATCH', `/api/appointments/${appointmentId}`, {
          status: 'confirmed',
          paymentStatus: 'paid',
        });
        
        if (onSuccess) {
          onSuccess();
        } else {
          navigate('/client/appointments');
        }
      } catch (err) {
        console.error('Erro ao atualizar o status do agendamento:', err);
      }
    }

    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      
      <AddressElement options={{
        mode: 'billing',
        defaultValues: {
          address: {
            country: 'BR',
          },
        },
        fields: {
          phone: 'always',
        },
        validation: {
          phone: {
            required: 'auto',
          },
        },
      }} />
      
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {errorMessage}
        </div>
      )}
      
      <div className="flex justify-between mt-6">
        <Button 
          type="button" 
          variant="outline" 
          onClick={onCancel}
          disabled={processing}
        >
          Cancelar
        </Button>
        
        <Button 
          type="submit" 
          disabled={!stripe || processing}
          className="min-w-[120px]"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processando...
            </>
          ) : (
            'Confirmar Pagamento'
          )}
        </Button>
      </div>
    </form>
  );
}