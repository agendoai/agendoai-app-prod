import React from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Check, X, SquarePen } from 'lucide-react';
import { formatDate, formatPrice } from '@/lib/utils';

// Interface para o objeto de agendamento
interface Appointment {
  id: number;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  providerId: number;
  clientId: number;
  serviceId: number;
  notes: string | null;
  paymentMethod: string | null;
  paymentStatus: string | null;
  totalPrice: number | null;
  serviceName: string | null;
  providerName: string | null;
  clientName: string | null;
  createdAt: string | null;
}

// Props para o componente de modal
interface AppointmentDetailsModalProps {
  appointment: Appointment | null;
  isOpen: boolean;
  isEditMode?: boolean;
  onClose: () => void;
  onEdit: (appointment: Appointment) => void;
  onStatusChange: (appointmentId: number, newStatus: string) => void;
  renderStatusBadge: (status: string) => React.ReactNode;
}

const AppointmentDetailsModal: React.FC<AppointmentDetailsModalProps> = ({
  appointment,
  isOpen,
  isEditMode = false,
  onClose,
  onEdit,
  onStatusChange,
  renderStatusBadge
}) => {
  if (!appointment) return null;
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[650px]">
        <DialogHeader>
          <DialogTitle>
            {isEditMode ? "Editar Agendamento" : "Detalhes do Agendamento"}
          </DialogTitle>
          <DialogDescription>
            {isEditMode 
              ? "Altere as informações do agendamento conforme necessário." 
              : "Informações detalhadas sobre o agendamento selecionado."}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-500">ID do Agendamento</h3>
              <p className="mt-1 text-sm">{appointment.id}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <div className="mt-1">{renderStatusBadge(appointment.status)}</div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Data</h3>
              <p className="mt-1 text-sm">{formatDate(appointment.date)}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Horário</h3>
              <p className="mt-1 text-sm">{appointment.startTime} - {appointment.endTime}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Cliente</h3>
              <p className="mt-1 text-sm">{appointment.clientName || `Cliente #${appointment.clientId}`}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Prestador</h3>
              <p className="mt-1 text-sm">{appointment.providerName || `Prestador #${appointment.providerId}`}</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mt-2">
            <div>
              <h3 className="text-sm font-medium text-gray-500">Serviço</h3>
              <p className="mt-1 text-sm">{appointment.serviceName || `Serviço #${appointment.serviceId}`}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-500">Valor</h3>
              <p className="mt-1 text-sm">{formatPrice(appointment.totalPrice)}</p>
            </div>
          </div>
          
          <div className="mt-2">
            <h3 className="text-sm font-medium text-gray-500">Método de Pagamento</h3>
            <p className="mt-1 text-sm">{appointment.paymentMethod || "Não informado"}</p>
          </div>
          
          <div className="mt-2">
            <h3 className="text-sm font-medium text-gray-500">Status do Pagamento</h3>
            <p className="mt-1 text-sm">{appointment.paymentStatus || "Não processado"}</p>
          </div>
          
          {appointment.notes && (
            <div className="mt-2">
              <h3 className="text-sm font-medium text-gray-500">Observações</h3>
              <p className="mt-1 text-sm">{appointment.notes}</p>
            </div>
          )}
        </div>
        
        <DialogFooter className="gap-2">
          <Button 
            variant="outline" 
            onClick={onClose}
          >
            Fechar
          </Button>
          
          {!isEditMode && (
            <>
              <Button 
                variant="default"
                onClick={() => onEdit(appointment)}
              >
                <SquarePen className="mr-2 h-4 w-4" />
                Editar
              </Button>
              
              {appointment.status === 'pending' && (
                <Button 
                  variant="default" 
                  className="bg-blue-600 hover:bg-blue-700"
                  onClick={() => {
                    onStatusChange(appointment.id, 'confirmed');
                    onClose();
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Confirmar
                </Button>
              )}
              
              {appointment.status === 'confirmed' && (
                <Button 
                  variant="default" 
                  className="bg-green-600 hover:bg-green-700"
                  onClick={() => {
                    onStatusChange(appointment.id, 'completed');
                    onClose();
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  Concluir
                </Button>
              )}
              
              {['pending', 'confirmed'].includes(appointment.status) && (
                <Button 
                  variant="destructive"
                  onClick={() => {
                    onStatusChange(appointment.id, 'canceled');
                    onClose();
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancelar
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AppointmentDetailsModal;