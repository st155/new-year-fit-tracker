import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Trophy, Flame, Target, CheckCircle2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import type { HabitFeedEvent } from '@/hooks/useHabitFeed';

interface FeedEventProps {
  event: HabitFeedEvent;
  onReact?: (reactionType: string) => void;
  onRemoveReaction?: () => void;
}

const eventIcons = {
  completion: CheckCircle2,
  streak: Flame,
  achievement: Trophy,
  milestone: Target,
  challenge_complete: Trophy,
};

const reactionEmojis = ['🔥', '💪', '👏', '🎉', '⭐'];

export function FeedEvent({ event, onReact, onRemoveReaction }: FeedEventProps) {
  const { t, i18n } = useTranslation('feed');
  const Icon = eventIcons[event.event_type] || CheckCircle2;
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  
  const getEventText = () => {
    switch (event.event_type) {
      case 'completion':
        return t('events.completion', { name: event.event_data?.habit_name });
      case 'streak':
        return t('events.streak', { days: event.event_data?.streak_days });
      case 'achievement':
        return t('events.achievement', { name: event.event_data?.achievement_name });
      case 'milestone':
        return t('events.milestone', { text: event.event_data?.milestone_text });
      case 'challenge_complete':
        return t('events.challengeComplete', { name: event.event_data?.challenge_name });
      default:
        return t('events.progressUpdate');
    }
  };

  return (
    <Card className="p-4">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={event.profiles?.avatar_url || undefined} />
          <AvatarFallback>
            {event.profiles?.username?.[0]?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-start gap-2 mb-2">
            <Icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-semibold">{event.profiles?.full_name || event.profiles?.username}</span>
                {' '}
                <span className="text-muted-foreground">{getEventText()}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {formatDistanceToNow(new Date(event.created_at), { 
                  addSuffix: true, 
                  locale: dateLocale 
                })}
              </p>
            </div>
          </div>

          {/* Reactions */}
          <div className="flex items-center gap-2 mt-3">
            {reactionEmojis.map((emoji) => {
              const count = event.reaction_counts?.[emoji] || 0;
              const isUserReaction = event.user_reaction === emoji;

              return (
                <Button
                  key={emoji}
                  variant={isUserReaction ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 px-2 gap-1"
                  onClick={() => {
                    if (isUserReaction) {
                      onRemoveReaction?.();
                    } else {
                      onReact?.(emoji);
                    }
                  }}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span className="text-xs">{count}</span>}
                </Button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}
