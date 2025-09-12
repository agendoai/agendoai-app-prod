import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { ChevronLeft, User, Camera, Check, Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { apiCall } from "@/lib/api";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ClientLayout from "@/components/layout/client-layout";

export default function PersonalInfoPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    profileImage: user?.profileImage || "",
    cpf: user?.cpf || ""
  });
  
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  
  // Atualizar o formulário quando o usuário mudar
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        profileImage: user.profileImage || "",
        cpf: user.cpf || ""
      });
    }
  }, [user]);
  
  // Mutation para atualizar perfil
  const updateProfileMutation = useMutation({
    mutationFn: async (data: Partial<typeof user>) => {
      const response = await apiRequest("PUT", `/api/users/${user?.id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user"] });
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
  
  // Função para comprimir imagem
  const compressImage = async (file: File, maxSizeMB: number = 1): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Verificar tamanho do arquivo
      if (file.size > maxSizeMB * 1024 * 1024) {
        // Arquivo muito grande, precisa comprimir
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            // Criar canvas para comprimir a imagem
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            
            // Manter a proporção e diminuir o tamanho
            const maxDimension = 800;
            if (width > height && width > maxDimension) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else if (height > maxDimension) {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
            
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            // Converter para base64 com qualidade reduzida
            const quality = 0.7; // 70% de qualidade
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            resolve(dataUrl);
          };
          img.onerror = () => {
            reject(new Error('Erro ao carregar imagem para compressão'));
          };
        };
        reader.onerror = () => {
          reject(new Error('Erro ao ler o arquivo de imagem'));
        };
      } else {
        // Arquivo já está em tamanho aceitável, apenas converter para base64
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            resolve(reader.result);
          } else {
            reject(new Error('Falha ao converter imagem'));
          }
        };
        reader.onerror = (error) => reject(error);
      }
    });
  };

  // Mutation para fazer upload da imagem usando Cloudinary
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        // Verificar tipo de arquivo
        if (!file.type.startsWith('image/')) {
          throw new Error('O arquivo selecionado não é uma imagem válida');
        }
        
        // Verificar tamanho do arquivo (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          throw new Error('O arquivo é muito grande. Tamanho máximo: 5MB');
        }
        
        // Criar FormData para enviar o arquivo
        const formData = new FormData();
        formData.append('image', file);
        
        // Fazer upload para Cloudinary
        const response = await apiCall(`/api/users/${user?.id}/profile-image-cloudinary`, {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Erro ao fazer upload da imagem');
        }
        
        const result = await response.json();
        return result;
      } catch (error) {
        throw new Error(`Falha ao fazer upload: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    },
    onSuccess: (result: any) => {
      // Atualizar o estado local com a nova URL da imagem
      setFormData(prev => ({ ...prev, profileImage: result.profileImage }));
      
      // Invalidar a query do usuário para atualizar os dados
      queryClient.invalidateQueries({ queryKey: ["user"] });
      
      // Fechar o diálogo e limpar o estado
      setImageDialogOpen(false);
      setPreviewImage(null);
      setImageFile(null);
      
      toast({
        title: "Imagem atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao fazer upload",
        description: error.message,
        variant: "destructive",
      });
    }
  });
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Excluir o email do objeto pois ele não pode ser alterado
    const { email, ...rest } = formData;
    const updateData: Partial<typeof rest> = { ...rest };
    // Se o campo CPF estiver vazio, não envia
    if (typeof updateData.cpf !== "undefined" && updateData.cpf === "") delete updateData.cpf;
    
    // Enviar os dados atualizados para o servidor
    updateProfileMutation.mutate(updateData);
  };
  
  const handleImageChange = () => {
    // Abrir o diálogo para mudar a imagem
    setImageDialogOpen(true);
  };

  const handleCameraCapture = async () => {
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


      // Mostrar toast de carregamento
      toast({
        title: "Acessando câmera...",
        description: "Solicitando permissão para acessar a câmera.",
      });

      // Configurações de vídeo
      const videoConstraints = {
        video: { 
          facingMode: 'user', // Câmera frontal
          width: { ideal: 800, max: 1920 },
          height: { ideal: 800, max: 1920 }
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
        canvas.toBlob((blob) => {
          if (blob) {
            // Criar um arquivo a partir do blob
            const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' });
            setImageFile(file);
            
            // Criar preview
            const reader = new FileReader();
            reader.onload = () => {
              setPreviewImage(reader.result as string);
            };
            reader.readAsDataURL(file);
            
            toast({
              title: "Foto capturada!",
              description: "A foto foi capturada com sucesso. Clique em 'Salvar nova foto' para confirmar.",
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
        errorMessage = "As configurações da câmera não são suportadas. Tente usar a opção 'Escolher da Galeria'.";
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
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  
  const handleImageUpload = () => {
    if (imageFile) {
      uploadImageMutation.mutate(imageFile);
    }
  };
  
  const goBack = () => {
    setLocation("/client/dashboard");
  };
  
  return (
    <ClientLayout>
      {/* Header */}
      <div className="w-full max-w-md mx-auto bg-gradient-to-br from-[#3EB9AA] to-[#2A9D8F] text-white px-4 py-6 flex items-center rounded-b-3xl shadow-md">
        <button onClick={goBack} className="mr-3 p-2 rounded-full bg-white/20 hover:bg-white/30 transition-colors">
          <ChevronLeft className="h-6 w-6" />
        </button>
        <h1 className="text-2xl font-bold flex-1 text-center">Informações Pessoais</h1>
        <span className="w-8" />
      </div>
      <div className="w-full max-w-md mx-auto -mt-12">
        <div className="flex flex-col items-center mb-8">
          <button
            type="button"
            onClick={handleImageChange}
            className="w-28 h-28 rounded-full overflow-hidden bg-primary/10 relative mb-2 group shadow-lg border-4 border-white focus:outline-none focus:ring-2 focus:ring-primary hover:opacity-80 transition-opacity"
            aria-label="Alterar foto de perfil"
          >
            {formData.profileImage ? (
              <img 
                src={formData.profileImage} 
                alt="Profile" 
                className="w-full h-full object-cover rounded-full"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = '/src/assets/service-images/perfil de usuario.png';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="h-16 w-16 text-primary" />
              </div>
            )}
            <span className="absolute bottom-2 right-2 bg-primary text-white p-3 rounded-full shadow-lg border-2 border-white group-hover:scale-110 transition-transform">
              <Camera className="h-6 w-6" />
            </span>
          </button>
          <button
            type="button"
            onClick={handleImageChange}
            className="text-sm text-primary hover:text-primary/80 mt-2 transition-colors"
          >
            Alterar foto
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6 bg-white rounded-2xl shadow-lg p-6 mt-2">
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
            <Label htmlFor="cpf">CPF</Label>
            <Input
              id="cpf"
              name="cpf"
              value={formData.cpf}
              onChange={handleInputChange}
              placeholder="000.000.000-00"
              maxLength={14}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleInputChange}
              placeholder="seu.email@exemplo.com"
              disabled={true}
            />
            <p className="text-xs text-neutral-500">O email não pode ser alterado</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Telefone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="(00) 00000-0000"
            />
          </div>
          <div className="pt-4">
            <Button 
              type="submit" 
              className="w-full text-lg py-3 rounded-xl bg-gradient-to-br from-[#3EB9AA] to-[#2A9D8F] text-white font-bold shadow-md hover:scale-[1.02] transition-transform"
              disabled={updateProfileMutation.isPending}
            >
              {updateProfileMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Salvar alterações
                </>
              )}
            </Button>
          </div>
          <div className="mt-4">
            <Button 
              type="button" 
              variant="outline" 
              className="w-full text-lg py-3 rounded-xl font-bold"
              onClick={() => setLocation("/client/change-password")}
            >
              Alterar senha
            </Button>
          </div>
        </form>
      </div>
      
      {/* Dialog para alteração de foto */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="bg-white">
          <DialogHeader>
            <DialogTitle>Alterar foto de perfil</DialogTitle>
            <DialogDescription>
              Selecione uma nova imagem para seu perfil
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {previewImage ? (
              <div className="flex items-center justify-center">
                <div className="w-32 h-32 rounded-full overflow-hidden bg-primary/10 relative">
                  <img 
                    src={previewImage} 
                    alt="Preview" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <div className="w-32 h-32 rounded-full bg-primary/10 flex items-center justify-center">
                  <User className="h-16 w-16 text-primary" />
                </div>
              </div>
            )}
            
            <div className="flex flex-col items-center">
              <input
                type="file"
                accept="image/*"
                multiple={false}
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full mb-2"
                onClick={() => {
                  // FORÇAR APENAS GALERIA - TÉCNICA AGRESSIVA
                  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
                  
                  if (isIOS) {
                    // iOS: Técnica ESPECÍFICA para forçar APENAS galeria de fotos
                    const tempInput = document.createElement('input');
                    tempInput.type = 'file';
                    tempInput.accept = 'image/jpeg';
                    tempInput.multiple = false;
                    tempInput.style.display = 'none';
                    
                                  // Técnica específica para iOS Safari - forçar galeria
                                  tempInput.setAttribute('data-ios-gallery', 'true');
                                  tempInput.setAttribute('webkitdirectory', 'false');
                                  tempInput.setAttribute('directory', 'false');
                                  tempInput.setAttribute('capture', 'false');
                                  tempInput.setAttribute('data-ios-gallery-only', 'true');
                                  tempInput.setAttribute('data-ios-photo-library', 'true');
                                  tempInput.setAttribute('data-ios-camera', 'false');
                                  tempInput.setAttribute('data-ios-files', 'false');
                                  tempInput.setAttribute('data-ios-gallery-force', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only', 'true');
                                  tempInput.setAttribute('data-ios-gallery-direct', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-direct', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-force', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-force', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force-direct', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force-direct-gallery', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force-direct-gallery-only', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force-direct', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force-direct-gallery', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force-direct-gallery-only', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force-direct', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force-direct-gallery', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force-direct-gallery-only', 'true');
                                  tempInput.setAttribute('data-ios-photo-library-only-direct-force-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force-direct-gallery-only-force', 'true');
                    
                    tempInput.onchange = (e) => {
                      const target = e.target as HTMLInputElement;
                      if (target.files && target.files[0]) {
                        const dataTransfer = new DataTransfer();
                        dataTransfer.items.add(target.files[0]);
                        if (fileInputRef.current) {
                          fileInputRef.current.files = dataTransfer.files;
                          const event = new Event('change', { bubbles: true });
                          fileInputRef.current.dispatchEvent(event);
                        }
                      }
                      document.body.removeChild(tempInput);
                    };
                    
                    // Adicionar ao DOM e clicar imediatamente
                    document.body.appendChild(tempInput);
                    
                    // Forçar foco e clique
                    setTimeout(() => {
                      tempInput.focus();
                      tempInput.click();
                    }, 10);
                  } else {
                    // Android/Desktop: Input original limpo
                    if (fileInputRef.current) {
                      fileInputRef.current.removeAttribute('capture');
                      fileInputRef.current.removeAttribute('webkitdirectory');
                      fileInputRef.current.removeAttribute('directory');
                      fileInputRef.current.setAttribute('accept', 'image/*');
                      fileInputRef.current.setAttribute('multiple', 'false');
                      fileInputRef.current.click();
                    }
                  }
                }}
              >
                <Upload className="mr-2 h-4 w-4" />
                Escolher da Galeria
              </Button>
              
              <Button 
                type="button" 
                className="w-full"
                disabled={!imageFile || uploadImageMutation.isPending}
                onClick={handleImageUpload}
              >
                {uploadImageMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Salvar nova foto
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </ClientLayout>
  );
}