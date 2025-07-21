import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowLeft,
  CreditCard,
  DollarSign,
  Percent,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Wallet
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import AdminLayout from "@/components/layout/admin-layout";

// Interface para as configurações de pagamento
interface PaymentSettings {
  id: number;
  // Configurações gerais
  serviceFee: number; // Valor em centavos
  serviceFeePercentage: number; // Taxa de serviço em centavos (compatibilidade)
  minServiceFee: number; // Valor mínimo em centavos
  maxServiceFee: number; // Valor máximo em centavos
  payoutSchedule: "instant" | "daily" | "weekly" | "monthly";
  
  // Configurações do Asaas
  asaasEnabled: boolean;
  asaasLiveMode: boolean;
  asaasApiKey: string;
  asaasWebhookToken: string;
  asaasWalletId: string;
  asaasSplitEnabled: boolean;
}

// Schema de validação Zod
const paymentSettingsSchema = z.object({
  // Campo oculto para ID
  id: z.number().optional(),
  
  // Configurações gerais
  serviceFeePercentage: z.preprocess(
    (val) => {
      const parsed = parseFloat(val as string);
      return isNaN(parsed) ? 0 : parsed;
    },
    z.number().min(0, "A taxa deve ser maior ou igual a 0").max(100, "A taxa não pode exceder 100%")
  ),
  minServiceFee: z.preprocess(
    (val) => {
      const parsed = parseFloat(val as string);
      return isNaN(parsed) ? 0 : parsed;
    },
    z.number().min(0, "O valor mínimo deve ser maior ou igual a 0")
  ),
  maxServiceFee: z.preprocess(
    (val) => {
      const parsed = parseFloat(val as string);
      return isNaN(parsed) ? 0 : parsed;
    },
    z.number().min(0, "O valor máximo deve ser maior ou igual a 0")
  ),
  payoutSchedule: z.enum(["instant", "daily", "weekly", "monthly"]),
  
  // Configurações do Asaas
  asaasEnabled: z.boolean().default(false),
  asaasLiveMode: z.boolean().default(false),
  asaasApiKey: z.string(),
  asaasWebhookToken: z.string().optional(),
  asaasWalletId: z.string().optional(),
  asaasSplitEnabled: z.boolean().default(false)
})
.superRefine((data, ctx) => {
  // Verificação condicional para Asaas - apenas se estiver habilitado
  if (data.asaasEnabled) {
    if (data.asaasApiKey.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "A chave API do Asaas é obrigatória quando o Asaas está ativado",
        path: ["asaasApiKey"]
      });
    }
  }
})
.refine(data => {
  return data.maxServiceFee >= data.minServiceFee;
}, {
  message: "O valor máximo da taxa deve ser maior ou igual ao valor mínimo",
  path: ["maxServiceFee"]
});

