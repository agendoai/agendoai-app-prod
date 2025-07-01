import React, { useState } from "react";
import ProviderLayout from "@/components/layout/provider-layout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageCircle, MailOpen, SendHorizontal, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ProviderSupportPage() {
  const { toast } = useToast();
  const [ticketType, setTicketType] = useState("technical");
  const [ticketPriority, setTicketPriority] = useState("normal");
  const [ticketMessage, setTicketMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(false);

  // Lista de tickets de exemplo
  const exampleTickets = [
    {
      id: "T-2023-1254",
      title: "Problema ao visualizar agendamentos",
      status: "Em análise",
      date: "10/05/2025",
      category: "Técnico",
      priority: "Normal"
    },
    {
      id: "T-2023-1180",
      title: "Dúvida sobre recebimento de valores",
      status: "Respondido",
      date: "02/05/2025",
      category: "Financeiro",
      priority: "Baixa"
    },
    {
      id: "T-2023-0987",
      title: "App não está enviando notificações",
      status: "Resolvido",
      date: "21/04/2025",
      category: "Técnico",
      priority: "Alta"
    }
  ];

  const handleSubmitTicket = () => {
    if (!ticketMessage.trim()) {
      toast({
        title: "Mensagem obrigatória",
        description: "Por favor, descreva seu problema para prosseguir.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    // Simulação de envio para API
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmittedTicket(true);
      
      toast({
        title: "Ticket enviado com sucesso",
        description: "Nossa equipe irá analisar seu problema e responder em breve.",
      });
    }, 1500);
  };

  return (
    <ProviderLayout title="Suporte">
      <div className="space-y-8">
        <h1 className="text-3xl font-bold">Suporte ao Prestador</h1>
        <p className="text-muted-foreground">
          Nossa equipe está pronta para ajudar com qualquer problema que você encontrar em nossa plataforma.
        </p>

        <Tabs defaultValue="new-ticket">
          <TabsList className="grid grid-cols-2 max-w-md mb-6">
            <TabsTrigger value="new-ticket">Novo Ticket</TabsTrigger>
            <TabsTrigger value="my-tickets">Meus Tickets</TabsTrigger>
          </TabsList>

          <TabsContent value="new-ticket">
            {!submittedTicket ? (
              <Card>
                <CardHeader>
                  <CardTitle>Enviar novo ticket de suporte</CardTitle>
                  <CardDescription>
                    Descreva seu problema em detalhes para que possamos ajudar da melhor forma possível.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ticket-type">Tipo de problema</Label>
                        <Select value={ticketType} onValueChange={setTicketType}>
                          <SelectTrigger id="ticket-type">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="technical">Técnico</SelectItem>
                            <SelectItem value="financial">Financeiro</SelectItem>
                            <SelectItem value="account">Conta e Acesso</SelectItem>
                            <SelectItem value="service">Serviços</SelectItem>
                            <SelectItem value="other">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ticket-priority">Prioridade</Label>
                        <Select value={ticketPriority} onValueChange={setTicketPriority}>
                          <SelectTrigger id="ticket-priority">
                            <SelectValue placeholder="Selecione a prioridade" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="low">Baixa</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="high">Alta</SelectItem>
                            <SelectItem value="urgent">Urgente</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ticket-subject">Assunto</Label>
                      <Input id="ticket-subject" placeholder="Resumo do problema" />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="ticket-message">Descreva seu problema</Label>
                      <Textarea 
                        id="ticket-message" 
                        placeholder="Informe todos os detalhes relevantes, como data, horário e passos para reproduzir o problema" 
                        rows={5}
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button variant="outline">Cancelar</Button>
                  <Button 
                    onClick={handleSubmitTicket} 
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      "Enviando..."
                    ) : (
                      <>
                        <SendHorizontal className="h-4 w-4 mr-2" />
                        Enviar Ticket
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            ) : (
              <Card>
                <CardHeader className="text-center">
                  <CheckCircle2 className="h-16 w-16 mx-auto text-green-500 mb-2" />
                  <CardTitle>Ticket enviado com sucesso</CardTitle>
                  <CardDescription>
                    Seu ticket foi registrado com o número <strong>T-2023-1289</strong>
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-center space-y-4">
                  <p>Nossa equipe está analisando seu problema e você receberá uma resposta em breve.</p>
                  <p className="text-sm text-muted-foreground">
                    O tempo médio de resposta é de 1 dia útil para problemas técnicos.
                  </p>
                </CardContent>
                <CardFooter className="justify-center">
                  <Button onClick={() => setSubmittedTicket(false)}>
                    Enviar novo ticket
                  </Button>
                </CardFooter>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="my-tickets">
            <Card>
              <CardHeader>
                <CardTitle>Meus tickets de suporte</CardTitle>
                <CardDescription>
                  Acompanhe o status dos seus tickets de suporte
                </CardDescription>
              </CardHeader>
              <CardContent>
                {exampleTickets.length > 0 ? (
                  <div className="space-y-4">
                    {exampleTickets.map((ticket) => (
                      <div key={ticket.id} className="flex items-start gap-4 p-4 border rounded-lg hover:bg-muted/50 transition">
                        <div className="flex-shrink-0">
                          {ticket.status === "Respondido" ? (
                            <div className="bg-blue-100 rounded-full p-2">
                              <MailOpen className="h-5 w-5 text-blue-600" />
                            </div>
                          ) : ticket.status === "Resolvido" ? (
                            <div className="bg-green-100 rounded-full p-2">
                              <CheckCircle2 className="h-5 w-5 text-green-600" />
                            </div>
                          ) : (
                            <div className="bg-amber-100 rounded-full p-2">
                              <MessageCircle className="h-5 w-5 text-amber-600" />
                            </div>
                          )}
                        </div>
                        <div className="flex-grow">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium">{ticket.title}</h3>
                            <span className="text-xs text-muted-foreground">{ticket.date}</span>
                          </div>
                          <div className="flex items-center text-xs space-x-2 mt-1">
                            <span className="bg-muted rounded-full px-2 py-1">{ticket.category}</span>
                            <span className="bg-muted rounded-full px-2 py-1">Prioridade: {ticket.priority}</span>
                            <span className={`rounded-full px-2 py-1 ${
                              ticket.status === "Resolvido" ? "bg-green-100 text-green-800" :
                              ticket.status === "Respondido" ? "bg-blue-100 text-blue-800" :
                              "bg-amber-100 text-amber-800"
                            }`}>
                              {ticket.status}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="sm" className="flex-shrink-0">
                          Ver detalhes
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-muted mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">Nenhum ticket encontrado</h3>
                    <p className="text-muted-foreground mb-4">
                      Você ainda não abriu nenhum ticket de suporte.
                    </p>
                    <Button>Abrir novo ticket</Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ProviderLayout>
  );
}