import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Edit, DollarSign, Clock, Scissors, Calendar, User, Activity, Eye, CalendarDays, Timer, Home, CalendarCheck, PlusCircle, Search } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { apiCall } from "@/lib/api";
import Navbar from "@/components/layout/navbar";

export default function ViewServicePage() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const serviceId = parseInt(id || '0');

  console.log("ViewServicePage renderizando, ID:", serviceId);

  // Carregar dados do serviço
  const { data: service, isLoading, error } = useQuery({
    queryKey: ['/api/provider-services', serviceId],
    queryFn: async () => {
      console.log("Fazendo requisição para:", `/api/provider-services/${serviceId}`);
      const response = await apiCall(`/provider-services/${serviceId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar serviço');
      }
      const data = await response.json();
      console.log("Dados do serviço recebidos:", data);
      return data;
    },
    enabled: !!serviceId
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="container mx-auto py-8 px-4 max-w-4xl">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <Skeleton className="h-6 w-48 mb-2" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <Skeleton className="h-6 w-32 mb-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
            <Card className="border-0 shadow-lg bg-white">
              <CardHeader>
                <Skeleton className="h-6 w-40 mb-2" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="container mx-auto py-8 px-4 max-w-2xl">
          <Card className="border-0 shadow-lg bg-white">
            <CardContent className="p-8 text-center">
              <div className="text-red-500 mb-6">
                <Scissors className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-gray-800">Erro ao carregar serviço</h3>
              <p className="text-gray-600 mb-4">Não foi possível carregar as informações do serviço.</p>
              <p className="text-sm text-gray-500 mb-6">Erro: {error.message}</p>
              <Button 
                onClick={() => navigate("/provider/services")}
                className="bg-[#58c9d1] hover:bg-[#58c9d1]/90 text-white shadow-lg"
              >
                Voltar para Serviços
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="container mx-auto py-8 px-4 max-w-4xl">
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
              onClick={() => navigate("/provider/services")}
              className="hover:bg-gray-100 transition-all duration-200 rounded-lg"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
            <div className="h-6 w-px bg-gray-300"></div>
            <h1 className="text-3xl font-bold text-gray-900">
              Detalhes do Serviço
            </h1>
          </div>
          <p className="text-gray-600 text-base">
            Visualize todas as informações do seu serviço.
          </p>
        </motion.div>

        {/* Conteúdo */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="grid grid-cols-1 lg:grid-cols-3 gap-6"
        >
          {/* Informações Básicas */}
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-[#58c9d1] rounded-lg">
                  <Scissors className="h-5 w-5 text-white" />
                </div>
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-[#58c9d1]" />
                  Nome do Serviço
                </h4>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-[#58c9d1]">
                  {service?.name || service?.serviceName || "Nome não definido"}
                </p>
              </div>
              
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700">Descrição</h4>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-[#58c9d1]">
                  {service?.description || "Sem descrição"}
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700">Status</h4>
                <Badge 
                  variant={service?.isActive ? "default" : "secondary"}
                  className={`${
                    service?.isActive 
                      ? "bg-[#58c9d1] text-white hover:bg-[#58c9d1]/90" 
                      : "bg-gray-400 text-white hover:bg-gray-500"
                  } px-4 py-2 rounded-full font-medium`}
                >
                  {service?.isActive ? "Ativo" : "Inativo"}
                </Badge>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#58c9d1]" />
                  Data de Criação
                </h4>
                <p className="text-gray-600 bg-gray-50 p-3 rounded-lg border-l-4 border-[#58c9d1]">
                  {service?.createdAt ? new Date(service.createdAt).toLocaleDateString('pt-BR') : "Data não disponível"}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Configurações de Preço e Tempo */}
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-[#58c9d1] rounded-lg">
                  <DollarSign className="h-5 w-5 text-white" />
                </div>
                Preço e Tempo
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700">Preço do Serviço</h4>
                <div className="bg-[#58c9d1]/10 p-4 rounded-lg border border-[#58c9d1]/20">
                  <p className="text-2xl font-bold text-[#58c9d1]">
                    {service?.price ? formatCurrency(service.price) : "Preço não definido"}
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Clock className="h-4 w-4 text-[#58c9d1]" />
                  Duração Total
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-[#58c9d1]">
                  <p className="text-gray-700 font-medium">{service?.duration || 30} minutos</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Activity className="h-4 w-4 text-[#58c9d1]" />
                  Tempo de Execução
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-[#58c9d1]">
                  <p className="text-gray-700 font-medium">{service?.executionTime || 25} minutos</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-semibold text-gray-700 flex items-center gap-2">
                  <Timer className="h-4 w-4 text-[#58c9d1]" />
                  Tempo de Intervalo
                </h4>
                <div className="bg-gray-50 p-3 rounded-lg border-l-4 border-[#58c9d1]">
                  <p className="text-gray-700 font-medium">{service?.breakTime || 5} minutos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Estatísticas e Ações */}
          <Card className="border-0 shadow-lg bg-white hover:shadow-xl transition-all duration-300">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-3 text-lg">
                <div className="p-2 bg-[#58c9d1] rounded-lg">
                  <User className="h-5 w-5 text-white" />
                </div>
                Ações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <Button 
                  onClick={() => navigate(`/provider/edit-service/${serviceId}`)}
                  className="w-full h-12 bg-[#58c9d1] hover:bg-[#58c9d1]/90 text-white shadow-lg rounded-lg transition-all duration-200 hover:shadow-xl"
                >
                  <Edit className="h-5 w-5 mr-2" />
                  Editar Serviço
                </Button>
                
                <Button 
                  variant="outline"
                  onClick={() => navigate("/provider/services")}
                  className="w-full h-12 border-2 hover:bg-gray-50 transition-all duration-200 rounded-lg"
                >
                  Voltar para Lista
                </Button>
              </div>

              <div className="pt-6 border-t border-gray-200">
                <h4 className="font-semibold text-gray-700 mb-3">Informações Técnicas</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-600">ID do Serviço:</span>
                    <span className="text-gray-800 font-mono">{service?.id}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-600">ID do Prestador:</span>
                    <span className="text-gray-800 font-mono">{service?.providerId}</span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                    <span className="font-medium text-gray-600">ID do Serviço Base:</span>
                    <span className="text-gray-800 font-mono">{service?.serviceId}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
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
            icon: <PlusCircle size={32} className="animate-pulse" />,
            label: 'Novo',
            href: '/provider/manual-booking'
          },
          {
            icon: <Search size={26} />,
            label: 'Buscar',
            href: '/provider/search'
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