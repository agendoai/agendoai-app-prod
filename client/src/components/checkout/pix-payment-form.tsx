import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PixPaymentFormProps {
  pixCode: string;
  pixQrCodeUrl?: string;
  amount: number;
  expiresIn?: number; // tempo em minutos
  onCheckStatus: () => Promise<{ status: string }>;
  isProcessing?: boolean;
}

export function PixPaymentForm({
  pixCode,
  pixQrCodeUrl,
  amount,
  expiresIn = 15,
  onCheckStatus,
  isProcessing = false
}: PixPaymentFormProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [countdown, setCountdown] = useState(expiresIn * 60);
  const [isChecking, setIsChecking] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  
  // Formatar valor
  const formattedAmount = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(amount);
  
  // Formatar tempo restante
  const formatCountdown = () => {
    const minutes = Math.floor(countdown / 60);
    const seconds = countdown % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Copiar código PIX
  const copyToClipboard = () => {
    navigator.clipboard.writeText(pixCode);
    setCopied(true);
    toast({
      description: "Código PIX copiado para a área de transferência!",
    });
    
    setTimeout(() => setCopied(false), 3000);
  };
  
  // Verificar status do pagamento
  const checkPaymentStatus = async () => {
    setIsChecking(true);
    setCheckCount(prev => prev + 1);
    
    try {
      const { status } = await onCheckStatus();
      
      if (status === "paid" || status === "completed" || status === "succeeded") {
        toast({
          title: "Pagamento confirmado!",
          description: "Seu pagamento via PIX foi confirmado com sucesso.",
          variant: "default",
        });
        // O componente pai deve lidar com o redirecionamento
      } else if (checkCount >= 5) {
        toast({
          title: "Ainda não recebemos seu PIX",
          description: "Continuaremos verificando. Você receberá uma notificação quando confirmarmos o pagamento.",
          variant: "default",
        });
      }
    } catch (error) {
      toast({
        title: "Erro ao verificar pagamento",
        description: "Não foi possível verificar o status do pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsChecking(false);
    }
  };
  
  // Countdown
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  // Auto verificação a cada 10 segundos (máximo 5 vezes)
  useEffect(() => {
    if (checkCount < 5 && !isProcessing) {
      const interval = setInterval(() => {
        checkPaymentStatus();
      }, 10000);
      
      return () => clearInterval(interval);
    }
  }, [checkCount, isProcessing]);
  
  return (
    <div className="space-y-4">
      <div className="bg-gray-50 p-4 rounded-md">
        <div className="text-center mb-4">
          <div className="text-lg font-medium">{formattedAmount}</div>
          <div className="text-sm text-muted-foreground">
            {countdown > 0 ? (
              <>Expira em <span className="font-medium">{formatCountdown()}</span></>
            ) : (
              <>Tempo para pagamento expirado</>
            )}
          </div>
        </div>
        
        {pixQrCodeUrl ? (
          <div className="flex justify-center mb-4">
            <img 
              src={pixQrCodeUrl} 
              alt="QR Code PIX" 
              className="w-48 h-48 border border-gray-200 rounded"
            />
          </div>
        ) : (
          <div className="w-48 h-48 mx-auto bg-gray-200 flex items-center justify-center rounded-md mb-4">
            <span className="text-xs text-gray-500">QR Code PIX</span>
          </div>
        )}
      </div>
      
      <div className="bg-gray-50 p-4 rounded-md">
        <div className="text-sm text-center mb-2">
          Ou copie e cole o código PIX:
        </div>
        <div className="bg-white p-2 rounded-md text-xs text-center font-mono mb-4 border border-gray-200 break-all select-all">
          {pixCode}
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full" 
          onClick={copyToClipboard}
          disabled={copied}
        >
          {copied ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
              <span>Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="h-4 w-4 mr-2" />
              <span>Copiar código</span>
            </>
          )}
        </Button>
      </div>
      
      <Button 
        className="w-full" 
        onClick={checkPaymentStatus}
        disabled={isChecking || isProcessing}
      >
        {isChecking || isProcessing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            <span>Verificando...</span>
          </>
        ) : (
          <span>Verifiquei o pagamento</span>
        )}
      </Button>
      
      <div className="text-xs text-center text-muted-foreground">
        Após realizar o pagamento via PIX, pode levar alguns instantes para a confirmação.
      </div>
    </div>
  );
}