import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import AdminNavbar from "@/components/layout/admin-navbar";
import AppHeader from "@/components/layout/app-header";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AlertCircle, Check, Edit, Plus, Trash } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ServiceCategory as Category, ServiceItem as Service } from "@/types";
import AdminLayout from "@/components/layout/admin-layout";

// Schema para validação do formulário
const serviceFormSchema = z.object({
  name: z.string().min(3, { message: "O nome deve ter pelo menos 3 caracteres" }),
  description: z.string().optional(),
  categoryId: z.string().min(1, { message: "Selecione uma categoria" }),
  duration: z.string().min(1, { message: "Informe a duração em minutos" }),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function ServicesPage() {
  const { toast } = useToast();
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);

  // Buscar serviços
  const { data: services, isLoading: isLoadingServices, error: servicesError } = useQuery({
    queryKey: ["/api/services"],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/services');
        return await response.json();
      } catch (error) {
        console.error('Erro ao carregar serviços:', error);
        return [];
      }
    }
  });

  // Buscar categorias para o select
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
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

  // Formulário para adicionar/editar serviço
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: "",
      description: "",
      categoryId: "",
      duration: "30",
    },
  });

  // Reset do formulário quando mudar o serviço em edição
  useEffect(() => {
    if (editingService) {
      form.reset({
        name: editingService.name,
        description: editingService.description || "",
        categoryId: String(editingService.categoryId),
        duration: String(editingService.duration),
      });
    } else {
      form.reset({
        name: "",
        description: "",
        categoryId: "",
        duration: "30",
      });
    }
  }, [editingService, form]);

  // Mutation para criar serviço
  const createServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiRequest("POST", "/api/services", {
        ...data,
        duration: parseInt(data.duration),
        categoryId: parseInt(data.categoryId),
        price: 0, // Preço zero como padrão
        isActive: true, // Garantir que o serviço seja criado como ativo
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Serviço criado",
        description: "O serviço foi criado com sucesso.",
      });
      form.reset({
        name: "",
        description: "",
        categoryId: "",
        duration: "30",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para atualizar serviço
  const updateServiceMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await apiRequest("PUT", `/api/services/${id}`, {
        ...data,
        duration: parseInt(data.duration),
        categoryId: parseInt(data.categoryId),
        // mantém o preço existente no serviço
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Serviço atualizado",
        description: "O serviço foi atualizado com sucesso.",
      });
      setEditingService(null);
      form.reset({
        name: "",
        description: "",
        categoryId: "",
        duration: "30",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutation para excluir serviço
  const deleteServiceMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await apiRequest("DELETE", `/api/services/${id}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Erro ao excluir serviço");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      toast({
        title: "Serviço excluído",
        description: "O serviço foi excluído com sucesso.",
      });
      setIsDeleteDialogOpen(false);
      setServiceToDelete(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ServiceFormValues) => {
    if (editingService) {
      updateServiceMutation.mutate({ id: editingService.id, data });
    } else {
      createServiceMutation.mutate(data);
    }
  };

  const handleEditService = (service: Service) => {
    setEditingService(service);
    form.reset({
      name: service.name,
      description: service.description || "",
      categoryId: String(service.categoryId),
      duration: String(service.duration),
    });
  };

  const handleDeleteService = (service: Service) => {
    setServiceToDelete(service);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteService = () => {
    if (serviceToDelete) {
      deleteServiceMutation.mutate(serviceToDelete.id);
    }
  };

  const cancelEdit = () => {
    setEditingService(null);
    form.reset({
      name: "",
      description: "",
      categoryId: "",
      duration: "30",
    });
  };

  // Função para encontrar o nome da categoria pelo ID
  const getCategoryName = (categoryId: number) => {
    if (!categories) return "Carregando...";
    const category = categories.find((cat: Category) => cat.id === categoryId);
    return category ? category.name : "Categoria não encontrada";
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 pb-20">
        {/* Header flutuante com ação */}
        <div className="sticky top-0 z-30 bg-gradient-to-r from-blue-100/80 to-indigo-100/80 backdrop-blur border-b border-blue-100 shadow-sm mb-8">
          <div className="container max-w-5xl mx-auto flex items-center justify-between py-4 px-4">
            <div className="flex items-center gap-3">
              <div className="bg-gradient-to-r from-blue-500 to-indigo-500 p-2 rounded-xl shadow-lg">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold text-blue-900">Gerenciar Serviços</h1>
            </div>
          </div>
        </div>
        <div className="container p-4 max-w-5xl">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Formulário */}
            <div className="md:col-span-1">
              <Card className="shadow-2xl border-2 border-blue-100 rounded-2xl bg-white relative overflow-hidden">
                <div className="absolute -top-4 -right-4 w-24 h-24 bg-gradient-to-br from-blue-100/60 to-indigo-100/40 rounded-full blur-2xl z-0" />
                <CardHeader className="relative z-10">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Plus className="h-6 w-6 text-blue-500" />
                    {editingService ? "Editar Tipo de Serviço" : "Novo Tipo de Serviço"}
                  </CardTitle>
                  <CardDescription>
                    {editingService
                      ? "Atualize os detalhes deste tipo de serviço"
                      : "Adicione um novo tipo de serviço que os prestadores poderão oferecer"}
                  </CardDescription>
                  <div className="mt-2 p-3 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl border border-blue-200 text-blue-700 text-sm">
                    <p><strong>Nota:</strong> Como administrador, você cadastra apenas os tipos de serviços disponíveis na plataforma. Os prestadores selecionarão quais destes serviços oferecem e definirão seus próprios preços e durações específicas.</p>
                  </div>
                </CardHeader>
                <CardContent className="relative z-10">
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome do Serviço</FormLabel>
                            <FormControl>
                              <Input placeholder="Ex: Corte de Cabelo" {...field} className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white" />
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
                            <FormLabel>Descrição</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Descrição do serviço"
                                {...field}
                                rows={3}
                                className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="categoryId"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Categoria</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white">
                                  <SelectValue placeholder="Selecione uma categoria" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent className="bg-white border-2 border-blue-100 shadow-xl rounded-lg">
                                {isLoadingCategories ? (
                                  <SelectItem value="loading" disabled>
                                    Carregando categorias...
                                  </SelectItem>
                                ) : categories && categories.length > 0 ? (
                                  categories.map((category: Category) => (
                                    <SelectItem
                                      key={category.id}
                                      value={String(category.id)}
                                    >
                                      <span className="inline-flex items-center gap-2"><span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{category.name}</span></span>
                                    </SelectItem>
                                  ))
                                ) : (
                                  <SelectItem value="empty" disabled>
                                    Nenhuma categoria disponível
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <div className="grid grid-cols-1 gap-4">
                        <FormField
                          control={form.control}
                          name="duration"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Duração de Referência (minutos)</FormLabel>
                              <FormControl>
                                <Input
                                  type="number"
                                  min="5"
                                  step="5"
                                  placeholder="30"
                                  {...field}
                                  className="rounded-lg border-blue-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 bg-white"
                                />
                              </FormControl>
                              <FormDescription>
                                Tempo estimado de referência. Cada prestador poderá definir sua própria duração.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>

                      <div className="flex justify-between pt-2">
                        {editingService && (
                          <Button type="button" variant="outline" onClick={cancelEdit} className="rounded-lg border-blue-200 hover:bg-blue-50">
                            Cancelar
                          </Button>
                        )}
                        <Button
                          type="submit"
                          disabled={
                            createServiceMutation.isPending ||
                            updateServiceMutation.isPending
                          }
                          className={`rounded-lg font-semibold shadow-md bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 px-8 py-2 text-base ${editingService ? "ml-auto" : "w-full"}`}
                        >
                          {editingService ? "Atualizar" : "Adicionar"} Serviço
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </div>

            {/* Lista de Serviços */}
            <div className="md:col-span-2">
              <Card className="shadow-2xl border-2 border-blue-100 rounded-2xl bg-white">
                <div className="absolute -top-4 -left-4 w-24 h-24 bg-gradient-to-br from-amber-100/60 to-yellow-100/40 rounded-full blur-2xl z-0" />
                <CardHeader>
                  <CardTitle>Tipos de Serviços Disponíveis</CardTitle>
                  <CardDescription>
                    Gerenciar os tipos de serviços que os prestadores poderão oferecer
                  </CardDescription>
                  <div className="mt-2 p-3 bg-gradient-to-r from-amber-100 to-yellow-50 rounded-xl border border-amber-200 text-amber-700 text-sm">
                    <p><strong>Lembre-se:</strong> Os preços mostrados abaixo são apenas valores de referência. Cada prestador pode definir seu próprio preço ao oferecer estes serviços.</p>
                  </div>
                </CardHeader>
                <CardContent>
                  {servicesError ? (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Erro</AlertTitle>
                      <AlertDescription>
                        Ocorreu um erro ao carregar os serviços.
                      </AlertDescription>
                    </Alert>
                  ) : isLoadingServices ? (
                    <div className="text-center py-6">Carregando serviços...</div>
                  ) : services && services.length > 0 ? (
                    <div className="space-y-4">
                      {services.map((service: Service, idx: number) => (
                        <div key={service.id} className={`rounded-xl border border-blue-100 shadow-md bg-white p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 transition-all ${idx % 2 === 0 ? "" : "bg-blue-50"}`}>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-3 mb-2">
                              <span className="text-lg font-bold text-blue-900 truncate">{service.name}</span>
                              <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{getCategoryName(service.categoryId)}</span>
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                              <span><strong>Duração:</strong> {service.duration} min</span>
                              <span><strong>Preço:</strong> {service.price === 0 ? <span className="text-gray-500 italic">Definido pelo prestador</span> : (service.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                              <span className="text-xs text-muted-foreground">Personalizado por prestador</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditService(service)}
                              className="hover:bg-blue-100"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteService(service)}
                              className="hover:bg-red-100"
                            >
                              <Trash className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      Nenhum serviço encontrado. Adicione seu primeiro serviço!
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Dialog de confirmação de exclusão */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent className="bg-white border-2 border-red-100 shadow-2xl rounded-2xl">
            <DialogHeader>
              <DialogTitle>Excluir Serviço</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja excluir o serviço &quot;
                {serviceToDelete?.name}&quot;? Esta ação não pode ser desfeita.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDeleteDialogOpen(false)}
                className="rounded-lg border-blue-200 hover:bg-blue-50"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteService}
                disabled={deleteServiceMutation.isPending}
                className="rounded-lg font-semibold shadow-md"
              >
                {deleteServiceMutation.isPending ? "Excluindo..." : "Excluir"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}