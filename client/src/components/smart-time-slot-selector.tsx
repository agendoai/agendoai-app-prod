import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addMinutes, parse } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { 
  Check, 
  ClockIcon, 
  SparklesIcon, 
  ThumbsUp, 
  Calendar, 
  Lightbulb,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";

export interface TimeSlot {
  startTime: string;
  endTime: string;
  serviceDuration: number;
  isAvailable: boolean;
  isRecommended?: boolean;
  score?: number;
  reason?: string;
}

export interface SmartTimeSelectorProps {
  providerId: number;
  serviceId: number;
  date: string;
  onSelectTimeSlot: (slot: TimeSlot) => void;
  selectedTimeSlot?: string;
}

/**
 * Componente inteligente para seleção de horários
 * Utiliza IA para recomendar os melhores horários para um serviço específico
 */
export default function SmartTimeSlotSelector({
  providerId,
  serviceId,
  date,
  onSelectTimeSlot,
  selectedTimeSlot,
}: SmartTimeSelectorProps) {
  const { toast } = useToast();
  const [useSmartRecommendations, setUseSmartRecommendations] = useState(true);

  // Buscar slots de tempo adaptados com IA
  const { 
    data: smartSlotsData,
    isLoading: smartSlotsLoading,
    error: smartSlotsError,
    refetch: refetchSmartSlots
  } = useQuery({
    queryKey: [
      `/api/providers/${providerId}/smart-time-slots`, 
      { date, serviceId, providerId }
    ],
    enabled: !!providerId && !!serviceId && !!date && useSmartRecommendations,
  });

  // Buscar slots de tempo normais (sem adaptação IA)
  const { 
    data: regularSlotsData,
    isLoading: regularSlotsLoading, 
    error: regularSlotsError,
    refetch: refetchRegularSlots
  } = useQuery({
    queryKey: [
      `/api/providers/${providerId}/time-slots`, 
      { date, serviceId, providerId }
    ],
    enabled: !!providerId && !!serviceId && !!date && !useSmartRecommendations,
  });

  // Determinar quais slots mostrar com base na escolha do usuário e filtrar os que já passaram
  const timeSlots: TimeSlot[] = useMemo(() => {
    let slots: TimeSlot[] = [];
    
    if (useSmartRecommendations && smartSlotsData?.timeSlots) {
      slots = smartSlotsData.timeSlots;
    } else if (!useSmartRecommendations && regularSlotsData) {
      slots = regularSlotsData;
    }
    
    // Garantir que todos os slots são realmente disponíveis e completos
    slots = slots.filter(slot => {
      // Verificar se o slot tem todas as propriedades necessárias
      if (!slot || !slot.startTime || !slot.endTime) {
        console.warn('Slot inválido removido:', slot);
        return false;
      }
      
      // Verificar se o slot está explicitamente marcado como disponível
      if (slot.isAvailable !== true) {
        return false;
      }
      
      // Garantir que a duração do serviço está definida
      if (!slot.serviceDuration) {
        // Se não tiver duração, tentar calcular a partir do horário de início e fim
        const [startHour, startMinute] = slot.startTime.split(':').map(Number);
        const [endHour, endMinute] = slot.endTime.split(':').map(Number);
        
        const startMinutes = startHour * 60 + startMinute;
        const endMinutes = endHour * 60 + endMinute;
        
        // Calcular a duração e atribuir ao slot
        slot.serviceDuration = endMinutes - startMinutes;
      }
      
      return true;
    });
    
    console.log(`Smart Time Slot Selector: Filtrando ${slots.length} slots disponíveis`);
    
    // Filtrar slots que já passaram (se for hoje)
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    
    if (date === today) {
      // Horário atual em minutos desde o início do dia
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentMinutes = currentHour * 60 + currentMinute;
      
      // Filtrar slots que não já passaram
      const beforeFilter = slots.length;
      slots = slots.filter(slot => {
        const [slotHour, slotMinute] = slot.startTime.split(':').map(Number);
        const slotMinutes = slotHour * 60 + slotMinute;
        
        return slotMinutes > currentMinutes;
      });
      console.log(`Smart Time Slot Selector: Filtrados ${beforeFilter - slots.length} slots passados`);
    }
    
    return slots;
  }, [useSmartRecommendations, smartSlotsData, regularSlotsData, date]);

  // Agrupar slots por período (manhã, tarde, noite)
  const slotsByPeriod = useMemo(() => {
    const morning: TimeSlot[] = [];
    const afternoon: TimeSlot[] = [];
    const evening: TimeSlot[] = [];

    timeSlots.forEach(slot => {
      const hour = parseInt(slot.startTime.split(":")[0], 10);
      
      if (hour < 12) {
        morning.push(slot);
      } else if (hour < 18) {
        afternoon.push(slot);
      } else {
        evening.push(slot);
      }
    });

    return { morning, afternoon, evening };
  }, [timeSlots]);

  // Formatar horário para exibição
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(":");
    return `${hours}:${minutes}`;
  };

  // Calcular horário de término com base no horário de início e duração
  const calculateEndTime = (startTime: string, durationMinutes: number) => {
    const [hours, minutes] = startTime.split(":").map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = addMinutes(startDate, durationMinutes);
    return format(endDate, "HH:mm");
  };

  // Manipulador para quando um slot é selecionado
  const handleSelectSlot = (slot: TimeSlot) => {
    if (!slot.isAvailable) return;
    onSelectTimeSlot(slot);
  };

  // Alternar entre recomendações inteligentes e slots normais
  const toggleRecommendations = () => {
    setUseSmartRecommendations(!useSmartRecommendations);
    if (!useSmartRecommendations) {
      refetchSmartSlots();
    } else {
      refetchRegularSlots();
    }
  };

  // Renderizar a mensagem de carregamento
  if (useSmartRecommendations ? smartSlotsLoading : regularSlotsLoading) {
    return (
      <div className="p-4 space-y-4">
        <div className="flex justify-between">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-10 w-36" />
        </div>
        
        <div className="mt-6">
          <Skeleton className="h-5 w-28 mb-3" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </div>
        
        <div className="mt-6">
          <Skeleton className="h-5 w-28 mb-3" />
          <div className="grid grid-cols-4 gap-2">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-md" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Renderizar mensagem de erro
  if (useSmartRecommendations ? smartSlotsError : regularSlotsError) {
    return (
      <div className="text-center p-6 text-destructive">
        <p>Erro ao carregar horários disponíveis. Por favor, tente novamente.</p>
        <Button 
          variant="outline" 
          onClick={() => useSmartRecommendations ? refetchSmartSlots() : refetchRegularSlots()}
          className="mt-2"
        >
          Tentar novamente
        </Button>
      </div>
    );
  }

  // Renderizar quando não há slots disponíveis
  if (timeSlots.length === 0) {
    return (
      <div className="text-center p-6">
        <Calendar className="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
        <h3 className="font-medium text-lg">Sem horários disponíveis</h3>
        <p className="text-muted-foreground mt-1">
          Não há horários disponíveis nesta data. Tente selecionar outra data.
        </p>
      </div>
    );
  }

  // Renderizar componente principal
  return (
    <div className="p-2 space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-medium text-lg flex items-center gap-2">
          <ClockIcon className="h-5 w-5" />
          Horários Disponíveis
        </h3>
        
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant={useSmartRecommendations ? "default" : "outline"}
                size="sm"
                onClick={toggleRecommendations}
                className="gap-2"
              >
                {useSmartRecommendations ? <SparklesIcon className="h-4 w-4" /> : <></>}
                {useSmartRecommendations ? "Recomendações IA" : "Horários Padrão"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {useSmartRecommendations 
                ? "Usando IA para recomendar os melhores horários para este serviço" 
                : "Mostrando todos os horários disponíveis sem análise de IA"}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      {slotsByPeriod.morning.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">Manhã</h4>
          <div className="grid grid-cols-4 gap-2">
            {slotsByPeriod.morning.map((slot) => (
              <TimeSlotButton 
                key={slot.startTime} 
                slot={slot} 
                isSelected={selectedTimeSlot === slot.startTime}
                onSelect={handleSelectSlot}
              />
            ))}
          </div>
        </div>
      )}

      {slotsByPeriod.afternoon.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">Tarde</h4>
          <div className="grid grid-cols-4 gap-2">
            {slotsByPeriod.afternoon.map((slot) => (
              <TimeSlotButton 
                key={slot.startTime} 
                slot={slot} 
                isSelected={selectedTimeSlot === slot.startTime}
                onSelect={handleSelectSlot}
              />
            ))}
          </div>
        </div>
      )}

      {slotsByPeriod.evening.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2 text-muted-foreground">Noite</h4>
          <div className="grid grid-cols-4 gap-2">
            {slotsByPeriod.evening.map((slot) => (
              <TimeSlotButton 
                key={slot.startTime} 
                slot={slot} 
                isSelected={selectedTimeSlot === slot.startTime}
                onSelect={handleSelectSlot}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Componente para o botão de slot de tempo
function TimeSlotButton({ 
  slot, 
  isSelected, 
  onSelect
}: { 
  slot: TimeSlot;
  isSelected: boolean;
  onSelect: (slot: TimeSlot) => void;
}) {
  // Se o slot não estiver disponível, não renderizar o botão
  if (!slot.isAvailable) {
    return null;
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={isSelected ? "default" : "outline"}
          size="sm"
          onClick={() => onSelect(slot)}
          className={`relative flex flex-col h-auto py-2 items-center justify-center ${
            slot.isRecommended && !isSelected 
              ? "border-primary/50" 
              : ""
          }`}
        >
          <span className="font-medium">{formatTime(slot.startTime)}</span>
          <span className="text-xs text-muted-foreground">
            até {formatTime(slot.endTime)}
          </span>
          
          {slot.isRecommended && (
            <div className="absolute -top-1 -right-1">
              <Badge variant="default" className="h-4 w-4 p-0 flex items-center justify-center rounded-full">
                <ThumbsUp className="h-2.5 w-2.5" />
              </Badge>
            </div>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent className="w-80 p-3">
        <div className="flex items-start gap-2">
          <ClockIcon className="h-4 w-4 text-primary mt-0.5" />
          <div>
            <p className="text-sm font-medium mb-1">Detalhes do horário</p>
            <div className="text-xs grid grid-cols-2 gap-x-1">
              <span className="text-muted-foreground">Início:</span>
              <span>{formatTime(slot.startTime)}</span>
              
              <span className="text-muted-foreground">Término:</span>
              <span>{formatTime(slot.endTime)}</span>
              
              <span className="text-muted-foreground">Duração:</span>
              <span>{slot.serviceDuration} minutos</span>
            </div>
            
            {slot.reason && (
              <div className="mt-3 pt-3 border-t border-border">
                <div className="flex items-start gap-2">
                  <Lightbulb className="h-4 w-4 text-primary mt-0.5" />
                  <div>
                    <p className="text-xs font-medium mb-1">Recomendação da IA</p>
                    <p className="text-xs text-muted-foreground">{slot.reason}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// Função auxiliar para formatação de horário
function formatTime(time: string): string {
  if (!time) return '';

  // Converter formato "HH:MM" para formato mais amigável
  const [hours, minutes] = time.split(':').map(Number);
  
  // Remover o zero à esquerda da hora (exceto para 00:XX)
  const formattedHours = hours === 0 ? '00' : hours.toString().padStart(2, '0');
  // Garantir que os minutos sempre tenham dois dígitos
  const formattedMinutes = minutes.toString().padStart(2, '0');
  
  return `${formattedHours}:${formattedMinutes}`;
}