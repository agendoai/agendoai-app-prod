import { useState } from "react";
import { useStripe, useElements, CardElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

interface PaymentCardFormProps {
  onSuccess: (paymentMethod: any) => void;
  onError: (error: string) => void;
  buttonText?: string;
  showCardholderName?: boolean;
  clientSecret?: string | null;
}

export function PaymentCardForm({ 
  onSuccess, 
  onError, 
  buttonText = "Salvar cartão",
  showCardholderName = true,
  clientSecret = null
}: PaymentCardFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [cardholderName, setCardholderName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      onError("O Stripe ainda não foi carregado.");
      return;
    }
    
    setIsSubmitting(true);
    
    const cardElement = elements.getElement(CardElement);
    
    if (!cardElement) {
      onError("Elemento de cartão não encontrado.");
      setIsSubmitting(false);
      return;
    }
    
    try {
      if (clientSecret) {
        // Se temos um setupIntent, usamos confirmCardSetup
        const { error, setupIntent } = await stripe.confirmCardSetup(clientSecret, {
          payment_method: {
            card: cardElement,
            billing_details: showCardholderName ? { name: cardholderName } : undefined,
          }
        });
        
        if (error) {
          onError(error.message || "Ocorreu um erro ao salvar o cartão.");
          setIsSubmitting(false);
          return;
        }
        
        // Cartão salvo e associado ao cliente com sucesso
        onSuccess(setupIntent.payment_method);
      } else {
        // Fallback para o método antigo (criar apenas paymentMethod)
        const { error, paymentMethod } = await stripe.createPaymentMethod({
          type: 'card',
          card: cardElement,
          billing_details: showCardholderName ? { name: cardholderName } : undefined,
        });
        
        if (error) {
          onError(error.message || "Ocorreu um erro ao salvar o cartão.");
          setIsSubmitting(false);
          return;
        }
        
        // Cartão salvo com sucesso
        onSuccess(paymentMethod);
      }
    } catch (err: any) {
      onError(err.message || "Ocorreu um erro inesperado.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {showCardholderName && (
        <div className="space-y-2">
          <Label htmlFor="cardholderName">Nome no cartão</Label>
          <Input
            id="cardholderName"
            value={cardholderName}
            onChange={(e) => setCardholderName(e.target.value)}
            placeholder="NOME COMO ESCRITO NO CARTÃO"
            required
          />
        </div>
      )}
      
      <div className="space-y-2">
        <Label>Dados do cartão</Label>
        <div className="border rounded-md p-3">
          <CardElement
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
      </div>
      
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || !elements || isSubmitting}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span>Processando...</span>
          </>
        ) : (
          <>
            <Check className="h-4 w-4 mr-2" />
            <span>{buttonText}</span>
          </>
        )}
      </Button>
    </form>
  );
}