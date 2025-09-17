import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface ValidationCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  appointmentId: number;
  onSuccess: () => void;
  isLoading?: boolean;
}

export function ValidationCodeModal({
  isOpen,
  onClose,
  appointmentId,
  onSuccess,
  isLoading = false
}: ValidationCodeModalProps) {
  const [validationCode, setValidationCode] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const { toast } = useToast();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleValidate = async () => {
    if (!validationCode.trim()) {
      setErrorMessage('Por favor, insira o código de validação fornecido pelo cliente.');
      return;
    }

    setIsValidating(true);
    
    try {
      const validateResponse = await apiRequest('POST', `/api/appointments/${appointmentId}/validate`, {
        validationCode: validationCode.trim()
      });
      
      if (!validateResponse.ok) {
        const error = await validateResponse.json();
        setErrorMessage(error.error || error.message || 'O código de validação está incorreto.');
        return;
      }

      // Se chegou aqui, a validação passou
      toast({
        title: 'Código validado',
        description: 'Código de validação confirmado com sucesso.',
      });
      setErrorMessage(null);
      
      onSuccess();
      handleClose();
      
    } catch (error) {
      setErrorMessage('Não foi possível validar o código. Tente novamente.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setValidationCode('');
    setErrorMessage(null);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        {errorMessage && (
          <div className="mb-3 -mt-1 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-700 text-sm">
            {errorMessage}
          </div>
        )}
        <DialogHeader>
          <DialogTitle>Validar Conclusão do Agendamento</DialogTitle>
          <DialogDescription>
            Para marcar este agendamento como concluído, insira o código de validação fornecido pelo cliente.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label htmlFor="validation-code" className="text-sm font-medium">
              Código de Validação
            </label>
            <Input
              id="validation-code"
              type="text"
              placeholder="Digite o código de 6 dígitos"
              value={validationCode}
              onChange={(e) => { setValidationCode(e.target.value.toUpperCase()); if (errorMessage) setErrorMessage(null); }}
              maxLength={6}
              className="mt-1"
              disabled={isValidating || isLoading}
            />
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isValidating || isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleValidate}
            disabled={isValidating || isLoading}
          >
            {isValidating ? 'Validando...' : 'Confirmar Conclusão'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}