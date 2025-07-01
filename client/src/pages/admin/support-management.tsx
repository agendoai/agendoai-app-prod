import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SupportMessage, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Loader2, Send, MessageSquare, CheckCircle, Clock, AlertCircle, Search, User as UserIcon } from "lucide-react";
import AdminLayout from "@/components/layout/admin-layout";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface SupportMessageWithUser extends SupportMessage {
  user?: User;
}

export default function SupportManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("pending");
  const [selectedMessage, setSelectedMessage] = useState<SupportMessageWithUser | null>(null);
  const [response, setResponse] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // Carregar todas as mensagens
  const { data: allMessages, isLoading: isLoadingAll } = useQuery({
    queryKey: ['/api/admin/support/all'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/support/all');
      return await res.json() as SupportMessage[];
    }
  });

  // Carregar mensagens pendentes
  const { data: pendingMessages, isLoading: isLoadingPending } = useQuery({
    queryKey: ['/api/admin/support/pending'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/support/pending');
      return await res.json() as SupportMessage[];
    }
  });

  // Carregar mensagens de um usuário específico
  const { data: userMessages, isLoading: isLoadingUserMessages } = useQuery({
    queryKey: ['/api/admin/support/user', selectedUserId],
    queryFn: async () => {
      if (!selectedUserId) return [];
      const res = await apiRequest('GET', `/api/admin/support/user/${selectedUserId}`);
      return await res.json() as SupportMessage[];
    },
    enabled: !!selectedUserId
  });

  // Carregar lista de usuários para pesquisa
  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/users');
      return await res.json() as User[];
    }
  });

  // Mutation para resolver mensagem
  const resolveMessageMutation = useMutation({
    mutationFn: async ({ messageId, response }: { messageId: number, response: string }) => {
      const res = await apiRequest('POST', `/api/admin/support/resolve/${messageId}`, { response });
      return await res.json() as SupportMessage;
    },
    onSuccess: () => {
      toast({
        title: "Mensagem resolvida com sucesso",
        description: "A resposta foi enviada ao usuário",
        variant: "default",
      });
      
      // Limpar estado e atualizar consultas
      setResponse("");
      setSelectedMessage(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/all'] });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/pending'] });
      if (selectedUserId) {
        queryClient.invalidateQueries({ queryKey: ['/api/admin/support/user', selectedUserId] });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao resolver mensagem",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Filtragem de usuários ao digitar na pesquisa
  useEffect(() => {
    if (searchQuery.length > 2 && users) {
      const filtered = users.filter(user => 
        user.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setSearchResults(filtered);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, users]);

  // Função para selecionar um usuário
  const selectUser = (userId: number) => {
    setSelectedUserId(userId);
    setActiveTab("user");
    setSearchQuery("");
    setSearchResults([]);
  };

  // Função para determinar a cor do badge de status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending": return "outline";
      case "in-progress": return "default";
      case "resolved": return "success";
      default: return "secondary";
    }
  };

  // Função para obter o ícone do status
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock className="h-4 w-4 mr-1" />;
      case "in-progress": return <MessageSquare className="h-4 w-4 mr-1" />;
      case "resolved": return <CheckCircle className="h-4 w-4 mr-1" />;
      default: return <AlertCircle className="h-4 w-4 mr-1" />;
    }
  };

  // Exibir mensagens com base na aba ativa e estado de carregamento
  const renderMessages = () => {
    let messages: SupportMessage[] = [];
    let isLoading = false;

    if (activeTab === "pending") {
      messages = pendingMessages || [];
      isLoading = isLoadingPending;
    } else if (activeTab === "all") {
      messages = allMessages || [];
      isLoading = isLoadingAll;
    } else if (activeTab === "user" && selectedUserId) {
      messages = userMessages || [];
      isLoading = isLoadingUserMessages;
    }

    if (isLoading) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (messages.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          Nenhuma mensagem encontrada
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {messages.map((message) => (
          <Card 
            key={message.id} 
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${selectedMessage?.id === message.id ? 'border-primary' : ''}`}
            onClick={() => setSelectedMessage(message as SupportMessageWithUser)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">#{message.id} - {message.subject}</h3>
                  <p className="text-sm text-muted-foreground line-clamp-2">{message.message}</p>
                  <div className="mt-2 flex items-center space-x-2 text-xs text-muted-foreground">
                    <span>ID do usuário: {message.userId}</span>
                    <span>•</span>
                    <span>
                      {message.createdAt ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: ptBR }) : 'Data desconhecida'}
                    </span>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(message.status)} className="flex items-center">
                  {getStatusIcon(message.status)}
                  {message.status === "pending" ? "Pendente" : 
                   message.status === "in-progress" ? "Em andamento" : 
                   message.status === "resolved" ? "Resolvido" : message.status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Central de Suporte</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Painel esquerdo: Lista de mensagens */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Mensagens</CardTitle>
                
                <div className="relative mb-2">
                  <Input
                    placeholder="Pesquisar usuário..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pr-8"
                  />
                  <Search className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  
                  {searchResults.length > 0 && (
                    <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-md">
                      {searchResults.map(user => (
                        <div 
                          key={user.id}
                          className="p-2 hover:bg-accent cursor-pointer flex items-center"
                          onClick={() => selectUser(user.id)}
                        >
                          <Avatar className="h-6 w-6 mr-2">
                            <AvatarImage src={user.profileImage || ''} />
                            <AvatarFallback>
                              <UserIcon className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-sm">
                            <div>{user.name || 'Sem nome'}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                
                <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="pending">Pendentes</TabsTrigger>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="user" disabled={!selectedUserId}>Por Usuário</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              <CardContent className="h-[calc(100vh-300px)] overflow-y-auto">
                {renderMessages()}
              </CardContent>
            </Card>
          </div>
          
          {/* Painel direito: Detalhes da mensagem e formulário de resposta */}
          <div className="md:col-span-2">
            <Card className="h-[calc(100vh-150px)] flex flex-col">
              {selectedMessage ? (
                <>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle>Detalhes da Mensagem #{selectedMessage.id}</CardTitle>
                      <Badge variant={getStatusBadgeVariant(selectedMessage.status)}>
                        {getStatusIcon(selectedMessage.status)}
                        {selectedMessage.status === "pending" ? "Pendente" : 
                         selectedMessage.status === "in-progress" ? "Em andamento" : 
                         selectedMessage.status === "resolved" ? "Resolvido" : selectedMessage.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Enviado {selectedMessage.createdAt ? formatDistanceToNow(new Date(selectedMessage.createdAt), { addSuffix: true, locale: ptBR }) : 'em data desconhecida'}
                      {selectedMessage.resolvedAt && (
                        <span> • Resolvido {formatDistanceToNow(new Date(selectedMessage.resolvedAt), { addSuffix: true, locale: ptBR })}</span>
                      )}
                    </div>
                  </CardHeader>
                  
                  <CardContent className="flex-grow overflow-y-auto">
                    <div className="space-y-6">
                      {/* Informações do usuário */}
                      <div>
                        <h3 className="text-lg font-medium">Informações do usuário</h3>
                        <div className="mt-2 p-3 bg-accent rounded-md">
                          <p><span className="font-medium">ID:</span> {selectedMessage.userId}</p>
                          {selectedMessage.user && (
                            <>
                              <p><span className="font-medium">Nome:</span> {selectedMessage.user.name || 'Não informado'}</p>
                              <p><span className="font-medium">Email:</span> {selectedMessage.user.email}</p>
                              <p><span className="font-medium">Tipo:</span> {
                                selectedMessage.user.userType === 'client' ? 'Cliente' :
                                selectedMessage.user.userType === 'provider' ? 'Prestador de Serviços' :
                                selectedMessage.user.userType === 'admin' ? 'Administrador' :
                                selectedMessage.user.userType
                              }</p>
                            </>
                          )}
                        </div>
                      </div>
                      
                      {/* Mensagem do usuário */}
                      <div>
                        <h3 className="text-lg font-medium">Assunto da mensagem</h3>
                        <p className="mt-1">{selectedMessage.subject}</p>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium">Mensagem</h3>
                        <div className="mt-1 p-4 bg-accent rounded-md whitespace-pre-wrap">
                          {selectedMessage.message}
                        </div>
                      </div>
                      
                      {/* Resposta (caso exista) */}
                      {selectedMessage.response && (
                        <div>
                          <h3 className="text-lg font-medium">Resposta do Administrador</h3>
                          <div className="mt-1 p-4 bg-muted rounded-md whitespace-pre-wrap">
                            {selectedMessage.response}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Respondido por: Admin ID {selectedMessage.adminId}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  
                  {/* Formulário de resposta (apenas para mensagens pendentes) */}
                  {selectedMessage.status === "pending" && (
                    <div className="p-4 border-t">
                      <h3 className="text-lg font-medium mb-2">Responder Mensagem</h3>
                      <Textarea
                        placeholder="Digite sua resposta para o usuário..."
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        className="mb-2"
                        rows={4}
                      />
                      <div className="flex justify-end">
                        <Button 
                          onClick={() => resolveMessageMutation.mutate({ 
                            messageId: selectedMessage.id,
                            response 
                          })}
                          disabled={!response.trim() || resolveMessageMutation.isPending}
                        >
                          {resolveMessageMutation.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="mr-2 h-4 w-4" />
                              Enviar Resposta
                            </>
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <MessageSquare className="h-16 w-16 mb-4" />
                  <p>Selecione uma mensagem para visualizar os detalhes</p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}