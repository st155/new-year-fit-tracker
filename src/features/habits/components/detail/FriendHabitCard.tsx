import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card } from '@/components/ui/card';
import { Flame, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface FriendHabitCardProps {
  friend: {
    id: string;
    username: string;
    avatar_url: string | null;
    current_streak: number;
    completion_rate: number;
  };
  className?: string;
}

export function FriendHabitCard({ friend, className }: FriendHabitCardProps) {
  const { t } = useTranslation('habits');
  
  return (
    <Card className={cn(
      "p-3 hover:border-primary/50 transition-all duration-200 hover:shadow-glow cursor-pointer",
      className
    )}>
      <div className="flex items-center gap-3">
        <Avatar className="h-10 w-10 border-2 border-primary/20">
          <AvatarImage src={friend.avatar_url || undefined} alt={friend.username} />
          <AvatarFallback className="bg-primary/10 text-primary">
            {friend.username.substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{friend.username}</p>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Flame className="h-3 w-3 text-orange-500" />
              {t('card.daysCount', '{{count}} days', { count: friend.current_streak })}
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3 text-success" />
              {friend.completion_rate}%
            </span>
          </div>
        </div>
      </div>
    </Card>
  );
}
