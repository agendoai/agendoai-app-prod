import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminLayout from "@/components/layout/admin-layout";
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
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  AlertCircle, 
  Edit, 
  Plus, 
  Trash, 
  Package, 
  Scissors, 
  Car, 
  Heart, 
  Home, 
  Briefcase, 
  Camera, 
  Music, 
  Utensils, 
  Dumbbell,
  Palette,
  BookOpen,
  Zap,
  Star,
  TrendingUp,
  Users,
  FolderOpen
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Definindo interface Category
interface Category {
  id: number;
  name: string;
  description?: string | null;
  icon?: string | null;
  color?: string | null;
  parentId?: number | null;
}

// Schema para validação do formulário
const categoryFormSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
});

type CategoryFormValues = z.infer<typeof categoryFormSchema>;

// Função para obter ícone baseado no nome
const getCategoryIcon = (iconName: string) => {
  const iconMap: { [key: string]: any } = {
    scissors: Scissors,
    car: Car,
    heart: Heart,
    home: Home,
    briefcase: Briefcase,
    camera: Camera,
    music: Music,
    utensils: Utensils,
    dumbbell: Dumbbell,
    palette: Palette,
    book: BookOpen,
    zap: Zap,
    star: Star,
    trending: TrendingUp,
    users: Users,
    folder: FolderOpen,
    default: Package
  };
  
  return iconMap[iconName?.toLowerCase()] || iconMap.default;
};

