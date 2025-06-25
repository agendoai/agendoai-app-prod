import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { WhatsAppChat } from "@/components/chat/whatsapp-chat";
import { WhatsAppButton } from "@/components/chat/whatsapp-button";
import ClientNavbar from "@/components/layout/client-navbar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Phone, Mail, MapPin, ArrowLeft, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";

interface ProviderWithSettings {
  id: number;
  name: string;
  email: string;
  phone: string;
  profileImage: string | null;
  userType: string;
  settings: {
    businessName: string | null;
    address: string | null;
    coverImage: string | null;
    isOnline: boolean;
    rating: number | null;
  } | null;
}

interface Service {
  id: number;
  name: string;
  price: number;
  duration: number;
  description: string | null;
}

export function ProviderChatPage() {
  const { providerId } = useParams<{ providerId: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("chat");
  
  const { data: provider, isLoading: isLoadingProvider } = useQuery<ProviderWithSettings>({
    queryKey: [`/api/providers/${providerId}/profile`],
  });
  
  const { data: services, isLoading: isLoadingServices } = useQuery<Service[]>({
    queryKey: [`/api/services?providerId=${providerId}`],
  });
  
  // Redirect if trying to message your own profile
  useEffect(() => {
    if (user && provider && user.id === provider.id) {
      toast({
        title: "Erro",
        description: "Você não pode enviar mensagens para si mesmo",
        variant: "destructive",
      });
      // Redirect to home
      window.location.href = "/";
    }
  }, [user, provider, toast]);
  
  if (isLoadingProvider || isLoadingServices) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ClientNavbar />
        <div className="container mx-auto py-8 px-4">
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!provider) {
    return (
      <div className="min-h-screen bg-gray-50">
        <ClientNavbar />
        <div className="container mx-auto py-8 px-4">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-500">Prestador não encontrado</h1>
            <p className="mt-2 text-gray-600">O prestador que você está procurando não existe.</p>
            <Link href="/">
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar para a home
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      <ClientNavbar />
      
      <div className="container mx-auto py-8 px-4">
        <div className="mb-6">
          <Link href={`/providers/${providerId}`}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar para perfil do prestador
            </Button>
          </Link>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Informações do prestador */}
          <div className="md:col-span-1">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle>Prestador</CardTitle>
              </CardHeader>
              
              <CardContent>
                <div className="flex flex-col items-center">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={provider.profileImage || ""} />
                    <AvatarFallback className="bg-primary text-white uppercase text-lg">
                      {provider.name?.charAt(0) || "P"}
                    </AvatarFallback>
                  </Avatar>
                  
                  <h2 className="mt-4 text-xl font-semibold">
                    {provider.settings?.businessName || provider.name}
                  </h2>
                  
                  <Badge 
                    variant={provider.settings?.isOnline ? "default" : "outline"}
                    className="mt-2"
                  >
                    {provider.settings?.isOnline ? "Online" : "Offline"}
                  </Badge>
                </div>
                
                <div className="mt-6 space-y-4">
                  {provider.phone && (
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-primary" />
                      <span>{provider.phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <Mail className="h-4 w-4 mr-2 text-primary" />
                    <span>{provider.email}</span>
                  </div>
                  
                  {provider.settings?.address && (
                    <div className="flex items-start">
                      <MapPin className="h-4 w-4 mr-2 text-primary mt-1" />
                      <span>{provider.settings.address}</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-6">
                  <Link href={`/providers/${providerId}/schedule`}>
                    <Button className="w-full">
                      <Calendar className="mr-2 h-4 w-4" />
                      Agendar serviço
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Conteúdo principal */}
          <div className="md:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="w-full mb-6">
                <TabsTrigger value="chat" className="flex-1">Chat por WhatsApp</TabsTrigger>
                <TabsTrigger value="services" className="flex-1">Serviços</TabsTrigger>
              </TabsList>
              
              <TabsContent value="chat" className="mt-0">
                <WhatsAppChat 
                  providerId={parseInt(providerId)}
                  providerName={provider.settings?.businessName || provider.name}
                />
              </TabsContent>
              
              <TabsContent value="services" className="mt-0">
                <Card>
                  <CardHeader>
                    <CardTitle>Serviços Oferecidos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {services && services.length > 0 ? (
                      <div className="space-y-4 divide-y">
                        {services.map((service) => (
                          <div key={service.id} className="pt-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <h3 className="font-medium">{service.name}</h3>
                                {service.description && (
                                  <p className="text-sm text-gray-500 mt-1">{service.description}</p>
                                )}
                                <div className="flex items-center mt-2 text-sm text-gray-500">
                                  <span className="mr-4">{service.duration} min</span>
                                  <span>R$ {(service.price / 100).toFixed(2)}</span>
                                </div>
                              </div>
                              <WhatsAppButton 
                                providerId={parseInt(providerId)}
                                serviceId={service.id}
                                defaultMessage={`Olá! Gostaria de mais informações sobre o serviço "${service.name}".`}
                                size="sm"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <p>Este prestador ainda não cadastrou serviços.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProviderChatPage;