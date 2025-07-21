import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { processAsaasBookingPayment } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { 
  CreditCard, 
  QrCode, 
  Copy, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  DollarSign,
  Shield
} from "lucide-react";

interface AsaasPaymentFormProps {
  bookingData: {
    customerName: string;
    customerEmail: string;
    customerCpf: string;
    serviceName: string;
    serviceValue: number; // Valor do serviço (vai para prestador)
    platformFee: number; // Taxa da plataforma (vai para empresa)
    totalValue: number; // Valor total que cliente paga
    providerSubAccountId: string;
    appointmentDate: string;
    appointmentTime: string;
  };
  onSuccess: (paymentData: any) => void;
  onError: (error: string) => void;
}

export default function AsaasPaymentForm({ bookingData, onSuccess, onError }: AsaasPaymentFormProps) {
  const { toast } = useToast();
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'CREDIT_CARD'>('PIX');
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'success' | 'error'>('pending');
  const [qrCodeData, setQrCodeData] = useState<string>('');
  const [pixCode, setPixCode] = useState<string>('');

  // Mutation para processar pagamento
  const paymentMutation = useMutation({
    mutationFn: async () => {
      const paymentData = {
        customerData: {
          name: bookingData.customerName,
          email: bookingData.customerEmail,
          cpfCnpj: bookingData.customerCpf,
        },
        paymentData: {
          billingType: paymentMethod,
          totalValue: bookingData.totalValue * 100, // Converter para centavos
          serviceValue: bookingData.serviceValue * 100, // Valor do serviço
          platformFee: bookingData.platformFee * 100, // Taxa da plataforma
          description: `Agendamento: ${bookingData.serviceName} - ${bookingData.appointmentDate} ${bookingData.appointmentTime}`,
          dueDate: new Date().toISOString().split('T')[0], // Data de hoje
          providerSubAccountId: bookingData.providerSubAccountId,
        }
      };

      const result = await processAsaasBookingPayment(paymentData);
      
      if (!result.success) {
        throw new Error(result.error || 'Erro ao processar pagamento');
      }

      return result;
    },
    onSuccess: (data) => {
      setPaymentStatus('success');
      
      // Se for PIX, extrair dados do QR Code
      if (paymentMethod === 'PIX' && data.pixQrCode) {
        setQrCodeData(data.pixQrCode);
        setPixCode(data.pixCode);
      }

      toast({
        title: "Pagamento processado!",
        description: paymentMethod === 'PIX' 
          ? "Escaneie o QR Code ou copie o código PIX para pagar"
          : "Pagamento com cartão processado com sucesso",
      });

      onSuccess(data);
    },
    onError: (error: any) => {
      setPaymentStatus('error');
      const errorMessage = error.message || 'Erro ao processar pagamento';
      
      toast({
        title: "Erro no pagamento",
        description: errorMessage,
        variant: "destructive",
      });

      onError(errorMessage);
    }
  });

  const handlePayment = () => {
    setPaymentStatus('processing');
    paymentMutation.mutate();
  };

  const copyPixCode = () => {
    if (pixCode) {
      navigator.clipboard.writeText(pixCode);
      toast({
        title: "Código PIX copiado!",
        description: "Cole o código no seu app de pagamentos",
      });
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-600" />
          Pagamento Asaas
        </CardTitle>
        <CardDescription>
          Escolha a forma de pagamento para finalizar seu agendamento
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Resumo do Agendamento */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-2">Resumo do Agendamento</h3>
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>Serviço:</span>
              <span className="font-medium">{bookingData.serviceName}</span>
            </div>
            <div className="flex justify-between">
              <span>Data/Hora:</span>
              <span className="font-medium">{bookingData.appointmentDate} {bookingData.appointmentTime}</span>
            </div>
            <div className="flex justify-between">
              <span>Valor do serviço:</span>
              <span className="font-medium">{formatCurrency(bookingData.serviceValue)}</span>
            </div>
            <div className="flex justify-between">
              <span>Taxa da plataforma:</span>
              <span className="font-medium">{formatCurrency(bookingData.platformFee)}</span>
            </div>
            <div className="flex justify-between border-t pt-1 font-semibold">
              <span>Total:</span>
              <span className="text-green-600">{formatCurrency(bookingData.totalValue)}</span>
            </div>
          </div>
        </div>

        {/* Informações de Split */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Fluxo de Pagamento:</strong><br />
            • <strong>Taxa da empresa:</strong> {formatCurrency(bookingData.platformFee)} será creditado imediatamente<br />
            • <strong>Valor do serviço:</strong> {formatCurrency(bookingData.serviceValue)} ficará retido na custódia<br />
            • <strong>Liberação:</strong> O valor será liberado quando o prestador confirmar o serviço
          </AlertDescription>
        </Alert>

        {/* Método de Pagamento */}
        <Tabs value={paymentMethod} onValueChange={(value) => setPaymentMethod(value as 'PIX' | 'CREDIT_CARD')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="PIX" className="flex items-center gap-2">
              <QrCode className="h-4 w-4" />
              PIX
            </TabsTrigger>
            <TabsTrigger value="CREDIT_CARD" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Cartão
            </TabsTrigger>
          </TabsList>

          <TabsContent value="PIX" className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Pague instantaneamente com PIX
              </p>
              
              {paymentStatus === 'success' && qrCodeData && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-lg border">
                    <img 
                      src={qrCodeData} 
                      alt="QR Code PIX" 
                      className="mx-auto w-48 h-48"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Código PIX:</Label>
                    <div className="flex gap-2">
                      <Input 
                        value={pixCode} 
                        readOnly 
                        className="text-xs font-mono"
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={copyPixCode}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {paymentStatus === 'pending' && (
                <Button 
                  onClick={handlePayment}
                  disabled={paymentMutation.isPending}
                  className="w-full"
                >
                  {paymentMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <QrCode className="h-4 w-4 mr-2" />
                      Gerar PIX
                    </>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="CREDIT_CARD" className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-4">
                Pagamento seguro com cartão de crédito
              </p>
              
              {paymentStatus === 'pending' && (
                <Button 
                  onClick={handlePayment}
                  disabled={paymentMutation.isPending}
                  className="w-full"
                >
                  {paymentMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Pagar com Cartão
                    </>
                  )}
                </Button>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Status do Pagamento */}
        {paymentStatus === 'success' && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
              Pagamento processado com sucesso! Aguarde a confirmação.
            </AlertDescription>
          </Alert>
        )}

        {paymentStatus === 'error' && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Erro ao processar pagamento. Tente novamente.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
} 