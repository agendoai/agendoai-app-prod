import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Loader2, Save, Bell, Lock, CreditCard, Home, User, Languages, Mail, Phone } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import ClientLayout from "@/components/layout/client-layout";
import { PageTransition } from "@/components/ui/page-transition";

// Schema para validação das configurações
const settingsSchema = z.object({
  // Notificações
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(true),
  smsNotifications: z.boolean().default(false),
  whatsappNotifications: z.boolean().default(true),
  appointmentReminders: z.boolean().default(true),
  promotionalNotifications: z.boolean().default(false),
  
  // Preferências de Aparência
  theme: z.enum(["light", "dark", "system"]).default("system"),
  language: z.enum(["pt-BR", "en-US", "es"]).default("pt-BR"),
  
  // Preferências de Pagamento
  defaultPaymentMethod: z.enum(["credit_card", "pix", "money"]).default("credit_card"),
  savePaymentInfo: z.boolean().default(true),
});

type SettingsFormValues = z.infer<typeof settingsSchema>;

export default function SettingsPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("notifications");

  // Consulta para buscar as configurações atuais
  const { data: settings, isLoading } = useQuery({
    queryKey: ['/api/user/settings'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/user/settings');
        if (!response.ok) {
          throw new Error('Falha ao carregar configurações');
        }
        return response.json();
      } catch (error) {
        console.error('Erro ao carregar configurações:', error);
        return {
          emailNotifications: true,
          pushNotifications: true,
          smsNotifications: false,
          whatsappNotifications: true,
          appointmentReminders: true,
          promotionalNotifications: false,
          theme: "system",
          language: "pt-BR",
          defaultPaymentMethod: "credit_card",
          savePaymentInfo: true,
        };
      }
    },
  });

  // Configurar formulário
  const form = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings || {
      emailNotifications: true,
      pushNotifications: true,
      smsNotifications: false,
      whatsappNotifications: true,
      appointmentReminders: true,
      promotionalNotifications: false,
      theme: "system",
      language: "pt-BR",
      defaultPaymentMethod: "credit_card",
      savePaymentInfo: true,
    },
  });

  // Atualizamos os valores do formulário quando os dados forem carregados
  useEffect(() => {
    if (settings) {
      Object.entries(settings).forEach(([key, value]) => {
        // @ts-ignore - Ignorar erro de tipagem, já que estamos verificando campos dinâmicos
        form.setValue(key, value);
      });
    }
  }, [settings, form]);

  // Mutation para salvar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: SettingsFormValues) => {
      const response = await apiRequest('POST', '/api/user/settings', data);
      if (!response.ok) {
        throw new Error('Falha ao atualizar configurações');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Configurações atualizadas",
        description: "Suas preferências foram salvas com sucesso.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/user/settings'] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar configurações",
        description: error.message || "Ocorreu um erro ao salvar suas configurações.",
        variant: "destructive",
      });
    },
  });

  // Função para lidar com o envio do formulário
  const onSubmit = (data: SettingsFormValues) => {
    updateSettingsMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <ClientLayout title="Configurações">
        <div className="flex justify-center items-center min-h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </ClientLayout>
    );
  }

  return (
    <ClientLayout title="Configurações" showBackButton backButtonAction={() => navigate("/client/dashboard")}>
      <PageTransition>
        <div className="container max-w-4xl mx-auto px-4 py-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid grid-cols-4 mb-6">
                  <TabsTrigger value="notifications">
                    <Bell className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Notificações</span>
                  </TabsTrigger>
                  <TabsTrigger value="appearance">
                    <User className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Aparência</span>
                  </TabsTrigger>
                  <TabsTrigger value="payments">
                    <CreditCard className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Pagamentos</span>
                  </TabsTrigger>
                  <TabsTrigger value="account">
                    <Lock className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">Conta</span>
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="notifications">
                  <Card>
                    <CardHeader>
                      <CardTitle>Notificações</CardTitle>
                      <CardDescription>
                        Configure como deseja receber notificações e atualizações do sistema.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="emailNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between border-b pb-3">
                            <div>
                              <FormLabel>E-mail</FormLabel>
                              <FormDescription>
                                Receber notificações por e-mail
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

                      <FormField
                        control={form.control}
                        name="pushNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between border-b pb-3">
                            <div>
                              <FormLabel>Push</FormLabel>
                              <FormDescription>
                                Receber notificações push no dispositivo
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

                      <FormField
                        control={form.control}
                        name="whatsappNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between border-b pb-3">
                            <div>
                              <FormLabel>WhatsApp</FormLabel>
                              <FormDescription>
                                Receber atualizações via WhatsApp
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

                      <FormField
                        control={form.control}
                        name="smsNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between border-b pb-3">
                            <div>
                              <FormLabel>SMS</FormLabel>
                              <FormDescription>
                                Receber notificações por SMS
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

                      <Separator className="my-4" />

                      <FormField
                        control={form.control}
                        name="appointmentReminders"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between border-b pb-3">
                            <div>
                              <FormLabel>Lembretes de Agendamentos</FormLabel>
                              <FormDescription>
                                Receber lembretes antes dos agendamentos
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

                      <FormField
                        control={form.control}
                        name="promotionalNotifications"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between border-b pb-3">
                            <div>
                              <FormLabel>Promoções e Novidades</FormLabel>
                              <FormDescription>
                                Receber promoções e novidades dos prestadores
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
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="appearance">
                  <Card>
                    <CardHeader>
                      <CardTitle>Aparência e Idioma</CardTitle>
                      <CardDescription>
                        Personalize a aparência e o idioma do aplicativo.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="theme"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tema</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um tema" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="light">Claro</SelectItem>
                                <SelectItem value="dark">Escuro</SelectItem>
                                <SelectItem value="system">Sistema</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Escolha entre tema claro, escuro ou automático conforme o sistema.
                            </FormDescription>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="language"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Idioma</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione um idioma" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="pt-BR">Português (Brasil)</SelectItem>
                                <SelectItem value="en-US">English (US)</SelectItem>
                                <SelectItem value="es">Español</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormDescription>
                              Escolha o idioma de sua preferência.
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="payments">
                  <Card>
                    <CardHeader>
                      <CardTitle>Pagamentos</CardTitle>
                      <CardDescription>
                        Configure suas preferências de pagamento.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <FormField
                        control={form.control}
                        name="defaultPaymentMethod"
                        render={({ field }) => (
                          <FormItem className="space-y-3">
                            <FormLabel>Método de Pagamento Padrão</FormLabel>
                            <FormControl>
                              <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex flex-col space-y-2"
                              >
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="credit_card" id="credit_card" />
                                  <Label htmlFor="credit_card">Cartão de Crédito</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="pix" id="pix" />
                                  <Label htmlFor="pix">PIX</Label>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <RadioGroupItem value="money" id="money" />
                                  <Label htmlFor="money">Dinheiro (no local)</Label>
                                </div>
                              </RadioGroup>
                            </FormControl>
                            <FormDescription>
                              Este método será selecionado automaticamente nos checkouts.
                            </FormDescription>
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="savePaymentInfo"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between border-b pb-3">
                            <div>
                              <FormLabel>Salvar informações de pagamento</FormLabel>
                              <FormDescription>
                                Salvar seus cartões e dados para pagamentos futuros
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

                      <div className="mt-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => navigate("/client/payment-methods")}
                        >
                          Gerenciar Métodos de Pagamento
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="account">
                  <Card>
                    <CardHeader>
                      <CardTitle>Conta e Segurança</CardTitle>
                      <CardDescription>
                        Gerencie suas informações pessoais e segurança.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
                        <div>
                          <h3 className="text-sm font-medium">Informações Pessoais</h3>
                          <p className="text-sm text-muted-foreground">
                            Nome, e-mail, telefone e endereço
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 sm:mt-0"
                          onClick={() => navigate("/client/personal-info")}
                        >
                          <User className="h-4 w-4 mr-2" />
                          Editar Informações
                        </Button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
                        <div>
                          <h3 className="text-sm font-medium">Senha e Segurança</h3>
                          <p className="text-sm text-muted-foreground">
                            Altere sua senha e configurações de segurança
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 sm:mt-0"
                          onClick={() => navigate("/client/change-password")}
                        >
                          <Lock className="h-4 w-4 mr-2" />
                          Alterar Senha
                        </Button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4">
                        <div>
                          <h3 className="text-sm font-medium">Endereços</h3>
                          <p className="text-sm text-muted-foreground">
                            Gerencie seus endereços de serviço
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 sm:mt-0"
                          onClick={() => navigate("/client/addresses")}
                        >
                          <Home className="h-4 w-4 mr-2" />
                          Gerenciar Endereços
                        </Button>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between">
                        <div>
                          <h3 className="text-sm font-medium">Excluir Conta</h3>
                          <p className="text-sm text-muted-foreground">
                            Excluir permanentemente sua conta e todos os dados
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="mt-2 sm:mt-0"
                          onClick={() => {
                            // Mostrar confirmação antes de excluir
                            toast({
                              title: "Ação não disponível",
                              description: "Entre em contato com o suporte para solicitar a exclusão da conta.",
                              variant: "destructive",
                            });
                          }}
                        >
                          Excluir Conta
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              <div className="flex justify-end mt-6">
                <Button 
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Salvar Configurações
                    </>
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </PageTransition>
    </ClientLayout>
  );
}