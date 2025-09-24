import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { 
  Calendar, 
  Clock, 
  User, 
  Phone, 
  MapPin, 
  BadgeCheck, 
  Ban, 
  AlertTriangle, 
  Search, 
  Filter,
  ArrowLeft,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock as ClockIcon,
  Eye,
  Edit
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ProviderLayout from "@/components/layout/provider-layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency, formatDateToBR } from "@/lib/utils";
import { format, parseISO, isToday, isYesterday, isTomorrow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ValidationCodeModal } from "@/components/validation-code-modal";

interface Appointment {
  id: number;
  clientId: number;
  clientName: string;
  clientPhone?: string;
  clientEmail?: string;
  serviceId: number;
  serviceName: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  paymentStatus?: string;
  price: number;
  totalPrice?: number;
  location?: string;
  notes?: string;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 hover:bg-yellow-200",
  confirmed: "bg-blue-100 text-blue-800 hover:bg-blue-200",
  completed: "bg-green-100 text-green-800 hover:bg-green-200",
  canceled: "bg-red-100 text-red-800 hover:bg-red-200",
  no_show: "bg-gray-100 text-gray-800 hover:bg-gray-200",
  executing: "bg-purple-100 text-purple-800 hover:bg-purple-200",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Confirmado",
  completed: "Concluído",
  canceled: "Cancelado",
  no_show: "Não Compareceu",
  executing: "Executando",
};

const paymentStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  paid: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  refunded: "bg-gray-100 text-gray-800",
};

const paymentStatusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  failed: "Falhou",
  refunded: "Reembolsado",
};

