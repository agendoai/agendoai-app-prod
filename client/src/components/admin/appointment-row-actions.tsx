import React from 'react';
import { Button } from '@/components/ui/button';
import { Eye, SquarePen, X, Check, MoreHorizontal, Calendar } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';

interface Appointment {
  id: number;
  status: string;
  [key: string]: any; // Para outras propriedades do agendamento
}

interface AppointmentRowActionsProps {
  appointment: Appointment;
  onViewDetails: (appointment: Appointment) => void;
  onEdit: (appointment: Appointment) => void;
  onStatusChange: (appointmentId: number, newStatus: string) => void;
}

const AppointmentRowActions: React.FC<AppointmentRowActionsProps> = ({
  appointment,
  onViewDetails,
  onEdit,
  onStatusChange
}) => {
  return (
    <div className="flex items-center justify-end space-x-2">
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => onViewDetails(appointment)}
        className="flex items-center"
      >
        <Eye className="h-3.5 w-3.5 mr-1" />
        <span className="hidden sm:inline">Detalhes</span>
      </Button>
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem 
            className="cursor-pointer"
            onClick={() => onEdit(appointment)}
          >
            <SquarePen className="mr-2 h-4 w-4" />
            <span>Editar</span>
          </DropdownMenuItem>
          
          {appointment.status !== "confirmed" && (
            <DropdownMenuItem 
              className="cursor-pointer text-blue-600"
              onClick={() => onStatusChange(appointment.id, "confirmed")}
            >
              <Calendar className="mr-2 h-4 w-4" />
              <span>Confirmar</span>
            </DropdownMenuItem>
          )}
          
          {appointment.status !== "completed" && (
            <DropdownMenuItem 
              className="cursor-pointer text-green-600"
              onClick={() => onStatusChange(appointment.id, "completed")}
            >
              <Check className="mr-2 h-4 w-4" />
              <span>Concluir</span>
            </DropdownMenuItem>
          )}
          
          {appointment.status !== "canceled" && (
            <DropdownMenuItem 
              className="cursor-pointer text-red-600"
              onClick={() => onStatusChange(appointment.id, "canceled")}
            >
              <X className="mr-2 h-4 w-4" />
              <span>Cancelar</span>
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};

export default AppointmentRowActions;