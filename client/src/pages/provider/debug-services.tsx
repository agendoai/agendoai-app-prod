import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/hooks/use-auth';
import ProviderNavbar from '@/components/layout/provider-navbar';
import PageTransition from '@/components/ui/page-transition';

// Interface básica para serviços
interface ServiceData {
  id: number;
  name: string;
  [key: string]: any;
}

export default function DebugServicesPage() {
  const { user } = useAuth();
  const [selectedEndpoint, setSelectedEndpoint] = useState<string | null>(null);
  const [servicesData, setServicesData] = useState<ServiceData[]>([]);

  // Lista de endpoints para teste
  const endpoints = [
    `/api/services?providerId=${user?.id}`,
    `/api/provider-services/provider/${user?.id}`,
    `/api/services`
  ];

  // Função para buscar dados de serviço
  const fetchServices = async (endpoint: string) => {
    setSelectedEndpoint(endpoint);
    try {
      const response = await fetch(endpoint);
      const data = await response.json();
      console.log(`Dados do endpoint ${endpoint}:`, data);
      setServicesData(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(`Erro ao buscar ${endpoint}:`, error);
      setServicesData([]);
    }
  };

  // Realizar a busca para o endpoint selecionado
  useEffect(() => {
    if (selectedEndpoint) {
      fetchServices(selectedEndpoint);
    }
  }, [selectedEndpoint]);

  return (
    <PageTransition>
      <div className="flex flex-col min-h-screen">
        <ProviderNavbar />
        
        <div className="container py-6 flex-1">
          <h1 className="text-2xl font-bold mb-4">Diagnóstico de Serviços</h1>
          <p className="mb-4 text-muted-foreground">
            Esta página permite verificar quais serviços estão disponíveis através de diferentes endpoints da API.
          </p>
          
          <div className="flex flex-wrap gap-2 mb-6">
            {endpoints.map((endpoint) => (
              <Button 
                key={endpoint}
                variant={selectedEndpoint === endpoint ? "default" : "outline"}
                onClick={() => fetchServices(endpoint)}
              >
                {endpoint.split('/').pop()}
              </Button>
            ))}
          </div>
          
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Endpoint: {selectedEndpoint || "Nenhum selecionado"}</CardTitle>
              <CardDescription>
                {servicesData.length} serviços encontrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {servicesData.length > 0 ? (
                <div className="border rounded-md">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted/50">
                        <th className="p-2 text-left">ID</th>
                        <th className="p-2 text-left">Nome</th>
                        <th className="p-2 text-left">Tipo</th>
                        <th className="p-2 text-left">Detalhes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {servicesData.map((service) => (
                        <tr key={service.id} className="border-b">
                          <td className="p-2">{service.id}</td>
                          <td className="p-2">{service.name || service.serviceName}</td>
                          <td className="p-2">
                            {service.serviceId ? 'Provider Service' : 'Regular Service'}
                          </td>
                          <td className="p-2">
                            <pre className="text-xs overflow-auto max-h-40 p-1 bg-muted rounded-sm">
                              {JSON.stringify(service, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-6">
                  {selectedEndpoint ? (
                    <p>Nenhum serviço encontrado para este endpoint</p>
                  ) : (
                    <p>Selecione um endpoint para ver os serviços</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageTransition>
  );
}