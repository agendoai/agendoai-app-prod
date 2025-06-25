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
  Bell,
  RefreshCw,
  Save,
  Key,
  Copy,
  Lock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import AdminHeader from "@/components/admin/admin-header";
import AdminSidebar from "@/components/admin/admin-sidebar";

// Schema para o formulário de configurações VAPID
const vapidFormSchema = z.object({
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().email("Deve ser um email válido").default("mailto:notifications@agendoai.com")
});

// Tipo derivado do schema
type VapidFormValues = z.infer<typeof vapidFormSchema>;

export default function NotificationSettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("vapid");
  const [pushServiceStatus, setPushServiceStatus] = useState<{
    initialized: boolean;
    vapidKeysConfigured: boolean;
  }>({
    initialized: false,
    vapidKeysConfigured: false
  });

  // Buscar todas as configurações do sistema
  const { data: systemSettings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/admin/integrations-settings/system-settings"],
    refetchOnWindowFocus: false
  });

  // Buscar status do serviço de notificações push
  const { data: pushStatusData, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/admin/integrations-settings/system-settings/push-notification-status"],
    refetchOnWindowFocus: false
  });
  
  // Atualizar o estado quando os dados de status forem carregados
  useEffect(() => {
    if (pushStatusData) {
      // Tipando corretamente os dados para evitar erros
      const status = pushStatusData as { initialized: boolean, vapidKeysConfigured: boolean };
      setPushServiceStatus({
        initialized: status.initialized || false,
        vapidKeysConfigured: status.vapidKeysConfigured || false
      });
    }
  }, [pushStatusData]);

  // Formulário para configurações VAPID
  const vapidForm = useForm<VapidFormValues>({
    resolver: zodResolver(vapidFormSchema),
    defaultValues: {
      VAPID_PUBLIC_KEY: "",
      VAPID_SUBJECT: "mailto:notifications@agendoai.com"
    }
  });

  // Atualizar formulário quando as configurações forem carregadas
  useEffect(() => {
    if (systemSettings && Array.isArray(systemSettings)) {
      const vapidPublicKey = systemSettings.find((s: any) => s.key === "VAPID_PUBLIC_KEY");
      const vapidSubject = systemSettings.find((s: any) => s.key === "VAPID_SUBJECT");

      vapidForm.reset({
        VAPID_PUBLIC_KEY: vapidPublicKey?.value || "",
        VAPID_SUBJECT: vapidSubject?.value || "mailto:notifications@agendoai.com"
      });
    }
  }, [systemSettings, vapidForm]);

  // Mutation para atualizar configuração
  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      const response = await apiRequest("POST", `/api/admin/integrations-settings/system-settings/${key}`, { value });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrations-settings/system-settings"] });
      refetchStatus();
      toast({
        title: "Configuração atualizada",
        description: "A configuração foi atualizada com sucesso."
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar configuração",
        description: "Ocorreu um erro ao atualizar a configuração.",
        variant: "destructive"
      });
    }
  });

  // Mutation para gerar novas chaves VAPID
  const generateVapidKeysMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(
        "POST",
        "/api/admin/integrations-settings/system-settings/vapid/generate",
        {}
      );
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrations-settings/system-settings"] });
      refetchStatus();
      
      // Atualizar formulário com a nova chave pública
      vapidForm.setValue("VAPID_PUBLIC_KEY", data.publicKey);
      
      toast({
        title: "Chaves VAPID geradas",
        description: "Novas chaves VAPID foram geradas e configuradas com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao gerar chaves VAPID",
        description: "Ocorreu um erro ao gerar novas chaves VAPID.",
        variant: "destructive"
      });
    }
  });

  // Handler para salvar configurações VAPID
  const onSubmitVapidForm = (values: VapidFormValues) => {
    if (values.VAPID_SUBJECT) {
      updateSettingMutation.mutate({
        key: "VAPID_SUBJECT",
        value: values.VAPID_SUBJECT
      });
    }
  };

  // Função para copiar chave pública para clipboard
  const copyPublicKey = () => {
    const publicKey = vapidForm.getValues("VAPID_PUBLIC_KEY");
    if (publicKey) {
      navigator.clipboard.writeText(publicKey);
      toast({
        title: "Chave copiada",
        description: "A chave pública foi copiada para a área de transferência."
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <AdminSidebar />
      <main className="flex-1 pb-16">
        <AdminHeader title="Configurações de Notificações" description="Gerencie as configurações de notificações do sistema" />
        
        <div className="container px-6 py-8">
          <div className="mb-6 flex items-center">
            <Button
              variant="outline"
              size="sm"
              className="mr-4"
              onClick={() => setLocation("/admin/dashboard")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            
            <h1 className="text-2xl font-bold">Configurações de Notificações</h1>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <div className="col-span-1 lg:col-span-3">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="mb-6">
                  <TabsTrigger value="vapid">Chaves VAPID</TabsTrigger>
                  <TabsTrigger value="templates">Templates</TabsTrigger>
                  <TabsTrigger value="settings">Configurações</TabsTrigger>
                </TabsList>
                
                <TabsContent value="vapid" className="space-y-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Key className="mr-2 h-5 w-5 text-primary" />
                        Chaves VAPID para Notificações Push
                      </CardTitle>
                      <CardDescription>
                        As chaves VAPID são usadas para autenticar o servidor ao enviar notificações push aos navegadores dos usuários.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Status do serviço */}
                      <div className="rounded-lg border p-4 bg-gray-50">
                        <div className="flex items-center mb-2">
                          <h3 className="text-sm font-medium">Status do serviço de notificações</h3>
                          {pushServiceStatus.initialized ? (
                            <CheckCircle className="ml-2 h-4 w-4 text-green-500" />
                          ) : (
                            <XCircle className="ml-2 h-4 w-4 text-red-500" />
                          )}
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="flex items-center">
                            <span className="mr-2">Serviço inicializado:</span>
                            {pushServiceStatus.initialized ? (
                              <span className="text-green-600 font-medium">Sim</span>
                            ) : (
                              <span className="text-red-600 font-medium">Não</span>
                            )}
                          </div>
                          <div className="flex items-center">
                            <span className="mr-2">Chaves configuradas:</span>
                            {pushServiceStatus.vapidKeysConfigured ? (
                              <span className="text-green-600 font-medium">Sim</span>
                            ) : (
                              <span className="text-red-600 font-medium">Não</span>
                            )}
                          </div>
                        </div>
                      </div>

                      {isLoadingSettings ? (
                        <div className="space-y-4">
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : (
                        <Form {...vapidForm}>
                          <form onSubmit={vapidForm.handleSubmit(onSubmitVapidForm)} className="space-y-4">
                            <FormField
                              control={vapidForm.control}
                              name="VAPID_PUBLIC_KEY"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Chave Pública VAPID</FormLabel>
                                  <div className="flex">
                                    <FormControl>
                                      <Input
                                        {...field}
                                        readOnly
                                        className="flex-1 font-mono text-xs"
                                      />
                                    </FormControl>
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="icon"
                                      className="ml-2"
                                      onClick={copyPublicKey}
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                  </div>
                                  <FormDescription>
                                    Esta é a chave pública usada para autenticar notificações push.
                                  </FormDescription>
                                </FormItem>
                              )}
                            />

                            <div className="flex items-center space-x-2 mb-4">
                              <Lock className="h-5 w-5 text-muted-foreground" />
                              <p className="text-sm text-muted-foreground">
                                A chave privada VAPID está armazenada com segurança e não é exibida.
                              </p>
                            </div>

                            <FormField
                              control={vapidForm.control}
                              name="VAPID_SUBJECT"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>Email de contato VAPID</FormLabel>
                                  <FormControl>
                                    <Input {...field} />
                                  </FormControl>
                                  <FormDescription>
                                    Email de contato exigido para envio de notificações push.
                                  </FormDescription>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <div className="flex justify-between pt-4">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => generateVapidKeysMutation.mutate()}
                                disabled={generateVapidKeysMutation.isPending}
                              >
                                {generateVapidKeysMutation.isPending ? (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Gerando...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Gerar Novas Chaves
                                  </>
                                )}
                              </Button>
                              <Button
                                type="submit"
                                disabled={updateSettingMutation.isPending || !vapidForm.formState.isDirty}
                              >
                                {updateSettingMutation.isPending ? (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                                    Salvando...
                                  </>
                                ) : (
                                  <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Salvar Alterações
                                  </>
                                )}
                              </Button>
                            </div>
                          </form>
                        </Form>
                      )}

                      {/* Alertas e instruções */}
                      <Alert className="mt-6">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Importante</AlertTitle>
                        <AlertDescription>
                          Gerar novas chaves VAPID invalidará todas as subscrições de notificações push existentes.
                          Os usuários precisarão reativar as notificações em seus dispositivos.
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="templates">
                  <Card>
                    <CardHeader>
                      <CardTitle>Templates de Notificação</CardTitle>
                      <CardDescription>
                        Personalize os templates de notificações enviadas aos usuários.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8">
                        <Bell className="mx-auto h-12 w-12 text-muted-foreground/50" />
                        <div className="mt-4 text-muted-foreground">
                          Funcionalidade de templates de notificação em desenvolvimento.
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
                
                <TabsContent value="settings">
                  <Card>
                    <CardHeader>
                      <CardTitle>Configurações de Notificação</CardTitle>
                      <CardDescription>
                        Configure comportamentos e limites para envio de notificações.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-6">
                        <div className="flex items-center justify-between border-b pb-3">
                          <div>
                            <Label htmlFor="auto-reminder">Lembretes automáticos</Label>
                            <p className="text-sm text-muted-foreground">
                              Enviar lembretes 24h antes dos agendamentos
                            </p>
                          </div>
                          <Switch id="auto-reminder" defaultChecked />
                        </div>
                        
                        <div className="flex items-center justify-between border-b pb-3">
                          <div>
                            <Label htmlFor="marketing-notifications">Notificações de marketing</Label>
                            <p className="text-sm text-muted-foreground">
                              Permitir notificações promocionais
                            </p>
                          </div>
                          <Switch id="marketing-notifications" />
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <div>
                            <Label htmlFor="limit-per-day">Limite diário por usuário</Label>
                            <p className="text-sm text-muted-foreground">
                              Máximo de notificações por dia para cada usuário
                            </p>
                          </div>
                          <Input
                            id="limit-per-day"
                            type="number"
                            defaultValue="5"
                            className="w-20 text-right"
                          />
                        </div>
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-end">
                      <Button className="w-full sm:w-auto">
                        <Save className="mr-2 h-4 w-4" />
                        Salvar Configurações
                      </Button>
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
            
            <div className="col-span-1">
              <Card className="sticky top-20">
                <CardHeader>
                  <CardTitle>Guia Rápido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 text-sm">
                    <div>
                      <h4 className="font-medium">Chaves VAPID</h4>
                      <p className="text-muted-foreground">
                        São credenciais necessárias para enviar notificações push de forma segura.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium">Templates</h4>
                      <p className="text-muted-foreground">
                        Personalize mensagens para diferentes tipos de notificações.
                      </p>
                    </div>
                    <div>
                      <h4 className="font-medium">Configurações</h4>
                      <p className="text-muted-foreground">
                        Defina limites e comportamentos das notificações no sistema.
                      </p>
                    </div>
                    <Separator />
                    <div>
                      <h4 className="font-medium">Precisa de ajuda?</h4>
                      <p className="text-muted-foreground mb-2">
                        Consulte a documentação sobre implementação de notificações push.
                      </p>
                      <Button variant="outline" size="sm" className="w-full">
                        Ver Documentação
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}