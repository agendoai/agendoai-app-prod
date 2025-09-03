import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Button } from './button';

interface GlobalErrorFallbackProps {
  error?: Error;
  resetError?: () => void;
  showHomeButton?: boolean;
  title?: string;
  message?: string;
}

export function GlobalErrorFallback({
  error,
  resetError,
  showHomeButton = true,
  title = "Erro ao carregar página",
  message = "Ocorreu um erro inesperado. Tente novamente ou volte ao início."
}: GlobalErrorFallbackProps) {
  const handleRetry = () => {
    if (resetError) {
      resetError();
    } else {
      window.location.reload();
    }
  };

  const handleGoHome = () => {
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
        <div className="text-red-500 mb-4">
          <AlertCircle className="h-16 w-16 mx-auto" />
        </div>
        
        <h1 className="text-xl font-bold text-gray-900 mb-2">
          {title}
        </h1>
        
        <p className="text-gray-600 mb-4">
          {message}
        </p>

        {process.env.NODE_ENV === 'development' && error && (
          <details className="mb-4 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Detalhes do erro (desenvolvimento)
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono text-gray-700 overflow-auto max-h-32">
              <div><strong>Mensagem:</strong> {error.message}</div>
              {error.stack && (
                <div><strong>Stack:</strong> {error.stack}</div>
              )}
            </div>
          </details>
        )}

        <div className="flex flex-col gap-2">
          <Button
            onClick={handleRetry}
            className="w-full"
            variant="default"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Tentar novamente
          </Button>
          
          {showHomeButton && (
            <Button
              onClick={handleGoHome}
              className="w-full"
              variant="outline"
            >
              <Home className="w-4 h-4 mr-2" />
              Voltar ao início
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
