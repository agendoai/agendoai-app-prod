/**
 * Utilitários para gerenciar notificações push no cliente
 */

/**
 * Converte URL base64 para Uint8Array
 * @param base64String String base64 a ser convertida
 * @returns Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

/**
 * Verifica se o navegador suporta notificações push
 * @returns boolean
 */
export function isPushNotificationSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window;
}

/**
 * Solicita permissão para enviar notificações push
 * @returns Promise<string> Estado da permissão ('granted', 'denied', 'default')
 */
export async function askUserPermission(): Promise<NotificationPermission> {
  return await Notification.requestPermission();
}

/**
 * Registra o service worker para notificações push
 * @returns Promise<ServiceWorkerRegistration>
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!isPushNotificationSupported()) {
    console.error('Push notifications não são suportadas neste navegador');
    return null;
  }
  
  try {
    return await navigator.serviceWorker.register('/service-worker.js');
  } catch (error) {
    console.error('Erro ao registrar service worker:', error);
    return null;
  }
}

/**
 * Cria uma assinatura push
 * @returns Promise<PushSubscription | null>
 */
export async function createPushSubscription(): Promise<PushSubscription | null> {
  try {
    if (!isPushNotificationSupported()) {
      console.error('Push notifications não são suportadas neste navegador');
      return null;
    }

    // Aguarda o service worker estar pronto
    const registration = await navigator.serviceWorker.ready;
    
    // Obtém a chave pública VAPID
    const response = await fetch('/api/push/vapid-public-key');
    const vapidPublicKey = await response.text();
    
    // Converte a chave para o formato esperado pelo subscribe
    const convertedVapidKey = urlBase64ToUint8Array(vapidPublicKey);
    
    // Cria a assinatura
    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedVapidKey
    });
    
    return subscription;
  } catch (error) {
    console.error('Erro ao criar assinatura push:', error);
    return null;
  }
}

/**
 * Envia assinatura push para o servidor
 * @param subscription Assinatura push
 * @returns Promise<boolean> Indicando sucesso/falha
 */
export async function sendSubscriptionToServer(subscription: PushSubscription): Promise<boolean> {
  try {
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(subscription),
    });
    
    return response.ok;
  } catch (error) {
    console.error('Erro ao enviar assinatura para o servidor:', error);
    return false;
  }
}

/**
 * Remove assinatura push
 * @returns Promise<boolean> Indicando sucesso/falha
 */
export async function unsubscribeFromPush(): Promise<boolean> {
  try {
    if (!isPushNotificationSupported()) {
      return false;
    }
    
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      // Remove assinatura localmente
      const result = await subscription.unsubscribe();
      
      // Remove assinatura no servidor
      if (result) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });
      }
      
      return result;
    }
    
    return false;
  } catch (error) {
    console.error('Erro ao cancelar assinatura push:', error);
    return false;
  }
}

/**
 * Inicializa e configura notificações push
 * @returns Promise<boolean> Indicando sucesso/falha
 */
export async function initializePushNotifications(): Promise<boolean> {
  try {
    if (!isPushNotificationSupported()) {
      return false;
    }
    
    // Solicita permissão
    const permission = await askUserPermission();
    if (permission !== 'granted') {
      return false;
    }
    
    // Registra service worker
    await registerServiceWorker();
    
    // Cria assinatura
    const subscription = await createPushSubscription();
    if (!subscription) {
      return false;
    }
    
    // Envia assinatura para o servidor
    return await sendSubscriptionToServer(subscription);
  } catch (error) {
    console.error('Erro ao inicializar notificações push:', error);
    return false;
  }
}