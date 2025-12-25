import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHabitNotifications, useMarkNotificationRead } from '@/hooks/useHabitFeed';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Bell, CheckCheck, Trophy, Users, Heart, MessageCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

const notificationIcons: Record<string, any> = {
  achievement: Trophy,
  team_invite: Users,
  friend_request: Users,
  reaction: Heart,
  comment: MessageCircle,
  default: Bell,
};

export function NotificationCenter() {
  const { user } = useAuth();
  const { data: notifications } = useHabitNotifications(user?.id);
  const markRead = useMarkNotificationRead();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const unreadCount = notifications?.filter((n: any) => !n.is_read).length || 0;

  const handleMarkAllRead = async () => {
    if (!notifications) return;
    
    const unreadNotifications = notifications.filter((n: any) => !n.is_read);
    await Promise.all(
      unreadNotifications.map((n: any) => markRead.mutateAsync(n.id))
    );
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markRead.mutate(notification.id);
    }
    
    // Navigate based on notification type
    if (notification.metadata?.team_id) {
      window.location.href = `/habits-v3/teams/${notification.metadata.team_id}`;
    }
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Уведомления</span>
          {unreadCount > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleMarkAllRead}
              className="h-auto p-1 text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Прочитать все
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <ScrollArea className="h-[400px]">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification: any) => {
              const Icon = notificationIcons[notification.type] || notificationIcons.default;
              
              return (
                <DropdownMenuItem
                  key={notification.id}
                  className={`flex items-start gap-3 p-3 cursor-pointer ${
                    !notification.is_read ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="shrink-0">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium line-clamp-2">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-1">
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ru,
                      })}
                    </p>
                  </div>
                  {!notification.is_read && (
                    <div className="shrink-0 w-2 h-2 bg-primary rounded-full" />
                  )}
                </DropdownMenuItem>
              );
            })
          ) : (
            <div className="p-8 text-center">
              <Bell className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">Нет уведомлений</p>
            </div>
          )}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
