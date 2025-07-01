
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Category, Service, Niche } from "@shared/schema";
import { ScissorsIcon } from "@/components/ui/scissors-icon";
import AppHeader from "@/components/layout/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect, useState } from "react";

export default function CategoriesPage() {
  const [location, setLocation] = useLocation();
  const [selectedNicheId, setSelectedNicheId] = useState<number | null>(null);
  const [nicheTitle, setNicheTitle] = useState<string>("Categorias");
  
  // Extrair o parâmetro nicheId da URL
  useEffect(() => {
    const searchParams = new URLSearchParams(location.split('?')[1]);
    const nicheId = searchParams.get('nicheId');
    
    if (nicheId) {
      setSelectedNicheId(parseInt(nicheId));
    } else {
      setSelectedNicheId(null);
    }
  }, [location]);
  
  // Buscar informações do nicho selecionado (se houver)
  const { data: nicheData } = useQuery<Niche>({
    queryKey: ["/api/niches", selectedNicheId],
    queryFn: async () => {
      if (!selectedNicheId) return null;
      const response = await fetch(`/api/niches/${selectedNicheId}`);
      if (!response.ok) throw new Error('Falha ao carregar nicho');
      return response.json();
    },
    enabled: !!selectedNicheId,
  });
  
  // Atualizar o título com base no nicho selecionado
  useEffect(() => {
    if (nicheData) {
      setNicheTitle(`Categorias em ${nicheData.name}`);
    } else {
      setNicheTitle("Categorias");
    }
  }, [nicheData]);
  
  // Fetch categories with their services, filtered by niche if needed
  const { data: categories = [], isLoading } = useQuery<Category[]>({
    queryKey: ["/api/categories", selectedNicheId, "includeServices"],
    queryFn: async () => {
      let url = "/api/categories?includeServices=true";
      if (selectedNicheId) {
        url += `&nicheId=${selectedNicheId}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error('Falha ao carregar categorias');
      return response.json();
    },
  });

  // Handle service selection - iniciar fluxo de agendamento
  const handleServiceClick = (serviceId: number, categoryId: number) => {
    // Redireciona para o primeiro passo do fluxo de agendamento com o serviço selecionado
    setLocation(`/client/booking/service/${serviceId}`);
  };
  
  // Voltar para página de nichos
  const handleBackToNiches = () => {
    setLocation('/client/niches');
  };

  return (
    <div className="min-h-screen bg-white">
      <AppHeader title={nicheTitle} showBackButton />
      
      {selectedNicheId && (
        <div className="px-4 py-2">
          <button 
            className="text-sm text-primary flex items-center" 
            onClick={handleBackToNiches}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Voltar para Nichos
          </button>
        </div>
      )}

      <div className="p-2">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-2">
            {[...Array(6)].map((_, index) => (
              <Card key={index} className="border border-neutral-200">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-center">
                    <Skeleton className="w-12 h-12 rounded-lg mr-3" />
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-6 w-6 rounded-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {categories.map((category: any) => (
              <Card key={category.id} className="border border-neutral-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div
                        className="w-12 h-12 rounded-lg mr-3 flex items-center justify-center"
                        style={{ backgroundColor: `${category.color || "#2A9D8F"}30` }}
                      >
                        <ScissorsIcon
                          className="h-6 w-6"
                          style={{ color: category.color || "#2A9D8F" }}
                        />
                      </div>
                      <span className="font-medium">{category.name}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {category.services && Array.isArray(category.services) && category.services.map((service: Service) => (
                      <button
                        key={service.id}
                        className="w-full text-left"
                        onClick={() => handleServiceClick(service.id, category.id)}
                      >
                        <div className="flex items-center justify-between p-3 rounded-lg bg-white border border-gray-200 hover:border-primary hover:shadow-sm transition-all">
                          <div>
                            <h4 className="font-medium">{service.name}</h4>
                            <div className="text-sm text-gray-500">
                              {service.duration} minutos
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-neutral-400" />
                        </div>
                      </button>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
