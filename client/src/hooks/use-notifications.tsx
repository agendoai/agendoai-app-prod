import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { useAuth } from './use-auth';
import { toast } from './use-toast';
import { apiCall } from "@/lib/api";

export type Notification = {
  id: number;
  title: string;
  message: string;
  read: boolean;
  type?: string;
  createdAt: string;
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: number) => void;
  markAllAsRead: () => void;
  clearAllNotifications: () => void;
  connectionStatus: 'connecting' | 'connected' | 'disconnected';
  refreshNotifications: () => Promise<void>;
};

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectDelay = 30000; // máximo de 30 segundos entre tentativas
  const { user } = useAuth();

  // Função para calcular o delay de reconexão com backoff exponencial
  const getReconnectDelay = () => {
    // Backoff exponencial: 1s, 2s, 4s, 8s, até maxReconnectDelay
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), maxReconnectDelay);
    reconnectAttempts.current++;
    return delay;
  };

  // Reset reconnect attempts when successfully connected
  const resetReconnectAttempts = () => {
    reconnectAttempts.current = 0;
  };

  // Fetch notifications helper
  const refreshNotifications = async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    try {
      const response = await apiCall(`/api/notifications/user/${user.id}`, {
        method: 'GET'
      });
      if (response.ok) {
        const notifications = await response.json();
        setNotifications(notifications);
          
      } else {
          
      }
      } catch (error) {
      
    }
  };

  // Initial fetch and focus/interval refresh
  useEffect(() => {
    if (!user) {
      setNotifications([]);
      return;
    }

    refreshNotifications();

    const onFocus = () => refreshNotifications();
    window.addEventListener('focus', onFocus);

    const interval = setInterval(() => {
      refreshNotifications();
    }, 30000);

    return () => {
      window.removeEventListener('focus', onFocus);
      clearInterval(interval);
    };
  }, [user]);

  // Connect to WebSocket
  useEffect(() => {
    if (!user) {
      setConnectionStatus('disconnected');
      return;
    }

    // Função de configuração do WebSocket com tratamento de erro
    const setupWebSocket = () => {
      try {
        // Limpar qualquer timeout pendente
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        setConnectionStatus('connecting');
        
        // Verificação robusta da URL do WebSocket
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.host;
        
        // Validar que temos um host válido antes de tentar conectar
        if (!host) {
          
          setConnectionStatus('disconnected');
          
          // Tentar novamente com backoff exponencial
          const reconnectDelay = getReconnectDelay();
          
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (user) setupWebSocket();
          }, reconnectDelay);
          
          return;
        }
        
        // Usar a mesma lógica da API para WebSocket
        let wsUrl;
        if (import.meta.env.VITE_API_URL) {
          wsUrl = `${import.meta.env.VITE_API_URL.replace('http', 'ws').replace('https', 'wss')}/api/ws`;
        } else if (window.location.protocol === 'https:') {
          wsUrl = 'wss://app.tbsnet.com.br/api/ws';
        } else {
          wsUrl = 'ws://localhost:5000/api/ws';
        }
        
        
        let webSocket;
        try {
          webSocket = new WebSocket(wsUrl);
        } catch (error) {
          
          setConnectionStatus('disconnected');
          
          // Tentar novamente com backoff exponencial
          const reconnectDelay = getReconnectDelay();
          
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (user) setupWebSocket();
          }, reconnectDelay);
          
          return;
        }

        // Configurar timeout para conexão inicial com tempo mais longo
        const connectionTimeout = setTimeout(() => {
          if (webSocket.readyState !== WebSocket.OPEN) {
            
            webSocket.close();
          }
        }, 15000); // 15 segundos de timeout para conectar (aumentado para melhor confiabilidade)

        webSocket.onopen = () => {
          
          clearTimeout(connectionTimeout);
          setConnectionStatus('connected');
          resetReconnectAttempts();
          
          // Enviar mensagem de autenticação
          webSocket.send(JSON.stringify({
            type: 'auth',
            userId: user.id
          }));
        };

        webSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'auth_success') {
      
            } else if (data.type === 'notification') {
              // Add notification to state
              const newNotification: Notification = {
                id: Date.now(),
                title: data.data?.title || "Nova notificação",
                message: data.data?.message || "",
                read: false,
                type: data.data?.type || "info",
                createdAt: new Date().toISOString(),
              };
              
              setNotifications(prev => [newNotification, ...prev]);
              
              // Show toast for real-time notification
              toast({
                title: newNotification.title,
                description: newNotification.message,
              });
            } else if (data.type === 'ping') {
              // Responder pings do servidor para manter a conexão viva
              webSocket.send(JSON.stringify({ type: 'pong' }));
            }
          } catch (error) {
            
          }
        };

        webSocket.onerror = (error) => {
          
          clearTimeout(connectionTimeout);
          setConnectionStatus('disconnected');
        };

        webSocket.onclose = (event) => {
          
          clearTimeout(connectionTimeout);
          setConnectionStatus('disconnected');
          
          // Tentar reconectar com backoff exponencial
          const reconnectDelay = getReconnectDelay();
          
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (user) setupWebSocket();
          }, reconnectDelay);
        };

        // Configurar um ping periódico para manter a conexão viva
        const pingInterval = setInterval(() => {
          if (webSocket.readyState === WebSocket.OPEN) {
            try {
              webSocket.send(JSON.stringify({ type: 'ping' }));
            } catch (e) {
              
              clearInterval(pingInterval);
              // Verificar estado do WebSocket usando constantes (evita comparação com valores literais)
              // WebSocket.CLOSING = 2, WebSocket.CLOSED = 3
              if (webSocket.readyState !== WebSocket.CLOSED && webSocket.readyState !== WebSocket.CLOSING) {
                webSocket.close();
              }
            }
          }
        }, 25000); // a cada 25 segundos

        setSocket(webSocket);
        
        // Retornar uma função de limpeza que fecha o WebSocket e limpa os intervalos
        return () => {
          clearInterval(pingInterval);
          clearTimeout(connectionTimeout);
          webSocket.close();
        };
      } catch (error) {
        
        setConnectionStatus('disconnected');
        
        // Tentar novamente com backoff exponencial
        const reconnectDelay = getReconnectDelay();
        
        
        reconnectTimeoutRef.current = setTimeout(() => {
          if (user) setupWebSocket();
        }, reconnectDelay);
        
        return null;
      }
    };

    // Iniciar conexão WebSocket
    const cleanup = setupWebSocket();

    // Clean up on unmount
    return () => {
      if (cleanup) cleanup();
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = null;
      }
    };
  }, [user]);

  // Calculate unread notifications
  const unreadCount = notifications.filter(n => !n.read).length;

  // Mark a notification as read
  const markAsRead = async (id: number) => {
    try {
      const response = await apiCall(`/api/notifications/${id}/read`, {
        method: 'PUT'
      });
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? { ...notification, read: true } 
              : notification
          )
        );
      } else {
        
      }
    } catch (error) {
      
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    try {
      const response = await apiCall('/api/notifications/read-all', {
        method: 'PUT'
      });
      if (response.ok) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, read: true }))
        );
      } else {
        
      }
    } catch (error) {
      
    }
  };
  
  // Clear all notifications
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  return (
    <NotificationContext.Provider 
      value={{ 
        notifications, 
        unreadCount, 
        markAsRead, 
        markAllAsRead,
        clearAllNotifications,
        connectionStatus,
        refreshNotifications
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}