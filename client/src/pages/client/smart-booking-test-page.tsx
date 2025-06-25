import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { useLocation, useParams } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import SmartTimeSlotSelector, { TimeSlot } from "@/components/smart-time-slot-selector";

export default function SmartBookingTestPage() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [selectedServiceId, setSelectedServiceId] = useState<string | undefined>();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<TimeSlot | undefined>();
  
  // Na prática, você usaria o ID do prestador da URL ou passado via props
  const providerId = 2; // Usando um ID fixo para testes
  
  // Formatar a data para o formato esperado pela API
  const formattedDate = selectedDate 
    ? format(selectedDate, "yyyy-MM-dd") 
    : "";
  
  // Buscar serviços do prestador
  const { 
    data: providerServices,
    isLoading: servicesLoading,
    error: servicesError
  } = useQuery({
    queryKey: [`/api/services`, { providerId }],
    enabled: !!providerId,
  });

  // Manipulador para seleção de horário
  const handleSelectTimeSlot = (slot: TimeSlot) => {
    setSelectedTimeSlot(slot);
    toast({
      title: "Horário selecionado",
      description: `Você selecionou ${slot.startTime} - ${slot.endTime}`,
    });
  };

  // Manipulador para continuar com o agendamento
  const handleContinue = () => {
    if (!selectedServiceId || !selectedDate || !selectedTimeSlot) {
      toast({
        title: "Informações incompletas",
        description: "Por favor, preencha todas as informações para continuar.",
        variant: "destructive",
      });
      return;
    }
    
    // Na prática, você redirecionaria para a próxima etapa ou enviaria para a API
    toast({
      title: "Teste concluído",
      description: `Agendamento teste para ${format(selectedDate, "dd/MM/yyyy")} às ${selectedTimeSlot.startTime}`,
    });
  };

  return (
    <div className="container max-w-4xl py-6">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold">Teste de Agendamento Inteligente</h1>
        <p className="text-muted-foreground mt-2">
          Esta página testa a API de recomendação inteligente de horários usando IA
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Coluna de seleção de serviço e data */}
        <Card>
          <CardHeader>
            <CardTitle>Escolha o serviço e a data</CardTitle>
            <CardDescription>
              Selecione o serviço desejado e a data para o agendamento
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Seleção de serviço */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Serviço</label>
              {servicesLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : servicesError ? (
                <div className="text-destructive text-sm">
                  Erro ao carregar serviços
                </div>
              ) : (
                <Select
                  value={selectedServiceId}
                  onValueChange={setSelectedServiceId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um serviço" />
                  </SelectTrigger>
                  <SelectContent>
                    {providerServices?.map((service) => (
                      <SelectItem key={service.id} value={service.id.toString()}>
                        {service.name} ({service.duration} min)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Calendário para seleção de data */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                locale={ptBR}
                className="border rounded-md"
                disabled={(date) => {
                  // Desabilitar datas passadas
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return date < today;
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Coluna de seleção de horário */}
        <Card>
          <CardHeader>
            <CardTitle>Escolha o horário</CardTitle>
            <CardDescription>
              Horários disponíveis para a data selecionada
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedServiceId && selectedDate ? (
              <SmartTimeSlotSelector
                providerId={providerId}
                serviceId={parseInt(selectedServiceId)}
                date={formattedDate}
                onSelectTimeSlot={handleSelectTimeSlot}
                selectedTimeSlot={selectedTimeSlot?.startTime}
              />
            ) : (
              <div className="text-center p-8 text-muted-foreground">
                Selecione um serviço e uma data para ver os horários disponíveis
              </div>
            )}
          </CardContent>
          {selectedTimeSlot && (
            <CardFooter className="flex justify-between border-t pt-4">
              <div>
                <p className="text-sm font-medium">Horário selecionado:</p>
                <p className="text-muted-foreground">
                  {selectedTimeSlot.startTime} - {selectedTimeSlot.endTime}
                </p>
              </div>
              <Button onClick={handleContinue}>Continuar</Button>
            </CardFooter>
          )}
        </Card>
      </div>
    </div>
  );
}