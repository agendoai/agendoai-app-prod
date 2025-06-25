import { memo, useCallback, useEffect, useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link as WouterLink, useLocation } from "wouter";
import { Category } from "@shared/schema";
import { ScissorsIcon } from "@/components/ui/scissors-icon";
import AppHeader from "@/components/layout/app-header";
import ClientLayout from "@/components/layout/client-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Appointment } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  CalendarClock, 
  Home,
  Search,
  CalendarDays,
  ReceiptText,
  User,
  Timer,
  Star,
  Image as ImageIcon
} from "lucide-react";
import { PageTransition } from "@/components/ui/page-transition";
import { AppointmentItem } from "@/components/appointment-item";
import PromotionsCarousel from "@/components/promotions-carousel";

// Service images
import cabeleireiroImg from "@/assets/service-images/perfil de usuario.png";
import massagemImg from "@/assets/service-images/image_1746708020345.png";
import manicureImg from "@/assets/service-images/servicos solicitados.png";
import limpezaImg from "@/assets/service-images/image_1746705658311.png";
import spaImg from "@/assets/service-images/image_1746702889469.png";
import lavaRapidoImg from "@/assets/service-images/image_1746731940322.png";

// Componentes memoizados para evitar re-renders desnecessários
const FeatureCards = memo(({ onClickNiches, onClickSearch }: { 
  onClickNiches: () => void;
  onClickSearch: () => void;
}) => (
  <div className="grid grid-cols-2 gap-3 sm:gap-4 mb-6">
    <div 
      className="bg-primary rounded-lg sm:rounded-xl h-24 sm:h-32 p-3 sm:p-4 flex flex-col justify-between relative overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow"
      onClick={onClickNiches}
    >
      <div className="text-white">
        <h3 className="font-bold text-base sm:text-lg">Nichos</h3>
        <p className="text-xs sm:text-sm text-white/80">Explore serviços por nicho</p>
      </div>
      <div className="absolute -bottom-6 -right-6 bg-primary-dark/30 w-16 h-16 sm:w-24 sm:h-24 rounded-full"></div>
    </div>
    
    <div 
      className="bg-secondary rounded-lg sm:rounded-xl h-24 sm:h-32 p-3 sm:p-4 flex flex-col justify-between relative overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-shadow"
      onClick={onClickSearch}
    >
      <div className="text-white">
        <h3 className="font-bold text-base sm:text-lg">Buscar</h3>
        <p className="text-xs sm:text-sm text-white/80">Encontre o serviço ideal</p>
      </div>
      <div className="absolute -bottom-6 -right-6 bg-secondary-dark/30 w-16 h-16 sm:w-24 sm:h-24 rounded-full"></div>
    </div>
  </div>
));

// Componente de categoria otimizado e memoizado
const CategoryItem = memo(({ category, onClick }: { 
  category: Category, 
  onClick: (id: number) => void 
}) => (
  <button
    className="flex flex-col items-center"
    onClick={() => onClick(category.id)}
  >
    <div
      className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center mb-2 hover:shadow-md transition-shadow`}
      style={{ 
        backgroundColor: category.color ? `${category.color}20` : '#e0e0e0',
        border: `2px solid ${category.color || '#d0d0d0'}`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}
    >
      <ScissorsIcon 
        className={`h-6 w-6 sm:h-7 sm:w-7`} 
        style={{ color: category.color || '#666666' }} 
      />
    </div>
    <span className="text-xs font-medium text-center line-clamp-2 w-20 sm:w-24">{category.name}</span>
  </button>
));

// Componente de serviço usado recentemente
const ServiceItem = memo(({ service, onClick, onServiceSelect }: { 
  service: any, 
  onClick: (id: number) => void,
  onServiceSelect?: (serviceId: number) => void  
}) => (
  <button
    className="flex flex-col items-center"
    onClick={() => {
      // Priorizar o agendamento direto de serviço quando disponível
      if (onServiceSelect && service.id) {
        // Usar o callback de agendamento direto
        onServiceSelect(service.id);
      } else {
        // Fallback: navegação por categoria
        onClick(service.categoryId);
      }
    }}
  >
    <div
      className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center mb-2 hover:shadow-md transition-shadow`}
      style={{ 
        backgroundColor: service.color ? `${service.color}20` : '#f0f0f0',
        border: `2px solid ${service.color || '#d0d0d0'}`,
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}
    >
      <ScissorsIcon 
        className={`h-6 w-6 sm:h-7 sm:w-7`} 
        style={{ color: service.color || '#666666' }} 
      />
    </div>
    <span className="text-xs font-medium text-center line-clamp-2 w-20 sm:w-24">{service.name}</span>
  </button>
));

