import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { 
  isPushNotificationSupported, 
  askUserPermission, 
  createPushSubscription, 
  sendSubscriptionToServer,
  unsubscribeFromPush,
  initializePushNotifications
} from '@/lib/push-notifications';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

interface PushNotificationContextType {
  isPushSupported: boolean;
  pushPermission: NotificationPermission | null;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
  requestPermission: () => Promise<void>;
  subscribe: () => Promise<void>;
  unsubscribe: () => Promise<void>;
}

const PushNotificationContext = createContext<PushNotificationContextType | null>(null);

export function PushNotificationProvider({ children }: { children: ReactNode }) {
  const [isPushSupported, setIsPushSupported] = useState<boolean>(false);
  const [pushPermission, setPushPermission] = useState<NotificationPermission | null>(null);
  const [isSubscribed, setIsSubscribed] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  // Verifica o suporte e status de permissão ao inicializar
  useEffect(() => {
    const checkPushStatus = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        // Verifica se o navegador suporta push
        const supported = isPushNotificationSupported();
        setIsPushSupported(supported);
        
        if (!supported) {
          setIsLoading(false);
          return;
        }
        
        // Verifica o status atual da permissão
        const permission = Notification.permission;
        setPushPermission(permission);
        
        // Se estiver autenticado e com permissão, verifica se já está inscrito
        if (user && permission === 'granted') {
          const registration = await navigator.serviceWorker.ready;
          const subscription = await registration.pushManager.getSubscription();
          setIsSubscribed(!!subscription);
        }
      } catch (error) {
        console.error('Erro ao verificar status de notificações push:', error);
        setError('Não foi possível verificar o status das notificações');
      } finally {
        setIsLoading(false);
      }
    };
    
    checkPushStatus();
  }, [user]);

  // Solicita permissão para notificações
  const requestPermission = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!isPushSupported) {
        throw new Error('Este navegador não suporta notificações push');
      }
      
      const permission = await askUserPermission();
      setPushPermission(permission);
      
      if (permission === 'granted') {
        toast({
          title: 'Permissão concedida',
          description: 'Agora você pode receber notificações do AgendoAI',
        });
      } else {
        throw new Error('Permissão para notificações não foi concedida');
      }
    } catch (error: any) {
      console.error('Erro ao solicitar permissão:', error);
      setError(error.message);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [isPushSupported, toast]);

  // Inscreve o usuário para receber notificações
  const subscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      if (!user) {
        throw new Error('Você precisa estar logado para ativar notificações');
      }
      
      if (!isPushSupported) {
        throw new Error('Este navegador não suporta notificações push');
      }
      
      if (pushPermission !== 'granted') {
        const newPermission = await askUserPermission();
        setPushPermission(newPermission);
        
        if (newPermission !== 'granted') {
          throw new Error('Permissão para notificações não foi concedida');
        }
      }
      
      // Criar assinatura para notificações push
      const subscription = await createPushSubscription();
      
      if (!subscription) {
        throw new Error('Não foi possível criar a assinatura');
      }
      
      // Enviar assinatura para o servidor
      const success = await sendSubscriptionToServer(subscription);
      
      if (success) {
        setIsSubscribed(true);
        toast({
          title: 'Notificações ativadas',
          description: 'Você receberá notificações sobre seus agendamentos',
        });
      } else {
        throw new Error('Não foi possível registrar a assinatura no servidor');
      }
    } catch (error: any) {
      console.error('Erro ao se inscrever para notificações:', error);
      setError(error.message);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [user, isPushSupported, pushPermission, toast]);

  // Cancela a inscrição para notificações push
  const unsubscribe = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const success = await unsubscribeFromPush();
      
      if (success) {
        setIsSubscribed(false);
        toast({
          title: 'Notificações desativadas',
          description: 'Você não receberá mais notificações push',
        });
      } else {
        throw new Error('Não foi possível cancelar as notificações');
      }
    } catch (error: any) {
      console.error('Erro ao cancelar notificações:', error);
      setError(error.message);
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  return (
    <PushNotificationContext.Provider 
      value={{
        isPushSupported,
        pushPermission,
        isSubscribed,
        isLoading,
        error,
        requestPermission,
        subscribe,
        unsubscribe
      }}
    >
      {children}
    </PushNotificationContext.Provider>
  );
}

export function usePushNotifications() {
  const context = useContext(PushNotificationContext);
  
  if (!context) {
    throw new Error('usePushNotifications deve ser usado dentro de um PushNotificationProvider');
  }
  
  return context;
}