import { useEffect, useState } from 'react';

interface ModuleError {
  type: 'module' | 'script' | 'network';
  message: string;
  url?: string;
  timestamp: number;
}

export function useModuleErrorHandler() {
  const [errors, setErrors] = useState<ModuleError[]>([]);
  const [hasCriticalError, setHasCriticalError] = useState(false);

  useEffect(() => {
    // Handler para erros de carregamento de módulos
    const handleModuleError = (event: ErrorEvent) => {
      const error: ModuleError = {
        type: 'module',
        message: event.message,
        url: event.filename,
        timestamp: Date.now(),
      };

      console.error('Erro de módulo detectado:', error);
      setErrors(prev => [...prev, error]);

      // Verificar se é um erro crítico (falha ao carregar módulo principal)
      if (event.message.includes('Failed to load module script') ||
          event.message.includes('MIME type') ||
          event.message.includes('Unexpected token')) {
        setHasCriticalError(true);
      }
    };

    // Handler para erros de carregamento de scripts
    const handleScriptError = (event: Event) => {
      const target = event.target as HTMLScriptElement;
      if (target && target.tagName === 'SCRIPT') {
        const error: ModuleError = {
          type: 'script',
          message: `Falha ao carregar script: ${target.src}`,
          url: target.src,
          timestamp: Date.now(),
        };

        console.error('Erro de script detectado:', error);
        setErrors(prev => [...prev, error]);
      }
    };

    // Handler para erros de rede
    const handleNetworkError = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target && (target.tagName === 'LINK' || target.tagName === 'IMG')) {
        const error: ModuleError = {
          type: 'network',
          message: `Falha ao carregar recurso: ${target.tagName.toLowerCase()}`,
          url: (target as any).href || (target as any).src,
          timestamp: Date.now(),
        };

        console.error('Erro de rede detectado:', error);
        setErrors(prev => [...prev, error]);
      }
    };

    // Handler para erros de Promise não tratadas
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error: ModuleError = {
        type: 'module',
        message: `Promise rejeitada: ${event.reason}`,
        timestamp: Date.now(),
      };

      console.error('Promise rejeitada não tratada:', error);
      setErrors(prev => [...prev, error]);
    };

    // Adicionar event listeners
    window.addEventListener('error', handleModuleError);
    window.addEventListener('load', handleScriptError, true);
    window.addEventListener('error', handleNetworkError, true);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    // Cleanup
    return () => {
      window.removeEventListener('error', handleModuleError);
      window.removeEventListener('load', handleScriptError, true);
      window.removeEventListener('error', handleNetworkError, true);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // Função para limpar erros
  const clearErrors = () => {
    setErrors([]);
    setHasCriticalError(false);
  };

  // Função para tentar recarregar módulos com erro
  const retryFailedModules = () => {
    // Limpar cache do navegador para módulos
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }

    // Recarregar a página
    window.location.reload();
  };

  return {
    errors,
    hasCriticalError,
    clearErrors,
    retryFailedModules,
    errorCount: errors.length,
  };
}