// Componente de prestador recente
const ProviderItem = memo(({ provider, onClick }: { 
  provider: any, 
  onClick: (id: number) => void 
}) => (
  <button
    className="flex flex-col items-center"
    onClick={() => onClick(provider.id)}
  >
    <div 
      className="w-16 h-16 sm:w-18 sm:h-18 rounded-full overflow-hidden flex items-center justify-center mb-2 hover:shadow-md transition-shadow"
      style={{
        backgroundColor: '#f0f0f0',
        border: '2px solid #e0e0e0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}
    >
      <div className="text-primary font-bold text-base sm:text-lg">
        {provider.name?.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase()}
      </div>
    </div>
    <span className="text-xs font-medium text-center line-clamp-2 w-20 sm:w-24">{provider.name}</span>
  </button>
));

// Componente de serviços mais usados ou prestadores recentes
const RecentSection = memo(({ 
  userData, 
  onCategoryClick, 
  onProviderClick,
  onViewAllClick, 
  onServiceSelect,
  type = "services",
  isLoading 
}: {
  userData: any,
  onCategoryClick: (id: number) => void,
  onProviderClick: (id: number) => void,
  onViewAllClick: () => void,
  onServiceSelect?: (id: number) => void,
  type?: "services" | "providers",
  isLoading: boolean
}) => {
  // Determinar o título baseado no tipo e se há histórico
  const title = type === "services" 
    ? (userData?.hasHistory ? "SEUS SERVIÇOS MAIS USADOS" : "PRINCIPAIS CATEGORIAS")
    : "PRESTADORES RECENTES";
  
  // Determinar quais dados mostrar
  const dataToShow = type === "services" 
    ? (userData?.topServices?.length > 0 ? userData.topServices : [])
    : (userData?.recentProviders?.length > 0 ? userData.recentProviders : []);
  
  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-base sm:text-lg font-bold uppercase text-neutral-800">{title}</h2>
        <button 
          className="text-xs text-primary font-medium"
          onClick={onViewAllClick}
        >
          Ver todos
        </button>
      </div>
      
      {isLoading ? (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-3">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="flex flex-col items-center animate-pulse">
              <Skeleton className="w-16 h-16 sm:w-18 sm:h-18 rounded-full mb-2" />
              <Skeleton className="w-14 h-3 mb-1" />
            </div>
          ))}
        </div>
      ) : dataToShow.length > 0 ? (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-3">
          {dataToShow.slice(0, 8).map((item: any) => (
            type === "services" ? (
              <ServiceItem 
                key={item.id} 
                service={item} 
                onClick={onCategoryClick} 
                onServiceSelect={onServiceSelect}
              />
            ) : (
              <ProviderItem key={item.id} provider={item} onClick={onProviderClick} />
            )
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-3">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="flex flex-col items-center">
              <div 
                className="w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center mb-2"
                style={{
                  backgroundColor: '#f5f5f5',
                  border: '2px solid #e0e0e0',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                }}
              >
                <ScissorsIcon className="h-6 w-6 sm:h-7 sm:w-7 text-gray-400" />
              </div>
              <span className="text-xs font-medium text-center text-gray-400">Indisponível</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
});

// Componente de carregamento para os agendamentos
const AppointmentsSkeleton = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, index) => (
      <Card key={index} className="border border-neutral-200">
        <CardContent className="p-3">
          <div className="flex justify-between mb-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
          <div className="flex items-center">
            <Skeleton className="w-10 h-10 rounded-full mr-3" />
            <div className="w-full">
              <Skeleton className="h-4 w-28 mb-1" />
              <Skeleton className="h-3 w-40" />
            </div>
          </div>
        </CardContent>
      </Card>
    ))}
  </div>
);

