import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHabitFeed } from '@/hooks/useHabitFeed';
import { useHabitTeams } from '@/hooks/useHabitTeams';
import { FeedEvent } from '../social/FeedEvent';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, RefreshCw } from 'lucide-react';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { toast } from 'sonner';

export function SocialView() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'all' | 'team'>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>();
  
  const { data: myTeams } = useHabitTeams(user?.id);
  const { data: feedEvents, isLoading, refetch } = useHabitFeed(
    activeTab === 'team' ? selectedTeamId : undefined
  );

  const handleRefresh = async () => {
    await refetch();
    toast.success('Лента обновлена');
  };

  if (!user) {
    return (
      <Card className="p-8 text-center">
        <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-semibold mb-2">Войдите, чтобы увидеть активность</h3>
        <p className="text-muted-foreground">
          Присоединяйтесь к командам и следите за прогрессом друзей
        </p>
      </Card>
    );
  }

  const hasTeams = myTeams && myTeams.length > 0;

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Социальная активность</h2>
          <Button variant="ghost" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-5 w-5" />
          </Button>
        </div>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'team')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="all">Все события</TabsTrigger>
            <TabsTrigger value="team" disabled={!hasTeams}>
              Моя команда {!hasTeams && '🔒'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Card key={i} className="h-24 animate-pulse" />
                ))}
              </div>
            ) : feedEvents && feedEvents.length > 0 ? (
              feedEvents.map((event) => (
                <FeedEvent key={event.id} event={event} />
              ))
            ) : (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">Пока нет активности</h3>
                <p className="text-muted-foreground mb-4">
                  Вступите в команду или добавьте друзей, чтобы видеть их прогресс
                </p>
                <Button onClick={() => window.location.href = '/habits-v3/teams'}>
                  Найти команду
                </Button>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="team" className="space-y-3 mt-4">
            {hasTeams && (
              <div className="mb-4">
                <select
                  className="w-full p-2 rounded-md border bg-background"
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                >
                  <option value="">Выберите команду</option>
                  {myTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <Card key={i} className="h-24 animate-pulse" />
                ))}
              </div>
            ) : feedEvents && feedEvents.length > 0 ? (
              feedEvents.map((event) => (
                <FeedEvent key={event.id} event={event} />
              ))
            ) : (
              <Card className="p-8 text-center">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {selectedTeamId 
                    ? 'В команде пока нет активности'
                    : 'Выберите команду для просмотра активности'}
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </PullToRefresh>
  );
}
