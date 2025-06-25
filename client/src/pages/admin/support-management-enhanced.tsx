import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { SupportTicket, SupportMessage, User } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  AlertCircle, 
  CheckCircle, 
  Clock, 
  Loader2, 
  MessageSquare, 
  Search, 
  Send, 
  User as UserIcon,
  Filter,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  PanelLeft,
  Paperclip,
  Plus
} from "lucide-react";
import AdminLayout from "@/components/layout/admin-layout";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from "@/components/ui/tooltip";

// Interfaces para exibir dados com relacionamentos
interface TicketWithUserAndMessages extends SupportTicket {
  user?: User;
  messages?: SupportMessage[];
}

export default function SupportManagementEnhanced() {
  const { toast } = useToast();
  
  // Estados para filtros e pesquisa
  const [activeTab, setActiveTab] = useState("pending");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  
  // Estados para exibição e edição de tickets
  const [selectedTicket, setSelectedTicket] = useState<TicketWithUserAndMessages | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [showInternalNoteForm, setShowInternalNoteForm] = useState(false);
  const [internalNote, setInternalNote] = useState("");
  
  // Estado para mensagens visíveis (paginação)
  const [visibleMessageCount, setVisibleMessageCount] = useState(10);
  
  // Estado para controlar se o painel de histórico está aberto
  const [historyPanelOpen, setHistoryPanelOpen] = useState(true);
  
  // Estados para modal de novo ticket
  const [newTicketDialogOpen, setNewTicketDialogOpen] = useState(false);
  const [newTicketUserId, setNewTicketUserId] = useState<number | null>(null);
  const [newTicketSubject, setNewTicketSubject] = useState("");
  const [newTicketCategory, setNewTicketCategory] = useState("general");
  const [newTicketPriority, setNewTicketPriority] = useState("normal");
  const [newTicketMessage, setNewTicketMessage] = useState("");

  // Carregando tickets com base na aba e filtros
  const { data: tickets, isLoading: isLoadingTickets } = useQuery({
    queryKey: ['/api/admin/support/tickets', activeTab, priorityFilter, categoryFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab === "pending") params.append("status", "pending");
      if (activeTab === "in-progress") params.append("status", "in-progress");
      if (activeTab === "resolved") params.append("status", "resolved");
      if (priorityFilter && priorityFilter !== "") params.append("priority", priorityFilter);
      if (categoryFilter && categoryFilter !== "") params.append("category", categoryFilter);
      
      const res = await apiRequest('GET', `/api/admin/support/tickets?${params.toString()}`);
      return await res.json() as TicketWithUserAndMessages[];
    }
  });

  // Carregando mensagens de um ticket específico
  const { data: ticketMessages, isLoading: isLoadingMessages } = useQuery({
    queryKey: ['/api/admin/support/ticket/messages', selectedTicket?.id],
    queryFn: async () => {
      if (!selectedTicket?.id) return [];
      const res = await apiRequest('GET', `/api/admin/support/ticket/${selectedTicket.id}/messages`);
      return await res.json() as SupportMessage[];
    },
    enabled: !!selectedTicket?.id
  });

  // Carregando lista de usuários para pesquisa
  const { data: users } = useQuery({
    queryKey: ['/api/admin/users'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/admin/users');
      return await res.json() as User[];
    }
  });

  // Mutation para enviar resposta ao ticket
  const respondToTicketMutation = useMutation({
    mutationFn: async ({ ticketId, message, isInternal = false }: { ticketId: number, message: string, isInternal?: boolean }) => {
      const res = await apiRequest('POST', `/api/admin/support/ticket/${ticketId}/reply`, { 
        message,
        isInternal
      });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Mensagem enviada com sucesso",
        variant: "default",
      });
      
      // Limpar campos e atualizar dados
      setNewMessage("");
      setInternalNote("");
      setShowInternalNoteForm(false);
      
      // Invalidar consultas para atualizar dados
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/tickets'] });
      if (selectedTicket?.id) {
        queryClient.invalidateQueries({ 
          queryKey: ['/api/admin/support/ticket/messages', selectedTicket.id] 
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao enviar mensagem",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para atualizar status do ticket
  const updateTicketStatusMutation = useMutation({
    mutationFn: async ({ 
      ticketId, 
      status, 
      priority, 
      adminId 
    }: { 
      ticketId: number, 
      status?: string, 
      priority?: string,
      adminId?: number 
    }) => {
      const res = await apiRequest('PUT', `/api/admin/support/ticket/${ticketId}`, { 
        status,
        priority,
        adminId
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Ticket atualizado com sucesso",
        variant: "default",
      });
      
      // Atualizar o ticket selecionado
      if (selectedTicket && selectedTicket.id === data.id) {
        setSelectedTicket(prev => prev ? { ...prev, ...data } : null);
      }
      
      // Invalidar consultas para atualizar listas
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/tickets'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar ticket",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para criar novo ticket
  const createTicketMutation = useMutation({
    mutationFn: async ({ 
      userId, 
      subject, 
      message, 
      category, 
      priority 
    }: { 
      userId: number, 
      subject: string, 
      message: string, 
      category: string, 
      priority: string 
    }) => {
      const res = await apiRequest('POST', '/api/admin/support/ticket', { 
        userId, 
        subject, 
        message,
        category, 
        priority 
      });
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Ticket criado com sucesso",
        variant: "default",
      });
      
      // Resetar o formulário e fechar o modal
      setNewTicketUserId(null);
      setNewTicketSubject("");
      setNewTicketCategory("general");
      setNewTicketPriority("normal");
      setNewTicketMessage("");
      setNewTicketDialogOpen(false);
      
      // Selecionar o novo ticket e mudar para a aba pendentes
      setSelectedTicket(data);
      setActiveTab("pending");
      
      // Invalidar consultas para atualizar listas
      queryClient.invalidateQueries({ queryKey: ['/api/admin/support/tickets'] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar ticket",
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

  // Função para selecionar um usuário da pesquisa
  const selectUser = (userId: number) => {
    setNewTicketUserId(userId);
    const selectedUser = users?.find(user => user.id === userId);
    setSearchQuery(selectedUser?.name || selectedUser?.email || "");
    setSearchResults([]);
  };

  // Função para determinar a cor do badge de status
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case "pending": return "outline";
      case "in-progress": return "default";
      case "resolved": return "success";
      case "closed": return "secondary";
      default: return "secondary";
    }
  };

  // Função para determinar a cor do badge de prioridade
  const getPriorityBadgeVariant = (priority: string) => {
    switch (priority) {
      case "low": return "secondary";
      case "normal": return "default";
      case "high": return "warning";
      case "urgent": return "destructive";
      default: return "default";
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

  // Função para obter o ícone de prioridade
  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "low": return null;
      case "normal": return null;
      case "high": return <ArrowUp className="h-4 w-4 mr-1" />;
      case "urgent": return <ArrowUp className="h-4 w-4 mr-1 text-red-500" />;
      default: return null;
    }
  };

  // Exibir tickets com base na aba ativa e estados de filtros
  const renderTickets = () => {
    if (isLoadingTickets) {
      return (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      );
    }

    if (!tickets || tickets.length === 0) {
      return (
        <div className="text-center text-muted-foreground py-8">
          Nenhum ticket encontrado
        </div>
      );
    }

    // Aplicar filtros locais adicionais se necessário
    let filteredTickets = tickets;

    return (
      <div className="space-y-4">
        {filteredTickets.map((ticket) => (
          <Card 
            key={ticket.id} 
            className={`cursor-pointer hover:bg-accent/50 transition-colors ${selectedTicket?.id === ticket.id ? 'border-primary' : ''}`}
            onClick={() => setSelectedTicket(ticket)}
          >
            <CardContent className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-medium truncate">#{ticket.id} - {ticket.subject}</h3>
                    <Badge variant={getPriorityBadgeVariant(ticket.priority)} className="flex items-center">
                      {getPriorityIcon(ticket.priority)}
                      {ticket.priority === "low" ? "Baixa" : 
                       ticket.priority === "normal" ? "Normal" : 
                       ticket.priority === "high" ? "Alta" : 
                       ticket.priority === "urgent" ? "Urgente" : ticket.priority}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {ticket.category === "general" ? "Geral" : 
                       ticket.category === "technical" ? "Técnico" : 
                       ticket.category === "billing" ? "Faturamento" : 
                       ticket.category}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Último contato: {ticket.lastResponseAt ? 
                        formatDistanceToNow(new Date(ticket.lastResponseAt), { addSuffix: true, locale: ptBR }) : 
                        (ticket.createdAt ? 
                          formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: ptBR }) : 
                          'Data desconhecida'
                        )}
                    </span>
                  </div>
                </div>
                <Badge variant={getStatusBadgeVariant(ticket.status)} className="flex items-center ml-2">
                  {getStatusIcon(ticket.status)}
                  {ticket.status === "pending" ? "Pendente" : 
                   ticket.status === "in-progress" ? "Em andamento" : 
                   ticket.status === "resolved" ? "Resolvido" : 
                   ticket.status === "closed" ? "Fechado" : ticket.status}
                </Badge>
              </div>
              <div className="mt-2 text-xs text-muted-foreground flex items-center">
                <Avatar className="h-5 w-5 mr-1">
                  <AvatarImage src={ticket.user?.profileImage || ''} />
                  <AvatarFallback>
                    <UserIcon className="h-3 w-3" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 truncate">
                  {ticket.user?.name || `Usuário #${ticket.userId}`} 
                  {ticket.user?.email && <span className="ml-1">({ticket.user.email})</span>}
                </div>
                {!ticket.readByAdmin && <span className="ml-2 bg-primary w-2 h-2 rounded-full" title="Não lido" />}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Renderizar mensagens de um ticket
  const renderTicketMessages = () => {
    if (!selectedTicket || !ticketMessages) return null;

    const sortedMessages = [...(ticketMessages || [])].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );

    const visibleMessages = sortedMessages.slice(-visibleMessageCount);
    const hasMoreMessages = sortedMessages.length > visibleMessageCount;

    return (
      <div className="space-y-4">
        {hasMoreMessages && (
          <div className="text-center">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setVisibleMessageCount(prev => prev + 10)}
            >
              Carregar mais mensagens
            </Button>
          </div>
        )}
        
        {visibleMessages.map((message, index) => (
          <div 
            key={message.id} 
            className={`p-3 rounded-lg ${
              message.adminId ? 'bg-muted ml-6' : 'bg-accent mr-6'
            } ${message.isInternal ? 'border-l-4 border-amber-500' : ''}`}
          >
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center">
                <Avatar className="h-6 w-6 mr-2">
                  {message.adminId ? (
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      A
                    </AvatarFallback>
                  ) : (
                    <>
                      <AvatarImage src={selectedTicket.user?.profileImage || ''} />
                      <AvatarFallback>
                        <UserIcon className="h-4 w-4" />
                      </AvatarFallback>
                    </>
                  )}
                </Avatar>
                <span className="font-medium text-sm">
                  {message.adminId ? 'Administrador' : (selectedTicket.user?.name || `Usuário #${selectedTicket.userId}`)}
                  {message.isInternal && <span className="text-amber-600 ml-2 text-xs">(Nota interna)</span>}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {message.createdAt ? 
                  formatDistanceToNow(new Date(message.createdAt), { addSuffix: true, locale: ptBR }) : 
                  'Data desconhecida'
                }
              </span>
            </div>
            <div className="whitespace-pre-wrap text-sm pl-8">
              {message.message}
            </div>
            {message.attachmentUrl && (
              <div className="mt-2 pl-8">
                <a 
                  href={message.attachmentUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center text-xs text-primary hover:underline"
                >
                  <Paperclip className="h-3 w-3 mr-1" />
                  Anexo
                </a>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Central de Suporte</h1>
          
          <Dialog open={newTicketDialogOpen} onOpenChange={setNewTicketDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Novo Ticket
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Criar Novo Ticket</DialogTitle>
                <DialogDescription>
                  Crie um novo ticket de suporte em nome de um usuário.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="relative">
                  <label className="text-sm font-medium mb-1 block">Usuário</label>
                  <Input
                    placeholder="Procurar usuário por nome ou email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  
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
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Assunto</label>
                  <Input
                    placeholder="Assunto do ticket"
                    value={newTicketSubject}
                    onChange={(e) => setNewTicketSubject(e.target.value)}
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-1 block">Categoria</label>
                    <Select value={newTicketCategory} onValueChange={setNewTicketCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Geral</SelectItem>
                        <SelectItem value="technical">Técnico</SelectItem>
                        <SelectItem value="billing">Faturamento</SelectItem>
                        <SelectItem value="feature">Sugestão</SelectItem>
                        <SelectItem value="bug">Bug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-1 block">Prioridade</label>
                    <Select value={newTicketPriority} onValueChange={setNewTicketPriority}>
                      <SelectTrigger>
                        <SelectValue placeholder="Prioridade" />
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
                
                <div>
                  <label className="text-sm font-medium mb-1 block">Mensagem</label>
                  <Textarea
                    placeholder="Descreva o problema ou solicitação do usuário..."
                    value={newTicketMessage}
                    onChange={(e) => setNewTicketMessage(e.target.value)}
                    rows={5}
                  />
                </div>
              </div>
              
              <div className="flex justify-end">
                <Button 
                  onClick={() => createTicketMutation.mutate({
                    userId: newTicketUserId!,
                    subject: newTicketSubject,
                    message: newTicketMessage,
                    category: newTicketCategory,
                    priority: newTicketPriority
                  })}
                  disabled={!newTicketUserId || !newTicketSubject || !newTicketMessage || createTicketMutation.isPending}
                >
                  {createTicketMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar Ticket"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Painel esquerdo: Lista de tickets */}
          <div className="lg:col-span-1">
            <Card className="h-[calc(100vh-150px)] overflow-hidden flex flex-col">
              <CardHeader className="pb-3 space-y-4">
                <CardTitle>Tickets de Suporte</CardTitle>
                
                {/* Filtros */}
                <div className="flex flex-col space-y-2">
                  <div className="flex items-center space-x-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Filtros</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <Select value={priorityFilter || ""} onValueChange={(val) => setPriorityFilter(val || null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Prioridade" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas prioridades</SelectItem>
                        <SelectItem value="low">Baixa</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">Alta</SelectItem>
                        <SelectItem value="urgent">Urgente</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    <Select value={categoryFilter || ""} onValueChange={(val) => setCategoryFilter(val || null)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Todas categorias</SelectItem>
                        <SelectItem value="general">Geral</SelectItem>
                        <SelectItem value="technical">Técnico</SelectItem>
                        <SelectItem value="billing">Faturamento</SelectItem>
                        <SelectItem value="feature">Sugestão</SelectItem>
                        <SelectItem value="bug">Bug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <Tabs defaultValue="pending" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="pending">Pendentes</TabsTrigger>
                    <TabsTrigger value="in-progress">Em Andamento</TabsTrigger>
                    <TabsTrigger value="resolved">Resolvidos</TabsTrigger>
                    <TabsTrigger value="all">Todos</TabsTrigger>
                  </TabsList>
                </Tabs>
              </CardHeader>
              
              <CardContent className="flex-grow overflow-y-auto">
                {renderTickets()}
              </CardContent>
            </Card>
          </div>
          
          {/* Painel direito: Detalhes do ticket e conversas */}
          <div className="lg:col-span-2">
            {selectedTicket ? (
              <Card className="h-[calc(100vh-150px)] flex flex-col">
                <CardHeader className="pb-3 border-b">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center space-x-2">
                        <CardTitle>Ticket #{selectedTicket.id}</CardTitle>
                        <Badge variant={getPriorityBadgeVariant(selectedTicket.priority)}>
                          {getPriorityIcon(selectedTicket.priority)}
                          {selectedTicket.priority === "low" ? "Baixa" : 
                           selectedTicket.priority === "normal" ? "Normal" : 
                           selectedTicket.priority === "high" ? "Alta" : 
                           selectedTicket.priority === "urgent" ? "Urgente" : selectedTicket.priority}
                        </Badge>
                        <Badge variant={getStatusBadgeVariant(selectedTicket.status)}>
                          {getStatusIcon(selectedTicket.status)}
                          {selectedTicket.status === "pending" ? "Pendente" : 
                           selectedTicket.status === "in-progress" ? "Em andamento" : 
                           selectedTicket.status === "resolved" ? "Resolvido" : 
                           selectedTicket.status === "closed" ? "Fechado" : selectedTicket.status}
                        </Badge>
                      </div>
                      <div className="text-sm font-medium mt-1">{selectedTicket.subject}</div>
                    </div>
                    
                    <div className="flex items-center">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="icon"
                              onClick={() => setHistoryPanelOpen(!historyPanelOpen)}
                            >
                              <PanelLeft className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {historyPanelOpen ? "Esconder" : "Mostrar"} informações do ticket
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Ações do Ticket</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            disabled={selectedTicket.status === "in-progress"}
                            onClick={() => updateTicketStatusMutation.mutate({ 
                              ticketId: selectedTicket.id, 
                              status: "in-progress",
                              adminId: 1 // ID do admin atual 
                            })}
                          >
                            Assumir Ticket
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            disabled={selectedTicket.status === "pending"}
                            onClick={() => updateTicketStatusMutation.mutate({ 
                              ticketId: selectedTicket.id, 
                              status: "pending",
                              adminId: null 
                            })}
                          >
                            Marcar como Pendente
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            disabled={selectedTicket.status === "resolved"}
                            onClick={() => updateTicketStatusMutation.mutate({ 
                              ticketId: selectedTicket.id, 
                              status: "resolved" 
                            })}
                          >
                            Marcar como Resolvido
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            disabled={selectedTicket.status === "closed"}
                            onClick={() => updateTicketStatusMutation.mutate({ 
                              ticketId: selectedTicket.id, 
                              status: "closed" 
                            })}
                          >
                            Fechar Ticket
                          </DropdownMenuItem>
                          
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel>Alterar Prioridade</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          
                          <DropdownMenuItem 
                            disabled={selectedTicket.priority === "low"}
                            onClick={() => updateTicketStatusMutation.mutate({ 
                              ticketId: selectedTicket.id, 
                              priority: "low" 
                            })}
                          >
                            Baixa
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            disabled={selectedTicket.priority === "normal"}
                            onClick={() => updateTicketStatusMutation.mutate({ 
                              ticketId: selectedTicket.id, 
                              priority: "normal" 
                            })}
                          >
                            Normal
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            disabled={selectedTicket.priority === "high"}
                            onClick={() => updateTicketStatusMutation.mutate({ 
                              ticketId: selectedTicket.id, 
                              priority: "high" 
                            })}
                          >
                            Alta
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem 
                            disabled={selectedTicket.priority === "urgent"}
                            onClick={() => updateTicketStatusMutation.mutate({ 
                              ticketId: selectedTicket.id, 
                              priority: "urgent" 
                            })}
                          >
                            Urgente
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="text-xs text-muted-foreground flex items-center justify-between mt-2">
                    <div>
                      Criado {selectedTicket.createdAt ? formatDistanceToNow(new Date(selectedTicket.createdAt), { addSuffix: true, locale: ptBR }) : 'em data desconhecida'}
                      {selectedTicket.lastResponseAt && (
                        <span> • Última resposta {formatDistanceToNow(new Date(selectedTicket.lastResponseAt), { addSuffix: true, locale: ptBR })}</span>
                      )}
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {selectedTicket.category === "general" ? "Geral" : 
                       selectedTicket.category === "technical" ? "Técnico" : 
                       selectedTicket.category === "billing" ? "Faturamento" :
                       selectedTicket.category === "feature" ? "Sugestão" :
                       selectedTicket.category === "bug" ? "Bug" : 
                       selectedTicket.category}
                    </Badge>
                  </div>
                </CardHeader>
                
                <div className="flex flex-1 overflow-hidden">
                  {/* Painel lateral com informações do usuário */}
                  {historyPanelOpen && (
                    <div className="w-64 border-r p-4 overflow-y-auto">
                      <div className="space-y-6">
                        <div>
                          <h3 className="text-sm font-medium mb-2">Informações do Usuário</h3>
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Avatar>
                                <AvatarImage src={selectedTicket.user?.profileImage || ''} />
                                <AvatarFallback>
                                  <UserIcon className="h-4 w-4" />
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <div className="font-medium">{selectedTicket.user?.name || 'Sem nome'}</div>
                                <div className="text-xs text-muted-foreground">{selectedTicket.user?.email}</div>
                              </div>
                            </div>
                            
                            <div className="text-xs">
                              <div className="grid grid-cols-2 gap-1">
                                <span className="font-medium">ID:</span>
                                <span>{selectedTicket.userId}</span>
                                
                                <span className="font-medium">Tipo:</span>
                                <span>
                                  {selectedTicket.user?.userType === 'client' ? 'Cliente' :
                                   selectedTicket.user?.userType === 'provider' ? 'Prestador' :
                                   selectedTicket.user?.userType === 'admin' ? 'Administrador' :
                                   selectedTicket.user?.userType || 'Desconhecido'}
                                </span>
                                
                                <span className="font-medium">Telefone:</span>
                                <span>{selectedTicket.user?.phone || 'Não informado'}</span>
                                
                                <span className="font-medium">Cadastro:</span>
                                <span>
                                  {selectedTicket.user?.createdAt ? 
                                    formatDistanceToNow(new Date(selectedTicket.user.createdAt), { addSuffix: true, locale: ptBR }) : 
                                    'Desconhecido'
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h3 className="text-sm font-medium mb-2">Histórico de Tickets</h3>
                          <div className="space-y-2">
                            <Button variant="outline" size="sm" className="w-full">
                              Ver todos os tickets
                            </Button>
                          </div>
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <h3 className="text-sm font-medium mb-2">Notas Internas</h3>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full"
                            onClick={() => setShowInternalNoteForm(true)}
                          >
                            Adicionar nota interna
                          </Button>
                          
                          {showInternalNoteForm && (
                            <div className="mt-2">
                              <Textarea
                                placeholder="Adicione uma nota interna (visível apenas para admins)..."
                                value={internalNote}
                                onChange={(e) => setInternalNote(e.target.value)}
                                className="mb-2 text-xs"
                                rows={3}
                              />
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="default"
                                  className="text-xs"
                                  onClick={() => {
                                    if (internalNote.trim()) {
                                      respondToTicketMutation.mutate({
                                        ticketId: selectedTicket.id,
                                        message: internalNote,
                                        isInternal: true
                                      });
                                    }
                                  }}
                                  disabled={!internalNote.trim() || respondToTicketMutation.isPending}
                                >
                                  {respondToTicketMutation.isPending ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    "Salvar"
                                  )}
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="text-xs"
                                  onClick={() => {
                                    setShowInternalNoteForm(false);
                                    setInternalNote("");
                                  }}
                                >
                                  Cancelar
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Área principal de conversa */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Mensagens */}
                    <div className="flex-1 overflow-y-auto p-4">
                      {isLoadingMessages ? (
                        <div className="flex justify-center items-center h-32">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : (
                        renderTicketMessages()
                      )}
                    </div>
                    
                    {/* Área de resposta */}
                    {selectedTicket.status !== "closed" && (
                      <div className="p-4 border-t">
                        <div className="flex items-center space-x-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                              A
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium">Responder como Admin</span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Textarea
                            placeholder="Digite sua resposta..."
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="flex-1"
                            rows={3}
                          />
                          <Button 
                            className="self-end"
                            onClick={() => {
                              if (newMessage.trim()) {
                                respondToTicketMutation.mutate({
                                  ticketId: selectedTicket.id,
                                  message: newMessage
                                });
                              }
                            }}
                            disabled={!newMessage.trim() || respondToTicketMutation.isPending}
                          >
                            {respondToTicketMutation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="h-[calc(100vh-150px)] flex items-center justify-center">
                <div className="text-center p-6">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-medium mb-2">Nenhum ticket selecionado</h3>
                  <p className="text-muted-foreground">
                    Selecione um ticket na lista à esquerda para visualizar os detalhes.
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}