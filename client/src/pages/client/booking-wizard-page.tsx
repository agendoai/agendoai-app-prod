import { Helmet } from 'react-helmet';
import ClientLayout from '@/components/layout/client-layout';
import { BookingWizard } from '@/components/booking-wizard';
import { useLocation } from 'wouter';

export default function BookingWizardPage() {
  const [, setLocation] = useLocation();

  const handleBookingComplete = (data: {
    serviceId: number;
    providerId: number;
    date?: string;
    startTime?: string;
    endTime?: string;
  }) => {
    // Redirecionar para a página de agendamento com o prestador selecionado
    if (data.date && data.startTime && data.endTime) {
      setLocation(`/client/booking-confirmation/${data.providerId}/${data.serviceId}/${data.date}/${data.startTime}/${data.endTime}`);
    } else {
      setLocation(`/client/provider-schedule/${data.providerId}/${data.serviceId}`);
    }
  };

  return (
    <>
      <Helmet>
        <title>Agendar Serviço | AgendoAI</title>
      </Helmet>
      
      <ClientLayout>
        <div className="container mx-auto py-6 max-w-3xl">
          <BookingWizard onComplete={handleBookingComplete} />
        </div>
      </ClientLayout>
    </>
  );
}