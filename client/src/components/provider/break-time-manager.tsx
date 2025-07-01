import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Clock, Plus, Trash2 } from "lucide-react";
import { ProviderBreak } from "@shared/schema.ts";

// Dias da semana
const weekDays = [
  { value: 0, label: "Domingo" },
  { value: 1, label: "Segunda-feira" },
  { value: 2, label: "Terça-feira" },
  { value: 3, label: "Quarta-feira" },
  { value: 4, label: "Quinta-feira" },
  { value: 5, label: "Sexta-feira" },
  { value: 6, label: "Sábado" },
];

export default function BreakTimeManager() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState<number>(1); // Segunda-feira como padrão
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Estados do formulário
  const [newBreak, setNewBreak] = useState({
    name: '',
    startTime: '12:00',
    endTime: '13:00',
    dayOfWeek: selectedDay,
    isRecurring: true,
    date: ''
  });
  
  // Carregar intervalos do prestador
  const { data: breaks, isLoading } = useQuery({
    queryKey: ["/api/providers", user?.id, "breaks"],
    queryFn: async () => {
      if (!user) return [];
      const response = await apiRequest("GET", `/api/providers/${user.id}/breaks`);
      return await response.json();
    },
    enabled: !!user
  });
  
  // Intervalos filtrados por dia da semana selecionado
  const filteredBreaks = breaks?.filter(
    (breakItem: ProviderBreak) => 
      breakItem.isRecurring && breakItem.dayOfWeek === selectedDay
  ) || [];
  
  // Mutation para criar novo intervalo
  const createBreakMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/provider-breaks", data);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Intervalo criado com sucesso",
        description: "O intervalo foi adicionado à sua agenda",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/providers", user?.id, "breaks"] });
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao criar intervalo",
        description: error.message || "Não foi possível criar o intervalo",
        variant: "destructive",
      });
    }
  });
  
  // Mutation para excluir intervalo
  const deleteBreakMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest("DELETE", `/api/provider-breaks/${id}`);
      return await response.json();
    },
    onSuccess: () => {
      toast({
        title: "Intervalo removido",
        description: "O intervalo foi removido da sua agenda",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/providers", user?.id, "breaks"] });
    },
    onError: (error: any) => {
      toast({
        title: "Erro ao remover intervalo",
        description: error.message || "Não foi possível remover o intervalo",
        variant: "destructive",
      });
    }
  });
  
  // Resetar formulário
  const resetForm = () => {
    setNewBreak({
      name: '',
      startTime: '12:00',
      endTime: '13:00',
      dayOfWeek: selectedDay,
      isRecurring: true,
      date: ''
    });
  };
  
  // Atualizar dia da semana no formulário quando o seletor mudar
  useEffect(() => {
    setNewBreak(prev => ({ ...prev, dayOfWeek: selectedDay }));
  }, [selectedDay]);
  
  // Lidar com mudanças no formulário
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewBreak(prev => ({ ...prev, [name]: value }));
  };
  
  // Lidar com mudanças no switch de recorrência
  const handleRecurringChange = (checked: boolean) => {
    setNewBreak(prev => ({ ...prev, isRecurring: checked }));
  };
  
  // Enviar formulário
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar formulário
    if (!newBreak.name) {
      toast({
        title: "Erro de validação",
        description: "O nome do intervalo é obrigatório",
        variant: "destructive",
      });
      return;
    }
    
    if (!newBreak.startTime || !newBreak.endTime) {
      toast({
        title: "Erro de validação",
        description: "Os horários de início e fim são obrigatórios",
        variant: "destructive",
      });
      return;
    }
    
    if (newBreak.startTime >= newBreak.endTime) {
      toast({
        title: "Erro de validação",
        description: "O horário de início deve ser anterior ao horário de fim",
        variant: "destructive",
      });
      return;
    }
    
    if (!newBreak.isRecurring && !newBreak.date) {
      toast({
        title: "Erro de validação",
        description: "Para intervalos não recorrentes, a data é obrigatória",
        variant: "destructive",
      });
      return;
    }
    
    // Criar o intervalo
    createBreakMutation.mutate({
      ...newBreak,
      providerId: user?.id
    });
  };
  
  return (
    <Card className="w-full mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-2xl">Intervalos Personalizados</CardTitle>
        <CardDescription>
          Configure intervalos como almoço, café, etc. para que não sejam agendados serviços nestes horários
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
          <div className="flex-1">
            <Label htmlFor="weekday">Dia da semana</Label>
            <Select 
              value={selectedDay.toString()} 
              onValueChange={(value) => setSelectedDay(parseInt(value))}
            >
              <SelectTrigger id="weekday">
                <SelectValue placeholder="Selecione o dia da semana" />
              </SelectTrigger>
              <SelectContent>
                {weekDays.map((day) => (
                  <SelectItem key={day.value} value={day.value.toString()}>
                    {day.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex-none pt-5">
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> 
                  Adicionar Intervalo
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar Intervalo</DialogTitle>
                  <DialogDescription>
                    Configure um novo intervalo na sua agenda
                  </DialogDescription>
                </DialogHeader>
                
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nome do intervalo</Label>
                    <Input
                      id="name"
                      name="name"
                      placeholder="Ex: Almoço, Intervalo, Café..."
                      value={newBreak.name}
                      onChange={handleInputChange}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Horário de início</Label>
                      <Input
                        id="startTime"
                        name="startTime"
                        type="time"
                        value={newBreak.startTime}
                        onChange={handleInputChange}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">Horário de fim</Label>
                      <Input
                        id="endTime"
                        name="endTime"
                        type="time"
                        value={newBreak.endTime}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isRecurring"
                      checked={newBreak.isRecurring}
                      onCheckedChange={handleRecurringChange}
                    />
                    <Label htmlFor="isRecurring">Repetir semanalmente</Label>
                  </div>
                  
                  {!newBreak.isRecurring && (
                    <div className="space-y-2">
                      <Label htmlFor="date">Data específica</Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        value={newBreak.date}
                        onChange={handleInputChange}
                      />
                    </div>
                  )}
                  
                  <DialogFooter>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsDialogOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button 
                      type="submit"
                      disabled={createBreakMutation.isPending}
                    >
                      {createBreakMutation.isPending ? "Salvando..." : "Salvar"}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"></div>
          </div>
        ) : filteredBreaks.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="mx-auto h-12 w-12 opacity-30 mb-2" />
            <p>Nenhum intervalo configurado para {weekDays.find(d => d.value === selectedDay)?.label}</p>
            <p className="text-sm mt-1">Clique em "Adicionar Intervalo" para configurar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredBreaks.map((breakItem: ProviderBreak) => (
              <div 
                key={breakItem.id} 
                className="flex items-center justify-between p-3 border rounded-md"
              >
                <div className="flex items-center">
                  <div className="bg-primary/10 p-2 rounded-md mr-3">
                    <Clock className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-medium">{breakItem.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {breakItem.startTime} - {breakItem.endTime}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteBreakMutation.mutate(breakItem.id)}
                  disabled={deleteBreakMutation.isPending}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="border-t pt-4">
        <p className="text-sm text-muted-foreground">
          Os intervalos configurados serão aplicados automaticamente à sua agenda, bloqueando estes horários para agendamento.
        </p>
      </CardFooter>
    </Card>
  );
}