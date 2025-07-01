import React, { useEffect, useState } from 'react';
import { useLocation, useRoute } from 'wouter';
import { useStripe } from '@stripe/react-stripe-js';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { CheckCircle, AlertTriangle } from 'lucide-react';

const PaymentSuccessPage = () => {
  const stripe = useStripe();
  const [location, navigate] = useLocation();
  const [status, setStatus] = useState<'loading' | 'success' | 'failed'>('loading');
  const [message, setMessage] = useState('');
  const [paymentId, setPaymentId] = useState('');

  useEffect(() => {
    if (!stripe) {
      return;
    }

    // Obter os parâmetros da URL
    const clientSecret = new URLSearchParams(window.location.search).get(
      'payment_intent_client_secret'
    );

    if (!clientSecret) {
      setStatus('failed');
      setMessage('Não foi possível verificar o pagamento. Parâmetros inválidos.');
      return;
    }

    stripe
      .retrievePaymentIntent(clientSecret)
      .then(({ paymentIntent }) => {
        if (!paymentIntent) {
          setStatus('failed');
          setMessage('Não foi possível recuperar os detalhes do pagamento.');
          return;
        }

        setPaymentId(paymentIntent.id);

        switch (paymentIntent.status) {
          case 'succeeded':
            setStatus('success');
            setMessage('Seu pagamento foi processado com sucesso.');
            break;
          case 'processing':
            setStatus('loading');
            setMessage('Seu pagamento está sendo processado.');
            break;
          case 'requires_payment_method':
            setStatus('failed');
            setMessage('O pagamento falhou. Por favor, tente novamente.');
            break;
          default:
            setStatus('failed');
            setMessage(`Status inesperado: ${paymentIntent.status}`);
            break;
        }
      })
      .catch((err) => {
        setStatus('failed');
        setMessage(`Erro ao verificar pagamento: ${err.message}`);
      });
  }, [stripe]);

  return (
    <div className="container max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-center">
            {status === 'loading' && 'Processando Pagamento'}
            {status === 'success' && 'Pagamento Confirmado'}
            {status === 'failed' && 'Falha no Pagamento'}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center">
          {status === 'loading' && (
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary my-4"></div>
          )}
          {status === 'success' && (
            <CheckCircle className="h-16 w-16 text-green-500 my-4" />
          )}
          {status === 'failed' && (
            <AlertTriangle className="h-16 w-16 text-red-500 my-4" />
          )}

          <p className="text-center mb-4">{message}</p>

          {paymentId && (
            <p className="text-sm text-gray-500">
              ID do Pagamento: {paymentId}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button 
            onClick={() => navigate('/dashboard')}
            className="mx-2"
          >
            Ir para o Dashboard
          </Button>
          
          {status === 'failed' && (
            <Button 
              onClick={() => window.history.back()}
              variant="outline"
              className="mx-2"
            >
              Tentar Novamente
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default PaymentSuccessPage;