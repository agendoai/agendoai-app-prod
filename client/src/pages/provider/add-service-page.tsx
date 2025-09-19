import { useState, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, ArrowLeft, Sparkles, Clock, DollarSign, FileText, Filter, X, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { apiCall } from "@/lib/api";
import type { ServiceTemplate, Category } from "@shared/schema";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import ProviderLayout from "@/components/layout/provider-layout";
import type { Niche } from "@shared/schema";

export default function AddServicePage() {
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Verificar se o usuário está autenticado
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Carregando...</p>
        </div>
      </div>
    );
  }

  // Estados para busca de templates (opcional)
  const [searchTerm, setSearchTerm] = useState("");

  // Estados para filtros
  const [filterNiche, setFilterNiche] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Estado para template selecionado e inputs do provider
  const [selectedTemplate, setSelectedTemplate] = useState<ServiceTemplate | null>(null);
  const [customPrice, setCustomPrice] = useState("");
  const [customDuration, setCustomDuration] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [step, setStep] = useState(1);

  // Buscar nichos
  const { data: niches = [], isLoading: isLoadingNiches } = useQuery({
    queryKey: ["/api/niches"],
    queryFn: async () => {
      const response = await apiCall("/api/niches");
      if (!response.ok) throw new Error("Falha ao carregar nichos");
      return response.json() as Promise<Niche[]>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Buscar categorias
  const { data: allCategories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await apiCall("/api/categories");
      if (!response.ok) throw new Error("Falha ao carregar categorias");
      return response.json() as Promise<Category[]>;
    },
    staleTime: 5 * 60 * 1000, // 5 minutos
  });


  // Buscar templates de serviço
  const { data: templates = [], isLoading: isLoadingTemplates, error: templatesError } = useQuery({
    queryKey: ["/api/service-templates"],
    queryFn: async () => {
      const res = await apiCall("/api/service-templates");
      if (!res.ok) throw new Error("Falha ao carregar templates de serviço");
      return res.json() as Promise<ServiceTemplate[]>;
    }
  });

  // Buscar serviços existentes do prestador para verificar templates já utilizados
  const { data: existingProviderServices = [], isLoading: isLoadingExistingServices, error: existingServicesError, refetch } = useQuery({
    queryKey: ["/api/provider-services/provider", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      // Usar o endpoint correto: /api/provider-services/provider/:providerId
      const res = await apiCall(`/api/provider-services/provider/${user.id}`);
      if (!res.ok) {
        // console.error("Erro ao carregar serviços existentes:", res.status, res.statusText);
        throw new Error("Falha ao carregar serviços existentes");
      }
      const data = await res.json();
      // console.log("Provider services data:", data);
      return data;
    },
    enabled: !!user?.id,
    // Adicionando um tempo de refetch mais curto para garantir dados atualizados
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    staleTime: 0,
  });

  // Filtrar templates baseado nos filtros aplicados (MOSTRAR TODOS, não excluir os já utilizados)
  const filteredTemplates = useMemo(() => {
    // console.log("Templates:", templates);
    // console.log("Existing services:", existingProviderServices);
    
    const result = templates.filter((template) => {
      // Filtro por busca
      const matchesSearch = !searchTerm || 
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (template.description?.toLowerCase() || '').includes(searchTerm.toLowerCase());

      // Filtro por categoria
      const matchesCategory = !filterCategory || 
        template.categoryId?.toString() === filterCategory;

      // Filtro por nicho - buscar a categoria do template e verificar se pertence ao nicho
      const matchesNiche = !filterNiche || (() => {
        const templateCategory = allCategories.find(c => c.id === template.categoryId);
        return templateCategory?.nicheId?.toString() === filterNiche;
      })();

      return matchesSearch && matchesCategory && matchesNiche;
    });
    
    // console.log("Filtered templates:", result);
    return result;
  }, [templates, searchTerm, filterNiche, filterCategory, allCategories, existingProviderServices]);

  // Função para verificar se um template já foi utilizado pelo prestador
  const isTemplateUsedByProvider = (templateId: number) => {
    // Se houver erro ao carregar os serviços existentes, não marcar nenhum template como usado
    if (existingServicesError) {
      // console.log("Error loading existing services, not marking any templates as used");
      return false;
    }
    
    // Se os serviços existentes ainda não foram carregados, não marcar nenhum template como usado
    if (isLoadingExistingServices || !existingProviderServices) {
      // console.log("Services still loading or undefined, not marking any templates as used");
      return false;
    }
    
    // Debug: log the existing services and templateId being checked
    // console.log("Checking template ID:", templateId);
    // console.log("Existing provider services:", existingProviderServices);
    
    // Verificar se algum serviço existente usa este template (serviceId)
    // Corrigido: Verificar se o serviceId do serviço do prestador corresponde ao ID do template
    const isUsed = existingProviderServices.some((service: any) => {
      // Ajustado para verificar corretamente o relacionamento entre serviço do prestador e template
      const serviceId = service.serviceId;
      const match = serviceId === templateId;
      // console.log(`Comparing serviceId ${serviceId} (${typeof serviceId}) with templateId ${templateId} (${typeof templateId}): ${match}`);
      return match;
    });
    
    // console.log(`Template ${templateId} is used:`, isUsed);
    return isUsed;
  };

  // Função para limpar filtros
  const clearFilters = () => {
    setSearchTerm("");
    setFilterNiche("");
    setFilterCategory("");
  };

  // Função para abrir modal de customização
  const handleOpenTemplateDialog = (template: ServiceTemplate) => {
    // Verificar se o template já foi utilizado antes de abrir o modal
    const templateUsed = isTemplateUsedByProvider(template.id);
    // console.log("Template used check result:", templateUsed);
    
    if (templateUsed) {
      toast({ 
        title: 'Template já utilizado', 
        description: 'Este template já foi usado para criar um serviço. Cada template pode ser usado apenas uma vez por prestador.', 
        variant: 'destructive' 
      });
      return;
    }

    setSelectedTemplate(template);
    setCustomPrice("");
    setCustomDuration(template.duration ? String(template.duration) : "");
    setShowDialog(true);
  };

  // Função para criar serviço real a partir do template e adicionar ao provider
  const handleAddTemplate = async () => {
    if (!selectedTemplate || !customPrice || !customDuration) {
      toast({ title: 'Preencha todos os campos', variant: 'destructive' });
      return;
    }

    // Verificar se o template já foi utilizado (verificação adicional)
    const templateUsed = isTemplateUsedByProvider(selectedTemplate.id);
    // console.log("Additional template used check:", templateUsed);
    
    if (templateUsed) {
      toast({ 
        title: 'Template já utilizado', 
        description: 'Este template já foi usado para criar um serviço. Escolha outro template.', 
        variant: 'destructive' 
      });
      setShowDialog(false);
      return;
    }

    try {
      // 1. Criar serviço real a partir do template
      const createServiceRes = await apiCall('/api/services', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: selectedTemplate.name,
          description: selectedTemplate.description,
          categoryId: selectedTemplate.categoryId,
          price: parseFloat(customPrice),
          duration: parseInt(customDuration),
        })
      });
      if (!createServiceRes.ok) throw new Error('Erro ao criar serviço a partir do template');
      const createdService = await createServiceRes.json();
      // 2. Adicionar serviço ao provider
      addServiceMutation.mutate({
        serviceId: createdService.id,
        executionTime: parseInt(customDuration),
        price: parseFloat(customPrice),
        breakTime: 0,
        duration: parseInt(customDuration),
      });
      setShowDialog(false);
    } catch (error: any) {
      toast({ title: 'Erro ao adicionar serviço', description: error.message, variant: 'destructive' });
    }
  };

  // Ajustar addServiceMutation para receber os dados corretos
  const addServiceMutation = useMutation({
    mutationFn: async ({ serviceId, executionTime, price, breakTime, duration }: any) => {
      const response = await apiCall(`/provider-services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          providerId: user?.id,
          serviceId,
          executionTime,
          price,
          breakTime,
          duration,
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        // Verificar se é erro de duplicata
        if (response.status === 400 && errorData.error && errorData.error.includes('já existe')) {
          throw new Error(`❌ Serviço duplicado: ${errorData.error}\n\n📋 Detalhes do serviço existente:\n• Nome: ${errorData.existingService?.serviceName || 'N/A'}\n• Preço: R$ ${((errorData.existingService?.price || 0) / 100).toFixed(2)}\n• Duração: ${errorData.existingService?.executionTime || 'N/A'} min\n• Status: ${errorData.existingService?.isActive ? 'Ativo' : 'Inativo'}`);
        }
        throw new Error(errorData.error || errorData.message || 'Erro ao adicionar serviço');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({ title: 'Serviço adicionado!', description: 'O serviço foi adicionado ao seu catálogo.' });
      queryClient.invalidateQueries({ queryKey: ["/api/provider-services/provider", user?.id] });
      navigate('/provider/services');
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao adicionar serviço', description: error.message, variant: 'destructive' });
    }
  });

  // Função para renderizar nichos com segurança
  const renderNiches = () => {
    if (isLoadingNiches) {
      return <SelectItem value="loading" disabled>Carregando nichos...</SelectItem>;
    }
    
    if (!Array.isArray(niches) || niches.length === 0) {
      return <SelectItem value="empty" disabled>Nenhum nicho disponível</SelectItem>;
    }
    
    return niches.map((niche: any) => (
      <SelectItem key={niche?.id || 'unknown'} value={(niche?.id || 'unknown').toString()}>
        {niche?.name || 'Nicho sem nome'}
      </SelectItem>
    ));
  };

  // Função para renderizar categorias para filtros, agora filtrando pelo nicho selecionado
  const renderFilterCategories = () => {
    if (isLoadingCategories) {
      return <SelectItem value="loading" disabled>Carregando categorias...</SelectItem>;
    }
    if (!Array.isArray(allCategories) || allCategories.length === 0) {
      return <SelectItem value="empty" disabled>Nenhuma categoria disponível</SelectItem>;
    }
    // Filtrar categorias pelo nicho selecionado
    const categoriesToShow = filterNiche
      ? allCategories.filter(cat => cat.nicheId?.toString() === filterNiche)
      : allCategories;
    return categoriesToShow.map((category: any) => (
      <SelectItem key={category?.id || 'unknown'} value={(category?.id || 'unknown').toString()}>
        {category?.name || 'Categoria sem nome'}
      </SelectItem>
    ));
  };

  // Garante que filterCategory sempre seja válido ao trocar o nicho, usando useEffect para evitar render loop
  useEffect(() => {
    const filteredCategoriesForFilter = filterNiche
      ? allCategories.filter(cat => cat.nicheId?.toString() === filterNiche)
      : allCategories;
    if (filterCategory && !filteredCategoriesForFilter.some(cat => cat.id?.toString() === filterCategory)) {
      setFilterCategory("");
    }
  }, [filterNiche, allCategories, filterCategory, setFilterCategory]);

  // Refetch existing services when component mounts
  useEffect(() => {
    if (user?.id) {
      refetch();
    }
  }, [user?.id, refetch]);

  return (
    <ProviderLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <div className="container mx-auto py-8 px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-4 mb-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/provider/services")}
                className="hover:bg-gray-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar
              </Button>
              <div className="h-6 w-px bg-gray-300"></div>
              <h1 className="text-xl font-bold text-gray-900">Adicionar Novo Serviço</h1>
            </div>
            <p className="text-gray-600 text-lg max-w-2xl">
              Encontre templates de serviços prontos para adicionar ao seu catálogo.
            </p>
          </div>

          {/* Verificação de segurança */}
          {/* Removido verificação de nichesError pois não está mais sendo usado */}

          <div className="grid grid-cols-1 gap-8">
            {/* Main Content */}
            <div className="col-span-1">
              <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Search className="h-6 w-6 text-[#58c9d1]" />
                    Buscar Templates
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    Encontre serviços prontos para adicionar ao seu catálogo
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-6">
                  {/* Filtros e Busca */}
                  <div className="mb-6 space-y-4">
                    {/* Barra de busca */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-12 bg-white border-gray-200 focus:border-[#58c9d1] focus:ring-[#58c9d1]"
                      />
                    </div>

                    {/* Botão de filtros */}
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center gap-2 border-[#58c9d1] text-[#58c9d1] hover:bg-[#58c9d1] hover:text-white"
                      >
                        <Filter className="h-4 w-4" />
                        Filtros
                        {(filterNiche || filterCategory) && (
                          <span className="bg-[#58c9d1] text-white text-xs px-2 py-1 rounded-full">
                            {(filterNiche ? 1 : 0) + (filterCategory ? 1 : 0)}
                          </span>
                        )}
                      </Button>
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/provider-services/provider", user?.id] })}
                        className="flex items-center gap-2 border-[#58c9d1] text-[#58c9d1] hover:bg-[#58c9d1] hover:text-white"
                      >
                        <RefreshCw className="h-4 w-4" />
                        Atualizar
                      </Button>
                      
                      {(filterNiche || filterCategory || searchTerm) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="flex items-center gap-2 text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-4 w-4" />
                          Limpar
                        </Button>
                      )}
                    </div>

                    {/* Painel de filtros */}
                    {showFilters && (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">Nicho</Label>
                            <Select value={filterNiche} onValueChange={value => { setFilterNiche(value); setFilterCategory(""); }}>
                              <SelectTrigger className="h-10 bg-white rounded-lg border border-gray-300 focus:border-[#58c9d1] focus:ring-2 focus:ring-[#58c9d1]/20 shadow-sm text-base font-medium transition-all duration-150">
                                <SelectValue placeholder="Selecione um nicho" />
                              </SelectTrigger>
                              <SelectContent className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-base">
                                {renderNiches()}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          <div>
                            <Label className="text-sm font-medium text-gray-700 mb-2 block">Categoria</Label>
                            <Select value={filterCategory} onValueChange={setFilterCategory}>
                              <SelectTrigger className="h-10 bg-white rounded-lg border border-gray-300 focus:border-[#58c9d1] focus:ring-2 focus:ring-[#58c9d1]/20 shadow-sm text-base font-medium transition-all duration-150">
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                              <SelectContent className="bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-base">
                                {renderFilterCategories()}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resultados */}
                  {(isLoadingTemplates || isLoadingExistingServices) ? (
                    <div className="text-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500">Carregando templates...</p>
                    </div>
                  ) : existingServicesError ? (
                    <div className="text-center py-8 text-red-500">
                      Erro ao carregar serviços existentes: {existingServicesError.message}
                      <br />
                      Templates podem ser mostrados incorretamente como "já usados".
                    </div>
                  ) : templatesError ? (
                    <div className="text-center py-8 text-red-500">Erro ao carregar templates</div>
                  ) : filteredTemplates.length === 0 ? (
                    <div className="text-center py-8">
                      <Search className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                      <p className="text-gray-500 text-lg font-medium mb-2">
                        {searchTerm || filterNiche || filterCategory 
                          ? "Nenhum template encontrado" 
                          : "Nenhum template disponível"
                        }
                      </p>
                      <p className="text-gray-400 text-sm">
                        {searchTerm || filterNiche || filterCategory 
                          ? "Tente ajustar os filtros ou termos de busca"
                          : "Templates serão adicionados em breve"
                        }
                      </p>
                    </div>
                  ) : (
                    <div>
                      {/* Contador de resultados */}
                      <div className="mb-4 text-sm text-gray-600">
                        {filteredTemplates.length} template{filteredTemplates.length !== 1 ? 's' : ''} encontrado{filteredTemplates.length !== 1 ? 's' : ''}
                        {existingProviderServices && existingProviderServices.length > 0 && (
                          <span className="ml-2 text-amber-600">
                            ({existingProviderServices.length} template{existingProviderServices.length !== 1 ? 's' : ''} já usado{existingProviderServices.length !== 1 ? 's' : ''})
                          </span>
                        )}
                      </div>
                      
                      {/* Grid de templates */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {filteredTemplates.map((template: ServiceTemplate) => {
                          try {
                            // Verificar se o template já foi utilizado pelo prestador
                            const isAlreadyUsed = isTemplateUsedByProvider(template.id);
                            
                            return (
                              <Card
                                key={template.id}
                                className={`bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border ${
                                  isAlreadyUsed ? 'border-red-200 bg-red-50' : 'border-gray-100'
                                }`}
                              >
                                <CardContent className="p-4">
                                  <div className="flex items-start justify-between mb-2">
                                    <h3 className={`font-semibold text-sm leading-tight line-clamp-2 ${
                                      isAlreadyUsed ? 'text-red-700' : 'text-gray-900'
                                    }`}>
                                      {template.name}
                                    </h3>
                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ml-2 flex-shrink-0 ${
                                      isAlreadyUsed 
                                            ? 'bg-red-100 text-red-700' 
                                            : template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                                        }`}>
                                          {isAlreadyUsed ? "Já usado" : (template.isActive ? "Ativo" : "Inativo")}
                                        </span>
                                      </div>
                                      
                                      <p className={`text-xs mb-3 line-clamp-2 ${
                                        isAlreadyUsed ? 'text-red-600' : 'text-gray-600'
                                      }`}>
                                        {template.description}
                                      </p>
                                      
                                      <div className={`flex items-center gap-3 text-xs mb-3 ${
                                        isAlreadyUsed ? 'text-red-500' : 'text-gray-500'
                                      }`}>
                                        <span className="flex items-center gap-1">
                                          <FileText className="h-3 w-3" />
                                          {allCategories.find((c: Category) => c.id === template.categoryId)?.name || "-"}
                                        </span>
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {template.duration} min
                                        </span>
                                      </div>
                                      
                                      {isAlreadyUsed ? (
                                        <Button
                                          className="w-full h-8 bg-red-100 text-red-700 text-xs font-medium cursor-not-allowed"
                                          disabled
                                        >
                                          Template já utilizado
                                        </Button>
                                      ) : (
                                        <Button
                                          className="w-full h-8 bg-[#58c9d1] hover:bg-[#4bb8c0] text-white text-xs font-medium"
                                          onClick={() => handleOpenTemplateDialog(template)}
                                          disabled={addServiceMutation.isPending}
                                        >
                                          <Plus className="h-3 w-3 mr-1" />
                                          Adicionar
                                        </Button>
                                      )}
                                    </CardContent>
                                  </Card>
                                );
                              } catch (error) {
                                // console.error("Error rendering template:", error, template);
                                return (
                                  <Card key={template.id} className="bg-white rounded-lg shadow-md border border-gray-100">
                                    <CardContent className="p-4">
                                      <div className="text-red-500">Erro ao carregar template</div>
                                    </CardContent>
                                  </Card>
                                );
                              }
                            })}
                          </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Dialog para customizar preço e tempo antes de adicionar serviço */}
          <Dialog open={showDialog} onOpenChange={(open) => { setShowDialog(open); if (!open) setStep(1); }}>
            <DialogContent className="bg-white rounded-xl shadow-lg p-8 max-w-md w-full">
              <DialogHeader>
                <DialogTitle className="text-xl font-bold text-gray-900 text-center">Adicionar Serviço</DialogTitle>
              </DialogHeader>
              <div className="flex flex-col items-center justify-center min-h-[220px] gap-6">
                {step === 1 && (
                  <div className="w-full">
                    <div className="mb-4 text-center">
                      <span className="block font-semibold text-gray-900 text-lg mb-1">{selectedTemplate?.name}</span>
                      <span className="block text-gray-600 text-sm mb-2">{selectedTemplate?.description}</span>
                    </div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Defina o preço do serviço (R$)</label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#58c9d1] focus:border-[#58c9d1] bg-white text-gray-900 transition"
                      value={customPrice}
                      onChange={e => setCustomPrice(e.target.value)}
                      placeholder="Ex: 99.90"
                    />
                  </div>
                )}
                {step === 2 && (
                  <div className="w-full">
                    <div className="mb-4 text-center">
                      <span className="block font-semibold text-gray-900 text-lg mb-1">{selectedTemplate?.name}</span>
                    </div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Defina o tempo de execução (min)</label>
                    <input
                      type="number"
                      min="1"
                      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#58c9d1] focus:border-[#58c9d1] bg-white text-gray-900 transition"
                      value={customDuration}
                      onChange={e => setCustomDuration(e.target.value)}
                      placeholder="Ex: 60"
                    />
                  </div>
                )}
                {step === 3 && (
                  <div className="w-full text-center">
                    <div className="mb-2">
                      <span className="block font-semibold text-gray-900 text-lg mb-1">{selectedTemplate?.name}</span>
                      <span className="block text-gray-600 text-sm mb-2">{selectedTemplate?.description}</span>
                    </div>
                    <div className="mb-2 text-gray-700">Preço: <span className="font-semibold">R$ {customPrice}</span></div>
                    <div className="mb-2 text-gray-700">Tempo de Execução: <span className="font-semibold">{customDuration} min</span></div>
                    <div className="mt-4 text-gray-500 text-sm">Confirme os dados antes de adicionar ao seu catálogo.</div>
                  </div>
                )}
              </div>
              <DialogFooter className="flex-row justify-center gap-4 mt-8">
                {step > 1 ? (
                  <Button variant="outline" onClick={() => setStep(step - 1)} className="rounded-lg px-6 border-[#58c9d1] text-[#58c9d1] hover:bg-[#58c9d1]/10 font-semibold">Voltar</Button>
                ) : null}
                {step < 3 ? (
                  <Button
                    onClick={() => {
                      if (step === 1 && !customPrice) return;
                      if (step === 2 && !customDuration) return;
                      setStep(step + 1);
                    }}
                    className="bg-[#58c9d1] hover:bg-[#4bb8c0] text-white font-semibold rounded-lg px-6"
                    disabled={(step === 1 && !customPrice) || (step === 2 && !customDuration) || addServiceMutation.isPending}
                  >
                    Próximo
                  </Button>
                ) : (
                  <Button
                    onClick={handleAddTemplate}
                    className="bg-[#58c9d1] hover:bg-[#4bb8c0] text-white font-semibold rounded-lg px-6"
                    disabled={addServiceMutation.isPending}
                  >
                    {addServiceMutation.isPending ? <Loader2 className="animate-spin h-4 w-4 mr-2 inline" /> : null}
                    Finalizar
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </ProviderLayout>
  );
}