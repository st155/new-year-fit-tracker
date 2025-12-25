import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AchievementBadge } from './AchievementBadge';
import { useAuth } from '@/hooks/useAuth';
import { getUserAchievements, getAchievementProgress, type AchievementCheckParams } from '@/lib/gamification/achievement-checker';
import { ACHIEVEMENT_DEFINITIONS } from '@/lib/gamification/achievement-definitions';
import { Skeleton } from '@/components/ui/skeleton';

interface AchievementsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  checkParams?: AchievementCheckParams;
}

export function AchievementsModal({ open, onOpenChange, checkParams }: AchievementsModalProps) {
  const { user } = useAuth();
  const [achievements, setAchievements] = useState<any[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (open && user) {
      loadAchievements();
    }
  }, [open, user]);

  const loadAchievements = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // Get unlocked achievements
      const unlocked = await getUserAchievements(user.id);
      const unlockedIds = new Set(unlocked.map(a => a.id));

      // Get progress for locked achievements
      const progressData = checkParams
        ? await getAchievementProgress({ ...checkParams, userId: user.id })
        : {};

      setProgress(progressData);

      // Combine all achievements with unlock status
      const all = ACHIEVEMENT_DEFINITIONS.map(def => {
        const unlockedData = unlocked.find(u => u.id === def.id);
        return {
          ...def,
          unlocked: unlockedIds.has(def.id),
          unlockedAt: unlockedData?.unlockedAt,
          progress: progressData[def.id] || 0,
        };
      });

      setAchievements(all);
    } catch (error) {
      console.error('Error loading achievements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredAchievements = achievements.filter(a => {
    if (activeTab === 'unlocked') return a.unlocked;
    if (activeTab === 'locked') return !a.unlocked;
    return true;
  });

  const unlockedCount = achievements.filter(a => a.unlocked).length;
  const totalCount = achievements.length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">Достижения</DialogTitle>
          <DialogDescription>
            Разблокировано {unlockedCount} из {totalCount} достижений
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">
              Все ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="unlocked">
              Разблокированные ({unlockedCount})
            </TabsTrigger>
            <TabsTrigger value="locked">
              Заблокированные ({totalCount - unlockedCount})
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="mt-6">
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} className="h-48" />
                ))}
              </div>
            ) : (
              <>
                {filteredAchievements.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <p>
                      {activeTab === 'unlocked'
                        ? 'Пока нет разблокированных достижений'
                        : activeTab === 'locked'
                        ? 'Все достижения разблокированы! 🎉'
                        : 'Нет достижений'}
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredAchievements.map(achievement => (
                      <AchievementBadge
                        key={achievement.id}
                        achievement={achievement}
                        unlocked={achievement.unlocked}
                        unlockedAt={achievement.unlockedAt}
                        progress={achievement.progress}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
