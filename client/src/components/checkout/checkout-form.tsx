import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, CreditCard } from "lucide-react";

interface CheckoutFormProps {
  onSuccess: () => void;
  onError: (error: string) => void;
  isProcessing?: boolean;
}

export function CheckoutForm({ onSuccess, onError, isProcessing = false }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    if (!stripe || !elements) {
      // Stripe.js não carregou ainda
      return;
    }
    
    setIsSubmitting(true);
    
    // Confirmar o pagamento com o Stripe.js
    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/checkout/success`,
      },
      redirect: "if_required",
    });
    
    if (error) {
      // Mostrar mensagem de erro e atualizar o UI
      onError(error.message || "Ocorreu um erro ao processar o pagamento.");
      setIsSubmitting(false);
      return;
    }
    
    if (paymentIntent && paymentIntent.status === "succeeded") {
      // O pagamento foi processado com sucesso
      onSuccess();
    } else {
      // Aguardar confirmação assíncrona do pagamento
      onError("O pagamento está sendo processado. Você será notificado quando for concluído.");
    }
    
    setIsSubmitting(false);
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <PaymentElement />
      
      <Button
        type="submit"
        className="w-full"
        disabled={!stripe || !elements || isSubmitting || isProcessing}
      >
        {isSubmitting || isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span>Processando...</span>
          </>
        ) : (
          <>
            <CreditCard className="h-4 w-4 mr-2" />
            <span>Pagar Agora</span>
          </>
        )}
      </Button>
    </form>
  );
}