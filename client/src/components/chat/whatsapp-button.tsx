import React from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button, ButtonProps } from "@/components/ui/button";
import { MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Estendendo as propriedades do componente Button
interface WhatsAppButtonProps extends ButtonProps {
  providerId: number;
  serviceId?: number;
  defaultMessage?: string;
  label?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
}

export function WhatsAppButton({
  providerId,
  serviceId,
  defaultMessage,
  label = "Contato rápido",
  size = "default",
  variant = "default",
  ...rest
}: WhatsAppButtonProps) {
  const { toast } = useToast();

  // Mutation para gerar link do WhatsApp
  const { mutate, isPending } = useMutation({
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
        title: "WhatsApp",
        description: `Abrindo chat com ${data.providerName}`,
      });
    },
    onError: () => {
      toast({
        title: "Erro",
        description: "Não foi possível conectar ao WhatsApp",
        variant: "destructive",
      });
    },
  });

  const handleClick = (e: React.MouseEvent) => {
    // Evitar propagação se o botão estiver dentro de outros componentes clicáveis
    e.stopPropagation();
    
    mutate({
      providerId,
      serviceId,
      message: defaultMessage,
    });
  };

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={isPending}
      className="bg-green-500 hover:bg-green-600 text-white"
      {...rest}
    >
      {size === "icon" ? (
        <MessageSquare size={16} />
      ) : (
        <>
          <MessageSquare size={16} className="mr-2" />
          {isPending ? "Abrindo..." : label}
        </>
      )}
    </Button>
  );
}

export default WhatsAppButton;