// Seção de agendamentos recentes com suporte a agendamentos do dia
const AppointmentsSection = memo(({ 
  appointments, 
  isLoading,
  title = "AGENDAMENTOS RECENTES", 
  emptyMessage = "Você ainda não possui agendamentos.",
  limit = 3,
  showViewAll = true
}: { 
  appointments: Appointment[], 
  isLoading: boolean,
  title?: string,
  emptyMessage?: string,
  limit?: number,
  showViewAll?: boolean
}) => (
  <div>
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-base sm:text-lg font-bold uppercase text-neutral-800">{title}</h2>
      {showViewAll && appointments.length > 0 && (
        <button 
          className="text-xs text-primary font-medium"
          onClick={() => window.location.href = '/client/appointments'}
        >
          Ver todos
        </button>
      )}
    </div>
    
    {isLoading ? (
      <AppointmentsSkeleton />
    ) : appointments.length > 0 ? (
      <div className="space-y-3">
        {appointments.slice(0, limit).map((appointment) => (
          <AppointmentItem 
            key={appointment.id} 
            appointment={appointment}
            userType="client"
          />
        ))}
      </div>
    ) : (
      <div className="bg-gray-50 rounded-lg p-4 text-center py-8 text-neutral-500">
        <p>{emptyMessage}</p>
        <p className="mt-2">Comece escolhendo uma categoria acima!</p>
      </div>
    )}
  </div>
));

