import React, { useState, useEffect } from 'react';
import { Search, Filter, MapPin, Star, Clock, Users, Phone, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ProviderLayout from '@/components/layout/provider-layout';
import AppHeader from '@/components/layout/app-header';
import { apiCall } from '@/lib/api';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  provider: {
    id: string;
    name: string;
    businessName: string;
    profileImage?: string;
    rating: number;
    reviewCount: number;
    location: string;
    phone?: string;
    email?: string;
    isOnline: boolean;
  };
}

interface SearchFilters {
  category: string;
  priceRange: string;
  location: string;
  rating: string;
  availability: string;
}

const ProviderSearchPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState<Service[]>([]);
  const [filteredServices, setFilteredServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    category: '',
    priceRange: '',
    location: '',
    rating: '',
    availability: ''
  });
  const [activeTab, setActiveTab] = useState('services');

  // Dados mock para demonstração
  const getMockServices = (): Service[] => [
    {
      id: '1',
      name: 'Corte Masculino',
      description: 'Corte moderno e estiloso para homens',
      price: 35,
      duration: 30,
      category: 'Barbearia',
      provider: {
        id: '1',
        name: 'João Silva',
        businessName: 'Barbearia do João',
        profileImage: undefined,
        rating: 4.8,
        reviewCount: 127,
        location: 'Centro, São Paulo',
        phone: '(11) 99999-9999',
        email: 'joao@barbearia.com',
        isOnline: true
      }
    },
    {
      id: '2',
      name: 'Barba e Bigode',
      description: 'Aparar e modelar barba e bigode',
      price: 25,
      duration: 20,
      category: 'Barbearia',
      provider: {
        id: '1',
        name: 'João Silva',
        businessName: 'Barbearia do João',
        profileImage: undefined,
        rating: 4.8,
        reviewCount: 127,
        location: 'Centro, São Paulo',
        phone: '(11) 99999-9999',
        email: 'joao@barbearia.com',
        isOnline: true
      }
    },
    {
      id: '3',
      name: 'Manicure Completa',
      description: 'Manicure com esmaltação e cuidados especiais',
      price: 45,
      duration: 60,
      category: 'Manicure/Pedicure',
      provider: {
        id: '2',
        name: 'Maria Santos',
        businessName: 'Salão da Maria',
        profileImage: undefined,
        rating: 4.6,
        reviewCount: 89,
        location: 'Vila Madalena, São Paulo',
        phone: '(11) 88888-8888',
        email: 'maria@salao.com',
        isOnline: false
      }
    },
    {
      id: '4',
      name: 'Pedicure',
      description: 'Pedicure completa com esmaltação',
      price: 40,
      duration: 45,
      category: 'Manicure/Pedicure',
      provider: {
        id: '2',
        name: 'Maria Santos',
        businessName: 'Salão da Maria',
        profileImage: undefined,
        rating: 4.6,
        reviewCount: 89,
        location: 'Vila Madalena, São Paulo',
        phone: '(11) 88888-8888',
        email: 'maria@salao.com',
        isOnline: false
      }
    },
    {
      id: '5',
      name: 'Massagem Relaxante',
      description: 'Massagem terapêutica para relaxamento',
      price: 120,
      duration: 90,
      category: 'Massagem',
      provider: {
        id: '3',
        name: 'Carlos Oliveira',
        businessName: 'Spa do Carlos',
        profileImage: undefined,
        rating: 4.9,
        reviewCount: 203,
        location: 'Jardins, São Paulo',
        phone: '(11) 77777-7777',
        email: 'carlos@spa.com',
        isOnline: true
      }
    },
    {
      id: '6',
      name: 'Massagem Terapêutica',
      description: 'Massagem para alívio de dores musculares',
      price: 150,
      duration: 120,
      category: 'Massagem',
      provider: {
        id: '3',
        name: 'Carlos Oliveira',
        businessName: 'Spa do Carlos',
        profileImage: undefined,
        rating: 4.9,
        reviewCount: 203,
        location: 'Jardins, São Paulo',
        phone: '(11) 77777-7777',
        email: 'carlos@spa.com',
        isOnline: true
      }
    },
    {
      id: '7',
      name: 'Corte Feminino',
      description: 'Corte moderno para mulheres',
      price: 60,
      duration: 45,
      category: 'Salão de Beleza',
      provider: {
        id: '4',
        name: 'Ana Costa',
        businessName: 'Salão da Ana',
        profileImage: undefined,
        rating: 4.7,
        reviewCount: 156,
        location: 'Moema, São Paulo',
        phone: '(11) 66666-6666',
        email: 'ana@salao.com',
        isOnline: true
      }
    },
    {
      id: '8',
      name: 'Coloração',
      description: 'Coloração completa com produtos de qualidade',
      price: 180,
      duration: 120,
      category: 'Salão de Beleza',
      provider: {
        id: '4',
        name: 'Ana Costa',
        businessName: 'Salão da Ana',
        profileImage: undefined,
        rating: 4.7,
        reviewCount: 156,
        location: 'Moema, São Paulo',
        phone: '(11) 66666-6666',
        email: 'ana@salao.com',
        isOnline: true
      }
    }
  ];

  // Categorias de serviços
  const categories = [
    'Barbearia',
    'Salão de Beleza',
    'Estética',
    'Massagem',
    'Manicure/Pedicure',
    'Depilação',
    'Maquiagem',
    'Outros'
  ];

  // Buscar serviços
  const searchServices = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      // Construir parâmetros de query
      const params = new URLSearchParams();
      params.append('q', searchQuery);
      
      if (filters.category) {
        params.append('categoryId', filters.category);
      }

      const response = await apiCall(`/api/services/search?${params.toString()}`, {
        method: 'GET'
      });

      
      
      // A API retorna diretamente um array de serviços
      if (Array.isArray(response) && response.length > 0) {
        setServices(response);
        setFilteredServices(response);
      } else if (response && response.success && Array.isArray(response.data) && response.data.length > 0) {
        // Fallback caso a API mude o formato
        setServices(response.data);
        setFilteredServices(response.data);
      } else {
        
        setServices([]);
        setFilteredServices([]);
      }
    } catch (error) {
      
      setServices([]);
      setFilteredServices([]);
    } finally {
      setLoading(false);
    }
  };

  // Aplicar filtros
  const applyFilters = () => {
    let filtered = [...services];

    if (filters.category && filters.category.trim() !== '') {
      filtered = filtered.filter(service => 
        service.category.toLowerCase().includes(filters.category.toLowerCase())
      );
    }

    if (filters.priceRange && filters.priceRange.trim() !== '') {
      const [min, max] = filters.priceRange.split('-').map(Number);
      filtered = filtered.filter(service => {
        if (max) {
          return service.price >= min && service.price <= max;
        }
        return service.price >= min;
      });
    }

    if (filters.location && filters.location.trim() !== '') {
      filtered = filtered.filter(service =>
        service.provider.location.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    if (filters.rating && filters.rating.trim() !== '') {
      const minRating = Number(filters.rating);
      filtered = filtered.filter(service => service.provider.rating >= minRating);
    }

    if (filters.availability === 'online') {
      filtered = filtered.filter(service => service.provider.isOnline);
    }

    setFilteredServices(filtered);
  };

  useEffect(() => {
    applyFilters();
  }, [filters, services]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchServices();
  };

  const clearFilters = () => {
    setFilters({
      category: '',
      priceRange: '',
      location: '',
      rating: '',
      availability: ''
    });
  };

  return (
    <ProviderLayout>
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
        <AppHeader title="Buscar Serviços" showBackButton />
        
        <div className="p-4 md:p-6 lg:p-8 space-y-6 md:space-y-8 lg:space-y-10 w-full">
          {/* Barra de Pesquisa */}
          <Card className="border border-neutral-200 md:shadow-lg">
            <CardHeader className="pb-4 md:pb-6">
              <CardTitle className="text-lg md:text-xl flex items-center">
                <Search className="h-5 w-5 mr-2 text-primary" />
                Buscar Serviços
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="Digite o nome do serviço ou prestador..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="flex-1 text-sm md:text-base bg-white border-gray-300"
                  />
                  <Button 
                    type="submit" 
                    disabled={loading || !searchQuery.trim()}
                    className="text-sm md:text-base"
                  >
                    {loading ? 'Buscando...' : 'Buscar'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Filtros */}
          <Card className="border border-neutral-200 md:shadow-lg">
            <CardHeader className="pb-4 md:pb-6">
              <CardTitle className="text-lg md:text-xl flex items-center">
                <Filter className="h-5 w-5 mr-2 text-primary" />
                Filtros
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-2 block">
                    Categoria
                  </label>
                  <Select value={filters.category} onValueChange={(value) => setFilters({...filters, category: value})}>
                    <SelectTrigger className="text-sm md:text-base bg-white border-gray-300">
                      <SelectValue placeholder="Todas as categorias" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      {categories.map(category => (
                        <SelectItem key={category} value={category} className="bg-white hover:bg-gray-50">{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-2 block">
                    Faixa de Preço
                  </label>
                  <Select value={filters.priceRange} onValueChange={(value) => setFilters({...filters, priceRange: value})}>
                    <SelectTrigger className="text-sm md:text-base bg-white border-gray-300">
                      <SelectValue placeholder="Qualquer preço" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="0-50" className="bg-white hover:bg-gray-50">Até R$ 50</SelectItem>
                      <SelectItem value="50-100" className="bg-white hover:bg-gray-50">R$ 50 - R$ 100</SelectItem>
                      <SelectItem value="100-200" className="bg-white hover:bg-gray-50">R$ 100 - R$ 200</SelectItem>
                      <SelectItem value="200-500" className="bg-white hover:bg-gray-50">R$ 200 - R$ 500</SelectItem>
                      <SelectItem value="500" className="bg-white hover:bg-gray-50">Acima de R$ 500</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-2 block">
                    Localização
                  </label>
                  <Input
                    placeholder="Cidade, bairro..."
                    value={filters.location}
                    onChange={(e) => setFilters({...filters, location: e.target.value})}
                    className="text-sm md:text-base bg-white border-gray-300"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-2 block">
                    Avaliação Mínima
                  </label>
                  <Select value={filters.rating} onValueChange={(value) => setFilters({...filters, rating: value})}>
                    <SelectTrigger className="text-sm md:text-base bg-white border-gray-300">
                      <SelectValue placeholder="Qualquer avaliação" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="4" className="bg-white hover:bg-gray-50">4+ estrelas</SelectItem>
                      <SelectItem value="3" className="bg-white hover:bg-gray-50">3+ estrelas</SelectItem>
                      <SelectItem value="2" className="bg-white hover:bg-gray-50">2+ estrelas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium text-neutral-700 mb-2 block">
                    Disponibilidade
                  </label>
                  <Select value={filters.availability} onValueChange={(value) => setFilters({...filters, availability: value})}>
                    <SelectTrigger className="text-sm md:text-base bg-white border-gray-300">
                      <SelectValue placeholder="Qualquer horário" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-gray-300">
                      <SelectItem value="online" className="bg-white hover:bg-gray-50">Online agora</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-end">
                  <Button 
                    variant="outline" 
                    onClick={clearFilters}
                    className="text-sm md:text-base w-full"
                  >
                    Limpar Filtros
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Resultados */}
          {filteredServices.length > 0 && (
            <Card className="border border-neutral-200 md:shadow-lg">
              <CardHeader className="pb-4 md:pb-6">
                <CardTitle className="text-lg md:text-xl">
                  Resultados ({filteredServices.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 md:space-y-6">
                  {filteredServices.map((service) => (
                    <Card key={service.id} className="border border-neutral-200 hover:shadow-md transition-shadow">
                      <CardContent className="p-4 md:p-6">
                        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
                          {/* Imagem do Prestador */}
                          <div className="flex-shrink-0">
                            <div className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 rounded-full bg-neutral-100 overflow-hidden border-2 border-white shadow-lg">
                              {service.provider.profileImage ? (
                                <img
                                  src={service.provider.profileImage}
                                  alt={service.provider.name}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#3EB9AA] to-[#2A9D8F] text-white text-xl md:text-2xl font-bold">
                                  {service.provider.name.charAt(0)}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Informações do Serviço */}
                          <div className="flex-1 space-y-3">
                            <div>
                              <h3 className="text-lg md:text-xl font-semibold text-neutral-900">
                                {service.name}
                              </h3>
                              <p className="text-sm md:text-base text-neutral-600 mt-1">
                                {service.description}
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="text-xs md:text-sm">
                                {service.category}
                              </Badge>
                              <Badge variant="outline" className="text-xs md:text-sm">
                                {service.duration} min
                              </Badge>
                              <Badge variant="default" className="text-xs md:text-sm">
                                R$ {service.price.toFixed(2)}
                              </Badge>
                            </div>

                            {/* Informações do Prestador */}
                            <div className="space-y-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm md:text-base">
                                  {service.provider.businessName || service.provider.name}
                                </h4>
                                {service.provider.isOnline && (
                                  <Badge variant="default" className="text-xs bg-green-500">
                                    Online
                                  </Badge>
                                )}
                              </div>

                              <div className="flex items-center gap-4 text-sm text-neutral-600">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span>{service.provider.rating.toFixed(1)}</span>
                                  <span>({service.provider.reviewCount})</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  <span>{service.provider.location}</span>
                                </div>
                              </div>

                              {(service.provider.phone || service.provider.email) && (
                                <div className="flex items-center gap-4 text-sm text-neutral-600">
                                  {service.provider.phone && (
                                    <div className="flex items-center gap-1">
                                      <Phone className="h-4 w-4" />
                                      <span>{service.provider.phone}</span>
                                    </div>
                                  )}
                                  {service.provider.email && (
                                    <div className="flex items-center gap-1">
                                      <Mail className="h-4 w-4" />
                                      <span>{service.provider.email}</span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Ações */}
                          <div className="flex flex-col gap-2">
                            <Button 
                              className="text-sm md:text-base"
                              onClick={() => {
                                // Navegar para página de agendamento
                                window.location.href = `/client/book/${service.id}`;
                              }}
                            >
                              Agendar
                            </Button>
                            <Button 
                              variant="outline" 
                              className="text-sm md:text-base"
                              onClick={() => {
                                // Ver detalhes do prestador
                                window.location.href = `/client/provider/${service.provider.id}`;
                              }}
                            >
                              Ver Perfil
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mensagem quando não há resultados */}
          {searchQuery && filteredServices.length === 0 && !loading && (
            <Card className="border border-neutral-200 md:shadow-lg">
              <CardContent className="p-8 text-center">
                <Search className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  Nenhum serviço encontrado
                </h3>
                <p className="text-neutral-600">
                  Tente ajustar os filtros ou usar termos de busca diferentes.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Mensagem inicial */}
          {!searchQuery && (
            <Card className="border border-neutral-200 md:shadow-lg">
              <CardContent className="p-8 text-center">
                <Search className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-neutral-900 mb-2">
                  Busque por serviços
                </h3>
                <p className="text-neutral-600">
                  Digite o nome do serviço ou prestador que você está procurando.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </ProviderLayout>
  );
};

export default ProviderSearchPage;