export default function ProviderAppointmentsManagementPage() {
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState("all");
  const [filterStatus, setFilterStatus] = useState<string | null>(null);
  const [filterPaymentStatus, setFilterPaymentStatus] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [appointmentToComplete, setAppointmentToComplete] = useState<number | null>(null);

  // Buscar agendamentos do prestador
  const { data: appointments = [], isLoading } = useQuery<Appointment[]>({
    queryKey: ["/api/appointments"],
    retry: 1,
  });

  // Filtrar agendamentos
  const filteredAppointments = useMemo(() => {
    return appointments.filter((appointment: Appointment) => {
      const isUpcoming = new Date(`${appointment.date}T${appointment.startTime}`) >= new Date();
      const isPast = new Date(`${appointment.date}T${appointment.startTime}`) < new Date();
      
      // Filtro por aba
      if (activeTab === "upcoming" && !isUpcoming) return false;
      if (activeTab === "past" && !isPast) return false;
      if (activeTab === "today" && !isToday(parseISO(appointment.date))) return false;
      
      // Filtro por status
      if (filterStatus && appointment.status !== filterStatus) return false;
      
      // Filtro por payment status
      if (filterPaymentStatus && appointment.paymentStatus !== filterPaymentStatus) return false;
      
      // Filtro por busca
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || 
        appointment.clientName?.toLowerCase().includes(searchLower) ||
        appointment.serviceName?.toLowerCase().includes(searchLower) ||
        appointment.clientPhone?.includes(searchTerm) ||
        appointment.clientEmail?.toLowerCase().includes(searchLower);
      
      return matchesSearch;
    }).sort((a, b) => {
      // Ordenar por data e hora
      if (a.date !== b.date) {
        return a.date.localeCompare(b.date);
      }
      return a.startTime.localeCompare(b.startTime);
    });
  }, [appointments, activeTab, filterStatus, filterPaymentStatus, searchTerm]);

  // Mutation para atualizar status
  const updateStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, status }: { appointmentId: number; status: string }) => {
      const response = await apiRequest('PUT', `/api/appointments/${appointmentId}/status`, { status });
      if (!response.ok) throw new Error('Erro ao atualizar status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({ title: 'Status atualizado', description: 'O status do agendamento foi atualizado com sucesso' });
      setShowStatusModal(false);
      setSelectedAppointment(null);
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message || 'Erro ao atualizar status', variant: 'destructive' });
    }
  });

  // Mutation para atualizar payment status
  const updatePaymentStatusMutation = useMutation({
    mutationFn: async ({ appointmentId, paymentStatus }: { appointmentId: number; paymentStatus: string }) => {
      const response = await apiRequest('PUT', `/api/appointments/${appointmentId}/status`, { paymentStatus });
      if (!response.ok) throw new Error('Erro ao atualizar status de pagamento');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      toast({ title: 'Status de pagamento atualizado', description: 'O status de pagamento foi atualizado com sucesso' });
      setShowStatusModal(false);
      setSelectedAppointment(null);
    },
    onError: (error: any) => {
      toast({ title: 'Erro', description: error.message || 'Erro ao atualizar status de pagamento', variant: 'destructive' });
    }
  });

  const handleStatusUpdate = (appointment: Appointment, newStatus: string) => {
    setSelectedAppointment(appointment);
    if (newStatus === 'completed') {
      // Abrir modal de validação em vez de atualizar diretamente
      setShowStatusModal(false);
      setAppointmentToComplete(appointment.id);
      setShowValidationModal(true);
      return;
    }
    updateStatusMutation.mutate({ appointmentId: appointment.id, status: newStatus });
  };

  const handleValidationSuccess = () => {
    // Backend já concluiu; apenas sincronizar UI
    setShowValidationModal(false);
    setAppointmentToComplete(null);
    queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
  };

  const handleCloseValidationModal = () => {
    setShowValidationModal(false);
    setAppointmentToComplete(null);
  };

  const handlePaymentStatusUpdate = (appointment: Appointment, newPaymentStatus: string) => {
    setSelectedAppointment(appointment);
    updatePaymentStatusMutation.mutate({ appointmentId: appointment.id, paymentStatus: newPaymentStatus });
  };

  const formatDate = (dateString: string) => {
    const date = parseISO(dateString);
    if (isToday(date)) return "Hoje";
    if (isYesterday(date)) return "Ontem";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd/MM/yyyy", { locale: ptBR });
  };

  const formatTime = (time: string) => {
    return time.substring(0, 5);
  };

  const clearFilters = () => {
    setFilterStatus(null);
    setFilterPaymentStatus(null);
    setSearchTerm("");
  };

  return (
    <ProviderLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header com cor padrão */}
        <div className="bg-[#58c9d1] py-4 px-4 w-full">
          <div className="container mx-auto max-w-6xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate("/provider/dashboard")}
                  className="text-white hover:bg-white/10 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Voltar
                </Button>
                <div className="h-6 w-px bg-white/20"></div>
                <h1 className="text-xl font-semibold text-white">Gerenciar Agendamentos</h1>
              </div>
            </div>
          </div>
        </div>
        
        <div className="container mx-auto py-6 px-4 max-w-6xl">
          {/* Descrição */}
          <div className="mb-4">
            <p className="text-gray-600 text-sm max-w-2xl">
              Gerencie todos os seus agendamentos, atualize status e controle pagamentos.
            </p>
          </div>

                     {/* Filtros e Busca */}
           <Card className="mb-3 shadow-lg border-0 bg-white/95 backdrop-blur-sm border-[#58c9d1]/20">
             <CardContent className="p-3">
               <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                 {/* Busca */}
                 <div className="relative">
                   <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-[#58c9d1]" />
                   <Input
                     placeholder="Buscar..."
                     value={searchTerm}
                     onChange={(e) => setSearchTerm(e.target.value)}
                     className="pl-7 h-8 text-xs bg-white border-[#58c9d1]/30 focus:border-[#58c9d1] focus:ring-[#58c9d1]/20"
                   />
                 </div>

                                                   {/* Filtro por Status */}
                  <Select value={filterStatus || "all"} onValueChange={(value) => setFilterStatus(value === "all" ? null : value)}>
                    <SelectTrigger className="h-8 text-xs bg-white border-[#58c9d1]/30 focus:border-[#58c9d1] focus:ring-[#58c9d1]/20">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="all">Todos os status</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="confirmed">Confirmado</SelectItem>
                      <SelectItem value="completed">Concluído</SelectItem>
                      <SelectItem value="canceled">Cancelado</SelectItem>
                      <SelectItem value="no_show">Não Compareceu</SelectItem>
                      <SelectItem value="executing">Executando</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Filtro por Payment Status */}
                  <Select value={filterPaymentStatus || "all"} onValueChange={(value) => setFilterPaymentStatus(value === "all" ? null : value)}>
                    <SelectTrigger className="h-8 text-xs bg-white border-[#58c9d1]/30 focus:border-[#58c9d1] focus:ring-[#58c9d1]/20">
                      <SelectValue placeholder="Pagamento" />
                    </SelectTrigger>
                    <SelectContent className="bg-white border border-gray-200 shadow-lg">
                      <SelectItem value="all">Todos os pagamentos</SelectItem>
                      <SelectItem value="pending">Pendente</SelectItem>
                      <SelectItem value="paid">Pago</SelectItem>
                      <SelectItem value="failed">Falhou</SelectItem>
                      <SelectItem value="refunded">Reembolsado</SelectItem>
                    </SelectContent>
                  </Select>

                 {/* Botão Limpar */}
                 {(filterStatus || filterPaymentStatus || searchTerm) && (
                   <Button
                     variant="outline"
                     onClick={clearFilters}
                     className="h-8 text-xs border-[#58c9d1]/30 hover:border-[#58c9d1] hover:bg-[#58c9d1]/5 text-[#58c9d1]"
                   >
                     <XCircle className="h-2 w-2 mr-1" />
                     Limpar
                   </Button>
                 )}
              </div>
            </CardContent>
          </Card>

                     {/* Tabs */}
           <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-3">
             <TabsList className="bg-white/95 backdrop-blur-sm border border-[#58c9d1]/20 shadow-lg h-8">
               <TabsTrigger value="all" className="text-xs data-[state=active]:bg-[#58c9d1] data-[state=active]:text-white data-[state=active]:shadow-md">
                 Todos ({appointments.length})
               </TabsTrigger>
               <TabsTrigger value="upcoming" className="text-xs data-[state=active]:bg-[#58c9d1] data-[state=active]:text-white data-[state=active]:shadow-md">
                 Próximos ({appointments.filter(a => new Date(`${a.date}T${a.startTime}`) >= new Date()).length})
               </TabsTrigger>
               <TabsTrigger value="today" className="text-xs data-[state=active]:bg-[#58c9d1] data-[state=active]:text-white data-[state=active]:shadow-md">
                 Hoje ({appointments.filter(a => isToday(parseISO(a.date))).length})
               </TabsTrigger>
               <TabsTrigger value="past" className="text-xs data-[state=active]:bg-[#58c9d1] data-[state=active]:text-white data-[state=active]:shadow-md">
                 Passados ({appointments.filter(a => new Date(`${a.date}T${a.startTime}`) < new Date()).length})
               </TabsTrigger>
             </TabsList>
           </Tabs>

                     {/* Lista de Agendamentos */}
           <div className="space-y-3">
             {isLoading ? (
               // Loading skeletons
               Array(5).fill(0).map((_, index) => (
                 <Card key={index} className="border-0 shadow-lg bg-white/80 backdrop-blur-sm">
                   <CardContent className="p-4">
                     <div className="flex justify-between mb-3">
                       <Skeleton className="h-5 w-28" />
                       <Skeleton className="h-5 w-20" />
                     </div>
                     <div className="flex items-center">
                       <Skeleton className="w-10 h-10 rounded-lg mr-3" />
                       <div className="flex-1">
                         <Skeleton className="h-4 w-36 mb-2" />
                         <Skeleton className="h-3 w-48" />
                       </div>
                     </div>
                   </CardContent>
                 </Card>
               ))
             ) : filteredAppointments.length === 0 ? (
               <Card className="border-0 shadow-lg bg-white/80 backdrop-blur-sm p-6 text-center">
                 <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
                 <h3 className="text-base font-semibold text-gray-900 mb-2">Nenhum agendamento encontrado</h3>
                 <p className="text-gray-600 text-sm">
                   {searchTerm || filterStatus || filterPaymentStatus 
                     ? "Tente ajustar os filtros ou termos de busca"
                     : "Não há agendamentos para exibir"
                   }
                 </p>
               </Card>
            ) : (
                             filteredAppointments.map((appointment) => (
                 <motion.div
                   key={appointment.id}
                   initial={{ opacity: 0, y: 20 }}
                   animate={{ opacity: 1, y: 0 }}
                   transition={{ duration: 0.3 }}
                 >
                                       <Card className="border-0 shadow-lg bg-white/95 backdrop-blur-sm hover:shadow-xl transition-all duration-300 border-[#58c9d1]/10 hover:border-[#58c9d1]/30">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <h3 className="text-xs font-semibold text-gray-900 truncate">
                                {appointment.clientName}
                              </h3>
                              <Badge className={`text-xs ${statusColors[appointment.status] || "bg-gray-100 text-gray-800"}`}>
                                {statusLabels[appointment.status] || appointment.status}
                              </Badge>
                              {appointment.paymentStatus && (
                                <Badge className={`text-xs ${paymentStatusColors[appointment.paymentStatus] || "bg-gray-100 text-gray-800"}`}>
                                  {paymentStatusLabels[appointment.paymentStatus] || appointment.paymentStatus}
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-xs text-gray-600 mb-2 flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-2 w-2 text-[#58c9d1]" />
                                {formatDate(appointment.date)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="h-2 w-2 text-[#58c9d1]" />
                                {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                              </span>
                              <span className="flex items-center gap-1">
                                <DollarSign className="h-2 w-2 text-[#58c9d1]" />
                                {formatCurrency(appointment.totalPrice || appointment.price || 0)}
                              </span>
                            </div>
                            
                            <div className="text-xs text-gray-600">
                              <p className="font-medium truncate">{appointment.serviceName}</p>
                              {appointment.notes && (
                                <p className="text-gray-500 mt-1 truncate">{appointment.notes}</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col gap-1 ml-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedAppointment(appointment)}
                              className="text-xs h-6 px-2 border-[#58c9d1]/30 hover:border-[#58c9d1] hover:bg-[#58c9d1]/5 text-[#58c9d1] hover:text-[#58c9d1]/80"
                            >
                              <Edit className="h-2 w-2 mr-1" />
                              Status
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                 </motion.div>
               ))
            )}
          </div>
        </div>
      </div>

             {/* Modal para atualizar status */}
       {selectedAppointment && (
         <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[9999] p-3">
           <Card className="w-full max-w-sm border-[#58c9d1]/20 shadow-2xl bg-white relative">
             <CardHeader className="pb-2 border-b border-[#58c9d1]/10">
               <CardTitle className="text-base text-[#58c9d1]">Atualizar Status</CardTitle>
             </CardHeader>
             <CardContent className="space-y-3">
               <div className="text-xs">
                 <h4 className="font-medium mb-1 text-gray-900">Cliente: {selectedAppointment.clientName}</h4>
                 <p className="text-gray-600">{selectedAppointment.serviceName}</p>
               </div>
               
               <div>
                 <label className="block text-xs font-medium mb-1 text-gray-700">Status do Agendamento</label>
                                  <Select 
                    value={selectedAppointment.status} 
                    onValueChange={(value) => handleStatusUpdate(selectedAppointment, value)}
                    disabled={updateStatusMutation.isPending}
                  >
                    <SelectTrigger className="h-8 text-xs border-[#58c9d1]/30 focus:border-[#58c9d1] focus:ring-[#58c9d1]/20">
                      <SelectValue placeholder="Selecione o status" />
                    </SelectTrigger>
                                        <SelectContent className="z-[10000] bg-white border border-gray-200 shadow-lg">
                       {Object.entries(statusLabels).map(([key, label]) => (
                         <SelectItem key={key} value={key}>
                           {label}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 
                 <div>
                   <label className="block text-xs font-medium mb-1 text-gray-700">Status do Pagamento</label>
                   <Select 
                     value={selectedAppointment.paymentStatus || "paid"} 
                     onValueChange={(value) => handlePaymentStatusUpdate(selectedAppointment, value)}
                     disabled={updatePaymentStatusMutation.isPending}
                   >
                     <SelectTrigger className="h-8 text-xs border-[#58c9d1]/30 focus:border-[#58c9d1] focus:ring-[#58c9d1]/20">
                       <SelectValue placeholder="Pago ou Pendente" />
                     </SelectTrigger>
                     <SelectContent className="z-[10000] bg-white border border-gray-200 shadow-lg">
                       <SelectItem value="pending">Pendente</SelectItem>
                       <SelectItem value="paid">Pago</SelectItem>
                     </SelectContent>
                   </Select>
               </div>
               
               <div className="flex gap-2 pt-2">
                 <Button
                   variant="outline"
                   onClick={() => {
                     setSelectedAppointment(null);
                     setShowStatusModal(false);
                   }}
                   className="flex-1 text-xs border-[#58c9d1]/30 hover:border-[#58c9d1] hover:bg-[#58c9d1]/5 text-[#58c9d1]"
                 >
                   Cancelar
                 </Button>
               </div>
             </CardContent>
           </Card>
         </div>
       )}
      {appointmentToComplete && (
        <ValidationCodeModal
          isOpen={showValidationModal}
          onClose={handleCloseValidationModal}
          appointmentId={appointmentToComplete}
          onSuccess={handleValidationSuccess}
          isLoading={false}
        />
      )}
    </ProviderLayout>
  );
}