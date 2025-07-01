import { useState, useEffect, useMemo, useCallback, Fragment } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Service, ServiceTemplate, insertServiceSchema } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { formatCurrency, cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import AppHeader from "@/components/layout/app-header";
import { PageTransition } from "@/components/ui/page-transition";

// Components
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Pencil, 
  Plus, 
  Trash2, 
  Loader2, 
  Timer, 
  Clock, 
  Search,
  Filter,
  Tag,
  CheckCircle2,
  XCircle,
  Clock4,
  DollarSign,
  Scissors,
  Box,
  Menu,
  AlertCircle,
} from "lucide-react";
import { ExecutionTimeDialog } from "@/components/execution-time-dialog";

// Service form schema
const serviceFormSchema = insertServiceSchema.extend({
  id: z.number().optional(),
  nicheId: z.number().optional(), // Campo para selecionar nicho
  templateId: z.number().optional(), // Campo para selecionar serviço pré-cadastrado
});

// Service form values type
type ServiceFormValues = z.infer<typeof serviceFormSchema>;

export default function NewServicesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [serviceToEdit, setServiceToEdit] = useState<Service | null>(null);
  const [serviceToDelete, setServiceToDelete] = useState<Service | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isExecutionTimeDialogOpen, setIsExecutionTimeDialogOpen] = useState(false);
  const [serviceToCustomize, setServiceToCustomize] = useState<Service | null>(null);
  
  // Estados para filtros e visualização
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [activeTab, setActiveTab] = useState<"all" | "active" | "inactive">("all");
  
  // Estados para armazenar as seleções hierárquicas
  const [selectedNicheId, setSelectedNicheId] = useState<number | null>(null);
  const [selectedTemplateId, setSelectedTemplateId] = useState<number | null>(null);

  // Initialize the form
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
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

  // Fetch services for this provider using the correct provider-services endpoint
  const {
    data: services = [],
    isLoading: isLoadingServices,
    isError: isServicesError,
  } = useQuery<Service[]>({
    queryKey: [`/api/provider-services/provider/${user?.id}`],
    enabled: !!user?.id,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Fetch all categories with niche information
  const {
    data: categories = [],
    isLoading: isLoadingCategories,
    isError: isCategoriesError,
  } = useQuery<any[]>({
    queryKey: ["/api/categories?includeNicheInfo=true"],
  });
  
  // Fetch service templates diretamente da tabela onde o admin cria os serviços
  const {
    data: serviceTemplates = [],
    isLoading: isLoadingTemplates,
    isError: isTemplatesError
  } = useQuery<ServiceTemplate[]>({
    queryKey: ["/api/provider-services/available-templates"],
  });
  
  // Fetch provider services (tempos de execução personalizados)
  const {
    data: providerServices = [],
    isLoading: isLoadingProviderServices
  } = useQuery<any[]>({
    queryKey: [`/api/provider-services/provider/${user?.id}`],
    enabled: !!user?.id,
  });
  
  // Função para obter o tempo de execução personalizado de um serviço
  const getCustomServiceDuration = useCallback(
    (serviceId: number): number | null => {
      if (!providerServices) return null;
      
      const customService = providerServices.find(
        (ps) => ps.serviceId === serviceId
      );
      
      return customService ? customService.executionTime : null;
    },
    [providerServices]
  );

  // Organizar nichos para seleção
  const niches = useMemo(() => {
    const uniqueNiches: { id: number; name: string; }[] = [];
    const nicheIds = new Set<number>();
    
    categories.forEach(category => {
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
    return categories.filter(category => category.nicheId === selectedNicheId);
  }, [categories, selectedNicheId]);
  
  // Filtrar templates pela categoria selecionada
  const filteredTemplates = useMemo(() => {
    const categoryId = form.watch("categoryId");
    if (!categoryId) return [];
    return serviceTemplates.filter(template => template.categoryId === categoryId);
  }, [serviceTemplates, form.watch("categoryId")]);

  // Create/Update service mutation
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
      // Invalidar todas as consultas relevantes para garantir atualização dos dados
      queryClient.invalidateQueries({ queryKey: [`/api/provider-services/provider/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/services?providerId=${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/unified-services/provider/${user?.id}`] });
      setIsDialogOpen(false);
      toast({
        title: serviceToEdit ? "Serviço atualizado" : "Serviço adicionado",
        description: serviceToEdit 
          ? "O serviço foi atualizado com sucesso" 
          : "O serviço foi adicionado com sucesso ao seu catálogo",
      });
      resetForm();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete service mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: number) => {
      // Usar a rota correta para excluir serviços de prestador
      const response = await apiRequest("DELETE", `/api/provider-services/${serviceId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Falha ao excluir o serviço");
      }
      
      return true;
    },
    onSuccess: () => {
      // Invalidar todas as consultas relevantes após a exclusão
      queryClient.invalidateQueries({ queryKey: [`/api/provider-services/provider/${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/services?providerId=${user?.id}`] });
      queryClient.invalidateQueries({ queryKey: [`/api/unified-services/provider/${user?.id}`] });
      setIsDeleteDialogOpen(false);
      setServiceToDelete(null);
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

  // Reset form and selection states
  const resetForm = () => {
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
    setSelectedTemplateId(null);
    setServiceToEdit(null);
  };

  // Efeito para atualizar o formulário quando o serviço a editar muda
  useEffect(() => {
    if (serviceToEdit) {
      // Encontrar a categoria do serviço para determinar o nicho
      const serviceCategory = categories.find(cat => cat.id === serviceToEdit.categoryId);
      
      form.reset({
        id: serviceToEdit.id,
        name: serviceToEdit.name,
        description: serviceToEdit.description || "",
        price: serviceToEdit.price,
        duration: serviceToEdit.duration,
        isActive: serviceToEdit.isActive === null ? true : serviceToEdit.isActive,
        categoryId: serviceToEdit.categoryId,
        providerId: user?.id || 0,
        nicheId: serviceCategory?.nicheId
      });
      
      if (serviceCategory?.nicheId) {
        setSelectedNicheId(serviceCategory.nicheId);
      }
    }
  }, [serviceToEdit, form, user, categories]);

  // Efeito para atualizar o formulário quando um template é selecionado
  useEffect(() => {
    const templateId = form.watch("templateId");
    if (templateId) {
      const selectedTemplate = serviceTemplates.find(t => t.id === templateId);
      if (selectedTemplate) {
        form.setValue("name", selectedTemplate.name);
        form.setValue("description", selectedTemplate.description || "");
        form.setValue("duration", selectedTemplate.duration);
      }
    }
  }, [form.watch("templateId"), serviceTemplates, form]);

  // Handle form submission
  const onSubmit = (data: ServiceFormValues) => {
    // Validações de preenchimento
    if (!data.templateId && !serviceToEdit) {
      toast({
        title: "Serviço não selecionado",
        description: "Por favor, selecione um serviço do catálogo",
        variant: "destructive"
      });
      return;
    }
    
    // O preço já está em centavos através do handler do campo de entrada
    const price = data.price || 0;
    if (price <= 0) {
      toast({
        title: "Preço inválido",
        description: "O preço do serviço deve ser maior que zero",
        variant: "destructive"
      });
      return;
    }

    if (serviceToEdit) {
      // Para edição, enviar id, preço, duração e status
      serviceFormMutation.mutate({
        id: serviceToEdit.id,
        price: data.price,
        isActive: data.isActive,
        duration: data.duration, // Permite a edição da duração
        name: serviceToEdit.name,
        description: serviceToEdit.description || "",
        categoryId: serviceToEdit.categoryId,
        providerId: serviceToEdit.providerId,
      });
    } else {
      // Para um novo serviço, usando o template selecionado
      const selectedTemplate = serviceTemplates.find(t => t.id === data.templateId);
      if (selectedTemplate) {
        serviceFormMutation.mutate({
          name: selectedTemplate.name,
          description: selectedTemplate.description || "",
          duration: data.duration, // Usa a duração definida pelo prestador
          categoryId: selectedTemplate.categoryId,
          price: data.price,
          isActive: data.isActive,
          providerId: user?.id || 0,
        });
      }
    }
  };

  // Handle nicho selection change
  const handleNicheChange = (nicheId: string) => {
    const nicheIdNumber = parseInt(nicheId);
    setSelectedNicheId(nicheIdNumber);
    form.setValue("nicheId", nicheIdNumber);
    form.setValue("categoryId", 0); // Reset categoria
    form.setValue("templateId", undefined); // Reset template
  };

  // Handle categoria selection change
  const handleCategoryChange = (categoryId: string) => {
    const categoryIdNumber = parseInt(categoryId);
    form.setValue("categoryId", categoryIdNumber);
    form.setValue("templateId", undefined); // Reset template
  };

  // Handle template selection change
  const handleTemplateChange = (templateId: string) => {
    const templateIdNumber = parseInt(templateId);
    setSelectedTemplateId(templateIdNumber);
    form.setValue("templateId", templateIdNumber);
    
    // Preencher outros campos com base no template
    const selectedTemplate = serviceTemplates.find(t => t.id === templateIdNumber);
    if (selectedTemplate) {
      form.setValue("name", selectedTemplate.name);
      form.setValue("description", selectedTemplate.description || "");
      form.setValue("duration", selectedTemplate.duration);
    }
  };

  // Handle edit button click
  const handleEditService = (service: Service) => {
    setServiceToEdit(service);
    setIsDialogOpen(true);
  };

  // Handle delete button click
  const handleDeleteService = (service: Service) => {
    setServiceToDelete(service);
    setIsDeleteDialogOpen(true);
  };

  // Handle confirm delete
  const confirmDelete = () => {
    if (serviceToDelete) {
      deleteServiceMutation.mutate(serviceToDelete.id);
    }
  };

  // Get category name by ID
  const getCategoryName = (categoryId: number) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category?.name || "Categoria não encontrada";
  };

  // Get niche name for a category
  const getNicheName = (categoryId: number) => {
    const category = categories.find(cat => cat.id === categoryId);
    if (category?.nicheId) {
      return category.nicheName || "Nicho não encontrado";
    }
    return "Nicho não encontrado";
  };

  // Filtrar serviços com base na busca e filtros selecionados
  const filteredServices = useMemo(() => {
    if (!services) return [];
    
    // Primeiro filtrar apenas serviços com categorias válidas e cadastradas
    let filtered = services.filter(service => {
      const category = categories.find(cat => cat.id === service.categoryId);
      return category != null; // Apenas serviços com categorias existentes
    });
    
    // Filtrar por termo de busca
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(service => 
        service.name.toLowerCase().includes(query) || 
        (service.description && service.description.toLowerCase().includes(query))
      );
    }
    
    // Filtrar por categoria
    if (selectedCategory) {
      filtered = filtered.filter(service => service.categoryId === selectedCategory);
    }
    
    // Filtrar por status (ativo/inativo)
    if (activeTab !== "all") {
      const isActive = activeTab === "active";
      filtered = filtered.filter(service => {
        const serviceActive = service.isActive === null ? true : service.isActive;
        return serviceActive === isActive;
      });
    }
    
    return filtered;
  }, [services, searchQuery, selectedCategory, activeTab]);
  
  // Agrupar serviços por categoria
  const servicesByCategory = useMemo(() => {
    const grouped: Record<string, Service[]> = {};
    
    filteredServices.forEach(service => {
      const category = getCategoryName(service.categoryId);
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(service);
    });
    
    return grouped;
  }, [filteredServices, getCategoryName]);

  // Log para debug
  useEffect(() => {
    console.log("Dados do usuário:", user);
    console.log("Estado de carregamento:", { 
      isLoadingServices, 
      isLoadingCategories, 
      isLoadingTemplates,
      isLoadingProviderServices 
    });
    console.log("Estado de erro:", { 
      isServicesError, 
      isCategoriesError, 
      isTemplatesError 
    });
    console.log("Serviços carregados:", services);
    console.log("Categorias carregadas:", categories);
    console.log("Templates carregados:", serviceTemplates);
    console.log("Provider services:", providerServices);
  }, [
    user, 
    isLoadingServices, 
    isLoadingCategories, 
    isLoadingTemplates, 
    isServicesError, 
    isCategoriesError, 
    isTemplatesError,
    services,
    categories,
    serviceTemplates,
    providerServices
  ]);

  // Loading state
  if (isLoadingServices || isLoadingCategories || isLoadingTemplates) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Carregando dados dos serviços...</p>
      </div>
    );
  }

  // Error state
  if (isServicesError || isCategoriesError || isTemplatesError) {
    return (
      <div className="p-4 text-center text-red-500">
        <AlertCircle className="h-10 w-10 mx-auto mb-2" />
        <h3 className="text-lg font-medium">Ocorreu um erro ao carregar os dados</h3>
        <p className="text-sm text-muted-foreground mb-4">Por favor, tente novamente mais tarde</p>
        <div className="bg-gray-100 p-4 rounded-md text-left text-xs text-gray-700 max-w-xl mx-auto overflow-auto">
          <p className="font-mono">Detalhes do erro (para desenvolvedores):</p>
          <pre className="mt-2">
            {JSON.stringify({ 
              user: user?.id || 'não autenticado',
              errors: {
                services: isServicesError ? 'Erro ao carregar serviços' : null,
                categories: isCategoriesError ? 'Erro ao carregar categorias' : null,
                templates: isTemplatesError ? 'Erro ao carregar templates' : null
              },
              queryKeys: {
                services: `/api/provider-services/provider/${user?.id}`,
                categories: '/api/categories?includeNicheInfo=true',
                templates: '/api/service-templates'
              }
            }, null, 2)}
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader 
        title="Meus Serviços" 
        showBackButton 
        backUrl="/provider/dashboard"
        userType="provider"
        showMenuIcon
      />

      <PageTransition>
        <div className="container p-4 max-w-7xl mx-auto">
          {/* Cabeçalho com título e botão de adicionar */}
          <motion.div 
            className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div>
              <h1 className="text-2xl font-bold">Serviços do Catálogo</h1>
              <p className="text-muted-foreground">Gerencie os serviços que você oferece aos seus clientes</p>
            </div>
            
            <Button 
              onClick={() => {
                resetForm();
                setIsDialogOpen(true);
              }}
              className="w-full sm:w-auto py-5 text-base"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Adicionar Serviço
            </Button>
          </motion.div>
          
          {/* Barra de busca e filtros */}
          <motion.div
            className="mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar serviços..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <Select
                      value={selectedCategory?.toString() || ""}
                      onValueChange={(value) => setSelectedCategory(value ? parseInt(value) : null)}
                    >
                      <SelectTrigger className="w-full sm:w-[200px]">
                        <SelectValue placeholder="Todas categorias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todas">Todas categorias</SelectItem>
                        {categories.map(cat => (
                          <SelectItem key={cat.id} value={cat.id.toString()}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Button
                      variant="outline" 
                      size="icon"
                      onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
                      title={viewMode === "grid" ? "Visualizar em lista" : "Visualizar em grade"}
                    >
                      {viewMode === "grid" ? (
                        <Menu className="h-4 w-4" />
                      ) : (
                        <Box className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Tabs para filtrar por status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="mb-6"
          >
            <Tabs 
              defaultValue="all" 
              value={activeTab}
              onValueChange={(value) => setActiveTab(value as "all" | "active" | "inactive")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="active">Ativos</TabsTrigger>
                <TabsTrigger value="inactive">Inativos</TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {services.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Scissors className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-medium mb-2">Nenhum serviço cadastrado</h3>
                    <p className="text-muted-foreground mb-6">
                      Adicione serviços ao seu catálogo para começar a receber agendamentos
                    </p>
                    <Button 
                      onClick={() => {
                        resetForm();
                        setIsDialogOpen(true);
                      }}
                      className="py-5 text-base"
                      size="lg"
                    >
                      <Plus className="h-5 w-5 mr-2" />
                      Adicionar Serviço
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : filteredServices.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-8 text-center">
                  <div className="flex flex-col items-center justify-center">
                    <Search className="h-16 w-16 text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-medium mb-2">Nenhum serviço encontrado</h3>
                    <p className="text-muted-foreground mb-6">
                      Não encontramos serviços com os filtros aplicados
                    </p>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory(null);
                        setActiveTab("all");
                      }}
                    >
                      Limpar Filtros
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ) : viewMode === "grid" ? (
            // Visualização em grade (cards)
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <AnimatePresence>
                {Object.entries(servicesByCategory).map(([category, categoryServices]) => (
                  <motion.div 
                    key={category} 
                    className="mb-8"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="flex items-center mb-4">
                      <h2 className="text-lg font-semibold">{category}</h2>
                      <Separator className="flex-1 ml-4" />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryServices.map((service) => {
                        const customDuration = getCustomServiceDuration(service.id);
                        const isActive = service.isActive === null || service.isActive;
                        
                        return (
                          <motion.div
                            key={service.id}
                            layout
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            transition={{ duration: 0.2 }}
                          >
                            <Card className={cn(
                              "h-full transition-all hover:shadow-md hover:border-primary/50",
                              !isActive && "opacity-75"
                            )}>
                              <CardHeader className="pb-2 relative">
                                <div className="absolute top-3 right-3">
                                  {isActive ? (
                                    <Badge variant="success" className="ml-2">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Ativo
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive" className="ml-2">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Inativo
                                    </Badge>
                                  )}
                                </div>
                                <CardTitle className="text-lg text-primary font-medium line-clamp-1">
                                  {service.name}
                                </CardTitle>
                                <CardDescription className="line-clamp-2 h-10">
                                  {service.description || "Sem descrição"}
                                </CardDescription>
                              </CardHeader>
                              
                              <CardContent className="pb-0">
                                <div className="grid grid-cols-2 gap-2 text-sm mb-4">
                                  <div className="flex items-center bg-muted rounded-md px-2 py-1.5">
                                    <Clock4 className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                    <span>
                                      {customDuration !== null ? customDuration : service.duration} min
                                      {customDuration !== null && (
                                        <span className="text-xs text-primary ml-1 inline-block">*</span>
                                      )}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center bg-muted rounded-md px-2 py-1.5">
                                    <DollarSign className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                                    <span className="font-medium">
                                      {formatCurrency(service.price || 0)}
                                    </span>
                                  </div>
                                </div>
                              </CardContent>
                              
                              <CardFooter className="pt-0">
                                <div className="flex space-x-2 w-full">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => handleEditService(service)}
                                  >
                                    <Pencil className="h-4 w-4 mr-1" />
                                    Editar
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-amber-500"
                                    onClick={() => {
                                      setServiceToCustomize(service);
                                      setIsExecutionTimeDialogOpen(true);
                                    }}
                                    title="Personalizar tempo de execução"
                                  >
                                    <Timer className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500"
                                    onClick={() => handleDeleteService(service)}
                                    title="Excluir serviço"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </CardFooter>
                            </Card>
                          </motion.div>
                        );
                      })}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            // Visualização em lista (tabela)
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.3 }}
            >
              <Card>
                <CardContent className="p-0 overflow-hidden">
                  <ScrollArea className="h-[65vh]">
                    <Table>
                      <TableHeader className="bg-muted/50 sticky top-0">
                        <TableRow>
                          <TableHead>Nome</TableHead>
                          <TableHead>Categoria</TableHead>
                          <TableHead className="text-center">Duração</TableHead>
                          <TableHead className="text-center">Preço</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                          <TableHead className="text-right">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredServices.map((service) => {
                          const customDuration = getCustomServiceDuration(service.id);
                          const isActive = service.isActive === null || service.isActive;
                          
                          return (
                            <TableRow key={service.id} className={!isActive ? "opacity-70" : ""}>
                              <TableCell>
                                <div>
                                  <span className="font-medium">{service.name}</span>
                                  {service.description && (
                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                      {service.description}
                                    </p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell>{getCategoryName(service.categoryId)}</TableCell>
                              <TableCell className="text-center">
                                <div className="flex items-center justify-center">
                                  <span className="font-medium">
                                    {customDuration !== null ? customDuration : service.duration} min
                                  </span>
                                  
                                  {customDuration !== null && (
                                    <Badge variant="outline" className="ml-2 h-5">
                                      <Clock className="h-3 w-3 mr-1" />
                                      <span className="text-xs">Personalizado</span>
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center font-medium">
                                {formatCurrency(service.price || 0)}
                              </TableCell>
                              <TableCell className="text-center">
                                {isActive ? (
                                  <Badge variant="success">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Ativo
                                  </Badge>
                                ) : (
                                  <Badge variant="destructive">
                                    <XCircle className="h-3 w-3 mr-1" />
                                    Inativo
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex space-x-2 justify-end">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleEditService(service)}
                                    title="Editar serviço"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-amber-500"
                                    onClick={() => {
                                      setServiceToCustomize(service);
                                      setIsExecutionTimeDialogOpen(true);
                                    }}
                                    title="Personalizar tempo de execução"
                                  >
                                    <Timer className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-500"
                                    onClick={() => handleDeleteService(service)}
                                    title="Excluir serviço"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </PageTransition>

      {/* Diálogo para adicionar/editar serviço */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {serviceToEdit ? "Editar Serviço" : "Adicionar Serviço"}
            </DialogTitle>
            <DialogDescription>
              {serviceToEdit
                ? "Atualize os detalhes do serviço"
                : "Adicione um novo serviço ao seu catálogo"}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {!serviceToEdit && (
                <>
                  {/* Seleção de Nicho */}
                  <FormField
                    control={form.control}
                    name="nicheId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Especialidade</FormLabel>
                        <Select
                          value={field.value?.toString() || ""}
                          onValueChange={handleNicheChange}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma especialidade" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {niches.map((niche) => (
                              <SelectItem key={niche.id} value={niche.id.toString()}>
                                {niche.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Escolha a especialidade do serviço
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Seleção de Categoria */}
                  <FormField
                    control={form.control}
                    name="categoryId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoria</FormLabel>
                        <Select
                          value={field.value?.toString() || ""}
                          onValueChange={handleCategoryChange}
                          disabled={!selectedNicheId}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma categoria" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredCategories.map((category) => (
                              <SelectItem
                                key={category.id}
                                value={category.id.toString()}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Escolha a categoria do serviço
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Seleção de Serviço */}
                  <FormField
                    control={form.control}
                    name="templateId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Serviço</FormLabel>
                        <Select
                          value={field.value?.toString() || ""}
                          onValueChange={handleTemplateChange}
                          disabled={!form.watch("categoryId")}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um serviço" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {filteredTemplates.map((template) => (
                              <SelectItem
                                key={template.id}
                                value={template.id.toString()}
                              >
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Escolha o serviço que deseja adicionar
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {/* Preço */}
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        {...field}
                        value={field.value === 0 ? "" : field.value}
                        onChange={(e) => {
                          const value = parseFloat(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Defina o preço do serviço em reais
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Duração */}
              <FormField
                control={form.control}
                name="duration"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (minutos)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={5}
                        step={5}
                        {...field}
                        value={field.value?.toString() || ""}
                        onChange={(e) => {
                          const value = parseInt(e.target.value);
                          field.onChange(isNaN(value) ? 0 : value);
                        }}
                      />
                    </FormControl>
                    <FormDescription>
                      Tempo necessário para realizar o serviço
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Status (Ativo/Inativo) */}
              <FormField
                control={form.control}
                name="isActive"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5">
                      <FormLabel>Status do serviço</FormLabel>
                      <FormDescription>
                        {field.value ? "O serviço está ativo e visível para clientes" : "O serviço está inativo e não aparecerá para clientes"}
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  disabled={serviceFormMutation.isPending}
                >
                  {serviceFormMutation.isPending && (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  )}
                  {serviceToEdit ? "Atualizar" : "Adicionar"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Diálogo de confirmação para exclusão */}
      <AlertDialog 
        open={isDeleteDialogOpen} 
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Isso removerá permanentemente o serviço
              "{serviceToDelete?.name}" do seu catálogo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
              disabled={deleteServiceMutation.isPending}
            >
              {deleteServiceMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Diálogo para personalização do tempo de execução */}
      <ExecutionTimeDialog 
        isOpen={isExecutionTimeDialogOpen && !!serviceToCustomize}
        onClose={() => {
          setServiceToCustomize(null);
          setIsExecutionTimeDialogOpen(false);
          // Atualizar os dados após personalização
          queryClient.invalidateQueries({ 
            queryKey: [`/api/provider-services/provider/${user?.id}`] 
          });
        }}
        service={serviceToCustomize}
      />
    </div>
  );
}