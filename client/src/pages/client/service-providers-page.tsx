import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Service, User, ProviderSettings } from "@shared/schema";
import AppHeader from "@/components/layout/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Search, MapPin, Clock, Star } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";

// Define the provider with settings type
type ProviderWithSettings = User & {
  settings: ProviderSettings | undefined;
};

export default function ServiceProvidersPage() {
  const { serviceId } = useParams();
  const [, setLocation] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  
  // Fetch service details
  const { data: service, isLoading: isServiceLoading } = useQuery<Service>({
    queryKey: [`/api/services/${serviceId}`],
  });

  // Fetch providers that offer this service
  const { data: providers = [], isLoading: areProvidersLoading } = useQuery<ProviderWithSettings[]>({
    queryKey: [`/api/providers?serviceId=${serviceId}`],
  });

  // Handle provider selection - ajustado para manter o fluxo completo de agendamento
  const handleProviderClick = (providerId: number) => {
    // Redireciona para a página de agendamento com o prestador e serviço selecionados
    // Utilizando a rota pública para visualização de agenda e seleção de horário
    setLocation(`/client/provider-schedule/${providerId}/${serviceId}`);
  };

  const isLoading = isServiceLoading || areProvidersLoading;

  // Filter providers based on search term
  const filteredProviders = providers.filter(provider => {
    const businessName = provider.settings?.businessName || provider.name || "";
    return businessName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-white">
      <AppHeader 
        title={service?.name || "Prestadores"} 
        showBackButton 
      />

      {/* Search Bar */}
      <div className="p-4 border-b">
        <div className="relative">
          <Input 
            type="text" 
            placeholder="Buscar prestadores"
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-neutral-400" />
        </div>
      </div>

      <div className="p-4">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (
              <Card key={index} className="border border-neutral-200 overflow-hidden">
                <Skeleton className="h-32 w-full" />
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-5 w-12" />
                  </div>
                  <Skeleton className="h-5 w-36 mb-2" />
                  <Skeleton className="h-5 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredProviders.length > 0 ? (
          <div className="space-y-4">
            {filteredProviders.map((provider) => (
              <Card 
                key={provider.id} 
                className="border border-neutral-200 overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => handleProviderClick(provider.id)}
              >
                <div className="h-32 bg-neutral-100 overflow-hidden">
                  {provider.settings?.coverImage ? (
                    <img 
                      src={provider.settings.coverImage} 
                      alt={provider.settings?.businessName || provider.name || "Provider"} 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = "https://via.placeholder.com/400x200?text=Sem+imagem";
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-primary/10">
                      <p className="text-primary font-medium">Sem imagem de capa</p>
                    </div>
                  )}
                </div>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-lg">{provider.settings?.businessName || provider.name || "Prestador"}</h3>
                    {provider.settings?.rating && (
                      <div className="flex items-center text-yellow-500">
                        <Star className="h-4 w-4 fill-current" />
                        <span className="ml-1 text-neutral-800">
                          {(provider.settings.rating / 10).toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                  {provider.settings?.address && (
                    <div className="flex items-center text-neutral-500 text-sm mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{provider.settings.address}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm">
                      <Clock className="h-4 w-4 mr-1 text-primary" />
                      <span>Disponível hoje</span>
                    </div>
                    <span className="text-primary font-medium">Ver horários</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-neutral-500">Nenhum prestador encontrado para este serviço.</p>
            <button 
              className="mt-4 text-primary font-medium"
              onClick={() => window.history.back()}
            >
              Voltar para categorias
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