// Função utilitária para formatar a duração
const formatDuration = (minutes: number): string => {
  if (minutes < 60) {
    return `${minutes} min`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 
    ? `${hours}h${remainingMinutes}min` 
    : `${hours}h`;
};

// Função utilitária para formatar preço
const formatPrice = (price: number): string => {
  return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

// Interface para serviço
interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  providerName: string;
  rating: number;
  category: string;
  imageUrl?: string;
}

// Mapeamento de serviços para imagens
const serviceImages: Record<string, string> = {
  "Corte de Cabelo": cabeleireiroImg,
  "Massagem": massagemImg,
  "Manicure": manicureImg,
  "Limpeza": limpezaImg,
  "Spa": spaImg,
  "Lavagem": lavaRapidoImg,
  "Lavagem de Carro": lavaRapidoImg,
  "Lava-Rápido": lavaRapidoImg,
};

// Componente de card de serviço
const ServiceCard = memo(({ service, onClick }: { 
  service: Service, 
  onClick: (id: number) => void 
}) => (
  <div 
    className="cursor-pointer" 
    onClick={() => onClick(service.id)}
  >
    <Card className="overflow-hidden">
      <CardContent className="p-3">
        <div className="flex gap-3">
          <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
            {serviceImages[service.name] || service.imageUrl ? (
              <img 
                src={serviceImages[service.name] || service.imageUrl} 
                alt={service.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
                {service.name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1">
            <h4 className="font-medium text-sm">{service.name}</h4>
            <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
              <span>{service.providerName}</span>
            </div>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <Timer size={12} />
                <span>{formatDuration(service.duration)}</span>
              </div>
              <div className="flex items-center gap-1 text-xs text-amber-500">
                <Star size={12} fill="currentColor" />
                <span>{service.rating}</span>
              </div>
            </div>
          </div>
          <div className="flex flex-col items-end justify-between">
            <span className="font-bold text-primary">
              {formatPrice(service.price)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
));

// Componente de serviço em formato horizontal para categorias
const CategoryServiceCard = memo(({ service, onClick }: { 
  service: Service, 
  onClick: (id: number) => void 
}) => (
  <div 
    className="flex-shrink-0 w-40 cursor-pointer" 
    onClick={() => onClick(service.id)}
  >
    <Card className="overflow-hidden h-full">
      <CardContent className="p-3 flex flex-col h-full">
        <div className="w-full h-24 rounded-md overflow-hidden bg-gray-100 mb-2">
          {serviceImages[service.name] || service.imageUrl ? (
            <img 
              src={serviceImages[service.name] || service.imageUrl} 
              alt={service.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10 text-primary font-bold">
              {service.name.charAt(0)}
            </div>
          )}
        </div>
        <h4 className="font-medium text-sm line-clamp-1">{service.name}</h4>
        <div className="flex items-center gap-1 text-xs text-gray-500 mt-1">
          <span className="line-clamp-1">{service.providerName}</span>
        </div>
        <div className="mt-auto pt-2 flex justify-between items-center">
          <div className="flex items-center gap-1 text-xs text-amber-500">
            <Star size={12} fill="currentColor" />
            <span>{service.rating}</span>
          </div>
          <span className="font-bold text-primary text-sm">
            {formatPrice(service.price)}
          </span>
        </div>
      </CardContent>
    </Card>
  </div>
));

// Componente de carregamento para a seção de serviços/prestadores
const RecentSectionSkeleton = () => (
  <div className="mb-6">
    <h2 className="text-lg font-bold mb-4 uppercase text-neutral-800">CARREGANDO...</h2>
    <div className="grid grid-cols-4 gap-3">
      {[...Array(8)].map((_, index) => (
        <div key={index} className="flex flex-col items-center animate-pulse">
          <Skeleton className="w-16 h-16 sm:w-18 sm:h-18 rounded-full mb-2" />
          <Skeleton className="w-14 h-3 mb-1" />
        </div>
      ))}
    </div>
  </div>
);

// Componente principal da dashboard
export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const [showMockup, setShowMockup] = useState(false); // Desativado por padrão para carregamento mais rápido
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [activeTab, setActiveTab] = useState("all"); // Guias para filtrar serviços
  
  // Obter serviços frequentes e prestadores recentes do usuário
  const { 
    data: personalizedData,
    isLoading: isPersonalizedDataLoading 
  } = useQuery({
    queryKey: ["/api/client/recent-services-providers"],
    staleTime: 5 * 60 * 1000, // 5 minutos
    retry: 1,
  });
  
  // Fetch recent appointments com staleTime para reduzir requisições
  const { 
    data: appointments = [], 
    isLoading: isAppointmentsLoading 
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    staleTime: 2 * 60 * 1000, // 2 minutos, pois agendamentos mudam com mais frequência
    retry: 1,
  });
  
  // Fetch categories como fallback caso o usuário não tenha histórico
  const { 
    data: categories = [], 
    isLoading: isCategoriesLoading 
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000, // 5 minutos
    enabled: !personalizedData || !(personalizedData as any)?.hasHistory || ((personalizedData as any)?.topServices && (personalizedData as any)?.topServices.length === 0),
    retry: 1,
  });
  
  // Dados locais para demonstração enquanto a API não está completa
  const mockFeaturedServices: Service[] = [
    { 
      id: 101, 
      name: "Corte Masculino", 
      duration: 30, 
      price: 45.00, 
      providerName: "Barbearia Silva", 
      rating: 4.8, 
      category: "Cabelo" 
    },
    { 
      id: 102, 
      name: "Manicure Completa", 
      duration: 60, 
      price: 65.00, 
      providerName: "Espaço da Beleza", 
      rating: 4.7, 
      category: "Unhas" 
    },
    { 
      id: 103, 
      name: "Limpeza de Pele", 
      duration: 90, 
      price: 120.00, 
      providerName: "Clínica Estética Renova", 
      rating: 4.9, 
      category: "Estética" 
    },
    { 
      id: 104, 
      name: "Design de Sobrancelhas", 
      duration: 30, 
      price: 35.00, 
      providerName: "Studio Beauty", 
      rating: 4.5, 
      category: "Sobrancelhas" 
    }
  ];

  const mockPopularServices: Service[] = [
    { 
      id: 201, 
      name: "Corte e Escova", 
      duration: 75, 
      price: 95.00, 
      providerName: "Salão Miranda", 
      rating: 4.6, 
      category: "Cabelo" 
    },
    { 
      id: 202, 
      name: "Pedicure", 
      duration: 45, 
      price: 55.00, 
      providerName: "Beleza Natural", 
      rating: 4.5, 
      category: "Unhas" 
    },
    { 
      id: 203, 
      name: "Massagem Relaxante", 
      duration: 60, 
      price: 150.00, 
      providerName: "Spa Vida", 
      rating: 4.9, 
      category: "Massagem" 
    }
  ];
  
  // Fetch de serviços em destaque para a primeira seção
  const { 
    data: featuredServices = mockFeaturedServices, 
    isLoading: isFeaturedServicesLoading 
  } = useQuery<Service[]>({
    queryKey: ["/api/services/featured"],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    initialData: mockFeaturedServices,
    enabled: false, // Temporariamente desativado até que a API esteja pronta
  });
  
  // Fetch de serviços populares para a segunda seção
  const { 
    data: popularServices = mockPopularServices, 
    isLoading: isPopularServicesLoading 
  } = useQuery<Service[]>({
    queryKey: ["/api/services/popular"],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    initialData: mockPopularServices,
    enabled: false, // Temporariamente desativado até que a API esteja pronta
  });
  
  // Dados locais para demonstração de serviços filtrados por categoria
  const mockCategoryServices: Record<string, Service[]> = {
    "1": [
      { 
        id: 301, 
        name: "Corte Feminino", 
        duration: 60, 
        price: 85.00, 
        providerName: "Salão Elegance", 
        rating: 4.7, 
        category: "Cabelo" 
      },
      { 
        id: 302, 
        name: "Coloração", 
        duration: 120, 
        price: 150.00, 
        providerName: "Studio Hair", 
        rating: 4.8, 
        category: "Cabelo" 
      }
    ],
    "2": [
      { 
        id: 401, 
        name: "Manicure", 
        duration: 40, 
        price: 40.00, 
        providerName: "Bella Unhas", 
        rating: 4.6, 
        category: "Unhas" 
      },
      { 
        id: 402, 
        name: "Spa dos Pés", 
        duration: 60, 
        price: 70.00, 
        providerName: "Espaço Relax", 
        rating: 4.9, 
        category: "Unhas" 
      }
    ],
    "3": [
      { 
        id: 501, 
        name: "Massagem Terapêutica", 
        duration: 90, 
        price: 180.00, 
        providerName: "Espaço Zen", 
        rating: 4.9, 
        category: "Massagem" 
      }
    ],
    "25": [
      {
        id: 601,
        name: "Polimento de Pintura",
        duration: 120,
        price: 250.00,
        providerName: "Estética Automotiva Premium",
        rating: 4.9,
        category: "Estética Automotiva"
      },
      {
        id: 602,
        name: "Lavagem Detalhada",
        duration: 90,
        price: 180.00,
        providerName: "Auto Clean",
        rating: 4.7,
        category: "Estética Automotiva"
      },
      {
        id: 603,
        name: "Cristalização de Pintura",
        duration: 180,
        price: 350.00,
        providerName: "CarSpa",
        rating: 4.8,
        category: "Estética Automotiva"
      }
    ]
  };
  
  // Fetch de serviços filtrados por categoria selecionada
  const { 
    data: categoryServices = activeTab !== "all" && mockCategoryServices[activeTab] 
      ? mockCategoryServices[activeTab] 
      : [], 
    isLoading: isCategoryServicesLoading 
  } = useQuery<Service[]>({
    queryKey: ["/api/services", activeTab !== "all" ? activeTab : null],
    staleTime: 5 * 60 * 1000,
    enabled: false, // Temporariamente desativado até que a API esteja pronta
    initialData: activeTab !== "all" && mockCategoryServices[activeTab] 
      ? mockCategoryServices[activeTab] 
      : [],
    retry: 1,
  });
  
  // Callbacks memoizados para prevenir re-renders
  const handleCategoryClick = useCallback((categoryId: number) => {
    setLocation(`/client/services/${categoryId}`);
  }, [setLocation]);

  const handleProviderClick = useCallback((providerId: number) => {
    setLocation(`/client/provider/${providerId}`);
  }, [setLocation]);
  
  // Callback para navegação direta para o fluxo de agendamento
  const handleServiceSelect = useCallback((serviceId: number) => {
    // Agora redireciona para o wizard de agendamento sem pré-selecionar nenhum serviço
    // para garantir que o usuário siga o fluxo completo desde o início
    console.log("Serviço selecionado:", serviceId, "mas iniciando fluxo completo de agendamento");
    setLocation('/client/new-booking');
  }, [setLocation]);

  const navigateToAllCategories = useCallback(() => {
    setLocation("/client/categories");
  }, [setLocation]);
  
  const navigateToNiches = useCallback(() => {
    setLocation("/client/niches");
  }, [setLocation]);
  
  const navigateToSearch = useCallback(() => {
    setLocation("/client/search");
  }, [setLocation]);
  
  const navigateToBookingWizard = useCallback(() => {
    setLocation("/client/new-booking");
  }, [setLocation]);
  
  // Efeito para remover o estado de carregamento inicial após dados carregarem
  useEffect(() => {
    if (!isPersonalizedDataLoading && !isAppointmentsLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [isPersonalizedDataLoading, isAppointmentsLoading, isInitialLoad]);
  
  // Efeito para gerenciar o estado das tabs e serviços filtrados
  useEffect(() => {
    console.log("Tab ativa alterada para:", activeTab);
  }, [activeTab]);

  // Se está em modo de mockup
  if (showMockup) {
    return (
      <div className="relative">
        <img src="/client-dashboard.png" alt="Dashboard do Cliente" className="w-full h-auto" />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md shadow-lg">
            <p className="text-center font-medium text-lg">Carregando interface...</p>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <ClientLayout>
      <AppHeader 
        showUserInfo 
        showNotificationIcon 
        userType="client" 
      />

      <PageTransition>
        <div className="p-3 sm:p-4 max-w-screen-lg mx-auto">
          {/* Botão de agendamento guiado */}
          <Button 
            className="w-full mb-4 py-4 sm:py-6 text-base sm:text-lg bg-primary hover:bg-primary/90 text-white shadow-sm" 
            onClick={navigateToBookingWizard}
          >
            <CalendarClock className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
            Agendar Serviço
          </Button>
          
          {/* Seção 1: Serviços em Destaque */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 uppercase text-neutral-800">Serviços em Destaque</h2>
            
            {isFeaturedServicesLoading ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {[...Array(4)].map((_, index) => (
                  <div key={index} className="w-40 flex-shrink-0">
                    <Skeleton className="h-32 w-full rounded-md mb-2" />
                    <Skeleton className="h-4 w-3/4 mb-1" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                ))}
              </div>
            ) : featuredServices.length > 0 ? (
              <div className="flex gap-3 overflow-x-auto pb-2">
                {featuredServices.map(service => (
                  <CategoryServiceCard 
                    key={service.id} 
                    service={service} 
                    onClick={handleServiceSelect} 
                  />
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center py-6 text-neutral-500">
                <p>Nenhum serviço em destaque disponível no momento.</p>
              </div>
            )}
          </div>
          
          {/* Seção 2: Serviços Populares */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 uppercase text-neutral-800">Serviços Populares</h2>
            
            {isPopularServicesLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="w-full">
                    <Skeleton className="h-24 w-full rounded-md" />
                  </div>
                ))}
              </div>
            ) : popularServices.length > 0 ? (
              <div className="space-y-3">
                {popularServices.map(service => (
                  <ServiceCard 
                    key={service.id} 
                    service={service} 
                    onClick={handleServiceSelect} 
                  />
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg p-4 text-center py-6 text-neutral-500">
                <p>Nenhum serviço popular disponível no momento.</p>
              </div>
            )}
          </div>
          
          {/* Agendamentos do dia atual */}
          <Suspense fallback={<AppointmentsSkeleton />}>
            {(() => {
              // Filtragem dos agendamentos para hoje com verificação mais rigorosa
              const now = new Date();
              
              // Formatar a data de hoje no formato ISO (YYYY-MM-DD)
              const today = now.toISOString().split('T')[0];
              
              // Filtra agendamentos que são EXATAMENTE para hoje
              const todayAppointments = appointments.filter(a => a.date === today);
              
              return todayAppointments.length > 0 ? (
                <div className="border-2 border-primary border-dashed rounded-lg p-4 mb-6 bg-primary/5">
                  <AppointmentsSection 
                    appointments={todayAppointments} 
                    isLoading={isAppointmentsLoading}
                    title="AGENDAMENTOS DE HOJE"
                    emptyMessage="Você não possui agendamentos para hoje."
                    limit={3}
                    showViewAll={true}
                  />
                </div>
              ) : null;
            })()}
          </Suspense>
          
          {/* Seção 3: Serviços por Categoria */}
          <div className="mb-6">
            <h2 className="text-lg font-bold mb-3 uppercase text-neutral-800">Por Categoria</h2>
            
            {/* Tabs para selecionar categoria */}
            <Tabs 
              value={activeTab} 
              onValueChange={setActiveTab}
              className="mb-4"
            >
              <TabsList className="w-full overflow-x-auto flex flex-nowrap whitespace-nowrap pb-1 -mb-1">
                <TabsTrigger value="all" className="flex-shrink-0">
                  Todas
                </TabsTrigger>
                {categories.map(category => (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.id.toString()}
                    className="flex-shrink-0"
                  >
                    {category.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            
            {activeTab === "all" ? (
              // Mostrar lista de categorias se "Todas" estiver selecionado
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-3">
                {categories.map(category => (
                  <CategoryItem 
                    key={category.id} 
                    category={category} 
                    onClick={handleCategoryClick} 
                  />
                ))}
              </div>
            ) : isCategoryServicesLoading ? (
              // Loading state para serviços de categoria
              <div className="space-y-3">
                {[...Array(3)].map((_, index) => (
                  <div key={index} className="w-full">
                    <Skeleton className="h-24 w-full rounded-md" />
                  </div>
                ))}
              </div>
            ) : categoryServices.length > 0 ? (
              // Serviços filtrados pela categoria
              <div className="space-y-3">
                {categoryServices.map(service => (
                  <ServiceCard 
                    key={service.id} 
                    service={service} 
                    onClick={handleServiceSelect} 
                  />
                ))}
              </div>
            ) : (
              // Estado vazio
              <div className="bg-gray-50 rounded-lg p-4 text-center py-6 text-neutral-500">
                <p>Nenhum serviço encontrado nesta categoria.</p>
              </div>
            )}
          </div>
        </div>
      </PageTransition>
    </ClientLayout>
  );
}
