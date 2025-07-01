import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { Icon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';

// Defina tipos para os prestadores com localização
interface ProviderLocation {
  id: number;
  name: string;
  latitude: string; 
  longitude: string;
  isOnline: boolean;
  businessName?: string;
  rating?: number;
  serviceCount?: number;
  availability?: number; // 0-100% disponibilidade
}

// Componente de recentralização do mapa
function RecenterMap({ center }: { center: [number, number] }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center);
  }, [center, map]);
  return null;
}

const ServiceAvailabilityHeatmap = ({
  serviceId,
  initialCenter = [-23.5558, -46.6396], // São Paulo como default
  initialZoom = 12,
}: {
  serviceId?: number;
  initialCenter?: [number, number];
  initialZoom?: number;
}) => {
  const [center, setCenter] = useState<[number, number]>(initialCenter);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<ProviderLocation | null>(null);
  
  // Buscar prestadores disponíveis que oferecem o serviço selecionado
  const { data: providers = [], isLoading } = useQuery<ProviderLocation[]>({
    queryKey: ['/api/providers/locations', serviceId],
    queryFn: async () => {
      // URL com ou sem filtro de serviço
      const url = serviceId 
        ? `/api/providers/locations?serviceId=${serviceId}` 
        : '/api/providers/locations';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao buscar localizações dos prestadores');
      }
      return response.json();
    },
    enabled: true,
  });

  // Obter localização do usuário
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation([latitude, longitude]);
          setCenter([latitude, longitude]);
        },
        (error) => {
          console.error('Erro ao obter localização:', error);
        }
      );
    }
  }, []);

  // Ícones padrão do Leaflet para prestadores e usuários
  const providerIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Ícone personalizado para usuário
  const userIcon = new Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  // Função para calcular estilo do círculo de disponibilidade
  const getCircleStyle = (provider: ProviderLocation) => {
    // Define cor baseada na disponibilidade (verde = alta, vermelho = baixa)
    const availability = provider.availability || 0;
    // Cores em gradiente de vermelho (baixa disponibilidade) para verde (alta disponibilidade)
    if (availability >= 75) {
      return { fillColor: '#4CAF50', color: '#4CAF50', fillOpacity: 0.3 }; // Verde
    } else if (availability >= 50) {
      return { fillColor: '#8BC34A', color: '#8BC34A', fillOpacity: 0.3 }; // Verde-amarelo
    } else if (availability >= 25) {
      return { fillColor: '#FFC107', color: '#FFC107', fillOpacity: 0.3 }; // Amarelo
    } else {
      return { fillColor: '#F44336', color: '#F44336', fillOpacity: 0.2 }; // Vermelho
    }
  };

  if (isLoading) {
    return <div className="h-full flex items-center justify-center">Carregando mapa de disponibilidade...</div>;
  }

  return (
    <Card className="w-full">
      <CardContent className="p-0">
        <div className="h-[500px] w-full relative">
          <MapContainer 
            center={center} 
            zoom={initialZoom} 
            style={{ height: '100%', width: '100%' }}
            zoomControl={false}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Recentralizar mapa quando a localização do usuário muda */}
            <RecenterMap center={center} />
            
            {/* Marcador do usuário */}
            {userLocation && (
              <Marker position={userLocation} icon={userIcon}>
                <Popup>
                  Sua localização
                </Popup>
              </Marker>
            )}
            
            {/* Marcadores e círculos de prestadores */}
            {providers.map((provider) => {
              // Converta latitude e longitude para números
              const lat = parseFloat(provider.latitude);
              const lng = parseFloat(provider.longitude);
              
              // Pule prestadores sem coordenadas válidas
              if (isNaN(lat) || isNaN(lng)) return null;
              
              // Raio do círculo baseado na disponibilidade
              const radius = 500 + (provider.availability || 0) * 10;
              
              return (
                <React.Fragment key={provider.id}>
                  {/* Círculo de alcance/disponibilidade */}
                  <Circle 
                    center={[lat, lng]} 
                    radius={radius}
                    {...getCircleStyle(provider)}
                    eventHandlers={{
                      click: () => setSelectedProvider(provider)
                    }}
                  />
                  
                  {/* Marcador do prestador */}
                  <Marker 
                    position={[lat, lng]} 
                    icon={providerIcon}
                    eventHandlers={{
                      click: () => setSelectedProvider(provider)
                    }}
                  >
                    <Popup>
                      <div className="text-center">
                        <h3 className="font-bold text-sm">{provider.businessName || provider.name}</h3>
                        <p className="text-xs">
                          {provider.isOnline ? 
                            <span className="text-green-500">● Online</span> : 
                            <span className="text-gray-500">● Offline</span>}
                        </p>
                        {provider.serviceCount && (
                          <p className="text-xs mt-1">
                            {provider.serviceCount} serviços disponíveis
                          </p>
                        )}
                        {provider.rating && (
                          <p className="text-xs">
                            {(provider.rating / 10).toFixed(1)} ★
                          </p>
                        )}
                      </div>
                    </Popup>
                  </Marker>
                </React.Fragment>
              );
            })}
          </MapContainer>
          
          {/* Painel lateral com detalhes do prestador selecionado */}
          {selectedProvider && (
            <div className="absolute top-3 right-3 w-64 bg-white rounded-md shadow-lg p-3 border z-[1000]">
              <div className="flex justify-between items-start">
                <h3 className="font-bold">{selectedProvider.businessName || selectedProvider.name}</h3>
                <button 
                  className="text-xs text-gray-400" 
                  onClick={() => setSelectedProvider(null)}
                >
                  ✕
                </button>
              </div>
              <p className="text-sm mt-1">
                {selectedProvider.isOnline ? 
                  <span className="text-green-500">● Online</span> : 
                  <span className="text-gray-500">● Offline</span>}
              </p>
              {selectedProvider.rating && (
                <p className="text-sm">
                  Avaliação: {(selectedProvider.rating / 10).toFixed(1)} ★
                </p>
              )}
              {selectedProvider.serviceCount && (
                <p className="text-sm">
                  {selectedProvider.serviceCount} serviços
                </p>
              )}
              {selectedProvider.availability !== undefined && (
                <p className="text-sm">
                  Disponibilidade: {selectedProvider.availability}%
                </p>
              )}
              <div className="flex justify-center mt-3">
                <Button size="sm" className="w-full" onClick={() => {
                  window.location.href = `/provider/${selectedProvider.id}`;
                }}>
                  Ver Perfil
                </Button>
              </div>
            </div>
          )}
          
          {/* Botão para centralizar no usuário */}
          {userLocation && (
            <button 
              className="absolute bottom-4 right-4 p-2 bg-white rounded-full shadow-md z-[1000]"
              onClick={() => setCenter(userLocation)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-navigation">
                <polygon points="3 11 22 2 13 21 11 13 3 11" />
              </svg>
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ServiceAvailabilityHeatmap;