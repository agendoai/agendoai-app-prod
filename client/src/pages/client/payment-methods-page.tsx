import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, Plus, CreditCard, Check, AlertTriangle, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { 
  Dialog, 
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PaymentCardForm } from "@/components/checkout/payment-card-form";
import { apiRequest } from "@/lib/queryClient";

// Verificar se temos a chave pública do Stripe
if (!import.meta.env.VITE_STRIPE_PUBLIC_KEY) {
  throw new Error("Missing Stripe public key. Please set VITE_STRIPE_PUBLIC_KEY in your environment variables.");
}

// Inicializar o Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLIC_KEY);

// Interface para cartão de pagamento
interface PaymentCard {
  id: string;
  last4: string;
  brand: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  cardholderName?: string;
}

export default function PaymentMethodsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [addCardOpen, setAddCardOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  
  // Carregar cartões
  const { data: cards, isLoading, error: cardsError } = useQuery<PaymentCard[]>({
    queryKey: ["/api/payment/cards"],
  });
  
  // Carregar setup intent
  useEffect(() => {
    if (addCardOpen && !clientSecret) {
      apiRequest("POST", "/api/payment/setup-intent")
        .then(response => response.json())
        .then(data => {
          setClientSecret(data.clientSecret);
        })
        .catch(error => {
          console.error("Error fetching setup intent:", error);
          toast({
            title: "Erro",
            description: "Não foi possível inicializar o formulário de pagamento.",
            variant: "destructive",
          });
          setAddCardOpen(false);
        });
    }
  }, [addCardOpen, clientSecret, toast]);
  
  // Mutation para remover cartão
  const deleteCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      await apiRequest("DELETE", `/api/payment/cards/${cardId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment/cards"] });
      toast({
        title: "Cartão removido",
        description: "Seu cartão foi removido com sucesso.",
      });
      setDeleteDialogOpen(false);
      setSelectedCardId(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover cartão",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Mutation para definir cartão como padrão
  const setDefaultCardMutation = useMutation({
    mutationFn: async (cardId: string) => {
      await apiRequest("POST", `/api/payment/cards/${cardId}/set-default`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/payment/cards"] });
      toast({
        title: "Cartão padrão definido",
        description: "Seu cartão padrão foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao definir cartão padrão",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleAddCard = async (paymentMethod: any) => {
    try {
      // O cartão é automaticamente salvo no Stripe e associado ao cliente
      // através do setup intent
      toast({
        title: "Cartão adicionado",
        description: "Seu novo cartão foi adicionado com sucesso.",
      });
      
      // Recarregar a lista de cartões
      queryClient.invalidateQueries({ queryKey: ["/api/payment/cards"] });
      
      // Fechar o modal
      setAddCardOpen(false);
      setClientSecret(null);
    } catch (error: any) {
      toast({
        title: "Erro ao adicionar cartão",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  
  const handleDeleteCard = () => {
    if (selectedCardId) {
      deleteCardMutation.mutate(selectedCardId);
    }
  };
  
  const confirmDeleteCard = (id: string) => {
    setSelectedCardId(id);
    setDeleteDialogOpen(true);
  };
  
  const handleSetDefaultCard = (id: string) => {
    setDefaultCardMutation.mutate(id);
  };
  
  const goBack = () => {
    setLocation("/client/profile");
  };
  
  // Retorna um ícone baseado no tipo de cartão
  const getCardIcon = (brand: string) => {
    return <CreditCard className="h-6 w-6 text-primary" />;
  };
  
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="bg-primary text-white p-4 flex items-center">
        <button onClick={goBack} className="mr-2">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-xl font-semibold">Métodos de Pagamento</h1>
      </div>
      
      <div className="p-4">
        <p className="text-neutral-600 mb-6">
          Gerencie seus cartões e métodos de pagamento para facilitar suas reservas.
        </p>
        
        {/* Lista de cartões */}
        <div className="space-y-4 mb-6">
          {isLoading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : cardsError ? (
            <div className="text-center p-4 text-red-500">
              <p>Ocorreu um erro ao carregar seus cartões.</p>
              <p className="text-sm">{cardsError instanceof Error ? cardsError.message : 'Erro desconhecido'}</p>
            </div>
          ) : cards && cards.length > 0 ? (
            cards.map((card) => (
              <Card key={card.id} className="border border-neutral-200">
                <CardContent className="p-4">
                  <div className="flex justify-between">
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3 mt-1">
                        {getCardIcon(card.brand)}
                      </div>
                      <div>
                        <div className="flex items-center">
                          <p className="font-medium">•••• •••• •••• {card.last4}</p>
                          {card.isDefault && (
                            <span className="ml-2 bg-primary/10 text-primary text-xs px-2 py-0.5 rounded-full">
                              Padrão
                            </span>
                          )}
                        </div>
                        {card.cardholderName && (
                          <p className="text-sm text-neutral-500">
                            {card.cardholderName}
                          </p>
                        )}
                        <p className="text-sm text-neutral-500">
                          Válido até: {card.expMonth}/{card.expYear.toString().slice(-2)}
                        </p>
                        <div className="mt-2">
                          {!card.isDefault && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-xs h-7 mr-2"
                              onClick={() => handleSetDefaultCard(card.id)}
                            >
                              Definir como padrão
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-500"
                      onClick={() => confirmDeleteCard(card.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <div className="text-center p-4 text-neutral-500">
              <p>Você ainda não possui cartões cadastrados.</p>
            </div>
          )}
        </div>
        
        {/* Métodos alternativos */}
        <div className="mb-6">
          <h2 className="text-lg font-medium mb-3">Métodos alternativos</h2>
          <Card className="border border-neutral-200">
            <CardContent className="p-4">
              <div className="flex items-center">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mr-3">
                  <AlertTriangle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Pagamento no local</p>
                  <p className="text-sm text-neutral-500">
                    Você também pode optar por pagar diretamente ao prestador de serviço
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
        
        {/* Botão para adicionar cartão */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={() => setAddCardOpen(true)}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar novo cartão
        </Button>
      </div>
      
      {/* Modal para adicionar cartão */}
      <Dialog open={addCardOpen} onOpenChange={setAddCardOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar cartão</DialogTitle>
            <DialogDescription>
              Adicione um novo cartão para facilitar seus pagamentos.
            </DialogDescription>
          </DialogHeader>
          
          {clientSecret ? (
            <Elements stripe={stripePromise} options={{ clientSecret }}>
              <PaymentCardForm 
                onSuccess={handleAddCard}
                onError={(error) => {
                  toast({
                    title: "Erro ao adicionar cartão",
                    description: error,
                    variant: "destructive",
                  });
                }}
                buttonText="Adicionar cartão"
                clientSecret={clientSecret}
              />
            </Elements>
          ) : (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Diálogo de confirmação para excluir cartão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover cartão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover este cartão? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteCard}
              disabled={deleteCardMutation.isPending}
            >
              {deleteCardMutation.isPending ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Removendo...</>
              ) : (
                "Remover cartão"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}