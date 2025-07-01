import { useState, useEffect } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Service } from "@shared/schema.ts";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { 
  Clock, 
  Timer, 
  Loader2, 
  RefreshCw, 
  AlertTriangle, 
  Info,
  CheckCircle2, 
  History, 
  BarChart3
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface ExecutionTimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  service: Service | null;
}

interface ProviderService {
  id: number;
  providerId: number;
  serviceId: number;
  executionTime: number;
  breakTime: number; // Tempo de intervalo/descanso após o serviço
  isActive: boolean | null;
  createdAt: string | null;
}

interface AppointmentStat {
  actualDuration?: number;
  averageDuration?: number;
  minimumDuration?: number;
  maximumDuration?: number;
  count: number;
}

export function ExecutionTimeDialog({
  isOpen,
  onClose,
  service
}: ExecutionTimeDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [executionTime, setExecutionTime] = useState<number>(30);
  // Mantemos breakTime para compatibilidade, mas sempre com valor zero (sem intervalos entre serviços)
  const breakTime = 0;
  const [isActive, setIsActive] = useState<boolean>(true);
  const [providerServiceId, setProviderServiceId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showRecommendations, setShowRecommendations] = useState<boolean>(false);

  // Buscar personalização existente, se houver (usando a nova API unificada)
  const { data: providerService, refetch } = useQuery<ProviderService>({
    queryKey: [`/api/unified-services/provider/${user?.id}`],
    select: (data: any) => {
      // Filtrar o serviço específico dos dados retornados
      return data?.find((s: any) => s.serviceId === service?.id && s.isCustomized);
    },
    enabled: isOpen && !!service && !!user,
  });
  
  // Buscar estatísticas de agendamentos para este serviço
  const { data: appointmentStats, isLoading: isStatsLoading } = useQuery<AppointmentStat>({
    queryKey: [`/api/analytics/service-execution/${service?.id}/provider/${user?.id}`],
    enabled: isOpen && !!service && !!user,
  });

  // Calcular recomendação de tempo baseada nos dados históricos
  const recommendedTime = appointmentStats?.averageDuration 
    ? Math.round(appointmentStats.averageDuration) 
    : service?.duration || 30;

  // Determinar se o tempo atual é adequado baseado nos dados históricos
  const timeEfficiency = calculateTimeEfficiency(executionTime, appointmentStats);
  
  // Efeito para atualizar os estados quando os dados são carregados
  // Função auxiliar para arredondar para múltiplos de 15
  const roundToNearestFifteen = (minutes: number): number => {
    return Math.round(minutes / 15) * 15 || 15; // Garante um mínimo de 15 minutos
  };

  useEffect(() => {
    if (providerService) {
      // Arredondar para o múltiplo de 15 mais próximo
      setExecutionTime(roundToNearestFifteen(providerService.executionTime));
      setIsActive(providerService.isActive === null ? true : !!providerService.isActive);
      setProviderServiceId(providerService.id);
      setIsLoading(false);
    } else if (service && isOpen) {
      // Se não tem personalização, usar o tempo padrão do serviço, arredondado
      setExecutionTime(roundToNearestFifteen(service.duration));
      setIsActive(true);
      setProviderServiceId(null);
      setIsLoading(false);
    }
  }, [providerService, service, isOpen]);

  // Efeito para atualizar estados quando o serviço muda
  useEffect(() => {
    if (service) {
      setIsLoading(true);
      // Inicializar com valores do serviço até que os personalizados sejam carregados
      // Arredondar para o múltiplo de 15 mais próximo
      setExecutionTime(roundToNearestFifteen(service.duration));
      setIsActive(true);
      refetch();
    }
  }, [service, refetch]);
  
  // Função para calcular a eficiência do tempo baseada nos dados históricos
  function calculateTimeEfficiency(
    currentTime: number, 
    stats?: AppointmentStat
  ): { status: 'optimal' | 'too_short' | 'too_long' | 'unknown'; message: string } {
    if (!stats || !stats.averageDuration || stats.count < 5) {
      return { 
        status: 'unknown', 
        message: 'Sem dados suficientes para análise' 
      };
    }
    
    const avgTime = stats.averageDuration;
    const maxTime = stats.maximumDuration || avgTime * 1.2;
    
    // Tempo muito curto (menos de 90% da média)
    if (currentTime < avgTime * 0.9) {
      return { 
        status: 'too_short', 
        message: `Tempo insuficiente. Em média, você gasta ${Math.round(avgTime)} min neste serviço.` 
      };
    }
    
    // Tempo muito longo (mais de 120% da média)
    if (currentTime > avgTime * 1.2) {
      return { 
        status: 'too_long', 
        message: `Tempo excessivo. Em média, você gasta ${Math.round(avgTime)} min neste serviço.` 
      };
    }
    
    // Tempo ótimo (entre 90% e 120% da média)
    return { 
      status: 'optimal', 
      message: `Tempo ideal! Baseado em seus ${stats.count} agendamentos anteriores.` 
    };
  }
  
  // Função para aplicar tempo recomendado
  const applyRecommendedTime = () => {
    if (recommendedTime) {
      // Arredondar para o múltiplo de 15 mais próximo
      setExecutionTime(roundToNearestFifteen(recommendedTime));
    }
  };

  // Mutation para salvar tempo personalizado
  const saveMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      if (!service || !user) return;

      const payload = {
        providerId: user.id,
        serviceId: service.id,
        executionTime,
        breakTime,
        isActive
      };

      // Se já existe um registro, usamos PUT para atualizar, caso contrário POST para criar
      // Usando a nova API unificada
      const method = "PUT";
      const url = `/api/unified-services/${service.id}`;

      const response = await apiRequest(
        method,
        url,
        payload
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao salvar tempo personalizado");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tempo de execução salvo",
        description: "O tempo de execução personalizado foi salvo com sucesso."
      });
      
      // Atualizar dados na interface - usando a nova API unificada
      queryClient.invalidateQueries({ 
        queryKey: [`/api/unified-services/provider/${user?.id}`] 
      });
      
      // Manter a invalidação das rotas antigas para compatibilidade
      queryClient.invalidateQueries({
        queryKey: [`/api/provider-services/provider/${user?.id}`]
      });
      
      // Força a atualização dos serviços na página do prestador
      setTimeout(() => {
        // Invalidar queries adicionais que podem afetar a lista de serviços
        queryClient.invalidateQueries({
          queryKey: [`/api/services?providerId=${user?.id}`]
        });
      }, 300);
      
      // Fechar o diálogo
      setIsSaving(false);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      setIsSaving(false);
    }
  });

  // Mutation para restaurar tempo padrão (excluir personalização)
  const resetMutation = useMutation({
    mutationFn: async () => {
      setIsSaving(true);
      if (!providerServiceId) {
        throw new Error("Não há personalização para remover");
      }

      // Usando a nova API unificada
      const response = await apiRequest(
        "DELETE",
        `/api/unified-services/${service?.id}?hard=false`
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Erro ao restaurar tempo padrão");
      }

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Tempo de execução restaurado",
        description: "O serviço agora usará o tempo padrão de execução."
      });
      
      // Atualizar dados na interface e voltar para tempo padrão
      if (service) {
        // Arredondar para o múltiplo de 15 mais próximo
        setExecutionTime(roundToNearestFifteen(service.duration));
      }
      setProviderServiceId(null);
      
      // Atualizar dados na interface - usando a nova API unificada
      queryClient.invalidateQueries({ 
        queryKey: [`/api/unified-services/provider/${user?.id}`] 
      });
      
      // Manter a invalidação das rotas antigas para compatibilidade
      queryClient.invalidateQueries({
        queryKey: [`/api/provider-services/provider/${user?.id}`]
      });
      
      // Forçar a atualização dos serviços na página do prestador
      setTimeout(() => {
        // Invalidar queries adicionais que podem afetar a lista de serviços
        queryClient.invalidateQueries({
          queryKey: [`/api/services?providerId=${user?.id}`]
        });
      }, 300);
      
      // Fechar o diálogo
      setIsSaving(false);
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
      setIsSaving(false);
    }
  });

  // Verify if the execution time is different from default
  const isCustomized = service && executionTime !== service.duration;

  // Calculate percentage difference
  const percentageDiff = service 
    ? Math.round(((executionTime - service.duration) / service.duration) * 100) 
    : 0;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Personalizar Tempo de Execução</DialogTitle>
          <DialogDescription>
            Ajuste o tempo necessário para executar este serviço em incrementos de 15 minutos.
            A duração de referência sugerida pelo administrador é {service?.duration} minutos.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Painel de Análise Inteligente */}
              {appointmentStats && appointmentStats.count > 0 && (
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <BarChart3 className="h-5 w-5 text-blue-500" />
                    <h3 className="font-medium text-sm">Análise Inteligente</h3>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-5 w-5 ml-auto">
                            <Info className="h-4 w-4 text-slate-400" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p className="w-[200px] text-xs">Baseado em {appointmentStats.count} agendamentos anteriores deste serviço</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="space-y-2">
                    {/* Tempo médio real */}
                    {appointmentStats.averageDuration && (
                      <div className="flex items-center gap-2 text-sm">
                        <History className="h-4 w-4 text-slate-500" />
                        <span>Tempo médio real: <strong>{Math.round(appointmentStats.averageDuration)} min</strong></span>
                      </div>
                    )}
                    
                    {/* Recomendação */}
                    {recommendedTime && recommendedTime !== service?.duration && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          <span>Recomendado: <strong>{recommendedTime} min</strong></span>
                        </div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="h-7 text-xs"
                          onClick={applyRecommendedTime}
                        >
                          Aplicar
                        </Button>
                      </div>
                    )}
                    
                    {/* Status da eficiência */}
                    {timeEfficiency.status !== 'unknown' && (
                      <Alert className={`py-2 mt-2 ${
                        timeEfficiency.status === 'optimal' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                          : timeEfficiency.status === 'too_short'
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-blue-50 text-blue-800 border-blue-200'
                      }`}>
                        <div className="flex items-center gap-2">
                          {timeEfficiency.status === 'optimal' ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : timeEfficiency.status === 'too_short' ? (
                            <AlertTriangle className="h-4 w-4" />
                          ) : (
                            <Info className="h-4 w-4" />
                          )}
                          <AlertTitle className="text-xs font-medium">{timeEfficiency.message}</AlertTitle>
                        </div>
                      </Alert>
                    )}
                  </div>
                </div>
              )}
              
              {/* Controle de tempo de execução */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base">Tempo de Execução</Label>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-lg font-semibold">{executionTime} min</span>
                  </div>
                </div>
                
                <Slider
                  value={[executionTime]}
                  min={15}
                  max={service ? Math.max(service.duration * 2, 120) : 120}
                  step={15}
                  onValueChange={(values) => setExecutionTime(values[0])}
                />
                
                {/* Indicador de diferença percentual */}
                {isCustomized && (
                  <div className="flex items-center justify-center">
                    <Badge variant={percentageDiff > 0 ? "outline" : "secondary"} className={
                      percentageDiff > 0 
                        ? percentageDiff > 30 ? 'bg-orange-100 text-orange-800 hover:bg-orange-100' : 'bg-blue-50 text-blue-800 hover:bg-blue-50'
                        : 'bg-green-100 text-green-800 hover:bg-green-100'
                    }>
                      {percentageDiff > 0 
                        ? `${percentageDiff}% mais tempo que o padrão` 
                        : `${Math.abs(percentageDiff)}% menos tempo que o padrão`}
                    </Badge>
                  </div>
                )}
                
                {/* Alerta de tempo muito curto */}
                {service && executionTime < service.duration * 0.7 && (
                  <Alert variant="destructive" className="py-2">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle className="text-xs">Tempo muito curto</AlertTitle>
                    <AlertDescription className="text-xs">
                      Você configurou um tempo {Math.abs(percentageDiff)}% menor que o padrão. 
                      Isso pode afetar a qualidade do seu serviço.
                    </AlertDescription>
                  </Alert>
                )}
                
                {/* Alerta de tempo muito longo que pode afetar agendamentos */}
                {service && executionTime > service.duration * 1.5 && (
                  <Alert className="py-2 bg-blue-50 text-blue-800 border-blue-200">
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Tempo {percentageDiff}% maior que o padrão pode reduzir sua disponibilidade de agendamentos.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Controle de Disponibilidade */}
              <div className="flex items-center justify-between space-x-2">
                <Label className="text-base" htmlFor="service-status">
                  Disponibilizar este serviço
                </Label>
                <Switch
                  id="service-status"
                  checked={isActive}
                  onCheckedChange={setIsActive}
                />
              </div>
              
              {/* Botão de Restaurar Padrão */}
              {providerServiceId && (
                <div className="flex justify-center">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => resetMutation.mutate()}
                    disabled={isSaving}
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Restaurar tempo padrão
                  </Button>
                </div>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button 
            onClick={() => saveMutation.mutate()} 
            disabled={isLoading || isSaving}
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}