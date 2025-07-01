import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, AlertCircle, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const stripeSettingsSchema = z.object({
  stripeEnabled: z.boolean().default(false),
  stripeLiveMode: z.boolean().default(false),
  stripePublicKey: z.string().min(1, 'Chave pública é obrigatória'),
  stripeSecretKey: z.string().min(1, 'Chave secreta é obrigatória'),
  stripeWebhookSecret: z.string().optional(),
});

type StripeSettingsFormValues = z.infer<typeof stripeSettingsSchema>;

export default function StripeSettingsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Verificar se o usuário é administrador
  useEffect(() => {
    if (!user || user.userType !== 'admin') {
      navigate('/');
    }
  }, [user, navigate]);

  // Buscar configurações atuais
  const { data: paymentSettings, isLoading } = useQuery({
    queryKey: ['/api/admin/payment-settings'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/payment-settings');
      if (!response.ok) {
        throw new Error('Falha ao carregar configurações de pagamento');
      }
      return response.json();
    },
  });

  const form = useForm<StripeSettingsFormValues>({
    resolver: zodResolver(stripeSettingsSchema),
    defaultValues: {
      stripeEnabled: false,
      stripeLiveMode: false,
      stripePublicKey: '',
      stripeSecretKey: '',
      stripeWebhookSecret: '',
    },
  });

  // Preencher o formulário quando os dados forem carregados
  useEffect(() => {
    if (paymentSettings) {
      form.reset({
        stripeEnabled: paymentSettings.stripeEnabled,
        stripeLiveMode: paymentSettings.stripeLiveMode,
        stripePublicKey: paymentSettings.stripePublicKey || '',
        stripeSecretKey: paymentSettings.stripeSecretKey || '',
        stripeWebhookSecret: paymentSettings.stripeWebhookSecret || '',
      });
    }
  }, [paymentSettings, form]);

  // Mutação para salvar as configurações
  const updateMutation = useMutation({
    mutationFn: async (data: StripeSettingsFormValues) => {
      const response = await apiRequest(
        'PATCH',
        `/api/admin/payment-settings/${paymentSettings?.id}`,
        data
      );
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Falha ao atualizar configurações');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/payment-settings'] });
      toast({
        title: 'Configurações salvas',
        description: 'As configurações de pagamento foram atualizadas com sucesso.',
        variant: 'default',
      });
    },
    onError: (error: Error) => {
      toast({
        title: 'Erro',
        description: `Falha ao salvar configurações: ${error.message}`,
        variant: 'destructive',
      });
    },
  });

  // Função para testar a conexão com o Stripe
  const testStripeConnection = async () => {
    const secretKey = form.getValues('stripeSecretKey');
    const liveMode = form.getValues('stripeLiveMode');

    if (!secretKey) {
      toast({
        title: 'Atenção',
        description: 'Informe a chave secreta do Stripe para testar a conexão.',
        variant: 'destructive',
      });
      return;
    }

    setIsTestingConnection(true);
    setTestResult(null);

    try {
      const response = await apiRequest('POST', '/api/admin/payment-settings/test-stripe', {
        stripeSecretKey: secretKey,
        stripeLiveMode: liveMode,
      });

      const result = await response.json();
      setTestResult(result);

      toast({
        title: result.success ? 'Sucesso' : 'Erro',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
    } catch (error) {
      setTestResult({
        success: false,
        message: 'Erro ao testar conexão com o Stripe. Verifique o console para mais detalhes.',
      });
      console.error('Erro ao testar conexão:', error);
      toast({
        title: 'Erro',
        description: 'Falha ao testar conexão com o Stripe',
        variant: 'destructive',
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const onSubmit = (data: StripeSettingsFormValues) => {
    updateMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Stripe</CardTitle>
          <CardDescription>Configure a integração com o Stripe para processamento de pagamentos.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="settings">
            <TabsList className="mb-6">
              <TabsTrigger value="settings">Configurações</TabsTrigger>
              <TabsTrigger value="help">Ajuda</TabsTrigger>
            </TabsList>
            
            <TabsContent value="settings">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="flex items-center justify-between space-x-2">
                    <div>
                      <h3 className="text-lg font-medium">Status do Stripe</h3>
                      <p className="text-sm text-muted-foreground">Ativar ou desativar a integração com o Stripe.</p>
                    </div>
                    <FormField
                      control={form.control}
                      name="stripeEnabled"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between space-x-2">
                    <div>
                      <h3 className="text-lg font-medium">Modo de Produção</h3>
                      <p className="text-sm text-muted-foreground">
                        Ativar para usar em produção real. Desativar para usar no modo teste.
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="stripeLiveMode"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="stripePublicKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chave Pública do Stripe</FormLabel>
                        <FormControl>
                          <Input placeholder="pk_..." {...field} />
                        </FormControl>
                        <FormDescription>
                          {form.getValues('stripeLiveMode')
                            ? 'Use a chave pública de produção que começa com pk_live_'
                            : 'Use a chave pública de teste que começa com pk_test_'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="stripeSecretKey"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Chave Secreta do Stripe</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="sk_..." {...field} />
                        </FormControl>
                        <FormDescription>
                          {form.getValues('stripeLiveMode')
                            ? 'Use a chave secreta de produção que começa com sk_live_'
                            : 'Use a chave secreta de teste que começa com sk_test_'}
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-between items-center">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={testStripeConnection}
                      disabled={isTestingConnection || !form.getValues('stripeSecretKey')}
                    >
                      {isTestingConnection ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Testando...
                        </>
                      ) : (
                        'Testar Conexão'
                      )}
                    </Button>
                    <div className="flex-1 ml-4">
                      {testResult && (
                        <div className={`flex items-center text-sm ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                          {testResult.success ? (
                            <Check className="h-4 w-4 mr-2" />
                          ) : (
                            <AlertCircle className="h-4 w-4 mr-2" />
                          )}
                          {testResult.message}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="stripeWebhookSecret"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Segredo do Webhook Stripe</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="whsec_..." {...field} />
                        </FormControl>
                        <FormDescription>
                          Segredo usado para verificar webhooks do Stripe. Configure o webhook no painel do Stripe apontando para:
                          <code className="bg-muted mx-1 px-1 py-0.5 rounded text-sm">
                            {window.location.origin}/api/stripe/webhook
                          </code>
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  {form.getValues('stripeEnabled') && !form.getValues('stripeWebhookSecret') && (
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Webhook não configurado</AlertTitle>
                      <AlertDescription>
                        Para receber atualizações em tempo real do status de pagamento, configure um webhook no painel do Stripe.
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <Button 
                    type="submit" 
                    className="w-full mt-4" 
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      'Salvar Configurações'
                    )}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="help">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium">Como configurar o Stripe</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Siga estas etapas para configurar corretamente a integração do Stripe:
                  </p>
                  <ol className="list-decimal ml-5 mt-2 space-y-2">
                    <li>Crie uma conta no Stripe em <a href="https://stripe.com" target="_blank" rel="noreferrer" className="text-primary underline">stripe.com</a></li>
                    <li>Obtenha suas chaves API no painel do Stripe em <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noreferrer" className="text-primary underline">dashboard.stripe.com/apikeys</a></li>
                    <li>Configure um endpoint de webhook no painel do Stripe apontando para <code className="bg-muted px-1 py-0.5 rounded text-sm">{window.location.origin}/api/stripe/webhook</code></li>
                    <li>Defina os eventos que deseja receber, no mínimo: <code className="bg-muted px-1 py-0.5 rounded text-sm">payment_intent.succeeded</code> e <code className="bg-muted px-1 py-0.5 rounded text-sm">payment_intent.payment_failed</code></li>
                    <li>Copie o "Signing Secret" do webhook e adicione-o no campo "Segredo do Webhook Stripe"</li>
                  </ol>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium">Modo Teste vs. Produção</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    No modo de teste, nenhuma transação real é processada. Use chaves que começam com <code className="bg-muted px-1 py-0.5 rounded text-sm">pk_test_</code> e <code className="bg-muted px-1 py-0.5 rounded text-sm">sk_test_</code>. Para processar pagamentos reais, ative o "Modo de Produção" e use chaves que começam com <code className="bg-muted px-1 py-0.5 rounded text-sm">pk_live_</code> e <code className="bg-muted px-1 py-0.5 rounded text-sm">sk_live_</code>.
                  </p>
                </div>
                
                <Separator />
                
                <div>
                  <h3 className="text-lg font-medium">Resolução de Problemas</h3>
                  <p className="text-sm text-muted-foreground mt-2">
                    Se estiver tendo problemas com a integração do Stripe:
                  </p>
                  <ul className="list-disc ml-5 mt-2 space-y-2">
                    <li>Verifique se as chaves API estão corretas</li>
                    <li>Confirme se o webhook está configurado corretamente</li>
                    <li>Verifique os logs de eventos do Stripe no painel do Stripe</li>
                    <li>Use o botão "Testar Conexão" para validar suas credenciais</li>
                  </ul>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}