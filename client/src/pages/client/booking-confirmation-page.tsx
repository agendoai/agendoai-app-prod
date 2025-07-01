import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ClientLayout from "@/components/layout/client-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Calendar, 
  Clock, 
  MapPin, 
  User, 
  Phone, 
  Mail, 
  CreditCard,
  Info,
  XCircle,
  AlertCircle
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { formatCurrency } from "@/lib/utils";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle 
} from "@/components/ui/dialog";

interface ProviderData {
  user: {
    id: number;
    name: string;
    email: string;
    phone: string | null;
    profileImage: string | null;
  };
  settings: {
    businessName: string | null;
    address: string | null;
    description: string | null;
    paymentMethods: { id: string; name: string; type: string }[] | null;
    [key: string]: any;
  };
}

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  description: string | null;
  categoryId: number;
}

export default function BookingConfirmationPage() {
  const [, setLocation] = useLocation();
  const { 
    providerId, 
    serviceId, 
    date, 
    startTime, 
    endTime,
    availabilityId = "0"
  } = useParams<{ 
    providerId: string; 
    serviceId: string; 
    date: string; 
    startTime: string; 
    endTime: string;
    availabilityId?: string;
  }>();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const { toast } = useToast();

  const parsedProviderId = parseInt(providerId);
  const parsedServiceId = parseInt(serviceId);
  const parsedAvailabilityId = parseInt(availabilityId);

  // Formatar data para exibição
  const formattedDate = date ? format(parseISO(date), "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR }) : "";

  // Buscar dados do prestador
  const { data: providerData, isLoading: isLoadingProvider } = useQuery<ProviderData>({
    queryKey: ['/api/providers', parsedProviderId],
    queryFn: () => fetch(`/api/providers/${parsedProviderId}`).then(res => {
      if (!res.ok) throw new Error("Erro ao buscar dados do prestador");
      return res.json();
    }),
    enabled: !isNaN(parsedProviderId)
  });

  // Buscar dados do serviço
  const { data: service, isLoading: isLoadingService } = useQuery<Service>({
    queryKey: ['/api/services', parsedServiceId],
    queryFn: () => fetch(`/api/services/${parsedServiceId}`).then(res => {
      if (!res.ok) throw new Error("Erro ao buscar dados do serviço");
      return res.json();
    }),
    enabled: !isNaN(parsedServiceId)
  });

  // Atualizar métodos de pagamento selecionado quando os dados do prestador carregarem
  useEffect(() => {
    if (providerData?.settings?.paymentMethods?.length) {
      // Selecionar primeiro método disponível por padrão
      setSelectedPaymentMethod(providerData.settings.paymentMethods[0].id);
    }
  }, [providerData]);

  // Estado para os slots bloqueados após o agendamento
  const [blockedTimeSlots, setBlockedTimeSlots] = useState<{startTime: string, endTime: string}[]>([]);
  const [showBlockedSlotsDialog, setShowBlockedSlotsDialog] = useState(false);

  // Mutation para criar agendamento
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Agendamento confirmado!",
        description: "Seu agendamento foi realizado com sucesso.",
      });

      // Verificar se a resposta contém slots bloqueados
      if (data.blockedTimeSlots && data.blockedTimeSlots.length > 0) {
        setBlockedTimeSlots(data.blockedTimeSlots);
        setShowBlockedSlotsDialog(true); // Mostrar diálogo com slots bloqueados
      }

      // Invalidar queries relevantes
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });

      // Redirecionar para página de sucesso do agendamento
      setTimeout(() => {
        // Log detalhado da resposta do servidor para debug
        console.log("Resposta completa da API ao criar agendamento:", JSON.stringify(data));

        // Garantir que temos um ID válido antes de redirecionar
        // Verificar as estruturas possíveis da resposta
        let appointmentId = null;

        if (data && data.appointment && data.appointment.id) {
          // Formato: { appointment: { id: ... } }
          appointmentId = data.appointment.id;
          console.log("ID encontrado na estrutura data.appointment.id:", appointmentId);
        } else if (data && data.id) {
          // Formato: { id: ... }
          appointmentId = data.id;
          console.log("ID encontrado na estrutura data.id:", appointmentId);
        } else if (data && typeof data === 'object') {
          // Procurar recursivamente por um campo id em qualquer nível do objeto
          const findId = (obj: any, path = ''): number | null => {
            if (!obj || typeof obj !== 'object') return null;

            // Verificar se o objeto atual tem um id
            if ('id' in obj && typeof obj.id === 'number') {
              console.log(`ID encontrado em ${path || 'raiz'}.id:`, obj.id);
              return obj.id;
            }

            // Procurar em subpropriedades
            for (const key in obj) {
              if (typeof obj[key] === 'object') {
                const result = findId(obj[key], path ? `${path}.${key}` : key);
                if (result) return result;
              }
            }

            return null;
          };

          appointmentId = findId(data);
        }

        if (appointmentId) {
          console.log("Redirecionando para página de sucesso com appointmentId:", appointmentId);
          setLocation(`/client/booking-success?appointmentId=${appointmentId}`);
        } else {
          console.error("Erro: ID do agendamento não encontrado na resposta", data);
          toast({
            title: "Erro de redirecionamento",
            description: "Não foi possível acessar os detalhes do agendamento. Verifique seus agendamentos.",
            variant: "destructive",
          });
          // Redirecionar para a lista de agendamentos em caso de erro
          setLocation("/client/appointments");
        }
      }, 3000); // Tempo suficiente para permitir que o usuário veja os horários bloqueados
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao agendar",
        description: error.message || "Não foi possível realizar o agendamento. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  // Manipulador para confirmar agendamento
  const handleConfirmBooking = () => {
    if (!selectedPaymentMethod) {
      toast({
        title: "Selecione um método de pagamento",
        description: "É necessário selecionar um método de pagamento para continuar.",
        variant: "destructive",
      });
      return;
    }

    createAppointmentMutation.mutate({
      providerId: parsedProviderId,
      serviceId: parsedServiceId,
      date,
      startTime,
      endTime,
      paymentMethod: selectedPaymentMethod,
      availabilityId: parsedAvailabilityId || undefined,
      // Outros dados relevantes do agendamento
    });
  };

  // Loading state
  if (isLoadingProvider || isLoadingService) {
    return (
      <ClientLayout>
        <div className="container py-8">
          <div className="flex justify-center items-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
          </div>
        </div>
      </ClientLayout>
    );
  }

  // Error state - dados não encontrados
  if (!providerData || !service) {
    return (
      <ClientLayout>
        <div className="container py-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">Informações não encontradas</h2>
            <p className="text-muted-foreground">
              O prestador ou serviço que você está procurando não existe ou não está mais disponível.
            </p>
            <Button onClick={() => window.history.back()} variant="outline">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </ClientLayout>
    );
  }

  const provider = providerData.user;
  const settings = providerData.settings;

  return (
    <>
      <Helmet>
        <title>Confirmar Agendamento | AgendoAI</title>
      </Helmet>

      {/* Diálogo para mostrar os horários bloqueados */}
      <Dialog open={showBlockedSlotsDialog} onOpenChange={setShowBlockedSlotsDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center">
              <AlertCircle className="h-5 w-5 mr-2 text-amber-500" />
              Horários Indisponíveis
            </DialogTitle>
            <DialogDescription>
              Seu agendamento foi confirmado com sucesso!
              Os seguintes horários ficaram indisponíveis após seu agendamento:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 my-4 max-h-60 overflow-y-auto">
            {blockedTimeSlots.map((slot, index) => (
              <div key={index} className="flex items-center border rounded p-2 bg-muted">
                <XCircle className="h-4 w-4 mr-2 text-destructive" />
                <span>{slot.startTime} - {slot.endTime}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 bg-muted p-3 rounded-md text-sm">
            <p className="font-medium flex items-center mb-1">
              <Info className="h-4 w-4 mr-1 text-blue-500" />
              Por que isso acontece?
            </p>
            <p>
              Quando você agenda um serviço, outros horários próximos podem ficar indisponíveis 
              para garantir que o prestador tenha tempo adequado para atender todos os clientes.
            </p>
          </div>

          <div className="mt-4 flex justify-end">
            <Button onClick={() => setShowBlockedSlotsDialog(false)}>Entendi</Button>
          </div>
        </DialogContent>
      </Dialog>

      <ClientLayout>
        <div className="container py-6 space-y-6 max-w-4xl">
          <div className="flex items-center mb-4">
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="mr-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <h1 className="text-2xl font-bold">Confirmar Agendamento</h1>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Coluna da esquerda - Detalhes do agendamento */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle className="text-xl">Detalhes do Agendamento</CardTitle>
                <CardDescription>
                  Confira as informações do seu agendamento antes de confirmar
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Resumo do agendamento */}
                <div className="space-y-4">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 rounded-lg border">
                      <AvatarImage src={provider.profileImage || undefined} alt={provider.name} />
                      <AvatarFallback className="rounded-lg bg-primary/10 text-xl">
                        {provider.name?.charAt(0) || 'P'}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">
                        {settings?.businessName || provider.name}
                      </h3>

                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3.5 w-3.5 mr-1" />
                        <span>{settings?.address || 'Endereço não informado'}</span>
                      </div>

                      <div className="flex items-center text-sm text-muted-foreground mt-1">
                        <Phone className="h-3.5 w-3.5 mr-1" />
                        <span>{provider.phone || 'Telefone não informado'}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <div className="font-medium">Serviço</div>
                      <div className="flex items-center">
                        <div className="bg-muted rounded-lg p-2 mr-3">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{service.name}</div>
                          <div className="text-sm text-muted-foreground">
                            Duração: {service.duration} minutos
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="font-medium">Data e Horário</div>
                      <div className="flex items-center">
                        <div className="bg-muted rounded-lg p-2 mr-3">
                          <Clock className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium capitalize">{formattedDate}</div>
                          <div className="text-sm text-muted-foreground">
                            {startTime} - {endTime}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3">
                    <h4 className="font-medium">Valor do Serviço</h4>
                    <div className="flex justify-between font-medium">
                      <span>Valor total</span>
                      <span className="text-lg">{formatCurrency(service.price || 0)}</span>
                    </div>

                    {service.price > 0 && (
                      <Alert className="bg-muted/50 border-muted-foreground/20">
                        <Info className="h-4 w-4" />
                        <AlertDescription>
                          O pagamento será realizado diretamente ao prestador no momento do serviço.
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Coluna da direita - Métodos de pagamento e confirmação */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Pagamento</CardTitle>
                <CardDescription>
                  Selecione como deseja pagar
                </CardDescription>
              </CardHeader>
              <CardContent>
                {settings?.paymentMethods && settings.paymentMethods.length > 0 ? (
                  <RadioGroup 
                    value={selectedPaymentMethod || undefined}
                    onValueChange={setSelectedPaymentMethod}
                    className="space-y-3"
                  >
                    {settings.paymentMethods.map((method) => (
                      <div
                        key={method.id}
                        className="flex items-center space-x-2 border rounded-md p-3 cursor-pointer hover:bg-muted"
                      >
                        <RadioGroupItem value={method.id} id={method.id} />
                        <Label 
                          htmlFor={method.id} 
                          className="flex items-center cursor-pointer flex-1"
                        >
                          <CreditCard className="h-4 w-4 mr-2" />
                          <span>{method.name}</span>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Nenhum método de pagamento disponível</p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <Button
                  onClick={handleConfirmBooking}
                  disabled={createAppointmentMutation.isPending || !selectedPaymentMethod}
                  className="w-full"
                >
                  {createAppointmentMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent mr-2"></div>
                      Processando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Confirmar Agendamento
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={() => window.history.back()}
                  className="w-full"
                  disabled={createAppointmentMutation.isPending}
                >
                  Voltar
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      </ClientLayout>
    </>
  );
}