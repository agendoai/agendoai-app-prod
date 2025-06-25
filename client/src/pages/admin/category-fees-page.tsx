import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/layouts/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Edit2, Save, X } from "lucide-react";

interface CategoryFee {
  id: number;
  name: string;
  feePercent: number;
}

export default function CategoryFeesPage() {
  const { toast } = useToast();
  const [editingCategory, setEditingCategory] = useState<number | null>(null);
  const [editValue, setEditValue] = useState<string>("");

  // Buscar taxas de categorias (marketplace removido)
  const { data: categoryFees = [], isLoading = false } = useQuery<CategoryFee[]>({
    queryKey: ["/api/admin/category-fees"],
    refetchOnWindowFocus: false,
    enabled: false, // Desativado, pois o marketplace foi removido
  });

  // Mutação para atualizar taxa de categoria (marketplace removido)
  const updateFeeMutation = useMutation({
    mutationFn: async ({ categoryId, feePercent }: { categoryId: number, feePercent: number }) => {
      // Marketplace removido - função desativada
      toast({
        title: "Funcionalidade desativada",
        description: "O sistema de marketplace foi removido. Esta funcionalidade não está mais disponível.",
        variant: "destructive"
      });
      return null;
    },
    onSuccess: () => {
      toast({
        title: "Taxa atualizada",
        description: "A taxa da categoria foi atualizada com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/category-fees"] });
      setEditingCategory(null);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar taxa",
        description: error.message || "Ocorreu um erro ao atualizar a taxa da categoria.",
        variant: "destructive",
      });
    }
  });

  // Iniciar edição de categoria
  const startEdit = (category: CategoryFee) => {
    setEditingCategory(category.id);
    setEditValue(category.feePercent.toString());
  };

  // Cancelar edição
  const cancelEdit = () => {
    setEditingCategory(null);
    setEditValue("");
  };

  // Salvar edição
  const saveEdit = (categoryId: number) => {
    const feePercent = parseFloat(editValue);
    
    if (isNaN(feePercent) || feePercent < 0 || feePercent > 100) {
      toast({
        title: "Valor inválido",
        description: "A taxa deve ser um número entre 0 e 100.",
        variant: "destructive",
      });
      return;
    }
    
    updateFeeMutation.mutate({ categoryId, feePercent });
  };

  return (
    <AdminLayout>
      <div className="container py-6">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Gerenciar Taxas por Categoria</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Taxas de Comissão por Categoria</CardTitle>
            <CardDescription>
              Configure as taxas de comissão específicas para cada categoria.
              A taxa padrão da plataforma (10%) é aplicada quando não há uma taxa específica definida.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Taxa (%)</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categoryFees?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground py-6">
                        Nenhuma categoria encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    categoryFees?.map((category) => (
                      <TableRow key={category.id}>
                        <TableCell className="font-medium">{category.name}</TableCell>
                        <TableCell>
                          {editingCategory === category.id ? (
                            <Input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="w-24"
                            />
                          ) : (
                            <span>{category.feePercent}%</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingCategory === category.id ? (
                            <div className="flex items-center space-x-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => saveEdit(category.id)}
                                disabled={updateFeeMutation.isPending}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={cancelEdit}
                                disabled={updateFeeMutation.isPending}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => startEdit(category)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}