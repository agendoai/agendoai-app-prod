import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format, addDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { Calendar as CalendarIcon, Loader2, Info, BookOpen } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface TimeSlot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
  score?: number;
  reason?: string;
}

interface Service {
  id: number;
  name: string;
  duration: number;
  description?: string;
}

interface SchedulePreviewProps {
  services: Service[];
  fetchTimeSlots: (date: string, serviceId: number) => Promise<TimeSlot[]>;
  onOptimize?: (date: string, serviceId: number) => Promise<void>;
}

export const SchedulePreview: React.FC<SchedulePreviewProps> = ({
  services,
  fetchTimeSlots,
  onOptimize
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    services.length > 0 ? services[0].id : null
  );
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  
  const selectedService = services.find(s => s.id === selectedServiceId);
  
  // Group time slots by hour for better display
  const groupedSlots: Record<string, TimeSlot[]> = {};
  
  timeSlots.forEach(slot => {
    const hour = slot.startTime.substring(0, 2);
    if (!groupedSlots[hour]) {
      groupedSlots[hour] = [];
    }
    groupedSlots[hour].push(slot);
  });
  
  // Fetch time slots when date or service changes
  useEffect(() => {
    const loadTimeSlots = async () => {
      if (!selectedServiceId) return;
      
      const dateString = format(selectedDate, 'yyyy-MM-dd');
      setIsLoading(true);
      
      try {
        const slots = await fetchTimeSlots(dateString, selectedServiceId);
        setTimeSlots(slots);
      } catch (error) {
        console.error('Error fetching time slots:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os horários disponíveis',
          variant: 'destructive',
        });
        setTimeSlots([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTimeSlots();
  }, [selectedDate, selectedServiceId, fetchTimeSlots]);
  
  // Handle service change
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(Number(serviceId));
  };
  
  // Handle date change
  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };
  
  // Handle optimize click
  const handleOptimize = async () => {
    if (!selectedServiceId || !onOptimize) return;
    
    const dateString = format(selectedDate, 'yyyy-MM-dd');
    setIsOptimizing(true);
    
    try {
      await onOptimize(dateString, selectedServiceId);
      toast({
        title: 'Agenda otimizada',
        description: 'Os horários foram otimizados com base em inteligência artificial',
      });
      
      // Reload time slots
      const slots = await fetchTimeSlots(dateString, selectedServiceId);
      setTimeSlots(slots);
    } catch (error) {
      console.error('Error optimizing schedule:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível otimizar a agenda',
        variant: 'destructive',
      });
    } finally {
      setIsOptimizing(false);
    }
  };
  
  // Format time for display
  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':');
    return `${parseInt(hours)}:${minutes}`;
  };
  
  // Get slot quality class based on score
  const getSlotQualityClass = (slot: TimeSlot) => {
    if (slot.score === undefined) return "";
    
    if (slot.score >= 80) {
      return "border-green-500 border-2 bg-green-50 dark:bg-green-900/20";
    } else if (slot.score >= 50) {
      return "border-blue-400 border";
    }
    
    return "";
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Visualização da Agenda</CardTitle>
          <CardDescription>Veja como sua agenda será preenchida com base na configuração</CardDescription>
          
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="preview-service">Serviço:</Label>
              <Select 
                value={selectedServiceId?.toString() || ''} 
                onValueChange={handleServiceChange}
              >
                <SelectTrigger id="preview-service">
                  <SelectValue placeholder="Selecione um serviço" />
                </SelectTrigger>
                <SelectContent>
                  {services.map(service => (
                    <SelectItem key={service.id} value={service.id.toString()}>
                      {service.name} ({service.duration} min)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="md:col-span-2">
              <Label>Data:</Label>
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center mt-1">
                <Button 
                  variant="outline" 
                  className="w-full sm:w-auto justify-start"
                  onClick={() => setSelectedDate(new Date())}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </Button>
                
                <div className="hidden sm:block">
                  <div className="flex gap-2">
                    {[0, 1, 2, 3, 4].map(days => {
                      const date = addDays(new Date(), days);
                      return (
                        <Button
                          key={days}
                          variant={
                            format(date, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                              ? 'default'
                              : 'outline'
                          }
                          size="sm"
                          onClick={() => setSelectedDate(date)}
                        >
                          {format(date, 'dd/MM')}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          <div className="mb-4 flex justify-between items-center">
            <div>
              <h3 className="text-base font-medium">
                {selectedService?.name || 'Serviço'} - {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
              </h3>
              <p className="text-sm text-muted-foreground">
                Duração: {selectedService?.duration || '-'} minutos
              </p>
            </div>
            
            {onOptimize && (
              <Button 
                variant="outline" 
                onClick={handleOptimize}
                disabled={isOptimizing || !selectedServiceId}
              >
                {isOptimizing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <BookOpen className="h-4 w-4 mr-2" />
                )}
                Otimizar com IA
              </Button>
            )}
          </div>
          
          <div className="space-y-6">
            {isLoading ? (
              <div className="flex justify-center items-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : timeSlots.length === 0 ? (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  Nenhum horário disponível para esta data. Verifique suas configurações de agenda.
                </AlertDescription>
              </Alert>
            ) : (
              <div className="grid grid-cols-1">
                <div className="border rounded-lg overflow-hidden">
                  <div className="p-3 bg-muted/50 border-b flex justify-between">
                    <h4 className="font-medium">Horários Gerados</h4>
                    <div className="flex items-center text-xs gap-2">
                      <div className="flex items-center">
                        <span className="block w-3 h-3 border-2 border-green-500 bg-green-50 rounded-sm mr-1"></span>
                        Ótimo
                      </div>
                      <div className="flex items-center">
                        <span className="block w-3 h-3 border border-blue-400 rounded-sm mr-1"></span>
                        Bom
                      </div>
                    </div>
                  </div>
                  
                  <div className="divide-y">
                    {Object.keys(groupedSlots).sort().map(hour => (
                      <div key={hour} className="p-3">
                        <h5 className="text-sm font-medium mb-2">{hour}:00</h5>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                          {groupedSlots[hour].map((slot, index) => (
                            <div 
                              key={`${slot.startTime}-${index}`}
                              className={`
                                border rounded-md p-2 text-sm
                                ${!slot.isAvailable ? 'bg-muted/50 text-muted-foreground' : ''}
                                ${slot.isAvailable ? getSlotQualityClass(slot) : ''}
                              `}
                              title={slot.reason || ''}
                            >
                              <div className="font-medium">{formatTime(slot.startTime)}</div>
                              <div className="text-xs text-muted-foreground">
                                até {formatTime(slot.endTime)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};