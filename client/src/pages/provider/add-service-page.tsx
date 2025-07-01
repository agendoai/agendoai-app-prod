import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, ArrowLeft, Sparkles, Clock, DollarSign, FileText } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

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

  // Estados para criação de serviço personalizado
  const [serviceName, setServiceName] = useState("");
  const [serviceDescription, setServiceDescription] = useState("");
  const [selectedNiche, setSelectedNiche] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("30");
  const [executionTime, setExecutionTime] = useState("25");
  const [breakTime, setBreakTime] = useState("5");

  // Estados para busca de templates (opcional)
  const [searchTerm, setSearchTerm] = useState("");
  const [showTemplateSearch, setShowTemplateSearch] = useState(false);

  // Fetch niches com melhor tratamento de erro
  const { data: niches = [], isLoading: isLoadingNiches, error: nichesError } = useQuery({
    queryKey: ["/api/niches"],
    queryFn: async () => {
      try {
        const response = await fetch("/api/niches");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Erro ao carregar nichos:", error);
        return [];
      }
    },
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Fetch categories based on selected niche
  const { data: categories = [], isLoading: isLoadingCategories, error: categoriesError } = useQuery({
    queryKey: ["/api/categories", selectedNiche],
    queryFn: async () => {
      try {
        if (!selectedNiche || selectedNiche === "teste") return [];
        const response = await fetch(`/api/categories?nicheId=${selectedNiche}`);
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error("Erro ao carregar categorias:", error);
        return [];
      }
    },
    enabled: !!selectedNiche && selectedNiche !== "teste",
    retry: 2,
    retryDelay: 1000,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // Create custom service mutation
  const createCustomServiceMutation = useMutation({
    mutationFn: async (serviceData: any) => {
      const response = await fetch(`http://localhost:5000/api/provider-services/custom`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(serviceData),
        credentials: 'include', // Incluir cookies para autenticação
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Serviço criado com sucesso!",
        description: "Seu serviço personalizado foi adicionado ao seu catálogo.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/provider-services'] });
      navigate("/provider/services");
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar serviço",
        description: error.message || "Ocorreu um erro ao criar o serviço. Por favor, tente novamente.",
        variant: "destructive",
      });
    }
  });

  const handleCreateCustomService = () => {
    if (!serviceName || !selectedNiche || !selectedCategory || !price) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const serviceData = {
      providerId: user?.id,
      name: serviceName,
      description: serviceDescription,
      nicheId: parseInt(selectedNiche),
      categoryId: parseInt(selectedCategory),
      price: parseFloat(price),
      duration: parseInt(duration),
      executionTime: parseInt(executionTime),
      breakTime: parseInt(breakTime),
    };

    createCustomServiceMutation.mutate(serviceData);
  };

  // Função para renderizar nichos com segurança
  const renderNiches = () => {
    if (isLoadingNiches) {
      return <SelectItem value="loading" disabled>Carregando nichos...</SelectItem>;
    }
    
    if (nichesError) {
      return <SelectItem value="error" disabled>Erro ao carregar nichos</SelectItem>;
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

  // Função para renderizar categorias com segurança
  const renderCategories = () => {
    if (isLoadingCategories) {
      return <SelectItem value="loading" disabled>Carregando categorias...</SelectItem>;
    }
    
    if (categoriesError) {
      return <SelectItem value="error" disabled>Erro ao carregar categorias</SelectItem>;
    }
    
    if (!Array.isArray(categories) || categories.length === 0) {
      return <SelectItem value="empty" disabled>Nenhuma categoria disponível</SelectItem>;
    }
    
    return categories.map((category: any) => (
      <SelectItem key={category?.id || 'unknown'} value={(category?.id || 'unknown').toString()}>
        {category?.name || 'Categoria sem nome'}
      </SelectItem>
    ));
  };

  return (
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
            <h1 className="text-4xl font-bold text-gray-900">Adicionar Novo Serviço</h1>
          </div>
          <p className="text-gray-600 text-lg max-w-2xl">
            Crie um serviço personalizado para seu catálogo ou encontre templates prontos para adicionar.
          </p>
        </div>

        {/* Verificação de segurança */}
        {nichesError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 font-medium">Erro ao carregar nichos: {nichesError.message}</p>
            <Button 
              variant="outline" 
              size="sm" 
              className="mt-3"
              onClick={() => window.location.reload()}
            >
              Tentar novamente
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8 shadow-lg border-0 bg-white/80 backdrop-blur-sm">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-gray-700" />
                  Opções
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Escolha como adicionar seu serviço
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button 
                  className={`w-full justify-start h-12 transition-all duration-200 ${
                    !showTemplateSearch 
                      ? "bg-gray-900 text-white hover:bg-gray-800 shadow-lg" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  variant={!showTemplateSearch ? "default" : "ghost"}
                  onClick={() => setShowTemplateSearch(false)}
                >
                  <Plus className="mr-3 h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Criar Personalizado</div>
                    <div className="text-xs opacity-80">Serviço do zero</div>
                  </div>
                </Button>
                
                <Button 
                  className={`w-full justify-start h-12 transition-all duration-200 ${
                    showTemplateSearch 
                      ? "bg-gray-900 text-white hover:bg-gray-800 shadow-lg" 
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                  variant={showTemplateSearch ? "default" : "ghost"}
                  onClick={() => setShowTemplateSearch(true)}
                >
                  <Search className="mr-3 h-4 w-4" />
                  <div className="text-left">
                    <div className="font-medium">Buscar Templates</div>
                    <div className="text-xs opacity-80">Serviços prontos</div>
                  </div>
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {!showTemplateSearch ? (
              // Formulário para criar serviço personalizado
              <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <FileText className="h-6 w-6 text-gray-700" />
                    Criar Serviço Personalizado
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    Crie seu próprio serviço personalizado com detalhes específicos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                  {/* Informações Básicas */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                      Informações Básicas
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="service-name" className="text-sm font-medium text-gray-700">
                          Nome do Serviço *
                        </Label>
                        <Input
                          id="service-name"
                          placeholder="Ex: Corte de Cabelo Masculino"
                          value={serviceName}
                          onChange={(e) => setServiceName(e.target.value)}
                          className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Preço (R$) *
                        </Label>
                        <Input
                          id="price"
                          type="number"
                          placeholder="0.00"
                          min="0"
                          step="0.01"
                          value={price}
                          onChange={(e) => setPrice(e.target.value)}
                          className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description" className="text-sm font-medium text-gray-700">
                        Descrição
                      </Label>
                      <Textarea
                        id="description"
                        placeholder="Descreva detalhadamente seu serviço, incluindo o que está incluído..."
                        value={serviceDescription}
                        onChange={(e) => setServiceDescription(e.target.value)}
                        rows={4}
                        className="border-gray-300 focus:border-gray-900 focus:ring-gray-900 resize-none"
                      />
                    </div>
                  </div>

                  {/* Categorização */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">
                      Categorização
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="niche" className="text-sm font-medium text-gray-700">
                          Nicho *
                        </Label>
                        <Select value={selectedNiche} onValueChange={setSelectedNiche} disabled={isLoadingNiches}>
                          <SelectTrigger className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                            <SelectValue placeholder={isLoadingNiches ? "Carregando..." : nichesError ? "Erro ao carregar" : "Selecione o nicho"} />
                          </SelectTrigger>
                          <SelectContent>
                            {renderNiches()}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category" className="text-sm font-medium text-gray-700">
                          Categoria *
                        </Label>
                        <Select value={selectedCategory} onValueChange={setSelectedCategory} disabled={isLoadingCategories || !selectedNiche}>
                          <SelectTrigger className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900">
                            <SelectValue placeholder={isLoadingCategories ? "Carregando..." : categoriesError ? "Erro ao carregar" : "Selecione a categoria"} />
                          </SelectTrigger>
                          <SelectContent>
                            {renderCategories()}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  {/* Configurações de Tempo */}
                  <div className="space-y-6">
                    <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-gray-700" />
                      Configurações de Tempo
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="duration" className="text-sm font-medium text-gray-700">
                          Duração Total (min) *
                        </Label>
                        <Input
                          id="duration"
                          type="number"
                          placeholder="30"
                          min="1"
                          value={duration}
                          onChange={(e) => setDuration(e.target.value)}
                          className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                        />
                        <p className="text-xs text-gray-500">Tempo total do agendamento</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="execution-time" className="text-sm font-medium text-gray-700">
                          Tempo de Execução (min) *
                        </Label>
                        <Input
                          id="execution-time"
                          type="number"
                          placeholder="25"
                          min="1"
                          value={executionTime}
                          onChange={(e) => setExecutionTime(e.target.value)}
                          className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                        />
                        <p className="text-xs text-gray-500">Tempo efetivo do serviço</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="break-time" className="text-sm font-medium text-gray-700">
                          Intervalo (min)
                        </Label>
                        <Input
                          id="break-time"
                          type="number"
                          placeholder="5"
                          min="0"
                          value={breakTime}
                          onChange={(e) => setBreakTime(e.target.value)}
                          className="h-12 border-gray-300 focus:border-gray-900 focus:ring-gray-900"
                        />
                        <p className="text-xs text-gray-500">Tempo de preparação</p>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                    <Button 
                      variant="outline" 
                      onClick={() => navigate("/provider/services")}
                      className="h-12 px-6 border-gray-300 text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleCreateCustomService}
                      disabled={createCustomServiceMutation.isPending}
                      className="h-12 px-8 bg-gray-900 hover:bg-gray-800 text-white shadow-lg"
                    >
                      {createCustomServiceMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Criando...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Criar Serviço
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              // Busca de templates (mantido como opção)
              <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <Search className="h-6 w-6 text-gray-700" />
                    Buscar Templates
                  </CardTitle>
                  <CardDescription className="text-gray-600 text-base">
                    Encontre serviços prontos para adicionar ao seu catálogo
                  </CardDescription>
                </CardHeader>
                <CardContent className="py-12">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Search className="h-8 w-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">
                      Funcionalidade em Desenvolvimento
                    </h3>
                    <p className="text-gray-600 max-w-md mx-auto">
                      A busca de templates está sendo implementada. Use "Criar Serviço Personalizado" 
                      para adicionar seus próprios serviços ao catálogo.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}