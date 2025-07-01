import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet';
import { Icon, LatLngExpression } from 'leaflet';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { MapPin, Search, UserCheck, Star } from "lucide-react";
import { User, ProviderSettings } from '@shared/schema.ts';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'wouter';

// Tipo para prestadores com configurações
type ProviderWithSettings = User & { 
  settings: ProviderSettings | undefined; 
  distance?: number 
};

// Tipo para prestadores com distância
type ProviderWithDistance = ProviderWithSettings & { 
  distance: number 
};

// Componente de marcador personalizado
const markerIcon = new Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Componente para ajustar o centro do mapa
function SetViewOnClick({ coords }: { coords: LatLngExpression }) {
  const map = useMap();
  map.setView(coords, map.getZoom());
  return null;
}

export default function ProviderMap() {
  const { toast } = useToast();
  const [position, setPosition] = useState<LatLngExpression>([-23.5505, -46.6333]); // São Paulo por padrão
  const [radius, setRadius] = useState(10); // Raio de busca em km
  const [searchAddress, setSearchAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const mapRef = useRef(null);
  
  // Estado para armazenar o resultado da busca de prestadores
  const [providers, setProviders] = useState<ProviderWithDistance[]>([]);
  
  // Buscar localização do usuário
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setPosition([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          console.error("Erro ao obter localização:", error);
          toast({
            title: "Erro de localização",
            description: "Não foi possível obter sua localização atual. Usando localização padrão.",
            variant: "destructive"
          });
        }
      );
    }
  }, [toast]);
  
  // Buscar prestadores por localização
  const searchProviders = async () => {
    if (!position) return;
    
    setLoading(true);
    const [lat, lng] = Array.isArray(position) ? position : [position.lat, position.lng];
    
    try {
      const response = await fetch(
        `/api/providers?latitude=${lat}&longitude=${lng}&radius=${radius}`
      );
      
      if (!response.ok) {
        throw new Error('Falha ao buscar prestadores');
      }
      
      const data = await response.json();
      setProviders(data.providers || []);
      
      toast({
        title: "Prestadores encontrados",
        description: `${data.count || 0} prestadores encontrados num raio de ${radius}km`,
      });
    } catch (error) {
      console.error('Erro ao buscar prestadores:', error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar prestadores próximos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Geocodificar endereço para coordenadas
  const searchByAddress = async () => {
    if (!searchAddress.trim()) {
      toast({
        title: "Endereço vazio",
        description: "Digite um endereço para buscar",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      // Usando o serviço de geocoding do OpenStreetMap
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchAddress)}`
      );
      
      if (!response.ok) {
        throw new Error('Falha ao geocodificar endereço');
      }
      
      const data = await response.json();
      
      if (data && data.length > 0) {
        const location = data[0];
        setPosition([parseFloat(location.lat), parseFloat(location.lon)]);
        
        // Após atualizar a posição, buscar prestadores na área
        setTimeout(() => {
          searchProviders();
        }, 500);
      } else {
        toast({
          title: "Endereço não encontrado",
          description: "Não foi possível encontrar o endereço especificado",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao buscar endereço:', error);
      toast({
        title: "Erro",
        description: "Não foi possível buscar o endereço",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };
  
  // Quando o componente é montado ou a posição/raio mudam, buscar prestadores
  useEffect(() => {
    if (position) {
      searchProviders();
    }
  }, []);
  
  return (
    <div className="flex flex-col md:flex-row gap-4 w-full h-full">
      <div className="w-full md:w-3/4 h-[60vh] md:h-[80vh] relative">
        {/* Mapa */}
        <MapContainer 
          center={position} 
          zoom={13} 
          style={{ height: "100%", width: "100%" }}
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          
          {/* Marcador da posição atual */}
          <Marker position={position} icon={markerIcon}>
            <Popup>
              Você está aqui
            </Popup>
          </Marker>
          
          {/* Círculo de busca */}
          <Circle 
            center={position} 
            radius={radius * 1000} // Converter km para metros
            pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
          />
          
          {/* Marcadores dos prestadores */}
          {providers.map((provider) => {
            // Verificar se o prestador tem configurações de localização
            if (provider.settings && provider.settings.latitude && provider.settings.longitude) {
              const providerPosition: LatLngExpression = [
                provider.settings.latitude, 
                provider.settings.longitude
              ];
              
              return (
                <Marker 
                  key={provider.id} 
                  position={providerPosition} 
                  icon={markerIcon}
                >
                  <Popup>
                    <div className="text-center">
                      <h3 className="font-bold">{provider.name}</h3>
                      {provider.settings.businessName && (
                        <p className="text-sm">{provider.settings.businessName}</p>
                      )}
                      <p className="text-xs mt-1">
                        <Badge variant="outline" className="ml-1">
                          {provider.distance?.toFixed(1)}km
                        </Badge>
                      </p>
                      <div className="mt-2">
                        <Link href={`/providers/${provider.id}`}>
                          <Button size="sm" variant="default">Ver perfil</Button>
                        </Link>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            }
            return null;
          })}
          
          {/* Atualizar a visualização quando a posição mudar */}
          <SetViewOnClick coords={position} />
        </MapContainer>
      </div>
      
      <div className="w-full md:w-1/4 space-y-4">
        {/* Painel de controle */}
        <Card>
          <CardHeader>
            <CardTitle>Busca de Prestadores</CardTitle>
            <CardDescription>
              Encontre prestadores de serviços próximos a você
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Endereço</label>
              <div className="flex gap-2">
                <Input 
                  placeholder="Digite um endereço..."
                  value={searchAddress}
                  onChange={(e) => setSearchAddress(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && searchByAddress()}
                />
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={searchByAddress}
                  disabled={loading}
                >
                  <Search size={18} />
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Raio de busca: {radius} km</label>
              </div>
              <Slider
                min={1}
                max={50}
                step={1}
                value={[radius]}
                onValueChange={(value) => setRadius(value[0])}
              />
            </div>
            
            <Button 
              className="w-full" 
              onClick={searchProviders}
              disabled={loading}
            >
              {loading ? "Buscando..." : "Buscar Prestadores"}
            </Button>
          </CardContent>
        </Card>
        
        {/* Lista de prestadores encontrados */}
        <Card>
          <CardHeader>
            <CardTitle>Prestadores Encontrados</CardTitle>
            <CardDescription>
              {providers.length} prestadores num raio de {radius}km
            </CardDescription>
          </CardHeader>
          <CardContent className="max-h-[40vh] overflow-y-auto">
            {providers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                Nenhum prestador encontrado nesta área
              </div>
            ) : (
              <div className="space-y-3">
                {providers.map((provider) => (
                  <Card key={provider.id} className="p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-medium">{provider.name}</h3>
                        {provider.settings?.businessName && (
                          <p className="text-sm text-muted-foreground">{provider.settings.businessName}</p>
                        )}
                        <div className="flex items-center mt-1 gap-1">
                          <MapPin size={14} className="text-muted-foreground" />
                          <span className="text-xs">{provider.distance?.toFixed(1)}km</span>
                          
                          {provider.settings?.isOnline && (
                            <Badge variant="outline" className="ml-1">
                              <UserCheck size={12} className="mr-1 text-green-500" />
                              Online
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Link href={`/providers/${provider.id}`}>
                        <Button variant="ghost" size="sm">Ver</Button>
                      </Link>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}