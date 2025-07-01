import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Copy, Info, Check } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface TimeRange {
  start: string;
  end: string;
}

interface WeekDay {
  id: number;
  name: string;
  isWorking: boolean;
  workHours: TimeRange[];
  breakHours: TimeRange[];
}

interface WeeklyScheduleProps {
  initialSchedule?: WeekDay[];
  onSave: (schedule: WeekDay[]) => void;
}

// Generate time options in 15-minute increments
const generateTimeOptions = () => {
  const options = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const formattedHour = hour.toString().padStart(2, '0');
      const formattedMinute = minute.toString().padStart(2, '0');
      options.push(`${formattedHour}:${formattedMinute}`);
    }
  }
  return options;
};

const timeOptions = generateTimeOptions();

// Default weekly schedule
const defaultWeeklySchedule: WeekDay[] = [
  { id: 0, name: 'Domingo', isWorking: false, workHours: [{ start: '09:00', end: '17:00' }], breakHours: [{ start: '12:00', end: '13:00' }] },
  { id: 1, name: 'Segunda-feira', isWorking: true, workHours: [{ start: '09:00', end: '17:00' }], breakHours: [{ start: '12:00', end: '13:00' }] },
  { id: 2, name: 'Terça-feira', isWorking: true, workHours: [{ start: '09:00', end: '17:00' }], breakHours: [{ start: '12:00', end: '13:00' }] },
  { id: 3, name: 'Quarta-feira', isWorking: true, workHours: [{ start: '09:00', end: '17:00' }], breakHours: [{ start: '12:00', end: '13:00' }] },
  { id: 4, name: 'Quinta-feira', isWorking: true, workHours: [{ start: '09:00', end: '17:00' }], breakHours: [{ start: '12:00', end: '13:00' }] },
  { id: 5, name: 'Sexta-feira', isWorking: true, workHours: [{ start: '09:00', end: '17:00' }], breakHours: [{ start: '12:00', end: '13:00' }] },
  { id: 6, name: 'Sábado', isWorking: true, workHours: [{ start: '09:00', end: '12:00' }], breakHours: [] },
];

