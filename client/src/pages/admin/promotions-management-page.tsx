import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import AdminHeader from "../../components/layout/admin-header";
import { PageTransition } from "@/components/ui/page-transition";
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

  // Renderizar promoções
  const renderPromotions = () => {
    if (isLoading) {
      return (
        <TableRow>
          <TableCell colSpan={6}>
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </TableCell>
        </TableRow>
      );
    }

    if (isError) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center py-4 text-red-500">
            Erro ao carregar promoções. Tente novamente.
          </TableCell>
        </TableRow>
      );
    }

    if (promotions.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="text-center py-8 text-neutral-500">
            Nenhuma promoção encontrada. Clique em "Adicionar Promoção" para criar uma nova.
          </TableCell>
        </TableRow>
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
        <TableRow key={promotion.id}>
          <TableCell>
            <div className="font-medium">{promotion.title}</div>
            <div className="text-sm text-muted-foreground line-clamp-1">
              {promotion.description}
            </div>
          </TableCell>
          <TableCell>
            {promotion.discountPercentage ? (
              <div className="flex items-center">
                <Percent className="h-4 w-4 mr-1 text-green-600" />
                <span>{promotion.discountPercentage}%</span>
              </div>
            ) : promotion.discountValue ? (
              <div className="flex items-center">
                <Tag className="h-4 w-4 mr-1 text-green-600" />
                <span>R$ {(promotion.discountValue / 100).toFixed(2)}</span>
              </div>
            ) : (
              "-"
            )}
          </TableCell>
          <TableCell>
            <div className="flex items-center">
              <CalendarClock className="h-4 w-4 mr-1 text-muted-foreground" />
              <span className="text-xs">
                {new Date(promotion.startDate).toLocaleDateString("pt-BR")} a{" "}
                {new Date(promotion.endDate).toLocaleDateString("pt-BR")}
              </span>
            </div>
          </TableCell>
          <TableCell>
            {isExpired ? (
              <Badge variant="destructive">Expirado</Badge>
            ) : isFuture ? (
              <Badge variant="outline">Programado</Badge>
            ) : promotion.isActive ? (
              <Badge variant="success">Ativo</Badge>
            ) : (
              <Badge variant="secondary">Inativo</Badge>
            )}
          </TableCell>
          <TableCell>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggleStatus(promotion.id)}
                disabled={isExpired}
                title={promotion.isActive ? "Desativar" : "Ativar"}
              >
                {promotion.isActive ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleEditPromotion(promotion)}
                title="Editar"
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeletePromotion(promotion)}
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </TableCell>
        </TableRow>
      );
    });
  };

  return (
    <div className="min-h-screen">
      <AdminHeader title="Gerenciar Promoções" />

      <PageTransition>
        <div className="container mx-auto py-6 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Promoções e Descontos</h1>
              <p className="text-muted-foreground">
                Gerencie as promoções e descontos exibidos para os clientes.
              </p>
            </div>
            <Button onClick={handleAddPromotion}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Promoção
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Lista de Promoções</CardTitle>
              <CardDescription>
                Todas as promoções e descontos disponíveis no sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[300px]">Promoção</TableHead>
                    <TableHead>Desconto</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderPromotions()}</TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </PageTransition>

      {/* Dialog para adicionar promoção */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-3xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Adicionar Nova Promoção</DialogTitle>
            <DialogDescription>
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
        <DialogContent className="max-w-3xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Promoção</DialogTitle>
            <DialogDescription>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Promoção</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir esta promoção?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-muted/50 mt-4">
            <p className="font-medium">{selectedPromotion?.title}</p>
            <p className="text-sm text-muted-foreground">
              {selectedPromotion?.description}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedPromotion && deletePromotion.mutate(selectedPromotion.id)}
              disabled={deletePromotion.isPending}
            >
              {deletePromotion.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}