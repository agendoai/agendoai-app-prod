import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Clock, Info } from 'lucide-react';

export interface SimpleExecutionTimeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialExecutionTime?: number;
  initialBreakTime?: number;
  executionTime?: number;
  breakTime?: number;
  onExecutionTimeChange?: (time: number) => void;
  onBreakTimeChange?: (time: number) => void;
  onSave: (executionTime: number, breakTime: number) => void;
  isPending?: boolean;
  title?: string;
  description?: string;
}

export function SimpleExecutionTimeDialog({
  isOpen,
  onClose,
  initialExecutionTime = 30,
  initialBreakTime = 0,
  executionTime: propExecutionTime,
  breakTime: propBreakTime,
  onExecutionTimeChange,
  onBreakTimeChange,
  onSave,
  isPending = false,
  title = "Definir tempo de execução",
  description = "Defina o tempo necessário para executar este serviço e intervalo após conclusão."
}: SimpleExecutionTimeDialogProps) {
  // Use state for internal management if props aren't provided
  const [localExecutionTime, setLocalExecutionTime] = React.useState(propExecutionTime || initialExecutionTime);
  const [localBreakTime, setLocalBreakTime] = React.useState(propBreakTime || initialBreakTime);
  
  // Update local state if props change
  React.useEffect(() => {
    if (propExecutionTime !== undefined) setLocalExecutionTime(propExecutionTime);
    if (propBreakTime !== undefined) setLocalBreakTime(propBreakTime);
  }, [propExecutionTime, propBreakTime]);
  
  // Handle the changes based on whether external handlers are provided
  const handleExecutionTimeChange = (time: number) => {
    setLocalExecutionTime(time);
    if (onExecutionTimeChange) {
      onExecutionTimeChange(time);
    }
  };
  
  const handleBreakTimeChange = (time: number) => {
    setLocalBreakTime(time);
    if (onBreakTimeChange) {
      onBreakTimeChange(time);
    }
  };
  
  // Handle the save action
  const handleSave = () => {
    onSave(localExecutionTime, localBreakTime);
  };
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="grid gap-2">
            <h4 className="font-medium text-sm">Tempo de execução (minutos)</h4>
            <div className="relative">
              <Clock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="number"
                className="pl-10"
                min="5"
                value={localExecutionTime}
                onChange={(e) => handleExecutionTimeChange(parseInt(e.target.value) || 0)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              Tempo estimado para realizar o serviço completo
            </p>
          </div>
          
          <div className="grid gap-2">
            <h4 className="font-medium text-sm">Tempo de intervalo/pausa (minutos)</h4>
            <Input
              type="number"
              min="0"
              value={localBreakTime}
              onChange={(e) => handleBreakTimeChange(parseInt(e.target.value) || 0)}
            />
            <p className="text-xs text-muted-foreground">
              <Info className="h-3 w-3 inline mr-1" />
              Tempo que você precisa entre este serviço e o próximo
            </p>
          </div>
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancelar
          </Button>
          <Button 
            onClick={(e) => {
              e.preventDefault();
              handleSave();
            }} 
            disabled={isPending}
          >
            {isPending ? "Salvando..." : "Salvar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}