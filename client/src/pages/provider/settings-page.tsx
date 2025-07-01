import React, { useState, useEffect } from 'react';
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

import {
  Loader2,
  Check,
  X,
  CreditCard,
  Banknote,
  BanknoteIcon,
  CreditCardIcon,
  Clock,
  ArrowLeft,
  Globe,
  Instagram,
  Facebook,
  MapPin,
  Phone,
  Mail,
  MessageSquare
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useLocation } from 'wouter';

interface ProviderSettings {
  id: number;
  providerId: number;
  isOnline: boolean;
  businessName: string | null;
  description: string | null;
  specialties: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
  acceptsCards: boolean;
  acceptsPix: boolean;
  acceptsCash: boolean;
  acceptsTransfer: boolean;
  preferStripe: boolean;
  preferAsaas: boolean;
  preferManual: boolean;
  autoConfirm: boolean;
  requestPrePayment: boolean;
  allowPartialPayment: boolean;
  businessHours: string | null;
  latitude: string | null;
  longitude: string | null;
  coverImage: string | null;
  ratingCount: number;
  rating: number;
}

interface ProviderPaymentPreferences {
  id: number;
  providerId: number;
  acceptsCreditCard: boolean;
  acceptsDebitCard: boolean;
  acceptsPix: boolean;
  acceptsCash: boolean;
  acceptsTransfer: boolean;
  preferStripe: boolean;
  preferAsaas: boolean;
  preferManual: boolean;
  autoConfirm: boolean;
  requestPrePayment: boolean;
  allowPartialPayment: boolean;
  createdAt: string;
  updatedAt: string;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Estado para controlar qual aba está ativa
  const [activeTab, setActiveTab] = useState("business");
  
  // Business Information states
  const [businessName, setBusinessName] = useState("");
  const [description, setDescription] = useState("");
  const [specialties, setSpecialties] = useState("");
  const [businessHours, setBusinessHours] = useState("");
  
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
  const [acceptsTransfer, setAcceptsTransfer] = useState(false);
  const [preferStripe, setPreferStripe] = useState(true);
  const [preferAsaas, setPreferAsaas] = useState(false);
  const [preferManual, setPreferManual] = useState(false);
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [requestPrePayment, setRequestPrePayment] = useState(false);
  const [allowPartialPayment, setAllowPartialPayment] = useState(false);
  
  // Estado para controlar se está online ou offline
  const [isOnline, setIsOnline] = useState(true);
  
  // Buscar configurações do prestador
  const { data: providerSettings, isLoading: isLoadingSettings } = useQuery<ProviderSettings>({
    queryKey: ["/api/provider-settings"]
  });
  
  // Buscar preferências de pagamento
  const { data: paymentPreferences, isLoading: isLoadingPaymentPrefs } = useQuery<ProviderPaymentPreferences>({
    queryKey: ["/api/provider/payment-preferences"]
  });
  
  // Atualizar estados quando os dados forem carregados
  useEffect(() => {
    if (providerSettings) {
      // Atualizar todos os estados com os dados do servidor
      setBusinessName(providerSettings.businessName || "");
      setDescription(providerSettings.description || "");
      setSpecialties(providerSettings.specialties || "");
      setBusinessHours(providerSettings.businessHours || "");
      
      setAddress(providerSettings.address || "");
      setCity(providerSettings.city || "");
      setState(providerSettings.state || "");
      setPostalCode(providerSettings.postalCode || "");
      setPhone(providerSettings.phone || "");
      setWhatsapp(providerSettings.whatsapp || "");
      setEmail(providerSettings.email || user?.email || "");
      
      setWebsite(providerSettings.website || "");
      setInstagram(providerSettings.instagram || "");
      setFacebook(providerSettings.facebook || "");
      
      setIsOnline(providerSettings.isOnline !== undefined ? providerSettings.isOnline : false);
    }
  }, [providerSettings, user?.email]);
  
