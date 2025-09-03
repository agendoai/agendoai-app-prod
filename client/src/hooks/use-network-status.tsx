import { useState, useEffect } from 'react';

interface NetworkStatus {
  isOnline: boolean;
  isSlow: boolean;
  connectionType: string | null;
  effectiveType: string | null;
}

export function useNetworkStatus(): NetworkStatus {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    isSlow: false,
    connectionType: null,
    effectiveType: null,
  });

  useEffect(() => {
    // Função para atualizar o status da rede
    const updateNetworkStatus = () => {
      const isOnline = navigator.onLine;
      
      // Detectar tipo de conexão se disponível
      let connectionType = null;
      let effectiveType = null;
      let isSlow = false;

      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        connectionType = connection.effectiveType || connection.type || null;
        effectiveType = connection.effectiveType || null;
        
        // Considerar conexão lenta se for 2G ou 3G
        isSlow = effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g';
      }

      setNetworkStatus({
        isOnline,
        isSlow,
        connectionType,
        effectiveType,
      });
    };

    // Event listeners para mudanças de conectividade
    const handleOnline = () => updateNetworkStatus();
    const handleOffline = () => updateNetworkStatus();

    // Event listeners para mudanças na qualidade da conexão
    const handleConnectionChange = () => updateNetworkStatus();

    // Adicionar event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    if ('connection' in navigator) {
      (navigator as any).connection?.addEventListener('change', handleConnectionChange);
    }

    // Atualizar status inicial
    updateNetworkStatus();

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      
      if ('connection' in navigator) {
        (navigator as any).connection?.removeEventListener('change', handleConnectionChange);
      }
    };
  }, []);

  return networkStatus;
}

// Hook para detectar problemas de conectividade específicos
export function useConnectivityIssues() {
  const networkStatus = useNetworkStatus();
  const [hasIssues, setHasIssues] = useState(false);
  const [issueMessage, setIssueMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!networkStatus.isOnline) {
      setHasIssues(true);
      setIssueMessage('Sem conexão com a internet. Verifique sua conexão.');
    } else if (networkStatus.isSlow) {
      setHasIssues(true);
      setIssueMessage('Conexão lenta detectada. Algumas funcionalidades podem ser mais lentas.');
    } else {
      setHasIssues(false);
      setIssueMessage(null);
    }
  }, [networkStatus]);

  return {
    hasIssues,
    issueMessage,
    networkStatus,
    clearIssues: () => {
      setHasIssues(false);
      setIssueMessage(null);
    },
  };
}
