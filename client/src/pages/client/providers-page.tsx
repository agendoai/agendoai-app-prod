import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Service } from "@shared/schema";
import AppHeader from "@/components/layout/app-header";
import Navbar from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Star, MapPin, ChevronRight } from "lucide-react";
import { SlideInTransition } from "@/components/ui/page-transition";
import { motion } from "framer-motion";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Tipo para os prestadores
interface Provider {
  id: number;
  name: string;
  profileImage: string | null;
  rating: number | null;
  ratingCount: number;
  city: string | null;
  state: string | null;
  distanceKm?: number | null;
}

export default function ProvidersPage() {
  const { serviceId } = useParams();
  const [, setLocation] = useLocation();
  const [loadingLocation, setLoadingLocation] = useState(false);

  // Obter detalhes do serviço
  const { 
    data: service, 
    isLoading: isServiceLoading 
  } = useQuery<Service>({
    queryKey: [`/api/services/${serviceId}`],
  });

  // Obter prestadores para o serviço selecionado
  const { 
    data: providers = [], 
    isLoading: areProvidersLoading 
  } = useQuery<Provider[]>({
    queryKey: [`/api/providers?serviceId=${serviceId}`],
    enabled: !!serviceId,
  });

  // Obter prestadores recomendados pelo IA
  const {
    data: recommendedProviders = [],
    isLoading: isRecommendationsLoading
  } = useQuery<Provider[]>({
    queryKey: [`/api/ai/recommended-providers?serviceId=${serviceId}`],
    enabled: !!serviceId,
  });

  const isLoading = isServiceLoading || areProvidersLoading;
  
  // Navegação para a página do prestador
  const handleProviderClick = (providerId: number) => {
    setLocation(`/client/provider-schedule/${providerId}/${serviceId}`);
  };

  // Solicitar localização atual se estiver no navegador
  useEffect(() => {
    if (navigator.geolocation) {
      setLoadingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Normalmente enviaria para o servidor para filtrar prestadores por proximidade
          console.log("Localização obtida:", position.coords);
          setLoadingLocation(false);
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          setLoadingLocation(false);
        },
        { timeout: 10000 }
      );
    }
  }, []);

  // Renderizar o cartão do prestador
  const renderProviderCard = (provider: Provider, index: number, isRecommended: boolean = false) => (
    <motion.div
      key={provider.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: index * 0.05 }}
    >
      <button
        className="w-full text-left"
        onClick={() => handleProviderClick(provider.id)}
      >
        <Card className={`border hover:shadow-sm transition-all ${isRecommended ? 'border-primary bg-primary/5' : 'border-neutral-200'}`}>
          <CardContent className="p-4">
            <div className="flex items-center">
              <div className="mr-3">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={provider.profileImage || ""} alt={provider.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-medium">
                    {provider.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-medium">{provider.name}</h3>
                  <ChevronRight className="h-5 w-5 text-neutral-400" />
                </div>
                
                <div className="flex items-center mb-1 text-sm text-neutral-500">
                  <Star className="h-4 w-4 text-amber-500 mr-1" />
                  <span>
                    {provider.rating?.toFixed(1) || "Novo"} 
                    {provider.ratingCount > 0 && ` (${provider.ratingCount})`}
                  </span>
                </div>
                
                {(provider.city || provider.distanceKm) && (
                  <div className="flex items-center text-xs text-neutral-500">
                    <MapPin className="h-3 w-3 mr-1" />
                    <span>
                      {provider.city && provider.state ? `${provider.city}, ${provider.state}` : ''}
                      {provider.distanceKm && ` • ${provider.distanceKm.toFixed(1)} km`}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {isRecommended && (
              <div className="mt-2 text-xs">
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20">
                  Recomendado pela IA
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </button>
    </motion.div>
  );

  return (
    <div className="min-h-screen pb-20 bg-white">
      <AppHeader 
        title={service?.name || "Prestadores"} 
        showBackButton 
        userType="client"
        showMenuIcon
      />

      <SlideInTransition>
        <div className="p-4 space-y-4">
          {/* Seção de carregamento */}
          {isLoading && (
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <Card key={index} className="border border-neutral-200">
                  <CardContent className="p-4">
                    <div className="flex items-center">
                      <Skeleton className="w-14 h-14 rounded-full mr-3" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-5 w-40" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Prestadores recomendados */}
          {!isLoading && recommendedProviders.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">Sugestões Inteligentes</h2>
              <div className="space-y-3">
                {recommendedProviders.slice(0, 3).map((provider, index) => 
                  renderProviderCard(provider, index, true)
                )}
              </div>
            </div>
          )}

          {/* Todos os prestadores */}
          {!isLoading && providers.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold mb-3">
                {recommendedProviders.length > 0 ? "Outros Prestadores" : "Prestadores Disponíveis"}
              </h2>
              <div className="space-y-3">
                {providers.map((provider, index) => 
                  renderProviderCard(provider, index)
                )}
              </div>
            </div>
          )}

          {/* Mensagem sem prestadores */}
          {!isLoading && providers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-neutral-500">
                Nenhum prestador disponível para este serviço.
              </p>
              <p className="text-neutral-500 text-sm mt-2">
                Tente outro serviço ou entre em contato com o suporte.
              </p>
            </div>
          )}
        </div>
      </SlideInTransition>
      
      <Navbar />
    </div>
  );
}