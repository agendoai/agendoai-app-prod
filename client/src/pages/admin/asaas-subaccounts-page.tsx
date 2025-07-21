import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowLeft,
  Plus,
  Users,
  DollarSign,
  Settings,
  RefreshCw,
  CheckCircle,
  XCircle,
  Edit,
  Trash2,
  Shield,
  Calendar
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import AdminLayout from "@/components/layout/admin-layout";

// Schema de validação para subconta
const subAccountSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("Email inválido"),
  cpfCnpj: z.string().min(11, "CPF/CNPJ é obrigatório"),
  phone: z.string().optional(),
  address: z.string().optional(),
  addressNumber: z.string().optional(),
  complement: z.string().optional(),
  province: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  bank: z.string().optional(),
  accountNumber: z.string().optional(),
  accountDigit: z.string().optional(),
  branchNumber: z.string().optional(),
  branchDigit: z.string().optional(),
  accountType: z.enum(["CHECKING", "SAVINGS"]).optional(),
  enableEscrow: z.boolean().default(false),
  escrowDays: z.number().min(1).max(365).default(30)
});

interface AsaasSubAccount {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  enableEscrow: boolean;
  escrowDays: number;
  balance?: number;
  status: string;
  createdAt: string;
}

export default function AsaasSubAccountsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [openCreateDialog, setOpenCreateDialog] = useState(false);
  const [editingSubAccount, setEditingSubAccount] = useState<AsaasSubAccount | null>(null);

  // Form para criar/editar subconta
  const form = useForm<z.infer<typeof subAccountSchema>>({
    resolver: zodResolver(subAccountSchema),
    defaultValues: {
      name: "",
      email: "",
      cpfCnpj: "",
      phone: "",
      address: "",
      addressNumber: "",
      complement: "",
      province: "",
      city: "",
      state: "",
      postalCode: "",
      bank: "",
      accountNumber: "",
      accountDigit: "",
      branchNumber: "",
      branchDigit: "",
      accountType: "CHECKING",
      enableEscrow: false,
      escrowDays: 30
    }
  });

  // Consultar subcontas existentes
  const { data: subAccounts, isLoading, refetch } = useQuery({
    queryKey: ["/api/admin/asaas/subaccounts"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/asaas/subaccounts");
        return await res.json();
      } catch (error) {
        console.error("Erro ao carregar subcontas:", error);
        return { subAccounts: [] };
      }
    }
  });

  // Mutation para criar subconta
  const createSubAccountMutation = useMutation({
    mutationFn: async (data: z.infer<typeof subAccountSchema>) => {
      const payload = {
        name: data.name,
        email: data.email,
        cpfCnpj: data.cpfCnpj,
        phone: data.phone,
        address: data.address,
        addressNumber: data.addressNumber,
        complement: data.complement,
        province: data.province,
        city: data.city,
        state: data.state,
        postalCode: data.postalCode,
        bankAccount: data.bank ? {
          bank: data.bank,
          accountNumber: data.accountNumber || "",
          accountDigit: data.accountDigit || "",
          branchNumber: data.branchNumber || "",
          branchDigit: data.branchDigit,
          accountType: data.accountType || "CHECKING"
        } : undefined,
        enableEscrow: data.enableEscrow,
        escrowDays: data.escrowDays
      };

      const res = await apiRequest("POST", "/api/admin/asaas/subaccounts", payload);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Subconta criada",
        description: "Subconta criada com sucesso no Asaas.",
      });
      setOpenCreateDialog(false);
      form.reset();
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao criar subconta: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation para atualizar subconta
  const updateSubAccountMutation = useMutation({
    mutationFn: async ({ subAccountId, data }: { subAccountId: string; data: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/asaas/subaccounts/${subAccountId}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Subconta atualizada",
        description: "Subconta atualizada com sucesso.",
      });
      setEditingSubAccount(null);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao atualizar subconta: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  // Mutation para consultar saldo
  const balanceMutation = useMutation({
    mutationFn: async (subAccountId: string) => {
      const res = await apiRequest("GET", `/api/admin/asaas/subaccounts/${subAccountId}/balance`);
      return await res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Saldo consultado",
        description: `Saldo: R$ ${(data.balance / 100).toFixed(2)}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: `Erro ao consultar saldo: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  const onSubmit = (data: z.infer<typeof subAccountSchema>) => {
    if (editingSubAccount) {
      updateSubAccountMutation.mutate({
        subAccountId: editingSubAccount.id,
        data: {
          name: data.name,
          email: data.email,
          phone: data.phone,
          enableEscrow: data.enableEscrow,
          escrowDays: data.escrowDays
        }
      });
    } else {
      createSubAccountMutation.mutate(data);
    }
  };

  const handleEdit = (subAccount: AsaasSubAccount) => {
    setEditingSubAccount(subAccount);
    form.reset({
      name: subAccount.name,
      email: subAccount.email,
      cpfCnpj: subAccount.cpfCnpj,
      phone: subAccount.phone || "",
      address: subAccount.address || "",
      city: subAccount.city || "",
      state: subAccount.state || "",
      enableEscrow: subAccount.enableEscrow,
      escrowDays: subAccount.escrowDays
    });
  };

  const handleConsultBalance = (subAccountId: string) => {
    balanceMutation.mutate(subAccountId);
  };

  return (
    <AdminLayout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/admin/financial-settings")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Subcontas Asaas</h1>
              <p className="text-gray-600 mt-1">
                Gerencie as subcontas dos prestadores para split com custódia
              </p>
            </div>
          </div>
          
          <Dialog open={openCreateDialog} onOpenChange={setOpenCreateDialog}>
            <DialogTrigger asChild>
              <Button className="bg-green-600 hover:bg-green-700">
                <Plus className="h-4 w-4 mr-2" />
                Nova Subconta
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Criar Nova Subconta</DialogTitle>
                <DialogDescription>
                  Crie uma subconta para um prestador no Asaas com configurações de custódia
                </DialogDescription>
              </DialogHeader>
              
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  {/* Informações Básicas */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="Nome do prestador" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input {...field} type="email" placeholder="email@exemplo.com" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="cpfCnpj"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>CPF/CNPJ</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="000.000.000-00" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Telefone</FormLabel>
                          <FormControl>
                            <Input {...field} placeholder="(11) 99999-9999" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Endereço */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Endereço</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <FormField
                        control={form.control}
                        name="address"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Endereço</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Rua, Avenida, etc." />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="addressNumber"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="123" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="complement"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Complemento</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="Apto 101" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <FormField
                        control={form.control}
                        name="city"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cidade</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="São Paulo" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="state"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="SP" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="postalCode"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>CEP</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="00000-000" />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>

                  {/* Configurações de Custódia */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Configurações de Custódia (Escrow)
                    </h3>
                    
                    <FormField
                      control={form.control}
                      name="enableEscrow"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <div className="space-y-1 leading-none">
                            <FormLabel>Habilitar Conta Escrow</FormLabel>
                            <FormDescription>
                              Retém os valores por um período antes de liberar para o prestador
                            </FormDescription>
                          </div>
                        </FormItem>
                      )}
                    />
                    
                    {form.watch("enableEscrow") && (
                      <FormField
                        control={form.control}
                        name="escrowDays"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Dias de Retenção</FormLabel>
                            <FormControl>
                              <div className="flex items-center space-x-2">
                                <Input
                                  {...field}
                                  type="number"
                                  min="1"
                                  max="365"
                                  className="w-32"
                                />
                                <span className="text-sm text-gray-600">dias</span>
                              </div>
                            </FormControl>
                            <FormDescription>
                              Período que o valor ficará retido antes de ser liberado
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>

                  <DialogFooter>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setOpenCreateDialog(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="submit"
                      disabled={createSubAccountMutation.isPending}
                    >
                      {createSubAccountMutation.isPending ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4 mr-2" />
                          Criar Subconta
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Lista de Subcontas */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Subcontas ({subAccounts?.subAccounts?.length || 0})
            </CardTitle>
            <CardDescription>
              Subcontas criadas no Asaas para split com custódia
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400" />
                <p className="mt-2 text-gray-600">Carregando subcontas...</p>
              </div>
            ) : subAccounts?.subAccounts?.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhuma subconta</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Comece criando uma subconta para um prestador.
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prestador</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>CPF/CNPJ</TableHead>
                    <TableHead>Custódia</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subAccounts?.subAccounts?.map((subAccount: AsaasSubAccount) => (
                    <TableRow key={subAccount.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subAccount.name}</div>
                          <div className="text-sm text-gray-500">{subAccount.phone}</div>
                        </div>
                      </TableCell>
                      <TableCell>{subAccount.email}</TableCell>
                      <TableCell>{subAccount.cpfCnpj}</TableCell>
                      <TableCell>
                        {subAccount.enableEscrow ? (
                          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                            <Shield className="h-3 w-3 mr-1" />
                            {subAccount.escrowDays} dias
                          </Badge>
                        ) : (
                          <Badge variant="outline">Sem custódia</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={subAccount.status === 'ACTIVE' ? 'default' : 'secondary'}>
                          {subAccount.status === 'ACTIVE' ? 'Ativa' : 'Inativa'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleConsultBalance(subAccount.id)}
                            disabled={balanceMutation.isPending}
                          >
                            <DollarSign className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(subAccount)}
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
} 