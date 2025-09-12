import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bell, Check, CheckCircle, Clock, Info, AlertTriangle } from "lucide-react";
import ClientLayout from "@/components/layout/client-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  read: boolean;
  linkTo?: string;
  appointmentId?: number;
  createdAt: string;
}

export default function ClientNotificationsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  // Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: [`/api/notifications/user/${user?.id}`],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/notifications/user/${user?.id}`);
      if (!response.ok) throw new Error('Failed to fetch notifications');
      return response.json();
    },
    enabled: !!user?.id
  });

  // Mark notification as read
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: number) => {
      const response = await apiRequest('PUT', `/api/notifications/${notificationId}/read`);
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notifications/user/${user?.id}`] });
    }
  });

  // Mark all as read
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('PUT', `/api/notifications/user/${user?.id}/mark-all-read`);
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/notifications/user/${user?.id}`] });
      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas.",
      });
    }
  });

  const handleMarkAsRead = (notificationId: number) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'appointment':
        return <Clock className="h-5 w-5 text-blue-600" />;
      case 'payment':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'alert':
        return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
      case 'system':
        return <Info className="h-5 w-5 text-purple-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationBadgeColor = (type: string) => {
    switch (type) {
      case 'appointment':
        return 'bg-blue-100 text-blue-800';
      case 'payment':
        return 'bg-green-100 text-green-800';
      case 'alert':
        return 'bg-yellow-100 text-yellow-800';
      case 'system':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredNotifications = notifications.filter(notification => 
    filter === 'all' || (filter === 'unread' && !notification.read)
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <ClientLayout>
      <div className="min-h-screen w-full bg-white relative overflow-hidden">
        {/* Professional Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#58c9d1]/8 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#58c9d1]/6 to-transparent rounded-full blur-3xl"></div>
          <div className="absolute inset-0 bg-[linear-gradient(rgba(88,201,209,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(88,201,209,0.02)_1px,transparent_1px)] bg-[size:60px_60px] opacity-40"></div>
        </div>
        
        <div className="relative z-10">
          {/* Header */}
          <header className="bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] text-white py-6 shadow-lg">
            <div className="container mx-auto px-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-white/20 rounded-lg">
                    <Bell className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl md:text-3xl font-medium text-white">Notificações</h1>
                    {unreadCount > 0 && (
                      <p className="text-white/80 text-sm">
                        {unreadCount} notificação{unreadCount !== 1 ? 'ões' : ''} não lida{unreadCount !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                </div>
                {unreadCount > 0 && (
                  <Button
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsReadMutation.isPending}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30 font-medium"
                    variant="outline"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Marcar todas como lidas
                  </Button>
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <div className="container mx-auto px-4 py-6 space-y-6">
            {/* Filters */}
            <div className="flex items-center justify-between">
              <div className="flex space-x-2">
                <Button
                  onClick={() => setFilter('all')}
                  variant={filter === 'all' ? 'default' : 'outline'}
                  className={filter === 'all' ? 'bg-[#58c9d1] hover:bg-[#58c9d1]/90 text-white' : 'border-[#58c9d1] text-[#58c9d1] hover:bg-[#58c9d1]/10'}
                >
                  Todas ({notifications.length})
                </Button>
                <Button
                  onClick={() => setFilter('unread')}
                  variant={filter === 'unread' ? 'default' : 'outline'}
                  className={filter === 'unread' ? 'bg-[#58c9d1] hover:bg-[#58c9d1]/90 text-white' : 'border-[#58c9d1] text-[#58c9d1] hover:bg-[#58c9d1]/10'}
                >
                  Não lidas ({unreadCount})
                </Button>
              </div>
            </div>

            {/* Notifications List */}
            {isLoading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, index) => (
                  <Card key={index} className="animate-pulse">
                    <CardContent className="p-4">
                      <div className="flex space-x-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                        <div className="flex-1 space-y-2">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredNotifications.length === 0 ? (
              <Card className="border border-[#58c9d1]/20 bg-white shadow-xl shadow-[#58c9d1]/10 rounded-2xl">
                <CardContent className="p-12 text-center">
                  <div className="w-16 h-16 bg-gradient-to-r from-[#58c9d1] to-[#4aadb5] rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-lg font-medium text-neutral-900 mb-2">
                    {filter === 'unread' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
                  </h3>
                  <p className="text-neutral-600">
                    {filter === 'unread' 
                      ? 'Todas as suas notificações foram lidas!' 
                      : 'Você ainda não possui notificações.'
                    }
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map((notification) => (
                  <Card 
                    key={notification.id} 
                    className={`border transition-all duration-300 hover:shadow-md ${
                      notification.read 
                        ? 'border-gray-200 bg-white' 
                        : 'border-[#58c9d1]/30 bg-gradient-to-r from-[#58c9d1]/5 to-white'
                    }`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start space-x-4">
                        <div className="flex-shrink-0">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <h3 className={`text-sm font-medium ${notification.read ? 'text-gray-900' : 'text-[#58c9d1]'}`}>
                                  {notification.title}
                                </h3>
                                <Badge className={`text-xs ${getNotificationBadgeColor(notification.type)}`}>
                                  {notification.type === 'appointment' ? 'Agendamento' :
                                   notification.type === 'payment' ? 'Pagamento' :
                                   notification.type === 'alert' ? 'Alerta' :
                                   notification.type === 'system' ? 'Sistema' : 'Geral'}
                                </Badge>
                                {!notification.read && (
                                  <div className="w-2 h-2 bg-[#58c9d1] rounded-full"></div>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mb-2">{notification.message}</p>
                              <p className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(notification.createdAt), { 
                                  addSuffix: true, 
                                  locale: ptBR 
                                })}
                              </p>
                            </div>
                            {!notification.read && (
                              <Button
                                onClick={() => handleMarkAsRead(notification.id)}
                                disabled={markAsReadMutation.isPending}
                                variant="ghost"
                                size="sm"
                                className="text-[#58c9d1] hover:bg-[#58c9d1]/10"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
}