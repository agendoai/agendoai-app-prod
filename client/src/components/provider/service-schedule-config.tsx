import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Info, Check, Clock, Settings, CalendarRange } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface Service {
  id: number;
  name: string;
  duration: number;
  description?: string;
}

interface TimeRange {
  start: string;
  end: string;
}

interface ServiceScheduleConfig {
  serviceId: number;
  restrictToTimeRanges: boolean;
  timeRanges: TimeRange[];
  daysOfWeek: number[]; // 0-6 para domingo-sábado
  useIntelligentScheduling: boolean;
  schedulingPreferences: {
    prioritizeEvenSpacing: boolean;
    prioritizeConsecutiveSlots: boolean;
    timeOfDayPreference: 'morning' | 'afternoon' | 'evening' | null;
  };
}

interface ServiceScheduleConfigProps {
  services: Service[];
  initialConfigs?: ServiceScheduleConfig[];
  onSave: (configs: ServiceScheduleConfig[]) => void;
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

const weekDays = [
  { id: 0, name: 'Domingo' },
  { id: 1, name: 'Segunda-feira' },
  { id: 2, name: 'Terça-feira' },
  { id: 3, name: 'Quarta-feira' },
  { id: 4, name: 'Quinta-feira' },
  { id: 5, name: 'Sexta-feira' },
  { id: 6, name: 'Sábado' }
];

export const ServiceScheduleConfig: React.FC<ServiceScheduleConfigProps> = ({
  services,
  initialConfigs = [],
  onSave
}) => {
  const { toast } = useToast();
  
  // Create default config for each service if not provided
  const defaultConfigs = services.map(service => {
    const existingConfig = initialConfigs.find(config => config.serviceId === service.id);
    
    if (existingConfig) {
      return existingConfig;
    }
    
    return {
      serviceId: service.id,
      restrictToTimeRanges: false,
      timeRanges: [{ start: '09:00', end: '17:00' }],
      daysOfWeek: [1, 2, 3, 4, 5], // Segunda a sexta por padrão
      useIntelligentScheduling: true,
      schedulingPreferences: {
        prioritizeEvenSpacing: true,
        prioritizeConsecutiveSlots: false,
        timeOfDayPreference: null
      }
    };
  });
  
  const [configs, setConfigs] = useState<ServiceScheduleConfig[]>(defaultConfigs);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(
    services.length > 0 ? services[0].id : null
  );
  
  // Get the currently selected service config
  const selectedConfig = configs.find(config => config.serviceId === selectedServiceId);
  const selectedService = services.find(service => service.id === selectedServiceId);
  
  // Handle service selection
  const handleServiceChange = (serviceId: string) => {
    setSelectedServiceId(Number(serviceId));
  };
  
  // Update config for a specific service
  const updateServiceConfig = (
    serviceId: number, 
    field: keyof ServiceScheduleConfig, 
    value: any
  ) => {
    setConfigs(prev => 
      prev.map(config => 
        config.serviceId === serviceId 
          ? { ...config, [field]: value } 
          : config
      )
    );
  };
  
  // Update scheduling preferences
  const updateSchedulingPreference = (
    serviceId: number,
    field: keyof ServiceScheduleConfig['schedulingPreferences'],
    value: any
  ) => {
    setConfigs(prev => 
      prev.map(config => 
        config.serviceId === serviceId 
          ? { 
              ...config, 
              schedulingPreferences: {
                ...config.schedulingPreferences,
                [field]: value
              }
            } 
          : config
      )
    );
  };
  
  // Toggle day of week
  const toggleDayOfWeek = (serviceId: number, dayId: number) => {
    setConfigs(prev => 
      prev.map(config => {
        if (config.serviceId === serviceId) {
          const daysOfWeek = [...config.daysOfWeek];
          
          if (daysOfWeek.includes(dayId)) {
            // Remove day
            return {
              ...config,
              daysOfWeek: daysOfWeek.filter(d => d !== dayId)
            };
          } else {
            // Add day
            return {
              ...config,
              daysOfWeek: [...daysOfWeek, dayId].sort()
            };
          }
        }
        return config;
      })
    );
  };
  
  // Add time range
  const addTimeRange = (serviceId: number) => {
    setConfigs(prev => 
      prev.map(config => {
        if (config.serviceId === serviceId) {
          let startTime = '14:00';
          let endTime = '18:00';
          
          if (config.timeRanges.length > 0) {
            const lastRange = config.timeRanges[config.timeRanges.length - 1];
            
            // Try to create a non-overlapping range after the last one
            const [hours, minutes] = lastRange.end.split(':').map(Number);
            startTime = lastRange.end;
            
            // End time 4 hours after start, or end of day
            const endHours = Math.min(23, hours + 4);
            endTime = `${endHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
          }
          
          return {
            ...config,
            timeRanges: [...config.timeRanges, { start: startTime, end: endTime }]
          };
        }
        return config;
      })
    );
  };
  
  // Remove time range
  const removeTimeRange = (serviceId: number, rangeIndex: number) => {
    setConfigs(prev => 
      prev.map(config => {
        if (config.serviceId === serviceId) {
          const updatedRanges = [...config.timeRanges];
          updatedRanges.splice(rangeIndex, 1);
          return {
            ...config,
            timeRanges: updatedRanges
          };
        }
        return config;
      })
    );
  };
  
  // Update time range
  const updateTimeRange = (
    serviceId: number,
    rangeIndex: number,
    field: 'start' | 'end',
    value: string
  ) => {
    setConfigs(prev => 
      prev.map(config => {
        if (config.serviceId === serviceId) {
          const updatedRanges = [...config.timeRanges];
          updatedRanges[rangeIndex] = {
            ...updatedRanges[rangeIndex],
            [field]: value
          };
          return {
            ...config,
            timeRanges: updatedRanges
          };
        }
        return config;
      })
    );
  };
  
  // Save all configurations
  const handleSave = () => {
    // Validate configs
    let isValid = true;
    let errorMessage = '';
    
    configs.forEach(config => {
      // If restricting to time ranges, ensure there's at least one range
      if (config.restrictToTimeRanges && config.timeRanges.length === 0) {
        isValid = false;
        const service = services.find(s => s.id === config.serviceId);
        errorMessage += `${service?.name} não tem intervalo de horário definido. `;
      }
      
      // Ensure time ranges are valid (start < end)
      config.timeRanges.forEach((range, index) => {
        if (range.start >= range.end) {
          isValid = false;
          const service = services.find(s => s.id === config.serviceId);
          errorMessage += `${service?.name}: Intervalo ${index + 1} tem horário de início posterior ou igual ao de término. `;
        }
      });
      
      // Ensure there's at least one day selected
      if (config.daysOfWeek.length === 0) {
        isValid = false;
        const service = services.find(s => s.id === config.serviceId);
        errorMessage += `${service?.name} não tem dias da semana selecionados. `;
      }
    });
    
    if (!isValid) {
      toast({
        title: "Erro ao salvar configurações",
        description: errorMessage,
        variant: "destructive"
      });
      return;
    }
    
    onSave(configs);
    toast({
      title: "Configurações salvas",
      description: "As configurações de agenda por serviço foram atualizadas com sucesso."
    });
  };
  
  if (!selectedConfig || !selectedService) {
    return (
      <div className="flex items-center justify-center p-8">
        <p className="text-muted-foreground">Nenhum serviço disponível para configuração.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configuração por Serviço</CardTitle>
          <CardDescription>
            Defina horários específicos e preferências para cada serviço que você oferece
          </CardDescription>
          
          <div className="mt-4">
            <Label htmlFor="service-select">Selecione o serviço:</Label>
            <Select 
              value={selectedServiceId?.toString() || ''} 
              onValueChange={handleServiceChange}
            >
              <SelectTrigger id="service-select" className="w-full">
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
        </CardHeader>
        
        <CardContent>
          <Tabs defaultValue="time-ranges">
            <TabsList className="mb-4">
              <TabsTrigger value="time-ranges">Horários Específicos</TabsTrigger>
              <TabsTrigger value="intelligent">Agendamento Inteligente</TabsTrigger>
            </TabsList>
            
            <TabsContent value="time-ranges" className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch 
                    id="restrict-times"
                    checked={selectedConfig.restrictToTimeRanges}
                    onCheckedChange={value => 
                      updateServiceConfig(selectedService.id, 'restrictToTimeRanges', value)
                    }
                  />
                  <Label htmlFor="restrict-times">
                    Restringir {selectedService.name} a horários específicos
                  </Label>
                </div>
              </div>
              
              {selectedConfig.restrictToTimeRanges && (
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      Períodos de atendimento para {selectedService.name}
                    </h3>
                    
                    <div className="space-y-3">
                      {selectedConfig.timeRanges.map((range, index) => (
                        <div key={`range-${index}`} className="flex items-center gap-2">
                          <div className="grid grid-cols-2 gap-2 flex-1">
                            <Select
                              value={range.start}
                              onValueChange={value => 
                                updateTimeRange(selectedService.id, index, 'start', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Início" />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions.map(time => (
                                  <SelectItem key={`start-${index}-${time}`} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            
                            <Select
                              value={range.end}
                              onValueChange={value => 
                                updateTimeRange(selectedService.id, index, 'end', value)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Fim" />
                              </SelectTrigger>
                              <SelectContent>
                                {timeOptions.map(time => (
                                  <SelectItem key={`end-${index}-${time}`} value={time}>
                                    {time}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          
                          {selectedConfig.timeRanges.length > 1 && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => removeTimeRange(selectedService.id, index)}
                              className="text-destructive hover:text-destructive/80 hover:bg-destructive/10"
                            >
                              <span className="sr-only">Remover</span>
                              ×
                            </Button>
                          )}
                        </div>
                      ))}
                      
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => addTimeRange(selectedService.id)}
                      >
                        + Adicionar período
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <CalendarRange className="h-4 w-4" />
                      Dias da semana para {selectedService.name}
                    </h3>
                    
                    <div className="flex flex-wrap gap-2 mt-2">
                      {weekDays.map(day => (
                        <Badge
                          key={day.id}
                          variant={selectedConfig.daysOfWeek.includes(day.id) ? "default" : "outline"}
                          className="cursor-pointer"
                          onClick={() => toggleDayOfWeek(selectedService.id, day.id)}
                        >
                          {day.name.substring(0, 3)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              
              {!selectedConfig.restrictToTimeRanges && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    Este serviço seguirá sua agenda regular. Configure restrições de horário se quiser 
                    oferecer este serviço apenas em horários específicos.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
            
            <TabsContent value="intelligent" className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Switch 
                    id="intelligent-scheduling"
                    checked={selectedConfig.useIntelligentScheduling}
                    onCheckedChange={value => 
                      updateServiceConfig(selectedService.id, 'useIntelligentScheduling', value)
                    }
                  />
                  <Label htmlFor="intelligent-scheduling">
                    Usar agendamento inteligente para {selectedService.name}
                  </Label>
                </div>
              </div>
              
              {selectedConfig.useIntelligentScheduling && (
                <div className="space-y-4 mt-4">
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      Preferências de agendamento
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Switch 
                          id="even-spacing"
                          checked={selectedConfig.schedulingPreferences.prioritizeEvenSpacing}
                          onCheckedChange={value => 
                            updateSchedulingPreference(selectedService.id, 'prioritizeEvenSpacing', value)
                          }
                        />
                        <Label htmlFor="even-spacing">
                          Distribuir slots uniformemente ao longo do dia
                        </Label>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Switch 
                          id="consecutive-slots"
                          checked={selectedConfig.schedulingPreferences.prioritizeConsecutiveSlots}
                          onCheckedChange={value => 
                            updateSchedulingPreference(selectedService.id, 'prioritizeConsecutiveSlots', value)
                          }
                        />
                        <Label htmlFor="consecutive-slots">
                          Priorizar slots consecutivos para atendimentos sequenciais
                        </Label>
                      </div>
                      
                      <div className="mt-2">
                        <Label htmlFor="time-preference" className="mb-1 block">
                          Preferência de período do dia:
                        </Label>
                        <Select
                          value={selectedConfig.schedulingPreferences.timeOfDayPreference || 'none'}
                          onValueChange={value => 
                            updateSchedulingPreference(
                              selectedService.id, 
                              'timeOfDayPreference', 
                              value === 'none' ? null : value
                            )
                          }
                        >
                          <SelectTrigger id="time-preference">
                            <SelectValue placeholder="Selecione a preferência" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Sem preferência</SelectItem>
                            <SelectItem value="morning">Manhã</SelectItem>
                            <SelectItem value="afternoon">Tarde</SelectItem>
                            <SelectItem value="evening">Noite</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              {!selectedConfig.useIntelligentScheduling && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    O agendamento inteligente analisa padrões, preferências e demanda para otimizar sua agenda.
                    Ative esta opção para que o AgendoAI possa sugerir os melhores horários para este serviço.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
          
          <Button onClick={handleSave} className="w-full mt-6">
            <Check className="h-4 w-4 mr-2" />
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};