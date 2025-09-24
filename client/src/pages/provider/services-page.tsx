import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Copy, 
  Pencil, 
  Plus, 
  Search, 
  Filter, 
  Clock, 
  CalendarClock, 
  DollarSign,
  ChevronRight,
  PlusCircle,
  Check,
  Scissors,
  Sparkles,
  ArrowLeft,
  MoreHorizontal,
  Eye,
  Settings,
  TrendingUp,
  Users,
  Activity,
  Trash2,
  Home,
  Calendar,
  ClipboardList,
  User,
  CalendarCheck,
  PlusCircle as PlusCircleIcon
} from "lucide-react";
import { Link, useLocation } from "wouter";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/use-auth";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiCall } from "@/lib/api";
import Navbar from "@/components/layout/navbar";

export default function ProviderServicesPage() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Função para excluir serviço
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const response = await apiCall(`/provider-services/${serviceId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao excluir o serviço");
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/provider-services/provider/${user?.id}`] });
      toast({
        title: "Serviço excluído",
        description: "O serviço foi excluído com sucesso",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Fetch provider services
  const { data: services = [], isLoading } = useQuery({
    queryKey: [`/api/provider-services/provider/${user?.id}`],
    queryFn: async () => {
      try {
        const response = await apiCall(`/provider-services/provider/${user?.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch services');
        }
        return await response.json();
      } catch (error) {
        console.error('Error fetching services:', error);
        return [];
      }
    }
  });

  // Filter services based on active status
  const filteredServices = services.filter((service: any) => {
    // Filter by search query
    const matchesSearch = searchQuery === "" || 
      service.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.serviceName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Filter by active status
    const matchesStatus = 
      activeTab === "all" || 
      (activeTab === "active" && service.isActive) || 
      (activeTab === "inactive" && !service.isActive);
    
    return matchesSearch && matchesStatus;
  });
  
  const handleAddNewService = () => {
    navigate("/provider/add-service");
  };
  
  const formatCurrency = (value: number) => {
    // Se o valor for maior que 0 e inteiro, assume que está em centavos e converte para reais
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value / 100);
  };

  // Estatísticas dos serviços
  const stats = {
    total: services.length,
    active: services.filter((s: any) => s.isActive).length,
    inactive: services.filter((s: any) => !s.isActive).length,
    totalRevenue: services.reduce((sum: number, s: any) => sum + (s.price || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header com cor padrão */}
      <div className="bg-[#58c9d1] py-4 px-4 w-full">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/provider/dashboard")}
                className="text-white hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="h-6 w-px bg-white/20"></div>
              <h1 className="text-xl font-semibold text-white">Meus Serviços</h1>
            </div>
          </div>
        </div>
      </div>
      
      <div className="container mx-auto py-6 px-4 max-w-4xl pb-20">
        {/* Descrição */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <p className="text-gray-600 text-sm max-w-2xl">
            Gerencie todos os serviços que você oferece aos seus clientes.
          </p>
        </motion.div>

        {/* Botão Adicionar Serviço */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Button 
            onClick={handleAddNewService}
            className="w-full sm:w-auto bg-[#58c9d1] hover:bg-[#4bb8c0] text-white font-semibold py-3 px-6 rounded-lg shadow-sm transition-all duration-200 hover:shadow-md"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Serviço
          </Button>
        </motion.div>

        {/* Estatísticas */}
        <motion.div 
          className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-[#58c9d1]/10 flex items-center justify-center">
                  <Scissors className="h-4 w-4 text-[#58c9d1]" />
                </div>
              </div>
              <p className="text-gray-500 text-xs font-medium mb-1">Total</p>
              <p className="text-gray-900 text-lg font-bold">{stats.total}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 flex items-center justify-center">
                  <Activity className="h-4 w-4 text-green-600" />
                </div>
              </div>
              <p className="text-gray-500 text-xs font-medium mb-1">Ativos</p>
              <p className="text-gray-900 text-lg font-bold">{stats.active}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center">
                  <Users className="h-4 w-4 text-orange-600" />
                </div>
              </div>
              <p className="text-gray-500 text-xs font-medium mb-1">Inativos</p>
              <p className="text-gray-900 text-lg font-bold">{stats.inactive}</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm bg-white">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4 text-purple-600" />
                </div>
              </div>
              <p className="text-gray-500 text-xs font-medium mb-1">Receita</p>
              <p className="text-gray-900 text-lg font-bold">{formatCurrency(stats.totalRevenue)}</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Tabela de Serviços */}
        <Card className="border-0 shadow-sm bg-white">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 text-center text-gray-400">Carregando serviços...</div>
            ) : filteredServices.length === 0 ? (
              <div className="p-6 text-center text-gray-400">Nenhum serviço encontrado.</div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableCaption className="text-gray-500 font-medium">
                    {filteredServices.length} serviço{filteredServices.length !== 1 ? 's' : ''} encontrado{filteredServices.length !== 1 ? 's' : ''}
                  </TableCaption>
                  <TableHeader>
                    <TableRow className="border-gray-200">
                      <TableHead className="font-semibold text-gray-900">Serviço</TableHead>
                      <TableHead className="font-semibold text-gray-900">Preço</TableHead>
                      <TableHead className="font-semibold text-gray-900">Duração</TableHead>
                      <TableHead className="font-semibold text-gray-900">Status</TableHead>
                      <TableHead className="text-right font-semibold text-gray-900">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredServices.map((service: any, index: number) => (
                      <motion.tr 
                        key={service.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.1 }}
                        className="border-gray-100 hover:bg-gray-50 transition-colors"
                      >
                        <TableCell className="py-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-[#58c9d1]/10 flex items-center justify-center">
                              <Scissors className="h-5 w-5 text-[#58c9d1]" />
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {service.name || service.serviceName}
                              </div>
                              <div className="text-sm text-gray-500 truncate max-w-[200px]">
                                {service.description || "Sem descrição"}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-2 text-green-600" />
                            <span className="font-semibold text-green-600">
                              {formatCurrency(service.price ?? service.defaultPrice ?? 0)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-2 text-gray-400" />
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="font-medium">{service.duration || 30} min</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <div className="text-xs space-y-1">
                                    <div>Execução: {service.executionTime || 25} min</div>
                                    {(service.breakTime || 5) > 0 && (
                                      <div>Intervalo: {service.breakTime || 5} min</div>
                                    )}
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                        <TableCell className="py-4">
                          <Badge 
                            variant={service.isActive ? "default" : "secondary"}
                            className={`${
                              service.isActive 
                                ? "bg-green-100 text-green-700 hover:bg-green-200" 
                                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                          >
                            {service.isActive ? "Ativo" : "Inativo"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right py-4">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 bg-white shadow-lg border border-gray-200">
                              <DropdownMenuLabel className="font-semibold">Ações do Serviço</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="cursor-pointer"
                                onClick={() => navigate(`/provider/view-service/${service.id}`)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Visualizar
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="cursor-pointer"
                                onClick={() => navigate(`/provider/edit-service/${service.id}`)}
                              >
                                <Pencil className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem 
                                className="cursor-pointer text-red-600 font-semibold" 
                                onClick={() => deleteServiceMutation.mutate(service.id)}
                              >
                                <Trash2 className="h-4 w-4 mr-2 text-red-500" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </motion.tr>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Menu Mobile */}
      <Navbar 
        items={[
          {
            icon: <Home size={26} />,
            label: 'Início',
            href: '/provider/dashboard'
          },
          {
            icon: <CalendarCheck size={26} />,
            label: 'Agenda',
            href: '/provider/schedule'
          },
          {
            icon: <PlusCircleIcon size={32} className="animate-pulse" />,
            label: 'Novo',
            href: '/provider/manual-booking'
          },
          {
            icon: <User size={26} />,
            label: 'Perfil',
            href: '/provider/profile'
          }
        ]}
      />
    </div>
  );
}