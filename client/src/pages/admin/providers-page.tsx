import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layout/admin-layout';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Loader2, MoreHorizontal, Eye, Settings, Star, UserCheck, UserX, MapPin, Phone, Mail, Calendar, Clock, Info, Edit, ExternalLink, Search, Filter, Building, CheckCircle2, XCircle, Wifi, WifiOff, Award } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ProviderData {
  id: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  profileImage?: string;
  isActive: boolean;
  isVerified: boolean;
  createdAt: string;
  providerData?: {
    rating: number | null;
    isOnline: boolean | null;
    businessName: string | null;
    totalAppointments?: number;
    categories?: { id: number; name: string }[];
    servicesCount?: number;
    completedAppointments?: number;
    canceledAppointments?: number;
    address?: string | null;
    bio?: string | null;
    joinedAt?: string;
    lastActive?: string;
    avgResponseTime?: number;
  }
}

export default function ProvidersPage() {
  const { toast } = useToast();
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentProvider, setCurrentProvider] = useState<ProviderData | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const { data: providers, isLoading } = useQuery({
    queryKey: ['/api/admin/providers'],
    queryFn: async () => {
      try {
        const response = await apiRequest('GET', '/api/admin/providers');
        return await response.json() as Promise<ProviderData[]>;
      } catch (error) {
        console.error('Erro ao carregar prestadores:', error);
        return [];
      }
    }
  });

  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<ProviderData> }) => {
      const response = await apiRequest('PUT', `/api/admin/users/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/providers'] });
      toast({
        title: "Prestador atualizado",
        description: "As informações do prestador foram atualizadas com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar prestador",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const toggleProviderStatus = (provider: ProviderData) => {
    updateProviderMutation.mutate({
      id: provider.id,
      data: { isActive: !provider.isActive }
    });
  };
  
  const openProviderDetails = (provider: ProviderData) => {
    setCurrentProvider(provider);
    setIsDetailsOpen(true);
  };
  
  const renderRatingStars = (rating: number | null) => {
    if (!rating) return "Não avaliado";
    const stars = Math.round((rating / 100) * 5 * 10) / 10;
    return `${stars.toFixed(1)} ★`;
  }

  const filteredProviders = providers?.filter(provider => {
    if (statusFilter) {
      if (statusFilter === 'active' && !provider.isActive) return false;
      if (statusFilter === 'inactive' && provider.isActive) return false;
      if (statusFilter === 'online' && !provider.providerData?.isOnline) return false;
      if (statusFilter === 'offline' && provider.providerData?.isOnline) return false;
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const name = (provider.name || "").toLowerCase();
      const email = provider.email.toLowerCase();
      const businessName = (provider.providerData?.businessName || "").toLowerCase();

      return (
        name.includes(query) || 
        email.includes(query) ||
        businessName.includes(query)
      );
    }

    return true;
  });

  // Calcular estatísticas
  const totalProviders = providers?.length || 0;
  const activeProviders = providers?.filter(p => p.isActive).length || 0;
  const onlineProviders = providers?.filter(p => p.providerData?.isOnline).length || 0;
  const verifiedProviders = providers?.filter(p => p.isVerified).length || 0;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
          <div className="container mx-auto py-8 px-4">
            <div className="flex flex-col items-center justify-center space-y-4 h-64">
              <Loader2 className="h-12 w-12 animate-spin text-blue-500" />
              <p className="text-gray-600 text-lg">Carregando prestadores...</p>
            </div>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto py-8 px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-4">
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-3 rounded-xl">
                <Building className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Prestadores</h1>
                <p className="text-gray-600 text-lg">Gerencie todos os prestadores de serviço da plataforma</p>
              </div>
            </div>
            
            {/* Cards de estatísticas */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-800">Total de Prestadores</p>
                      <p className="text-2xl font-bold text-blue-900">{totalProviders}</p>
                    </div>
                    <div className="bg-blue-500 p-3 rounded-full">
                      <Building className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-green-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-800">Prestadores Ativos</p>
                      <p className="text-2xl font-bold text-green-900">{activeProviders}</p>
                    </div>
                    <div className="bg-green-500 p-3 rounded-full">
                      <CheckCircle2 className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-purple-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-800">Online Agora</p>
                      <p className="text-2xl font-bold text-purple-900">{onlineProviders}</p>
                    </div>
                    <div className="bg-purple-500 p-3 rounded-full">
                      <Wifi className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-orange-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-800">Verificados</p>
                      <p className="text-2xl font-bold text-orange-900">{verifiedProviders}</p>
                    </div>
                    <div className="bg-orange-500 p-3 rounded-full">
                      <Award className="h-6 w-6 text-white" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Filtros e busca */}
          <Card className="border-0 shadow-lg mb-6">
            <CardHeader className="bg-gradient-to-r from-gray-50 to-blue-50 border-b">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                    <Building className="h-5 w-5 mr-2 text-blue-600" />
                    Lista de Prestadores
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    {filteredProviders?.length || 0} prestador{(filteredProviders?.length || 0) !== 1 ? 'es' : ''} encontrado{(filteredProviders?.length || 0) !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar por nome, email ou negócio..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full sm:w-[300px] border-gray-200 focus:border-blue-500"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="border-gray-200 hover:bg-gray-50">
                        <Filter className="h-4 w-4 mr-2" />
                        Filtrar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setStatusFilter(null)}>
                        <Building className="mr-2 h-4 w-4" />
                        Todos os prestadores
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('active')}>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Apenas ativos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('inactive')}>
                        <XCircle className="mr-2 h-4 w-4" />
                        Apenas inativos
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('online')}>
                        <Wifi className="mr-2 h-4 w-4" />
                        Apenas online
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setStatusFilter('offline')}>
                        <WifiOff className="mr-2 h-4 w-4" />
                        Apenas offline
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filteredProviders && filteredProviders.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 p-6">
                  {filteredProviders.map((provider) => (
                    <Card key={provider.id} className="border border-gray-100 hover:shadow-md transition-shadow group">
                      <CardContent className="p-6">
                        {/* Header do card */}
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={provider.profileImage || "/uploads/profiles/default.png"} alt={provider.name} />
                              <AvatarFallback className="bg-blue-100 text-blue-600">
                                {provider.name?.substring(0, 2).toUpperCase() || "PR"}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-semibold text-gray-900 truncate">
                                {provider.name || provider.providerData?.businessName || "Sem nome"}
                              </h3>
                              <p className="text-sm text-gray-500">{provider.email}</p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openProviderDetails(provider)}>
                                <Eye className="mr-2 h-4 w-4" />
                                <span>Ver Detalhes</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                <span>Configurações</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Star className="mr-2 h-4 w-4" />
                                <span>Avaliações</span>
                              </DropdownMenuItem>
                              {provider.isActive ? (
                                <DropdownMenuItem 
                                  className="cursor-pointer text-red-600"
                                  onClick={() => toggleProviderStatus(provider)}
                                >
                                  <UserX className="mr-2 h-4 w-4" />
                                  <span>Desativar</span>
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem 
                                  className="cursor-pointer text-green-600"
                                  onClick={() => toggleProviderStatus(provider)}
                                >
                                  <UserCheck className="mr-2 h-4 w-4" />
                                  <span>Ativar</span>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>

                        {/* Informações do prestador */}
                        <div className="space-y-3">
                          {provider.providerData?.businessName && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Building className="h-4 w-4 mr-2 text-gray-400" />
                              <span className="truncate">{provider.providerData.businessName}</span>
                            </div>
                          )}
                          
                          <div className="flex items-center text-sm text-gray-600">
                            <Star className="h-4 w-4 mr-2 text-yellow-500" />
                            <span>{renderRatingStars(provider.providerData?.rating || null)}</span>
                          </div>

                          {provider.providerData?.totalAppointments !== undefined && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                              <span>{provider.providerData.totalAppointments} agendamentos</span>
                            </div>
                          )}
                        </div>

                        {/* Badges de status */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          <Badge 
                            variant={provider.isActive ? "default" : "secondary"}
                            className={provider.isActive 
                              ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-300" 
                              : "bg-red-100 text-red-800 hover:bg-red-100 border-red-300"
                            }
                          >
                            {provider.isActive ? 'Ativo' : 'Inativo'}
                          </Badge>
                          
                          <Badge 
                            variant="outline"
                            className={provider.isVerified 
                              ? "bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-300" 
                              : "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-300"
                            }
                          >
                            {provider.isVerified ? 'Verificado' : 'Não verificado'}
                          </Badge>
                          
                          <Badge 
                            variant="outline"
                            className={provider.providerData?.isOnline 
                              ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-300" 
                              : "bg-gray-100 text-gray-800 hover:bg-gray-100 border-gray-300"
                            }
                          >
                            {provider.providerData?.isOnline ? 'Online' : 'Offline'}
                          </Badge>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="bg-gray-100 p-4 rounded-full w-fit mx-auto mb-4">
                    <Building className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Nenhum prestador encontrado</h3>
                  <p className="text-gray-500">
                    {searchQuery || statusFilter 
                      ? "Tente ajustar os filtros de busca" 
                      : "Não há prestadores cadastrados no sistema"
                    }
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
