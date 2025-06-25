import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import AppHeader from "@/components/layout/app-header";
import ProviderNavbar from "@/components/layout/provider-navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
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
  MapPin, 
  Image as ImageIcon, 
  Check, 
  LogOut,
  UploadCloud,
  X,
  Clock,
  Phone,
  Globe,
  Instagram,
  Facebook,
  CreditCard,
  Banknote,
  CircleDollarSign,
  MessageSquare,
  AlertCircle,
  CreditCardIcon,
  BadgeHelp,
  AlertTriangle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function ProviderProfilePage() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  
  // State for editing
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState("business");
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  
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
  
  // Contact Information states
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  
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
  
  // Fetch provider settings
  const { data: providerSettings, isLoading } = useQuery({
    queryKey: ["/api/provider-settings"],
    onSuccess: (data) => {
      if (data) {
        // Business Information
        setBusinessName(data.businessName || "");
        setDescription(data.description || "");
        setSpecialties(data.specialties || "");
        
        // Contact Information
        setAddress(data.address || "");
        setCity(data.city || "");
        setState(data.state || "");
        setPostalCode(data.postalCode || "");
        setPhone(data.phone || "");
        setWhatsapp(data.whatsapp || "");
        setEmail(data.email || user?.email || "");
        
        // Online Presence
        setWebsite(data.website || "");
        setInstagram(data.instagram || "");
        setFacebook(data.facebook || "");
        
        // Payment Options
        setAcceptsCards(data.acceptsCards !== undefined ? data.acceptsCards : true);
        setAcceptsPix(data.acceptsPix !== undefined ? data.acceptsPix : true);
        setAcceptsCash(data.acceptsCash !== undefined ? data.acceptsCash : true);
        setAcceptOnlinePayments(data.acceptOnlinePayments !== undefined ? data.acceptOnlinePayments : false);
        setMerchantCode(data.merchantCode || "");
        
        // Business Hours
        setBusinessHours(data.businessHours || "");
      }
    }
  });
  
  // Update provider settings mutation
  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const res = await apiRequest("PUT", "/api/provider-settings", settingsData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-settings"] });
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
      
      // Contact Information
      address,
      city,
      state,
      postalCode,
      phone,
      whatsapp,
      email,
      
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
    logoutMutation.mutate();
    setLogoutDialogOpen(false);
  };
  
  // Função para upload de imagem de perfil
  const handleProfileImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('profileImage', file);
    
    try {
      setUploadingProfileImage(true);
      
      const response = await fetch(`/api/users/${user?.id}/profile-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload da imagem');
      }
      
      const result = await response.json();
      
      // Invalidar consultas para atualizar o perfil
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      
      toast({
        title: "Imagem atualizada",
        description: "Sua foto de perfil foi atualizada com sucesso.",
      });
      
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setUploadingProfileImage(false);
      // Limpar input de arquivo
      if (profileImageInputRef.current) {
        profileImageInputRef.current.value = '';
      }
    }
  };
  
  // Função para upload de imagem de capa
  const handleCoverImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }
    
    const file = event.target.files[0];
    const formData = new FormData();
    formData.append('coverImage', file);
    
    try {
      setUploadingCoverImage(true);
      
      const response = await fetch(`/api/providers/${user?.id}/cover-image`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao fazer upload da imagem de capa');
      }
      
      const result = await response.json();
      
      // Invalidar consultas para atualizar as configurações do prestador
      queryClient.invalidateQueries({ queryKey: ["/api/provider-settings"] });
      
      toast({
        title: "Imagem de capa atualizada",
        description: "Sua imagem de capa foi atualizada com sucesso.",
      });
      
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível enviar a imagem de capa.",
        variant: "destructive",
      });
    } finally {
      setUploadingCoverImage(false);
      // Limpar input de arquivo
      if (coverImageInputRef.current) {
        coverImageInputRef.current.value = '';
      }
    }
  };
  
  return (
    <div className="min-h-screen bg-white pb-20">
      <AppHeader title="Perfil do Prestador" showBackButton />
      
      <div className="p-4 space-y-6">
        {isLoading ? (
          <p className="text-center py-8">Carregando informações do perfil...</p>
        ) : (
          <>
            {/* Status Card */}
            <Card className="border border-neutral-200">
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-medium text-neutral-500">Status</h3>
                    <div className="flex items-center">
                      <div className={`w-2 h-2 rounded-full ${providerSettings?.isOnline ? "bg-green-500" : "bg-red-500"} mr-2`}></div>
                      <p className="font-medium">{providerSettings?.isOnline ? "Online" : "Offline"}</p>
                    </div>
                  </div>
                  <Switch 
                    checked={providerSettings?.isOnline || false}
                    onCheckedChange={(checked) => {
                      updateSettingsMutation.mutate({ isOnline: checked });
                    }}
                  />
                </div>
              </CardContent>
            </Card>
            
            {/* Tabs for different sections */}
            <Tabs defaultValue="business" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid grid-cols-4 mb-4">
                <TabsTrigger value="business">Negócio</TabsTrigger>
                <TabsTrigger value="contact">Contato</TabsTrigger>
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
              
              {/* Contact Information Tab */}
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
                                <AlertCircle className="h-4 w-4 text-amber-500 cursor-help" 
                                  title="Seu código de comerciante está disponível no painel da SumUp" />
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
                              e.currentTarget.src = "https://via.placeholder.com/64?text=Profile";
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
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs"
                        onClick={() => profileImageInputRef.current?.click()}
                        disabled={uploadingProfileImage}
                      >
                        {uploadingProfileImage ? (
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                        ) : (
                          <UploadCloud className="h-3 w-3 mr-1" />
                        )}
                        {uploadingProfileImage ? "Enviando..." : "Atualizar"}
                      </Button>
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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="text-xs w-full"
                      onClick={() => coverImageInputRef.current?.click()}
                      disabled={uploadingCoverImage}
                    >
                      {uploadingCoverImage ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <UploadCloud className="h-3 w-3 mr-1" />
                      )}
                      {uploadingCoverImage ? "Enviando..." : "Atualizar Imagem de Capa"}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
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
      
      <ProviderNavbar />
      
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
  );
}
