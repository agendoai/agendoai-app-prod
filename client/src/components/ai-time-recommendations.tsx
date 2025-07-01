import React, { useEffect, useState } from 'react';
import { apiRequest } from '@/lib/queryClient';
import { Loader2, BrainCircuit, Clock, Star, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  availabilityId?: number;
}

export interface TimeSlotRecommendation {
  slot: {
    startTime: string;
    endTime: string;
  };
  score: number;
  reason: string;
  tags: string[];
}

interface AITimeRecommendationsProps {
  providerId: number;
  serviceId: number;
  date: string;
  availableTimeSlots: TimeSlot[];
  onSelectTimeSlot: (slot: TimeSlot) => void;
  selectedSlot: TimeSlot | null;
}

export function AITimeRecommendations({
  providerId,
  serviceId,
  date,
  availableTimeSlots,
  onSelectTimeSlot,
  selectedSlot
}: AITimeRecommendationsProps) {
  const [recommendations, setRecommendations] = useState<TimeSlotRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<'ai' | 'simple' | 'error'>('ai');
  const [expanded, setExpanded] = useState(false);
  
  useEffect(() => {
    // Apenas carregar recomendações quando temos slots disponíveis
    if (availableTimeSlots.length === 0) {
      setLoading(false);
      return;
    }
    
    const fetchRecommendations = async () => {
      try {
        setLoading(true);
        
        const response = await apiRequest(
          'GET', 
          `/api/providers/${providerId}/ai-recommendations?date=${date}&serviceId=${serviceId}`
        );
        
        const data = await response.json();
        
        if (data.recommendations) {
          setRecommendations(data.recommendations);
          setSource(data.source || 'simple');
        } else {
          setRecommendations([]);
        }
      } catch (error) {
        console.error('Erro ao obter recomendações:', error);
        setRecommendations([]);
        setSource('error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchRecommendations();
  }, [providerId, serviceId, date, availableTimeSlots]);
  
  // Mapeamento de tags para cores
  const tagColors: Record<string, string> = {
    'manhã': 'bg-yellow-100 text-yellow-800',
    'tarde': 'bg-blue-100 text-blue-800',
    'noite': 'bg-indigo-100 text-indigo-800',
    'horário popular': 'bg-pink-100 text-pink-800',
    'menos ocupado': 'bg-green-100 text-green-800',
    'recomendado': 'bg-purple-100 text-purple-800',
    'produtivo': 'bg-cyan-100 text-cyan-800',
    'período ótimo': 'bg-emerald-100 text-emerald-800',
    'horário de almoço': 'bg-orange-100 text-orange-800',
    'após expediente': 'bg-violet-100 text-violet-800',
    'horário cheio': 'bg-slate-100 text-slate-800'
  };
  
  // Filtrar apenas recomendações com score alto
  const topRecommendations = recommendations
    .filter((rec: TimeSlotRecommendation) => rec.score >= 70)
    .slice(0, expanded ? undefined : 3);
  
  const findMatchingSlot = (recommendation: TimeSlotRecommendation): TimeSlot | undefined => {
    return availableTimeSlots.find(slot => 
      slot.startTime === recommendation.slot.startTime && 
      slot.endTime === recommendation.slot.endTime &&
      slot.isAvailable
    );
  };
  
  const isSelectedRecommendation = (recommendation: TimeSlotRecommendation): boolean => {
    return selectedSlot !== null && 
      selectedSlot.startTime === recommendation.slot.startTime && 
      selectedSlot.endTime === recommendation.slot.endTime;
  };
  
  const handleSelectRecommendation = (recommendation: TimeSlotRecommendation) => {
    const matchingSlot = findMatchingSlot(recommendation);
    if (matchingSlot) {
      onSelectTimeSlot(matchingSlot);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-6 space-y-3 text-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Analisando os melhores horários...</p>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null; // Não mostrar nada se não houver recomendações
  }

  return (
    <Card className="mb-6 bg-primary/5 border-primary/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            <CardTitle className="text-base font-medium">Recomendações de Horários</CardTitle>
          </div>
          
          {source === 'ai' ? (
            <Badge variant="outline" className="bg-primary/10 text-xs">
              Inteligente
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-secondary/20 text-xs">
              Simplificado
            </Badge>
          )}
        </div>
        <CardDescription>
          {source === 'ai' 
            ? 'Horários recomendados com base em padrões de agendamento e preferências' 
            : 'Sugestões de horários baseadas em disponibilidade'}
        </CardDescription>
      </CardHeader>
      
      <CardContent className="pb-3">
        <div className="space-y-3">
          {topRecommendations.length > 0 ? (
            topRecommendations.map((recommendation: TimeSlotRecommendation, index: number) => {
              const matchingSlot = findMatchingSlot(recommendation);
              const isSelected = isSelectedRecommendation(recommendation);
              const isAvailable = !!matchingSlot;
              
              if (!isAvailable) return null;
              
              return (
                <div 
                  key={index}
                  className={cn(
                    "p-3 rounded-lg border transition-colors",
                    isSelected 
                      ? "bg-primary border-primary text-primary-foreground" 
                      : "bg-card hover:bg-accent/50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Clock className={cn("h-4 w-4", isSelected ? "text-primary-foreground" : "text-primary")} />
                      <span className="font-medium">
                        {recommendation.slot.startTime} - {recommendation.slot.endTime}
                      </span>
                    </div>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div className="flex items-center gap-1.5">
                            <Star className={cn(
                              "h-4 w-4", 
                              recommendation.score >= 85 
                                ? "fill-yellow-400 text-yellow-400" 
                                : isSelected 
                                  ? "text-primary-foreground" 
                                  : "text-muted-foreground"
                            )} />
                            <span className={cn(
                              "text-sm font-medium",
                              isSelected ? "text-primary-foreground" : "text-muted-foreground"
                            )}>
                              {recommendation.score}%
                            </span>
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Pontuação de recomendação</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  
                  <div className="mb-2.5">
                    <Progress value={recommendation.score} className="h-1.5" />
                  </div>
                  
                  <p className={cn(
                    "text-sm mb-2.5", 
                    isSelected ? "text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {recommendation.reason}
                  </p>
                  
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {recommendation.tags.map((tag, tagIndex) => (
                      <div 
                        key={tagIndex}
                        className={cn(
                          "text-xs px-2 py-0.5 rounded-full flex items-center gap-1", 
                          isSelected 
                            ? "bg-primary-foreground/20 text-primary-foreground" 
                            : tagColors[tag] || "bg-gray-100 text-gray-800"
                        )}
                      >
                        <Tag className="h-3 w-3" />
                        {tag}
                      </div>
                    ))}
                  </div>
                  
                  <Button
                    variant={isSelected ? "secondary" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => handleSelectRecommendation(recommendation)}
                  >
                    {isSelected ? "Selecionado" : "Selecionar Horário"}
                  </Button>
                </div>
              );
            })
          ) : (
            <p className="text-sm text-muted-foreground text-center py-2">
              Não foi possível gerar recomendações para os horários disponíveis.
            </p>
          )}
        </div>
      </CardContent>
      
      {recommendations.length > 3 && (
        <CardFooter>
          <Button 
            variant="ghost" 
            size="sm" 
            className="w-full text-xs" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? "Mostrar menos" : `Mostrar mais ${recommendations.length - 3} recomendações`}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}