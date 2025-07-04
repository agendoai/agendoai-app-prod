import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import ClientLayout from '@/components/layout/client-layout';
import { BookingWizard } from '@/components/booking-wizard';
import { useLocation } from 'wouter';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface BookingCompleteData {
  serviceId: number;
  providerId: number;
  date: string | null;
  startTime: string | null;
  endTime: string | null;
}

interface ErrorState {
  hasError: boolean;
  message?: string;
}

export default function BookingWizardPage() {
  const [, setLocation] = useLocation();
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<ErrorState>({ hasError: false });

  const handleBookingComplete = async (data: BookingCompleteData) => {
    try {
      setIsRedirecting(true);
      setError({ hasError: false });

      // Validate required fields
      if (!data.providerId || !data.serviceId) {
        throw new Error('Dados de agendamento incompletos');
      }

      // If all time data is available, redirect to confirmation
      if (data.date && data.startTime && data.endTime) {
        const safeDate = encodeURIComponent(data.date);
        const safeStartTime = encodeURIComponent(data.startTime);
        const safeEndTime = encodeURIComponent(data.endTime);
        
        setLocation(
          `/client/booking-confirmation/${
            data.providerId
          }/${
            data.serviceId
          }/${safeDate}/${safeStartTime}/${safeEndTime}`
        );
      } else {
        // Otherwise redirect back with current selections
        const params = new URLSearchParams();
        params.append('providerId', data.providerId.toString());
        params.append('serviceId', data.serviceId.toString());
        
        setLocation(`/client/booking-wizard?${params.toString()}`);
      }
    } catch (err) {
      setError({
        hasError: true,
        message: err instanceof Error ? err.message : 'Ocorreu um erro inesperado'
      });
      setLocation('/client/booking-wizard');
    } finally {
      setIsRedirecting(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Agendar Serviço | AgendoAI</title>
        <meta 
          name="description" 
          content="Agende seu serviço personalizado com nossos profissionais qualificados" 
        />
      </Helmet>
      
      <ClientLayout>
        <div className="container mx-auto py-6 px-4 sm:px-6 lg:px-8 max-w-3xl">
          {error.hasError ? (
            <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-red-500"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">
                    {error.message || 'Erro ao processar seu agendamento. Tente novamente.'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {isRedirecting ? (
            <div className="flex flex-col items-center justify-center h-64">
              <LoadingSpinner className="h-12 w-12 text-primary" />
              <p className="mt-4 text-gray-600">Processando seu agendamento...</p>
            </div>
          ) : (
            <BookingWizard 
              onComplete={handleBookingComplete}
              initialData={{
                serviceId: null,
                providerId: null,
                date: null,
                startTime: null,
                endTime: null
              }}
            />
          )}
        </div>
      </ClientLayout>
    </>
  );
}