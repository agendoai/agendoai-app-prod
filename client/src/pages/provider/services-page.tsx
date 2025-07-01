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
  Activity
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

export default function ProviderServicesPage() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const { user } = useAuth();

  // Fetch provider services
  const { data: services = [], isLoading } = useQuery({
    queryKey: [`/api/provider-services/provider/${user?.id}`],
    queryFn: async () => {
      try {
        const response = await fetch(`/api/provider-services/provider/${user?.id}`);
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
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  // Estatísticas dos serviços
  const stats = {
    total: services.length,
    active: services.filter((s: any) => s.isActive).length,
    inactive: services.filter((s: any) => !s.isActive).length,
    totalRevenue: services.reduce((sum: number, s: any) => sum + (s.price || 0), 0)
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="container mx-auto py-8 px-4 max-w-7xl">
        {/* Header */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-4 mb-6">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate("/provider/dashboard")}
              className="hover:bg-gray-200 transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-4xl font-bold text-gray-900">Meus Serviços</h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl">
            Gerencie todos os serviços que você oferece aos seus clientes. Adicione novos serviços, edite os existentes e controle sua disponibilidade.
          </p>
        </motion.div>

        {/* Estatísticas */}
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-600 to-blue-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Scissors className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-white/70 text-sm font-medium mb-1">Total de Serviços</p>
              <p className="text-white text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-green-600 to-green-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Activity className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-white/70 text-sm font-medium mb-1">Serviços Ativos</p>
              <p className="text-white text-2xl font-bold">{stats.active}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-600 to-orange-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Users className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-white/70 text-sm font-medium mb-1">Serviços Inativos</p>
              <p className="text-white text-2xl font-bold">{stats.inactive}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-600 to-purple-700 text-white">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-white" />
                </div>
              </div>
              <p className="text-white/70 text-sm font-medium mb-1">Receita Total</p>
              <p className="text-white text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
            </CardContent>
          </Card>
        </motion.div>
        
        {/* Card Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Card className="border-0 shadow-xl bg-white/90 backdrop-blur-sm">
            <CardHeader className="pb-6">
              <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Sparkles className="h-6 w-6 text-gray-700" />
                    Gerenciar Serviços
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base mt-2">
                    Visualize e gerencie os serviços que você oferece aos seus clientes.
                  </CardDescription>
                </div>
                
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar serviços..."
                      className="pl-10 w-full lg:w-[300px] h-11 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="h-11 px-4 border-gray-300 hover:bg-gray-50"
                  >
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                  </Button>

                  <Button 
                    onClick={handleAddNewService}
                    className="h-11 px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Adicionar Serviço
                  </Button>
                </div>
              </div>
              
              {showFilters && (
                <motion.div 
                  className="mt-6 p-6 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl border border-gray-200"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <Filter className="h-4 w-4" />
                    Filtros Avançados
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="status-filter" className="text-sm font-medium text-gray-700 mb-2 block">
                        Status do Serviço
                      </Label>
                      <select 
                        id="status-filter" 
                        className="w-full p-3 border border-gray-300 rounded-lg focus:border-gray-900 focus:ring-gray-900 bg-white"
                        value={activeTab}
                        onChange={(e) => setActiveTab(e.target.value)}
                      >
                        <option value="all">Todos os Serviços</option>
                        <option value="active">Apenas Ativos</option>
                        <option value="inactive">Apenas Inativos</option>
                      </select>
                    </div>
                  </div>
                </motion.div>
              )}
              
              <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
                <TabsList className="bg-gray-100 border border-gray-200 shadow-sm">
                  <TabsTrigger 
                    value="all" 
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                  >
                    Todos ({stats.total})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="active" 
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                  >
                    Ativos ({stats.active})
                  </TabsTrigger>
                  <TabsTrigger 
                    value="inactive" 
                    className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm"
                  >
                    Inativos ({stats.inactive})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            
            <CardContent className="px-6">
              {isLoading ? (
                <div className="space-y-4">
                  {[...Array(5)].map((_, index) => (
                    <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                      <Skeleton className="w-12 h-12 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-3 w-32" />
                      </div>
                      <Skeleton className="w-20 h-8" />
                    </div>
                  ))}
                </div>
              ) : filteredServices.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-6">
                    <Search className="h-10 w-10 text-gray-400" />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">
                    {searchQuery ? "Nenhum serviço encontrado" : "Nenhum serviço cadastrado"}
                  </h3>
                  <p className="text-gray-600 mb-8 max-w-md mx-auto">
                    {searchQuery 
                      ? "Tente ajustar sua busca ou filtros para encontrar o que procura" 
                      : "Comece criando seu primeiro serviço para receber agendamentos dos clientes"}
                  </p>
                  {!searchQuery && (
                    <Button 
                      onClick={handleAddNewService}
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      <Plus className="mr-2 h-5 w-5" />
                      Criar Primeiro Serviço
                    </Button>
                  )}
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableCaption className="text-gray-600 font-medium">
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
                          className="border-gray-100 hover:bg-gray-50/50 transition-colors"
                        >
                          <TableCell className="py-4">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
                                <Scissors className="h-5 w-5 text-white" />
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
                              <DropdownMenuContent align="end" className="w-48">
                                <DropdownMenuLabel className="font-semibold">Ações do Serviço</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer">
                                  <Eye className="h-4 w-4 mr-2" />
                                  Visualizar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Pencil className="h-4 w-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Copy className="h-4 w-4 mr-2" />
                                  Duplicar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <CalendarClock className="h-4 w-4 mr-2" />
                                  Disponibilidade
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer">
                                  <Settings className="h-4 w-4 mr-2" />
                                  Configurações
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer">
                                  {service.isActive ? (
                                    <>
                                      <div className="h-4 w-4 mr-2 text-red-500">●</div>
                                      Desativar
                                    </>
                                  ) : (
                                    <>
                                      <Check className="h-4 w-4 mr-2 text-green-500" />
                                      Ativar
                                    </>
                                  )}
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
            
            <CardFooter className="flex justify-between px-6 py-6 border-t border-gray-200 bg-gray-50/50">
              <div className="text-sm text-gray-600">
                Mostrando <span className="font-semibold text-gray-900">{filteredServices.length}</span> de <span className="font-semibold text-gray-900">{services.length}</span> serviços
              </div>
              
              <Link href="/provider/add-service">
                <Button 
                  variant="outline" 
                  className="text-sm flex items-center border-gray-300 hover:bg-gray-50"
                >
                  Adicionar Novo Serviço
                  <ChevronRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </CardFooter>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}