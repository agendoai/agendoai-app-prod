/**
 * Service Worker para notificações push do AgendoAI
 */

// Versão do cache
const CACHE_VERSION = 'v1';
const CACHE_NAME = `agendoai-cache-${CACHE_VERSION}`;

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/',
        '/index.html',
        '/icons/appointment-icon.png',
        '/icons/cancel-icon.png',
        '/icons/reminder-icon.png',
        '/icons/badge-icon.png'
      ]);
    })
  );
});

// Ativação do Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
});

// Interceptação de requisições para implementar estratégia de cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Retorna do cache se disponível
      if (response) {
        return response;
      }
      
      // Caso contrário, busca da rede
      return fetch(event.request).then((response) => {
        // Não armazena requisições não-GET ou falhas
        if (!response || response.status !== 200 || response.type !== 'basic' || event.request.method !== 'GET') {
          return response;
        }
        
        // Armazena em cache uma cópia da resposta
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      });
    })
  );
});

// Recebimento de notificações push
self.addEventListener('push', (event) => {
  if (!event.data) {
    console.log('Recebida push notification sem dados');
    return;
  }
  
  try {
    const data = event.data.json();
    
    // Extrai dados da notificação
    const { notification } = data;
    
    // Exibe a notificação
    event.waitUntil(
      self.registration.showNotification(notification.title, {
        body: notification.body,
        icon: notification.icon || '/icons/default-icon.png',
        badge: notification.badge,
        vibrate: notification.vibrate,
        data: notification.data,
        actions: notification.actions
      })
    );
  } catch (error) {
    console.error('Erro ao processar notificação push:', error);
  }
});

// Clique em uma notificação
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  // Identifica o tipo de notificação e a ação
  const { notification } = event;
  const { data } = notification;
  const action = event.action || 'default';
  
  // URL base para abrir após o clique
  let url = '/';
  
  if (data && data.type === 'appointment' && data.appointmentId) {
    // Caso seja um agendamento
    url = `/client/appointments/${data.appointmentId}`;
  } else if (data && data.type === 'message' && data.messageId) {
    // Caso seja uma mensagem
    url = `/chat/${data.providerId || 'default'}`;
  }
  
  // Se a ação for específica
  if (action === 'view' && data && data.appointmentId) {
    url = `/client/appointments/${data.appointmentId}`;
  }
  
  // Abre uma janela ou foca em uma existente
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientsList) => {
      // Verifica se já existe uma janela aberta
      for (const client of clientsList) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus();
        }
      }
      
      // Caso contrário, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});