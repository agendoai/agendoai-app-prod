import { memo, useCallback, useEffect, useState, Suspense } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Category } from "../../../../shared/schema";
import { ScissorsIcon } from "@/components/ui/scissors-icon";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Home,
  Search,
  PlusCircle,
  User,
  Star,
  CheckCircle
} from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Appointment {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  providerName: string;
  status: string;
}

interface Service {
  id: number;
  name: string;
  duration: number;
  price: number;
  providerName: string;
  rating: number;
  category: string;
  imageUrl?: string;
  categoryId?: number;
}

interface AppointmentsSectionProps {
  appointments: Appointment[];
  isLoading: boolean;
  title?: string;
  emptyMessage?: string;
  limit?: number;
  showViewAll?: boolean;
  setLocation: (path: string) => void;
}

const serviceImages: Record<string, string> = {
  "Corte de Cabelo": "/perfil-de-usuario.png",
  "Massagem": "/massagem.png",
  "Manicure": "/manicure.png",
  "Limpeza": "/limpeza.png",
  "Spa": "/spa.png",
  "Lavagem": "/lavagem.png",
  "Lavagem de Carro": "/lavagem-carro.png",
  "Lava-Rápido": "/lava-rapido.png",
};

const CategoryItem = memo(({ 
  category, 
  onClick 
}: { 
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

const ServiceItem = memo(({ 
  service, 
  onClick, 
  onServiceSelect  
}: { 
  service: Service, 
  onClick: (id: number) => void,
  onServiceSelect?: (serviceId: number) => void  
}) => (
  <button
    className="flex flex-col items-center"
    onClick={() => {
      if (onServiceSelect && service.id) {
        onServiceSelect(service.id);
      } else {
        onClick(service.categoryId || 0);
      }
    }}
  >
    <div
      className={`w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center mb-2 hover:shadow-md transition-shadow`}
      style={{ 
        backgroundColor: '#f0f0f0',
        border: '2px solid #d0d0d0',
        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
      }}
    >
      <ScissorsIcon 
        className={`h-6 w-6 sm:h-7 sm:w-7`} 
        style={{ color: '#666666' }} 
      />
    </div>
    <span className="text-xs font-medium text-center line-clamp-2 w-20 sm:w-24">{service.name}</span>
  </button>
));

const ProviderItem = memo(({ 
  provider, 
  onClick 
}: { 
  provider: { id: number, name: string }, 
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

const AppointmentsSkeleton = () => (
  <div className="space-y-3">
    {[...Array(3)].map((_, index) => (
      <Card key={`appointment-skeleton-${index}`} className="border border-neutral-200">
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

const AppointmentsSection = memo(({ 
  appointments, 
  isLoading,
  title = "AGENDAMENTOS RECENTES", 
  emptyMessage = "Você ainda não possui agendamentos.",
  limit = 3,
  showViewAll = true,
  setLocation
}: AppointmentsSectionProps) => (
  <div>
    <div className="flex justify-between items-center mb-4">
      <h2 className="text-base sm:text-lg font-bold uppercase text-neutral-800">{title}</h2>
      {showViewAll && appointments.length > 0 && (
        <button 
          className="text-xs text-primary font-medium"
          onClick={() => setLocation('/client/appointments')}
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
          <div key={`appointment-${appointment.id}`} className="bg-green-100 border-l-4 border-green-500 rounded-lg p-4 shadow flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <CheckCircle className="text-green-500" size={20} />
              <span className="font-semibold text-green-700 text-base">{appointment.startTime} - {appointment.endTime}</span>
            </div>
            <div className="text-sm text-neutral-700 font-medium">{appointment.serviceName}</div>
            <div className="text-xs text-neutral-500">{appointment.providerName}</div>
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={() => setLocation(`/client/appointments/${appointment.id}`)}>Ver detalhes</Button>
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="flex flex-col items-center py-6 text-neutral-500 dark:text-neutral-400">
        <svg width="64" height="64" fill="none" viewBox="0 0 64 64"><circle cx="32" cy="32" r="32" fill="#F3F4F6"/><path d="M32 20v12l8 4" stroke="#6366F1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
        <p className="mt-2">{emptyMessage}</p>
      </div>
    )}
  </div>
));

const ServiceCard = memo(({ 
  service, 
  onClick, 
  setLocation 
}: { 
  service: Service, 
  onClick: (id: number) => void, 
  setLocation: (path: string) => void 
}) => (
  <div 
    className="bg-gradient-to-br from-primary/10 to-white rounded-xl shadow-lg p-4 hover:scale-105 hover:shadow-2xl transition-transform cursor-pointer flex flex-col items-center gap-2"
    onClick={() => onClick(service.id)}
  >
    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-2">
      <ScissorsIcon className="h-8 w-8 text-primary" />
    </div>
    <h4 className="font-bold text-base text-primary text-center">{service.name}</h4>
    <div className="text-xs text-neutral-600 text-center">{service.providerName}</div>
    <div className="flex items-center gap-1 text-xs text-amber-500 justify-center">
      <Star size={14} fill="currentColor" />
      <span>{service.rating}</span>
    </div>
    <span className="font-bold text-primary text-lg">{formatPrice(service.price)}</span>
    <Button 
      size="sm" 
      className="mt-2 bg-primary text-white rounded-full px-4 py-1" 
      onClick={(e) => {
        e.stopPropagation();
        setLocation('/client/new-booking-wizard');
      }}
    >
      Agendar
    </Button>
  </div>
));

const CategoryServiceCard = memo(({ 
  service, 
  onClick, 
  setLocation 
}: { 
  service: Service, 
  onClick: (id: number) => void, 
  setLocation: (path: string) => void 
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
    <Button 
      size="sm" 
      className="mt-2 bg-primary text-white rounded-full px-4 py-1" 
      onClick={(e) => {
        e.stopPropagation();
        setLocation('/client/new-booking-wizard');
      }}
    >
      Agendar
    </Button>
  </div>
));

const formatPrice = (price: number): string => {
  return `R$ ${price.toFixed(2).replace('.', ',')}`;
};

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  
  const { 
    data: personalizedData,
    isLoading: isPersonalizedDataLoading 
  } = useQuery({
    queryKey: ["/api/client/recent-services-providers"],
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });
  
  const { 
    data: appointments = [], 
    isLoading: isAppointmentsLoading 
  } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    staleTime: 2 * 60 * 1000,
    retry: 1,
  });
  
  const { 
    data: categories = [], 
    isLoading: isCategoriesLoading 
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000,
    enabled: !personalizedData || !(personalizedData as any)?.hasHistory || ((personalizedData as any)?.topServices && (personalizedData as any)?.topServices.length === 0),
    retry: 1,
  });
  
  const mockFeaturedServices: Service[] = [
    { 
      id: 101, 
      name: "Corte Masculino", 
      duration: 30, 
      price: 45.00, 
      providerName: "Barbearia Silva", 
      rating: 4.8, 
      category: "Cabelo",
      categoryId: 1
    },
    { 
      id: 102, 
      name: "Manicure Completa", 
      duration: 60, 
      price: 65.00, 
      providerName: "Espaço da Beleza", 
      rating: 4.7, 
      category: "Unhas",
      categoryId: 2
    },
    { 
      id: 103, 
      name: "Limpeza de Pele", 
      duration: 90, 
      price: 120.00, 
      providerName: "Clínica Estética Renova", 
      rating: 4.9, 
      category: "Estética",
      categoryId: 3
    },
    { 
      id: 104, 
      name: "Design de Sobrancelhas", 
      duration: 30, 
      price: 35.00, 
      providerName: "Studio Beauty", 
      rating: 4.5, 
      category: "Sobrancelhas",
      categoryId: 4
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
      category: "Cabelo",
      categoryId: 1
    },
    { 
      id: 202, 
      name: "Pedicure", 
      duration: 45, 
      price: 55.00, 
      providerName: "Beleza Natural", 
      rating: 4.5, 
      category: "Unhas",
      categoryId: 2
    },
    { 
      id: 203, 
      name: "Massagem Relaxante", 
      duration: 60, 
      price: 150.00, 
      providerName: "Spa Vida", 
      rating: 4.9, 
      category: "Massagem",
      categoryId: 5
    }
  ];
  
  const { 
    data: featuredServices = mockFeaturedServices, 
    isLoading: isFeaturedServicesLoading 
  } = useQuery<Service[]>({
    queryKey: ["/api/services/featured"],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    initialData: mockFeaturedServices,
    enabled: false,
  });
  
  const { 
    data: popularServices = mockPopularServices, 
    isLoading: isPopularServicesLoading 
  } = useQuery<Service[]>({
    queryKey: ["/api/services/popular"],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    initialData: mockPopularServices,
    enabled: false,
  });
  
  const mockCategoryServices: Record<string, Service[]> = {
    "1": [
      { 
        id: 301, 
        name: "Corte Feminino", 
        duration: 60, 
        price: 85.00, 
        providerName: "Salão Elegance", 
        rating: 4.7, 
        category: "Cabelo",
        categoryId: 1
      },
      { 
        id: 302, 
        name: "Coloração", 
        duration: 120, 
        price: 150.00, 
        providerName: "Studio Hair", 
        rating: 4.8, 
        category: "Cabelo",
        categoryId: 1
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
        category: "Unhas",
        categoryId: 2
      },
      { 
        id: 402, 
        name: "Spa dos Pés", 
        duration: 60, 
        price: 70.00, 
        providerName: "Espaço Relax", 
        rating: 4.9, 
        category: "Unhas",
        categoryId: 2
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
        category: "Massagem",
        categoryId: 5
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
        category: "Estética Automotiva",
        categoryId: 25
      },
      {
        id: 602,
        name: "Lavagem Detalhada",
        duration: 90,
        price: 180.00,
        providerName: "Auto Clean",
        rating: 4.7,
        category: "Estética Automotiva",
        categoryId: 25
      },
      {
        id: 603,
        name: "Cristalização de Pintura",
        duration: 180,
        price: 350.00,
        providerName: "CarSpa",
        rating: 4.8,
        category: "Estética Automotiva",
        categoryId: 25
      }
    ]
  };
  
  const { 
    data: categoryServices = activeTab !== "all" && mockCategoryServices[activeTab] 
      ? mockCategoryServices[activeTab] 
      : [], 
    isLoading: isCategoryServicesLoading 
  } = useQuery<Service[]>({
    queryKey: ["/api/services", activeTab !== "all" ? activeTab : null],
    staleTime: 5 * 60 * 1000,
    enabled: false,
    initialData: activeTab !== "all" && mockCategoryServices[activeTab] 
      ? mockCategoryServices[activeTab] 
      : [],
    retry: 1,
  });
  
  const handleCategoryClick = useCallback((categoryId: number) => {
    setLocation(`/client/services/${categoryId}`);
  }, [setLocation]);

  const handleProviderClick = useCallback((providerId: number) => {
    setLocation(`/client/provider/${providerId}`);
  }, [setLocation]);
  
  const navigateToBookingWizard = useCallback(() => {
    setLocation('/client/new-booking-wizard');
  }, [setLocation]);

  useEffect(() => {
    if (!isPersonalizedDataLoading && !isAppointmentsLoading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [isPersonalizedDataLoading, isAppointmentsLoading, isInitialLoad]);
  
  const todayAppointments = appointments.filter(a => a.date === new Date().toISOString().split('T')[0]);

    return (
    <div className="min-h-screen w-full bg-white pb-24 flex justify-center items-start">
      <div className="w-full max-w-md mx-auto px-2 sm:px-0">
        <header className="flex flex-col items-center justify-center pt-6 pb-2 relative">
          <img src="/AgendoAilogo.png" alt="AgendoAI Logo" className="h-12 w-auto mb-1 drop-shadow-2xl" />
          {/* Saudação personalizada */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-cyan-700 text-center mb-2 mt-1 tracking-tight drop-shadow-sm">
            {user?.name ? `Bem-vindo, ${user.name.split(' ')[0]}!` : 'Bem-vindo!'}
          </h1>
          <div className="absolute top-2 right-2">
            <div className="group relative">
              <button className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 shadow px-2 py-1 rounded-full border border-gray-200 text-neutral-900 font-semibold focus:outline-none transition-all duration-200 text-sm">
                <User className="h-5 w-5 text-cyan-500" />
                <span className="hidden sm:inline">Menu</span>
              </button>
              <div className="hidden group-hover:flex group-focus:flex flex-col absolute right-0 mt-2 w-44 bg-white rounded-2xl shadow-lg border border-gray-100 z-50">
                <button className="px-3 py-2 text-left hover:bg-cyan-50 text-sm" onClick={() => setLocation('/client/profile')}>Acessar Perfil</button>
                <button className="px-3 py-2 text-left hover:bg-cyan-50 text-sm" onClick={() => setLocation('/client/support')}>Ajuda / Suporte</button>
                <button className="px-3 py-2 text-left text-red-600 hover:bg-red-50 text-sm" onClick={() => { if(window.confirm('Deseja realmente sair?')) { localStorage.clear(); setLocation('/'); } }}>Sair</button>
              </div>
            </div>
          </div>
        </header>

        {/* Botão de agendar fixo no topo */}
        <div className="flex justify-center sticky top-0 z-30 bg-white pb-2 pt-2">
          <button
            className="w-[92%] h-11 rounded-lg bg-gradient-to-r from-cyan-400 via-teal-400 to-emerald-400 text-white text-base font-bold shadow flex flex-row items-center justify-center px-6 border-0 hover:brightness-105 hover:scale-[1.02] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-300/40 gap-2"
            onClick={navigateToBookingWizard}
          >
            <PlusCircle className="h-5 w-5 text-white mr-2" />
            Agendar
          </button>
        </div>

        <div className="pt-1 pb-4 space-y-5">
          <div className="mb-1">
            <h2 className="font-bold text-neutral-900 text-[1.25rem] mb-2 tracking-wide">Próximos Agendamentos</h2>
            <div className="space-y-2">
              {isAppointmentsLoading ? (
                <AppointmentsSkeleton />
              ) : appointments.length > 0 ? (
                appointments.slice(0, 3).map((appointment) => (
                  <div key={`appointment-${appointment.id}`} className="flex items-center h-16 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow p-2 hover:shadow-lg transition-all duration-150 cursor-pointer">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cyan-50 mr-2">
                      <CheckCircle className="text-cyan-400" size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[1rem] text-neutral-900 truncate">{appointment.serviceName}</div>
                      <div className="text-xs text-cyan-700 font-medium">{appointment.startTime} - {appointment.endTime}</div>
                      <div className="text-xs text-neutral-400 truncate">{appointment.providerName}</div>
                    </div>
                    <Button size="sm" variant="outline" className="ml-2 px-3 py-1 text-xs" onClick={() => setLocation(`/client/appointments/${appointment.id}`)}>Ver</Button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-4 text-neutral-400 text-sm">Nenhum agendamento.</div>
              )}
            </div>
          </div>

          <div className="mb-1">
            <h2 className="text-[1.1rem] font-bold mb-2 text-neutral-900 border-l-4 border-cyan-400 pl-2 tracking-wide">Serviços em Destaque</h2>
            <div className="space-y-2">
              {isFeaturedServicesLoading ? (
                <AppointmentsSkeleton />
              ) : featuredServices.length > 0 ? (
                featuredServices.map(service => (
                  <div key={`featured-${service.id}`} className="flex items-center h-16 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow p-2 hover:shadow-lg transition-all duration-150 cursor-pointer group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 mr-2">
                      <Star className="text-emerald-400" size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[1rem] text-neutral-900 truncate">{service.name}</div>
                      <div className="text-xs text-emerald-700 font-medium">{service.providerName}</div>
                      <div className="text-xs text-neutral-400 truncate">R$ {service.price.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <Button size="sm" variant="outline" className="ml-2 px-3 py-1 text-xs opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity" onClick={() => setLocation('/client/new-booking-wizard')}>Agendar</Button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-4 text-neutral-400 text-sm">Nenhum serviço em destaque.</div>
              )}
            </div>
          </div>

          <div className="mb-1">
            <h2 className="text-[1.1rem] font-bold mb-2 text-neutral-900 border-l-4 border-cyan-400 pl-2 tracking-wide">Serviços Populares</h2>
            <div className="space-y-2">
              {isPopularServicesLoading ? (
                <AppointmentsSkeleton />
              ) : popularServices.length > 0 ? (
                popularServices.map(service => (
                  <div key={`popular-${service.id}`} className="flex items-center h-16 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow p-2 hover:shadow-lg transition-all duration-150 cursor-pointer group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 mr-2">
                      <Star className="text-blue-400" size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[1rem] text-neutral-900 truncate">{service.name}</div>
                      <div className="text-xs text-blue-700 font-medium">{service.providerName}</div>
                      <div className="text-xs text-neutral-400 truncate">R$ {service.price.toFixed(2).replace('.', ',')}</div>
                    </div>
                    <Button size="sm" variant="outline" className="ml-2 px-3 py-1 text-xs opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity" onClick={() => setLocation('/client/new-booking-wizard')}>Agendar</Button>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-4 text-neutral-400 text-sm">Nenhum serviço popular.</div>
              )}
            </div>
          </div>

          <div className="mb-1">
            <h2 className="text-[1.1rem] font-bold mb-2 text-neutral-900 border-l-4 border-cyan-400 pl-2 tracking-wide">Por Categoria</h2>
            <div className="space-y-2">
              {categories.length > 0 ? (
                categories.map(category => (
                  <div key={`category-${category.id}`} className="flex items-center h-14 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow p-2 hover:shadow-lg transition-all duration-150 cursor-pointer" onClick={() => handleCategoryClick(category.id)}>
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-cyan-50 mr-2">
                      <ScissorsIcon className="h-5 w-5 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-[0.98rem] text-neutral-900 truncate">{category.name}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center py-4 text-neutral-400 text-sm">Nenhuma categoria.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <nav className="fixed bottom-0 left-1/2 transform -translate-x-1/2 w-full max-w-md bg-white shadow-xl flex justify-around items-center py-2 rounded-t-2xl z-50 border-t border-gray-100">
        <button 
          className="flex flex-col items-center text-cyan-600 font-bold transition-all duration-200 drop-shadow-lg hover:text-cyan-900" 
          aria-current="page" 
          style={{ filter: 'brightness(1.2)' }}
          onClick={() => setLocation('/client/dashboard')}
        >
          <Home className="h-8 w-8 mb-0.5 text-cyan-400" />
            <span className="text-[0.7rem]">Início</span>
          </button>
        <button 
          className="flex flex-col items-center text-cyan-600 hover:text-emerald-400 transition-all duration-200" 
          onClick={navigateToBookingWizard}
        >
          <PlusCircle className="h-8 w-8 mb-0.5 text-emerald-400" />
            <span className="text-[0.7rem]">Agendar</span>
          </button>
        <button 
          className="flex flex-col items-center text-cyan-600 hover:text-blue-400 transition-all duration-200" 
          onClick={() => setLocation('/client/providers')}
        >
          <Search className="h-8 w-8 mb-0.5 text-blue-400" />
          <span className="text-[0.7rem]">Buscar</span>
          </button>
        <button 
          className="flex flex-col items-center text-cyan-600 hover:text-pink-400 transition-all duration-200" 
          onClick={() => setLocation('/client/profile')}
        >
          <User className="h-8 w-8 mb-0.5 text-pink-400" />
            <span className="text-[0.7rem]">Perfil</span>
          </button>
        </nav>
    </div>
  );
}
