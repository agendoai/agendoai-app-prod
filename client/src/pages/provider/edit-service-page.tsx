import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiCall } from "@/lib/api";
import { ArrowLeft, Save, X, DollarSign, Clock, Scissors, Activity, Calendar, Home, CalendarCheck, PlusCircle, Search, User } from "lucide-react";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import Navbar from "@/components/layout/navbar";

export default function EditServicePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const serviceId = parseInt(id || '0');

  const [formData, setFormData] = useState({
    price: "",
    duration: "",
    executionTime: "",
    breakTime: ""
  });

  

  // Carregar dados do serviço
  const { data: service, isLoading, error } = useQuery({
    queryKey: ['/api/provider-services', serviceId],
    queryFn: async () => {
      
      const response = await apiCall(`/provider-services/${serviceId}`);
      if (!response.ok) {
        throw new Error('Erro ao carregar serviço');
      }
      const data = await response.json();
      
      return data;
    },
    enabled: !!serviceId
  });

  // Preencher formulário quando dados carregarem
  useEffect(() => {
    if (service) {
      setFormData({
        price: service.price ? (service.price / 100).toString() : "",
        duration: service.duration?.toString() || "",
        executionTime: service.executionTime?.toString() || "",
        breakTime: service.breakTime?.toString() || ""
      });
    }
  }, [service]);

  // Mutação para atualizar serviço
  const updateServiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiCall(`/provider-services/${serviceId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao atualizar o serviço");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/provider-services/provider/${user?.id}`] });
      toast({
        title: "Serviço atualizado",
        description: "O serviço foi atualizado com sucesso.",
        variant: "default",
      });
      navigate("/provider/services");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao atualizar serviço",
        description: error.message || "Falha ao atualizar o serviço",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data = {
      price: Math.round(parseFloat(formData.price) * 100), // Converte para centavos
      duration: parseInt(formData.duration),
      executionTime: parseInt(formData.executionTime),
      breakTime: parseInt(formData.breakTime)
    };

    
    updateServiceMutation.mutate(data);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value / 100);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 pb-20">
        <div className="container mx-auto py-8 px-4 max-w-2xl">
          <div className="mb-8">
            <Skeleton className="h-8 w-64 mb-4" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader>
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
              <Skeleton className="h-12 w-full rounded-lg" />
            </CardContent>
          </Card>
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
                <X className="h-16 w-16 mx-auto" />
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
      <div className="container mx-auto py-8 px-4 max-w-2xl">
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
              Editar Serviço
            </h1>
          </div>
          <p className="text-gray-600 text-base">
            Personalize as configurações do seu serviço.
          </p>
        </motion.div>

        {/* Formulário */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
        >
          <Card className="border-0 shadow-lg bg-white">
            <CardHeader className="pb-6">
              <CardTitle className="flex items-center gap-3 text-xl">
                <div className="p-2 bg-[#58c9d1] rounded-lg">
                  <Scissors className="h-5 w-5 text-white" />
                </div>
                {service?.name || service?.serviceName}
              </CardTitle>
              <CardDescription className="text-gray-600">
                {service?.description || "Sem descrição"}
              </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6">
                {/* Preço */}
                <div className="space-y-3">
                  <Label htmlFor="price" className="text-sm font-semibold text-gray-700">
                    Preço do Serviço
                  </Label>
                  <div className="relative group">
                    <DollarSign className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#58c9d1] transition-colors" />
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                      placeholder="0.00"
                      className="pl-12 h-12 text-lg font-medium border-2 border-gray-200 focus:border-[#58c9d1] focus:ring-4 focus:ring-[#58c9d1]/20 rounded-lg transition-all duration-200 hover:border-gray-300"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#58c9d1] rounded-full"></span>
                    Preço atual: {service?.price ? formatCurrency(service.price) : "Não definido"}
                  </p>
                </div>

                {/* Duração */}
                <div className="space-y-3">
                  <Label htmlFor="duration" className="text-sm font-semibold text-gray-700">
                    Duração Total (minutos)
                  </Label>
                  <div className="relative group">
                    <Clock className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#58c9d1] transition-colors" />
                    <Input
                      id="duration"
                      type="number"
                      min="1"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      placeholder="30"
                      className="pl-12 h-12 text-lg font-medium border-2 border-gray-200 focus:border-[#58c9d1] focus:ring-4 focus:ring-[#58c9d1]/20 rounded-lg transition-all duration-200 hover:border-gray-300"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#58c9d1] rounded-full"></span>
                    Duração atual: {service?.duration || 30} minutos
                  </p>
                </div>

                {/* Tempo de Execução */}
                <div className="space-y-3">
                  <Label htmlFor="executionTime" className="text-sm font-semibold text-gray-700">
                    Tempo de Execução (minutos)
                  </Label>
                  <div className="relative group">
                    <Activity className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#58c9d1] transition-colors" />
                    <Input
                      id="executionTime"
                      type="number"
                      min="1"
                      value={formData.executionTime}
                      onChange={(e) => setFormData({ ...formData, executionTime: e.target.value })}
                      placeholder="25"
                      className="pl-12 h-12 text-lg font-medium border-2 border-gray-200 focus:border-[#58c9d1] focus:ring-4 focus:ring-[#58c9d1]/20 rounded-lg transition-all duration-200 hover:border-gray-300"
                      required
                    />
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#58c9d1] rounded-full"></span>
                    Tempo de execução atual: {service?.executionTime || 25} minutos
                  </p>
                </div>

                {/* Tempo de Intervalo */}
                <div className="space-y-3">
                  <Label htmlFor="breakTime" className="text-sm font-semibold text-gray-700">
                    Tempo de Intervalo (minutos)
                  </Label>
                  <div className="relative group">
                    <Calendar className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-[#58c9d1] transition-colors" />
                    <Input
                      id="breakTime"
                      type="number"
                      min="0"
                      value={formData.breakTime}
                      onChange={(e) => setFormData({ ...formData, breakTime: e.target.value })}
                      placeholder="5"
                      className="pl-12 h-12 text-lg font-medium border-2 border-gray-200 focus:border-[#58c9d1] focus:ring-4 focus:ring-[#58c9d1]/20 rounded-lg transition-all duration-200 hover:border-gray-300"
                    />
                  </div>
                  <p className="text-sm text-gray-500 flex items-center gap-2">
                    <span className="w-2 h-2 bg-[#58c9d1] rounded-full"></span>
                    Intervalo atual: {service?.breakTime || 5} minutos
                  </p>
                </div>
              </CardContent>

              <CardFooter className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/provider/services")}
                  disabled={updateServiceMutation.isPending}
                  className="h-12 px-6 rounded-lg border-2 hover:bg-gray-50 transition-all duration-200"
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={updateServiceMutation.isPending}
                  className="h-12 px-8 bg-[#58c9d1] hover:bg-[#58c9d1]/90 text-white shadow-lg rounded-lg transition-all duration-200 hover:shadow-xl"
                >
                  {updateServiceMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="h-5 w-5 mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
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
            icon: <User size={26} />,
            label: 'Perfil',
            href: '/provider/profile'
          }
        ]}
      />
    </div>
  );
} 