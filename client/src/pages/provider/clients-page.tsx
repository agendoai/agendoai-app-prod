import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Search, User, Phone, Calendar, Mail, MapPin } from "lucide-react";
import ProviderLayout from "@/components/layout/provider-layout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  appointmentCount: number;
  lastAppointment?: string;
  address?: string;
}

export default function ProviderClientsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  // Buscar clientes do prestador
  const { data: clients, isLoading } = useQuery({
    queryKey: ["/api/provider/clients"],
    retry: 1,
  });

  // Filtrar clientes pelo termo de busca
  const filteredClients = clients?.filter((client: Client) => {
    return (
      client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (client.phone && client.phone.includes(searchTerm))
    );
  });

  // Formatar data para exibição
  const formatDate = (dateString?: string) => {
    if (!dateString) return "Sem registros";
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Renderizar lista de clientes
  const renderClientsList = () => {
    if (isLoading) {
      return (
        <div className="space-y-3">
          {Array(5).fill(0).map((_, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-4 w-32" />
                  </div>
                  <Skeleton className="h-10 w-24" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    if (!filteredClients?.length) {
      return (
        <div className="text-center py-12">
          <User className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-medium">Nenhum cliente encontrado</h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchTerm ? "Tente usar termos diferentes na busca" : "Você ainda não possui clientes"}
          </p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Visualização em tabela para telas maiores */}
        <div className="hidden md:block overflow-hidden rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Agendamentos</TableHead>
                <TableHead>Último Atendimento</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client: Client) => (
                <TableRow key={client.id}>
                  <TableCell className="font-medium">{client.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="flex items-center text-xs text-gray-500 mb-1">
                        <Mail className="h-3 w-3 mr-1" /> {client.email}
                      </span>
                      {client.phone && (
                        <span className="flex items-center text-xs text-gray-500">
                          <Phone className="h-3 w-3 mr-1" /> {client.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{client.appointmentCount} atendimentos</Badge>
                  </TableCell>
                  <TableCell>{formatDate(client.lastAppointment)}</TableCell>
                  <TableCell className="text-right">
                    <Link href={`/provider/clients/${client.id}`}>
                      <Button variant="outline" size="sm">Ver histórico</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Visualização em cards para dispositivos móveis */}
        <div className="md:hidden space-y-3">
          {filteredClients.map((client: Client) => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-medium text-lg">{client.name}</h3>
                    <Badge variant="outline">{client.appointmentCount} atendimentos</Badge>
                  </div>
                  
                  <div className="flex items-center text-gray-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="text-sm">{client.email}</span>
                  </div>
                  
                  {client.phone && (
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2" />
                      <span className="text-sm">{client.phone}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center text-gray-600">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">Último atendimento: {formatDate(client.lastAppointment)}</span>
                  </div>
                  
                  {client.address && (
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="text-sm">{client.address}</span>
                    </div>
                  )}
                  
                  <div className="flex justify-end mt-2">
                    <Link href={`/provider/clients/${client.id}`}>
                      <Button variant="outline" size="sm">
                        Ver histórico
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  return (
    <ProviderLayout>
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Meus Clientes</h1>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-10"
              placeholder="Buscar clientes por nome, email ou telefone"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {renderClientsList()}
      </div>
    </ProviderLayout>
  );
}