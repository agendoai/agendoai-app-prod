import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import {
  ArrowLeft,
  Save,
  RefreshCw,
  CheckCircle,
  XCircle,
  Mail,
  Bell,
  MessageSquare,
  Key,
  TestTube,
  Eye,
  EyeOff,
  Send,
  User,
  Bot
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import AdminLayout from "@/components/layout/admin-layout";

// Esquema de validação para configurações de integração
const integrationsSettingsSchema = z.object({
  // SendGrid (Email)
  sendGridEnabled: z.boolean().optional(),
  sendGridApiKey: z.string().optional(),
  
  // Web Push (Notificações)
  pushNotificationsEnabled: z.boolean().optional(),
  vapidPublicKey: z.string().optional(),
  vapidPrivateKey: z.string().optional(),
  
  // WhatsApp
  whatsappEnabled: z.boolean().optional(),
  whatsappApiKey: z.string().optional(),
  whatsappPhoneNumberId: z.string().optional(),
  whatsappVerifyToken: z.string().optional(),
  whatsappBusinessId: z.string().optional(),
  
  // WhatsApp Chatbot
  whatsappChatbotEnabled: z.boolean().optional(),
  whatsappChatbotWelcomeMessage: z.string().optional(),
  whatsappChatbotSchedulingEnabled: z.boolean().optional(),
});

type IntegrationsSettings = z.infer<typeof integrationsSettingsSchema>;

// Componente para testar o chatbot
function ChatbotTester() {
  const [inputMessage, setInputMessage] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("5511999999999");
  const [messages, setMessages] = useState<Array<{ type: 'user' | 'bot', content: string }>>([]);
  const [isSending, setIsSending] = useState(false);
  const [showPhoneConfig, setShowPhoneConfig] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Mutation para testar o chatbot
  const testChatbotMutation = useMutation({
    mutationFn: async ({ message, phoneNumber }: { message: string, phoneNumber: string }) => {
      const response = await apiRequest("POST", "/api/admin/integrations-settings/test-chatbot", {
        message,
        phoneNumber
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        // Adicionar resposta do bot
        setMessages(prev => [...prev, { type: 'bot', content: data.botResponse }]);
        
        // Para debug, mostra informações da sessão em um toast
        toast({
          title: "Estado da sessão: " + data.sessionState,
          description: "Teste do chatbot realizado com sucesso",
          duration: 3000,
        });
      } else {
        toast({
          title: "Falha no teste do chatbot",
          description: data.message || "Ocorreu um erro ao testar o chatbot.",
          variant: "destructive",
        });
      }
      setIsSending(false);
      setInputMessage("");
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste do chatbot",
        description: error.message || "Ocorreu um erro ao testar o chatbot.",
        variant: "destructive",
      });
      setIsSending(false);
    }
  });

  // Rolagem automática para a última mensagem
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Função para enviar uma mensagem
  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    
    // Adicionar mensagem do usuário
    setMessages(prev => [...prev, { type: 'user', content: inputMessage }]);
    
    // Enviar para o servidor
    setIsSending(true);
    testChatbotMutation.mutate({ message: inputMessage, phoneNumber });
  };

  return (
    <div className="flex flex-col">
      <div className="flex justify-between items-center mb-2">
        <h4 className="text-sm font-medium">Chat de Teste</h4>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => setShowPhoneConfig(!showPhoneConfig)}
        >
          {showPhoneConfig ? "Ocultar Config" : "Configurar"}
        </Button>
      </div>
      
      {showPhoneConfig && (
        <div className="mb-4 p-3 bg-slate-50 rounded-md">
          <Label htmlFor="test-phone" className="text-sm mb-1 block">Número de telefone para teste</Label>
          <Input 
            id="test-phone" 
            value={phoneNumber} 
            onChange={(e) => setPhoneNumber(e.target.value)}
            placeholder="Ex: 5511999999999" 
            className="mb-2"
          />
          <p className="text-xs text-slate-500">O telefone é usado apenas para simular uma sessão de usuário.</p>
        </div>
      )}
      
      <div className="border rounded-md p-3 h-64 overflow-y-auto mb-4 bg-slate-50">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <Bot className="h-8 w-8 mb-2" />
            <p className="text-sm">Envie uma mensagem para começar o teste</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div 
                key={index} 
                className={`mb-2 p-2 rounded-lg max-w-[80%] ${
                  msg.type === 'user' 
                    ? 'bg-blue-100 ml-auto text-right' 
                    : 'bg-white border'
                }`}
              >
                <div className="flex items-center mb-1">
                  {msg.type === 'user' ? (
                    <>
                      <span className="text-xs font-medium text-blue-600 mr-1">Você</span>
                      <User className="h-3 w-3 text-blue-600" />
                    </>
                  ) : (
                    <>
                      <Bot className="h-3 w-3 text-green-600 mr-1" />
                      <span className="text-xs font-medium text-green-600">Chatbot</span>
                    </>
                  )}
                </div>
                <p className="text-sm">{msg.content}</p>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>
      
      <div className="flex space-x-2">
        <Input
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          placeholder="Digite uma mensagem para testar o chatbot..."
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          disabled={isSending}
        />
        <Button 
          onClick={sendMessage} 
          disabled={isSending || !inputMessage.trim()}
        >
          {isSending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}

