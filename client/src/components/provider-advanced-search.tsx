import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import { Star, MapPin, Search } from 'lucide-react';

export default function ProviderAdvancedSearch() {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [useGeolocation, setUseGeolocation] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [niches, setNiches] = useState([]);
  const [categories, setCategories] = useState([]);
  const [services, setServices] = useState([]);
  const [selectedNiche, setSelectedNiche] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [minRating, setMinRating] = useState('');
  const [maxDistance, setMaxDistance] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState([]);
  const [error, setError] = useState('');

  // Fetch niches on mount
  useEffect(() => {
    fetch('/api/niches')
      .then(res => res.json())
      .then(data => setNiches(data || []));
  }, []);

  // Fetch categories when niche changes
  useEffect(() => {
    if (selectedNiche) {
      fetch(`/api/niches/${selectedNiche}/categories`)
        .then(res => res.json())
        .then(data => setCategories(data || []));
    } else {
      setCategories([]);
    }
    setSelectedCategory('');
    setSelectedService('');
  }, [selectedNiche]);

  // Fetch services when category changes
  useEffect(() => {
    if (selectedCategory) {
      fetch(`/api/services?categoryId=${selectedCategory}`)
        .then(res => res.json())
        .then(data => setServices(data || []));
    } else {
      setServices([]);
    }
    setSelectedService('');
  }, [selectedCategory]);

  // Geolocation
  const handleUseGeolocation = () => {
    if (!navigator.geolocation) {
      setError('Geolocalização não suportada.');
      return;
    }
    setError('');
    setUseGeolocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setUseGeolocation(false);
      },
      () => {
        setError('Não foi possível obter sua localização.');
        setUseGeolocation(false);
      }
    );
  };

  // Buscar prestadores
  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResults([]);
    const params = new URLSearchParams();
    if (name) params.append('q', name);
    if (selectedNiche) params.append('nicheId', selectedNiche);
    if (selectedCategory) params.append('categoryId', selectedCategory);
    if (selectedService) params.append('serviceId', selectedService);
    if (minRating) params.append('minRating', minRating);
    if (maxDistance) params.append('maxDistance', maxDistance);
    if (location) {
      params.append('lat', String(location.lat));
      params.append('lng', String(location.lng));
    }
    try {
      const res = await fetch(`/api/providers/optimized/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.providers || []);
      if (!data.providers || data.providers.length === 0) setError('Nenhum prestador encontrado.');
    } catch (err) {
      setError('Erro ao buscar prestadores.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <form onSubmit={handleSearch} className="bg-white rounded-xl shadow p-4 flex flex-col gap-4 mb-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          <Input placeholder="Nome do prestador" value={name} onChange={e => setName(e.target.value)} />
          <Input placeholder="Endereço ou região" value={address} onChange={e => setAddress(e.target.value)} />
          <Button type="button" variant="outline" onClick={handleUseGeolocation} disabled={useGeolocation}>
            <MapPin className="w-4 h-4 mr-1" /> Usar minha localização
          </Button>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          <select className="border rounded px-2 py-1" value={selectedNiche} onChange={e => setSelectedNiche(e.target.value)}>
            <option value="">Nicho</option>
            {niches.map((n: any) => <option key={n.id} value={n.id}>{n.name}</option>)}
          </select>
          <select className="border rounded px-2 py-1" value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} disabled={!selectedNiche}>
            <option value="">Categoria</option>
            {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="border rounded px-2 py-1" value={selectedService} onChange={e => setSelectedService(e.target.value)} disabled={!selectedCategory}>
            <option value="">Serviço</option>
            {services.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-4">
          <Input placeholder="Avaliação mínima" type="number" min="0" max="5" value={minRating} onChange={e => setMinRating(e.target.value)} />
          <Input placeholder="Distância máxima (km)" type="number" min="1" value={maxDistance} onChange={e => setMaxDistance(e.target.value)} />
          <Button type="submit" className="flex items-center gap-2" disabled={loading}>
            <Search className="w-4 h-4" /> Buscar
          </Button>
        </div>
      </form>
      {loading && <div className="flex justify-center py-8"><LoadingSpinner /></div>}
      {error && <div className="text-center text-red-500 mb-4">{error}</div>}
      <div className="grid gap-4">
        {results.map((provider: any) => (
          <Card key={provider.id} className="p-4 flex flex-col sm:flex-row gap-4 items-center shadow-md hover:shadow-xl transition-shadow">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-2xl">
              {provider.name?.charAt(0) || '?'}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg text-primary">{provider.name}</span>
                {provider.settings?.rating && (
                  <span className="flex items-center gap-1 text-amber-500 font-semibold"><Star size={16} /> {provider.settings.rating}</span>
                )}
                {provider.distance && (
                  <Badge className="ml-2 bg-primary/10 text-primary">{provider.distance} km</Badge>
                )}
              </div>
              <div className="text-sm text-neutral-600">{provider.settings?.businessName}</div>
              <div className="flex gap-2 mt-1 flex-wrap">
                {provider.services?.map((s: any) => (
                  <Badge key={s.serviceId} className="bg-primary/10 text-primary">{s.serviceName || s.name}</Badge>
                ))}
              </div>
            </div>
            <Button className="bg-primary text-white mt-2 sm:mt-0" onClick={() => window.location.href = `/providers/${provider.id}`}>Ver perfil</Button>
          </Card>
        ))}
      </div>
    </div>
  );
} 