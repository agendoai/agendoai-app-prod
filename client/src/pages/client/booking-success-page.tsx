import { useState, useEffect } from "react";
import { Helmet } from "react-helmet";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import ClientLayout from "@/components/layout/client-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Share, Calendar, ArrowRight, Check, Clock, MapPin, Phone, User, Download, ArrowLeft } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { shareOnWhatsApp } from "@/lib/whatsapp";
import { useToast } from "@/hooks/use-toast";

interface Appointment {
  id: number;
  serviceId: number;
  providerId: number;
  date: string | Date;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  paymentMethod: string;
  totalPrice: number;  // Adicionado campo totalPrice
}

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
  description?: string;
}

interface ProviderSettings {
  businessName?: string;
  address?: string;
}

interface Provider {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

interface ProviderData {
  user: Provider;
  settings?: ProviderSettings;
}

export default function BookingSuccessPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchParams] = useState(
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams()
  );
  const appointmentId = searchParams.get('appointmentId');
  const parsedAppointmentId = appointmentId ? parseInt(appointmentId) : null;
  const isValidAppointmentId = parsedAppointmentId && !isNaN(parsedAppointmentId) && parsedAppointmentId > 0;
  
  useEffect(() => {
    // Se o ID não for válido, registrar o erro e redirecionar após um breve atraso
    if (appointmentId && !isValidAppointmentId) {
      console.error(`ID de agendamento inválido: ${appointmentId}`);
      const timer = setTimeout(() => {
        toast({
          title: "ID de agendamento inválido",
          description: "Redirecionando para seus agendamentos...",
          variant: "destructive"
        });
        setLocation("/client/appointments");
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [appointmentId, isValidAppointmentId, setLocation, toast]);
  
  // Função para ir para a página de agendamentos
  const handleGoToAppointments = () => {
    setLocation("/client/appointments");
  };

  // Queries para buscar dados
  const { data: appointment, isLoading, error: appointmentError } = useQuery<Appointment>({
    queryKey: ['/api/appointments', parsedAppointmentId],
    queryFn: () => {
      console.log(`Buscando dados do agendamento: ${parsedAppointmentId}`);
      return fetch(`/api/appointments/${parsedAppointmentId}`)
        .then(res => {
          if (!res.ok) {
            console.error(`Erro ao buscar agendamento: ${res.status}`);
            throw new Error(`Erro ao buscar agendamento: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log("Dados do agendamento:", data);
          return data;
        })
        .catch(err => {
          console.error("Erro ao buscar dados do agendamento:", err);
          throw err;
        });
    },
    enabled: isValidAppointmentId,
    retry: 3, // Tenta buscar até 3 vezes em caso de falha
    refetchOnWindowFocus: false // Evita refetch desnecessário
  });
  
  const { data: service, error: serviceError } = useQuery<Service>({
    queryKey: ['/api/services', appointment?.serviceId],
    queryFn: () => {
      console.log(`Buscando dados do serviço para sucesso: ${appointment?.serviceId}`);
      return fetch(`/api/services/${appointment?.serviceId}`)
        .then(res => {
          if (!res.ok) {
            console.error(`Erro ao buscar serviço: ${res.status}`);
            throw new Error(`Erro ao buscar serviço: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log("Dados do serviço para sucesso:", data);
          return data;
        })
        .catch(err => {
          console.error("Erro ao buscar dados do serviço:", err);
          throw err;
        });
    },
    enabled: !!appointment?.serviceId,
    retry: 3,
    refetchOnWindowFocus: false
  });
  
  const { data: providerData, error: providerError } = useQuery<ProviderData>({
    queryKey: ['/api/providers', appointment?.providerId],
    queryFn: () => {
      console.log(`Buscando dados do prestador para sucesso: ${appointment?.providerId}`);
      return fetch(`/api/providers/${appointment?.providerId}`)
        .then(res => {
          if (!res.ok) {
            console.error(`Erro ao buscar prestador: ${res.status}`);
            throw new Error(`Erro ao buscar prestador: ${res.status}`);
          }
          return res.json();
        })
        .then(data => {
          console.log("Dados do prestador para sucesso:", data);
          return data;
        })
        .catch(err => {
          console.error("Erro ao buscar dados do prestador:", err);
          throw err;
        });
    },
    enabled: !!appointment?.providerId,
    retry: 3,
    refetchOnWindowFocus: false
  });
  
  // Loading state
  if (isLoading) {
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
  
  // Error state
  if (!appointment || !service || !providerData?.user) {
    return (
      <ClientLayout>
        <div className="container py-8">
          <div className="text-center space-y-4">
            <h2 className="text-2xl font-bold text-destructive">Agendamento não encontrado</h2>
            <p className="text-muted-foreground">
              {!appointment ? 
                `Não foi possível encontrar o agendamento #${appointmentId}. O agendamento pode ter sido cancelado ou o ID informado é inválido.` : 
                !service ? 
                  "Não foi possível encontrar informações do serviço para este agendamento." :
                  "Não foi possível encontrar informações do prestador para este agendamento."
              }
            </p>
            {appointmentError && (
              <p className="text-sm text-destructive">
                Erro: {appointmentError.message}
              </p>
            )}
            <div className="flex justify-center gap-4 mt-6">
              <Button onClick={handleGoToAppointments}>
                Ver Meus Agendamentos
              </Button>
              <Button variant="outline" onClick={() => window.location.reload()}>
                Tentar Novamente
              </Button>
            </div>
          </div>
        </div>
      </ClientLayout>
    );
  }
  
  // Dados do prestador e configurações
  const provider = providerData.user;
  const settings = providerData.settings;
  
  // Formatar data para exibição
  const getFormattedDate = () => {
    try {
      // Se a data já vier como Date, usar direto, senão tentar parsear da string
      const dateObj = typeof appointment.date === 'string' 
        ? parseISO(appointment.date)
        : appointment.date;
        
      return format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch (error) {
      console.error("Erro ao formatar data:", error);
      return typeof appointment.date === 'string' ? appointment.date : String(appointment.date);
    }
  };
  
  // Obter status com formatação
  const getStatusBadge = () => {
    const statusMap: { [key: string]: { label: string; variant: "default" | "secondary" | "destructive" | "outline" } } = {
      pending: { label: "Pendente", variant: "secondary" },
      confirmed: { label: "Confirmado", variant: "default" },
      cancelled: { label: "Cancelado", variant: "destructive" },
      completed: { label: "Concluído", variant: "default" },
      no_show: { label: "Não Compareceu", variant: "destructive" }
    };
    
    const { label, variant } = statusMap[appointment.status] || { label: appointment.status, variant: "outline" };
    
    return <Badge variant={variant}>{label}</Badge>;
  };
  
  // Obter forma de pagamento formatada
  const getPaymentMethod = () => {
    const methodMap: { [key: string]: string } = {
      money: "Dinheiro",
      credit_card: "Cartão de Crédito/Débito",
      pix: "PIX",
      stripe: "Cartão Online (Stripe)",
      asaas: "Pagamento Online (Asaas)"
    };
    
    return methodMap[appointment.paymentMethod] || appointment.paymentMethod;
  };
  
  // Função para compartilhar no WhatsApp
  const handleShareAppointment = () => {
    const formattedDate = getFormattedDate();
    
    const message = 
      `🗓️ *Agendamento confirmado* 🗓️\n\n` +
      `Serviço: ${service.name}\n` +
      `Prestador: ${provider.name}\n` +
      `Data: ${formattedDate}\n` +
      `Horário: ${appointment.startTime} - ${appointment.endTime}\n\n` +
      `Valor: ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(appointment.totalPrice / 100)}\n\n` +
      `Agendado via AgendoAI`;
    
    shareOnWhatsApp(message);
  };
  
  return (
    <>
      <Helmet>
        <title>Agendamento Confirmado | AgendoAI</title>
      </Helmet>
      
      <ClientLayout>
        <div className="container py-6 max-w-4xl">
          <div className="flex items-center mb-6">
            <Button 
              variant="ghost" 
              onClick={() => window.history.back()}
              className="mr-4 flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        
          <div className="text-center mb-8 space-y-4">
            <div className="flex justify-center">
              <div className="rounded-full bg-primary/10 w-20 h-20 flex items-center justify-center">
                <Check className="h-10 w-10 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Agendamento Realizado com Sucesso!</h1>
            <p className="text-muted-foreground max-w-md mx-auto">
              Seu agendamento foi registrado e está aguardando confirmação do prestador. Você receberá notificações sobre atualizações.
            </p>
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Detalhes do Agendamento</CardTitle>
                {getStatusBadge()}
              </div>
              <CardDescription>
                Código: #{appointment.id}
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <User className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium">Prestador</p>
                      <p className="text-muted-foreground">{provider.name}</p>
                      {settings?.businessName && (
                        <p className="text-sm text-muted-foreground">{settings.businessName}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-3">
                    <Calendar className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                    <div>
                      <p className="font-medium">Data e Horário</p>
                      <p className="text-muted-foreground capitalize">{getFormattedDate()}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.startTime} - {appointment.endTime}
                      </p>
                    </div>
                  </div>
                  
                  {(settings?.address || provider.address) && (
                    <div className="flex items-start gap-3">
                      <MapPin className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                      <div>
                        <p className="font-medium">Local</p>
                        <p className="text-muted-foreground">{settings?.address || provider.address}</p>
                      </div>
                    </div>
                  )}
                  
                  {provider.phone && (
                    <div className="flex items-start gap-3">
                      <Phone className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                      <div>
                        <p className="font-medium">Telefone</p>
                        <p className="text-muted-foreground">{provider.phone}</p>
                      </div>
                    </div>
                  )}
                </div>
                
                <div>
                  <div className="rounded-lg bg-secondary p-4">
                    <h3 className="font-medium mb-3">Serviço</h3>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <div className="flex items-center text-sm text-muted-foreground mt-1">
                            <Clock className="h-3 w-3 mr-1" />
                            <span>{service.duration} minutos</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(service.price / 100)}
                          </p>
                        </div>
                      </div>

                      <div className="border-t border-border pt-3">
                        <div className="flex justify-between items-center">
                          <span>Taxa de serviço</span>
                          <span>
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format((appointment.totalPrice - service.price) / 100)}
                          </span>
                        </div>
                      </div>
                      
                      <div className="border-t border-border pt-3">
                        <div className="flex justify-between items-center">
                          <span>Forma de pagamento</span>
                          <span>{getPaymentMethod()}</span>
                        </div>
                      </div>
                      
                      <div className="border-t border-border pt-3">
                        <div className="flex justify-between items-center font-medium">
                          <span>Total</span>
                          <span>
                            {new Intl.NumberFormat('pt-BR', { 
                              style: 'currency', 
                              currency: 'BRL' 
                            }).format(appointment.totalPrice / 100)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {appointment.notes && (
                    <div className="mt-4">
                      <h3 className="font-medium mb-1">Observações</h3>
                      <p className="text-sm text-muted-foreground whitespace-pre-line">{appointment.notes}</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
            
            <CardFooter className="flex flex-col sm:flex-row gap-3">
              <Button 
                variant="outline" 
                className="w-full sm:w-auto"
                onClick={handleShareAppointment}
              >
                <Share className="mr-2 h-4 w-4" />
                Compartilhar via WhatsApp
              </Button>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => window.print()}
              >
                <Download className="mr-2 h-4 w-4" />
                Salvar Comprovante
              </Button>
            </CardFooter>
          </Card>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button 
              onClick={handleGoToAppointments} 
              className="w-full sm:w-auto"
            >
              Ver Meus Agendamentos
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={() => setLocation("/client/new-booking")}
            >
              Agendar Outro Serviço
            </Button>
          </div>
        </div>
      </ClientLayout>
    </>
  );
}