import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, UserPlus, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useHabitFriendsWithSame, useTeamsWithHabit, useHabitSocialFeed } from '@/hooks/useHabitSocial';
import { FriendHabitCard } from './FriendHabitCard';
import { TeamHabitCard } from './TeamHabitCard';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface HabitSocialSectionProps {
  habitId: string;
  habitName: string;
}

export function HabitSocialSection({ habitId, habitName }: HabitSocialSectionProps) {
  const navigate = useNavigate();
  const { data: friends, isLoading: friendsLoading } = useHabitFriendsWithSame(habitName);
  const { data: teams, isLoading: teamsLoading } = useTeamsWithHabit(habitName);
  const { data: feedEvents, isLoading: feedLoading } = useHabitSocialFeed(habitId);

  const isLoading = friendsLoading || teamsLoading || feedLoading;

  if (isLoading) {
    return (
      <Card className="glass-card border-white/10">
        <CardContent className="p-6 space-y-6">
          <Skeleton className="h-6 w-48" />
          <div className="space-y-3">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasSocialActivity = (friends?.length || 0) > 0 || (teams?.length || 0) > 0 || (feedEvents?.length || 0) > 0;

  return (
    <Card className="glass-card border-white/10">
      <CardContent className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Социальная активность
          </h2>
        </div>

        {/* Friends with same habit */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Друзья также выполняют
          </h3>
          {friends && friends.length > 0 ? (
            <div className="grid gap-3 md:grid-cols-2">
              {friends.slice(0, 4).map(friend => (
                <FriendHabitCard key={friend.id} friend={friend} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<UserPlus className="h-12 w-12" />}
              title="Пригласите друзей"
              description="Отслеживайте привычки вместе и мотивируйте друг друга"
              action={{
                label: "Добавить друзей",
                onClick: () => navigate('/habits-v3?tab=social')
              }}
              className="border-dashed"
            />
          )}
        </div>

        {/* Teams with this habit */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <Users className="h-4 w-4" />
            Команды
          </h3>
          {teams && teams.length > 0 ? (
            <div className="space-y-2">
              {teams.slice(0, 3).map(team => (
                <TeamHabitCard key={team.id} team={team} />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<Users className="h-12 w-12" />}
              title="Создайте команду"
              description="Объединитесь с другими и достигайте целей вместе"
              action={{
                label: "Создать команду",
                onClick: () => navigate('/habits-v3?tab=social')
              }}
              className="border-dashed"
            />
          )}
        </div>

        {/* Recent activity */}
        {feedEvents && feedEvents.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              Недавняя активность
            </h3>
          <div className="space-y-2">
              {feedEvents.map(event => (
                <Card key={event.id} className="p-3 border-white/5 bg-white/5">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold">
                          {event.profiles?.username || event.profiles?.full_name || 'Пользователь'}
                        </span>
                        {' '}
                        {event.event_type === 'habit_completed' && 'выполнил привычку'}
                        {event.event_type === 'streak_milestone' && 'достиг новой серии'}
                        {event.event_type === 'level_up' && 'повысил уровень'}
                        {!['habit_completed', 'streak_milestone', 'level_up'].includes(event.event_type) && 'обновил активность'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(event.created_at), { addSuffix: true, locale: ru })}
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!hasSocialActivity && (
          <div className="text-center py-8">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground mb-4">
              Пока нет социальной активности для этой привычки
            </p>
            <Button onClick={() => navigate('/habits-v3?tab=social')} variant="outline" className="gap-2">
              <Users className="h-4 w-4" />
              Перейти к социальным функциям
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
