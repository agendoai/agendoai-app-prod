import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import AppHeader from "@/components/layout/app-header";
import Navbar from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, CalendarClock, Clock, CreditCard, Info, MapPin, MessageCircle, Star, ThumbsUp, Truck } from "lucide-react";
import { SlideInTransition, ScaleTransition } from "@/components/ui/page-transition";
import { motion } from "framer-motion";
import { formatCurrency } from "@/lib/utils";

// Tipo para prestador
interface Provider {
  id: number;
  name: string;
  profileImage: string | null;
  rating: number | null;
  ratingCount: number;
  bio: string | null;
  specialties: string | null;
  city: string | null;
  state: string | null;
  address: string | null;
  acceptsCards: boolean;
  acceptsPix: boolean;
  acceptsCash: boolean;
  workingHours: string | null;
}

// Tipo para serviço
interface Service {
  id: number;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  categoryId: number;
  categoryName?: string;
  categoryColor?: string;
}

// Tipo para avaliação
interface Review {
  id: number;
  clientId: number;
  clientName: string;
  clientAvatar: string | null;
  rating: number;
  comment: string | null;
  date: string;
  isVerified: boolean;
}

export default function ProviderDetailsPage() {
  const { providerId, serviceId } = useParams();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState("sobre");

  // Obter detalhes do prestador
  const { 
    data: provider, 
    isLoading: isProviderLoading 
  } = useQuery<Provider>({
    queryKey: [`/api/providers/${providerId}`],
  });

  // Obter serviços do prestador
  const { 
    data: providerServices = [], 
    isLoading: areServicesLoading 
  } = useQuery<Service[]>({
    queryKey: [`/api/providers/${providerId}/services`],
  });

  // Obter avaliações do prestador
  const { 
    data: reviews = [], 
    isLoading: areReviewsLoading 
  } = useQuery<Review[]>({
    queryKey: [`/api/providers/${providerId}/reviews`],
  });

  // Obter detalhes do serviço específico selecionado (se houver)
  const { 
    data: selectedService, 
    isLoading: isServiceLoading 
  } = useQuery<Service>({
    queryKey: [`/api/services/${serviceId}`],
    enabled: !!serviceId,
  });

  // Verificar carregamento geral
  const isLoading = isProviderLoading || areServicesLoading || (!!serviceId && isServiceLoading);

  // Proceder para o agendamento
  const handleBookService = (selectedServiceId: number) => {
    setLocation(`/client/book/date/${providerId}/${selectedServiceId}`);
  };

  // Navegar para o WhatsApp do prestador
  const handleContactProvider = () => {
    // Esta implementação seria substituída pelo número real do prestador
    window.open(`https://wa.me/5500000000000?text=Olá, vi seu perfil no AgendoAI e gostaria de saber mais sobre seus serviços.`, '_blank');
  };

  // Formatar o horário de trabalho para exibição
  const formatWorkingHours = (hoursString: string | null) => {
    if (!hoursString) return "Horário não informado";
    
    try {
      const hours = JSON.parse(hoursString);
      const days = {
        1: "Segunda",
        2: "Terça",
        3: "Quarta",
        4: "Quinta",
        5: "Sexta",
        6: "Sábado",
        7: "Domingo"
      };
      
      return Object.entries(hours).map(([day, time]: [string, any]) => {
        const dayName = days[day as keyof typeof days];
        if (!time.isOpen) return `${dayName}: Fechado`;
        return `${dayName}: ${time.startTime} às ${time.endTime}`;
      }).join("\n");
    } catch (e) {
      return hoursString; // Em caso de erro, exibe a string original
    }
  };

  return (
    <div className="pb-20 bg-white min-h-screen">
      <AppHeader 
        showBackButton 
        userType="client"
        showMenuIcon
        transparent
      />

      <SlideInTransition>
        <div>
          {/* Imagem de capa/cabeçalho */}
          <div className="relative h-40 bg-gradient-to-b from-primary/80 to-primary">
            <div className="absolute -bottom-16 left-4 z-10">
              <Avatar className="h-32 w-32 border-4 border-white shadow-sm">
                {isLoading ? (
                  <Skeleton className="h-full w-full rounded-full" />
                ) : (
                  <>
                    <AvatarImage src={provider?.profileImage || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-2xl font-medium">
                      {provider?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </>
                )}
              </Avatar>
            </div>
          </div>

          {/* Informações básicas */}
          <div className="pt-20 pb-4 px-4">
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            ) : (
              <>
                <h1 className="text-2xl font-bold">{provider?.name}</h1>
                
                <div className="flex items-center mt-1 text-sm">
                  <Star className="h-4 w-4 text-amber-500 mr-1" />
                  <span>
                    {provider?.rating?.toFixed(1) || "Novo"} 
                    {provider?.ratingCount > 0 && ` (${provider?.ratingCount})`}
                  </span>
                  
                  {provider?.city && (
                    <>
                      <span className="mx-2">•</span>
                      <MapPin className="h-4 w-4 text-neutral-500 mr-1" />
                      <span className="text-neutral-500">
                        {provider?.city}{provider?.state ? `, ${provider?.state}` : ''}
                      </span>
                    </>
                  )}
                </div>
                
                {provider?.specialties && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {provider.specialties.split(',').map((specialty, index) => (
                      <Badge 
                        key={index} 
                        variant="outline" 
                        className="bg-primary/10 border-primary/20 text-primary font-normal"
                      >
                        {specialty.trim()}
                      </Badge>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          {/* Botões de ação */}
          <div className="flex px-4 mb-4 gap-2">
            <Button 
              className="flex-1" 
              onClick={() => handleBookService(parseInt(serviceId || (providerServices[0]?.id || 0).toString()))}
              disabled={isLoading || providerServices.length === 0}
            >
              <CalendarClock className="h-4 w-4 mr-2" />
              Agendar
            </Button>
            
            <Button 
              variant="outline" 
              onClick={handleContactProvider}
              disabled={isLoading}
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              Contato
            </Button>
          </div>

          {/* Tabs de conteúdo */}
          <Tabs 
            defaultValue="sobre" 
            className="w-full" 
            value={activeTab} 
            onValueChange={setActiveTab}
          >
            <div className="border-b">
              <div className="px-2">
                <TabsList className="w-full bg-transparent h-auto p-0 mb-0">
                  <TabsTrigger 
                    value="sobre" 
                    className="flex-1 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
                  >
                    <Info className="h-4 w-4 mr-2" />
                    Sobre
                  </TabsTrigger>
                  <TabsTrigger 
                    value="servicos" 
                    className="flex-1 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
                  >
                    <Truck className="h-4 w-4 mr-2" />
                    Serviços
                  </TabsTrigger>
                  <TabsTrigger 
                    value="avaliacoes" 
                    className="flex-1 py-3 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none"
                  >
                    <ThumbsUp className="h-4 w-4 mr-2" />
                    Avaliações
                  </TabsTrigger>
                </TabsList>
              </div>
            </div>
            
            {/* Conteúdo da aba "Sobre" */}
            <TabsContent value="sobre" className="p-4 space-y-4">
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <>
                  {provider?.bio && (
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-2 flex items-center">
                          <Info className="h-4 w-4 mr-2 text-neutral-500" />
                          Sobre mim
                        </h3>
                        <p className="text-sm text-neutral-700">{provider.bio}</p>
                      </CardContent>
                    </Card>
                  )}
                  
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2 flex items-center">
                        <Clock className="h-4 w-4 mr-2 text-neutral-500" />
                        Horário de atendimento
                      </h3>
                      <div className="text-sm text-neutral-700 whitespace-pre-line">
                        {formatWorkingHours(provider?.workingHours)}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <h3 className="font-medium mb-2 flex items-center">
                        <CreditCard className="h-4 w-4 mr-2 text-neutral-500" />
                        Formas de pagamento
                      </h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {provider?.acceptsCards && (
                          <Badge variant="outline" className="bg-neutral-100">Cartão</Badge>
                        )}
                        {provider?.acceptsPix && (
                          <Badge variant="outline" className="bg-neutral-100">Pix</Badge>
                        )}
                        {provider?.acceptsCash && (
                          <Badge variant="outline" className="bg-neutral-100">Dinheiro</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  {provider?.address && (
                    <Card>
                      <CardContent className="p-4">
                        <h3 className="font-medium mb-2 flex items-center">
                          <MapPin className="h-4 w-4 mr-2 text-neutral-500" />
                          Endereço
                        </h3>
                        <div className="text-sm text-neutral-700">{provider.address}</div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}
            </TabsContent>
            
            {/* Conteúdo da aba "Serviços" */}
            <TabsContent value="servicos" className="p-4">
              {areServicesLoading ? (
                <div className="space-y-3">
                  {[...Array(4)].map((_, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex justify-between mb-2">
                          <Skeleton className="h-5 w-40" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                        <Skeleton className="h-4 w-full mb-2" />
                        <div className="flex items-center">
                          <Skeleton className="h-4 w-24 mr-4" />
                          <Skeleton className="h-8 w-24" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : providerServices.length > 0 ? (
                <div className="space-y-3">
                  {providerServices.map((service, index) => (
                    <motion.div
                      key={service.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card className={service.id.toString() === serviceId ? "border-primary bg-primary/5" : ""}>
                        <CardContent className="p-4">
                          <div className="flex justify-between mb-1">
                            <h3 className="font-medium">{service.name}</h3>
                            <span className="font-medium text-primary">
                              {formatCurrency(service.price)}
                            </span>
                          </div>
                          
                          {service.description && (
                            <div className="text-sm text-neutral-600 mb-3">{service.description}</div>
                          )}
                          
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-neutral-500">
                              <Clock className="h-4 w-4 mr-1" />
                              <span>{service.duration} minutos</span>
                            </div>
                            
                            <Button 
                              size="sm" 
                              onClick={() => handleBookService(service.id)}
                              className={service.id.toString() === serviceId ? "bg-primary-dark hover:bg-primary-dark/90" : ""}
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Agendar
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-neutral-500">
                    Nenhum serviço cadastrado por este prestador.
                  </div>
                </div>
              )}
            </TabsContent>
            
            {/* Conteúdo da aba "Avaliações" */}
            <TabsContent value="avaliacoes" className="p-4">
              {areReviewsLoading ? (
                <div className="space-y-4">
                  {[...Array(3)].map((_, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="flex items-center mb-2">
                          <Skeleton className="h-10 w-10 rounded-full mr-3" />
                          <div>
                            <Skeleton className="h-4 w-32 mb-1" />
                            <Skeleton className="h-4 w-24" />
                          </div>
                        </div>
                        <Skeleton className="h-4 w-full mb-1" />
                        <Skeleton className="h-4 w-3/4" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map((review, index) => (
                    <motion.div
                      key={review.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card>
                        <CardContent className="p-4">
                          <div className="flex items-center mb-2">
                            <Avatar className="h-10 w-10 mr-3">
                              <AvatarImage src={review.clientAvatar || ""} />
                              <AvatarFallback>
                                {review.clientName?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center">
                                <h4 className="font-medium text-sm">{review.clientName}</h4>
                                {review.isVerified && (
                                  <Badge className="ml-2 text-[10px] py-0 h-4" variant="outline">Verificado</Badge>
                                )}
                              </div>
                              <div className="flex items-center text-xs text-neutral-500">
                                <div className="flex mr-2">
                                  {[...Array(5)].map((_, i) => (
                                    <Star 
                                      key={i} 
                                      className={`h-3 w-3 ${i < review.rating ? 'fill-amber-500 text-amber-500' : 'text-neutral-300'}`} 
                                    />
                                  ))}
                                </div>
                                <span>{new Date(review.date).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          
                          {review.comment && (
                            <div className="text-sm text-neutral-700">{review.comment}</div>
                          )}
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-neutral-500">
                    Ainda não há avaliações para este prestador.
                  </div>
                  <div className="text-neutral-500 text-sm mt-2">
                    Seja o primeiro a avaliar após realizar um serviço!
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </SlideInTransition>
      
      <Navbar />
    </div>
  );
}