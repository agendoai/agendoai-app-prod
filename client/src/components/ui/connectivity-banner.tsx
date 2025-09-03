import { AlertTriangle, Wifi, WifiOff, X } from 'lucide-react';
import { useConnectivityIssues } from '@/hooks/use-network-status';

export function ConnectivityBanner() {
  const { hasIssues, issueMessage, clearIssues, networkStatus } = useConnectivityIssues();

  if (!hasIssues) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-yellow-50 border-b border-yellow-200 px-4 py-3">
      <div className="flex items-center justify-between max-w-md mx-auto">
        <div className="flex items-center space-x-3">
          {!networkStatus.isOnline ? (
            <WifiOff className="h-5 w-5 text-yellow-600" />
          ) : networkStatus.isSlow ? (
            <Wifi className="h-5 w-5 text-yellow-600" />
          ) : (
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          )}
          
          <div className="flex-1">
            <p className="text-sm font-medium text-yellow-800">
              {issueMessage}
            </p>
            {networkStatus.effectiveType && (
              <p className="text-xs text-yellow-700">
                Tipo de conexão: {networkStatus.effectiveType}
              </p>
            )}
          </div>
        </div>
        
        <button
          onClick={clearIssues}
          className="text-yellow-600 hover:text-yellow-800 transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
