import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import {
  ArrowLeft,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  Search,
  Filter,
  RefreshCw,
  Calendar,
  CalendarDays
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogOverlay,
} from "@/components/ui/alert-dialog";
import AdminLayout from "@/components/layout/admin-layout";

// Interface para as solicitações de saque
interface WithdrawalRequest {
  id: number;
  amount: number;
  status: string;
  paymentMethod: string;
  providerInfo: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  pixInfo: {
    pixKey: string;
    pixKeyType: string;
  };
  requestedAt: string;
  processedAt: string | null;
  transactionId: string | null;
  notes: string | null;
}

export default function WithdrawalRequestsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [selectedDate, setSelectedDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequest | null>(null);
  const [showUpdateDialog, setShowUpdateDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [notes, setNotes] = useState("");

  // Consultar solicitações de saque
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/withdrawals", currentPage],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", `/api/admin/withdrawals?page=${currentPage}&limit=10`);
        return await res.json();
      } catch (error) {
        
        return { withdrawals: [], total: 0, page: 1, totalPages: 1 };
      }
    }
  });

  const withdrawals = data?.withdrawals || [];
  const totalPages = data?.totalPages || 1;
  const totalItems = data?.total || 0;

  // Mutação para atualizar status de saque
  const updateWithdrawalMutation = useMutation({
    mutationFn: async (updateData: { 
      id: number; 
      status: string; 
      transactionId?: string; 
      notes?: string 
    }) => {
      const res = await apiRequest("PUT", `/api/admin/withdrawals/${updateData.id}`, {
        status: updateData.status,
        transactionId: updateData.transactionId,
        notes: updateData.notes
      });
      
      if (!res.ok) {
        throw new Error("Falha ao atualizar status do saque");
      }
      
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sucesso",
        description: "Status do saque atualizado com sucesso",
      });
      refetch();
      setShowUpdateDialog(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao atualizar status do saque",
        variant: "destructive",
      });
    },
  });

  const handleUpdateStatus = async () => {
    if (!selectedWithdrawal || !newStatus) return;
    
    // Atualizar status do saque
    updateWithdrawalMutation.mutate({
      id: selectedWithdrawal.id,
      status: newStatus,
      transactionId: transactionId || undefined,
      notes: notes || undefined
    });

    // Se o status for 'concluido', criar notificação para o prestador
    if (newStatus === 'concluido' || newStatus === 'completed') {
      try {
        await apiRequest("POST", "/api/notifications", {
          userId: selectedWithdrawal.providerInfo.id,
          title: "Saque Concluído",
          message: `Seu saque de R$ ${selectedWithdrawal.amount.toFixed(2)} foi processado com sucesso.`,
          type: "withdrawal_completed"
        });
      } catch (error) {
        
        // Não bloquear o fluxo principal se a notificação falhar
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="mr-1 h-3 w-3" />
          Concluído
        </span>;
      case "pending":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          <Clock className="mr-1 h-3 w-3" />
          Pendente
        </span>;
      case "processing":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
          <AlertCircle className="mr-1 h-3 w-3" />
          Processando
        </span>;
      case "failed":
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <XCircle className="mr-1 h-3 w-3" />
          Falhou
        </span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          {status}
        </span>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredWithdrawals = withdrawals.filter((withdrawal: WithdrawalRequest) => {
    const matchesSearch = 
      withdrawal.providerInfo?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.providerInfo?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      withdrawal.pixInfo?.pixKey?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || withdrawal.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter !== "all" && selectedDate) {
      const withdrawalDate = new Date(withdrawal.requestedAt).toISOString().split('T')[0];
      matchesDate = withdrawalDate === selectedDate;
    }
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  return (
    <AdminLayout>
      <div className="container mx-auto px-3 py-4 sm:px-6 sm:py-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-3 gap-2">
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setLocation("/admin/dashboard")}
              className="flex items-center px-1.5 py-1"
            >
              <ArrowLeft className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline text-xs">Voltar</span>
            </Button>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900">Solicitações de Saque</h1>
              <p className="text-xs text-gray-600 hidden sm:block">Gerencie todas as solicitações de saque dos prestadores</p>
            </div>
          </div>
        </div>

        <Card className="mb-3 shadow-sm bg-white rounded-lg">
          <CardHeader className="pb-2 px-3 sm:px-4">
            <CardTitle className="flex items-center text-sm sm:text-base text-gray-800">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-blue-600" />
              Filtros de Busca
            </CardTitle>
          </CardHeader>
          <CardContent className="px-3 sm:px-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2 h-3.5 w-3.5 text-gray-400" />
                <Input
                  placeholder="Buscar por nome, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 h-8 text-xs border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                />
              </div>
              
              <div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="h-8 text-xs border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os Status</SelectItem>
                    <SelectItem value="pending">Pendente</SelectItem>
                    <SelectItem value="processing">Processando</SelectItem>
                    <SelectItem value="completed">Concluído</SelectItem>
                    <SelectItem value="failed">Falhou</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Select value={dateFilter} onValueChange={(value) => {
                  setDateFilter(value);
                  if (value === "today") {
                    setSelectedDate(new Date().toISOString().split('T')[0]);
                  } else if (value === "all") {
                    setSelectedDate("");
                  }
                }}>
                  <SelectTrigger className="h-8 text-xs border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg">
                    <Calendar className="h-3.5 w-3.5 mr-1.5" />
                    <SelectValue placeholder="Data" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Datas</SelectItem>
                    <SelectItem value="today">Hoje</SelectItem>
                    <SelectItem value="custom">Data Específica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {dateFilter === "custom" && (
                <div>
                  <Input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="h-8 text-xs border-gray-200 focus:border-blue-500 focus:ring-blue-500 rounded-lg"
                  />
                </div>
              )}
              
              <div className={dateFilter === "custom" ? "" : "lg:col-start-4"}>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setStatusFilter("all");
                    setDateFilter("all");
                    setSelectedDate("");
                  }}
                  className="w-full h-8 text-xs border-gray-200 hover:bg-gray-50 rounded-lg"
                >
                  <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                  <span className="hidden sm:inline">Limpar Filtros</span>
                  <span className="sm:hidden">Limpar</span>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex justify-center items-center h-32 bg-white rounded-lg shadow-sm">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <>
            <Card className="shadow-sm bg-white rounded-xl">
              <CardHeader className="pb-3 px-4 sm:px-6 bg-gradient-to-r from-blue-50/50 to-indigo-50/50 rounded-t-xl">
                <CardTitle className="text-base sm:text-lg text-gray-800 font-medium">Solicitações de Saque</CardTitle>
                <CardDescription className="text-sm text-gray-600">
                  {totalItems} solicitações encontradas
                </CardDescription>
              </CardHeader>
              <CardContent className="px-4 sm:px-6">
                {filteredWithdrawals.length > 0 ? (
                  <div className="space-y-3">
                    {filteredWithdrawals.map((withdrawal: WithdrawalRequest) => (
                      <Card key={withdrawal.id} className="hover:shadow-md transition-all duration-200 bg-gradient-to-r from-white to-gray-50/30 rounded-lg">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col gap-4">
                            <div className="flex-1">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <h3 className="text-base font-medium text-gray-900 truncate">
                                  {withdrawal.providerInfo?.name || "Nome não disponível"}
                                </h3>
                                {getStatusBadge(withdrawal.status)}
                              </div>
                              
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 p-2 rounded-lg">
                                  <p className="text-blue-700 text-xs font-medium mb-0.5">Valor Solicitado</p>
                                  <p className="font-semibold text-blue-900 text-sm">{formatCurrency(withdrawal.amount)}</p>
                                </div>
                                
                                <div className="bg-gradient-to-r from-green-50 to-green-100/50 p-2 rounded-lg">
                                  <p className="text-green-700 text-xs font-medium mb-0.5">Data da Solicitação</p>
                                  <p className="font-semibold text-green-900 text-xs">{formatDate(withdrawal.requestedAt)}</p>
                                </div>
                                
                                <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 p-2 rounded-lg sm:col-span-2 lg:col-span-1">
                                  <p className="text-purple-700 text-xs font-medium mb-0.5">Chave PIX</p>
                                  <p className="font-semibold text-purple-900 text-xs truncate">{withdrawal.pixInfo?.pixKey || "Não informado"}</p>
                                </div>
                              </div>
                              
                              {withdrawal.notes && (
                                <div className="mt-2 bg-gradient-to-r from-amber-50 to-orange-50/50 p-2 rounded-lg">
                                  <p className="text-amber-700 text-xs font-medium mb-0.5">Observações</p>
                                  <p className="text-xs text-amber-800">{withdrawal.notes}</p>
                                </div>
                              )}
                              
                              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                <div className="bg-gradient-to-r from-slate-50 to-gray-100/50 p-2 rounded-lg">
                                  <p className="text-slate-600 font-medium text-xs mb-0.5">Email do Prestador</p>
                                  <p className="text-slate-800 truncate text-xs">{withdrawal.providerInfo?.email || "Não informado"}</p>
                                </div>
                                <div className="bg-gradient-to-r from-slate-50 to-gray-100/50 p-2 rounded-lg">
                                  <p className="text-slate-600 font-medium text-xs mb-0.5">Telefone</p>
                                  <p className="text-slate-800 text-xs">{withdrawal.providerInfo?.phone || "Não informado"}</p>
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex justify-end pt-1">
                              <Button
                                variant="default"
                                size="sm"
                                onClick={() => {
                                  setSelectedWithdrawal(withdrawal);
                                  setNewStatus(withdrawal.status);
                                  setTransactionId(withdrawal.transactionId || "");
                                  setNotes(withdrawal.notes || "");
                                  setShowUpdateDialog(true);
                                }}
                                className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200"
                              >
                                <span className="hidden sm:inline">Atualizar Status</span>
                                <span className="sm:hidden">Atualizar</span>
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gradient-to-r from-gray-50/50 to-blue-50/30 rounded-lg">
                    <div className="bg-white p-3 rounded-full w-12 h-12 mx-auto mb-3 shadow-sm">
                      <DollarSign className="mx-auto h-6 w-6 text-gray-400" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900 mb-1.5">Nenhuma solicitação encontrada</h3>
                    <p className="text-xs text-gray-600 px-3 max-w-sm mx-auto">
                      {searchTerm || statusFilter !== "all" || dateFilter !== "all"
                        ? "Nenhuma solicitação corresponde aos filtros aplicados" 
                        : "Não há solicitações de saque no momento"}
                    </p>
                  </div>
                )}
              </CardContent>
              
              {totalPages > 1 && (
                <CardFooter className="flex flex-col sm:flex-row justify-between items-center bg-gray-50/50 rounded-b-lg pt-3 px-3 sm:px-4 gap-2">
                  <div className="text-xs text-gray-600">
                    Página {currentPage} de {totalPages} • {totalItems} solicitações
                  </div>
                  <div className="flex space-x-1.5">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                      className="text-xs px-2.5 py-1.5 border-gray-200 hover:bg-white rounded-lg"
                    >
                      <span className="hidden sm:inline">Anterior</span>
                      <span className="sm:hidden">Ant</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="text-xs px-2.5 py-1.5 border-gray-200 hover:bg-white rounded-lg"
                    >
                      <span className="hidden sm:inline">Próxima</span>
                      <span className="sm:hidden">Prox</span>
                    </Button>
                  </div>
                </CardFooter>
              )}
            </Card>
          </>
        )}
      </div>

      {/* Dialog para atualizar status */}
      <AlertDialog open={showUpdateDialog} onOpenChange={setShowUpdateDialog}>
        <AlertDialogOverlay className="bg-transparent" />
        <AlertDialogContent className="max-w-xs mx-3 sm:max-w-sm rounded-lg border-0 shadow-xl bg-white z-[9999] fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" style={{zIndex: 9999}}>
          <AlertDialogHeader className="pb-2">
            <AlertDialogTitle className="text-sm font-medium text-gray-900">Atualizar Status</AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-gray-600">
              Solicitação de {selectedWithdrawal?.providerInfo?.name || "prestador"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-2 py-1">
            <div>
              <Label htmlFor="status" className="text-xs font-medium text-gray-700 mb-1 block">Status</Label>
              <Select value={newStatus} onValueChange={setNewStatus}>
                <SelectTrigger id="status" className="h-7 text-xs bg-white border-0 focus:border-0 focus:ring-0 shadow-sm">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent className="bg-white border-0 shadow-lg z-[10000]">
                  <SelectItem value="pending" className="text-xs bg-white hover:bg-gray-50">Pendente</SelectItem>
                  <SelectItem value="processing" className="text-xs bg-white hover:bg-gray-50">Processando</SelectItem>
                  <SelectItem value="completed" className="text-xs bg-white hover:bg-gray-50">Concluído</SelectItem>
                  <SelectItem value="failed" className="text-xs bg-white hover:bg-gray-50">Falhou</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="transactionId" className="text-xs font-medium text-gray-700 mb-1 block">ID Transação</Label>
              <Input
                id="transactionId"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                placeholder="Digite o ID da transação"
                className="h-7 text-xs bg-white border-0 focus:border-0 focus:ring-0 shadow-sm"
              />
            </div>
            
            <div>
              <Label htmlFor="notes" className="text-xs font-medium text-gray-700 mb-1 block">Observações</Label>
              <Input
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Adicione observações (opcional)"
                className="h-7 text-xs bg-white border-0 focus:border-0 focus:ring-0 shadow-sm"
              />
            </div>
          </div>
          
          <AlertDialogFooter className="gap-1.5 pt-2">
            <AlertDialogCancel className="text-xs px-2 py-1 bg-white border-0 hover:bg-gray-50 shadow-sm">Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleUpdateStatus}
              disabled={updateWithdrawalMutation.isPending}
              className="text-xs px-2 py-1 bg-blue-600 hover:bg-blue-700 shadow-sm"
            >
              {updateWithdrawalMutation.isPending ? (
                <span className="flex items-center">
                  <RefreshCw className="mr-1 h-3 w-3 animate-spin" />
                  <span className="hidden sm:inline">Atualizando...</span>
                  <span className="sm:hidden">...</span>
                </span>
              ) : (
                <span>
                  <span className="hidden sm:inline">Atualizar Status</span>
                  <span className="sm:hidden">Atualizar</span>
                </span>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}