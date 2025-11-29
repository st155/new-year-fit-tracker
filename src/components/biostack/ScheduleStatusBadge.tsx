import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { formatTimeUntil } from '@/lib/supplement-timing';

interface ScheduleStatusBadgeProps {
  isDueNow: boolean;
  isOverdue: boolean;
  minutesUntilDue?: number;
  minutesOverdue?: number;
  takenAt?: Date;
  className?: string;
}

export function ScheduleStatusBadge({
  isDueNow,
  isOverdue,
  minutesUntilDue,
  minutesOverdue,
  takenAt,
  className
}: ScheduleStatusBadgeProps) {
  if (takenAt) {
    const time = new Date(takenAt).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs border-green-500/50 bg-green-500/10 text-green-400",
          className
        )}
      >
        ✅ {time}
      </Badge>
    );
  }

  if (isOverdue && minutesOverdue) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs border-red-500/50 bg-red-500/10 text-red-400 animate-pulse",
          className
        )}
      >
        ⚠️ {formatTimeUntil(minutesOverdue)} overdue
      </Badge>
    );
  }

  if (isDueNow) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs border-amber-500/50 bg-amber-500/10 text-amber-400",
          className
        )}
      >
        ⏰ DUE NOW
      </Badge>
    );
  }

  if (minutesUntilDue !== undefined) {
    return (
      <Badge 
        variant="outline" 
        className={cn(
          "text-xs border-blue-500/30 bg-blue-500/5 text-blue-400",
          className
        )}
      >
        🕐 in {formatTimeUntil(minutesUntilDue)}
      </Badge>
    );
  }

  return null;
}
