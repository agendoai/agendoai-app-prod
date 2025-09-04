import { useState, useEffect, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle,
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { ClientNavbar } from "@/components/client-navbar";
import { apiCall } from '@/lib/api';
import { apiRequest, queryClient } from "@/lib/queryClient";
import { shareOnWhatsApp } from "@/lib/whatsapp";
import { createAsaasPayment } from "@/lib/api";
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  User, 
  CreditCard, 
  Share2,
  Loader2,
  Wallet,
  BanknoteIcon,
  CreditCardIcon,
  QrCode,
  Percent,
  Tags
} from "lucide-react";

// Tipo para métodos de pagamento
type PaymentMethod = {
  id: string;
  name: string;
  type: "online" | "offline";
  processor?: "stripe" | "asaas";
};

// Página de confirmação de agendamento
export default function BookingConfirmation() {
  const [, setLocation] = useLocation();
  const { providerId, serviceId, date, startTime, endTime, availabilityId } = useParams<{ 
    providerId: string; 
    serviceId: string;
    date: string;
    startTime: string;
    endTime: string;
    availabilityId?: string;
  }>();
  
  // Adicionando suporte para serviços adicionais via query parameters
  const queryParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const additionalServicesParam = queryParams.get('additionalServices');
  
  // Array de IDs de serviços adicionais
  const additionalServiceIds = useMemo(() => {
    if (!additionalServicesParam) return [];
    return additionalServicesParam.split(',').map(id => parseInt(id)).filter(id => !isNaN(id));
  }, [additionalServicesParam]);
  
  // Array completo de IDs de serviços (principal + adicionais)
  const allServiceIds = useMemo(() => {
    const parsedMainServiceId = parseInt(serviceId);
    return [parsedMainServiceId, ...additionalServiceIds];
  }, [serviceId, additionalServiceIds]);
  
  const parsedProviderId = parseInt(providerId);
  const parsedServiceId = parseInt(serviceId);
  const parsedAvailabilityId = availabilityId ? parseInt(availabilityId) : undefined;
  
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("money");
  const [selectedPaymentCategory, setSelectedPaymentCategory] = useState<"offline" | "online">("offline");
  const [discount, setDiscount] = useState<number>(0);
  const [applyDiscount, setApplyDiscount] = useState<boolean>(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Buscar métodos de pagamento disponíveis no sistema
  const { data: availablePaymentMethods, isLoading: isLoadingPaymentMethods } = useQuery<PaymentMethod[]>({
    queryKey: ['/api/payment-methods/available'],
    queryFn: () => 
      apiCall('/payment-methods/available')
        .then(res => {
          if (!res.ok) {
            throw new Error('Erro ao buscar métodos de pagamento');
          }
          return res.json();
        }),
  });
  
  // Buscar métodos de pagamento aceitos pelo prestador
  const { data: providerPaymentMethods, isLoading: isLoadingProviderPaymentMethods } = useQuery({
    queryKey: ['/api/providers', parsedProviderId, 'payment-methods'],
    queryFn: () => 
      apiCall(`/providers/${parsedProviderId}/payment-methods`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Erro ao buscar métodos de pagamento do prestador');
          }
          return res.json();
        }),
    enabled: !!parsedProviderId
  });
  
  // Formatar data para exibição
  const formattedDate = (() => {
    try {
      const parsedDate = parse(date, "yyyy-MM-dd", new Date());
      return format(parsedDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return date;
    }
  })();
  
  // Buscar dados do prestador
  const { data: providerData, isLoading: isLoadingProvider } = useQuery({
    queryKey: ['/api/providers', parsedProviderId],
    queryFn: () => {
      console.log(`Buscando dados do prestador para confirmação: ${parsedProviderId}`);
      return apiCall(`/providers/${parsedProviderId}`)
        .then(res => {
          if (!res.ok) {
            throw new Error(`Erro ao buscar prestador: ${res.status}`);
          }
          return res.json();
        });
    },
    enabled: !!parsedProviderId
  });
  
  // Buscar dados do serviço
  const { data: serviceData, isLoading: isLoadingService } = useQuery({
    queryKey: ['/api/services', parsedServiceId],
    queryFn: () => {
      console.log(`Buscando serviço por ID: ${parsedServiceId}`);
      return apiCall(`/services/${parsedServiceId}`).then(res => {
        if (!res.ok) {
          throw new Error(`Erro ao buscar serviço: ${res.status}`);
        }
        return res.json();
      });
    },
    enabled: !!parsedServiceId
  });
  
  // Mutation para criar agendamento
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      const response = await apiRequest("POST", "/api/appointments", appointmentData);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao criar agendamento");
      }
      return response.json();
    },
    onSuccess: (data) => {
      console.log("Agendamento criado com sucesso:", data);
      
      // Invalidar cache de agendamentos
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      
      // Mostrar toast de sucesso
      toast({
        title: "Agendamento confirmado!",
        description: "Seu agendamento foi registrado com sucesso.",
      });
      
      // Log detalhado para debug
      console.log("Resposta completa da API ao criar agendamento:", JSON.stringify(data));
      
      // Garantir que temos um ID válido antes de redirecionar
      let appointmentId = null;
      
      if (data && data.appointment && data.appointment.id) {
        // Formato: { appointment: { id: ... } }
        appointmentId = data.appointment.id;
      } else if (data && data.id) {
        // Formato: { id: ... }
        appointmentId = data.id;
      } else if (data && typeof data === 'object') {
        // Procurar por um id em qualquer nível do objeto
        const findId = (obj: any): number | null => {
          if (!obj || typeof obj !== 'object') return null;
          
          if ('id' in obj && typeof obj.id === 'number') {
            return obj.id;
          }
          
          for (const key in obj) {
            if (typeof obj[key] === 'object') {
              const result = findId(obj[key]);
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
          description: "Não foi possível acessar os detalhes do agendamento.",
          variant: "destructive",
        });
        // Redirecionar para a lista de agendamentos em caso de erro
        setLocation("/client/appointments");
      }
    },
    onError: (error: Error) => {
      console.error("Erro ao criar agendamento:", error);
      toast({
        title: "Erro ao agendar",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  // Verificar autenticação ao carregar o componente
  useEffect(() => {
    if (!user) {
      
      
      // Salvar dados do agendamento atual na sessão para continuar depois do login
      const bookingData = {
        providerId: parsedProviderId,
        serviceId: parsedServiceId,
        date,
        startTime,
        endTime,
        availabilityId: parsedAvailabilityId
      };
      
      
      sessionStorage.setItem('pendingBooking', JSON.stringify(bookingData));
      
      // Notificar o usuário
      toast({
        title: "Autenticação necessária",
        description: "É necessário estar logado para confirmar o agendamento. Redirecionando para o login...",
        variant: "default",
      });
      
      // Dar um breve tempo para o toast ser exibido antes de redirecionar
      setTimeout(() => {
        // Redirecionar para login com parâmetro de redirecionamento
        setLocation(`/auth?redirect=booking`);
      }, 1500);
    } else {
      console.log("Usuário autenticado, ID:", user.id, "Tipo:", (user as any).userType || "não especificado");
      // Removido: Verificação desnecessária de sessão
      // O useAuth hook já gerencia o estado de autenticação
    }
  }, [user, parsedProviderId, parsedServiceId, date, startTime, endTime, parsedAvailabilityId, setLocation, toast]);

  // Manipular envio do formulário
  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: "Usuário não autenticado",
        description: "Você precisa estar logado para agendar.",
        variant: "destructive",
      });
      // Redirecionar para login com parâmetro de redirecionamento
      sessionStorage.setItem('pendingBooking', JSON.stringify({
        providerId: parsedProviderId,
        serviceId: parsedServiceId,
        date,
        startTime,
        endTime,
        availabilityId: parsedAvailabilityId
      }));
      setLocation(`/auth?redirect=booking`);
      return;
    }
    
    if (!providerData || !serviceData) {
      toast({
        title: "Erro ao confirmar",
        description: "Dados incompletos para o agendamento.",
        variant: "destructive",
      });
      return;
    }

    // Verificar se é pagamento online com Asaas
    const selectedMethod = availablePaymentMethods?.find(m => m.id === paymentMethod);
    const isAsaasPayment = selectedMethod?.processor === 'asaas' && selectedMethod?.type === 'online';

    if (isAsaasPayment) {
      // Processar pagamento Asaas antes de criar o agendamento
      try {
        toast({
          title: "Processando pagamento...",
          description: "Aguarde enquanto processamos seu pagamento.",
        });

        const paymentResult = await createAsaasPayment({
          customerId: user.id.toString(),
          providerId: parsedProviderId,
          serviceValue: serviceData.price / 100, // Converter de centavos para reais
          billingType: paymentMethod.includes('pix') ? 'PIX' : 'CREDIT_CARD',
          description: `Agendamento - ${serviceData.name} com ${providerData.name || providerData.email}`,
          dueDate: date
        });

        if (paymentResult.success) {
          toast({
            title: "Pagamento processado!",
            description: "Pagamento realizado com sucesso. Criando agendamento...",
          });
        } else {
          throw new Error(paymentResult.message || 'Erro ao processar pagamento');
        }
      } catch (error: any) {
        console.error('Erro no pagamento Asaas:', error);
        toast({
          title: "Erro no pagamento",
          description: error.message || "Não foi possível processar o pagamento. Tente novamente.",
          variant: "destructive",
        });
        return;
      }
    }
    
    const appointmentData = {
      clientId: user.id,
      providerId: parsedProviderId,
      serviceId: parsedServiceId,
      date,
      startTime,
      endTime,
      notes,
      paymentMethod,
      availabilityId: parsedAvailabilityId,
      // Adicionar desconto se ativado
      discount: applyDiscount ? discount : 0
    };
    
    console.log("Dados do agendamento:", appointmentData);
    createAppointmentMutation.mutate(appointmentData);
  };
  
  // Compartilhar no WhatsApp
  const handleShare = () => {
    if (!providerData || !serviceData) return;
    
    const message = `
      Agendei um serviço no AgendoAI!
      
      📝 Serviço: ${serviceData.name}
      👤 Prestador: ${providerData.name || providerData.email}
      📅 Data: ${formattedDate}
      🕒 Horário: ${startTime} - ${endTime}
      
      Baixe o AgendoAI e agende também!
      https://agendoai.com
    `;
    
    shareOnWhatsApp(message);
  };
  
  // Filtrar métodos de pagamento com base nas preferências do prestador
  const filteredPaymentMethods = useMemo<PaymentMethod[]>(() => {
    if (!availablePaymentMethods || !providerPaymentMethods) {
      console.log("Métodos de pagamento não disponíveis ainda");
      return [];
    }
    
    console.log("Filtrando métodos de pagamento:", { availablePaymentMethods, providerPaymentMethods });
    
    const filtered = availablePaymentMethods.filter(method => {
      // Para métodos offline
      if (method.type === "offline") {
        if (method.id === "money" && !providerPaymentMethods.acceptsCash) return false;
        if (method.id === "card_local" && !providerPaymentMethods.acceptsDebitCard && !providerPaymentMethods.acceptsCreditCard) return false;
        if (method.id === "pix_local" && !providerPaymentMethods.acceptsPix) return false;
        if (method.id === "transfer" && !providerPaymentMethods.acceptsTransfer) return false;
        return true;
      }
      
      // Para métodos online
      if (method.type === "online") {
        // Stripe
        if (method.processor === "stripe" && !providerPaymentMethods.preferStripe) {
          console.log("Método stripe rejeitado porque prestador não prefere Stripe");
          return false;
        }
        // Asaas
        if (method.processor === "asaas" && !providerPaymentMethods.preferAsaas) {
          console.log("Método asaas rejeitado porque prestador não prefere Asaas");
          return false;
        }
        // Verificar tipo específico do método
        if (method.id.includes("card") && !providerPaymentMethods.acceptsCreditCard) {
          console.log("Método cartão rejeitado porque prestador não aceita cartão de crédito");
          return false;
        }
        if (method.id.includes("pix") && !providerPaymentMethods.acceptsPix) {
          console.log("Método pix rejeitado porque prestador não aceita PIX");
          return false;
        }
        return true;
      }
      
      return true;
    });
    
    console.log("Métodos filtrados:", filtered);
    return filtered;
  }, [availablePaymentMethods, providerPaymentMethods]);
  
  // Se não houver método selecionado ou o método selecionado não estiver na lista filtrada, selecionar dinheiro ou o primeiro disponível
  useEffect(() => {
    if (!paymentMethod) {
      // Definir "money" como método de pagamento padrão
      setPaymentMethod("money");
    } else if (filteredPaymentMethods?.length > 0 && !filteredPaymentMethods.some((m: PaymentMethod) => m.id === paymentMethod)) {
      // Se o método atual não estiver na lista de métodos filtrados, pegar o primeiro da lista
      setPaymentMethod(filteredPaymentMethods[0].id);
    }
  }, [filteredPaymentMethods, paymentMethod]);
  
  // Carregamento inicial
  const isLoading = isLoadingProvider || isLoadingService || createAppointmentMutation.isPending || isLoadingPaymentMethods || isLoadingProviderPaymentMethods;
  
  return (
    <div className="min-h-screen bg-white">
      <ClientNavbar />
      
      <main className="container px-4 py-8">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4"
          onClick={() => window.history.back()}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
        
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Confirmar Agendamento</h1>
          <p className="text-muted-foreground">Verifique os detalhes e confirme seu agendamento</p>
        </div>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Detalhes do Agendamento</CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="font-medium">{providerData?.name || providerData?.email || "Prestador"}</p>
                    <p className="text-sm text-muted-foreground">{serviceData?.name || "Serviço"}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Calendar className="h-5 w-5 text-muted-foreground" />
                  <p>{formattedDate}</p>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <p>{startTime} - {endTime}</p>
                </div>
                
                <Separator />
                
                <div className="flex justify-between font-medium">
                  <p>Total</p>
                  <p>{serviceData ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(serviceData.price / 100) : "Carregando..."}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Forma de Pagamento</CardTitle>
          </CardHeader>
          
          <CardContent>
            {isLoadingPaymentMethods ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <>
                <div className="flex justify-between mb-4">
                  <Button 
                    variant={selectedPaymentCategory === "offline" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 mr-2"
                    onClick={() => setSelectedPaymentCategory("offline")}
                    disabled={!filteredPaymentMethods.some((pm: PaymentMethod) => pm.type === "offline")}
                  >
                    <BanknoteIcon className="h-4 w-4 mr-2" />
                    No local
                  </Button>
                  <Button 
                    variant={selectedPaymentCategory === "online" ? "default" : "outline"}
                    size="sm"
                    className="flex-1 ml-2"
                    onClick={() => setSelectedPaymentCategory("online")}
                    disabled={!filteredPaymentMethods.some((pm: PaymentMethod) => pm.type === "online")}
                  >
                    <CreditCardIcon className="h-4 w-4 mr-2" />
                    Online
                  </Button>
                </div>
                
                <Separator className="my-4" />
                
                <RadioGroup
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                  className="space-y-3"
                >
                  {selectedPaymentCategory === "offline" ? (
                    // Métodos de pagamento offline (no local)
                    filteredPaymentMethods
                      .filter((method: PaymentMethod) => method.type === "offline")
                      .map((method: PaymentMethod) => (
                        <div key={method.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={method.id} id={method.id} />
                          <Label htmlFor={method.id} className="flex items-center">
                            {method.id === "money" ? (
                              <BanknoteIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                            ) : method.id === "pix_local" ? (
                              <QrCode className="h-4 w-4 mr-2 text-muted-foreground" />
                            ) : (
                              <CreditCardIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                            )}
                            {method.name}
                          </Label>
                        </div>
                      ))
                  ) : (
                    // Métodos de pagamento online
                    filteredPaymentMethods
                      .filter((method: PaymentMethod) => method.type === "online")
                      .map((method: PaymentMethod) => (
                        <div key={method.id} className="flex items-center space-x-2">
                          <RadioGroupItem value={method.id} id={method.id} />
                          <Label htmlFor={method.id} className="flex items-center">
                            {method.id.includes("pix") ? (
                              <QrCode className="h-4 w-4 mr-2 text-muted-foreground" />
                            ) : (
                              <CreditCardIcon className="h-4 w-4 mr-2 text-muted-foreground" />
                            )}
                            {method.name}
                            {method.processor && (
                              <span className="ml-2 text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                {method.processor === "stripe" ? "Stripe" : "Asaas"}
                              </span>
                            )}
                          </Label>
                        </div>
                      ))
                  )}
                  
                  {/* Mostrar mensagem se não houver métodos de pagamento disponíveis na categoria selecionada */}
                  {selectedPaymentCategory === "offline" && 
                   !filteredPaymentMethods.some((method: PaymentMethod) => method.type === "offline") && (
                    <div className="text-center p-4 border border-dashed rounded-md">
                      <p className="text-sm text-muted-foreground">
                        Este prestador não aceita pagamentos no local.
                      </p>
                    </div>
                  )}
                  
                  {selectedPaymentCategory === "online" && 
                   !filteredPaymentMethods.some((method: PaymentMethod) => method.type === "online") && (
                    <div className="text-center p-4 border border-dashed rounded-md">
                      <p className="text-sm text-muted-foreground">
                        Pagamentos online não estão disponíveis para este prestador.
                      </p>
                    </div>
                  )}
                </RadioGroup>
              </>
            )}
          </CardContent>
        </Card>
        
        {/* Controle de Desconto - Apenas visível para prestadores */}
        {user && (user as any).userType === "provider" && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Percent className="h-5 w-5 mr-2 text-primary" />
                Aplicar Desconto
              </CardTitle>
              <CardDescription>
                Conceda um desconto especial para este cliente
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <Label htmlFor="apply-discount" className="flex items-center cursor-pointer">
                    <Tags className="h-4 w-4 mr-2 text-muted-foreground" /> 
                    Ativar desconto
                  </Label>
                  <Switch 
                    id="apply-discount" 
                    checked={applyDiscount} 
                    onCheckedChange={setApplyDiscount} 
                  />
                </div>
                
                {applyDiscount && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label htmlFor="discount-slider">Percentual de desconto</Label>
                        <span className="font-medium text-primary">{discount}%</span>
                      </div>
                      
                      <Slider
                        id="discount-slider"
                        value={[discount]}
                        min={0}
                        max={30}
                        step={1}
                        onValueChange={([value]) => setDiscount(value)}
                        className="py-4"
                      />
                      
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>0%</span>
                        <span>15%</span>
                        <span>30%</span>
                      </div>
                    </div>
                    
                    {serviceData?.price && (
                      <div className="bg-muted/50 p-4 rounded-lg space-y-2">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Preço original:</span>
                          <span>
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(serviceData.price / 100)}
                          </span>
                        </div>
                        
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Desconto ({discount}%):</span>
                          <span className="text-green-600">
                            - {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format((serviceData.price * discount / 100) / 100)}
                          </span>
                        </div>
                        
                        <Separator className="my-2" />
                        
                        <div className="flex justify-between font-medium">
                          <span>Preço final:</span>
                          <span className="text-primary">
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format((serviceData.price - (serviceData.price * discount / 100)) / 100)}
                          </span>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-2">
                          O desconto é aplicado apenas sobre o valor do serviço, a taxa da plataforma permanece a mesma.
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        )}
        
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          
          <CardContent>
            <Textarea
              placeholder="Adicione informações importantes para o prestador (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </CardContent>
        </Card>
        
        <div className="flex flex-col space-y-3">
          <Button 
            onClick={handleSubmit} 
            disabled={isLoading}
            className="w-full"
            size="lg"
          >
            {createAppointmentMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Confirmar Agendamento
          </Button>
          
          <Button
            variant="outline"
            className="w-full"
            onClick={handleShare}
            disabled={isLoading || !providerData || !serviceData}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Compartilhar no WhatsApp
          </Button>
        </div>
      </main>
    </div>
  );
}