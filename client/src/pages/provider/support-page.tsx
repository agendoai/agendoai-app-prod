import React from "react";
import ProviderLayout from "@/components/layout/provider-layout";
import AppHeader from "@/components/layout/app-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";

export default function ProviderSupportPage() {
  return (
    <ProviderLayout title="Suporte">
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AppHeader title="Suporte" showBackButton />
        <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 lg:space-y-10 w-full">
          <h1 className="text-3xl font-bold">Suporte ao Prestador</h1>
          <p className="text-muted-foreground">
            Nossa equipe está pronta para ajudar com qualquer problema que você encontrar em nossa plataforma.
          </p>

          {/* Contato via WhatsApp */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Suporte via WhatsApp
              </CardTitle>
              <CardDescription>
                Entre em contato conosco diretamente pelo WhatsApp para um atendimento mais rápido e personalizado.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Fale Conosco no WhatsApp</h3>
                <p className="text-muted-foreground mb-6">
                  Nossa equipe de suporte está disponível para ajudar você com qualquer dúvida ou problema.
                </p>
                <Button 
                  onClick={() => window.open('https://wa.me/5511974668605', '_blank')}
                  className="bg-green-500 hover:bg-green-600 text-white px-8 py-3 text-lg"
                  size="lg"
                >
                  <MessageCircle className="h-5 w-5 mr-2" />
                  Entrar em Contato
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  Número: (11) 97466-8605
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Sistema de Tickets - COMENTADO TEMPORARIAMENTE */}
          {/*
          <Tabs defaultValue="new-ticket">
            <TabsList className="grid grid-cols-2 max-w-md mb-6">
              <TabsTrigger value="new-ticket">Novo Ticket</TabsTrigger>
              <TabsTrigger value="my-tickets">Meus Tickets</TabsTrigger>
            </TabsList>

            <TabsContent value="new-ticket">
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
                            <SelectItem value="technical">Problema Técnico</SelectItem>
                            <SelectItem value="billing">Cobrança/Pagamento</SelectItem>
                            <SelectItem value="account">Conta/Perfil</SelectItem>
                            <SelectItem value="feature">Solicitação de Funcionalidade</SelectItem>
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
                      <Label htmlFor="ticket-message">Mensagem</Label>
                      <Textarea
                        id="ticket-message"
                        placeholder="Descreva seu problema em detalhes..."
                        value={ticketMessage}
                        onChange={(e) => setTicketMessage(e.target.value)}
                        rows={6}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button 
                    onClick={handleSubmitTicket} 
                    disabled={isSubmitting || !ticketMessage.trim()}
                    className="w-full"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Enviando...
                      </>
                    ) : (
                      <>
                        <SendHorizontal className="h-4 w-4 mr-2" />
                        Enviar Ticket
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="my-tickets">
              <Card>
                <CardHeader>
                  <CardTitle>Meus Tickets de Suporte</CardTitle>
                  <CardDescription>
                    Acompanhe o status dos seus tickets de suporte.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {submittedTicket ? (
                    <div className="text-center py-8">
                      <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Ticket Enviado com Sucesso!</h3>
                      <p className="text-muted-foreground mb-4">
                        Seu ticket foi enviado e nossa equipe irá responder em breve.
                      </p>
                      <Button onClick={() => setSubmittedTicket(false)}>
                        Criar Novo Ticket
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <MailOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-semibold mb-2">Nenhum ticket encontrado</h3>
                      <p className="text-muted-foreground mb-4">
                        Você ainda não criou nenhum ticket de suporte.
                      </p>
                      <Button>Abrir novo ticket</Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
          */}
        </div>
      </div>
    </ProviderLayout>
  );
}