export default function PaymentSettingsPage() {
  console.log('[DEBUG] Renderizando PaymentSettingsPage');
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("asaas");
  const [showTestAlert, setShowTestAlert] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [showAsaasTestAlert, setShowAsaasTestAlert] = useState(false);
  const [asaasTestResult, setAsaasTestResult] = useState<{success: boolean, message: string} | null>(null);
  
  // Novo: flag para forçar exibição do formulário
  const [showInitialForm, setShowInitialForm] = useState(false);

  // Form setup com React Hook Form
  const form = useForm<z.infer<typeof paymentSettingsSchema>>({
    resolver: zodResolver(paymentSettingsSchema),
    defaultValues: {
      // Configurações gerais
      serviceFeePercentage: 10,
      minServiceFee: 2,
      maxServiceFee: 50,
      payoutSchedule: "weekly",
      
      // Configurações do Asaas
      asaasEnabled: false,
      asaasLiveMode: false,
      asaasApiKey: "",
      asaasWebhookToken: "",
      asaasWalletId: "",
      asaasSplitEnabled: false
    }
  });

  // Consultar configurações existentes
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/payment-settings"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/payment-settings");
        return await res.json();
      } catch (error) {
        console.error("Erro ao carregar configurações de pagamento:", error);
        return undefined;
      }
    }
  });

  // Preencher o formulário quando os dados forem carregados
  useEffect(() => {
    if (settings) {
      form.reset({
        id: settings.id, // <-- garantir que o id vai para o form
        // Configurações gerais
        serviceFeePercentage: settings.serviceFee / 100 || 0,
        minServiceFee: settings.minServiceFee / 100 || 0,
        maxServiceFee: settings.maxServiceFee / 100 || 0,
        payoutSchedule: settings.payoutSchedule || "weekly",
        
        // Configurações do Asaas
        asaasEnabled: settings.asaasEnabled || false,
        asaasLiveMode: settings.asaasLiveMode || false,
        asaasApiKey: settings.asaasApiKey || "",
        asaasWebhookToken: settings.asaasWebhookToken || "",
        asaasWalletId: settings.asaasWalletId || "",
        asaasSplitEnabled: settings.asaasSplitEnabled || false
      });
    }
  }, [settings, form]);

  // Mutação para salvar configurações
  const saveSettingsMutation = useMutation({
    mutationFn: async (newSettings: any) => {
      try {
        // Determinar a URL e método corretos com base na existência do ID
        const id = newSettings.id || settings?.id;
        const url = id 
          ? `/api/admin/payment-settings/${id}` 
          : "/api/admin/payment-settings";
        const method = id ? "PATCH" : "POST";
        console.log(`[DEBUG] Vai enviar ${method} para ${url} com dados:`, newSettings);
        // Garantir que temos os dados formatados corretamente
        const res = await apiRequest(method, url, newSettings);
        console.log(`[DEBUG] Resposta do backend para ${method} ${url}:`, res);
        // Verificar se temos resposta com erro
        if (!res.ok) {
          const errorData = await res.json().catch(() => null);
          console.error("Resposta de erro do servidor:", errorData);
          throw new Error(errorData?.error || `Erro ${res.status}: ${res.statusText}`);
        }
        // Retornar dados da resposta
        return await res.json();
      } catch (error) {
        console.error("Erro na requisição:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log("Configurações salvas com sucesso:", data);
      toast({
        title: "Configurações salvas",
        description: "As configurações de pagamento foram atualizadas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/payment-settings"] });
    },
    onError: (error: any) => {
      console.error("Erro ao salvar configurações:", error);
      toast({
        title: "Erro",
        description: `Erro ao salvar configurações: ${error instanceof Error ? error.message : String(error)}`,
        variant: "destructive",
      });
    }
  });

  // Mutation para testar a conexão com o Asaas
  const testAsaasConnectionMutation = useMutation({
    mutationFn: async () => {
      // Capturar valores atuais do formulário antes de enviar
      const asaasApiKey = form.getValues().asaasApiKey;
      const asaasLiveMode = form.getValues().asaasLiveMode;
      
      console.log("Testando conexão Asaas:", { asaasApiKey: asaasApiKey ? "***" : undefined, asaasLiveMode });
      
      // Salvar as configurações primeiro, para garantir que estão atualizadas no servidor
      if (settings?.id) {
        try {
          const formData = form.getValues();
          const formattedData = {
            ...formData,
            id: settings.id,
            serviceFeePercentage: Math.round(parseFloat(formData.serviceFeePercentage.toString()) * 100),
            serviceFee: Math.round(parseFloat(formData.serviceFeePercentage.toString()) * 100),
            minServiceFee: Math.round(parseFloat(formData.minServiceFee.toString()) * 100),
            maxServiceFee: Math.round(parseFloat(formData.maxServiceFee.toString()) * 100),
            asaasApiKey,
            asaasLiveMode
          };
          
          console.log("Salvando configurações antes do teste Asaas:", formattedData);
          await saveSettingsMutation.mutateAsync(formattedData);
        } catch (error) {
          console.error("Erro ao salvar configurações antes do teste Asaas:", error);
          // Continuar com o teste mesmo se o salvamento falhar
        }
      }
      
      const res = await apiRequest("POST", "/api/admin/payment-settings/test-asaas", {
        asaasApiKey,
        asaasLiveMode
      });
      return await res.json();
    },
    onSuccess: (data) => {
      console.log("Teste de conexão Asaas bem-sucedido:", data);
      setAsaasTestResult({
        success: data.success,
        message: data.message || (data.success ? "Conexão estabelecida com sucesso!" : "Falha na conexão")
      });
      setShowAsaasTestAlert(true);
    },
    onError: (error: any) => {
      console.error("Erro ao testar conexão Asaas:", error);
      setAsaasTestResult({
        success: false,
        message: `Erro ao testar conexão: ${error.message}`
      });
      setShowAsaasTestAlert(true);
    }
  });

  const onSubmit = async (data: z.infer<typeof paymentSettingsSchema>) => {
    console.log('[DEBUG] onSubmit foi chamado!');
    try {
      console.log("[DEBUG] onSubmit chamado com:", data);
      // Ajustar os campos para centavos conforme backend espera
      const formattedData = {
        ...data,
        id: data.id || settings?.id, // <-- garantir que o id vai para o backend
        serviceFee: Math.round(Number(data.serviceFeePercentage) * 100),
        serviceFeePercentage: Math.round(Number(data.serviceFeePercentage) * 100),
        minServiceFee: Math.round(Number(data.minServiceFee) * 100),
        maxServiceFee: Math.round(Number(data.maxServiceFee) * 100),
        payoutSchedule: data.payoutSchedule || 'weekly',
        asaasEnabled: !!data.asaasEnabled,
        asaasLiveMode: !!data.asaasLiveMode,
        asaasApiKey: data.asaasApiKey || '',
        asaasWebhookToken: data.asaasWebhookToken || '',
        asaasWalletId: data.asaasWalletId || '',
        asaasSplitEnabled: !!data.asaasSplitEnabled,
      };
      console.log("[DEBUG] Dados enviados para o backend:", formattedData);
      try {
        const result = await saveSettingsMutation.mutateAsync(formattedData);
        console.log("[DEBUG] Resultado do salvamento:", result);
      } catch (mutationError) {
        console.error("[DEBUG] Erro na mutação:", mutationError);
        toast({
          title: "Erro ao salvar configurações",
          description: mutationError instanceof Error ? mutationError.message : String(mutationError),
          variant: "destructive",
        });
        throw mutationError;
      }
    } catch (error) {
      console.error("[DEBUG] Erro ao preparar ou enviar dados:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : String(error),
        variant: "destructive",
      });
    }
  };

  const testAsaasConnection = () => {
    const asaasApiKey = form.getValues().asaasApiKey;
    
    if (!asaasApiKey || asaasApiKey.trim() === '') {
      toast({
        title: "Chave API Ausente",
        description: "Por favor, adicione a chave API do Asaas antes de testar a conexão.",
        variant: "destructive",
      });
      return;
    }
    
    testAsaasConnectionMutation.mutate();
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6">
          <div className="flex h-[50vh] items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if ((!settings || Object.keys(settings).length === 0) && !showInitialForm) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-10">
          <div className="flex flex-col items-center justify-center min-h-[40vh]">
            <h2 className="text-xl font-bold mb-2 text-gray-800">Nenhuma configuração encontrada</h2>
            <p className="text-gray-600 mb-4">Clique abaixo para criar as configurações iniciais de pagamento.</p>
            <Button onClick={() => setShowInitialForm(true)} variant="default">Criar configurações iniciais</Button>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
        {/* Header da Página */}
        <div className="bg-white border-b border-blue-100 shadow-sm">
          <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6">
            <div className="flex items-center">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLocation("/admin/dashboard")}
                className="mr-3 sm:mr-4 hover:bg-blue-100"
              >
                <ArrowLeft className="h-5 w-5 text-blue-600" />
              </Button>
              <div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 flex items-center gap-2 sm:gap-3">
                  <div className="p-1.5 sm:p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl">
                    <CreditCard className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-white" />
                  </div>
                  <span>Configurações de Pagamento</span>
                </h1>
                <p className="text-gray-600 mt-1 sm:mt-2 text-sm">
                  Configure integrações de pagamento e taxas da plataforma
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto py-4 px-4 sm:py-6 sm:px-6">
          <form id="payment-settings-form" name="payment-settings-form" onSubmit={form.handleSubmit(onSubmit, (errors) => {
            console.log('[DEBUG] Erros de validação:', errors);
          })}>
            <Form {...form}>
              <Card className="shadow-xl border-0 bg-gradient-to-br from-white to-blue-50">
                <CardHeader className="pb-6">
                  <CardDescription className="text-gray-600 text-sm mt-4">
                    Configure as integrações de pagamento e as taxas da plataforma
                  </CardDescription>
                </CardHeader>
                
                <CardContent className="px-4 sm:px-6">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-1 sm:grid-cols-3 bg-gradient-to-r from-blue-100 to-purple-100 p-1 rounded-xl">
                      <TabsTrigger value="asaas">Asaas</TabsTrigger>
                      <TabsTrigger value="fees">Taxas</TabsTrigger>
                    </TabsList>
                    <TabsContent value="asaas" className="mt-0">
                      <div className="space-y-6">
                        {/* Status do Asaas */}
                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                          <div className="flex items-center space-x-3">
                            <FormField
                              control={form.control}
                              name="asaasEnabled"
                              render={({ field }) => (
                                <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                  <FormControl>
                                    <Checkbox
                                      checked={field.value}
                                      onCheckedChange={field.onChange}
                                      className="data-[state=checked]:bg-green-600 data-[state=checked]:border-green-600"
                                    />
                                  </FormControl>
                                  <div className="space-y-1 leading-none">
                                    <FormLabel className="text-green-900 font-semibold">Habilitar Asaas</FormLabel>
                                    <FormDescription className="text-green-700">
                                      Ative para permitir pagamentos online via Asaas (PIX, Boleto, Cartão)
                                    </FormDescription>
                                  </div>
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        {form.watch("asaasEnabled") && (
                          <div className="space-y-6">

                            
                            {/* API Key do Asaas */}
                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                              <FormField
                                control={form.control}
                                name="asaasApiKey"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-gray-900 font-semibold flex items-center gap-2">
                                      <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                        <CreditCard className="h-3 w-3 text-green-600" />
                                      </div>
                                      API Key do Asaas
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Sua chave de API do Asaas" 
                                        type="password"
                                        {...field} 
                                        className="rounded-lg border-gray-300 focus:border-green-500 focus:ring-green-500"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-gray-600 text-xs sm:text-sm">
                                      Chave de API obtida no painel do Asaas
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {/* Wallet ID da Plataforma */}
                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                              <FormField
                                control={form.control}
                                name="asaasWalletId"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-gray-900 font-semibold flex items-center gap-2">
                                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                        <Wallet className="h-3 w-3 text-blue-600" />
                                      </div>
                                      Wallet ID da Plataforma
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="ID da carteira principal" 
                                        {...field} 
                                        className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-gray-600 text-xs sm:text-sm">
                                      ID da carteira principal da plataforma no Asaas
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {/* Webhook Token */}
                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                              <FormField
                                control={form.control}
                                name="asaasWebhookToken"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel className="text-gray-900 font-semibold flex items-center gap-2">
                                      <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
                                        <CreditCard className="h-3 w-3 text-purple-600" />
                                      </div>
                                      Token do Webhook
                                    </FormLabel>
                                    <FormControl>
                                      <Input 
                                        placeholder="Token para webhooks (opcional)" 
                                        {...field} 
                                        className="rounded-lg border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                                      />
                                    </FormControl>
                                    <FormDescription className="text-gray-600">
                                      Token usado para verificar eventos do Asaas (opcional)
                                    </FormDescription>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {/* Split Automático */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-200">
                              <div className="flex items-center space-x-3">
                                <FormField
                                  control={form.control}
                                  name="asaasSplitEnabled"
                                  render={({ field }) => (
                                    <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value}
                                          onCheckedChange={field.onChange}
                                          className="data-[state=checked]:bg-indigo-600 data-[state=checked]:border-indigo-600"
                                        />
                                      </FormControl>
                                      <div className="space-y-1 leading-none">
                                        <FormLabel className="text-indigo-900 font-semibold">Split Automático</FormLabel>
                                        <FormDescription className="text-indigo-700">
                                          Divide automaticamente os pagamentos entre plataforma e prestador
                                        </FormDescription>
                                      </div>
                                    </FormItem>
                                  )}
                                />
                              </div>
                            </div>
                            
                            {/* Adicionar campo para selecionar ambiente de produção do Asaas */}
                            <div className="bg-slate-50 p-4 rounded-md">
                              <FormField
                                control={form.control}
                                name="asaasLiveMode"
                                render={({ field }) => (
                                  <FormItem className="flex flex-row items-center space-x-3 space-y-0">
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel>Usar ambiente de produção do Asaas</FormLabel>
                                      <FormDescription>
                                        Ative para usar a API de produção do Asaas. Desative para usar o ambiente de testes (sandbox).
                                      </FormDescription>
                                    </div>
                                  </FormItem>
                                )}
                              />
                            </div>
                            
                            {/* Botão de Teste */}
                            <Button 
                              type="button" 
                              variant="outline"
                              className="w-full bg-gradient-to-r from-green-50 to-emerald-50 border-green-200 hover:bg-green-100 text-green-700 rounded-xl py-3"
                              onClick={testAsaasConnection}
                              disabled={testAsaasConnectionMutation.isPending}
                            >
                              {testAsaasConnectionMutation.isPending ? (
                                <>
                                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                  Testando Conexão...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="mr-2 h-4 w-4" />
                                  Testar Conexão Asaas
                                </>
                              )}
                            </Button>
                          </div>
                        )}
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="fees" className="mt-0">
                      <div className="space-y-6">
                        {/* Taxa de Serviço e Frequência */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                            <FormField
                              control={form.control}
                              name="serviceFeePercentage"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-900 font-semibold flex items-center gap-2">
                                    <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
                                      <DollarSign className="h-3 w-3 text-green-600" />
                                    </div>
                                    Taxa de Serviço
                                  </FormLabel>
                                  <FormControl>
                                    <div className="flex items-center">
                                      <span className="mr-2 text-gray-500 font-medium">R$</span>
                                      <Input 
                                        type="number" 
                                        min="0" 
                                        step="0.01" 
                                        {...field} 
                                        className="rounded-lg border-gray-300 focus:border-green-500 focus:ring-green-500"
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription className="text-gray-600 text-xs sm:text-sm">
                                    Valor fixo em reais cobrado sobre cada transação
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                            <FormField
                              control={form.control}
                              name="payoutSchedule"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-900 font-semibold flex items-center gap-2">
                                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                      <CreditCard className="h-3 w-3 text-blue-600" />
                                    </div>
                                    Frequência de Pagamentos
                                  </FormLabel>
                                  <Select 
                                    onValueChange={field.onChange} 
                                    defaultValue={field.value}
                                    value={field.value}
                                  >
                                    <FormControl>
                                      <SelectTrigger className="rounded-lg border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                                        <SelectValue placeholder="Selecione" />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="instant">⚡ Instantâneo</SelectItem>
                                      <SelectItem value="daily">📅 Diário</SelectItem>
                                      <SelectItem value="weekly">📊 Semanal</SelectItem>
                                      <SelectItem value="monthly">📈 Mensal</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormDescription className="text-gray-600 text-xs sm:text-sm">
                                    Frequência com que os prestadores recebem os pagamentos
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        {/* Taxa Mínima e Máxima */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                            <FormField
                              control={form.control}
                              name="minServiceFee"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-900 font-semibold flex items-center gap-2">
                                    <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
                                      <DollarSign className="h-3 w-3 text-orange-600" />
                                    </div>
                                    Taxa Mínima
                                  </FormLabel>
                                  <FormControl>
                                    <div className="flex items-center">
                                      <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                                      <Input 
                                        type="number" 
                                        min="0" 
                                        step="0.01" 
                                        {...field} 
                                        className="rounded-lg border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription className="text-gray-600 text-xs sm:text-sm">
                                    Valor mínimo cobrado em cada transação
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                          
                          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                            <FormField
                              control={form.control}
                              name="maxServiceFee"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="text-gray-900 font-semibold flex items-center gap-2">
                                    <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
                                      <DollarSign className="h-3 w-3 text-red-600" />
                                    </div>
                                    Taxa Máxima
                                  </FormLabel>
                                  <FormControl>
                                    <div className="flex items-center">
                                      <DollarSign className="h-4 w-4 mr-2 text-gray-500" />
                                      <Input 
                                        type="number" 
                                        min="0" 
                                        step="0.01" 
                                        {...field} 
                                        className="rounded-lg border-gray-300 focus:border-red-500 focus:ring-red-500"
                                      />
                                    </div>
                                  </FormControl>
                                  <FormDescription className="text-gray-600 text-xs sm:text-sm">
                                    Valor máximo cobrado em cada transação
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
                        </div>
                        
                        {/* Resumo das Taxas */}
                        <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-6 rounded-xl border border-amber-200">
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <Percent className="h-4 w-4 text-amber-600" />
                            </div>
                            <div>
                              <h3 className="text-amber-900 font-semibold mb-2">Resumo das Taxas</h3>
                              <p className="text-amber-700 text-sm leading-relaxed">
                                Uma taxa fixa de <strong>R$ {form.watch("serviceFeePercentage")}</strong> será adicionada a cada transação,
                                respeitando os limites mínimo de <strong>R$ {form.watch("minServiceFee")}</strong> 
                                e máximo de <strong>R$ {form.watch("maxServiceFee")}</strong>.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
                
                <CardFooter className="border-t border-gray-200 p-6 flex justify-end">
                  <Button 
                    id="save-settings-btn"
                    name="save-settings-btn"
                    type="submit" 
                    size="lg"
                    disabled={saveSettingsMutation.isPending || form.formState.isSubmitting}
                    className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl px-8 py-3 shadow-lg"
                    onClick={() => { console.log('[DEBUG] Botão de salvar clicado'); }}
                  >
                    {saveSettingsMutation.isPending || form.formState.isSubmitting ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Configurações
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </Form>
          </form>

          {/* Diálogo de resultado do teste Asaas */}
          <AlertDialog open={showAsaasTestAlert} onOpenChange={setShowAsaasTestAlert}>
            <AlertDialogContent className="backdrop-blur-md backdrop:bg-purple-100/60 border-0 shadow-2xl rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  {asaasTestResult?.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  {asaasTestResult?.success ? "Conexão Asaas bem-sucedida" : "Falha na conexão Asaas"}
                </AlertDialogTitle>
                <AlertDialogDescription className="text-gray-700">
                  {asaasTestResult?.message}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogAction className="bg-purple-600 hover:bg-purple-700 rounded-lg">OK</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </AdminLayout>
  );
}