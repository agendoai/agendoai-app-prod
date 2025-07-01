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
        <div className="hidden md:block overflow-hidden rounded-xl border border-gray-200 shadow-sm mb-6">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50 border-b-2 border-blue-600">
                <TableHead className="text-gray-700 font-semibold">Nome</TableHead>
                <TableHead className="text-gray-700 font-semibold">Contato</TableHead>
                <TableHead className="text-gray-700 font-semibold">Agendamentos</TableHead>
                <TableHead className="text-gray-700 font-semibold">Último Atendimento</TableHead>
                <TableHead className="text-right text-gray-700 font-semibold">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients?.map((client: Client, idx: number) => (
                <TableRow key={client.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <TableCell className="font-bold text-gray-900">{client.name}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="flex items-center text-xs text-blue-600 mb-1">
                        <Mail className="h-3 w-3 mr-1" /> {client.email}
                      </span>
                      {client.phone && (
                        <span className="flex items-center text-xs text-green-600">
                          <Phone className="h-3 w-3 mr-1" /> {client.phone}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{client.appointmentCount} atendimentos</span>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center text-xs text-orange-500">
                      <Calendar className="h-3 w-3 mr-1" /> {formatDate(client.lastAppointment)}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Link href={`/provider/clients/${client.id}`}>
                      <Button className="bg-blue-700 hover:bg-blue-800 text-white rounded px-4 py-1 text-xs font-semibold">Ver histórico</Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Visualização em cards para dispositivos móveis */}
        <div className="md:hidden">
          {filteredClients?.map((client: Client) => (
            <Card key={client.id} className="bg-white shadow-lg rounded-xl p-4 mb-3">
              <CardContent className="p-0">
                <div className="flex flex-col space-y-2">
                  <div className="flex justify-between items-start">
                    <h3 className="font-bold text-gray-900 text-lg">{client.name}</h3>
                    <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-semibold">{client.appointmentCount} atendimentos</span>
                  </div>
                  <div className="flex items-center text-blue-600">
                    <Mail className="h-4 w-4 mr-2" />
                    <span className="text-sm">{client.email}</span>
                  </div>
                  {client.phone && (
                    <div className="flex items-center text-green-600">
                      <Phone className="h-4 w-4 mr-2" />
                      <span className="text-sm">{client.phone}</span>
                    </div>
                  )}
                  <div className="flex items-center text-orange-500">
                    <Calendar className="h-4 w-4 mr-2" />
                    <span className="text-sm">Último atendimento: {formatDate(client.lastAppointment)}</span>
                  </div>
                  {client.address && (
                    <div className="flex items-center text-gray-500">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="text-sm">{client.address}</span>
                    </div>
                  )}
                  <div className="mt-2">
                    <Link href={`/provider/clients/${client.id}`}>
                      <Button className="bg-blue-700 hover:bg-blue-800 text-white rounded w-full px-4 py-2 text-sm font-semibold">Ver histórico</Button>
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
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <User className="h-8 w-8 text-blue-600" />
            Meus Clientes
          </h1>
        </div>

        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-5 w-5 text-blue-600" />
            <Input
              className="pl-12 py-3 rounded-lg shadow border border-gray-200 placeholder:text-gray-400"
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