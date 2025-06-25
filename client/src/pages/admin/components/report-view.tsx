import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Loader2, BarChart, Users, Calendar } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Tipos para os relatórios
interface ProviderReport {
  providers: {
    id: number;
    name: string;
    email: string;
    totalAppointments: number;
    rating: number | null;
    isOnline: boolean;
  }[];
}

interface ServiceReport {
  categories: {
    id: number;
    name: string;
    serviceCount: number;
    services: {
      id: number;
      name: string;
      appointmentCount: number;
      providerCount: number;
    }[];
  }[];
}

export default function ReportView() {
  const { toast } = useToast();
  const [activeReportTab, setActiveReportTab] = useState("providers");

  // Relatório de prestadores
  const { data: providerReport, isLoading: providerReportLoading } = useQuery({
    queryKey: ['/api/admin/reports/providers'],
    queryFn: async () => {
      const response = await fetch('/api/admin/reports/providers');
      if (!response.ok) {
        throw new Error('Falha ao carregar relatório de prestadores');
      }
      return response.json() as Promise<ProviderReport>;
    }
  });

  // Relatório de serviços
  const { data: serviceReport, isLoading: serviceReportLoading } = useQuery({
    queryKey: ['/api/admin/reports/services'],
    queryFn: async () => {
      const response = await fetch('/api/admin/reports/services');
      if (!response.ok) {
        throw new Error('Falha ao carregar relatório de serviços');
      }
      return response.json() as Promise<ServiceReport>;
    }
  });

  const renderRatingStars = (rating: number | null) => {
    if (rating === null) return "Não avaliado";
    
    // Converta a classificação para escala de 5 estrelas (assumindo que rating é de 0-100)
    const stars = Math.round((rating / 100) * 5 * 10) / 10;
    return `${stars.toFixed(1)} ★`;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Relatórios</CardTitle>
        <CardDescription>
          Análise detalhada de prestadores, serviços e agendamentos
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeReportTab} onValueChange={setActiveReportTab} className="w-full">
          <TabsList className="w-full max-w-md mb-6">
            <TabsTrigger value="providers" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>Prestadores</span>
            </TabsTrigger>
            <TabsTrigger value="services" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>Serviços</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="mt-0">
            {providerReportLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prestador</TableHead>
                    <TableHead>E-mail</TableHead>
                    <TableHead>Agendamentos</TableHead>
                    <TableHead>Avaliação</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {providerReport?.providers && providerReport.providers.length > 0 ? (
                    providerReport.providers.map((provider) => (
                      <TableRow key={provider.id}>
                        <TableCell className="font-medium">{provider.name}</TableCell>
                        <TableCell>{provider.email}</TableCell>
                        <TableCell>{provider.totalAppointments}</TableCell>
                        <TableCell>{renderRatingStars(provider.rating)}</TableCell>
                        <TableCell>
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold
                            ${provider.isOnline ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
                          >
                            {provider.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                        Nenhum prestador encontrado
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </TabsContent>

          <TabsContent value="services" className="mt-0">
            {serviceReportLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-8">
                {serviceReport?.categories && serviceReport.categories.length > 0 ? (
                  serviceReport.categories.map((category) => (
                    <div key={category.id} className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">{category.name}</h3>
                        <span className="text-sm text-muted-foreground">
                          {category.serviceCount} serviços
                        </span>
                      </div>
                      
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Serviço</TableHead>
                            <TableHead>Agendamentos</TableHead>
                            <TableHead>Prestadores</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {category.services.length > 0 ? (
                            category.services.map((service) => (
                              <TableRow key={service.id}>
                                <TableCell className="font-medium">{service.name}</TableCell>
                                <TableCell>{service.appointmentCount}</TableCell>
                                <TableCell>{service.providerCount}</TableCell>
                              </TableRow>
                            ))
                          ) : (
                            <TableRow>
                              <TableCell colSpan={3} className="text-center py-4 text-muted-foreground">
                                Nenhum serviço nesta categoria
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-muted-foreground">
                    Nenhuma categoria encontrada
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="mt-8 flex justify-end">
          <Button>
            Gerar Relatório PDF
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}