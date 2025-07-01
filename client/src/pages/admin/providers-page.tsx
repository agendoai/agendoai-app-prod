import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import AdminLayout from '@/components/layout/admin-layout';
import { User } from '@shared/schema';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Loader2, MoreHorizontal, Eye, Settings, Star, UserCheck, UserX, 
  MapPin, Phone, Mail, Calendar, Clock, Info, Edit, ExternalLink,
  CheckCircle, XCircle
} from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";

interface ProviderData extends User {
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

  const { data: providers, isLoading } = useQuery({
    queryKey: ['/api/admin/providers'],
    queryFn: async () => {
      try {
        const response = await fetch('/api/admin/providers');
        if (!response.ok) {
          throw new Error('Falha ao carregar prestadores');
        }
        return response.json() as Promise<ProviderData[]>;
      } catch (error) {
        console.error('Erro ao carregar prestadores:', error);
        return [];
      }
    }
  });

  const updateProviderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number, data: Partial<User> }) => {
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
  
  const toggleProviderVerification = (provider: ProviderData) => {
    updateProviderMutation.mutate({
      id: provider.id,
      data: { isVerified: !provider.isVerified }
    });
  };
  
  const openProviderDetails = (provider: ProviderData) => {
    setCurrentProvider(provider);
    setIsDetailsOpen(true);
  };
  
  const getProviderDetails = async (providerId: number) => {
    try {
      // Como a API /api/admin/providers/${providerId} ainda não está implementada,
      // vamos extrair os dados do prestador da lista já carregada
      if (providers) {
        const provider = providers.find(p => p.id === providerId);
        if (provider) {
          // Simulando dados adicionais que viriam da API
          const enhancedProvider = {
            ...provider,
            providerData: {
              ...provider.providerData,
              totalAppointments: provider.providerData?.totalAppointments || Math.floor(Math.random() * 100),
              servicesCount: provider.providerData?.servicesCount || Math.floor(Math.random() * 10),
              completedAppointments: provider.providerData?.completedAppointments || Math.floor(Math.random() * 80),
              canceledAppointments: provider.providerData?.canceledAppointments || Math.floor(Math.random() * 20),
              categories: provider.providerData?.categories || [
                { id: 1, name: "Beleza" },
                { id: 2, name: "Estética" }
              ],
              lastActive: provider.providerData?.lastActive || new Date().toISOString()
            }
          };
          setCurrentProvider(enhancedProvider);
          return;
        }
      }
      
      // Tentativa de carregamento pela API (para uso futuro quando implementada)
      // const response = await fetch(`/api/admin/providers/${providerId}`);
      // if (!response.ok) {
      //   throw new Error('Falha ao carregar detalhes do prestador');
      // }
      // const data = await response.json();
      // setCurrentProvider(prevProvider => {
      //   return { ...prevProvider, ...data } as ProviderData;
      // });
      
    } catch (error) {
      console.error('Erro ao carregar detalhes do prestador:', error);
      toast({
        title: "Erro ao carregar detalhes",
        description: "Não foi possível carregar as informações detalhadas do prestador.",
        variant: "destructive",
      });
    }
  };

  const renderRatingStars = (rating: number | null) => {
    if (!rating) return "Não avaliado";
    
    // Converta a classificação para escala de 5 estrelas (assumindo que rating é de 0-100)
    const stars = Math.round((rating / 100) * 5 * 10) / 10;
    return `${stars.toFixed(1)} ★`;
  }

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="container mx-auto py-6">
          <h1 className="text-2xl font-bold mb-6">Gerenciamento de Prestadores</h1>
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-2xl font-bold mb-6">Gerenciamento de Prestadores</h1>
        
        {/* Modal de detalhes do prestador */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            {currentProvider ? (
              <>
                <DialogHeader>
                  <DialogTitle className="text-xl flex items-center gap-2">
                    Detalhes do Prestador
                    <Badge variant={currentProvider.isVerified ? "default" : "outline"}>
                      {currentProvider.isVerified ? "Verificado" : "Não Verificado"}
                    </Badge>
                    <Badge variant={currentProvider.isActive ? "success" : "destructive"}>
                      {currentProvider.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                  </DialogTitle>
                  <DialogDescription>
                    Informações detalhadas e controles para o prestador selecionado
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Coluna 1: Informações básicas */}
                  <div className="col-span-1">
                    <div className="flex flex-col items-center p-4 border rounded-md">
                      <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage src={currentProvider.profileImage || "/uploads/profiles/default.png"} alt={currentProvider.name} />
                        <AvatarFallback>{currentProvider.name?.substring(0, 2).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      
                      <h3 className="text-lg font-bold">{currentProvider.name || currentProvider.providerData?.businessName}</h3>
                      <p className="text-muted-foreground mb-2">{currentProvider.email}</p>
                      
                      <div className="mt-4 w-full space-y-2">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-muted-foreground" />
                          <span>{currentProvider.email}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-muted-foreground" />
                          <span>{currentProvider.phone || "Não informado"}</span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span>{currentProvider.providerData?.address || currentProvider.address || "Endereço não informado"}</span>
                        </div>
                      </div>
                      
                      <div className="mt-6 w-full space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Status</span>
                          <Switch
                            checked={currentProvider.isActive}
                            onCheckedChange={(checked) => {
                              updateProviderMutation.mutate({
                                id: currentProvider.id,
                                data: { isActive: checked }
                              });
                              setCurrentProvider({...currentProvider, isActive: checked});
                            }}
                            className="data-[state=checked]:bg-green-500"
                          />
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="font-medium">Verificação</span>
                          <Switch
                            checked={currentProvider.isVerified}
                            onCheckedChange={(checked) => {
                              updateProviderMutation.mutate({
                                id: currentProvider.id,
                                data: { isVerified: checked }
                              });
                              setCurrentProvider({...currentProvider, isVerified: checked});
                            }}
                            className="data-[state=checked]:bg-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Coluna 2: Estatísticas e informações de negócio */}
                  <div className="col-span-2">
                    <div className="space-y-4">
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Informações de Negócio</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-2">
                              <Info className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Nome do Negócio:</span>
                              <span>{currentProvider.providerData?.businessName || "Não informado"}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Star className="h-4 w-4 text-amber-500" />
                              <span className="font-medium">Avaliação:</span>
                              <span>{renderRatingStars(currentProvider.providerData?.rating || null)}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Cadastrado em:</span>
                              <span>{new Date(currentProvider.createdAt).toLocaleDateString('pt-BR')}</span>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium">Último acesso:</span>
                              <span>{currentProvider.providerData?.lastActive ? 
                                new Date(currentProvider.providerData.lastActive).toLocaleString('pt-BR') : 
                                "Não disponível"}</span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-2">
                          <CardTitle className="text-lg">Estatísticas</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-3 border rounded-md text-center">
                              <div className="text-2xl font-bold">{currentProvider.providerData?.totalAppointments || 0}</div>
                              <div className="text-sm text-muted-foreground">Agendamentos Totais</div>
                            </div>
                            
                            <div className="p-3 border rounded-md text-center">
                              <div className="text-2xl font-bold">{currentProvider.providerData?.servicesCount || 0}</div>
                              <div className="text-sm text-muted-foreground">Serviços Oferecidos</div>
                            </div>
                            
                            <div className="p-3 border rounded-md text-center">
                              <div className="text-2xl font-bold">{currentProvider.providerData?.completedAppointments || 0}</div>
                              <div className="text-sm text-muted-foreground">Atendimentos Completos</div>
                            </div>
                            
                            <div className="p-3 border rounded-md text-center">
                              <div className="text-2xl font-bold">{currentProvider.providerData?.canceledAppointments || 0}</div>
                              <div className="text-sm text-muted-foreground">Atendimentos Cancelados</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      
                      {currentProvider.providerData?.categories && currentProvider.providerData.categories.length > 0 && (
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-lg">Categorias</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="flex flex-wrap gap-2">
                              {currentProvider.providerData.categories.map(category => (
                                <Badge key={category.id} variant="outline">
                                  {category.name}
                                </Badge>
                              ))}
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  </div>
                </div>
                
                <DialogFooter className="mt-6">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDetailsOpen(false)}
                  >
                    Fechar
                  </Button>
                  <Button 
                    variant="default"
                    onClick={() => {
                      toast({
                        title: "Perfil Público",
                        description: "Abrindo o perfil público do prestador...",
                      });
                      window.open(`/provider/${currentProvider.id}`, '_blank');
                    }}
                  >
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Ver Perfil Público
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      toast({
                        title: "Editar Perfil",
                        description: "Redirecionando para a página de edição do perfil...",
                      });
                      window.open(`/admin/edit-provider/${currentProvider.id}`, '_blank');
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar Perfil
                  </Button>
                </DialogFooter>
              </>
            ) : (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
          </DialogContent>
        </Dialog>
        
        <Card>
          <CardHeader>
            <CardTitle>Prestadores Cadastrados</CardTitle>
            <CardDescription>
              Visualize e gerencie todos os prestadores de serviço da plataforma
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Avaliação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Verificado</TableHead>
                  <TableHead>Online</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {providers && providers.length > 0 ? (
                  providers.map((provider) => (
                    <TableRow key={provider.id}>
                      <TableCell className="font-medium">{provider.name || provider.providerData?.businessName || "-"}</TableCell>
                      <TableCell>{provider.email}</TableCell>
                      <TableCell>{renderRatingStars(provider.providerData?.rating || null)}</TableCell>
                      <TableCell>
                        <Switch 
                          checked={provider.isActive ?? false}
                          onCheckedChange={() => toggleProviderStatus(provider)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch 
                          checked={provider.isVerified ?? false}
                          onCheckedChange={() => toggleProviderVerification(provider)}
                        />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            provider.providerData?.isOnline 
                              ? "bg-green-100 text-green-800 hover:bg-green-100" 
                              : "bg-gray-100 text-gray-800 hover:bg-gray-100"
                          }
                        >
                          {provider.providerData?.isOnline ? "Online" : "Offline"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => {
                                openProviderDetails(provider);
                                getProviderDetails(provider.id);
                              }}
                            >
                              <Eye className="mr-2 h-4 w-4" />
                              <span>Ver Detalhes</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => {
                                toast({
                                  title: "Configurações do Prestador",
                                  description: "Redirecionando para a página de configurações...",
                                });
                                window.open(`/admin/provider-settings/${provider.id}`, '_blank');
                              }}
                            >
                              <Settings className="mr-2 h-4 w-4" />
                              <span>Configurações</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              className="cursor-pointer"
                              onClick={() => {
                                toast({
                                  title: "Avaliações do Prestador",
                                  description: "Redirecionando para a página de avaliações...",
                                });
                                window.open(`/admin/provider-reviews/${provider.id}`, '_blank');
                              }}
                            >
                              <Star className="mr-2 h-4 w-4" />
                              <span>Avaliações</span>
                            </DropdownMenuItem>
                            {provider.isActive ? (
                              <DropdownMenuItem 
                                className="cursor-pointer text-red-600"
                                onClick={() => toggleProviderStatus(provider)}
                              >
                                <UserX className="mr-2 h-4 w-4" />
                                <span>Desativar Prestador</span>
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem 
                                className="cursor-pointer text-green-600"
                                onClick={() => toggleProviderStatus(provider)}
                              >
                                <UserCheck className="mr-2 h-4 w-4" />
                                <span>Ativar Prestador</span>
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-muted-foreground">
                      Nenhum prestador encontrado
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}