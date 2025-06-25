import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Niche, Category, Service, User, ProviderSettings } from '@shared/schema';
import AppHeader from '@/components/layout/app-header';
import { NichoSelector } from '@/components/nicho-selector';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Slider } from '@/components/ui/slider';
import { Calendar } from '@/components/ui/calendar';
import { format, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { 
  Search, 
  MapPin, 
  Star, 
  Filter, 
  ListFilter, 
  X,
  Clock,
  CheckCircle,
  CalendarIcon
} from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { formatCurrency } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export default function ServiceSearchPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNicheId, setSelectedNicheId] = useState<number | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(0);
  const [maxDistance, setMaxDistance] = useState(20); // 20km by default
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [searchResults, setSearchResults] = useState<(User & { 
    settings?: ProviderSettings, 
    services: Service[],
    distance?: number 
  })[]>([]);
  
  // Sort options
  const [sortBy, setSortBy] = useState<'rating' | 'price' | 'distance'>('rating');
  
  // Estado adicional para armazenar os serviços disponíveis  
  const [availableServiceTemplates, setAvailableServiceTemplates] = useState<any[]>([]);
  const [isLoadingServiceTemplates, setIsLoadingServiceTemplates] = useState(false);
  const [showFilteredTemplates, setShowFilteredTemplates] = useState(false);
  
  // Fetch Niches
  const { data: niches, isLoading: isNichesLoading } = useQuery<Niche[]>({
    queryKey: ['/api/niches'],
  });
  
  // Fetch Categories based on selected niche
  const { data: categories, isLoading: isCategoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/niches', selectedNicheId, 'categories'],
    queryFn: async () => {
      if (!selectedNicheId) return [];
      const response = await fetch(`/api/niches/${selectedNicheId}/categories`);
      if (!response.ok) {
        throw new Error('Falha ao carregar categorias');
      }
      return response.json();
    },
    enabled: !!selectedNicheId,
  });

  // Fetch All Categories with niche info (for display in service cards)
  const { data: allCategoriesWithNiche } = useQuery<(Category & { nicheName?: string })[]>({
    queryKey: ['/api/categories', 'withNicheInfo'],
    queryFn: async () => {
      const response = await fetch('/api/categories?includeNicheInfo=true');
      if (!response.ok) {
        throw new Error('Falha ao carregar informações de categorias');
      }
      return response.json();
    },
  });
  
  // Função para buscar templates de serviço com base na categoria selecionada
  const fetchServiceTemplates = async () => {
    setIsLoadingServiceTemplates(true);
    try {
      if (selectedCategoryId) {
        // Busca templates por categoria se uma categoria estiver selecionada
        const response = await fetch(`/api/service-templates?categoryId=${selectedCategoryId}`);
        if (!response.ok) {
          throw new Error('Falha ao carregar templates de serviço');
        }
        const data = await response.json();
        setAvailableServiceTemplates(data);
      } else if (selectedNicheId && categories && categories.length > 0) {
        // Se um nicho estiver selecionado, busca templates para todas as categorias desse nicho
        const allTemplatesPromises = categories.map(category => 
          fetch(`/api/service-templates?categoryId=${category.id}`)
            .then(res => res.ok ? res.json() : [])
        );
        
        const allTemplatesResults = await Promise.all(allTemplatesPromises);
        // Combina todos os templates em um único array
        const combinedTemplates = allTemplatesResults.flat();
        setAvailableServiceTemplates(combinedTemplates);
      } else {
        setAvailableServiceTemplates([]);
      }
    } catch (error) {
      console.error('Erro ao buscar templates de serviço:', error);
      setAvailableServiceTemplates([]);
    } finally {
      setIsLoadingServiceTemplates(false);
    }
  };
  
  // Fetch providers based on search criteria
  const searchProviders = async () => {
    try {
      let endpoint = '/api/providers/search?';
      
      if (searchQuery) {
        endpoint += `q=${encodeURIComponent(searchQuery)}&`;
      }
      
      if (selectedCategoryId) {
        endpoint += `categoryId=${selectedCategoryId}&`;
      } else if (selectedNicheId) {
        endpoint += `nicheId=${selectedNicheId}&`;
      }
      
      if (minRating > 0) {
        endpoint += `minRating=${minRating * 10}&`; // API expects rating * 10
      }
      
      if (maxDistance < 20) {
        endpoint += `maxDistance=${maxDistance}&`;
      }
      
      // Adicionar filtro de data se uma data for selecionada
      if (selectedDate) {
        const formattedDate = format(selectedDate, 'yyyy-MM-dd');
        endpoint += `date=${formattedDate}&`;
        console.log(`Buscando prestadores disponíveis para a data: ${formattedDate}`);
      }
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Falha ao buscar prestadores');
      }
      
      const providers = await response.json();
      
      // Sort results
      let sortedProviders = [...providers];
      if (sortBy === 'rating') {
        sortedProviders.sort((a, b) => 
          ((b.settings?.rating || 0) - (a.settings?.rating || 0))
        );
      } else if (sortBy === 'price') {
        sortedProviders.sort((a, b) => {
          const aMinPrice = a.services.reduce((min: number | null, svc: any) => 
            (svc.price !== null && (min === null || svc.price < min)) ? svc.price : min, null as number | null);
          const bMinPrice = b.services.reduce((min: number | null, svc: any) => 
            (svc.price !== null && (min === null || svc.price < min)) ? svc.price : min, null as number | null);
          
          // Handle null prices (put them at the end)
          if (aMinPrice === null && bMinPrice === null) return 0;
          if (aMinPrice === null) return 1;
          if (bMinPrice === null) return -1;
          
          return aMinPrice - bMinPrice;
        });
      } else if (sortBy === 'distance') {
        sortedProviders.sort((a, b) => 
          (a.distance || 999) - (b.distance || 999)
        );
      }
      
      setSearchResults(sortedProviders);
    } catch (error) {
      console.error('Error searching providers:', error);
      // Retorna vazio em caso de erro para evitar que a Promise quebre
      return [];
    }
  };
  
  // Buscar templates de serviço quando categoria ou nicho mudar
  useEffect(() => {
    if (selectedCategoryId || (selectedNicheId && categories?.length > 0)) {
      fetchServiceTemplates();
    }
  }, [selectedCategoryId, selectedNicheId, categories]);
  
  // Estado para controlar o carregamento dos resultados de busca
  const [isSearching, setIsSearching] = useState(false);

  // Buscar prestadores somente após obter os templates de serviço
  useEffect(() => {
    if (searchQuery || selectedCategoryId || selectedNicheId) {
      // Primeiro garantimos que os templates foram carregados
      if (!isLoadingServiceTemplates) {
        setIsSearching(true);
        searchProviders()
          .finally(() => setIsSearching(false));
      }
    }
  }, [searchQuery, selectedCategoryId, selectedNicheId, minRating, maxDistance, sortBy, selectedDate, availableServiceTemplates, isLoadingServiceTemplates]);
  
  // Handle niche selection
  const handleNicheSelect = (nicheId: number) => {
    setSelectedNicheId(nicheId);
    setSelectedCategoryId(null);
    setAvailableServiceTemplates([]); // Limpar serviços ao mudar de nicho
  };
  
  // Handle category selection
  const handleCategorySelect = (categoryId: number) => {
    setSelectedCategoryId(categoryId);
    setAvailableServiceTemplates([]); // Limpar serviços ao mudar de categoria
  };
  
  // Handle provider selection
  const handleProviderSelect = (providerId: number) => {
    setLocation(`/client/providers/${providerId}`);
  };
  
  // Handle service booking
  const handleBookService = (providerId: number, serviceId: number) => {
    // Corrigido para usar o mesmo fluxo que as outras partes do aplicativo
    setLocation(`/client/provider-schedule/${providerId}/${serviceId}`);
  };
  
  return (
    <div className="pb-16 min-h-screen bg-white">
      <AppHeader title="Buscar Prestadores" showBackButton />
      
      {/* Search bar */}
      <div className="px-4 py-3 sticky top-0 z-10 bg-white border-b">
        <div className="relative">
          <Input
            type="text"
            placeholder="Buscar prestadores..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-10"
          />
          <Search className="absolute left-3 top-2.5 h-5 w-5 text-muted-foreground" />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5"
            >
              <X className="h-5 w-5 text-muted-foreground" />
            </button>
          )}
        </div>
        
        <div className="flex items-center justify-between mt-3">
          <div className="flex space-x-2 overflow-x-auto no-scrollbar">
            <Button 
              variant={showFilters ? "default" : "outline"} 
              size="sm"
              className="flex items-center"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4 mr-1" />
              Filtros
            </Button>
            
            <Button 
              variant={sortBy === 'rating' ? "default" : "outline"} 
              size="sm"
              className="flex items-center"
              onClick={() => setSortBy('rating')}
            >
              <Star className="h-4 w-4 mr-1" />
              Avaliação
            </Button>
            
            <Button 
              variant={sortBy === 'price' ? "default" : "outline"} 
              size="sm"
              className="flex items-center"
              onClick={() => setSortBy('price')}
            >
              <span className="mr-1">R$</span>
              Preço
            </Button>
            
            <Button 
              variant={sortBy === 'distance' ? "default" : "outline"} 
              size="sm"
              className="flex items-center"
              onClick={() => setSortBy('distance')}
            >
              <MapPin className="h-4 w-4 mr-1" />
              Distância
            </Button>
          </div>
        </div>
      </div>
      
      {/* Filter section */}
      {showFilters && (
        <div className="p-4 bg-gray-50 border-b">
          <h3 className="font-medium mb-3">Filtros</h3>
          
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-1 block">
              Avaliação mínima
            </label>
            <div className="flex items-center">
              <Slider
                value={[minRating]}
                min={0}
                max={5}
                step={0.5}
                onValueChange={(values) => setMinRating(values[0])}
                className="flex-1 mr-4"
              />
              <div className="flex items-center">
                <Star className="h-4 w-4 text-yellow-500 fill-yellow-500 mr-1" />
                <span>{minRating}</span>
              </div>
            </div>
          </div>
          
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-1 block">
              Distância máxima: {maxDistance} km
            </label>
            <Slider
              value={[maxDistance]}
              min={1}
              max={20}
              step={1}
              onValueChange={(values) => setMaxDistance(values[0])}
            />
          </div>
          
          <div className="mb-4">
            <label className="text-sm text-muted-foreground mb-1 block">
              Data específica
            </label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !selectedDate && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {selectedDate ? (
                    format(selectedDate, "PPP", { locale: ptBR })
                  ) : (
                    <span>Selecione uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  initialFocus
                  disabled={(date) => date < new Date()}
                  locale={ptBR}
                />
                {selectedDate && (
                  <div className="p-3 border-t border-border">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setSelectedDate(undefined)}
                      className="w-full"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Limpar seleção
                    </Button>
                  </div>
                )}
              </PopoverContent>
            </Popover>
          </div>
        </div>
      )}
      
      {/* Niches and categories */}
      <div className="p-4">
        <Tabs defaultValue="niches" className="mb-6">
          <TabsList className="w-full mb-3">
            <TabsTrigger value="niches" className="flex-1">Nichos</TabsTrigger>
            <TabsTrigger 
              value="categories" 
              className="flex-1"
              disabled={!selectedNicheId}
            >
              Categorias
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="niches" className="mt-0">
            <NichoSelector 
              niches={niches}
              isLoading={isNichesLoading}
              onNicheSelect={handleNicheSelect}
              selectedNicheId={selectedNicheId}
            />
          </TabsContent>
          
          <TabsContent value="categories" className="mt-0">
            {selectedNicheId && isCategoriesLoading ? (
              <div className="grid grid-cols-2 gap-3">
                {[...Array(6)].map((_, i) => (
                  <Skeleton key={i} className="h-20 rounded-lg" />
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {categories?.map((category) => (
                  <Card 
                    key={category.id}
                    className={`cursor-pointer border-2 ${
                      selectedCategoryId === category.id 
                        ? 'border-primary bg-primary/5' 
                        : 'border-gray-200'
                    }`}
                    onClick={() => handleCategorySelect(category.id)}
                  >
                    <CardContent className="flex flex-col items-center justify-center p-3 text-center h-full">
                      {category.icon && (
                        <div className="text-3xl mb-1">{category.icon}</div>
                      )}
                      <h3 className="font-medium text-sm">{category.name}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      
      {/* Exibição de prestadores disponíveis por categoria/nicho */}
      {(selectedNicheId || selectedCategoryId) && (
        <div className="px-4 mb-4">
          <h2 className="font-bold text-lg mb-3">
            Prestadores Disponíveis {selectedCategoryId 
              ? `na Categoria` 
              : selectedNicheId 
                ? `no Nicho` 
                : ""}
          </h2>
          
          {isLoadingServiceTemplates ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-24 rounded-lg" />
              ))}
            </div>
          ) : availableServiceTemplates.length > 0 ? (
            <div className="space-y-3">
              {availableServiceTemplates
                .slice(0, showFilteredTemplates ? availableServiceTemplates.length : 5)
                .map((template) => {
                const categoryInfo = allCategoriesWithNiche?.find(cat => cat.id === template.categoryId);
                
                return (
                  <Card key={template.id} className="p-3">
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="flex items-center text-xs text-neutral-500 mb-1">
                          <span className="flex items-center">
                            {categoryInfo?.nicheName || "Nicho"}
                            <CheckCircle className="h-3 w-3 mx-1 text-neutral-400" />
                            {categoryInfo?.name || "Categoria"}
                          </span>
                        </div>
                        <h5 className="font-medium">{template.name}</h5>
                      </div>
                      <Badge variant="outline" className="bg-primary/5 ml-2">
                        {template.duration} min
                      </Badge>
                    </div>
                    {template.description && (
                      <p className="text-sm text-neutral-600 mt-1">{template.description}</p>
                    )}
                  </Card>
                );
              })}
              
              {availableServiceTemplates.length > 5 && (
                <div className="text-center my-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => setShowFilteredTemplates(prevState => !prevState)}
                  >
                    {showFilteredTemplates 
                      ? "Mostrar menos" 
                      : `Ver mais serviços (${availableServiceTemplates.length - 5})`
                    }
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-neutral-500">Nenhum prestador disponível para esta seleção.</p>
          )}
        </div>
      )}
      
      {/* Search results */}
      <div className="px-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">
            {searchResults.length > 0 
              ? `Prestadores disponíveis (${searchResults.length})`
              : searchQuery || selectedNicheId || selectedCategoryId 
                ? "Nenhum prestador encontrado" 
                : "Selecione uma categoria ou faça uma busca"
            }
          </h2>
          {isSearching && (
            <div className="flex items-center text-primary text-sm">
              <span className="mr-2">Buscando</span>
              <div className="h-4 w-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            </div>
          )}
        </div>
        
        <div className="space-y-4">
          {searchResults.map((provider) => (
            <Card 
              key={provider.id} 
              className="overflow-hidden"
            >
              <div className="p-4" onClick={() => handleProviderSelect(provider.id)}>
                <div className="flex items-start">
                  <Avatar className="h-16 w-16 rounded-lg mr-3 flex-shrink-0">
                    <AvatarImage src={provider.profileImage || undefined} />
                    <AvatarFallback className="rounded-lg bg-primary/10 text-xl">
                      {provider.name?.charAt(0) || 'P'}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">
                      {provider.settings?.businessName || provider.name}
                    </h3>
                    
                    <div className="flex items-center text-sm mt-1">
                      {provider.settings?.rating ? (
                        <div className="flex items-center text-yellow-500 mr-2">
                          <Star className="h-4 w-4 fill-current" />
                          <span className="ml-1 text-neutral-800">
                            {(provider.settings.rating / 10).toFixed(1)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-neutral-500 mr-2">Sem avaliações</span>
                      )}
                      
                      {provider.distance && (
                        <div className="flex items-center text-neutral-500">
                          <MapPin className="h-3 w-3 mr-1" />
                          <span>{provider.distance.toFixed(1)} km</span>
                        </div>
                      )}
                    </div>
                    
                    {provider.settings?.address && (
                      <div className="text-sm text-neutral-500 mt-1 truncate">
                        <MapPin className="h-3 w-3 inline mr-1" />
                        {provider.settings.address}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="p-4">
                <h4 className="font-medium text-sm mb-2">Serviços Disponíveis</h4>
                <div className="space-y-3">
                  {provider.services?.slice(0, 3).map((service) => {
                    // Encontrar a categoria deste serviço com informações de nicho
                    const categoryWithNicheInfo = allCategoriesWithNiche?.find(cat => cat.id === service.categoryId);
                    // Fallback para categoria normal
                    const serviceCategory = categoryWithNicheInfo || categories?.find(cat => cat.id === service.categoryId);
                    
                    // Determinar nome do nicho
                    let nicheName = "Nicho";
                    if (categoryWithNicheInfo?.nicheName) {
                      nicheName = categoryWithNicheInfo.nicheName;
                    } else if (selectedNicheId) {
                      const selectedNiche = niches?.find(n => n.id === selectedNicheId);
                      if (selectedNiche) {
                        nicheName = selectedNiche.name;
                      }
                    }
                    
                    return (
                      <div 
                        key={service.id}
                        className="border-l-4 border border-l-primary/70 rounded-md p-3 hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => handleBookService(provider.id, service.id)}
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1">
                            <div className="flex items-center text-xs text-neutral-500 mb-1">
                              {/* Hierarquia: Nicho > Categoria > Serviço */}
                              <span className="flex items-center">
                                {nicheName}
                                <CheckCircle className="h-3 w-3 mx-1 text-neutral-400" />
                                {serviceCategory?.name || "Categoria"}
                              </span>
                            </div>
                            <h5 className="font-medium">{service.name}</h5>
                            <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
                              <div className="flex items-center text-neutral-500">
                                <Clock className="h-3 w-3 mr-1" />
                                <span>{service.duration || 30} min</span>
                              </div>
                              {selectedDate && (
                                <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px]">
                                  Disponível
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center justify-between mt-2">
                          <span className="font-medium">
                            {service.price !== null ? formatCurrency(service.price) : 'Sob consulta'}
                          </span>
                          <Button size="sm" variant="default">Agendar</Button>
                        </div>
                      </div>
                    );
                  })}
                  
                  {provider.services?.length > 3 && (
                    <Button 
                      variant="ghost" 
                      className="w-full text-sm mt-1"
                      onClick={() => handleProviderSelect(provider.id)}
                    >
                      Ver todos os serviços ({provider.services.length})
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}