export default function IntegrationsSettingsPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [showSendGridKey, setShowSendGridKey] = useState(false);
  const [showWhatsAppKey, setShowWhatsAppKey] = useState(false);
  const [isGeneratingVapidKeys, setIsGeneratingVapidKeys] = useState(false);
  const [isTestingSendGrid, setIsTestingSendGrid] = useState(false);
  const [isTestingWhatsApp, setIsTestingWhatsApp] = useState(false);

  // Buscar configurações existentes
  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/integrations-settings"],
    queryFn: async () => {
      try {
        const response = await apiRequest("GET", "/api/admin/integrations-settings");
        const data = await response.json();
        return data;
      } catch (error) {
        console.error("Error fetching integration settings:", error);
        return {
          sendGridEnabled: false,
          pushNotificationsEnabled: false,
          whatsappEnabled: false,
        };
      }
    },
  });

  // Configurar formulário
  const form = useForm<IntegrationsSettings>({
    resolver: zodResolver(integrationsSettingsSchema),
    defaultValues: {
      sendGridEnabled: false,
      sendGridApiKey: "",
      pushNotificationsEnabled: false,
      vapidPublicKey: "",
      vapidPrivateKey: "",
      whatsappEnabled: false,
      whatsappApiKey: "",
      whatsappPhoneNumberId: "",
      whatsappVerifyToken: "",
      whatsappBusinessId: "",
      whatsappChatbotEnabled: false,
      whatsappChatbotWelcomeMessage: "Olá! Bem-vindo ao AgendoAI. Como posso ajudar você hoje?",
      whatsappChatbotSchedulingEnabled: false,
    },
  });

  // Atualizar formulário quando os dados forem carregados
  useEffect(() => {
    if (settings) {
      form.reset({
        sendGridEnabled: settings.sendGridEnabled || false,
        sendGridApiKey: settings.sendGridApiKey || "",
        pushNotificationsEnabled: settings.pushNotificationsEnabled || false,
        vapidPublicKey: settings.vapidPublicKey || "",
        vapidPrivateKey: settings.vapidPrivateKey || "",
        whatsappEnabled: settings.whatsappEnabled || false,
        whatsappApiKey: settings.whatsappApiKey || "",
        whatsappPhoneNumberId: settings.whatsappPhoneNumberId || "",
        whatsappVerifyToken: settings.whatsappVerifyToken || "",
        whatsappBusinessId: settings.whatsappBusinessId || "",
        whatsappChatbotEnabled: settings.whatsappChatbotEnabled || false,
        whatsappChatbotWelcomeMessage: settings.whatsappChatbotWelcomeMessage || "Olá! Bem-vindo ao AgendoAI. Como posso ajudar você hoje?",
        whatsappChatbotSchedulingEnabled: settings.whatsappChatbotSchedulingEnabled || false,
      });
    }
  }, [settings, form]);

  // Mutation para salvar configurações
  const updateSettingsMutation = useMutation({
    mutationFn: async (data: IntegrationsSettings) => {
      if (settings?.id) {
        const response = await apiRequest(
          "PUT",
          `/api/admin/integrations-settings/${settings.id}`,
          data
        );
        return response.json();
      } else {
        const response = await apiRequest(
          "POST",
          "/api/admin/integrations-settings",
          data
        );
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/integrations-settings"] });
      toast({
        title: "Configurações salvas",
        description: "As configurações de integração foram atualizadas com sucesso.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao salvar configurações",
        description: error.message || "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive",
      });
    },
  });

  // Mutation para gerar chaves VAPID
  const generateVapidKeysMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/push/generate-keys");
      return response.json();
    },
    onSuccess: (data) => {
      form.setValue("vapidPublicKey", data.publicKey);
      form.setValue("vapidPrivateKey", data.privateKey);
      
      toast({
        title: "Chaves VAPID geradas",
        description: "As chaves foram geradas com sucesso. Clique em Salvar para armazená-las.",
      });
      
      setIsGeneratingVapidKeys(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao gerar chaves VAPID",
        description: error.message || "Ocorreu um erro ao gerar as chaves VAPID.",
        variant: "destructive",
      });
      
      setIsGeneratingVapidKeys(false);
    }
  });

  // Mutation para testar API SendGrid
  const testSendGridMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/test-sendgrid", {
        apiKey: form.getValues("sendGridApiKey"),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Teste bem-sucedido",
          description: "A conexão com SendGrid foi testada com sucesso.",
        });
      } else {
        toast({
          title: "Falha no teste",
          description: data.message || "O teste de conexão com SendGrid falhou.",
          variant: "destructive",
        });
      }
      
      setIsTestingSendGrid(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste de SendGrid",
        description: error.message || "Ocorreu um erro ao testar a conexão com SendGrid.",
        variant: "destructive",
      });
      
      setIsTestingSendGrid(false);
    }
  });
  
  // Mutation para testar API WhatsApp
  const testWhatsAppMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/admin/integrations-settings/test-whatsapp", {
        apiKey: form.getValues("whatsappApiKey"),
        phoneNumberId: form.getValues("whatsappPhoneNumberId"),
      });
      return response.json();
    },
    onSuccess: (data) => {
      if (data.success) {
        toast({
          title: "Teste bem-sucedido",
          description: "A conexão com a API do WhatsApp foi verificada com sucesso.",
        });
      } else {
        toast({
          title: "Falha no teste",
          description: data.message || "O teste de conexão com a API do WhatsApp falhou.",
          variant: "destructive",
        });
      }
      
      setIsTestingWhatsApp(false);
    },
    onError: (error: any) => {
      toast({
        title: "Erro no teste da API do WhatsApp",
        description: error.message || "Ocorreu um erro ao testar a conexão com a API do WhatsApp.",
        variant: "destructive",
      });
      
      setIsTestingWhatsApp(false);
    }
  });

  // Manipulador de envio do formulário
  const onSubmit = (data: IntegrationsSettings) => {
    updateSettingsMutation.mutate(data);
  };

  // Manipulador para gerar chaves VAPID
  const handleGenerateVapidKeys = () => {
    setIsGeneratingVapidKeys(true);
    generateVapidKeysMutation.mutate();
  };

  // Manipulador para testar SendGrid
  const handleTestSendGrid = () => {
    const apiKey = form.getValues("sendGridApiKey");
    
    if (!apiKey) {
      toast({
        title: "Chave API não fornecida",
        description: "Por favor, insira uma chave de API SendGrid antes de testar.",
        variant: "destructive",
      });
      return;
    }
    
    setIsTestingSendGrid(true);
    testSendGridMutation.mutate();
  };
  
  // Manipulador para testar WhatsApp
  const handleTestWhatsApp = () => {
    const apiKey = form.getValues("whatsappApiKey");
    const phoneNumberId = form.getValues("whatsappPhoneNumberId");
    
    if (!apiKey || !phoneNumberId) {
      toast({
        title: "Informações incompletas",
        description: "Por favor, insira a chave de API e o ID do número de telefone do WhatsApp antes de testar.",
        variant: "destructive",
      });
      return;
    }
    
    setIsTestingWhatsApp(true);
    testWhatsAppMutation.mutate();
  };

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/admin/dashboard")}
              className="mr-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <h1 className="text-2xl font-semibold">Configurações de Integrações</h1>
          </div>
        </div>

        <Tabs defaultValue="email">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="email">Email (SendGrid)</TabsTrigger>
            <TabsTrigger value="notifications">Notificações Push</TabsTrigger>
            <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
          </TabsList>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              {/* Email (SendGrid) */}
              <TabsContent value="email" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Mail className="h-5 w-5 mr-2" />
                      Integração com SendGrid
                    </CardTitle>
                    <CardDescription>
                      Configure a integração com SendGrid para enviar emails transacionais.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="sendGridEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Ativar integração SendGrid
                            </FormLabel>
                            <FormDescription>
                              Habilite para enviar emails transacionais via SendGrid.
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
                      name="sendGridApiKey"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Chave de API SendGrid</FormLabel>
                          <div className="flex">
                            <FormControl>
                              <div className="relative w-full">
                                <Input
                                  {...field}
                                  type={showSendGridKey ? "text" : "password"}
                                  placeholder="Insira sua chave de API SendGrid"
                                  className="pr-10"
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowSendGridKey(!showSendGridKey)}
                                  className="absolute inset-y-0 right-0 flex items-center px-3"
                                >
                                  {showSendGridKey ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>
                              </div>
                            </FormControl>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="ml-2"
                              onClick={handleTestSendGrid}
                              disabled={isTestingSendGrid || !form.getValues("sendGridApiKey")}
                            >
                              {isTestingSendGrid ? (
                                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                              ) : (
                                <TestTube className="h-4 w-4 mr-2" />
                              )}
                              Testar
                            </Button>
                          </div>
                          <FormDescription>
                            Você pode obter esta chave no painel de administração do SendGrid.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notificações Push */}
              <TabsContent value="notifications" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Bell className="h-5 w-5 mr-2" />
                      Notificações Push
                    </CardTitle>
                    <CardDescription>
                      Configure as chaves VAPID para habilitar notificações push nos navegadores.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="pushNotificationsEnabled"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">
                              Ativar notificações push
                            </FormLabel>
                            <FormDescription>
                              Habilite para enviar notificações push para os navegadores dos usuários.
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

                    <div className="flex justify-end mb-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleGenerateVapidKeys}
                        disabled={isGeneratingVapidKeys}
                      >
                        {isGeneratingVapidKeys ? (
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <Key className="h-4 w-4 mr-2" />
                        )}
                        Gerar Chaves VAPID
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 gap-4">
                      <FormField
                        control={form.control}
                        name="vapidPublicKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chave Pública VAPID</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="Chave pública VAPID"
                              />
                            </FormControl>
                            <FormDescription>
                              Esta chave é usada pelos navegadores para autenticar notificações.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="vapidPrivateKey"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Chave Privada VAPID</FormLabel>
                            <div className="relative">
                              <FormControl>
                                <Input
                                  {...field}
                                  type={showPrivateKey ? "text" : "password"}
                                  placeholder="Chave privada VAPID"
                                  className="pr-10"
                                />
                              </FormControl>
                              <button
                                type="button"
                                onClick={() => setShowPrivateKey(!showPrivateKey)}
                                className="absolute inset-y-0 right-0 flex items-center px-3"
                              >
                                {showPrivateKey ? (
                                  <EyeOff className="h-4 w-4 text-gray-500" />
                                ) : (
                                  <Eye className="h-4 w-4 text-gray-500" />
                                )}
                              </button>
                            </div>
                            <FormDescription>
                              Esta chave deve ser mantida em segurança. Nunca compartilhe ou exponha no frontend.
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* WhatsApp */}
              <TabsContent value="whatsapp" className="mt-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <MessageSquare className="h-5 w-5 mr-2" />
                      Integração com WhatsApp
                    </CardTitle>
                    <CardDescription>
                      Configure a integração com a API do WhatsApp Business para enviar mensagens.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Configurações básicas do WhatsApp */}
                    <div className="rounded-lg border p-4 pb-5">
                      <h3 className="text-lg font-semibold mb-3">Configurações da API</h3>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="whatsappEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Ativar integração WhatsApp
                                </FormLabel>
                                <FormDescription>
                                  Habilite para enviar mensagens via WhatsApp Business API.
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
                          name="whatsappApiKey"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Token de Acesso WhatsApp</FormLabel>
                              <div className="relative">
                                <FormControl>
                                  <Input
                                    {...field}
                                    type={showWhatsAppKey ? "text" : "password"}
                                    placeholder="Token de acesso da API WhatsApp Business"
                                    className="pr-10"
                                  />
                                </FormControl>
                                <button
                                  type="button"
                                  onClick={() => setShowWhatsAppKey(!showWhatsAppKey)}
                                  className="absolute inset-y-0 right-0 flex items-center px-3"
                                >
                                  {showWhatsAppKey ? (
                                    <EyeOff className="h-4 w-4 text-gray-500" />
                                  ) : (
                                    <Eye className="h-4 w-4 text-gray-500" />
                                  )}
                                </button>
                              </div>
                              <FormDescription>
                                Token de acesso permanente obtido no Facebook Developer Portal.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="whatsappPhoneNumberId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ID do Número de Telefone</FormLabel>
                              <div className="flex">
                                <FormControl>
                                  <Input
                                    {...field}
                                    placeholder="ID do número de telefone WhatsApp Business"
                                  />
                                </FormControl>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="ml-2"
                                  onClick={handleTestWhatsApp}
                                  disabled={isTestingWhatsApp || !form.getValues("whatsappApiKey") || !form.getValues("whatsappPhoneNumberId")}
                                >
                                  {isTestingWhatsApp ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <TestTube className="h-4 w-4 mr-2" />
                                  )}
                                  Testar Conexão
                                </Button>
                              </div>
                              <FormDescription>
                                ID do número de telefone registrado na API do WhatsApp Business.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="whatsappVerifyToken"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Token de Verificação do Webhook</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="Token para verificação de segurança do webhook"
                                />
                              </FormControl>
                              <FormDescription>
                                Token de verificação usado para autenticar as chamadas de webhook do WhatsApp.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="whatsappBusinessId"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>ID do WhatsApp Business</FormLabel>
                              <FormControl>
                                <Input
                                  {...field}
                                  placeholder="ID da conta WhatsApp Business"
                                />
                              </FormControl>
                              <FormDescription>
                                ID da sua conta no WhatsApp Business.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                    </div>
                    
                    {/* Configurações do Chatbot */}
                    <div className="rounded-lg border p-4 pb-5">
                      <h3 className="text-lg font-semibold mb-3">Configurações do Chatbot</h3>
                      <div className="space-y-4">
                        <FormField
                          control={form.control}
                          name="whatsappChatbotEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Ativar Chatbot WhatsApp
                                </FormLabel>
                                <FormDescription>
                                  Habilite o chatbot inteligente para atendimento e agendamentos pelo WhatsApp.
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
                          name="whatsappChatbotWelcomeMessage"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Mensagem de Boas-Vindas</FormLabel>
                              <FormControl>
                                <textarea
                                  {...field}
                                  className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                  placeholder="Mensagem que será enviada ao iniciar uma conversa"
                                />
                              </FormControl>
                              <FormDescription>
                                Mensagem de boas-vindas enviada pelo chatbot ao iniciar uma conversa.
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={form.control}
                          name="whatsappChatbotSchedulingEnabled"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Permitir Agendamentos pelo Chatbot
                                </FormLabel>
                                <FormDescription>
                                  Habilite para permitir que clientes façam agendamentos diretamente pelo WhatsApp.
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
                        
                        {/* Componente de Teste do Chatbot */}
                        {form.watch('whatsappChatbotEnabled') && (
                          <div className="mt-6 border rounded-lg p-4">
                            <h3 className="text-lg font-medium mb-4">Testar Chatbot</h3>
                            <div className="space-y-4">
                              <ChatbotTester />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <div className="mt-4 flex justify-end space-x-4">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setLocation("/admin/dashboard")}
                >
                  Cancelar
                </Button>
                <Button 
                  type="submit"
                  disabled={updateSettingsMutation.isPending}
                >
                  {updateSettingsMutation.isPending ? (
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
              </div>
            </form>
          </Form>
        </Tabs>
      </div>
    </AdminLayout>
  );
}