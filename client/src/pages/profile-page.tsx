import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient, getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { 
  Loader2, Camera, User, AtSign, Phone, MapPin, Lock, AlertCircle, 
  Bell, CreditCard, History, Upload, BellOff, Check, X, Info, Calendar
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import ProviderNavbar from "@/components/layout/provider-navbar";
import ClientNavbar from "@/components/layout/client-navbar";

// Interface estendida para o tipo de agendamento com campos adicionais
interface AppointmentExtended {
  id: number;
  date: string;
  clientId: number;
  providerId: number;
  serviceId: number;
  startTime: string;
  endTime: string;
  status: string | null;
  notes: string | null;
  paymentMethod: string | null;
  isManuallyCreated: boolean | null;
  createdAt: Date | null;
  serviceName: string;  // Campo adicional
  providerName: string; // Campo adicional
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("personal");
  
  // Referência para input de arquivo (upload de imagem)
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Estado para armazenar a imagem selecionada
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(user?.profileImage || null);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Estado para armazenar os dados do formulário
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
    // Preferências de notificação
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    // Preferências de pagamento
    defaultPaymentMethod: "pix"
  });
  
  // Atualizar formulário quando o usuário mudar
  useEffect(() => {
    if (user) {
      // Recuperar método de pagamento salvo no localStorage
      const savedPaymentMethod = localStorage.getItem('defaultPaymentMethod') || 'credit_card';
      
      setFormData(prevData => ({
        ...prevData,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        defaultPaymentMethod: savedPaymentMethod
      }));
      setPreviewUrl(user.profileImage || null);
    }
  }, [user]);

  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<typeof user>) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar perfil",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutation para alterar senha
  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}/password`, data);
      return response.json();
    },
    onSuccess: () => {
      setFormData({
        ...formData,
        currentPassword: "",
        newPassword: "",
        confirmPassword: ""
      });
      toast({
        title: "Senha alterada",
        description: "Sua senha foi alterada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao alterar senha",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Manipular mudanças nos campos
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Enviar formulário de informações pessoais
  const handlePersonalInfoSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      name: formData.name,
      phone: formData.phone,
      address: formData.address
    });
  };

  // Enviar formulário de alteração de senha
  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se as novas senhas coincidem
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Erro de validação",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      return;
    }
    
    // Validar comprimento mínimo da senha
    if (formData.newPassword.length < 6) {
      toast({
        title: "Erro de validação",
        description: "A nova senha deve ter pelo menos 6 caracteres.",
        variant: "destructive",
      });
      return;
    }
    
    changePasswordMutation.mutate({
      currentPassword: formData.currentPassword,
      newPassword: formData.newPassword
    });
  };

  // Buscar histórico de agendamentos
  const { data: appointments = [], isLoading: isLoadingAppointments } = useQuery<AppointmentExtended[]>({
    queryKey: ["/api/appointments"],
    queryFn: getQueryFn({ on401: "throw" }),
    enabled: !!user,
  });

  // Funções para preferências de notificação
  const handleNotificationToggle = (type: string, checked: boolean) => {
    setFormData({
      ...formData,
      [type]: checked
    });
    
    // Atualizar no backend
    const notificationPrefs: any = {};
    notificationPrefs[type] = checked;
    
    updateProfileMutation.mutate(notificationPrefs);
  };
  
  // Função para preferências de pagamento
  const handlePaymentMethodChange = (method: string) => {
    setFormData({
      ...formData,
      defaultPaymentMethod: method
    });
    
    // Salvar no localStorage já que não temos esse campo no banco
    localStorage.setItem('defaultPaymentMethod', method);
    
    toast({
      title: "Método de pagamento atualizado",
      description: `Seu método de pagamento padrão foi alterado para ${method === "credit_card" ? "Cartão de Crédito" : method === "pix" ? "PIX" : "Dinheiro"}.`
    });
  };
  
  // Upload de foto de perfil
  const handleProfilePhotoClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validação do tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Tipo de arquivo inválido",
        description: "Por favor, selecione uma imagem.",
        variant: "destructive"
      });
      return;
    }
    
    // Validação do tamanho do arquivo (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Arquivo muito grande",
        description: "A imagem deve ter no máximo 2MB.",
        variant: "destructive"
      });
      return;
    }
    
    setSelectedImage(file);
    
    // Criar URL temporária para preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
    
    // Simular upload
    simulateUpload();
  };
  
  const simulateUpload = () => {
    setUploadProgress(0);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        const newProgress = prev + 10;
        if (newProgress >= 100) {
          clearInterval(interval);
          
          // Aqui seria onde enviaríamos a imagem para o servidor usando formData
          // Em um ambiente real, usaríamos o código abaixo:
          
          /*
          const formData = new FormData();
          if (selectedImage) {
            formData.append('profileImage', selectedImage);
          }
          */
          
          // Como temos apenas o updateProfileMutation para uso atual, simulamos com uma URL
          if (previewUrl) {
            updateProfileMutation.mutate({
              profileImage: previewUrl
            });
          }
          
          return 100;
        }
        return newProgress;
      });
    }, 300);
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {user.userType === "provider" ? <ProviderNavbar /> : 
       user.userType === "client" ? <ClientNavbar /> : null}
      
      <main className="container max-w-4xl mx-auto px-4 py-8 pb-20">
        <h1 className="text-2xl font-bold mb-6">Minhas Informações</h1>
        
        <div className="flex flex-col md:flex-row gap-6">
          {/* Coluna esquerda - Foto e informações básicas */}
          <div className="w-full md:w-1/3">
            <Card>
              <CardContent className="pt-6 flex flex-col items-center">
                <div className="relative mb-4">
                  <Avatar className="h-24 w-24">
                    {user.profileImage ? (
                      <AvatarImage src={user.profileImage} alt={user.name || "Usuário"} />
                    ) : (
                      <AvatarFallback className="bg-primary text-white text-xl">
                        {user.name ? user.name.charAt(0).toUpperCase() : <User />}
                      </AvatarFallback>
                    )}
                  </Avatar>
                  <Button 
                    size="icon" 
                    className="absolute bottom-0 right-0 h-8 w-8 rounded-full" 
                    onClick={handleProfilePhotoClick}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                
                <h2 className="text-xl font-semibold">{user.name || "Nome não definido"}</h2>
                <p className="text-muted-foreground">{user.userType === "provider" ? "Prestador" : "Cliente"}</p>
                
                <div className="w-full mt-6 space-y-3">
                  <div className="flex items-center">
                    <AtSign className="h-4 w-4 text-muted-foreground mr-2" />
                    <span className="text-sm">{user.email}</span>
                  </div>
                  {user.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="text-sm">{user.phone}</span>
                    </div>
                  )}
                  {user.address && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 text-muted-foreground mr-2" />
                      <span className="text-sm">{user.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Coluna direita - Abas de edição */}
          <div className="w-full md:w-2/3">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="mb-6">
                <TabsTrigger value="personal">Informações Pessoais</TabsTrigger>
                <TabsTrigger value="password">Senha</TabsTrigger>
                <TabsTrigger value="photo">Foto</TabsTrigger>
                <TabsTrigger value="notifications">Notificações</TabsTrigger>
                <TabsTrigger value="payment">Pagamento</TabsTrigger>
                <TabsTrigger value="history">Histórico</TabsTrigger>
              </TabsList>
              
              {/* Aba de informações pessoais */}
              <TabsContent value="personal">
                <Card>
                  <CardHeader>
                    <CardTitle>Informações Pessoais</CardTitle>
                    <CardDescription>
                      Atualize seus dados de contato e endereço
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form id="personal-info-form" onSubmit={handlePersonalInfoSubmit}>
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name">Nome completo</Label>
                          <Input 
                            id="name" 
                            name="name" 
                            value={formData.name}
                            onChange={handleInputChange}
                            placeholder="Seu nome completo"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="email">E-mail</Label>
                          <Input 
                            id="email" 
                            name="email" 
                            value={formData.email}
                            disabled
                            placeholder="seu@email.com"
                          />
                          <p className="text-xs text-muted-foreground">
                            O e-mail não pode ser alterado
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="phone">Telefone</Label>
                          <Input 
                            id="phone" 
                            name="phone" 
                            value={formData.phone}
                            onChange={handleInputChange}
                            placeholder="(00) 00000-0000"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="address">Endereço</Label>
                          <Input 
                            id="address" 
                            name="address" 
                            value={formData.address}
                            onChange={handleInputChange}
                            placeholder="Seu endereço completo"
                          />
                        </div>
                      </div>
                    </form>
                  </CardContent>
                  <CardFooter className="border-t px-6 py-4">
                    <Button 
                      type="submit"
                      form="personal-info-form"
                      disabled={updateProfileMutation.isPending}
                      className="ml-auto"
                    >
                      {updateProfileMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span>Salvando...</span>
                        </>
                      ) : "Salvar alterações"}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              {/* Aba de alteração de senha */}
              <TabsContent value="password">
                <Card>
                  <CardHeader>
                    <CardTitle>Alterar Senha</CardTitle>
                    <CardDescription>
                      Atualize sua senha de acesso
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Alert className="mb-6">
                      <AlertCircle className="h-4 w-4 mr-2" />
                      <AlertDescription>
                        Use uma senha forte com letras, números e caracteres especiais
                      </AlertDescription>
                    </Alert>
                    
                    <form id="password-form" onSubmit={handlePasswordSubmit}>
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="currentPassword">Senha atual</Label>
                          <Input 
                            id="currentPassword" 
                            name="currentPassword" 
                            type="password"
                            value={formData.currentPassword}
                            onChange={handleInputChange}
                            placeholder="Digite sua senha atual"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="newPassword">Nova senha</Label>
                          <Input 
                            id="newPassword" 
                            name="newPassword" 
                            type="password"
                            value={formData.newPassword}
                            onChange={handleInputChange}
                            placeholder="Digite a nova senha"
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirme a nova senha</Label>
                          <Input 
                            id="confirmPassword" 
                            name="confirmPassword" 
                            type="password"
                            value={formData.confirmPassword}
                            onChange={handleInputChange}
                            placeholder="Confirme a nova senha"
                          />
                        </div>
                      </div>
                    </form>
                  </CardContent>
                  <CardFooter className="border-t px-6 py-4">
                    <Button 
                      type="submit"
                      form="password-form"
                      disabled={changePasswordMutation.isPending}
                      className="ml-auto"
                    >
                      {changePasswordMutation.isPending ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          <span>Alterando...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="h-4 w-4 mr-2" />
                          <span>Alterar senha</span>
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
              
              {/* Aba de foto de perfil */}
              <TabsContent value="photo">
                <Card>
                  <CardHeader>
                    <CardTitle>Foto de Perfil</CardTitle>
                    <CardDescription>
                      Atualize sua foto de perfil
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col items-center mb-6">
                      <Avatar className="h-32 w-32 mb-4">
                        {previewUrl ? (
                          <AvatarImage src={previewUrl} alt={user.name || "Usuário"} />
                        ) : (
                          <AvatarFallback className="bg-primary text-white text-3xl">
                            {user.name ? user.name.charAt(0).toUpperCase() : <User />}
                          </AvatarFallback>
                        )}
                      </Avatar>
                      
                      {uploadProgress > 0 && uploadProgress < 100 && (
                        <div className="w-full max-w-xs mb-4">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary"
                              style={{ width: `${uploadProgress}%` }}
                            />
                          </div>
                          <p className="text-xs text-center text-muted-foreground mt-1">
                            Enviando... {uploadProgress}%
                          </p>
                        </div>
                      )}
                      
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleFileInputChange}
                      />
                      
                      <Button 
                        variant="outline" 
                        onClick={handleProfilePhotoClick}
                        className="mt-2"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        <span>Escolher Foto</span>
                      </Button>
                    </div>
                    
                    <div className="text-sm text-muted-foreground space-y-2">
                      <p>• Tamanho máximo: 2MB</p>
                      <p>• Formatos aceitos: JPG, PNG</p>
                      <p>• Dimensões ideais: 200x200 pixels</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Aba de notificações */}
              <TabsContent value="notifications">
                <Card>
                  <CardHeader>
                    <CardTitle>Notificações</CardTitle>
                    <CardDescription>
                      Gerencie suas preferências de notificações
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="email-notifications">Notificações por E-mail</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba atualizações de seus agendamentos por e-mail
                        </p>
                      </div>
                      <Switch
                        id="email-notifications"
                        checked={formData.emailNotifications}
                        onCheckedChange={(checked) => handleNotificationToggle('emailNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="push-notifications">Notificações Push</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba notificações em tempo real no navegador
                        </p>
                      </div>
                      <Switch
                        id="push-notifications"
                        checked={formData.pushNotifications}
                        onCheckedChange={(checked) => handleNotificationToggle('pushNotifications', checked)}
                      />
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="sms-notifications">Notificações SMS</Label>
                        <p className="text-sm text-muted-foreground">
                          Receba lembretes de agendamentos via SMS
                        </p>
                      </div>
                      <Switch
                        id="sms-notifications"
                        checked={formData.smsNotifications}
                        onCheckedChange={(checked) => handleNotificationToggle('smsNotifications', checked)}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Aba de pagamento */}
              <TabsContent value="payment">
                <Card>
                  <CardHeader>
                    <CardTitle>Métodos de Pagamento</CardTitle>
                    <CardDescription>
                      Gerencie suas preferências de pagamento
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup 
                      value={formData.defaultPaymentMethod}
                      onValueChange={handlePaymentMethodChange}
                      className="space-y-4"
                    >
                      <div className="flex items-center space-x-2 border p-4 rounded-md">
                        <RadioGroupItem value="credit_card" id="creditCard" />
                        <Label htmlFor="creditCard" className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2 text-primary" />
                          <span>Cartão de Crédito</span>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 border p-4 rounded-md">
                        <RadioGroupItem value="pix" id="pix" />
                        <Label htmlFor="pix" className="flex items-center">
                          <img 
                            src="https://logospng.org/download/pix/logo-pix-icone-512.png" 
                            alt="PIX" 
                            className="h-4 w-4 mr-2" 
                          />
                          <span>PIX</span>
                        </Label>
                      </div>
                      
                      <div className="flex items-center space-x-2 border p-4 rounded-md">
                        <RadioGroupItem value="local" id="local" />
                        <Label htmlFor="local" className="flex items-center">
                          <span className="h-4 w-4 mr-2 flex items-center justify-center text-primary">$</span>
                          <span>Pagamento no Local</span>
                        </Label>
                      </div>
                    </RadioGroup>
                    
                    <div className="mt-6 bg-muted p-3 rounded-md">
                      <p className="text-sm flex items-center">
                        <Info className="h-4 w-4 mr-2 text-muted-foreground" />
                        Esta é sua preferência de pagamento padrão, mas você poderá escolher um método diferente durante o agendamento.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              {/* Aba de histórico */}
              <TabsContent value="history">
                <Card>
                  <CardHeader>
                    <CardTitle>Histórico de Agendamentos</CardTitle>
                    <CardDescription>
                      Visualize seus agendamentos anteriores e atuais
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isLoadingAppointments ? (
                      <div className="py-10 flex justify-center">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : appointments.length === 0 ? (
                      <div className="py-10 text-center">
                        <Calendar className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                        <p className="text-muted-foreground">Você ainda não possui agendamentos</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {appointments.map((appointment) => (
                          <div 
                            key={appointment.id} 
                            className="border rounded-md p-4 hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-medium">{appointment.serviceName}</h4>
                              <Badge 
                                variant={
                                  appointment.status === 'confirmed' ? 'default' : 
                                  appointment.status === 'completed' ? 'outline' : 
                                  appointment.status === 'canceled' ? 'destructive' : 
                                  'secondary'
                                }
                              >
                                {appointment.status === 'confirmed' ? 'Confirmado' : 
                                 appointment.status === 'completed' ? 'Concluído' : 
                                 appointment.status === 'canceled' ? 'Cancelado' : 
                                 'Pendente'}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground space-y-1">
                              <p>Prestador: {appointment.providerName}</p>
                              <p>Data: {new Date(appointment.date).toLocaleDateString('pt-BR')}</p>
                              <p>Horário: {appointment.startTime} - {appointment.endTime}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}