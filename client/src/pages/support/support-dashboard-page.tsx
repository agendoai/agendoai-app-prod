import React, { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import SupportLayout from "@/components/layouts/SupportLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { 
  MessageSquare, 
  Search, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  RefreshCcw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function SupportDashboardPage() {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeMessageId, setActiveMessageId] = useState<number | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);

  // Consulta para buscar todas as mensagens de suporte
  const {
    data: allMessages,
    isLoading: isLoadingAll,
    refetch: refetchAll,
  } = useQuery({
    queryKey: ['/api/admin/support/all'],
    staleTime: 60000,
  });

  // Consulta para buscar mensagens pendentes
  const {
    data: pendingMessages,
    isLoading: isLoadingPending,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ['/api/admin/support/pending'],
    staleTime: 60000,
  });

  // Mutation para responder uma mensagem
  const replyMutation = useMutation({
    mutationFn: async ({ messageId, reply }: { messageId: number; reply: string }) => {
      const res = await apiRequest("POST", `/api/admin/support/resolve/${messageId}`, { response: reply });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/pending'] });
      toast({
        title: "Resposta enviada com sucesso",
        variant: "default",
      });
      setIsReplyModalOpen(false);
      setReplyText("");
      setActiveMessageId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao enviar resposta",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    },
  });

  // Função para abrir modal de resposta
  const openReplyModal = (messageId: number) => {
    setActiveMessageId(messageId);
    setReplyText("");
    setIsReplyModalOpen(true);
  };

  // Filtrar mensagens com base no termo de pesquisa
  const filteredMessages = Array.isArray(allMessages)
    ? allMessages.filter(
        (message) =>
          message.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          message.message?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          message.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          message.userEmail?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Obter contagem de mensagens por status
  const getTotalByStatus = (status: string) => {
    if (!Array.isArray(allMessages)) return 0;
    return allMessages.filter((msg) => msg.status === status).length;
  };

  // Enviar resposta
  const handleSendReply = () => {
    if (!activeMessageId || !replyText.trim()) return;
    replyMutation.mutate({
      messageId: activeMessageId,
      reply: replyText.trim(),
    });
  };

  // Renderizar badge de status
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return <Badge variant="secondary">Aberto</Badge>;
      case "pending":
        return <Badge variant="warning">Pendente</Badge>;
      case "closed":
        return <Badge variant="success">Resolvido</Badge>;
      default:
        return <Badge variant="outline">Desconhecido</Badge>;
    }
  };

  // Função para formatar a data relativa
  const formatRelativeDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, { addSuffix: true, locale: ptBR });
    } catch (error) {
      return "Data inválida";
    }
  };

  return (
    <SupportLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Central de Suporte</h1>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={() => {
                refetchAll();
                refetchPending();
                toast({
                  title: "Mensagens atualizadas",
                  variant: "default",
                });
              }}
              className="flex items-center gap-2"
            >
              <RefreshCcw size={16} />
              Atualizar
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{Array.isArray(allMessages) ? allMessages.length : 0}</CardTitle>
              <CardDescription>Total de Mensagens</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <MessageSquare className="mr-2 text-muted-foreground" size={18} />
                <span className="text-sm text-muted-foreground">Todas as mensagens</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{getTotalByStatus("pending")}</CardTitle>
              <CardDescription>Mensagens Pendentes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <Clock className="mr-2 text-amber-500" size={18} />
                <span className="text-sm text-muted-foreground">Aguardando resposta</span>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-2xl">{getTotalByStatus("closed")}</CardTitle>
              <CardDescription>Mensagens Resolvidas</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center">
                <CheckCircle className="mr-2 text-green-500" size={18} />
                <span className="text-sm text-muted-foreground">Casos encerrados</span>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Gerenciar Mensagens</CardTitle>
            <CardDescription>
              Visualize e responda mensagens de suporte dos usuários
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex mb-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  type="search"
                  placeholder="Buscar por assunto, mensagem ou usuário..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="pending">Pendentes</TabsTrigger>
                <TabsTrigger value="closed">Resolvidas</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all">
                <div className="rounded-md border">
                  <Table>
                    <TableCaption>Lista de todas as mensagens de suporte</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingAll ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : filteredMessages.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-10">
                            <AlertCircle className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">Nenhuma mensagem encontrada</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMessages.map((message) => (
                          <TableRow key={message.id}>
                            <TableCell>{message.id}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{message.userName || "Usuário não identificado"}</p>
                                <p className="text-xs text-muted-foreground">{message.userEmail}</p>
                              </div>
                            </TableCell>
                            <TableCell>{message.subject}</TableCell>
                            <TableCell>{renderStatusBadge(message.status)}</TableCell>
                            <TableCell>{formatRelativeDate(message.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openReplyModal(message.id)}
                              >
                                Detalhes
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              <TabsContent value="pending">
                <div className="rounded-md border">
                  <Table>
                    <TableCaption>Lista de mensagens pendentes</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingPending ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : !Array.isArray(pendingMessages) || pendingMessages.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-2" />
                            <p className="text-muted-foreground">Não há mensagens pendentes</p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        pendingMessages.map((message) => (
                          <TableRow key={message.id}>
                            <TableCell>{message.id}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{message.userName || "Usuário não identificado"}</p>
                                <p className="text-xs text-muted-foreground">{message.userEmail}</p>
                              </div>
                            </TableCell>
                            <TableCell>{message.subject}</TableCell>
                            <TableCell>{formatRelativeDate(message.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => openReplyModal(message.id)}
                              >
                                Responder
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
              
              <TabsContent value="closed">
                <div className="rounded-md border">
                  <Table>
                    <TableCaption>Lista de mensagens resolvidas</TableCaption>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[50px]">ID</TableHead>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Assunto</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingAll ? (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-10">
                            <div className="flex justify-center">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        (Array.isArray(allMessages) 
                          ? allMessages.filter(msg => msg.status === "closed")
                          : []
                        ).map((message) => (
                          <TableRow key={message.id}>
                            <TableCell>{message.id}</TableCell>
                            <TableCell>
                              <div>
                                <p className="font-medium">{message.userName || "Usuário não identificado"}</p>
                                <p className="text-xs text-muted-foreground">{message.userEmail}</p>
                              </div>
                            </TableCell>
                            <TableCell>{message.subject}</TableCell>
                            <TableCell>{formatRelativeDate(message.createdAt)}</TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openReplyModal(message.id)}
                              >
                                Visualizar
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Modal de resposta */}
        {activeMessageId && (
          <Dialog open={isReplyModalOpen} onOpenChange={setIsReplyModalOpen}>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Detalhes da Mensagem</DialogTitle>
                <DialogDescription>
                  Visualize e responda a mensagem do cliente
                </DialogDescription>
              </DialogHeader>
              
              {allMessages && Array.isArray(allMessages) && (
                (() => {
                  const message = allMessages.find(msg => msg.id === activeMessageId);
                  if (!message) return <div>Mensagem não encontrada</div>;
                  
                  return (
                    <div className="space-y-4 mt-2">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <h4 className="text-sm font-medium mb-1">De:</h4>
                          <p className="text-sm">{message.userName || "Não informado"}</p>
                          <p className="text-xs text-muted-foreground">{message.userEmail}</p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-1">Data:</h4>
                          <p className="text-sm">{new Date(message.createdAt).toLocaleString("pt-BR")}</p>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-1">Assunto:</h4>
                        <p className="text-sm font-medium">{message.subject}</p>
                      </div>
                      
                      <div>
                        <h4 className="text-sm font-medium mb-1">Mensagem:</h4>
                        <div className="border rounded-md p-3 bg-secondary/20 text-sm">
                          {message.message}
                        </div>
                      </div>
                      
                      {message.status !== "closed" && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Sua resposta:</h4>
                          <Textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder="Digite sua resposta para o cliente..."
                            className="min-h-[120px]"
                          />
                        </div>
                      )}
                      
                      {message.reply && (
                        <div>
                          <h4 className="text-sm font-medium mb-1">Resposta Anterior:</h4>
                          <div className="border rounded-md p-3 bg-primary/5 text-sm">
                            {message.reply}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Respondido em: {message.repliedAt ? new Date(message.repliedAt).toLocaleString("pt-BR") : "N/A"}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()
              )}
              
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsReplyModalOpen(false)}>
                  Cancelar
                </Button>
                {allMessages && Array.isArray(allMessages) && (
                  (() => {
                    const message = allMessages.find(msg => msg.id === activeMessageId);
                    if (!message || message.status === "closed") return null;
                    
                    return (
                      <Button 
                        disabled={!replyText.trim() || replyMutation.isPending}
                        onClick={handleSendReply}
                      >
                        {replyMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                            Enviando...
                          </span>
                        ) : "Enviar Resposta"}
                      </Button>
                    );
                  })()
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </SupportLayout>
  );
}