import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminLayout from "@/components/layout/admin-layout";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Promotion } from "@/components/promotions-carousel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  Tag,
  Percent,
  CalendarClock,
  ArrowLeft,
  TrendingUp,
  Gift,
  Target,
  Users,
  Clock,
  AlertCircle
} from "lucide-react";
import PromotionForm from "@/components/admin/promotion-form";

export default function PromotionsManagementPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);

  // Buscar promoções
  const {
    data: promotions = [],
    isLoading,
    isError,
  } = useQuery<Promotion[]>({
    queryKey: ["/api/admin/promotions"],
  });

  // Buscar dados para o formulário
  const { data: niches = [] } = useQuery<any[]>({
    queryKey: ["/api/niches"],
  });

  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ["/api/categories"],
  });

  const { data: services = [] } = useQuery<any[]>({
    queryKey: ["/api/service-templates"],
  });

  const { data: providers = [] } = useQuery<any[]>({
    queryKey: ["/api/providers"],
  });

  // Criar promoção
  const createPromotion = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/admin/promotions", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions/active"] });
      setIsAddDialogOpen(false);
      toast({
        title: "Promoção criada",
        description: "A promoção foi criada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar promoção",
        description: error.message || "Ocorreu um erro ao criar a promoção.",
        variant: "destructive",
      });
    },
  });

  // Atualizar promoção
  const updatePromotion = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const response = await apiRequest("PATCH", `/api/admin/promotions/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions/active"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Promoção atualizada",
        description: "A promoção foi atualizada com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar promoção",
        description: error.message || "Ocorreu um erro ao atualizar a promoção.",
        variant: "destructive",
      });
    },
  });

  // Excluir promoção
  const deletePromotion = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/admin/promotions/${id}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions/active"] });
      setIsDeleteDialogOpen(false);
      toast({
        title: "Promoção excluída",
        description: "A promoção foi excluída com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao excluir promoção",
        description: error.message || "Ocorreu um erro ao excluir a promoção.",
        variant: "destructive",
      });
    },
  });

  // Ativar/desativar promoção
  const togglePromotionStatus = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("PATCH", `/api/admin/promotions/${id}/toggle-status`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/promotions"] });
      queryClient.invalidateQueries({ queryKey: ["/api/promotions/active"] });
      toast({
        title: "Status atualizado",
        description: "O status da promoção foi atualizado com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message || "Ocorreu um erro ao atualizar o status da promoção.",
        variant: "destructive",
      });
    },
  });

  // Funções de manipulação
  const handleAddPromotion = () => {
    setIsAddDialogOpen(true);
  };

  const handleEditPromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsEditDialogOpen(true);
  };

  const handleDeletePromotion = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setIsDeleteDialogOpen(true);
  };

  const handleToggleStatus = (id: number) => {
    togglePromotionStatus.mutate(id);
  };

  // Calcular estatísticas
  const activePromotions = promotions.filter(p => p.isActive && new Date(p.endDate) > new Date());
  const expiredPromotions = promotions.filter(p => new Date(p.endDate) < new Date());
  const futurePromotions = promotions.filter(p => new Date(p.startDate) > new Date());

  // Renderizar promoções
  const renderPromotions = () => {
    if (isLoading) {
      return (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-white rounded-lg p-4 shadow-sm">
              <div className="flex items-center space-x-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            </div>
          ))}
        </div>
      );
    }

    if (isError) {
      return (
        <div className="text-center py-12">
          <div className="flex flex-col items-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <p className="text-red-600 font-semibold">Erro ao carregar promoções</p>
            <p className="text-gray-600 text-sm">Tente novamente mais tarde.</p>
          </div>
        </div>
      );
    }

    if (promotions.length === 0) {
      return (
        <div className="text-center py-16">
          <div className="flex flex-col items-center">
            <div className="w-24 h-24 bg-gradient-to-r from-orange-100 to-red-100 rounded-full flex items-center justify-center mb-6">
              <Gift className="h-12 w-12 text-orange-500" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma promoção encontrada</h3>
            <p className="text-gray-600 mb-6 max-w-md text-center px-4">
              Comece criando sua primeira promoção para atrair mais clientes e aumentar as vendas.
            </p>
            <Button 
              onClick={handleAddPromotion}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg"
            >
              <Plus className="h-4 w-4 mr-2" />
              Criar Primeira Promoção
            </Button>
          </div>
        </div>
      );
    }

    return promotions.map((promotion) => {
      const now = new Date();
      const startDate = new Date(promotion.startDate);
      const endDate = new Date(promotion.endDate);
      const isExpired = endDate < now;
      const isFuture = startDate > now;
      const isActive = promotion.isActive && !isExpired && !isFuture;

      return (
        <div key={promotion.id} className="bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-all border border-gray-100">
          {/* Header da promoção */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center space-x-3 flex-1 min-w-0">
              <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Gift className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-gray-900 truncate">{promotion.title}</h3>
                <p className="text-sm text-gray-600 line-clamp-2">{promotion.description}</p>
              </div>
            </div>
            
            {/* Status Badge */}
            <div className="ml-2 flex-shrink-0">
              {isExpired ? (
                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-0 text-xs">
                  <Clock className="h-3 w-3 mr-1" />
                  Expirado
                </Badge>
              ) : isFuture ? (
                <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-0 text-xs">
                  <CalendarClock className="h-3 w-3 mr-1" />
                  Programado
                </Badge>
              ) : promotion.isActive ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-0 text-xs">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Ativo
                </Badge>
              ) : (
                <Badge className="bg-gray-100 text-gray-700 hover:bg-gray-200 border-0 text-xs">
                  <EyeOff className="h-3 w-3 mr-1" />
                  Inativo
                </Badge>
              )}
            </div>
          </div>

          {/* Detalhes da promoção */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {/* Desconto */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                {promotion.discountPercentage ? (
                  <Percent className="h-3 w-3 text-green-600" />
                ) : (
                  <Tag className="h-3 w-3 text-green-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Desconto</p>
                <p className="font-semibold text-green-700 text-sm">
                  {promotion.discountPercentage 
                    ? `${promotion.discountPercentage}%` 
                    : promotion.discountValue 
                    ? `R$ ${(promotion.discountValue / 100).toFixed(2)}`
                    : 'N/A'
                  }
                </p>
              </div>
            </div>

            {/* Período */}
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                <CalendarClock className="h-3 w-3 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500">Período</p>
                <p className="font-medium text-gray-900 text-sm">
                  {new Date(promotion.startDate).toLocaleDateString("pt-BR")} - {new Date(promotion.endDate).toLocaleDateString("pt-BR")}
                </p>
              </div>
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-100">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleStatus(promotion.id)}
              disabled={isExpired}
              title={promotion.isActive ? "Desativar" : "Ativar"}
              className="h-8 px-2 hover:bg-blue-100 text-blue-600"
            >
              {promotion.isActive ? (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Desativar</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Ativar</span>
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleEditPromotion(promotion)}
              title="Editar"
              className="h-8 px-2 hover:bg-orange-100 text-orange-600"
            >
              <Pencil className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeletePromotion(promotion)}
              title="Excluir"
              className="h-8 px-2 hover:bg-red-100 text-red-600"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Excluir</span>
            </Button>
          </div>
        </div>
      );
    });
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-red-50">
        {/* Header da Página */}
        <div className="bg-white border-b border-orange-100 shadow-sm">
          <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setLocation("/admin/dashboard")}
                  className="mr-3 sm:mr-4 hover:bg-orange-100"
                >
                  <ArrowLeft className="h-5 w-5 text-orange-600" />
                </Button>
                <div>
                  <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                    <div className="p-1.5 sm:p-2 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl">
                      <Gift className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                    </div>
                    <span>Promoções</span>
                  </h1>
                  <p className="text-gray-600 mt-1 sm:mt-2 text-sm">
                    Crie e gerencie promoções para atrair clientes
                  </p>
                </div>
              </div>
              
              {/* Estatísticas */}
              <div className="flex gap-3 sm:gap-4 lg:gap-6">
                <div className="text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-orange-600">
                    {activePromotions.length}
                  </div>
                  <div className="text-xs text-gray-500">Ativas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                    {futurePromotions.length}
                  </div>
                  <div className="text-xs text-gray-500">Programadas</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl lg:text-2xl font-bold text-red-600">
                    {expiredPromotions.length}
                  </div>
                  <div className="text-xs text-gray-500">Expiradas</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6">
          <div className="space-y-6">
            {/* Cards de estatísticas */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-green-50 hover:shadow-xl transition-all">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-green-800 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Promoções Ativas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{activePromotions.length}</div>
                      <p className="text-xs text-gray-600 mt-1">
                        Promoções em andamento
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gradient-to-r from-green-500 to-emerald-600 rounded-full shadow-lg">
                      <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-blue-50 hover:shadow-xl transition-all">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-blue-800 flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    Programadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{futurePromotions.length}</div>
                      <p className="text-xs text-gray-600 mt-1">
                        Promoções futuras
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full shadow-lg">
                      <CalendarClock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-red-50 hover:shadow-xl transition-all sm:col-span-2 lg:col-span-1">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-semibold text-red-800 flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Expiradas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-2xl sm:text-3xl font-bold text-gray-900">{expiredPromotions.length}</div>
                      <p className="text-xs text-gray-600 mt-1">
                        Promoções encerradas
                      </p>
                    </div>
                    <div className="p-2 sm:p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-full shadow-lg">
                      <Clock className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Lista de promoções */}
            <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-orange-50">
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <CardTitle className="text-lg sm:text-xl font-bold text-orange-900 flex items-center gap-2">
                      <Gift className="h-5 w-5 sm:h-6 sm:w-6 text-orange-500" />
                      Lista de Promoções
                    </CardTitle>
                    <CardDescription className="text-gray-600 text-sm">
                      Gerencie todas as promoções e descontos disponíveis no sistema.
                    </CardDescription>
                  </div>
                  <Button 
                    onClick={handleAddPromotion}
                    className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 rounded-lg shadow-lg w-full sm:w-auto"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Promoção
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {renderPromotions()}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Dialog para adicionar promoção */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="backdrop-blur-md backdrop:bg-orange-100/60 border-0 shadow-2xl rounded-2xl max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold text-orange-900 flex items-center gap-2">
                <Plus className="h-5 w-5 text-orange-500" />
                Nova Promoção
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-sm">
                Crie uma nova promoção para ser exibida para os clientes.
              </DialogDescription>
            </DialogHeader>
            <PromotionForm
              onSubmit={(data) => createPromotion.mutate(data)}
              niches={niches}
              categories={categories}
              services={services}
              providers={providers}
              isLoading={createPromotion.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Dialog para editar promoção */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="backdrop-blur-md backdrop:bg-orange-100/60 border-0 shadow-2xl rounded-2xl max-w-4xl max-h-[90vh] overflow-y-auto mx-4">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold text-orange-900 flex items-center gap-2">
                <Pencil className="h-5 w-5 text-orange-500" />
                Editar Promoção
              </DialogTitle>
              <DialogDescription className="text-gray-600 text-sm">
                Atualize as informações da promoção.
              </DialogDescription>
            </DialogHeader>
            {selectedPromotion && (
              <PromotionForm
                promotion={selectedPromotion}
                onSubmit={(data) => updatePromotion.mutate({ id: selectedPromotion.id, data })}
                niches={niches}
                categories={categories}
                services={services}
                providers={providers}
                isLoading={updatePromotion.isPending}
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Dialog para confirmar exclusão */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="backdrop-blur-md backdrop:bg-red-100/60 border-0 shadow-2xl rounded-2xl mx-4">
            <DialogHeader>
              <DialogTitle className="text-lg sm:text-xl font-bold text-red-700 flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-500" />
                Excluir Promoção
              </DialogTitle>
              <DialogDescription className="text-gray-700 text-sm">
                Tem certeza que deseja excluir esta promoção? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <div className="border border-red-200 rounded-lg p-4 bg-red-50 mt-4">
              <p className="font-semibold text-red-900">{selectedPromotion?.title}</p>
              <p className="text-sm text-red-700 mt-1">
                {selectedPromotion?.description}
              </p>
            </div>
            <DialogFooter className="gap-2 flex-col sm:flex-row">
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="rounded-lg border-orange-200 hover:bg-orange-100 w-full sm:w-auto"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => selectedPromotion && deletePromotion.mutate(selectedPromotion.id)}
                disabled={deletePromotion.isPending}
                className="rounded-lg font-semibold shadow-md bg-red-600 hover:bg-red-700 w-full sm:w-auto"
              >
                {deletePromotion.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}