  // Atualizar estados quando as preferências de pagamento forem carregadas
  useEffect(() => {
    if (paymentPreferences) {
      // Métodos de pagamento
      setAcceptsCards(paymentPreferences.acceptsCreditCard || paymentPreferences.acceptsDebitCard);
      setAcceptsPix(paymentPreferences.acceptsPix !== undefined ? paymentPreferences.acceptsPix : true);
      setAcceptsCash(paymentPreferences.acceptsCash !== undefined ? paymentPreferences.acceptsCash : true);
      setAcceptsTransfer(paymentPreferences.acceptsTransfer !== undefined ? paymentPreferences.acceptsTransfer : false);
      
      // Preferências de processamento
      setPreferStripe(paymentPreferences.preferStripe !== undefined ? paymentPreferences.preferStripe : true);
      setPreferAsaas(paymentPreferences.preferAsaas !== undefined ? paymentPreferences.preferAsaas : false);
      setPreferManual(paymentPreferences.preferManual !== undefined ? paymentPreferences.preferManual : false);
      
      // Configurações adicionais
      setAutoConfirm(paymentPreferences.autoConfirm !== undefined ? paymentPreferences.autoConfirm : false);
      setRequestPrePayment(paymentPreferences.requestPrePayment !== undefined ? paymentPreferences.requestPrePayment : false);
      setAllowPartialPayment(paymentPreferences.allowPartialPayment !== undefined ? paymentPreferences.allowPartialPayment : false);
    }
  }, [paymentPreferences]);
  
  // Mutation para atualizar configurações gerais
  const updateSettingsMutation = useMutation({
    mutationFn: async (settingsData: any) => {
      const res = await apiRequest("PUT", "/api/provider-settings", settingsData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider-settings"] });
      toast({
        title: "Configurações atualizadas",
        description: "Suas configurações foram atualizadas com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar configurações",
        description: error.message || "Ocorreu um erro ao atualizar suas configurações.",
        variant: "destructive"
      });
    }
  });
  
  // Mutation para atualizar preferências de pagamento
  const updatePaymentPrefsMutation = useMutation({
    mutationFn: async (prefsData: any) => {
      const res = await apiRequest("PUT", "/api/provider/payment-preferences", prefsData);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/provider/payment-preferences"] });
      toast({
        title: "Preferências de pagamento atualizadas",
        description: "Suas preferências de pagamento foram atualizadas com sucesso."
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar preferências de pagamento",
        description: error.message || "Ocorreu um erro ao atualizar suas preferências de pagamento.",
        variant: "destructive"
      });
    }
  });
  
  // Handler para salvar alterações
  const handleSaveBusinessInfo = () => {
    updateSettingsMutation.mutate({
      businessName,
      description,
      specialties,
      businessHours
    });
  };
  
  const handleSaveContactInfo = () => {
    updateSettingsMutation.mutate({
      address,
      city,
      state,
      postalCode,
      phone,
      whatsapp,
      email
    });
  };
  
  const handleSaveOnlinePresence = () => {
    updateSettingsMutation.mutate({
      website,
      instagram,
      facebook
    });
  };
  
  const handleSavePaymentMethods = () => {
    updatePaymentPrefsMutation.mutate({
      acceptsCreditCard: acceptsCards,
      acceptsDebitCard: acceptsCards,
      acceptsPix,
      acceptsCash,
      acceptsTransfer,
      preferStripe,
      preferAsaas,
      preferManual,
      autoConfirm,
      requestPrePayment,
      allowPartialPayment
    });
  };
  
  const toggleOnlineStatus = (checked: boolean) => {
    setIsOnline(checked);
    updateSettingsMutation.mutate({ isOnline: checked });
  };
  
  if (isLoadingSettings || isLoadingPaymentPrefs) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="ml-2">Carregando configurações...</span>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen">
      {/* Cabeçalho */}
      <div className="bg-card border-b p-4 shadow-sm">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setLocation('/provider/profile')}
              className="mr-2"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-xl font-semibold">Configurações</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isOnline ? "bg-green-500" : "bg-red-500"}`}></div>
              <span>{isOnline ? "Online" : "Offline"}</span>
            </div>
            <Switch 
              checked={isOnline} 
              onCheckedChange={toggleOnlineStatus}
            />
          </div>
        </div>
      </div>
      
      {/* Conteúdo principal */}
      <div className="flex-1 container py-8">
        <div className="grid gap-8">
          {/* Tabs para diferentes seções de configurações */}
          <Tabs defaultValue="business" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-4 mb-6">
              <TabsTrigger value="business">Negócio</TabsTrigger>
              <TabsTrigger value="contact">Contato</TabsTrigger>
              <TabsTrigger value="online">Presença Online</TabsTrigger>
              <TabsTrigger value="payment">Pagamentos</TabsTrigger>
            </TabsList>
            
