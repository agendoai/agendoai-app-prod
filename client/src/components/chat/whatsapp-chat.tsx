import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, Send, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface WhatsAppChatProps {
  providerId: number;
  providerName: string;
  serviceId?: number;
  serviceName?: string;
  className?: string;
}

export function WhatsAppChat({ 
  providerId, 
  providerName, 
  serviceId, 
  serviceName,
  className 
}: WhatsAppChatProps) {
  const [message, setMessage] = useState("");
  const { toast } = useToast();
  
  // Mutation para gerar link do WhatsApp
  const { mutate, isPending, error } = useMutation({
    mutationFn: async (data: { 
      providerId: number; 
      serviceId?: number; 
      message?: string; 
    }) => {
      const response = await apiRequest("POST", "/api/whatsapp/generate-link", data);
      return response.json();
    },
    onSuccess: (data) => {
      // Abre o link do WhatsApp em uma nova aba
      window.open(data.whatsappLink, "_blank");
      
      toast({
        title: "Chat aberto com sucesso",
        description: `Abrindo chat com ${data.providerName}`,
      });
    },
    onError: () => {
      toast({
        title: "Erro ao abrir chat",
        description: "Não foi possível conectar ao WhatsApp. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const handleSendMessage = () => {
    mutate({ 
      providerId, 
      serviceId, 
      message: message.trim() || undefined 
    });
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare size={18} className="text-green-500" />
          <span>Chat com {providerName}</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {serviceName && (
          <p className="text-sm text-muted-foreground mb-4">
            Sobre: {serviceName}
          </p>
        )}
        
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Erro ao conectar com WhatsApp. Verifique se o prestador cadastrou um número válido.
            </AlertDescription>
          </Alert>
        )}
        
        <Textarea
          placeholder="Digite sua mensagem para o prestador..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="min-h-[120px]"
        />
      </CardContent>
      <CardFooter>
        <Button 
          onClick={handleSendMessage} 
          disabled={isPending}
          className="w-full bg-green-500 hover:bg-green-600"
        >
          {isPending ? "Abrindo chat..." : "Abrir chat no WhatsApp"}
          <Send size={16} className="ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}

export default WhatsAppChat;