import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useHabitFeed } from '@/hooks/useHabitFeed';
import { useHabitTeams } from '@/hooks/useHabitTeams';
import { FeedEvent } from '../social/FeedEvent';
import { SocialOnboarding } from '../social/SocialOnboarding';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, RefreshCw, Plus, Search, Sparkles } from 'lucide-react';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function SocialView() {
  const { t } = useTranslation('habits');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'all' | 'team'>('all');
  const [selectedTeamId, setSelectedTeamId] = useState<string>();
  
  const { data: myTeams } = useHabitTeams(user?.id);
  const { data: feedEvents, isLoading, refetch } = useHabitFeed(
    activeTab === 'team' ? selectedTeamId : undefined
  );

  const handleRefresh = async () => {
    await refetch();
    toast.success(t('toast.feedRefreshed'));
  };

  const hasTeams = myTeams && myTeams.length > 0;
  const hasEvents = feedEvents && feedEvents.length > 0;
  const shouldShowOnboarding = !hasEvents && !hasTeams;

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

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="space-y-4">
        {/* Show onboarding if no events and no teams */}
        {shouldShowOnboarding && <SocialOnboarding />}

        {/* Debug Info in Dev Mode */}
        {import.meta.env.DEV && (
          <Card className="p-4 bg-muted/30 border-dashed">
            <div className="flex items-center justify-between text-sm">
              <div className="space-y-1">
                <p className="font-semibold">🛠️ Debug Info:</p>
                <p>События в ленте: {feedEvents?.length || 0}</p>
                <p>Команды: {myTeams?.length || 0}</p>
                <p>Активная вкладка: {activeTab}</p>
                {selectedTeamId && <p>Выбранная команда: {selectedTeamId}</p>}
              </div>
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    console.log('=== SOCIAL FEED DEBUG ===');
                    console.log('Feed Events:', feedEvents);
                    console.log('My Teams:', myTeams);
                    console.log('Active Tab:', activeTab);
                    console.log('Selected Team:', selectedTeamId);
                  }}
                >
                  📋 Log
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetch()}
                >
                  🔄 Refetch
                </Button>
              </div>
            </div>
          </Card>
        )}

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
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : feedEvents && feedEvents.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {feedEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0, 
                      scale: 1,
                      transition: {
                        delay: index * 0.05,
                        duration: 0.3,
                        ease: "easeOut"
                      }
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0.9,
                      transition: { duration: 0.2 }
                    }}
                    layout
                  >
                    <FeedEvent event={event} />
                  </motion.div>
                ))}
              </AnimatePresence>
            ) : (
              <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.3 }}
                >
                  <div className="relative mb-4">
                    <Sparkles className="h-12 w-12 mx-auto text-primary animate-pulse" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">Начните свой путь! 🚀</h3>
                  <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                    Завершайте привычки, чтобы они появлялись в ленте активности. 
                    Создавайте команды и следите за прогрессом друзей!
                  </p>
                  <div className="flex flex-col sm:flex-row gap-2 justify-center">
                    <Button 
                      onClick={() => navigate('/habits-v3/teams')}
                      variant="default"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Создать команду
                    </Button>
                    <Button 
                      onClick={() => navigate('/habits-v3/teams')}
                      variant="outline"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      Найти команду
                    </Button>
                  </div>
                </motion.div>
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
                  <Skeleton key={i} className="h-24" />
                ))}
              </div>
            ) : feedEvents && feedEvents.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {feedEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    initial={{ opacity: 0, y: -20, scale: 0.95 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0, 
                      scale: 1,
                      transition: {
                        delay: index * 0.05,
                        duration: 0.3,
                        ease: "easeOut"
                      }
                    }}
                    exit={{ 
                      opacity: 0, 
                      scale: 0.9,
                      transition: { duration: 0.2 }
                    }}
                    layout
                  >
                    <FeedEvent event={event} />
                  </motion.div>
                ))}
              </AnimatePresence>
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