export default function CategoriesPage() {
  const { toast } = useToast();
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);

  // Buscar categorias
  const { data: categories, isLoading, error } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/categories');
        return await response.json();
      } catch (error) {
        console.error('Erro ao carregar categorias:', error);
        return [];
      }
    }
  });

  // Formulário para adicionar/editar categoria
  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(categoryFormSchema),
    defaultValues: {
      name: "",
      description: "",
      icon: "category",
      color: "#3B82F6",
    },
  });

  // Reset do formulário quando mudar a categoria em edição
  useEffect(() => {
    if (editingCategory) {
      form.reset({
        name: editingCategory.name,
        description: editingCategory.description || "",
        icon: editingCategory.icon || "category",
        color: editingCategory.color || "#3B82F6",
      });
    } else {
      form.reset({
        name: "",
        description: "",
        icon: "category",
        color: "#3B82F6",
      });
    }
  }, [editingCategory, form]);

  // Mutation para criar categoria
  const createCategoryMutation = useMutation({
    mutationFn: async (data: CategoryFormValues) => {
      const res = await apiRequest("POST", "/api/admin/categories", data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoria criada",
        description: "A categoria foi criada com sucesso.",
      });
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar categoria
  const updateCategoryMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CategoryFormValues }) => {
      const res = await apiRequest("PUT", `/api/admin/categories/${id}`, data);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoria atualizada",
        description: "A categoria foi atualizada com sucesso.",
      });
      setEditingCategory(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir categoria
  const deleteCategoryMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/admin/categories/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao excluir categoria");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/categories"] });
      toast({
        title: "Categoria excluída",
        description: "A categoria foi excluída com sucesso.",
      });
      setIsDeleteDialogOpen(false);
      setCategoryToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir categoria",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CategoryFormValues) => {
    if (editingCategory) {
      updateCategoryMutation.mutate({ id: editingCategory.id, data });
    } else {
      createCategoryMutation.mutate(data);
    }
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    form.reset({
      name: category.name,
      description: category.description || "",
      icon: category.icon || "category",
      color: category.color || "#3B82F6",
    });
  };

  const handleDeleteCategory = (category: Category) => {
    setCategoryToDelete(category);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteCategory = () => {
    if (categoryToDelete) {
      deleteCategoryMutation.mutate(categoryToDelete.id);
    }
  };

  const cancelEdit = () => {
    setEditingCategory(null);
    form.reset({
      name: "",
      description: "",
      icon: "category",
      color: "#3B82F6",
    });
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
        {/* Header da Página */}
        <div className="bg-white border-b border-blue-100 shadow-sm">
          <div className="container mx-auto py-8 px-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl">
                    <Package className="h-8 w-8 text-white" />
                  </div>
                  Gerenciar Categorias & Nichos
                </h1>
                <p className="text-gray-600 mt-2">
                  Organize e gerencie todos os nichos de mercado da plataforma
                </p>
              </div>
              {/* Botão de adicionar categoria */}
              <div className="flex gap-4 items-center">
                <Button
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-3 rounded-xl shadow flex items-center gap-2"
                  onClick={() => { setEditingCategory(null); setShowCategoryDialog(true); }}
                >
                  <Plus className="h-5 w-5" /> Adicionar Categoria
                </Button>
                {/* Estatísticas */}
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {categories ? categories.length : 0}
                  </div>
                  <div className="text-sm text-gray-500">Total de Categorias</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {categories ? categories.filter(c => c.description).length : 0}
                  </div>
                  <div className="text-sm text-gray-500">Com Descrição</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Dialog de criar/editar categoria */}
        <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                {editingCategory ? <Edit className="h-5 w-5 text-blue-500" /> : <Plus className="h-5 w-5 text-green-500" />}
                {editingCategory ? "Editar Nicho/Categoria" : "Nova Categoria"}
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                {editingCategory
                  ? "Atualize os detalhes do nicho/categoria."
                  : "Crie um novo nicho/categoria para serviços."}
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-blue-800">Nome do Nicho/Categoria *</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Beleza e Estética" {...field} className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-blue-800">Descrição</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descreva este nicho de mercado..."
                          {...field}
                          rows={3}
                          className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="icon"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-blue-800">Ícone *</FormLabel>
                      <FormControl>
                        <Input placeholder="Selecione um ícone" {...field} className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                      </FormControl>
                      <FormDescription>
                        Nome do ícone para exibição (ex: 'scissors', 'car', 'pet')
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-semibold text-blue-800">Cor</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl>
                          <Input type="color" {...field} className="w-10 h-10 rounded-full border-2 border-blue-200" />
                        </FormControl>
                        <Input
                          placeholder="Código da cor"
                          value={field.value}
                          onChange={field.onChange}
                          className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 w-28"
                        />
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end gap-2 pt-2">
                  {editingCategory && (
                    <Button type="button" variant="outline" onClick={cancelEdit} className="rounded-lg">Cancelar</Button>
                  )}
                  <Button type="submit" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold px-6 py-2 rounded-lg shadow">
                    {editingCategory ? "Salvar Alterações" : "Criar Categoria"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        <div className="container mx-auto py-8 px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Lista de Categorias */}
            <div className="lg:col-span-2">
              <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-blue-900 flex items-center gap-2">
                    <Package className="h-6 w-6 text-blue-500" /> Categorias & Nichos
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Gerencie todos os nichos e categorias disponíveis na plataforma.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {error ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Erro</AlertTitle>
                      <AlertDescription>
                        Ocorreu um erro ao carregar as categorias.
                      </AlertDescription>
                    </Alert>
                  ) : isLoading ? (
                    <div className="text-center py-12">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                      <p className="text-gray-600">Carregando categorias...</p>
                    </div>
                  ) : categories && categories.length > 0 ? (
                    <Table className="rounded-xl overflow-hidden shadow-md">
                      <TableHeader className="bg-gradient-to-r from-blue-100 to-indigo-100">
                        <TableRow>
                          <TableHead className="text-blue-900 font-bold">Nome</TableHead>
                          <TableHead className="text-blue-900 font-bold">Descrição</TableHead>
                          <TableHead className="text-blue-900 font-bold">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {categories.map((category: Category) => {
                          const IconComponent = getCategoryIcon(category.icon || 'default');
                          return (
                            <TableRow key={category.id} className="hover:bg-blue-50 transition-all">
                              <TableCell className="font-medium">
                                <div className="flex items-center">
                                  <div
                                    className="w-8 h-8 rounded-full mr-3 flex items-center justify-center border-2 border-blue-200 shadow-lg"
                                    style={{ backgroundColor: category.color || "#3B82F6" }}
                                  >
                                    <IconComponent className="h-4 w-4 text-white" />
                                  </div>
                                  <span className="text-blue-900 font-semibold">{category.name}</span>
                                </div>
                              </TableCell>
                              <TableCell className="text-sm text-gray-600">
                                {category.description || "Sem descrição"}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center space-x-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleEditCategory(category)}
                                    className="hover:bg-blue-100"
                                  >
                                    <Edit className="h-4 w-4 text-blue-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleDeleteCategory(category)}
                                    className="hover:bg-red-100"
                                  >
                                    <Trash className="h-4 w-4 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  ) : (
                    <div className="text-center py-16">
                      <div className="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <Package className="h-12 w-12 text-blue-500" />
                      </div>
                      <h3 className="text-xl font-semibold text-gray-900 mb-2">Nenhuma categoria encontrada</h3>
                      <p className="text-gray-600 mb-6">Comece criando sua primeira categoria para organizar os serviços.</p>
                      <Button
                        onClick={() => {
                          setEditingCategory(null);
                          form.reset();
                        }}
                        className="bg-blue-600 hover:bg-blue-700 rounded-lg"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Primeira Categoria
                      </Button>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-between items-center bg-gradient-to-r from-blue-50 to-indigo-50 rounded-b-xl">
                  <div className="text-sm text-gray-600">
                    Total: {categories ? categories.length : 0} categorias
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-lg border-blue-200 hover:bg-blue-100"
                    onClick={() => {
                      setEditingCategory(null);
                      form.reset();
                    }}
                  >
                    <Plus className="h-4 w-4 mr-1 text-blue-600" />
                    Nova Categoria
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
        </div>

        {/* Dialog de confirmação de exclusão */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="backdrop-blur-md backdrop:bg-blue-100/60 border-0 shadow-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-red-700 flex items-center gap-2">
                <Trash className="h-5 w-5 text-red-500" /> Excluir Nicho/Categoria
              </DialogTitle>
              <DialogDescription className="text-gray-700">
                Tem certeza que deseja excluir a categoria &quot;<span className="font-semibold text-red-700">{categoryToDelete?.name}</span>&quot;? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                className="rounded-lg border-blue-200 hover:bg-blue-100"
                onClick={() => setIsDeleteDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="rounded-lg font-semibold shadow-md bg-red-600 hover:bg-red-700"
                onClick={confirmDeleteCategory}
                disabled={deleteCategoryMutation.isPending}
              >
                {deleteCategoryMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}