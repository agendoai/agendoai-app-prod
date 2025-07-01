import React, { useState } from 'react';
import { useNotifications } from '@/hooks/use-notifications';
import { Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function NotificationsMenu({ onClose }: { onClose?: () => void } = {}) {
  const { notifications, markAsRead, clearAllNotifications } = useNotifications();
  const [open, setOpen] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleMarkAsRead = (id: number) => {
    markAsRead(id);
  };

  const handleClearAll = () => {
    clearAllNotifications();
    setOpen(false);
    if (onClose) onClose();
  };

  const getRelativeTime = (date: Date): string => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHour = Math.floor(diffMin / 60);
    const diffDay = Math.floor(diffHour / 24);

    if (diffSec < 60) {
      return 'Agora mesmo';
    } else if (diffMin < 60) {
      return `${diffMin} min atrás`;
    } else if (diffHour < 24) {
      return `${diffHour} h atrás`;
    } else if (diffDay < 7) {
      return `${diffDay} ${diffDay === 1 ? 'dia' : 'dias'} atrás`;
    } else {
      return format(date, 'dd/MM/yyyy', { locale: ptBR });
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 px-1.5 py-0.5 min-w-5 h-5 flex items-center justify-center rounded-full"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <Tabs defaultValue="all" className="w-full">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Notificações</CardTitle>
              <TabsList className="grid w-[160px] grid-cols-2">
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger value="unread">Não lidas</TabsTrigger>
              </TabsList>
            </div>
            <CardDescription>
              {unreadCount > 0
                ? `Você tem ${unreadCount} notificação${unreadCount !== 1 ? 'ções' : ''} não lida${unreadCount !== 1 ? 's' : ''}`
                : 'Nenhuma notificação não lida'}
            </CardDescription>
          </CardHeader>
          
          <TabsContent value="all" className="max-h-[400px] overflow-auto">
            {notifications.length > 0 ? (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`p-3 ${notification.read ? 'bg-background' : 'bg-accent/20'}`}
                  onClick={() => !notification.read && handleMarkAsRead(notification.id)}
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{notification.title}</span>
                    <span className="text-xs text-muted-foreground">{getRelativeTime(new Date(notification.createdAt))}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  {notification.type && (
                    <Badge className="mt-2" variant="outline">
                      {notification.type}
                    </Badge>
                  )}
                  {notification !== notifications[notifications.length - 1] && <Separator className="mt-3" />}
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                Nenhuma notificação
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="unread" className="max-h-[400px] overflow-auto">
            {notifications.filter(n => !n.read).length > 0 ? (
              notifications.filter(n => !n.read).map(notification => (
                <div 
                  key={notification.id} 
                  className="p-3 bg-accent/20"
                  onClick={() => handleMarkAsRead(notification.id)}
                >
                  <div className="flex justify-between mb-1">
                    <span className="text-sm font-medium">{notification.title}</span>
                    <span className="text-xs text-muted-foreground">{getRelativeTime(new Date(notification.createdAt))}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{notification.message}</p>
                  {notification.type && (
                    <Badge className="mt-2" variant="outline">
                      {notification.type}
                    </Badge>
                  )}
                  {notification !== notifications.filter(n => !n.read)[notifications.filter(n => !n.read).length - 1] && 
                    <Separator className="mt-3" />
                  }
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-muted-foreground">
                Nenhuma notificação não lida
              </div>
            )}
          </TabsContent>
          
          {notifications.length > 0 && (
            <CardFooter className="border-t p-2 flex justify-center">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full"
                onClick={handleClearAll}
              >
                Limpar todas
              </Button>
            </CardFooter>
          )}
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}