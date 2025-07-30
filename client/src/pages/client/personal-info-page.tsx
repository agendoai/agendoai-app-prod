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

  // Mutation para fazer upload da imagem
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      try {
        // Verificar tipo de arquivo
        if (!file.type.startsWith('image/')) {
          throw new Error('O arquivo selecionado não é uma imagem válida');
        }
        
        // Comprimir e converter para base64
        return await compressImage(file, 2); // Máximo 2MB após compressão
      } catch (error) {
        throw new Error(`Falha ao processar imagem: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      }
    },
    onSuccess: (base64Image: string) => {
      // Atualizar o perfil com a nova imagem
      updateProfileMutation.mutate({ 
        ...formData, 
        email: undefined,
        profileImage: base64Image 
      });
      setFormData(prev => ({ ...prev, profileImage: base64Image }));
      setImageDialogOpen(false);
      setPreviewImage(null);
      setImageFile(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao fazer upload da imagem",
        description: error.message,
        variant: "destructive"
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
            className="w-28 h-28 rounded-full overflow-hidden bg-primary/10 relative mb-2 group shadow-lg border-4 border-white focus:outline-none focus:ring-2 focus:ring-primary opacity-60 cursor-not-allowed"
            disabled
            aria-label="Alterar foto de perfil"
            tabIndex={-1}
          >
            {formData.profileImage ? (
              <img 
                src={formData.profileImage} 
                alt="Profile" 
                className="w-full h-full object-cover"
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
            className="text-sm text-neutral-500 mt-2 cursor-not-allowed"
            disabled
          >
            Em breve disponível
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
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              <Button
                type="button"
                variant="outline"
                className="w-full mb-2"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Selecionar imagem
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