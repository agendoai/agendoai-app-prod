import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest, queryClient } from "@/lib/queryClient";

// UI Components
import AdminLayout from "@/components/layout/admin-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";

// Icons
import { Edit, Trash2, Plus, Save, RefreshCw, Search, Info, Check, X, Users, DollarSign } from "lucide-react";

interface ProviderFee {
  id: number;
  providerId: number;
  providerName?: string;
  providerEmail?: string;
  fixedFee: number; // em centavos
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Provider {
  id: number;
  name: string;
  email: string;
}

// Definimos o schema para validar o formulário
const providerFeeSchema = z.object({
  providerId: z.number({
    required_error: "Selecione um prestador",
  }),
  fixedFee: z.string().min(1, "Valor é obrigatório").transform((val) => {
    // Converte o valor da string (ex: "10,50") para centavos (1050)
    return Math.round(parseFloat(val.replace(",", ".")) * 100);
  }),
  description: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

type ProviderFeeFormValues = z.infer<typeof providerFeeSchema>;

export default function ProviderFeesPage() {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFee, setSelectedFee] = useState<ProviderFee | null>(null);
  
  // Formulário para adicionar ou editar taxa
  const form = useForm<ProviderFeeFormValues>({
    resolver: zodResolver(providerFeeSchema),
    defaultValues: {
      fixedFee: "",
      description: "",
      isActive: true,
    },
  });

  // Buscar todas as taxas de prestadores
  const feesQuery = useQuery({
    queryKey: ["/api/admin/provider-fees"],
    queryFn: async () => {
      const response = await apiRequest<ProviderFee[]>("/api/admin/provider-fees", {
        method: "GET",
      });
      return response;
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao buscar taxas",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Buscar todos os prestadores
  const providersQuery = useQuery({
    queryKey: ["/api/admin/providers"],
    queryFn: async () => {
      const response = await apiRequest<Provider[]>("/api/admin/providers", {
        method: "GET",
      });
      return response;
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao buscar prestadores",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para criar uma nova taxa de prestador
  const createFeeMutation = useMutation({
    mutationFn: async (data: ProviderFeeFormValues) => {
      return await apiRequest("/api/admin/provider-fees", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Taxa criada com sucesso",
        description: "A taxa de serviço foi configurada para o prestador.",
      });
      setShowAddDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/provider-fees"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar taxa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para atualizar uma taxa existente
  const updateFeeMutation = useMutation({
    mutationFn: async (data: ProviderFeeFormValues & { id: number }) => {
      return await apiRequest(`/api/admin/provider-fees/${data.id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Taxa atualizada com sucesso",
        description: "A taxa de serviço do prestador foi atualizada.",
      });
      setShowEditDialog(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/admin/provider-fees"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar taxa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Mutação para excluir uma taxa
  const deleteFeeMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest(`/api/admin/provider-fees/${id}`, {
        method: "DELETE",
      });
    },
    onSuccess: () => {
      toast({
        title: "Taxa removida com sucesso",
        description: "A taxa de serviço do prestador foi removida.",
      });
      setShowDeleteDialog(false);
      queryClient.invalidateQueries({ queryKey: ["/api/admin/provider-fees"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao remover taxa",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Função para abrir o modal de edição
  const handleEditClick = (fee: ProviderFee) => {
    setSelectedFee(fee);
    form.reset({
      providerId: fee.providerId,
      fixedFee: (fee.fixedFee / 100).toFixed(2).replace(".", ","),
      description: fee.description,
      isActive: fee.isActive,
    });
    setShowEditDialog(true);
  };

  // Função para abrir o modal de exclusão
  const handleDeleteClick = (fee: ProviderFee) => {
    setSelectedFee(fee);
    setShowDeleteDialog(true);
  };

  // Filtrar taxas com base no termo de pesquisa
  const filteredFees = feesQuery.data
    ? feesQuery.data.filter(
        (fee) =>
          fee.providerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          fee.providerEmail?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          fee.description?.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  // Formatador de moeda
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value / 100);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Taxas por Prestador</h1>
            <p className="text-muted-foreground">
              Configure taxas de serviço fixas personalizadas para cada prestador
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Taxa
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar prestador..."
              className="pl-8"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Taxas por Prestador</CardTitle>
            <CardDescription>
              Defina valores fixos de taxas para cada prestador ao invés de usar uma porcentagem padrão
            </CardDescription>
          </CardHeader>
          <CardContent>
            {feesQuery.isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredFees.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prestador</TableHead>
                    <TableHead>Taxa Fixa</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredFees.map((fee) => (
                    <TableRow key={fee.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{fee.providerName || "Sem nome"}</div>
                          <div className="text-sm text-muted-foreground">{fee.providerEmail}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {formatCurrency(fee.fixedFee)}
                        </Badge>
                      </TableCell>
                      <TableCell>{fee.description || "-"}</TableCell>
                      <TableCell>
                        {fee.isActive ? (
                          <Badge variant="success" className="bg-green-100 text-green-800">
                            Ativo
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-gray-100">
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEditClick(fee)}
                          className="h-8 w-8"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(fee)}
                          className="h-8 w-8 text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-10">
                <Users className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium">Nenhuma taxa configurada</h3>
                <p className="text-muted-foreground mt-1">
                  Você ainda não configurou taxas personalizadas para nenhum prestador.
                </p>
                <Button className="mt-4" onClick={() => setShowAddDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Taxa de Prestador
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal para adicionar nova taxa */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Nova Taxa de Prestador</DialogTitle>
            <DialogDescription>
              Configure uma taxa de serviço fixa personalizada para um prestador específico.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                createFeeMutation.mutate(data);
              })}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="providerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prestador</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value, 10))}
                      defaultValue={field.value?.toString()}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um prestador" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {providersQuery.data?.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id.toString()}>
                            {provider.name} ({provider.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>Selecione o prestador para definir a taxa.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fixedFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa Fixa (R$)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="0,00"
                          className="pl-8"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Valor fixo que será cobrado em cada agendamento deste prestador.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o motivo desta taxa específica..."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Taxa Ativa</FormLabel>
                      <FormDescription>
                        Ative ou desative essa taxa de serviço
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={createFeeMutation.isPending}>
                  {createFeeMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Salvar Taxa
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Modal para editar taxa */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Editar Taxa de Prestador</DialogTitle>
            <DialogDescription>
              Atualize a taxa de serviço fixa para o prestador selecionado.
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit((data) => {
                if (selectedFee) {
                  updateFeeMutation.mutate({ ...data, id: selectedFee.id });
                }
              })}
              className="space-y-4"
            >
              <FormField
                control={form.control}
                name="providerId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prestador</FormLabel>
                    <Select
                      onValueChange={(value) => field.onChange(parseInt(value, 10))}
                      value={field.value?.toString()}
                      disabled
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione um prestador" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {providersQuery.data?.map((provider) => (
                          <SelectItem key={provider.id} value={provider.id.toString()}>
                            {provider.name} ({provider.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      O prestador não pode ser alterado. Crie uma nova taxa se necessário.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fixedFee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa Fixa (R$)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <DollarSign className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="0,00"
                          className="pl-8"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormDescription>
                      Valor fixo que será cobrado em cada agendamento deste prestador.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o motivo desta taxa específica..."
                        {...field}
                        value={field.value || ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Taxa Ativa</FormLabel>
                      <FormDescription>
                        Ative ou desative essa taxa de serviço
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditDialog(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={updateFeeMutation.isPending}>
                  {updateFeeMutation.isPending ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Atualizando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Atualizar Taxa
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Alerta de confirmação para excluir taxa */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Taxa de Prestador</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta taxa de serviço?
              {selectedFee && (
                <div className="mt-2 p-3 bg-muted rounded-md">
                  <p>
                    <strong>Prestador:</strong> {selectedFee.providerName}
                  </p>
                  <p>
                    <strong>Valor:</strong> {formatCurrency(selectedFee.fixedFee)}
                  </p>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedFee) {
                  deleteFeeMutation.mutate(selectedFee.id);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteFeeMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Taxa
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}