import { Helmet } from 'react-helmet-async';
import ClientLayout from '@/components/layout/client-layout';
import { NewBookingWizard } from '@/components/new-booking-wizard-fixed';
import { useLocation } from 'wouter';
import { useEffect, useState } from 'react';

export default function NewBookingWizardPage() {
  const [location, setLocation] = useLocation();
  // Removemos a funcionalidade de pré-seleção de serviço por ID
  // para garantir que o usuário sempre inicie do primeiro passo
  const [preSelectedServiceId, setPreSelectedServiceId] = useState<number | null>(null);

  // Desabilitada a extração de serviceId da URL
  // O fluxo agora sempre iniciará do passo de seleção de nicho
  useEffect(() => {
    // Verificamos se há parâmetros, mas não os utilizamos para pré-selecionar serviço
    const params = new URLSearchParams(window.location.search);
    const serviceId = params.get('serviceId');
    
    if (serviceId && !isNaN(parseInt(serviceId))) {
      console.log("Parâmetro serviceId detectado, mas não usado para pré-seleção:", serviceId);
      // Não define o preSelectedServiceId para forçar o fluxo completo
    }
  }, [location]);

  const handleBookingComplete = (data: {
    serviceId?: number;
    serviceIds?: number[];
    providerId: number;
    date?: string;
    startTime?: string;
    endTime?: string;
    paymentMethod?: 'credit_card' | 'pix' | 'money';
  }) => {
    console.log("Agendamento finalizado com dados:", data);
    
    // Só redireciona se tiver chegado até o final do processo e escolhido método de pagamento
    if (data.date && data.startTime && data.endTime && data.paymentMethod) {
      // Usar o primeiro serviço como principal para a URL de confirmação
      const primaryServiceId = data.serviceId || (data.serviceIds && data.serviceIds.length > 0 ? data.serviceIds[0] : 0);
      
      // Verificamos se temos serviços adicionais
      const hasMultipleServices = data.serviceIds && data.serviceIds.length > 1;
      
      // Construir URL base de confirmação
      let confirmationUrl = `/client/booking-confirmation/${data.providerId}/${primaryServiceId}/${data.date}/${data.startTime}/${data.endTime}`;
      
      // Adicionar parâmetros de query para serviços adicionais se necessário
      if (hasMultipleServices && data.serviceIds) {
        const additionalServiceIds = data.serviceIds.slice(1).join(',');
        confirmationUrl += `?additionalServices=${additionalServiceIds}`;
      }
      
      setLocation(confirmationUrl);
    }
    // Não redirecionamos em outros casos, permitindo ao usuário continuar no fluxo
  };

  return (
    <>
      <Helmet>
        <title>Agendar Serviço | AgendoAI</title>
      </Helmet>
      
      <ClientLayout>
        <div className="w-full min-h-screen flex flex-col items-center bg-white">
          <h1 className="text-xl sm:text-2xl font-bold text-neutral-900 mb-4 text-center mt-4 tracking-tight">Novo agendamento</h1>
          <div className="w-full flex-1 flex flex-col items-center">
            <NewBookingWizard 
              onComplete={handleBookingComplete}
              preSelectedServiceId={null} // Sempre passa null para forçar o início pelo primeiro passo
            />
          </div>
        </div>
      </ClientLayout>
    </>
  );
}