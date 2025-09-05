import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import AppHeader from "@/components/layout/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Store, 
  Image as ImageIcon, 
  Check, 
  LogOut,
  UploadCloud,
  X,
  Clock,
  Globe,
  Instagram,
  Facebook,
  CreditCard,
  Banknote,
  CircleDollarSign,
  MessageSquare,
  AlertCircle,
  CreditCardIcon,
  AlertTriangle,
  DollarSign,
  Settings,
  Shield
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProviderLayout from "@/components/layout/provider-layout";
import { apiCall } from '@/lib/api';

export default function ProviderProfilePage() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useLocation();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const { toast } = useToast();
  
  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("business");
  
  // Refs para os inputs de arquivo
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  
  // States de upload
  const [uploadingProfileImage, setUploadingProfileImage] = useState(false);
  const [uploadingCoverImage, setUploadingCoverImage] = useState(false);
  
  // Business Information states
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [specialties, setSpecialties] = useState("");
  
  // Contact Information states - COMENTADO TEMPORARIAMENTE
  /*
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  */
  
  // Online Presence states
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  
  // Payment Options states
  const [acceptsCards, setAcceptsCards] = useState(true);
  const [acceptsPix, setAcceptsPix] = useState(true);
  const [acceptsCash, setAcceptsCash] = useState(true);
  const [acceptOnlinePayments, setAcceptOnlinePayments] = useState(false);
  const [merchantCode, setMerchantCode] = useState("");
  
  // Business Hours state
  const [businessHours, setBusinessHours] = useState("");
  
  // Adicione o estado de carregamento do Stripe Connect
  const [stripeLoading, setStripeLoading] = useState(false);

  // Função para forçar status online
  const forceOnlineStatus = async () => {
    try {
      await apiRequest("PUT", "/api/provider-settings", { isOnline: true });
      refetch(); // Recarregar dados
    } catch (error) {
      // Erro silencioso
    }
  };

  // Fetch provider settings
  const { data: providerSettings, isLoading, refetch } = useQuery({
    queryKey: ["/api/provider-settings"],
    refetchOnMount: true,
    staleTime: 0,
  });

  // Forçar status online quando a página carregar
  useEffect(() => {
    if (providerSettings && !(providerSettings as any).isOnline) {
      forceOnlineStatus();
    }
  }, [providerSettings]);

  // Effect para atualizar os estados quando os dados carregarem
  useEffect(() => {
    if (providerSettings) {
      const settings = providerSettings as any;
      // Business Information
      setBusinessName(settings.businessName || "");
      setDescription(settings.description || "");
      setSpecialties(settings.specialties || "");
      
      // Online Presence
      setWebsite(settings.website || "");
      setInstagram(settings.instagram || "");
      setFacebook(settings.facebook || "");
      
      // Payment Options
      setAcceptsCards(settings.acceptsCards !== undefined ? settings.acceptsCards : true);
      setAcceptsPix(settings.acceptsPix !== undefined ? settings.acceptsPix : true);
      setAcceptsCash(settings.acceptsCash !== undefined ? settings.acceptsCash : true);
      setAcceptOnlinePayments(settings.acceptOnlinePayments !== undefined ? settings.acceptOnlinePayments : false);
      setMerchantCode(settings.merchantCode || "");
      
      // Business Hours
      setBusinessHours(settings.businessHours || "");
    }
  }, [providerSettings]);
  
  // Update provider settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const res = await apiRequest("PUT", "/api/provider-settings", settingsData);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-settings"] });
      queryClient.refetchQueries({ queryKey: ["/api/provider-settings"] });
      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram atualizadas com sucesso.",
      });
      setIsEditing(false);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message || "Não foi possível atualizar suas informações.",
        variant: "destructive",
      });
    },
  });
  
  // Handle save changes
  const handleSaveChanges = () => {
    updateSettingsMutation.mutate({
      // Business Information
      businessName,
      description,
      specialties,
      
      // Contact Information - COMENTADO TEMPORARIAMENTE
      /*
      address,
      city,
      state,
      postalCode,
      phone,
      whatsapp,
      email,
      */
      
      // Online Presence
      website,
      instagram,
      facebook,
      
      // Payment Options
      acceptsCards,
      acceptsPix,
      acceptsCash,
      acceptOnlinePayments,
      merchantCode,
      
      // Business Hours
      businessHours,
    });
  };
  
  // Handle logout
  const handleLogout = () => {
    setLogoutDialogOpen(true);
  };
  
  const confirmLogout = () => {
    setLogoutDialogOpen(false);
    
          // Remover token de todas as fontes possíveis
      localStorage.removeItem('authToken');
      sessionStorage.removeItem('authToken');
      if (window.authToken) {
        window.authToken = undefined;
      }
      
      // Limpar também cookies relacionados
      document.cookie = 'authToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      document.cookie = 'authToken=; path=/; domain=' + window.location.hostname + '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      
      // Forçar limpeza do cache do navegador para o token
      if ('caches' in window) {
        caches.keys().then(names => {
          names.forEach(name => {
            caches.delete(name);
          });
        });
      }
    
    
    
    // Mostrar toast de sucesso
    toast({
      title: "Logout realizado",
      description: "Você saiu da sua conta com sucesso.",
    });
    
    // Forçar recarregamento da página após um pequeno delay
    setTimeout(() => {
      window.location.reload();
    }, 500);
  };
  

  // Função para capturar foto com a câmera (não utilizada - removida para evitar warnings)
  /*
  const handleCameraCapture = async (type: 'profile' | 'cover') => {
    try {
      // Verificar se o navegador suporta getUserMedia
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Câmera não disponível",
          description: "Seu navegador não suporta acesso à câmera. Tente usar um navegador mais recente.",
          variant: "destructive",
        });
        return;
      }

      // Verificar se estamos em HTTPS ou localhost (permitir HTTP em localhost para desenvolvimento)
      if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1' && !window.location.hostname.includes('192.168.')) {
        toast({
          title: "HTTPS necessário",
          description: "O acesso à câmera requer HTTPS. Certifique-se de que está usando uma conexão segura.",
          variant: "destructive",
        });
        return;
      }

      // Detectar se é iPhone/iOS
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isWebView = (window as any).ReactNativeWebView || (window as any).webkit?.messageHandlers;

      if (isIOS && isWebView) {
        toast({
          title: "Use a opção nativa",
          description: "No iPhone, use a opção 'Galeria / Câmera' que abre o seletor nativo do iOS.",
          variant: "destructive",
        });
        return;
      }

      // Mostrar toast de carregamento
      toast({
        title: "Acessando câmera...",
        description: "Solicitando permissão para acessar a câmera.",
      });

      // Configurações específicas para iPhone/iOS
      const videoConstraints = isIOS ? {
        video: { 
          facingMode: { ideal: 'user' }, // Câmera frontal
          width: { ideal: type === 'cover' ? 800 : 640, max: 1280 },
          height: { ideal: type === 'cover' ? 400 : 640, max: 1280 }
        },
        audio: false
      } : {
        video: { 
          facingMode: 'user', // Câmera frontal
          width: { ideal: type === 'cover' ? 1200 : 800, max: 1920 },
          height: { ideal: type === 'cover' ? 400 : 800, max: 1920 }
        },
        audio: false
      };

      // Solicitar acesso à câmera
      const stream = await navigator.mediaDevices.getUserMedia(videoConstraints);

      // Criar um elemento de vídeo temporário
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.muted = true;
      video.playsInline = true;
      
      // Configurações específicas para iPhone/iOS
      if (isIOS) {
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('playsinline', 'true');
        video.style.width = '100%';
        video.style.height = 'auto';
      }

      // Criar um canvas para capturar a foto
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      // Aguardar o vídeo carregar
      video.addEventListener('loadedmetadata', () => {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        
        // Desenhar o frame atual no canvas
        ctx?.drawImage(video, 0, 0);
        
        // Converter para blob
        canvas.toBlob(async (blob) => {
          if (blob) {
            // Criar um arquivo a partir do blob
            const file = new File([blob], `camera-capture-${type}.jpg`, { type: 'image/jpeg' });
            
            // Fazer upload diretamente
            if (type === 'profile') {
              await uploadProfileImage(file);
            } else {
              await uploadCoverImage(file);
            }
            
            toast({
              title: "Foto capturada!",
              description: `A foto de ${type === 'profile' ? 'perfil' : 'capa'} foi capturada e enviada com sucesso.`,
            });
          }
          
          // Parar a câmera
          stream.getTracks().forEach(track => track.stop());
        }, 'image/jpeg', 0.8);
      });

      // Tratar erro de carregamento do vídeo
      video.addEventListener('error', () => {
        stream.getTracks().forEach(track => track.stop());
        toast({
          title: "Erro ao carregar câmera",
          description: "Não foi possível carregar a câmera. Tente novamente.",
          variant: "destructive",
        });
      });

    } catch (error: any) {
      console.error('Erro ao acessar câmera:', error);
      
      let errorMessage = "Não foi possível acessar a câmera.";
      let errorTitle = "Erro na câmera";
      
      if (error.name === 'NotAllowedError') {
        errorTitle = "Permissão negada";
        errorMessage = "Permissão negada. Por favor, permita o acesso à câmera nas configurações do navegador.";
      } else if (error.name === 'NotFoundError') {
        errorTitle = "Câmera não encontrada";
        errorMessage = "Nenhuma câmera encontrada. Verifique se há uma câmera conectada.";
      } else if (error.name === 'NotReadableError') {
        errorTitle = "Câmera em uso";
        errorMessage = "A câmera está sendo usada por outro aplicativo. Feche outros apps que possam estar usando a câmera.";
      } else if (error.name === 'OverconstrainedError') {
        errorTitle = "Configuração não suportada";
        errorMessage = "As configurações da câmera não são suportadas. Tente usar a opção 'Galeria / Câmera'.";
      } else if (error.name === 'SecurityError') {
        errorTitle = "Erro de segurança";
        errorMessage = "Erro de segurança. Certifique-se de que está usando HTTPS ou localhost.";
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    }
  };
  */

  // Função auxiliar para upload de imagem de perfil
  const uploadProfileImage = async (file: File) => {
    setUploadingProfileImage(true);
    try {
      // Verificar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro no upload",
          description: "O arquivo selecionado não é uma imagem válida.",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro no upload",
          description: "O arquivo é muito grande. Tamanho máximo: 5MB",
          variant: "destructive",
        });
        return;
      }
      
      // Criar FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('image', file);
      
      // Fazer upload para Cloudinary
      const response = await apiCall(`/api/users/${user?.id}/profile-image-cloudinary`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        await response.json();
        
        // Invalidar todas as queries relacionadas ao usuário e provider
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["/api/provider-settings"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
        
        // Refetch imediato dos dados do provider
        refetch();
        
        toast({
          title: "Sucesso",
          description: "Imagem de perfil atualizada com sucesso!",
        });
      } else {
        throw new Error('Erro no upload');
      }
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível atualizar a imagem de perfil.",
        variant: "destructive",
      });
    } finally {
      setUploadingProfileImage(false);
    }
  };

  // Função auxiliar para upload de imagem de capa
  const uploadCoverImage = async (file: File) => {
    setUploadingCoverImage(true);
    try {
      // Verificar tipo de arquivo
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Erro no upload",
          description: "O arquivo selecionado não é uma imagem válida.",
          variant: "destructive",
        });
        return;
      }
      
      // Verificar tamanho do arquivo (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "Erro no upload",
          description: "O arquivo é muito grande. Tamanho máximo: 5MB",
          variant: "destructive",
        });
        return;
      }
      
      // Criar FormData para enviar o arquivo
      const formData = new FormData();
      formData.append('image', file);
      
      // Fazer upload para Cloudinary
      const response = await apiCall(`/api/providers/${user?.id}/cover-image-cloudinary`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        await response.json();
        
        // Invalidar todas as queries relacionadas ao provider
        queryClient.invalidateQueries({ queryKey: ["/api/provider-settings"] });
        queryClient.invalidateQueries({ queryKey: ["/api/user"] });
        queryClient.invalidateQueries({ queryKey: ["user"] });
        
        // Refetch imediato dos dados do provider
        refetch();
        
        toast({
          title: "Sucesso",
          description: "Imagem de capa atualizada com sucesso!",
        });
      } else {
        throw new Error('Erro no upload');
      }
    } catch (error) {
      toast({
        title: "Erro no upload",
        description: "Não foi possível atualizar a imagem de capa.",
        variant: "destructive",
      });
    } finally {
      setUploadingCoverImage(false);
    }
  };

  // Função para upload de imagem de perfil usando Cloudinary
  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    await uploadProfileImage(file);
  };
  
  // Função para upload de imagem de capa usando Cloudinary
  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    await uploadCoverImage(file);
  };

  // Função para conectar Stripe
  const handleConnectStripe = async () => {
    setStripeLoading(true);
    try {
      const res = await apiRequest("POST", "/api/provider/stripe-connect-onboarding", {});
      if (res.status === 401) {
        toast({
          title: "Não autenticado",
          description: "Faça login novamente para conectar com o Stripe.",
          variant: "destructive",
        });
        return;
      }
      const data = await res.json();
      if (data.onboardingUrl) {
        window.location.href = data.onboardingUrl;
      } else {
        toast({
          title: "Erro ao conectar Stripe",
          description: data.error || "Não foi possível gerar o link de conexão.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Erro ao conectar Stripe",
        description: err.message || "Não foi possível conectar ao Stripe.",
        variant: "destructive",
      });
    } finally {
      setStripeLoading(false);
    }
  };
  
  return (
    <ProviderLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AppHeader title="Perfil do Prestador" showBackButton />
        
        <div className="p-4 space-y-6">
          {isLoading ? (
            <p className="text-center py-8">Carregando informações do perfil...</p>
          ) : (
            <>
              {/* Status Card */}
              <Card className="border border-neutral-200">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {/* Imagem de perfil */}
                        <div className="relative">
                          {user?.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={user.name || 'Prestador'}
                              className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-lg"
                            />
                          ) : (
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#3EB9AA] to-[#2A9D8F] flex items-center justify-center text-white text-xl font-bold border-2 border-white shadow-lg">
                              {user?.name?.charAt(0) || 'P'}
                            </div>
                          )}
                          {/* Indicador de status */}
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${(providerSettings as any)?.isOnline ? "bg-green-500" : "bg-red-500"}`}></div>
                        </div>
                        
                        <div>
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${(providerSettings as any)?.isOnline ? "bg-green-500" : "bg-red-500"} mr-3`}></div>
                            <p className="text-lg font-semibold text-neutral-900">{(providerSettings as any)?.isOnline ? "Online" : "Offline"}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Botão de emergência para forçar online */}
                      {!(providerSettings as any)?.isOnline && (
                        <button
                          onClick={forceOnlineStatus}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                        >
                          Ficar Online
                        </button>
                      )}
                    </div>
                    
                    <Switch 
                      checked={(providerSettings as any)?.isOnline || false}
                      onCheckedChange={(checked) => {
                        updateSettingsMutation.mutate({ isOnline: checked });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Tabs for different sections */}
              <Tabs defaultValue="business" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-3 mb-4">
                  <TabsTrigger value="business">Negócio</TabsTrigger>
                  {/* <TabsTrigger value="contact">Contato</TabsTrigger> */}
                  <TabsTrigger value="online">Online</TabsTrigger>
                  <TabsTrigger value="payment">Pagamento</TabsTrigger>
                </TabsList>
                
                {/* Business Information Tab */}
                <TabsContent value="business">
                  <Card className="border border-neutral-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Store className="h-5 w-5 mr-2 text-primary" />
                        Informações do Negócio
                      </CardTitle>
                      <CardDescription>
                        Configure os detalhes do seu estabelecimento
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="business-name">Nome do Estabelecimento</Label>
                            <Input
                              id="business-name"
                              value={businessName}
                              onChange={(e) => setBusinessName(e.target.value)}
                              placeholder="Nome do seu negócio"
                            />
                          </div>
                          <div>
                            <Label htmlFor="description">Descrição do Negócio</Label>
                            <Textarea
                              id="description"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="Descreva seu negócio"
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label htmlFor="specialties">Especialidades</Label>
                            <Input
                              id="specialties"
                              value={specialties}
                              onChange={(e) => setSpecialties(e.target.value)}
                              placeholder="Ex: Corte masculino, Barba, Coloração"
                            />
                            <p className="text-xs text-neutral-500 mt-1">
                              Separe as especialidades por vírgula
                            </p>
                          </div>
                          <div>
                            <Label htmlFor="business-hours">Horário de Funcionamento</Label>
                            <Textarea
                              id="business-hours"
                              value={businessHours}
                              onChange={(e) => setBusinessHours(e.target.value)}
                              placeholder="Ex: Segunda a Sexta: 9h às 18h, Sábado: 9h às 13h"
                              rows={3}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-sm font-medium text-neutral-500">Nome do Estabelecimento</h3>
                            <p className="font-medium">
                              {providerSettings?.businessName || user?.name || "Não configurado"}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-neutral-500">Descrição</h3>
                            <p className="font-medium">
                              {providerSettings?.description || "Descrição não configurada"}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-neutral-500">Especialidades</h3>
                            <p className="font-medium">
                              {providerSettings?.specialties ? 
                                providerSettings.specialties.split(',').map(item => 
                                  item.trim()).join(', ') 
                              : "Especialidades não configuradas"}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-neutral-500 flex items-center">
                              <Clock className="h-4 w-4 mr-1 text-neutral-400" />
                              Horário de Funcionamento
                            </h3>
                            <p className="font-medium whitespace-pre-line">
                              {providerSettings?.businessHours || "Horários não configurados"}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-end">
                      {isEditing ? (
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsEditing(false)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleSaveChanges}
                            disabled={updateSettingsMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {updateSettingsMutation.isPending ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditing(true)}
                        >
                          Editar Informações
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                {/* Contact Information Tab - COMENTADO TEMPORARIAMENTE */}
                {/* 
                <TabsContent value="contact">
                  <Card className="border border-neutral-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <MapPin className="h-5 w-5 mr-2 text-primary" />
                        Informações de Contato
                      </CardTitle>
                      <CardDescription>
                        Configure seus dados de contato e endereço
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="address">Endereço</Label>
                            <Textarea
                              id="address"
                              value={address}
                              onChange={(e) => setAddress(e.target.value)}
                              placeholder="Rua, número, complemento"
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="city">Cidade</Label>
                              <Input
                                id="city"
                                value={city}
                                onChange={(e) => setCity(e.target.value)}
                                placeholder="Cidade"
                              />
                            </div>
                            <div>
                              <Label htmlFor="state">Estado</Label>
                              <Input
                                id="state"
                                value={state}
                                onChange={(e) => setState(e.target.value)}
                                placeholder="Estado"
                              />
                            </div>
                          </div>
                          <div>
                            <Label htmlFor="postal-code">CEP</Label>
                            <Input
                              id="postal-code"
                              value={postalCode}
                              onChange={(e) => setPostalCode(e.target.value)}
                              placeholder="00000-000"
                            />
                          </div>
                          <div>
                            <Label htmlFor="phone">Telefone</Label>
                            <Input
                              id="phone"
                              value={phone}
                              onChange={(e) => setPhone(e.target.value)}
                              placeholder="(00) 0000-0000"
                            />
                          </div>
                          <div>
                            <Label htmlFor="whatsapp">WhatsApp</Label>
                            <Input
                              id="whatsapp"
                              value={whatsapp}
                              onChange={(e) => setWhatsapp(e.target.value)}
                              placeholder="(00) 00000-0000"
                            />
                          </div>
                          <div>
                            <Label htmlFor="email">Email de Contato</Label>
                            <Input
                              id="email"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="email@exemplo.com"
                              type="email"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-sm font-medium text-neutral-500 flex items-center">
                              <MapPin className="h-4 w-4 mr-1 text-neutral-400" />
                              Endereço
                            </h3>
                            <p className="font-medium">
                              {providerSettings?.address || "Endereço não configurado"}
                            </p>
                            {(providerSettings?.city || providerSettings?.state) && (
                              <p className="font-medium">
                                {[providerSettings.city, providerSettings.state].filter(Boolean).join(", ")}
                                {providerSettings?.postalCode && ` - CEP: ${providerSettings.postalCode}`}
                              </p>
                            )}
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-neutral-500 flex items-center">
                              <Phone className="h-4 w-4 mr-1 text-neutral-400" />
                              Telefone
                            </h3>
                            <p className="font-medium">
                              {providerSettings?.phone || "Telefone não configurado"}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-neutral-500 flex items-center">
                              <MessageSquare className="h-4 w-4 mr-1 text-neutral-400" />
                              WhatsApp
                            </h3>
                            <p className="font-medium">
                              {providerSettings?.whatsapp || "WhatsApp não configurado"}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-neutral-500">Email de Contato</h3>
                            <p className="font-medium">
                              {providerSettings?.email || user?.email || "Email não configurado"}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-end">
                      {isEditing ? (
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsEditing(false)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleSaveChanges}
                            disabled={updateSettingsMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {updateSettingsMutation.isPending ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditing(true)}
                        >
                          Editar Informações
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </TabsContent>
                */}
                
                {/* Online Presence Tab */}
                <TabsContent value="online">
                  <Card className="border border-neutral-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <Globe className="h-5 w-5 mr-2 text-primary" />
                        Presença Online
                      </CardTitle>
                      <CardDescription>
                        Configure suas redes sociais e website
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isEditing ? (
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="website">Website</Label>
                            <Input
                              id="website"
                              value={website}
                              onChange={(e) => setWebsite(e.target.value)}
                              placeholder="https://www.seusite.com"
                            />
                          </div>
                          <div>
                            <Label htmlFor="instagram">Instagram</Label>
                            <Input
                              id="instagram"
                              value={instagram}
                              onChange={(e) => setInstagram(e.target.value)}
                              placeholder="seu_instagram"
                            />
                          </div>
                          <div>
                            <Label htmlFor="facebook">Facebook</Label>
                            <Input
                              id="facebook"
                              value={facebook}
                              onChange={(e) => setFacebook(e.target.value)}
                              placeholder="sua_pagina_facebook"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <div>
                            <h3 className="text-sm font-medium text-neutral-500 flex items-center">
                              <Globe className="h-4 w-4 mr-1 text-neutral-400" />
                              Website
                            </h3>
                            <p className="font-medium">
                              {providerSettings?.website ? (
                                <a href={providerSettings.website} target="_blank" rel="noopener noreferrer" className="text-primary">
                                  {providerSettings.website}
                                </a>
                              ) : "Website não configurado"}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-neutral-500 flex items-center">
                              <Instagram className="h-4 w-4 mr-1 text-neutral-400" />
                              Instagram
                            </h3>
                            <p className="font-medium">
                              {providerSettings?.instagram ? (
                                <a href={`https://instagram.com/${providerSettings.instagram}`} target="_blank" rel="noopener noreferrer" className="text-primary">
                                  @{providerSettings.instagram}
                                </a>
                              ) : "Instagram não configurado"}
                            </p>
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-neutral-500 flex items-center">
                              <Facebook className="h-4 w-4 mr-1 text-neutral-400" />
                              Facebook
                            </h3>
                            <p className="font-medium">
                              {providerSettings?.facebook ? (
                                <a href={`https://facebook.com/${providerSettings.facebook}`} target="_blank" rel="noopener noreferrer" className="text-primary">
                                  {providerSettings.facebook}
                                </a>
                              ) : "Facebook não configurado"}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-end">
                      {isEditing ? (
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsEditing(false)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleSaveChanges}
                            disabled={updateSettingsMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {updateSettingsMutation.isPending ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditing(true)}
                        >
                          Editar Informações
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </TabsContent>
                
                {/* Payment Options Tab */}
                <TabsContent value="payment">
                  <Card className="border border-neutral-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg flex items-center">
                        <CircleDollarSign className="h-5 w-5 mr-2 text-primary" />
                        Opções de Pagamento
                      </CardTitle>
                      <CardDescription>
                        Configure as formas de pagamento que você aceita
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {isEditing ? (
                        <div className="space-y-4">
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="acceptsCards" 
                              checked={acceptsCards}
                              onCheckedChange={(checked) => setAcceptsCards(!!checked)}
                            />
                            <Label htmlFor="acceptsCards" className="flex items-center">
                              <CreditCard className="h-4 w-4 mr-2 text-neutral-500" />
                              Aceita Cartões de Crédito/Débito
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="acceptsPix" 
                              checked={acceptsPix}
                              onCheckedChange={(checked) => setAcceptsPix(!!checked)}
                            />
                            <Label htmlFor="acceptsPix" className="flex items-center">
                              <img 
                                src="https://www.bcb.gov.br/content/estabilidadefinanceira/pix/logo_pix.png" 
                                alt="Pix" 
                                className="h-4 w-4 mr-2"
                              />
                              Aceita Pix
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Checkbox 
                              id="acceptsCash" 
                              checked={acceptsCash}
                              onCheckedChange={(checked) => setAcceptsCash(!!checked)}
                            />
                            <Label htmlFor="acceptsCash" className="flex items-center">
                              <Banknote className="h-4 w-4 mr-2 text-neutral-500" />
                              Aceita Dinheiro
                            </Label>
                          </div>

                          <div className="mt-6 pt-4 border-t border-neutral-200">
                            <h3 className="text-sm font-semibold mb-3">Pagamentos Online</h3>
                            
                            <div className="flex items-center space-x-2 mb-3">
                              <Checkbox 
                                id="acceptOnlinePayments" 
                                checked={acceptOnlinePayments}
                                onCheckedChange={(checked) => setAcceptOnlinePayments(!!checked)}
                              />
                              <Label htmlFor="acceptOnlinePayments" className="flex items-center">
                                <CreditCardIcon className="h-4 w-4 mr-2 text-neutral-500" />
                                Receber pagamentos online via SumUp
                              </Label>
                            </div>
                            
                            {/* Configuração Asaas */}
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center">
                                  <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                                  <h4 className="font-medium text-blue-900">Sistema de Pagamentos Asaas</h4>
                                </div>
                                <Badge variant="secondary" className="text-xs">
                                  Marketplace
                                </Badge>
                              </div>
                              <p className="text-sm text-blue-700 mb-3">
                                Configure sua conta para receber pagamentos automaticamente dos clientes.
                              </p>
                              <div className="flex gap-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  onClick={() => setLocation('/provider/asaas-onboarding')}
                                  className="flex-1"
                                >
                                  <Settings className="h-4 w-4 mr-2" />
                                  Configurar Conta
                                </Button>
                                <Button 
                                  size="sm"
                                  onClick={() => setLocation('/provider/payment-balance')}
                                  className="flex-1"
                                >
                                  <DollarSign className="h-4 w-4 mr-2" />
                                  Ver Saldo
                                </Button>
                              </div>
                            </div>
                            
                            {acceptOnlinePayments && (
                              <div className="ml-6 mt-2">
                                <Label htmlFor="merchantCode" className="text-sm text-neutral-500 mb-1 block">
                                  Código de Comerciante SumUp
                                </Label>
                                <div className="flex items-center gap-2">
                                  <Input 
                                    id="merchantCode"
                                    value={merchantCode}
                                    onChange={(e) => setMerchantCode(e.target.value)}
                                    placeholder="Digite seu código de comerciante"
                                    className="max-w-xs"
                                  />
                                  <AlertCircle className="h-4 w-4 text-amber-500 cursor-help" />
                                </div>
                                {!merchantCode && acceptOnlinePayments && (
                                  <div className="mt-2 text-xs text-amber-500 flex items-center">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Você precisa informar o código de comerciante para receber pagamentos online
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          <h3 className="text-sm font-medium text-neutral-500">Formas de Pagamento Aceitas</h3>
                          <div className="flex flex-col space-y-2">
                            <div className={`flex items-center ${providerSettings?.acceptsCards ? "text-black" : "text-neutral-400"}`}>
                              <CreditCard className="h-4 w-4 mr-2" />
                              Cartões de Crédito/Débito
                              {providerSettings?.acceptsCards && <Check className="h-4 w-4 ml-2 text-green-500" />}
                            </div>
                            <div className={`flex items-center ${providerSettings?.acceptsPix ? "text-black" : "text-neutral-400"}`}>
                              <img 
                                src="https://www.bcb.gov.br/content/estabilidadefinanceira/pix/logo_pix.png" 
                                alt="Pix" 
                                className="h-4 w-4 mr-2"
                              />
                              Pix
                              {providerSettings?.acceptsPix && <Check className="h-4 w-4 ml-2 text-green-500" />}
                            </div>
                            <div className={`flex items-center ${providerSettings?.acceptsCash ? "text-black" : "text-neutral-400"}`}>
                              <Banknote className="h-4 w-4 mr-2" />
                              Dinheiro
                              {providerSettings?.acceptsCash && <Check className="h-4 w-4 ml-2 text-green-500" />}
                            </div>
                            
                            {providerSettings?.acceptOnlinePayments && (
                              <div className="mt-4 pt-3 border-t border-neutral-200">
                                <div className="flex items-center text-black">
                                  <CreditCardIcon className="h-4 w-4 mr-2" />
                                  Pagamentos online via SumUp
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-green-100 text-green-800 rounded-full">
                                    Ativado
                                  </span>
                                </div>
                                {providerSettings.merchantCode ? (
                                  <div className="text-xs text-neutral-500 ml-6 mt-1">
                                    Código de comerciante configurado
                                  </div>
                                ) : (
                                  <div className="text-xs text-amber-500 ml-6 mt-1 flex items-center">
                                    <AlertTriangle className="h-3 w-3 mr-1" />
                                    Código de comerciante não configurado
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Sistema Asaas - Visualização */}
                            <div className="mt-4 pt-3 border-t border-neutral-200">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-black">
                                  <DollarSign className="h-4 w-4 mr-2 text-blue-600" />
                                  Sistema de Pagamentos Asaas
                                  <span className="ml-2 text-xs px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                                    Marketplace
                                  </span>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => setLocation('/provider/asaas-onboarding')}
                                  >
                                    <Settings className="h-4 w-4 mr-2" />
                                    Configurar
                                  </Button>
                                  <Button 
                                    size="sm"
                                    onClick={() => setLocation('/provider/payment-balance')}
                                  >
                                    <DollarSign className="h-4 w-4 mr-2" />
                                    Saldo
                                  </Button>
                                  <Button 
                                    size="sm"
                                    variant="secondary"
                                    onClick={() => setLocation('/provider/asaas-payments')}
                                  >
                                    <Shield className="h-4 w-4 mr-2" />
                                    Pagamentos
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-end">
                      {isEditing ? (
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsEditing(false)}
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleSaveChanges}
                            disabled={updateSettingsMutation.isPending}
                          >
                            <Check className="h-4 w-4 mr-2" />
                            {updateSettingsMutation.isPending ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditing(true)}
                        >
                          Editar Informações
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </TabsContent>
              </Tabs>
              
              {/* Profile Image Card */}
              <Card className="border border-neutral-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center">
                    <ImageIcon className="h-5 w-5 mr-2 text-primary" />
                    Imagens
                  </CardTitle>
                  <CardDescription>
                    Atualize suas imagens de perfil e capa
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500 mb-2">Foto de Perfil</h3>
                      <div className="flex items-center">
                        <div className="w-16 h-16 rounded-full bg-neutral-100 overflow-hidden mr-4">
                          {user?.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt="Profile"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = "/src/assets/service-images/perfil de usuario.png";
                              }}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Store className="h-8 w-8 text-neutral-400" />
                            </div>
                          )}
                        </div>
                        <input
                          type="file"
                          ref={profileImageInputRef}
                          onChange={handleProfileImageUpload}
                          accept="image/*"
                          className="hidden"
                          id="profile-image-input"
                        />
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="text-xs flex-1"
                            onClick={() => profileImageInputRef.current?.click()}
                            disabled={uploadingProfileImage}
                          >
                            {uploadingProfileImage ? (
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            ) : (
                              <UploadCloud className="h-3 w-3 mr-1" />
                            )}
                            {uploadingProfileImage ? "Enviando..." : "Galeria / Câmera"}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium text-neutral-500 mb-2">Imagem de Capa</h3>
                      <div className="rounded-lg bg-neutral-100 h-32 relative overflow-hidden mb-2">
                        {providerSettings?.coverImage ? (
                          <img
                            src={providerSettings.coverImage}
                            alt="Cover"
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.src = "https://via.placeholder.com/400x150?text=Cover+Image";
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-neutral-400" />
                          </div>
                        )}
                      </div>
                      <input
                        type="file"
                        ref={coverImageInputRef}
                        onChange={handleCoverImageUpload}
                        accept="image/*"
                        className="hidden"
                        id="cover-image-input"
                      />
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs flex-1"
                          onClick={() => coverImageInputRef.current?.click()}
                          disabled={uploadingCoverImage}
                        >
                          {uploadingCoverImage ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <UploadCloud className="h-3 w-3 mr-1" />
                          )}
                          {uploadingCoverImage ? "Enviando..." : "Galeria / Câmera"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Receba pagamentos online Card - COMENTADO TEMPORARIAMENTE */}
              {/*
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    Conta de Pagamentos Asaas
                  </CardTitle>
                  <CardDescription>
                    Configure sua conta Asaas para receber pagamentos automaticamente dos clientes com custódia segura.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-medium text-blue-900 mb-2">Como funciona:</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Cliente paga o valor total (ex: R$ 30,00)</li>
                      <li>• Taxa da plataforma (R$ 1,75) vai direto para empresa</li>
                      <li>• Valor do serviço (R$ 28,25) fica retido na custódia</li>
                      <li>• Você libera o valor quando confirmar o serviço</li>
                    </ul>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setLocation('/provider/asaas-onboarding')}
                      className="flex-1 text-lg py-3"
                      variant="default"
                    >
                      <Settings className="mr-2 h-5 w-5" />
                      Criar/Configurar Conta Asaas
                    </Button>
                    <Button
                      onClick={() => setLocation('/provider/asaas-payments')}
                      className="flex-1 text-lg py-3"
                      variant="outline"
                    >
                      <Shield className="mr-2 h-5 w-5" />
                      Ver Pagamentos/Custódia
                    </Button>
                  </div>
                </CardContent>
              </Card>
              */}
              
              {/* Support Button */}
              <Button 
                variant="outline" 
                className="w-full mb-3"
                onClick={() => window.location.href = "/provider/support"}
              >
                <MessageSquare className="mr-2 h-4 w-4" />
                Suporte
              </Button>
              
              {/* Logout Button */}
              <Button 
                variant="outline" 
                className="w-full border-red-500 text-red-500 hover:bg-red-50"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sair da conta
              </Button>
            </>
          )}
        </div>
        
        {/* Logout Confirmation Dialog */}
        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sair da conta</DialogTitle>
              <DialogDescription>
                Tem certeza que deseja sair da sua conta?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => setLogoutDialogOpen(false)}
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={confirmLogout}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending ? "Saindo..." : "Sair da conta"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProviderLayout>
  );
}
