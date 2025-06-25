import { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import ClientLayout from '@/components/layout/client-layout';
import ProviderMap from '@/components/maps/provider-map';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ProviderMapPage() {
  // Carregar script do Leaflet no cabeçalho
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
    script.crossOrigin = '';
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <ClientLayout>
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Mapa de Prestadores</CardTitle>
            <CardDescription>
              Encontre prestadores de serviços próximos da sua localização
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProviderMap />
          </CardContent>
        </Card>
      </div>
    </ClientLayout>
  );
}