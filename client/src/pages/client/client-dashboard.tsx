import { memo, useCallback, useEffect, useState, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import type { Category } from "@shared/schema";

// Estilos CSS personalizados para barra de rolagem fina
const scrollbarStyles = `
  .scrollbar-thin::-webkit-scrollbar {
    width: 4px;
  }
  .scrollbar-thin::-webkit-scrollbar-track {
    background: #f1f1f1;
    border-radius: 2px;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 2px;
  }
  .scrollbar-thin::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
`;
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
  CheckCircle,
  Clock,
  XCircle,
  Cog,
  Briefcase,
  Scissors,
  Car,
  Heart,
  Home as HomeIcon,
  Camera,
  Music,
  Utensils,
  Dumbbell,
  Palette,
  BookOpen,
  Zap,
  TrendingUp,
  Users,
  FolderOpen
} from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Navbar from '@/components/layout/navbar';
import { apiCall } from '@/lib/api';
import { useQuery as useRQ } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface Appointment {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  serviceName: string;
  providerName: string;
  status: string;
  paymentStatus?: string;
  totalPrice?: number;
  paymentMethod?: string;
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

// Badge de status igual appointments-page
const StatusBadge = ({ status }: { status: string | null }) => {
  if (!status) return null;
  let variant = "outline";
  let label = status;
  let className = "text-[8px] sm:text-[10px] px-1 py-0.5 sm:px-1.5";
  switch (status) {
    case "confirmed":
    case "confirmado":
      variant = "default";
      label = "Confirmado";
      className += " bg-green-100 text-green-800 border-green-200";
      break;
    case "pending":
      variant = "secondary";
      label = "Pendente";
      className += " bg-yellow-100 text-yellow-800 border-yellow-200";
      break;
    case "completed":
      variant = "outline";
      label = "Concluído";
      className += " bg-cyan-100 text-cyan-800 border-cyan-200";
      break;
    case "canceled":
      variant = "destructive";
      label = "Cancelado";
      className += " bg-red-100 text-red-800 border-red-200";
      break;
    case "executing":
      variant = "outline";
      label = "Executando";
      className += " bg-blue-100 text-blue-800 border-blue-200";
      break;
    case "no_show":
      variant = "destructive";
      label = "Não Compareceu";
      className += " bg-orange-100 text-orange-800 border-orange-200";
      break;
    default:
      variant = "outline";
  }
  return (
    <Badge variant={variant as any} className={className}>{label}</Badge>
  );
};
// Badge de status de pagamento igual appointments-page
const PaymentStatusBadge = ({ status }: { status: string | null | undefined }) => {
  let className = "text-[8px] sm:text-[10px] px-1 py-0.5 sm:px-1.5";
  if (!status || status === 'pending' || status === 'aguardando_pagamento') {
    return <Badge variant="warning" className={className + " bg-yellow-100 text-yellow-800 border-yellow-200"}>Aguardando pagamento</Badge>;
  }
  if (status === 'confirmado' || status === 'paid') {
    return <Badge variant="success" className={className + " bg-green-100 text-green-800 border-green-200"}>Pago</Badge>;
  }
  if (status === 'failed') {
    return <Badge variant="destructive" className={className + " bg-red-100 text-red-800 border-red-200"}>Pagamento falhou</Badge>;
  }
  if (status === 'refunded') {
    return <Badge variant="info" className={className + " bg-blue-100 text-blue-800 border-blue-200"}>Pagamento reembolsado</Badge>;
  }
  return <Badge variant="outline" className={className}>{status}</Badge>;
};

// Função para obter ícone baseado no nome da categoria
function getCategoryIcon(categoryName: string) {
  const iconMap: { [key: string]: any } = {
    scissors: Scissors,
    car: Car,
    heart: Heart,
    home: HomeIcon,
    briefcase: Briefcase,
    camera: Camera,
    music: Music,
    utensils: Utensils,
    dumbbell: Dumbbell,
    palette: Palette,
    book: BookOpen,
    zap: Zap,
    star: Star,
    trending: TrendingUp,
    users: Users,
    folder: FolderOpen,
    default: Briefcase
  };
  // Busca por palavra-chave no nome da categoria
  const name = categoryName?.toLowerCase() || "";
  if (name.includes("carro") || name.includes("auto") || name.includes("veículo")) return Car;
  if (name.includes("beleza") || name.includes("cabelo") || name.includes("barbearia")) return Scissors;
  if (name.includes("casa") || name.includes("domiciliar")) return HomeIcon;
  if (name.includes("limpeza")) return Palette;
  if (name.includes("alimentação") || name.includes("comida") || name.includes("restaurante")) return Utensils;
  if (name.includes("reparo") || name.includes("conserto")) return Cog; // Changed from Wrench to Cog
  if (name.includes("saúde")) return Heart;
  if (name.includes("arte")) return Palette;
  if (name.includes("consultoria")) return TrendingUp;
  if (name.includes("infantil") || name.includes("criança")) return Users;
  if (name.includes("música")) return Music;
  if (name.includes("livro") || name.includes("educação")) return BookOpen;
  if (name.includes("foto") || name.includes("câmera")) return Camera;
  if (name.includes("academia") || name.includes("fitness")) return Dumbbell;
  if (name.includes("evento")) return Star;
  if (name.includes("negócio") || name.includes("empresa")) return Briefcase;
  return iconMap[categoryName?.toLowerCase()] || Briefcase;
}

export default function ClientDashboard() {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("all");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const queryClient = useQueryClient();
  const cancelAppointmentMutation = useMutation({
    mutationFn: async (appointmentId: number) => {
      const response = await apiCall(`/api/booking/${appointmentId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: 'canceled' }),
        headers: { 'Content-Type': 'application/json' },
      });
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/client/appointments"] });
    },
  });
  
  const { 
    data: personalizedData,
    isLoading: isPersonalizedDataLoading 
  } = useQuery({
    queryKey: ["/api/client/recent-services-providers"],
    staleTime: 5 * 60 * 1000,
    retry: 1,
    enabled: !!localStorage.getItem('authToken'), // Só fazer requisição se houver token
  });
  
  const { 
    data: appointments = [], 
    isLoading: isAppointmentsLoading 
  } = useQuery<Appointment[]>({
    queryKey: ["/api/client/appointments"],
    staleTime: 2 * 60 * 1000,
    retry: 1,
    enabled: !!localStorage.getItem('authToken'), // Só fazer requisição se houver token
  });
  
  const { 
    data: categories = [], 
    isLoading: isCategoriesLoading 
  } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
    staleTime: 5 * 60 * 1000,
    enabled: !!localStorage.getItem('authToken') && (!personalizedData || !(personalizedData as any)?.hasHistory || ((personalizedData as any)?.topServices && (personalizedData as any)?.topServices.length === 0)),
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
       <style>{scrollbarStyles}</style>
      <div className="w-full max-w-md mx-auto px-2 sm:px-0">
        <header className="flex flex-col items-center justify-center pt-6 pb-2 relative">
          <img src="/AgendoAilogo.png" alt="AgendoAI Logo" className="h-12 w-auto mb-1 drop-shadow-2xl" />
          {/* Saudação personalizada */}
          <h1 className="text-xl sm:text-2xl font-extrabold text-cyan-700 text-center mb-2 mt-1 tracking-tight drop-shadow-sm">
            {user?.name ? `Bem-vindo, ${user.name.split(' ')[0]}!` : 'Bem-vindo!'}
          </h1>
          {/* Botão de menu removido */}
        </header>

        {/* Botão de agendar fixo no topo */}
        <div className="flex justify-center sticky top-0 z-30 bg-white pb-2 pt-2">
          <button
            className="w-[92%] h-11 rounded-lg bg-[#58c9d1] text-white text-base font-bold shadow-lg flex flex-row items-center justify-center px-6 border-0 hover:shadow-xl hover:scale-[1.03] transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#58c9d1]/40 gap-2"
            onClick={navigateToBookingWizard}
          >
            <PlusCircle className="h-5 w-5 text-white mr-2" />
            Agendar
          </button>
        </div>

        <div className="pt-1 pb-4 space-y-5">
          <div className="mb-1">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-neutral-900 text-base tracking-wide">Agendamentos</h2>
              <div className="flex items-center gap-2">
                {appointments.filter(a => a.status === 'pending').length > 0 && (
                  <div className="flex items-center gap-1 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full text-xs font-medium">
                    <Clock className="w-3 h-3" />
                    {appointments.filter(a => a.status === 'pending').length} pendente{appointments.filter(a => a.status === 'pending').length > 1 ? 's' : ''}
                  </div>
                )}
                {appointments.length > 0 && (
                  <button 
                    className="text-xs text-primary font-medium hover:text-primary/80 transition-colors"
                    onClick={() => setLocation('/client/appointments')}
                  >
                    Ver todos
                  </button>
                )}
              </div>
            </div>
                                                   <div className="space-y-2 max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
               {isAppointmentsLoading ? (
                 <AppointmentsSkeleton />
               ) : appointments.length > 0 ? (
                 appointments
                   .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                   .map((appointment) => (
                     <div key={`appointment-${appointment.id}`} className={`flex items-start bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-lg shadow-sm p-2 hover:shadow-md transition-all duration-150 min-h-[3.5rem] sm:min-h-[4rem]`}>
                       <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-2 mt-1 bg-yellow-50 flex-shrink-0">
                         <Clock className="text-yellow-500" size={18} />
                       </div>
                       <div className="flex-1 min-w-0 flex flex-col">
                         <div className="font-semibold text-[0.8rem] sm:text-[0.9rem] text-neutral-900 truncate leading-tight mb-0.5">{appointment.serviceName}</div>
                         <div className="text-[10px] sm:text-xs text-cyan-700 font-medium leading-tight mb-0.5">
                           {appointment.startTime} - {appointment.endTime}
                           {(() => {
                             const today = new Date().toISOString().split('T')[0];
                             const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
                             if (appointment.date === today) {
                               return ' • Hoje';
                             } else if (appointment.date === tomorrow) {
                               return ' • Amanhã';
                             }
                             return '';
                           })()}
                         </div>
                         <div className="text-[10px] sm:text-xs text-neutral-400 truncate leading-tight mb-0.5">{appointment.providerName}</div>
                         <div className="flex flex-col gap-1 mt-1">
                           <StatusBadge status={appointment.status} />
                           {appointment.status !== 'canceled' && <PaymentStatusBadge status={appointment.paymentStatus} />}
                         </div>
                        {/* Código de validação (ver ao clicar) */}
                        {(appointment.status === 'confirmed' || appointment.status === 'confirmado' || appointment.status === 'executing') && (
                          <ClientDashboardValidationCodeButton appointmentId={appointment.id} />
                        )}
                         {typeof appointment.totalPrice === 'number' && appointment.totalPrice > 0 && (
                           <div className="text-[10px] sm:text-xs text-neutral-600 font-medium leading-tight mt-1">
                             R$ {(appointment.totalPrice / 100).toFixed(2).replace('.', ',')}
                           </div>
                         )}
                         {/* Botões de ação */}
                         <div className="flex flex-row gap-1 sm:gap-2 mt-2 sm:mt-3 justify-end">
                           {['pending', 'aguardando_pagamento'].includes(appointment.paymentStatus) && ['pix', 'credit_card', 'boleto'].includes(appointment.paymentMethod) ? (
                             <button
                               className="px-2 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs rounded-full bg-[#58c9d1] text-white font-semibold shadow-sm hover:bg-[#3eb9aa] hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#58c9d1]/40 order-first mr-auto"
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setLocation(`/client/appointments/${appointment.id}/pay`);
                               }}
                             >
                               Pagar
                             </button>
                           ) : appointment.paymentMethod === 'money' ? (
                             <span className="px-2 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs rounded-full bg-gray-100 text-gray-600 font-semibold shadow-sm border border-gray-200">Pagamento no local</span>
                           ) : appointment.paymentStatus === 'paid' ? (
                             <span className="px-2 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs rounded-full bg-green-100 text-green-700 font-semibold shadow-sm border border-green-200">Pago</span>
                           ) : null}
                           <button
                             className="px-2 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs rounded-full bg-gray-100 text-cyan-700 font-semibold shadow-sm hover:bg-cyan-100 hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                             onClick={(e) => {
                               e.stopPropagation();
                               setLocation(`/client/appointments/${appointment.id}`);
                             }}
                           >
                             Ver
                           </button>
                           {(appointment.status === 'pending' || appointment.status === 'confirmed' || appointment.status === 'confirmado') && (
                             <button
                               className="px-2 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs rounded-full bg-red-100 text-red-700 font-semibold shadow-sm hover:bg-red-200 hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-red-200"
                               onClick={e => {
                                 e.stopPropagation();
                                 cancelAppointmentMutation.mutate(appointment.id);
                               }}
                               disabled={cancelAppointmentMutation.isPending}
                             >
                               {cancelAppointmentMutation.isPending ? 'Cancelando...' : 'Cancelar'}
                             </button>
                           )}
                         </div>
                       </div>
                     </div>
                   ))
               ) : (
                 <div className="flex flex-col items-center py-4 text-neutral-400 text-sm">
                   "Nenhum agendamento."
                 </div>
               )}
             </div>
          </div>

          {/* Seção de agendamentos por status */}
          {(() => {
            const executingAppointments = appointments.filter(a => a.status === 'executing');
            const noShowAppointments = appointments.filter(a => a.status === 'no_show');
            const canceledAppointments = appointments.filter(a => a.status === 'canceled');
            
            return (
              <>
                                 {/* Agendamentos Executando */}
                 {executingAppointments.length > 0 && (
                   <div className="mb-1 mt-6">
                     <h2 className="font-bold text-blue-700 text-base tracking-wide">Em Execução</h2>
                     <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                       {executingAppointments
                         .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                         .map((appointment) => (
                           <div key={`appointment-executing-${appointment.id}`} className="flex items-start bg-gradient-to-br from-white to-blue-50 border border-blue-200 rounded-lg shadow-sm p-2 min-h-[3.5rem] sm:min-h-[4rem]">
                             <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-2 mt-1 bg-blue-100 flex-shrink-0">
                               <Clock className="text-blue-500" size={18} />
                             </div>
                             <div className="flex-1 min-w-0 flex flex-col">
                               <div className="font-semibold text-[0.8rem] sm:text-[0.9rem] text-neutral-900 truncate leading-tight mb-0.5">{appointment.serviceName}</div>
                               <div className="text-[10px] sm:text-xs text-cyan-700 font-medium leading-tight mb-0.5">
                                 {appointment.startTime} - {appointment.endTime}
                               </div>
                               <div className="text-[10px] sm:text-xs text-neutral-400 truncate leading-tight mb-0.5">{appointment.providerName}</div>
                               <div className="flex flex-col gap-1 mt-1">
                                 <StatusBadge status={appointment.status} />
                               </div>
                               {typeof appointment.totalPrice === 'number' && appointment.totalPrice > 0 && (
                                 <div className="text-[10px] sm:text-xs text-neutral-600 font-medium leading-tight mt-1">
                                   R$ {(appointment.totalPrice / 100).toFixed(2).replace('.', ',')}
                                 </div>
                               )}
                               <div className="flex flex-row gap-1 sm:gap-2 mt-2 sm:mt-3 justify-end">
                                 <button
                                   className="px-2 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs rounded-full bg-gray-100 text-cyan-700 font-semibold shadow-sm hover:bg-cyan-100 hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setLocation(`/client/appointments/${appointment.id}`);
                                   }}
                                 >
                                   Ver
                                 </button>
                               </div>
                             </div>
                           </div>
                         ))}
                     </div>
                   </div>
                 )}

                 {/* Agendamentos Não Compareceu */}
                 {noShowAppointments.length > 0 && (
                   <div className="mb-1 mt-6">
                     <h2 className="font-bold text-orange-700 text-base tracking-wide">Não Compareceu</h2>
                     <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                       {noShowAppointments
                         .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                         .map((appointment) => (
                           <div key={`appointment-no-show-${appointment.id}`} className="flex items-start bg-gradient-to-br from-white to-orange-50 border border-orange-200 rounded-lg shadow-sm p-2 min-h-[3.5rem] sm:min-h-[4rem]">
                             <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-2 mt-1 bg-orange-100 flex-shrink-0">
                               <Clock className="text-orange-500" size={18} />
                             </div>
                             <div className="flex-1 min-w-0 flex flex-col">
                               <div className="font-semibold text-[0.8rem] sm:text-[0.9rem] text-neutral-900 truncate leading-tight mb-0.5">{appointment.serviceName}</div>
                               <div className="text-[10px] sm:text-xs text-cyan-700 font-medium leading-tight mb-0.5">
                                 {appointment.startTime} - {appointment.endTime}
                               </div>
                               <div className="text-[10px] sm:text-xs text-neutral-400 truncate leading-tight mb-0.5">{appointment.providerName}</div>
                               <div className="flex flex-col gap-1 mt-1">
                                 <StatusBadge status={appointment.status} />
                               </div>
                               {typeof appointment.totalPrice === 'number' && appointment.totalPrice > 0 && (
                                 <div className="text-[10px] sm:text-xs text-neutral-600 font-medium leading-tight mt-1">
                                   R$ {(appointment.totalPrice / 100).toFixed(2).replace('.', ',')}
                                 </div>
                               )}
                               <div className="flex flex-row gap-1 sm:gap-2 mt-2 sm:mt-3 justify-end">
                                 <button
                                   className="px-2 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs rounded-full bg-gray-100 text-cyan-700 font-semibold shadow-sm hover:bg-cyan-100 hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setLocation(`/client/appointments/${appointment.id}`);
                                   }}
                                 >
                                   Ver
                                 </button>
                               </div>
                             </div>
                           </div>
                         ))}
                     </div>
                   </div>
                 )}

                 {/* Agendamentos Cancelados */}
                 {canceledAppointments.length > 0 && (
                   <div className="mb-1 mt-6">
                     <h2 className="font-bold text-red-700 text-base tracking-wide">Agendamentos Cancelados</h2>
                     <div className="space-y-2 max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                       {canceledAppointments
                         .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                         .map((appointment) => (
                           <div key={`appointment-canceled-${appointment.id}`} className="flex items-start bg-gradient-to-br from-white to-red-50 border border-red-200 rounded-lg shadow-sm p-2 min-h-[3.5rem] sm:min-h-[4rem]">
                             <div className="flex items-center justify-center w-8 h-8 sm:w-10 sm:h-10 rounded-full mr-2 mt-1 bg-red-100 flex-shrink-0">
                               <Clock className="text-red-500" size={18} />
                             </div>
                             <div className="flex-1 min-w-0 flex flex-col">
                               <div className="font-semibold text-[0.8rem] sm:text-[0.9rem] text-neutral-900 truncate leading-tight mb-0.5">{appointment.serviceName}</div>
                               <div className="text-[10px] sm:text-xs text-cyan-700 font-medium leading-tight mb-0.5">
                                 {appointment.startTime} - {appointment.endTime}
                               </div>
                               <div className="text-[10px] sm:text-xs text-neutral-400 truncate leading-tight mb-0.5">{appointment.providerName}</div>
                               <div className="flex flex-col gap-1 mt-1">
                                 <StatusBadge status={appointment.status} />
                               </div>
                               {typeof appointment.totalPrice === 'number' && appointment.totalPrice > 0 && (
                                 <div className="text-[10px] sm:text-xs text-neutral-600 font-medium leading-tight mt-1">
                                   R$ {(appointment.totalPrice / 100).toFixed(2).replace('.', ',')}
                                 </div>
                               )}
                               <div className="flex flex-row gap-1 sm:gap-2 mt-2 sm:mt-3 justify-end">
                                 <button
                                   className="px-2 py-1 sm:px-4 sm:py-1.5 text-[10px] sm:text-xs rounded-full bg-gray-100 text-cyan-700 font-semibold shadow-sm hover:bg-cyan-100 hover:shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                                   onClick={(e) => {
                                     e.stopPropagation();
                                     setLocation(`/client/appointments/${appointment.id}`);
                                   }}
                                 >
                                   Ver
                                 </button>
                               </div>
                             </div>
                           </div>
                         ))}
                     </div>
                   </div>
                 )}
              </>
            );
          })()}

          <div className="mb-1">
            <h2 className="text-[1.1rem] font-bold mb-2 text-neutral-900 border-l-4 border-cyan-400 pl-2 tracking-wide">Serviços em Destaque</h2>
            <div className="space-y-2">
              {isFeaturedServicesLoading ? (
                <AppointmentsSkeleton />
              ) : featuredServices.length > 0 ? (
                featuredServices.map(service => (
                  <div key={`featured-${service.id}`} className="flex items-center h-16 bg-gradient-to-br from-white to-gray-50 border border-gray-100 rounded-xl shadow p-2 hover:shadow-lg transition-all duration-150 cursor-pointer group">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-50 mr-2">
                      <Cog className="text-emerald-400" size={22} />
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
                      <Cog className="text-blue-400" size={22} />
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
                      {(() => {
                        const Icon = getCategoryIcon(category.name);
                        return <Icon className="h-5 w-5 text-cyan-400" />;
                      })()}
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
      <Navbar />
    </div>
  );
}

function ClientDashboardValidationCodeButton({ appointmentId }: { appointmentId: number }) {
  const [show, setShow] = useState(false);
  const { data, isLoading } = useRQ({
    queryKey: ["/api/appointments", appointmentId, "validation-code"],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/appointments/${appointmentId}/validation-code`);
      if (response.status === 404) return null;
      return await response.json();
    },
    enabled: show,
    retry: 1
  });

  if (!show) {
    return (
      <button
        className="mt-1 self-start text-[10px] sm:text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-700 font-semibold"
        onClick={(e) => { e.stopPropagation(); setShow(true); }}
      >
        Ver código
      </button>
    );
  }

  if (isLoading) {
    return <span className="mt-1 text-[10px] sm:text-xs text-gray-500">Carregando código...</span>;
  }

  if (!data?.validationCode) {
    return <span className="mt-1 text-[10px] sm:text-xs text-red-600">Código não encontrado</span>;
  }

  return (
    <div className="mt-1 inline-flex items-center gap-2">
      <span className="text-[10px] sm:text-xs font-mono font-bold bg-green-100 text-green-700 px-2 py-1 rounded-full">
        {data.validationCode}
      </span>
      <button
        className="text-[10px] sm:text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600"
        onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(data.validationCode); }}
        title="Copiar"
      >
        Copiar
      </button>
    </div>
  );
}
