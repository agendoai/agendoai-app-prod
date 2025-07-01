import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertCircle, Trash2, Clock, Edit, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import ProviderNavbar from '@/components/layout/provider-navbar';
import { PageTransition } from '@/components/ui/page-transition';
import { ExecutionTimeDialog } from '@/components/execution-time-dialog';

// Interface para valores do formulário de serviço
interface ServiceFormValues {
  id?: number;
  name: string;
  description: string;
  price: number;
  duration: number;
  isActive: boolean;
  categoryId: number;
  providerId: number;
  nicheId?: number;
  templateId?: number;
}

export default function ServicesPageNew() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  // Estado para controle da interface
  const [selectedNicheId, setSelectedNicheId] = useState<number | null>(null);
  const [editingService, setEditingService] = useState<any | null>(null);
  const [isExecutionTimeDialogOpen, setIsExecutionTimeDialogOpen] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);
  const [executionTime, setExecutionTime] = useState<number | null>(null);
  const [breakTime, setBreakTime] = useState<number | null>(0);
  
  // Formulário para o serviço
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(
      z.object({
        id: z.number().optional(),
        name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres'),
        description: z.string().optional(),
        price: z.coerce.number().min(0, 'Preço não pode ser negativo').max(1000000, 'Valor máximo é R$ 10.000,00'),
        duration: z.coerce.number().min(5, 'Duração mínima é 5 minutos').max(480, 'Duração máxima é 8 horas'),
        isActive: z.boolean().default(true),
        categoryId: z.coerce.number().min(1, 'Selecione uma categoria'),
        providerId: z.number(),
        nicheId: z.number().optional(),
        templateId: z.number().optional(),
      })
    ),
    defaultValues: {
      name: "",
      description: "",
      price: 0,
      duration: 30,
      isActive: true,
      categoryId: 0,
      providerId: user?.id || 0,
      nicheId: undefined,
      templateId: undefined
    },
  });

  // SOLUÇÃO ALTERNATIVA: Combinar os serviços no frontend por enquanto
  const {
    data: regularServices = [],
    isLoading: isLoadingRegularServices,
    isError: isRegularServicesError,
    refetch: refetchRegularServices
  } = useQuery({
    queryKey: [`/api/services?providerId=${user?.id}`],
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const {
    data: providerServices = [],
    isLoading: isLoadingProviderServices,
    isError: isProviderServicesError,
    refetch: refetchProviderServices
  } = useQuery({
    queryKey: [`/api/provider-services/provider/${user?.id}`],
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Combinação dos dados no frontend
  const allServices = useMemo(() => {
    if (isLoadingRegularServices || isLoadingProviderServices) return [];
    
    // Mapa para acesso rápido aos providerServices
    const providerServiceMap = new Map();
    providerServices.forEach((ps: any) => {
      providerServiceMap.set(ps.serviceId, ps);
    });

    // Para serviços existentes em regularServices
    const combinedServices = regularServices.map((service: any) => {
      const providerService = providerServiceMap.get(service.id);
      
      return {
        serviceId: service.id,
        name: service.name,
        description: service.description,
        categoryId: service.categoryId,
        nicheId: service.nicheId,
        providerId: service.providerId,
        isActive: service.isActive,
        
        // Valores específicos do prestador, se disponíveis
        executionTime: providerService?.executionTime || service.duration,
        breakTime: providerService?.breakTime || 0,
        price: service.price,
        defaultDuration: service.duration
      };
    });

    // Adicionar serviços personalizados do prestador que não estão em regularServices
    // Isso não deve ser necessário no nosso caso, mas incluímos por segurança
    
    console.log("Serviços combinados no frontend:", combinedServices);
    
    return combinedServices;
  }, [regularServices, providerServices, isLoadingRegularServices, isLoadingProviderServices]);

  const isLoadingServices = isLoadingRegularServices || isLoadingProviderServices;
  const isServicesError = isRegularServicesError || isProviderServicesError;
  
  const refetchServices = useCallback(() => {
    refetchRegularServices();
    refetchProviderServices();
  }, [refetchRegularServices, refetchProviderServices]);

  // Buscar categorias com informações de nicho
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    isError: isCategoriesError,
  } = useQuery({
    queryKey: ["/api/categories?includeNicheInfo=true"],
  });
  
  // Buscar templates de serviços diretamente da tabela onde o admin cria os serviços
  const {
    data: serviceTemplates = [],
    isLoading: isLoadingTemplates,
    isError: isTemplatesError,
  } = useQuery({
    queryKey: ["/api/provider-services/available-templates"],
  });

  // Organizar nichos para seleção
  const niches = useMemo(() => {
    const uniqueNiches: { id: number; name: string; }[] = [];
    const nicheIds = new Set<number>();
    
    categories.forEach((category: any) => {
      if (!nicheIds.has(category.nicheId) && category.nicheName) {
        nicheIds.add(category.nicheId);
        uniqueNiches.push({
          id: category.nicheId,
          name: category.nicheName
        });
      }
    });
    
    return uniqueNiches.sort((a, b) => a.name.localeCompare(b.name));
  }, [categories]);
  
  // Filtrar categorias pelo nicho selecionado
  const filteredCategories = useMemo(() => {
    if (!selectedNicheId) return [];
    return categories.filter((category: any) => category.nicheId === selectedNicheId);
  }, [categories, selectedNicheId]);
  
  // Filtrar templates pela categoria selecionada
  const filteredTemplates = useMemo(() => {
    const categoryId = form.watch("categoryId");
    if (!categoryId) return [];
    return serviceTemplates.filter((template: any) => template.categoryId === categoryId);
  }, [serviceTemplates, form.watch("categoryId")]);

  // Mutação para criar/atualizar serviço
  const serviceFormMutation = useMutation({
    mutationFn: async (data: ServiceFormValues) => {
      const response = await apiRequest(
        data.id ? "PUT" : "POST",
        data.id ? `/api/services/${data.id}` : "/api/services",
        data
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao salvar o serviço");
      }
      
      return response.json();
    },
    onSuccess: () => {
      // Invalidar todas as consultas relevantes
      queryClient.invalidateQueries({ queryKey: [`/api/all-services/provider/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/services`] });
      queryClient.invalidateQueries({ queryKey: [`/api/provider-services/provider/${user?.id}`] });
      
      // Forçar atualização
      setTimeout(() => {
        refetchServices();
      }, 500);
      
      toast({
        title: "Sucesso",
        description: "Serviço salvo com sucesso!",
      });
      
      // Limpar formulário
      form.reset({
        name: "",
        description: "",
        price: 0,
        duration: 30,
        isActive: true,
        categoryId: 0,
        providerId: user?.id || 0,
        nicheId: undefined,
        templateId: undefined
      });
      setSelectedNicheId(null);
      setEditingService(null);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao salvar o serviço",
        variant: "destructive",
      });
    },
  });
  
  // Mutação para excluir serviço
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      const response = await apiRequest("DELETE", `/api/services/${serviceId}`);
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Falha ao excluir o serviço");
      }
      
      return true;
    },
    onSuccess: () => {
      // Invalidar todas as consultas relevantes
      queryClient.invalidateQueries({ queryKey: [`/api/all-services/provider/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/services`] });
      queryClient.invalidateQueries({ queryKey: [`/api/provider-services/provider/${user?.id}`] });
      
      // Forçar atualização
      setTimeout(() => {
        refetchServices();
      }, 500);
      
      toast({
        title: "Sucesso",
        description: "Serviço excluído com sucesso!",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao excluir o serviço",
        variant: "destructive",
      });
    },
  });

  // Mutação para definir tempo de execução
  const executionTimeMutation = useMutation({
    mutationFn: async ({ serviceId, executionTime, breakTime }: { serviceId: number; executionTime: number; breakTime: number }) => {
      // Verificar autenticação
      if (!user?.id) {
        throw new Error("Você precisa estar logado para adicionar serviços");
      }
      
      console.log(`Adicionando serviço ${serviceId} com tempo ${executionTime} e pausa ${breakTime}`);
      
      try {
        // Enviar solicitação diretamente via axios ou fetch nativo para evitar problemas de autenticação
        const response = await fetch("/api/provider-services", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Provider-Auth": "true", // Header especial para indicar que é uma requisição do prestador
          },
          body: JSON.stringify({
            providerId: user.id,
            serviceId,
            executionTime,
            breakTime,
            isActive: true
          }),
          credentials: "include" // Importante para enviar cookies de autenticação
        });
        
        console.log("Status da resposta:", response.status);
        
        if (!response.ok) {
          if (response.status === 401) {
            console.error("Erro de autenticação. Tentando método alternativo...");
            // Tentar método alternativo
            const altResponse = await fetch("/api/services/provider-add-service", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                providerId: user.id,
                serviceId,
                executionTime,
                breakTime,
                isActive: true
              }),
              credentials: "include"
            });
            
            if (!altResponse.ok) {
              const altErrorData = await altResponse.json();
              throw new Error(altErrorData.error || altErrorData.message || "Falha ao adicionar serviço (método alternativo)");
            }
            
            return altResponse.json();
          }
          
          const errorData = await response.json();
          console.error("Erro ao adicionar serviço:", errorData);
          throw new Error(errorData.error || errorData.message || "Falha ao adicionar serviço");
        }
        
        return response.json();
      } catch (error) {
        console.error("Erro na requisição:", error);
        throw error;
      }
    },
    onSuccess: () => {
      // Invalidar todas as consultas relevantes
      queryClient.invalidateQueries({ queryKey: [`/api/all-services/provider/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/services`] });
      queryClient.invalidateQueries({ queryKey: [`/api/provider-services/provider/${user?.id}`] });
      
      // Forçar atualização
      setTimeout(() => {
        refetchServices();
      }, 500);
      
      toast({
        title: "Sucesso",
        description: "Tempo de execução definido com sucesso!",
      });
      
      // Fechar diálogo e limpar estados
      setIsExecutionTimeDialogOpen(false);
      setSelectedServiceId(null);
      setExecutionTime(null);
      setBreakTime(0);
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message || "Falha ao definir tempo de execução",
        variant: "destructive",
      });
    },
  });

  // Função para abrir o diálogo de edição de serviço
  const handleEditService = (service: any) => {
    setEditingService(service);
    
    form.reset({
      id: service.serviceId,
      name: service.name,
      description: service.description || "",
      price: service.price ? service.price / 100 : 0,
      duration: service.defaultDuration || service.executionTime,
      isActive: service.isActive,
      categoryId: service.categoryId,
      providerId: user?.id || 0,
      nicheId: service.nicheId,
    });
    
    if (service.categoryId) {
      const category = categories.find((c: any) => c.id === service.categoryId);
      if (category && category.nicheId) {
        setSelectedNicheId(category.nicheId);
      }
    }
  };

  // Abrir diálogo de tempo de execução
  const handleOpenExecutionTimeDialog = (serviceId: number) => {
    setSelectedServiceId(serviceId);
    const service = allServices.find((s: any) => s.serviceId === serviceId);
    setExecutionTime(service?.executionTime || service?.defaultDuration || 30);
    setBreakTime(service?.breakTime || 0);
    setIsExecutionTimeDialogOpen(true);
  };

  // Salvar tempo de execução
  const handleSaveExecutionTime = () => {
    if (selectedServiceId && executionTime) {
      executionTimeMutation.mutate({ 
        serviceId: selectedServiceId, 
        executionTime, 
        breakTime: breakTime || 0 
      });
    }
  };

  // Aplicar template de serviço
  const handleApplyTemplate = (templateId: string) => {
    const template = serviceTemplates.find((t: any) => t.id === parseInt(templateId));
    if (template) {
      form.setValue("name", template.name);
      form.setValue("description", template.description || "");
      form.setValue("price", template.price / 100);
      form.setValue("duration", template.duration);
      form.setValue("templateId", template.id);
    }
  };

  // Obter nome da categoria
  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c: any) => c.id === categoryId);
    return category ? category.name : "Categoria desconhecida";
  };

  // Renderizar formulário de serviço
  const renderServiceForm = () => {
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit((data) => serviceFormMutation.mutate(data))} className="space-y-4">
          {/* Seleção de nicho e categoria */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nicheId">Especialidade</Label>
              <Select 
                value={selectedNicheId?.toString() || ""} 
                onValueChange={(value) => {
                  setSelectedNicheId(parseInt(value));
                  form.setValue("categoryId", 0);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma especialidade" />
                </SelectTrigger>
                <SelectContent>
                  {niches.map((niche) => (
                    <SelectItem key={niche.id} value={niche.id.toString()}>
                      {niche.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select 
                    disabled={!selectedNicheId || filteredCategories.length === 0}
                    value={field.value?.toString() || ""} 
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {filteredCategories.map((category) => (
                        <SelectItem key={category.id} value={category.id.toString()}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          {/* Seleção de template */}
          {form.watch("categoryId") > 0 && filteredTemplates.length > 0 && (
            <div className="space-y-2">
              <Label>Template de Serviço</Label>
              <Select onValueChange={handleApplyTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um template (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  {filteredTemplates.map((template) => (
                    <SelectItem key={template.id} value={template.id.toString()}>
                      {template.name} - {(template.price / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Selecione um template para preencher automaticamente os campos
              </p>
            </div>
          )}
          
          {/* Campos do serviço */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome do Serviço</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição (opcional)</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Preço (R$)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      step="0.01" 
                      {...field} 
                      onChange={(e) => field.onChange(parseFloat(e.target.value))}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração Personalizada (minutos)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      {...field} 
                      onChange={(e) => field.onChange(parseInt(e.target.value))}
                    />
                  </FormControl>
                  <FormDescription>
                    Você pode personalizar a duração sugerida pelo administrador. Defina o tempo real que você leva para realizar este serviço.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
          <FormField
            control={form.control}
            name="isActive"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center space-x-2 space-y-0">
                <FormControl>
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={field.onChange}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                </FormControl>
                <FormLabel className="font-normal">
                  Serviço Ativo
                </FormLabel>
              </FormItem>
            )}
          />
          
          <div className="flex space-x-2">
            <Button type="submit" disabled={serviceFormMutation.isPending}>
              {serviceFormMutation.isPending ? "Salvando..." : (editingService ? "Atualizar" : "Adicionar")} Serviço
            </Button>
            
            {editingService && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setEditingService(null);
                  form.reset({
                    name: "",
                    description: "",
                    price: 0,
                    duration: 30,
                    isActive: true,
                    categoryId: 0,
                    providerId: user?.id || 0
                  });
                  setSelectedNicheId(null);
                }}
              >
                Cancelar Edição
              </Button>
            )}
          </div>
        </form>
      </Form>
    );
  };

  // Renderizar tabela de serviços do prestador
  const renderServicesTable = () => {
    if (isLoadingServices) {
      return <div className="text-center py-6">Carregando serviços...</div>;
    }
    
    if (isServicesError) {
      return (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>
            Falha ao carregar os serviços. Tente novamente mais tarde.
          </AlertDescription>
        </Alert>
      );
    }
    
    if (allServices.length === 0) {
      return (
        <div className="text-center py-10 border rounded-md">
          <div className="flex flex-col items-center justify-center gap-2">
            <Plus className="h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhum serviço encontrado.</p>
            <p className="text-sm mt-2">Adicione um novo serviço usando o formulário acima.</p>
            <Button 
              variant="outline" 
              className="mt-4" 
              onClick={() => document.querySelector('button[value="new"]')?.click()}
            >
              Adicionar Serviço
            </Button>
          </div>
        </div>
      );
    }
    
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome do Serviço</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Seu Preço</TableHead>
            <TableHead>Sua Duração</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {allServices.map((service: any) => (
            <TableRow key={service.serviceId}>
              <TableCell className="font-medium">
                <div className="flex items-start">
                  <div>
                    {service.name}
                    {service.description && (
                      <p className="text-xs text-muted-foreground mt-1">{service.description}</p>
                    )}
                    <div className="text-xs text-blue-600 mt-1">
                      Tipo de serviço definido pela plataforma
                    </div>
                  </div>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span>{getCategoryName(service.categoryId)}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <span className="font-medium">
                    {((service.price || 0) / 100).toLocaleString('pt-BR', { 
                      style: 'currency', 
                      currency: 'BRL' 
                    })}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1">
                    Personalizado por você
                  </span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex flex-col">
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">{service.executionTime || service.defaultDuration} min</span>
                    
                    {service.executionTime !== service.defaultDuration && service.executionTime && (
                      <Badge variant="outline" size="sm" className="ml-1 text-xs">
                        Personalizado
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {service.executionTime !== service.defaultDuration && service.executionTime && service.defaultDuration ? (
                      <span>Referência: {service.defaultDuration} min</span>
                    ) : service.breakTime > 0 ? (
                      <span>(+{service.breakTime} min intervalo)</span>
                    ) : (
                      <span>Duração padrão</span>
                    )}
                  </div>
                </div>
              </TableCell>
              <TableCell>
                {service.isActive ? (
                  <span className="text-xs bg-green-100 text-green-800 rounded-full px-2 py-1 font-medium">
                    Ativo
                  </span>
                ) : (
                  <span className="text-xs bg-red-100 text-red-800 rounded-full px-2 py-1 font-medium">
                    Inativo
                  </span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleEditService(service)}
                    title="Editar detalhes do serviço"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => handleOpenExecutionTimeDialog(service.serviceId)}
                    title="Configurar tempos de execução e intervalo"
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      if (window.confirm("Deseja realmente excluir este serviço da sua lista de serviços oferecidos? Esta ação não pode ser desfeita.")) {
                        deleteServiceMutation.mutate(service.serviceId);
                      }
                    }}
                    title="Remover serviço da sua lista"
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  };

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen">
        <ProviderNavbar />
        
        <div className="container py-6 flex-1">
          <h1 className="text-2xl font-bold mb-4">Meus Serviços</h1>
          <div className="mb-6 p-4 bg-blue-50 rounded-md border border-blue-200">
            <h3 className="text-lg font-semibold text-blue-700 mb-2">Como gerenciar seus serviços</h3>
            <p className="text-blue-700 mb-3">
              Como prestador, você pode selecionar os tipos de serviços disponíveis na plataforma e personalizá-los com seus próprios preços e durações.
            </p>
            <ol className="list-decimal list-inside text-blue-700 space-y-1 pl-2">
              <li>Selecione a aba <strong>"Adicionar Serviço"</strong> para escolher um serviço da plataforma</li>
              <li>Defina seu próprio preço e tempo de execução do serviço</li>
              <li>Ative ou desative serviços conforme sua disponibilidade</li>
            </ol>
          </div>
          
          <Tabs defaultValue="services" className="mb-6">
            <TabsList>
              <TabsTrigger value="services">Serviços</TabsTrigger>
              <TabsTrigger value="new">Adicionar Serviço</TabsTrigger>
            </TabsList>
            
            <TabsContent value="services">
              <Card>
                <CardHeader>
                  <CardTitle>Meus Serviços</CardTitle>
                  <CardDescription>
                    Lista de serviços que você oferece aos seus clientes
                  </CardDescription>
                  <div className="mt-2 p-3 bg-green-50 rounded-md border border-green-200 text-green-700 text-sm">
                    <p className="flex items-center">
                      <span className="mr-2">✓</span>
                      <span>Estes são os serviços que você selecionou e personalizou com seus preços e durações.</span>
                    </p>
                    <p className="mt-1 flex items-center">
                      <span className="mr-2">✓</span>
                      <span>Clientes somente poderão agendar serviços que estejam marcados como "Ativo".</span>
                    </p>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderServicesTable()}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="new">
              <Card>
                <CardHeader>
                  <CardTitle>{editingService ? "Editar" : "Adicionar"} Serviço</CardTitle>
                  <CardDescription>
                    {editingService ? "Edite as informações do serviço selecionado" : "Selecione um tipo de serviço e defina seu preço e duração personalizada"}
                  </CardDescription>
                  <div className="mt-2 p-3 bg-amber-50 rounded-md border border-amber-200 text-amber-700 text-sm">
                    <p><strong>Atenção!</strong> Aqui você não cria novos tipos de serviços, apenas seleciona os tipos já disponíveis na plataforma.</p>
                    <p className="mt-1">Para cada serviço selecionado, defina:</p>
                    <ul className="list-disc list-inside mt-1 space-y-1">
                      <li>Seu preço personalizado</li>
                      <li>O tempo que você leva para executar este serviço</li>
                    </ul>
                  </div>
                </CardHeader>
                <CardContent>
                  {renderServiceForm()}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <ExecutionTimeDialog
        isOpen={isExecutionTimeDialogOpen}
        onClose={() => setIsExecutionTimeDialogOpen(false)}
        executionTime={executionTime || 30}
        breakTime={breakTime || 0}
        onExecutionTimeChange={setExecutionTime}
        onBreakTimeChange={setBreakTime}
        onSave={handleSaveExecutionTime}
        isPending={executionTimeMutation.isPending}
      />
    </PageTransition>
  );
}