            {/* Aba de informações do negócio */}
            <TabsContent value="business">
              <Card>
                <CardHeader>
                  <CardTitle>Informações do Negócio</CardTitle>
                  <CardDescription>
                    Configure as informações básicas do seu negócio que serão exibidas aos clientes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="businessName">Nome do Negócio</Label>
                    <Input 
                      id="businessName" 
                      value={businessName} 
                      onChange={(e) => setBusinessName(e.target.value)} 
                      placeholder="Ex: Salão Beauty Hair"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="description">Descrição</Label>
                    <Textarea 
                      id="description" 
                      value={description} 
                      onChange={(e) => setDescription(e.target.value)} 
                      placeholder="Descreva seu negócio, serviços e diferenciais..."
                      rows={4}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="specialties">Especialidades</Label>
                    <Input 
                      id="specialties" 
                      value={specialties} 
                      onChange={(e) => setSpecialties(e.target.value)} 
                      placeholder="Ex: Corte masculino, Barba, Coloração"
                    />
                    <p className="text-sm text-muted-foreground">
                      Separe as especialidades por vírgula (máximo 5 especialidades).
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="businessHours">Horário de Funcionamento</Label>
                    <Textarea 
                      id="businessHours" 
                      value={businessHours} 
                      onChange={(e) => setBusinessHours(e.target.value)} 
                      placeholder="Ex: Segunda a Sexta: 9h às 18h&#10;Sábado: 9h às 13h&#10;Domingo: Fechado"
                      rows={4}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleSaveBusinessInfo} disabled={updateSettingsMutation.isPending}>
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Aba de informações de contato */}
            <TabsContent value="contact">
              <Card>
                <CardHeader>
                  <CardTitle>Informações de Contato</CardTitle>
                  <CardDescription>
                    Configure as informações de contato que serão exibidas aos clientes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="address">Endereço</Label>
                    <Input 
                      id="address" 
                      value={address} 
                      onChange={(e) => setAddress(e.target.value)} 
                      placeholder="Ex: Rua das Flores, 123"
                    />
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="city">Cidade</Label>
                      <Input 
                        id="city" 
                        value={city} 
                        onChange={(e) => setCity(e.target.value)} 
                        placeholder="Ex: São Paulo"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="state">Estado</Label>
                      <Input 
                        id="state" 
                        value={state} 
                        onChange={(e) => setState(e.target.value)} 
                        placeholder="Ex: SP"
                        maxLength={2}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="postalCode">CEP</Label>
                      <Input 
                        id="postalCode" 
                        value={postalCode} 
                        onChange={(e) => setPostalCode(e.target.value)} 
                        placeholder="Ex: 12345-678"
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefone</Label>
                    <Input 
                      id="phone" 
                      value={phone} 
                      onChange={(e) => setPhone(e.target.value)} 
                      placeholder="Ex: (11) 98765-4321"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">WhatsApp</Label>
                    <Input 
                      id="whatsapp" 
                      value={whatsapp} 
                      onChange={(e) => setWhatsapp(e.target.value)} 
                      placeholder="Ex: (11) 98765-4321"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input 
                      id="email" 
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      placeholder="Ex: contato@exemplo.com"
                      type="email"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleSaveContactInfo} disabled={updateSettingsMutation.isPending}>
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Aba de presença online */}
            <TabsContent value="online">
              <Card>
                <CardHeader>
                  <CardTitle>Presença Online</CardTitle>
                  <CardDescription>
                    Configure suas redes sociais e site para conectar-se com mais clientes.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="website" className="flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      Website
                    </Label>
                    <Input 
                      id="website" 
                      value={website} 
                      onChange={(e) => setWebsite(e.target.value)} 
                      placeholder="Ex: https://www.seusite.com.br"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="instagram" className="flex items-center gap-2">
                      <Instagram className="h-4 w-4" />
                      Instagram
                    </Label>
                    <Input 
                      id="instagram" 
                      value={instagram} 
                      onChange={(e) => setInstagram(e.target.value)} 
                      placeholder="Ex: seu_instagram (sem @)"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="facebook" className="flex items-center gap-2">
                      <Facebook className="h-4 w-4" />
                      Facebook
                    </Label>
                    <Input 
                      id="facebook" 
                      value={facebook} 
                      onChange={(e) => setFacebook(e.target.value)} 
                      placeholder="Ex: seufacebook"
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleSaveOnlinePresence} disabled={updateSettingsMutation.isPending}>
                    {updateSettingsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            {/* Aba de métodos de pagamento */}
            <TabsContent value="payment">
              <Card>
                <CardHeader>
                  <CardTitle>Métodos de Pagamento</CardTitle>
                  <CardDescription>
                    Configure quais métodos de pagamento você aceita em seu negócio.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-6">
                    <div>
                      <h3 className="text-sm font-medium mb-2">Métodos de Pagamento Aceitos</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="acceptsCards" 
                            checked={acceptsCards} 
                            onCheckedChange={(checked) => 
                              setAcceptsCards(checked === true)
                            }
                          />
                          <Label 
                            htmlFor="acceptsCards" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <CreditCard className="h-4 w-4" />
                            <span>Cartões de Crédito/Débito</span>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="acceptsPix" 
                            checked={acceptsPix} 
                            onCheckedChange={(checked) => 
                              setAcceptsPix(checked === true)
                            }
                          />
                          <Label 
                            htmlFor="acceptsPix" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4">
                              <path d="M7 15h0m5-5.5h0M12.5 10h0m4 5h0M7 15l5-5.5m0 0l5 5.5"/>
                            </svg>
                            <span>PIX</span>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="acceptsCash" 
                            checked={acceptsCash} 
                            onCheckedChange={(checked) => 
                              setAcceptsCash(checked === true)
                            }
                          />
                          <Label 
                            htmlFor="acceptsCash" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <Banknote className="h-4 w-4" />
                            <span>Dinheiro</span>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="acceptsTransfer" 
                            checked={acceptsTransfer} 
                            onCheckedChange={(checked) => 
                              setAcceptsTransfer(checked === true)
                            }
                          />
                          <Label 
                            htmlFor="acceptsTransfer" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <BanknoteIcon className="h-4 w-4" />
                            <span>Transferência Bancária</span>
                          </Label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Processadores de Pagamento</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="preferStripe" 
                            checked={preferStripe} 
                            onCheckedChange={(checked) => 
                              setPreferStripe(checked === true)
                            }
                          />
                          <Label 
                            htmlFor="preferStripe" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4">
                              <path d="M2 12h20M2 17h20M2 7h20" />
                            </svg>
                            <span>Stripe</span>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="preferAsaas" 
                            checked={preferAsaas} 
                            onCheckedChange={(checked) => 
                              setPreferAsaas(checked === true)
                            }
                          />
                          <Label 
                            htmlFor="preferAsaas" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4">
                              <path d="M20 16V7a2 2 0 00-2-2H6a2 2 0 00-2 2v9m16 0H4m16 0l-2-7m-12 7l2-7" />
                            </svg>
                            <span>Asaas</span>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="preferManual" 
                            checked={preferManual} 
                            onCheckedChange={(checked) => 
                              setPreferManual(checked === true)
                            }
                          />
                          <Label 
                            htmlFor="preferManual" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <Clock className="h-4 w-4" />
                            <span>Pagamento Manual</span>
                          </Label>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Opções Avançadas</h3>
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="autoConfirm" 
                            checked={autoConfirm} 
                            onCheckedChange={(checked) => 
                              setAutoConfirm(checked === true)
                            }
                          />
                          <Label 
                            htmlFor="autoConfirm" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <Check className="h-4 w-4" />
                            <span>Confirmar agendamentos automaticamente</span>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="requestPrePayment" 
                            checked={requestPrePayment} 
                            onCheckedChange={(checked) => 
                              setRequestPrePayment(checked === true)
                            }
                          />
                          <Label 
                            htmlFor="requestPrePayment" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <CreditCardIcon className="h-4 w-4" />
                            <span>Exigir pré-pagamento</span>
                          </Label>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Checkbox 
                            id="allowPartialPayment" 
                            checked={allowPartialPayment} 
                            onCheckedChange={(checked) => 
                              setAllowPartialPayment(checked === true)
                            }
                          />
                          <Label 
                            htmlFor="allowPartialPayment" 
                            className="flex items-center space-x-2 cursor-pointer"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" className="h-4 w-4">
                              <path d="M12 2v20M2 12h20" />
                            </svg>
                            <span>Permitir pagamento parcial</span>
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button onClick={handleSavePaymentMethods} disabled={updatePaymentPrefsMutation.isPending}>
                    {updatePaymentPrefsMutation.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Salvar Alterações
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}