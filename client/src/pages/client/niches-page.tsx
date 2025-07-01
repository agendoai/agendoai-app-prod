import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Niche } from "@shared/schema";
import ClientLayout from "@/components/layout/client-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronRight, ArrowRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Helmet } from "react-helmet";

export default function NichesPage() {
  const [, setLocation] = useLocation();
  
  // Fetch niches
  const { data: niches = [], isLoading } = useQuery<Niche[]>({
    queryKey: ["/api/niches"],
  });

  // Handle niche selection
  const handleNicheClick = (nicheId: number) => {
    // Manter contexto de fluxo enviando o nicheId como parâmetro de query
    // Este parâmetro será utilizado para filtrar as categorias por nicho
    setLocation(`/client/categories?nicheId=${nicheId}`);
  };

  // Go to categories page
  const handleViewAllCategories = () => {
    setLocation("/client/categories");
  };

  // Go to search page
  const handleViewAllServices = () => {
    setLocation("/client/search");
  };

  return (
    <>
      <Helmet>
        <title>Nichos de Serviços | AgendoAI</title>
      </Helmet>
      
      <ClientLayout>
        <div className="container max-w-5xl py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold mb-2">Nichos de Serviços</h1>
            <p className="text-muted-foreground">
              Escolha o nicho de serviços que você precisa
            </p>
          </div>
          
          {isLoading ? (
            // Loading skeleton
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, index) => (
                <Card key={index} className="border border-neutral-200">
                  <CardContent className="p-6 flex flex-col items-center justify-center space-y-4">
                    <Skeleton className="w-16 h-16 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-40" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                {niches.map((niche) => (
                  <Card
                    key={niche.id}
                    className="border border-neutral-200 hover:border-primary hover:shadow-md transition-all cursor-pointer overflow-hidden"
                    onClick={() => handleNicheClick(niche.id)}
                  >
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-3xl">
                        {niche.icon}
                      </div>
                      <h2 className="font-bold text-lg mb-1">{niche.name}</h2>
                      <p className="text-sm text-muted-foreground mb-4">
                        {niche.description}
                      </p>
                      <Button variant="ghost" className="mt-auto" size="sm">
                        Ver serviços <ArrowRight className="ml-1 h-4 w-4" />
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="outline" 
                  className="flex items-center justify-center"
                  onClick={handleViewAllCategories}
                >
                  Ver todas as categorias
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
                
                <Button 
                  className="flex items-center justify-center"
                  onClick={handleViewAllServices}
                >
                  Buscar todos os serviços
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              </div>
            </>
          )}
        </div>
      </ClientLayout>
    </>
  );
}