export const WeeklySchedule: React.FC<WeeklyScheduleProps> = ({ 
  initialSchedule = defaultWeeklySchedule,
  onSave 
}) => {
  const { toast } = useToast();
  const [schedule, setSchedule] = useState<WeekDay[]>(initialSchedule);
  const [selectedDayForCopy, setSelectedDayForCopy] = useState<number>(1); // Default to Monday
  
  // Update workday toggle
  const toggleWorkDay = (dayId: number, isWorking: boolean) => {
    setSchedule(prev => 
      prev.map(day => 
        day.id === dayId ? { ...day, isWorking } : day
      )
    );
  };
  
  // Update work hours
  const updateWorkHours = (dayId: number, rangeIndex: number, field: 'start' | 'end', value: string) => {
    setSchedule(prev => 
      prev.map(day => {
        if (day.id === dayId) {
          const updatedWorkHours = [...day.workHours];
          updatedWorkHours[rangeIndex] = { 
            ...updatedWorkHours[rangeIndex], 
            [field]: value 
          };
          return { ...day, workHours: updatedWorkHours };
        }
        return day;
      })
    );
  };
  
  // Add a new work hours block
  const addWorkHoursBlock = (dayId: number) => {
    setSchedule(prev => 
      prev.map(day => {
        if (day.id === dayId) {
          // Use last block's end time as the start time for the new block, if any
          let startTime = '14:00';
          let endTime = '18:00';
          
          if (day.workHours.length > 0) {
            const lastBlock = day.workHours[day.workHours.length - 1];
            startTime = lastBlock.end;
            
            // Calculate end time (1 hour after start)
            const [hours, minutes] = lastBlock.end.split(':').map(Number);
            const endHours = (hours + 1) % 24;
            endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          }
          
          return { 
            ...day, 
            workHours: [...day.workHours, { start: startTime, end: endTime }] 
          };
        }
        return day;
      })
    );
  };
  
  // Remove a work hours block
  const removeWorkHoursBlock = (dayId: number, rangeIndex: number) => {
    setSchedule(prev => 
      prev.map(day => {
        if (day.id === dayId) {
          const updatedWorkHours = [...day.workHours];
          updatedWorkHours.splice(rangeIndex, 1);
          return { ...day, workHours: updatedWorkHours };
        }
        return day;
      })
    );
  };
  
  // Update break hours
  const updateBreakHours = (dayId: number, rangeIndex: number, field: 'start' | 'end', value: string) => {
    setSchedule(prev => 
      prev.map(day => {
        if (day.id === dayId) {
          const updatedBreakHours = [...day.breakHours];
          updatedBreakHours[rangeIndex] = { 
            ...updatedBreakHours[rangeIndex], 
            [field]: value 
          };
          return { ...day, breakHours: updatedBreakHours };
        }
        return day;
      })
    );
  };
  
  // Add a new break hours block
  const addBreakHours = (dayId: number) => {
    setSchedule(prev => 
      prev.map(day => {
        if (day.id === dayId) {
          return { 
            ...day, 
            breakHours: [...day.breakHours, { start: '12:00', end: '13:00' }] 
          };
        }
        return day;
      })
    );
  };
  
  // Remove a break hours block
  const removeBreakHours = (dayId: number, rangeIndex: number) => {
    setSchedule(prev => 
      prev.map(day => {
        if (day.id === dayId) {
          const updatedBreakHours = [...day.breakHours];
          updatedBreakHours.splice(rangeIndex, 1);
          return { ...day, breakHours: updatedBreakHours };
        }
        return day;
      })
    );
  };

  // Copy schedule from one day to others
  const copyDaySchedule = () => {
    const sourceDayId = Number(selectedDayForCopy);
    const sourceDay = schedule.find(day => day.id === sourceDayId);
    
    if (!sourceDay) {
      toast({
        title: "Erro ao copiar agenda",
        description: "Dia de origem não encontrado",
        variant: "destructive"
      });
      return;
    }
    
    // Create a copy of the schedule with the source day's hours
    setSchedule(prev => 
      prev.map(day => {
        if (day.id !== sourceDayId && day.isWorking) {
          return {
            ...day,
            workHours: [...sourceDay.workHours],
            breakHours: [...sourceDay.breakHours]
          };
        }
        return day;
      })
    );
    
    toast({
      title: "Agenda copiada",
      description: `Agenda de ${sourceDay.name} copiada para os outros dias úteis.`
    });
  };
  
  // Save the schedule
  const handleSave = () => {
    // Validate schedule
    let isValid = true;
    const errors = [];
    
    schedule.forEach(day => {
      if (day.isWorking) {
        // Ensure each day has at least one working period
        if (day.workHours.length === 0) {
          isValid = false;
          errors.push(`${day.name} não tem um horário de trabalho definido.`);
        }
        
        // Validate that start times are before end times
        day.workHours.forEach((block, index) => {
          if (block.start >= block.end) {
            isValid = false;
            errors.push(`${day.name}: O horário de início deve ser anterior ao de término no bloco ${index + 1}.`);
          }
        });
        
        // Validate break times
        day.breakHours.forEach((block, index) => {
          if (block.start >= block.end) {
            isValid = false;
            errors.push(`${day.name}: O intervalo ${index + 1} tem horário de início posterior ou igual ao de término.`);
          }
        });
      }
    });
    
    if (!isValid) {
      toast({
        title: "Erro ao salvar agenda",
        description: errors.join(" "),
        variant: "destructive"
      });
      return;
    }
    
    onSave(schedule);
    toast({
      title: "Agenda salva",
      description: "Sua agenda foi atualizada com sucesso!"
    });
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Agenda Semanal</CardTitle>
          <CardDescription>Configure seu horário de atendimento para cada dia da semana</CardDescription>
          
          <div className="mt-4 border rounded-lg p-3 bg-muted/20">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1">
                <Label htmlFor="copy-day">Copiar agenda de:</Label>
                <Select 
                  value={selectedDayForCopy.toString()} 
                  onValueChange={value => setSelectedDayForCopy(Number(value))}
                >
                  <SelectTrigger id="copy-day" className="w-full">
                    <SelectValue placeholder="Selecione o dia" />
                  </SelectTrigger>
                  <SelectContent>
                    {schedule.filter(day => day.isWorking).map(day => (
                      <SelectItem key={day.id} value={day.id.toString()}>
                        {day.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                variant="outline" 
                className="mt-1 sm:mt-6"
                onClick={copyDaySchedule}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copiar para outros dias
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {schedule.map(day => (
              <Card key={day.id} className={!day.isWorking ? "opacity-75" : ""}>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Switch 
                        id={`day-${day.id}`}
                        checked={day.isWorking}
                        onCheckedChange={value => toggleWorkDay(day.id, value)}
                      />
                      <Label htmlFor={`day-${day.id}`} className="text-base font-semibold">
                        {day.name}
                      </Label>
                      {!day.isWorking && <Badge variant="outline">Folga</Badge>}
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className={day.isWorking ? "" : "hidden"}>
                  <div>
                    <h4 className="text-sm font-medium mb-2 text-muted-foreground">Horários de trabalho:</h4>
                    
                    <div className="space-y-3">
                      {day.workHours.map((workBlock, index) => (
                        <div key={`work-${day.id}-${index}`} className="flex flex-wrap items-center gap-2">
                          <div className="grid grid-cols-2 gap-2 flex-1">
                            <div className="flex-1">
                              <Select
                                value={workBlock.start}
                                onValueChange={value => updateWorkHours(day.id, index, 'start', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Início" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeOptions.map(time => (
                                    <SelectItem key={`start-${day.id}-${index}-${time}`} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex-1">
                              <Select
                                value={workBlock.end}
                                onValueChange={value => updateWorkHours(day.id, index, 'end', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Fim" />
                                </SelectTrigger>
                                <SelectContent>
                                  {timeOptions.map(time => (
                                    <SelectItem key={`end-${day.id}-${index}-${time}`} value={time}>
                                      {time}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          {day.workHours.length > 1 && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeWorkHoursBlock(day.id, index)}
                              className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      ))}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => addWorkHoursBlock(day.id)}
                        className="mt-2"
                      >
                        + Adicionar outro período
                      </Button>
                    </div>
                    
                    <h4 className="text-sm font-medium mt-4 mb-2 text-muted-foreground">Intervalos:</h4>
                    
                    <div className="space-y-3">
                      {day.breakHours.length === 0 ? (
                        <div className="text-sm text-muted-foreground italic">
                          Nenhum intervalo adicionado
                        </div>
                      ) : (
                        day.breakHours.map((breakBlock, index) => (
                          <div key={`break-${day.id}-${index}`} className="flex flex-wrap items-center gap-2">
                            <div className="grid grid-cols-2 gap-2 flex-1">
                              <div className="flex-1">
                                <Select
                                  value={breakBlock.start}
                                  onValueChange={value => updateBreakHours(day.id, index, 'start', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Início" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map(time => (
                                      <SelectItem key={`break-start-${day.id}-${index}-${time}`} value={time}>
                                        {time}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="flex-1">
                                <Select
                                  value={breakBlock.end}
                                  onValueChange={value => updateBreakHours(day.id, index, 'end', value)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Fim" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {timeOptions.map(time => (
                                      <SelectItem key={`break-end-${day.id}-${index}-${time}`} value={time}>
                                        {time}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => removeBreakHours(day.id, index)}
                              className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            >
                              <AlertCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        ))
                      )}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => addBreakHours(day.id)}
                        className="mt-2"
                      >
                        + Adicionar intervalo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="mt-6">
            <Alert className="bg-primary/5 border-primary/20">
              <Info className="h-4 w-4" />
              <AlertDescription>
                Os slots de tempo para agendamento serão gerados automaticamente com base na sua disponibilidade e nos 
                horários de seus serviços.
              </AlertDescription>
            </Alert>
            
            <Button onClick={handleSave} className="w-full mt-4">
              <Check className="h-4 w-4 mr-2" />
              Salvar Configurações
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};