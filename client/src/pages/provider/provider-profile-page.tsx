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
import { Loader2, Camera } from "lucide-react";
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
  MessageSquare,
  Trash2
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ProviderLayout from "@/components/layout/provider-layout";
import { apiCall } from '@/lib/api';

export default function ProviderProfilePage() {
  const { user, logoutMutation } = useAuth();
  const [, setLocation] = useLocation();
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const [deleteAccountDialogOpen, setDeleteAccountDialogOpen] = useState(false);
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

  // Type para providerSettings
  type ProviderSettings = {
    businessName?: string;
    description?: string;
    specialties?: string;
    website?: string;
    instagram?: string;
    facebook?: string;
    coverImage?: string;
    businessHours?: string;
    isOnline?: boolean;
    acceptsCards?: boolean;
    acceptsPix?: boolean;
    acceptsCash?: boolean;
    acceptOnlinePayments?: boolean;
    merchantCode?: string;
  };

  // Forçar status online quando a página carregar
  useEffect(() => {
    if (providerSettings && !(providerSettings as ProviderSettings).isOnline) {
      forceOnlineStatus();
    }
  }, [providerSettings]);

  // Effect para atualizar os estados quando os dados carregarem
  useEffect(() => {
    if (providerSettings) {
      const settings = providerSettings as ProviderSettings;
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
    onSuccess: () => {
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
  
  // Handle delete account
  const handleDeleteAccount = () => {
    setDeleteAccountDialogOpen(true);
  };
  
  // Delete account mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Usuário não encontrado");
      return await apiRequest("PUT", `/api/users/${user.id}/deactivate`);
    },
    onSuccess: () => {
      toast({
        title: "Conta desativada",
        description: "Sua conta foi desativada com sucesso.",
      });
      
      // Fazer logout após desativar
      setTimeout(() => {
        confirmLogout();
      }, 1000);
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao desativar conta",
        description: error.message || "Ocorreu um erro ao desativar sua conta.",
        variant: "destructive",
      });
    },
  });
  
  const confirmDeleteAccount = () => {
    setDeleteAccountDialogOpen(false);
    deleteAccountMutation.mutate();
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
  

  // Função para detectar se está em WebView do iOS (que causa crash)
  const isIOSWebView = () => {
    // Detectar se é iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!isIOS) return false;
    
    // Detectar WebView do React Native no iOS
    if ((window as any).ReactNativeWebView) return true;
    
    // Detectar WebView nativo do iOS
    if ((window as any).webkit?.messageHandlers) return true;
    
    // Detectar por User Agent específico do iOS WebView
    const userAgent = navigator.userAgent;
    if (userAgent.includes('wv') || userAgent.includes('WebView')) return true;
    
    // Detectar por contexto de app no iOS
    if ((window.navigator as any).standalone === true) return true;
    
    return false;
  };

  // Função específica para iOS WebView - apenas galeria
  const handleIOSWebViewFileSelect = async (type: 'profile' | 'cover') => {
    try {
      // No iOS WebView, usar input simples que abre galeria
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.style.display = 'none';
      
      input.onchange = async (e) => {
        const target = e.target as HTMLInputElement;
        if (target.files && target.files[0]) {
          const file = target.files[0];
          if (type === 'profile') {
            await uploadProfileImage(file);
          } else {
            await uploadCoverImage(file);
          }
        }
        // Limpar o input
        document.body.removeChild(input);
      };
      
      // Adicionar ao DOM e clicar
      document.body.appendChild(input);
      input.click();
      
    } catch (error) {
      
      toast({
        title: "Erro ao selecionar arquivo",
        description: "Não foi possível abrir a galeria. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Estado para controlar o modal de seleção de imagem
  const [showImageSourceModal, setShowImageSourceModal] = useState(false);
  const [imageSourceType, setImageSourceType] = useState<'profile' | 'cover'>('profile');
  
  // Estado para controlar o modal de permissão de câmera
  const [showCameraPermissionModal, setShowCameraPermissionModal] = useState(false);

  // Abrir seletor de arquivo diretamente ao clicar em Trocar Foto
  const handleImageUploadOptions = (type: 'profile' | 'cover') => {
    setImageSourceType(type);
    handleGallerySelect(type);
  };

  // Função para escolher da galeria
  const handleGallerySelect = (type: 'profile' | 'cover') => {
    if (type === 'profile' && profileImageInputRef.current) {
      profileImageInputRef.current.click();
    } else if (type === 'cover' && coverImageInputRef.current) {
      coverImageInputRef.current.click();
    }
    setShowImageSourceModal(false);
  };

  // Função para confirmar troca e abrir seletor de arquivo diretamente
  const handleCameraPermissionConfirmed = () => {
    setShowCameraPermissionModal(false);
    handleGallerySelect(imageSourceType);
  };
 // Função para capturar foto com a câmera
  const handleCameraCapture = async (type: 'profile' | 'cover') => {
    setShowImageSourceModal(false);
    setImageSourceType(type);
    setShowCameraPermissionModal(true);
  };

  // Nova função para lidar com a captura da câmera após confirmação
  const handleCameraCaptureConfirmed = async (type: 'profile' | 'cover') => {
    setShowCameraPermissionModal(false);
    
    try {
      // Verificar se está em WebView do iOS - se sim, usar função específica
      if (isIOSWebView()) {
        await handleIOSWebViewFileSelect(type);
        return;
      }

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

      // Mostrar toast de carregamento
      toast({
        title: "Acessando câmera...",
        description: "Solicitando permissão para acessar a câmera.",
      });

      // Configurações de vídeo
      const videoConstraints = {
        video: { 
          facingMode: 'user', // Câmera frontal
          width: { ideal: type === 'cover' ? 1200 : 800, max: 1920 },
          height: { ideal: type === 'cover' ? 600 : 800, max: 1920 }
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
      
      // Configurações de vídeo
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');
      video.style.width = '100%';
      video.style.height = 'auto';

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
      
      
      let errorMessage = "Não foi possível acessar a câmera.";
      let errorTitle = "Erro na câmera";
      
      if (error.name === 'NotAllowedError') {
        errorTitle = "Permissão da câmera necessária";
        errorMessage = "Para trocar sua foto de " + (type === 'profile' ? 'perfil' : 'capa') + ", precisamos acessar sua câmera. Por favor, permita o acesso à câmera e tente novamente, ou escolha uma foto da galeria.";
        
        // Mostrar opções novamente após erro de permissão
        setTimeout(() => {
          setShowImageSourceModal(true);
        }, 2000);
        
      } else if (error.name === 'NotFoundError') {
        errorTitle = "Câmera não encontrada";
        errorMessage = "Nenhuma câmera encontrada. Verifique se há uma câmera conectada ou escolha uma foto da galeria.";
        
        // Mostrar opções novamente após erro de câmera não encontrada
        setTimeout(() => {
          setShowImageSourceModal(true);
        }, 2000);
        
      } else if (error.name === 'NotReadableError') {
        errorTitle = "Câmera em uso";
        errorMessage = "A câmera está sendo usada por outro aplicativo. Feche outros apps que possam estar usando a câmera ou escolha uma foto da galeria.";
        
        // Mostrar opções novamente após erro de câmera em uso
        setTimeout(() => {
          setShowImageSourceModal(true);
        }, 2000);
        
      } else if (error.name === 'OverconstrainedError') {
        errorTitle = "Configuração não suportada";
        errorMessage = "As configurações da câmera não são suportadas. Tente usar a opção 'Escolher da Galeria'.";
        
        // Mostrar opções novamente após erro de configuração
        setTimeout(() => {
          setShowImageSourceModal(true);
        }, 1500);
        
      } else if (error.name === 'SecurityError') {
        errorTitle = "Erro de segurança";
        errorMessage = "Erro de segurança. Certifique-se de que está usando HTTPS ou localhost, ou escolha uma foto da galeria.";
        
        // Mostrar opções novamente após erro de segurança
        setTimeout(() => {
          setShowImageSourceModal(true);
        }, 2000);
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

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

      // Mostrar toast de carregamento
      toast({
        title: "Acessando câmera...",
        description: "Solicitando permissão para acessar a câmera.",
      });

      // Configurações de vídeo
      const videoConstraints = {
        video: { 
          facingMode: 'user', // Câmera frontal
          width: { ideal: type === 'cover' ? 1200 : 800, max: 1920 },
          height: { ideal: type === 'cover' ? 600 : 800, max: 1920 }
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
      
      // Configurações de vídeo
      video.setAttribute('webkit-playsinline', 'true');
      video.setAttribute('playsinline', 'true');
      video.style.width = '100%';
      video.style.height = 'auto';

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
      
      
      let errorMessage = "Não foi possível acessar a câmera.";
      let errorTitle = "Erro na câmera";
      
      if (error.name === 'NotAllowedError') {
        errorTitle = "Permissão da câmera necessária";
        errorMessage = "Para trocar sua foto de " + (type === 'profile' ? 'perfil' : 'capa') + ", precisamos acessar sua câmera. Por favor, permita o acesso à câmera e tente novamente, ou escolha uma foto da galeria.";
        
        // Mostrar opções novamente após erro de permissão
        setTimeout(() => {
          setShowImageSourceModal(true);
        }, 2000);
        
      } else if (error.name === 'NotFoundError') {
        errorTitle = "Câmera não encontrada";
        errorMessage = "Nenhuma câmera encontrada. Verifique se há uma câmera conectada ou escolha uma foto da galeria.";
        
        // Mostrar opções novamente após erro de câmera não encontrada
        setTimeout(() => {
          setShowImageSourceModal(true);
        }, 2000);
        
      } else if (error.name === 'NotReadableError') {
        errorTitle = "Câmera em uso";
        errorMessage = "A câmera está sendo usada por outro aplicativo. Feche outros apps que possam estar usando a câmera ou escolha uma foto da galeria.";
        
        // Mostrar opções novamente após erro de câmera em uso
        setTimeout(() => {
          setShowImageSourceModal(true);
        }, 2000);
        
      } else if (error.name === 'OverconstrainedError') {
        errorTitle = "Configuração não suportada";
        errorMessage = "As configurações da câmera não são suportadas. Tente usar a opção 'Escolher da Galeria'.";
        
        // Mostrar opções novamente após erro de configuração
        setTimeout(() => {
          setShowImageSourceModal(true);
        }, 1500);
        
      } else if (error.name === 'SecurityError') {
        errorTitle = "Erro de segurança";
        errorMessage = "Erro de segurança. Certifique-se de que está usando HTTPS ou localhost, ou escolha uma foto da galeria.";
        
        // Mostrar opções novamente após erro de segurança
        setTimeout(() => {
          setShowImageSourceModal(true);
        }, 2000);
      }
      
      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      });
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

  
  return (
    <ProviderLayout>
      <div className="min-h-screen w-full full-width-screen bg-white relative overflow-hidden">
        {/* Professional Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {/* Subtle Gradient Overlays */}
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#58c9d1]/8 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#58c9d1]/6 to-transparent rounded-full blur-3xl"></div>
          
          {/* Professional Grid Pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(rgba(88,201,209,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(88,201,209,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40"></div>
        </div>
        
        <div className="relative z-10">
        {/* Header com cor padrão azul */}
        <div className="bg-[#58c9d1] py-4 px-4 flex items-center justify-between shadow-lg">
          <div className="flex items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation("/provider/dashboard")}
              className="text-white hover:bg-white/20 mr-3"
            >
              ←
            </Button>
            <h1 className="text-white text-xl font-semibold">Perfil</h1>
          </div>
        </div>
        
        <div className="p-4 md:p-6 lg:p-8 xl:p-12 space-y-6 md:space-y-8 lg:space-y-10 xl:space-y-12 w-full">
          {isLoading ? (
            <p className="text-center py-8">Carregando informações do perfil...</p>
          ) : (
            <>
              {/* Professional Status Card */}
              <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden relative group hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                {/* Subtle Top Border */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#58c9d1]/50 via-[#58c9d1] to-[#58c9d1]/50"></div>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-start">
                      <div className="flex items-center space-x-4 mb-3">
                        {/* Imagem de perfil */}
                        <div className="relative">
                          {user?.profileImage ? (
                            <img
                              src={user.profileImage}
                              alt={user.name || 'Prestador'}
                              className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full object-cover border-2 border-white shadow-lg"
                            />
                          ) : (
                            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-gradient-to-br from-[#3EB9AA] to-[#2A9D8F] flex items-center justify-center text-white text-xl md:text-2xl lg:text-3xl font-medium border-2 border-white shadow-lg">
                              {user?.name?.charAt(0) || 'P'}
                            </div>
                          )}
                          {/* Indicador de status */}
                          <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-white ${(providerSettings as ProviderSettings)?.isOnline ? "bg-green-500" : "bg-red-500"}`}></div>
                        </div>
                        
                        <div>
                          <div className="flex items-center">
                            <div className={`w-3 h-3 rounded-full ${(providerSettings as ProviderSettings)?.isOnline ? "bg-green-500" : "bg-red-500"} mr-3`}></div>
                            <p className="text-lg font-medium text-neutral-900">{(providerSettings as ProviderSettings)?.isOnline ? "Online" : "Offline"}</p>
                          </div>
                        </div>
                      </div>
                      
                      {/* Nome do usuário abaixo da foto e status */}
                      <div className="ml-2">
                        <p className="text-sm font-medium text-neutral-700 truncate max-w-[200px] md:max-w-[250px]" title={user?.name || 'Prestador'}>
                          {user?.name || 'Prestador'}
                        </p>
                      </div>
                      
                      {/* Botão de emergência para forçar online */}
                      {!(providerSettings as ProviderSettings)?.isOnline && (
                        <Button
                          onClick={forceOnlineStatus}
                          className="bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] hover:from-[#4aadb5] hover:to-[#58c9d1] text-white font-medium shadow-lg shadow-[#58c9d1]/30 hover:shadow-xl hover:shadow-[#58c9d1]/40 transition-all duration-300 transform hover:scale-105 border-0 rounded-xl mt-2"
                          size="sm"
                        >
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            <span className="font-medium">Ficar Online</span>
                          </div>
                        </Button>
                      )}
                    </div>
                    
                    <Switch 
                      checked={(providerSettings as ProviderSettings)?.isOnline || false}
                      onCheckedChange={(checked) => {
                        updateSettingsMutation.mutate({ isOnline: checked });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
              
              {/* Tabs for different sections */}
              <Tabs defaultValue="business" value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid grid-cols-2 mb-8 w-full bg-white border border-[#58c9d1]/20 shadow-lg shadow-[#58c9d1]/10 rounded-xl p-1">
                  <TabsTrigger value="business" className="text-sm md:text-base px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#58c9d1] data-[state=active]:to-[#4aadb5] data-[state=active]:text-white data-[state=active]:shadow-md font-medium transition-all duration-300 rounded-lg">
                    💼 Negócio
                  </TabsTrigger>
                  <TabsTrigger value="online" className="text-sm md:text-base px-6 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-[#58c9d1] data-[state=active]:to-[#4aadb5] data-[state=active]:text-white data-[state=active]:shadow-md font-medium transition-all duration-300 rounded-lg">
                    🌐 Online
                  </TabsTrigger>
                </TabsList>
                
                {/* Business Information Tab */}
                <TabsContent value="business">
                  <div className="w-full">
                    <Card className="border border-neutral-200 md:shadow-lg">
                      <CardHeader className="pb-6">
                        <CardTitle className="text-xl md:text-2xl flex items-center font-medium">
                          <div className="p-3 bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] rounded-xl mr-4 shadow-lg">
                            <Store className="h-6 w-6 text-white" />
                          </div>
                          <span className="bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] bg-clip-text text-transparent">
                            Informações do Negócio
                          </span>
                        </CardTitle>
                        <CardDescription className="text-base text-gray-600">
                          Configure os detalhes do seu estabelecimento
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                      {isEditing ? (
                        <div className="space-y-6 md:space-y-8">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                            <div>
                              <Label htmlFor="business-name" className="text-sm md:text-base lg:text-lg">Nome do Estabelecimento</Label>
                              <Input
                                id="business-name"
                                value={businessName}
                                onChange={(e) => setBusinessName(e.target.value)}
                                placeholder="Nome do seu negócio"
                                className="text-sm md:text-base lg:text-lg mt-2"
                              />
                            </div>
                            <div>
                              <Label htmlFor="specialties" className="text-sm md:text-base lg:text-lg">Especialidades</Label>
                              <Input
                                id="specialties"
                                value={specialties}
                                onChange={(e) => setSpecialties(e.target.value)}
                                placeholder="Ex: Corte masculino, Barba, Coloração"
                                className="text-sm md:text-base lg:text-lg mt-2"
                              />
                              <p className="text-xs md:text-sm lg:text-base text-neutral-500 mt-2">
                                Separe as especialidades por vírgula
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                            <div>
                              <Label htmlFor="description" className="text-sm md:text-base lg:text-lg">Descrição do Negócio</Label>
                              <Textarea
                                id="description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Descreva seu negócio"
                                rows={4}
                                className="text-sm md:text-base lg:text-lg mt-2"
                              />
                            </div>
                            <div>
                              <Label htmlFor="business-hours" className="text-sm md:text-base lg:text-lg">Horário de Funcionamento</Label>
                              <Textarea
                                id="business-hours"
                                value={businessHours}
                                onChange={(e) => setBusinessHours(e.target.value)}
                                placeholder="Ex: Segunda a Sexta: 9h às 18h, Sábado: 9h às 13h"
                                rows={4}
                                className="text-sm md:text-base lg:text-lg mt-2"
                              />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-6 md:space-y-8">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                            <div className="bg-gradient-to-br from-gray-50 to-[#58c9d1]/5 p-6 rounded-xl border border-gray-200 hover:border-[#58c9d1]/30 hover:shadow-lg transition-all duration-300">
                              <h3 className="text-base md:text-lg lg:text-xl font-medium text-[#58c9d1] mb-3 flex items-center relative z-10">
                                <div className="w-3 h-3 bg-gradient-to-r from-[#58c9d1] to-cyan-400 rounded-full mr-3 animate-pulse shadow-lg shadow-[#58c9d1]/50"></div>
                                <span className="bg-gradient-to-r from-[#58c9d1] to-cyan-600 bg-clip-text text-transparent">Nome do Estabelecimento</span>
                              </h3>
                              <p className="font-medium text-sm md:text-base lg:text-lg">
                                {(providerSettings as ProviderSettings)?.businessName || user?.name || "Não configurado"}
                              </p>
                            </div>
                            <div className="bg-gradient-to-br from-gray-50 to-[#58c9d1]/5 p-6 rounded-xl border border-gray-200 hover:border-[#58c9d1]/30 hover:shadow-lg transition-all duration-300">
                              <h3 className="text-sm md:text-base lg:text-lg font-medium text-neutral-500 mb-2">Especialidades</h3>
                              <p className="font-medium text-sm md:text-base lg:text-lg">
                                {(providerSettings as ProviderSettings)?.specialties ? 
                                  (providerSettings as ProviderSettings).specialties!.split(',').map((item: string) => 
                                    item.trim()).join(', ') 
                                : "Especialidades não configuradas"}
                              </p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
                            <div className="bg-gradient-to-br from-gray-50 to-[#58c9d1]/5 p-6 rounded-xl border border-gray-200 hover:border-[#58c9d1]/30 hover:shadow-lg transition-all duration-300">
                              <h3 className="text-sm md:text-base lg:text-lg font-medium text-neutral-500 mb-2">Descrição</h3>
                              <p className="font-medium text-sm md:text-base lg:text-lg">
                                {(providerSettings as ProviderSettings)?.description || "Descrição não configurada"}
                              </p>
                            </div>
                            <div className="bg-gradient-to-br from-gray-50 to-[#58c9d1]/5 p-6 rounded-xl border border-gray-200 hover:border-[#58c9d1]/30 hover:shadow-lg transition-all duration-300">
                              <h3 className="text-sm md:text-base lg:text-lg font-medium text-neutral-500 flex items-center mb-2">
                                <Clock className="h-4 w-4 mr-2 text-neutral-400" />
                                Horário de Funcionamento
                              </h3>
                              <p className="font-medium text-sm md:text-base lg:text-lg whitespace-pre-line">
                                {(providerSettings as ProviderSettings)?.businessHours || "Horários não configurados"}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-end">
                      {isEditing ? (
                        <div className="flex space-x-3">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsEditing(false)}
                            className="border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-all duration-200 font-medium"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleSaveChanges}
                            disabled={updateSettingsMutation.isPending}
                            className="bg-gradient-to-r from-primary to-teal-600 hover:from-primary/90 hover:to-teal-700 text-white font-medium shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 disabled:opacity-70 disabled:transform-none"
                          >
                            {updateSettingsMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            {updateSettingsMutation.isPending ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditing(true)}
                          className="border-[#58c9d1] text-[#58c9d1] hover:bg-[#58c9d1]/10 hover:border-[#58c9d1] transition-all duration-300 font-medium shadow-md hover:shadow-lg rounded-lg"
                        >
                          <div className="p-1 bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] rounded mr-2">
                            <Store className="h-3 w-3 text-white" />
                          </div>
                          Editar Informações
                        </Button>
                      )}
                    </CardFooter>
                    </Card>
                  </div>
                </TabsContent>
                
                {/* Contact Information Tab - COMENTADO TEMPORARIAMENTE */}
                {/* 
                <TabsContent value="contact">
                  <Card className="border border-neutral-200 md:shadow-lg">
                    <CardHeader className="pb-4 md:pb-6">
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
                          <div className="grid grid-cols-2 gap-6 md:gap-8 lg:gap-10">
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
                  </div>
                </TabsContent>
                */}
                
                {/* Online Presence Tab */}
                <TabsContent value="online">
                  <div className="w-full">
                    <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                      {/* Professional Header Bar */}
                      <div className="h-1 bg-gradient-to-r from-[#58c9d1]/60 via-[#58c9d1] to-[#58c9d1]/60"></div>
                      <CardHeader className="pb-4 md:pb-6">
                        <CardTitle className="text-lg md:text-xl flex items-center bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] bg-clip-text text-transparent font-medium">
                          <div className="p-2 bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] rounded-lg mr-3 shadow-lg">
                            <Globe className="h-5 w-5 text-white" />
                          </div>
                          Presença Online
                        </CardTitle>
                        <CardDescription className="text-sm md:text-base">
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
                              {(providerSettings as ProviderSettings)?.website ? (
                                <a href={(providerSettings as ProviderSettings).website} target="_blank" rel="noopener noreferrer" className="text-primary">
                                  {(providerSettings as ProviderSettings).website}
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
                              {(providerSettings as ProviderSettings)?.instagram ? (
                                <a href={`https://instagram.com/${(providerSettings as ProviderSettings).instagram}`} target="_blank" rel="noopener noreferrer" className="text-primary">
                                  @{(providerSettings as ProviderSettings).instagram}
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
                              {(providerSettings as ProviderSettings)?.facebook ? (
                                <a href={`https://facebook.com/${(providerSettings as ProviderSettings).facebook}`} target="_blank" rel="noopener noreferrer" className="text-primary">
                                  {(providerSettings as ProviderSettings).facebook}
                                </a>
                              ) : "Facebook não configurado"}
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                    <CardFooter className="pt-0 flex justify-end">
                      {isEditing ? (
                        <div className="flex space-x-3">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsEditing(false)}
                            className="border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 transition-all duration-300 font-medium rounded-lg"
                          >
                            <X className="h-4 w-4 mr-2" />
                            Cancelar
                          </Button>
                          <Button 
                            onClick={handleSaveChanges}
                            disabled={updateSettingsMutation.isPending}
                            className="bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] hover:from-[#4aadb5] hover:to-[#58c9d1] text-white font-medium shadow-lg shadow-[#58c9d1]/30 hover:shadow-xl hover:shadow-[#58c9d1]/40 transition-all duration-300 transform hover:scale-105 disabled:opacity-70 border-0 rounded-lg"
                          >
                            {updateSettingsMutation.isPending ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4 mr-2" />
                            )}
                            {updateSettingsMutation.isPending ? "Salvando..." : "Salvar"}
                          </Button>
                        </div>
                      ) : (
                        <Button 
                          variant="outline" 
                          onClick={() => setIsEditing(true)}
                          className="border-[#58c9d1]/60 text-[#58c9d1] hover:bg-[#58c9d1]/10 hover:border-[#58c9d1] transition-all duration-300 font-medium shadow-lg shadow-[#58c9d1]/20 hover:shadow-xl hover:shadow-[#58c9d1]/30 transform hover:scale-105"
                        >
                          <div className="p-1 bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] rounded mr-2">
                            <Globe className="h-3 w-3 text-white" />
                          </div>
                          Editar Informações
                        </Button>
                      )}
                    </CardFooter>
                    </Card>
                  </div>
                </TabsContent>
                
                {/* Payment Options Tab - REMOVIDO TEMPORARIAMENTE */}
              </Tabs>
              
              {/* Profile Image Card */}
              <div className="w-full">
                <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl overflow-hidden hover:shadow-2xl hover:shadow-[#58c9d1]/15 transition-all duration-500">
                  {/* Professional Header Bar */}
                  <div className="h-1 bg-gradient-to-r from-[#58c9d1]/60 via-[#58c9d1] to-[#58c9d1]/60"></div>
                  
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl md:text-2xl flex items-center font-medium">
                      <div className="p-3 bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] rounded-xl mr-4 shadow-lg">
                        <ImageIcon className="h-6 w-6 text-white" />
                      </div>
                      <span className="bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] bg-clip-text text-transparent">
                        Galeria de Imagens
                      </span>
                    </CardTitle>
                    <CardDescription className="text-base text-gray-600">
                      Atualize suas imagens de perfil e capa
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6 md:space-y-8">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 lg:gap-12">
                        <div className="bg-white p-4 md:p-6 rounded-lg border border-neutral-200">
                          <h3 className="text-sm md:text-base lg:text-lg font-medium text-[#58c9d1] mb-4 flex items-center">
                            <div className="w-2 h-2 bg-[#58c9d1] rounded-full mr-2 animate-pulse"></div>
                            Foto de Perfil
                          </h3>
                          <div className="flex flex-col items-center space-y-4">
                            <div className="w-28 h-28 md:w-36 md:h-36 rounded-full bg-gradient-to-br from-[#58c9d1]/10 to-[#58c9d1]/20 overflow-hidden flex-shrink-0 border-4 border-white shadow-xl shadow-[#58c9d1]/20 ring-4 ring-[#58c9d1]/10 mx-auto">
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
                                  <Store className="h-12 w-12 md:h-16 md:w-16 text-[#58c9d1]/60" />
                                </div>
                              )}
                            </div>
                            <input
                              type="file"
                              ref={profileImageInputRef}
                              onChange={handleProfileImageUpload}
                              accept="image/*"
                              multiple={false}
                              className="hidden"
                              id="profile-image-input"
                            />
                            <div className="flex flex-col space-y-2 w-full max-w-xs">
                              {/* Single button for all screen sizes */}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs md:text-sm w-full border-[#58c9d1] text-[#58c9d1] hover:bg-[#58c9d1]/10 hover:border-[#58c9d1] transition-all duration-300 font-medium shadow-md hover:shadow-lg disabled:opacity-70 rounded-lg py-2 px-3"
                                onClick={() => handleImageUploadOptions('profile')}
                                disabled={uploadingProfileImage}
                              >
                                {uploadingProfileImage ? (
                                  <>
                                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
                                    <span className="text-xs md:text-sm">Enviando...</span>
                                  </>
                                ) : (
                                  <>
                                    <ImageIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                    <span className="text-xs md:text-sm">Trocar Foto</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                        
                        <div className="bg-gradient-to-br from-white to-[#58c9d1]/5 p-4 md:p-6 rounded-xl border border-[#58c9d1]/20 shadow-lg hover:shadow-xl hover:shadow-[#58c9d1]/20 transition-all duration-300 transform hover:scale-[1.02]">
                          <h3 className="text-sm md:text-base lg:text-lg font-medium text-[#58c9d1] mb-4 flex items-center">
                            <div className="w-2 h-2 bg-[#58c9d1] rounded-full mr-2 animate-pulse"></div>
                            Imagem de Capa
                          </h3>
                          <div className="space-y-4">
                            <div className="rounded-xl bg-gradient-to-br from-[#58c9d1]/10 to-[#58c9d1]/20 h-40 md:h-48 lg:h-56 xl:h-64 relative overflow-hidden border-2 border-white shadow-xl shadow-[#58c9d1]/20 ring-4 ring-[#58c9d1]/10">
                              {(providerSettings as ProviderSettings)?.coverImage ? (
                                <img
                                  src={(providerSettings as ProviderSettings).coverImage}
                                  alt="Cover"
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.src = "https://via.placeholder.com/400x150?text=Cover+Image";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center">
                                  <ImageIcon className="h-16 w-16 md:h-20 md:w-20 lg:h-24 lg:w-24 text-[#58c9d1]/60" />
                                </div>
                              )}
                            </div>
                            <input
                              type="file"
                              ref={coverImageInputRef}
                              onChange={handleCoverImageUpload}
                              accept="image/*"
                              multiple={false}
                              className="hidden"
                              id="cover-image-input"
                            />
                            <div className="flex flex-col space-y-2 w-full">
                              {/* Single button for all screen sizes */}
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-xs md:text-sm w-full border-[#58c9d1]/60 text-[#58c9d1] hover:bg-[#58c9d1]/10 hover:border-[#58c9d1] transition-all duration-300 font-medium shadow-lg shadow-[#58c9d1]/10 hover:shadow-xl hover:shadow-[#58c9d1]/20 disabled:opacity-70 transform hover:scale-105 py-2 px-3 md:py-3 md:px-4"
                                onClick={() => handleImageUploadOptions('cover')}
                                disabled={uploadingCoverImage}
                              >
                                {uploadingCoverImage ? (
                                  <>
                                    <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
                                    <span className="text-xs md:text-sm">Enviando...</span>
                                  </>
                                ) : (
                                  <>
                                    <ImageIcon className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                                    <span className="text-xs md:text-sm">Trocar Capa</span>
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
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
              
              {/* Ultra Modern Support and Logout Buttons */}
              <div className="w-full space-y-3">
                <Button 
                  variant="outline" 
                  className="w-full h-10 text-sm border-[#58c9d1] text-[#58c9d1] hover:bg-[#58c9d1]/10 rounded-xl"
                  onClick={() => setLocation("/provider/support")}
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Ajuda e Suporte
                </Button>
                
                <Button 
                  variant="destructive" 
                  className="w-full h-10 text-sm rounded-xl"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Sair da Conta
                </Button>
              </div>
              
              {/* Separação visual para o botão de excluir conta */}
              <div className="w-full mt-8 pt-6 border-t border-red-200">
                <div className="bg-red-50 p-4 rounded-xl border border-red-200 mb-4">
                  <p className="text-sm text-red-700 font-medium text-center">
                    ⚠️ Zona de Perigo
                  </p>
                  <p className="text-xs text-red-600 text-center mt-1">
                    Esta ação é irreversível
                  </p>
                </div>
                
                <Button 
                  variant="outline" 
                  className="w-full h-10 text-sm border-red-500 text-red-500 hover:bg-red-50 rounded-xl"
                  onClick={() => setDeleteAccountDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Excluir Conta
                </Button>
              </div>
            </>
          )}
        </div>
        
        {/* Ultra Modern Logout Confirmation Dialog */}
        <Dialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md bg-gradient-to-br from-white/95 via-white/90 to-slate-50/80 backdrop-blur-2xl border-0 shadow-3xl shadow-slate-900/20 rounded-2xl overflow-hidden relative" style={{ zIndex: 50000, position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            {/* Dialog Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5 opacity-50"></div>
            
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-2xl font-medium bg-gradient-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent flex items-center">
                <div className="p-2 bg-gradient-to-br from-red-500 to-red-700 rounded-xl mr-3 shadow-lg">
                  <LogOut className="h-6 w-6 text-white" />
                </div>
                🚪 Confirmar Saída
              </DialogTitle>
              <DialogDescription className="text-lg text-slate-700 font-medium mt-3">
                ⚠️ Tem certeza que deseja sair da sua conta?
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 mt-6 relative z-10">
              <Button 
                variant="outline" 
                onClick={() => setLogoutDialogOpen(false)}
                className="w-full sm:w-auto border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all duration-500 font-medium px-6 py-3 sm:px-8 shadow-xl hover:shadow-2xl backdrop-blur-sm rounded-2xl transform hover:scale-105 hover:rotate-1 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-200/20 via-transparent to-slate-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 text-base sm:text-lg">❌ Cancelar</span>
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={confirmLogout}
                disabled={logoutMutation.isPending}
                className="w-full sm:w-auto bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-600 hover:to-red-800 text-white font-medium shadow-2xl shadow-red-500/40 hover:shadow-3xl hover:shadow-red-500/60 transition-all duration-500 transform hover:scale-110 hover:rotate-1 disabled:opacity-70 disabled:transform-none px-6 py-3 sm:px-8 border-0 rounded-2xl backdrop-blur-sm relative overflow-hidden group"
              >
                {/* Logout Button Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/30 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                
                <div className="relative z-10 flex items-center text-base sm:text-lg">
                  {logoutMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ⏳ Saindo...
                    </>
                  ) : (
                    <>
                      <LogOut className="h-5 w-5 mr-2" />
                      ✅ Confirmar Saída
                    </>
                  )}
                </div>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Delete Account Confirmation Dialog */}
        <Dialog open={deleteAccountDialogOpen} onOpenChange={setDeleteAccountDialogOpen}>
          <DialogContent className="w-[calc(100vw-2rem)] max-w-md bg-gradient-to-br from-white/95 via-white/90 to-slate-50/80 backdrop-blur-2xl border-0 shadow-3xl shadow-slate-900/20 rounded-2xl overflow-hidden relative" style={{ zIndex: 50000, position: 'fixed', left: '50%', top: '50%', transform: 'translate(-50%, -50%)' }}>
            {/* Dialog Glow Effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-red-500/5 via-transparent to-red-500/5 opacity-50"></div>
            
            <DialogHeader className="relative z-10">
              <DialogTitle className="text-2xl font-medium bg-gradient-to-r from-red-600 via-red-700 to-red-800 bg-clip-text text-transparent flex items-center">
                <div className="p-2 bg-gradient-to-br from-red-500 to-red-700 rounded-xl mr-3 shadow-lg">
                  <Trash2 className="h-6 w-6 text-white" />
                </div>
                🗑️ Excluir Conta
              </DialogTitle>
              <DialogDescription className="text-lg text-slate-700 font-medium mt-3">
                ⚠️ Tem certeza que deseja excluir sua conta? Esta ação irá desativar sua conta permanentemente.
              </DialogDescription>
            </DialogHeader>
            
            <DialogFooter className="flex flex-col space-y-3 sm:flex-row sm:space-y-0 sm:space-x-4 mt-6 relative z-10">
              <Button 
                variant="outline" 
                onClick={() => setDeleteAccountDialogOpen(false)}
                className="w-full sm:w-auto border-2 border-slate-300 text-slate-700 hover:bg-slate-100 hover:border-slate-400 transition-all duration-500 font-medium px-6 py-3 sm:px-8 shadow-xl hover:shadow-2xl backdrop-blur-sm rounded-2xl transform hover:scale-105 hover:rotate-1 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-slate-200/20 via-transparent to-slate-200/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="relative z-10 text-base sm:text-lg">❌ Cancelar</span>
              </Button>
              
              <Button 
                variant="destructive" 
                onClick={confirmDeleteAccount}
                disabled={deleteAccountMutation.isPending}
                className="w-full sm:w-auto bg-gradient-to-r from-red-500 via-red-600 to-red-700 hover:from-red-600 hover:via-red-600 hover:to-red-800 text-white font-medium shadow-2xl shadow-red-500/40 hover:shadow-3xl hover:shadow-red-500/60 transition-all duration-500 transform hover:scale-110 hover:rotate-1 disabled:opacity-70 disabled:transform-none px-6 py-3 sm:px-8 border-0 rounded-2xl backdrop-blur-sm relative overflow-hidden group"
              >
                {/* Delete Button Shimmer */}
                <div className="absolute inset-0 bg-gradient-to-r from-white/30 via-transparent to-white/30 -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out"></div>
                
                <div className="relative z-10 flex items-center text-base sm:text-lg">
                  {deleteAccountMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      ⏳ Excluindo...
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-5 w-5 mr-2" />
                      ✅ Confirmar Exclusão
                    </>
                  )}
                </div>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Modal de seleção de fonte da imagem removido */}
        
        {/* Modal de confirmação removido */}
        </div>
      </div>
    </ProviderLayout>
  );
}
