import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Category, Service } from "@shared/schema";
import { ScissorsIcon } from "@/components/ui/scissors-icon";
import AppHeader from "@/components/layout/app-header";
import Navbar from "@/components/layout/navbar";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/utils";
import { PageTransition, SlideInTransition } from "@/components/ui/page-transition";
import { motion } from "framer-motion";
import { useEffect } from "react";

export default function ServicesPage() {
  const params = useParams();
  const [, setLocation] = useLocation();
  
  // Extrair parâmetros da URL dependendo do padrão
  const categoryId = params.categoryId;
  const serviceId = params.serviceId;
  
  // Se estamos no fluxo específico de nicho->categoria->serviço, 
  // redirecionar diretamente para a página de prestadores
  useEffect(() => {
    if (serviceId) {
      // Redirecionamento imediato para manter o fluxo de nicho -> categoria -> serviço -> prestador
      setLocation(`/client/providers/${serviceId}`);
    }
  }, [serviceId, setLocation]);
  
  // Fetch category details
  const { data: category, isLoading: isCategoryLoading } = useQuery<Category>({
    queryKey: [`/api/categories/${categoryId}`],
  });

  // Fetch services for the category
  const { data: services = [], isLoading: areServicesLoading } = useQuery<Service[]>({
    queryKey: [`/api/services?categoryId=${categoryId}`],
  });

  // Handle service selection - seguindo o fluxo correto
  const handleServiceClick = (serviceId: number) => {
    // Encaminha para a página de prestadores que oferecem este serviço
    setLocation(`/client/providers/${serviceId}`);
  };

  const isLoading = isCategoryLoading || areServicesLoading;

  return (
    <div className="min-h-screen pb-20 bg-white">
      <AppHeader 
        title={category?.name || "Serviços"} 
        showBackButton 
        userType="client"
        showMenuIcon
      />

      <SlideInTransition>
        <div className="p-4">
          {isLoading ? (
            // Loading skeleton
            <div className="space-y-3">
              {[...Array(5)].map((_, index) => (
                <Card key={index} className="border border-neutral-200">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center">
                      <Skeleton className="w-12 h-12 rounded-lg mr-3" />
                      <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                    </div>
                    <Skeleton className="h-6 w-6 rounded-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : services.length > 0 ? (
            <div className="space-y-3">
              {services.map((service, index) => (
                <motion.div
                  key={service.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <button
                    className="w-full text-left"
                    onClick={() => handleServiceClick(service.id)}
                  >
                    <Card className="border border-neutral-200 hover:border-primary hover:shadow-sm transition-all">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div className="flex items-center">
                          <div
                            className="w-12 h-12 rounded-lg mr-3 flex items-center justify-center"
                            style={{ backgroundColor: `${category?.color || "#2A9D8F"}30` }}
                          >
                            <ScissorsIcon
                              className="h-6 w-6"
                              style={{ color: category?.color || "#2A9D8F" }}
                            />
                          </div>
                          <div>
                            <h3 className="font-medium">{service.name}</h3>
                            <p className="text-sm text-neutral-500">
                              {service.duration} min • {formatCurrency(service.price || 0)}
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="h-5 w-5 text-neutral-400" />
                      </CardContent>
                    </Card>
                  </button>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <p className="text-neutral-500">Nenhum serviço encontrado nesta categoria.</p>
            </div>
          )}
        </div>
      </SlideInTransition>
      
      <Navbar />
    </div>
  );
}
