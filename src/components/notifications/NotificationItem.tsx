import { formatDistanceToNow } from 'date-fns';
import { getDateLocale } from '@/lib/date-locale';
import { cn } from '@/lib/utils';
import type { Notification } from '@/hooks/useNotifications';

interface NotificationItemProps {
  notification: Notification;
  onClick: () => void;
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const Icon = notification.icon;

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 cursor-pointer transition-colors hover:bg-accent/50",
        !notification.read && "bg-primary/5"
      )}
      onClick={onClick}
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
          {formatDistanceToNow(new Date(notification.timestamp), {
            addSuffix: true,
            locale: getDateLocale(),
          })}
        </p>
      </div>
      {!notification.read && (
        <div className="shrink-0 w-2 h-2 bg-primary rounded-full" />
      )}
    </div>
  );
}
