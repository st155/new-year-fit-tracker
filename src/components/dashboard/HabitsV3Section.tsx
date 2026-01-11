import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useHabitsQuery } from '@/features/habits';
import { useUserLevel } from "@/hooks/useUserLevel";
import { HabitCardV3 } from "@/features/habits/components/core/HabitCardV3";
import { LevelProgressBar } from "@/features/habits/components/gamification/LevelProgressBar";
import { Target, Plus, ArrowRight, Flame, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { useHabitFeed } from "@/hooks/useHabitFeed";
import { HabitWidgetCard } from "@/features/habits/components/widgets/HabitWidgetCard";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

export function HabitsV3Section() {
  const { t } = useTranslation('feed');
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: habits, isLoading: habitsLoading, error, refetch } = useHabitsQuery({ enabled: !!user?.id });
  const { levelInfo, isLoading: levelLoading } = useUserLevel();
  const { data: feedEvents = [] } = useHabitFeed();

  console.log('🏋️ [HabitsV3Section] Render:', {
    userId: user?.id,
    habitsCount: habits?.length,
    habitsLoading,
    levelInfo,
  });

  // Smart display logic - show ALL habits with intelligent sorting
  const displayHabits = useMemo(() => {
    if (!habits) return [];
    
    return habits
      .sort((a, b) => {
        // 1. Incomplete habits first
        if (!a.completedToday && b.completedToday) return -1;
        if (a.completedToday && !b.completedToday) return 1;
        
        // 2. Duration counters higher (always active)
        if (a.habitType === 'duration_counter' && b.habitType !== 'duration_counter') return -1;
        if (a.habitType !== 'duration_counter' && b.habitType === 'duration_counter') return 1;
        
        // 3. By streak (higher = higher priority)
        const streakA = (a as any).current_streak || (a as any).streak || 0;
        const streakB = (b as any).current_streak || (b as any).streak || 0;
        return streakB - streakA;
      })
      .slice(0, 6); // Show up to 6 widgets
  }, [habits]);

  // Show loading skeleton
  if (habitsLoading || levelLoading || (user?.id && !habits)) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <Card className="border-destructive/50 p-8 text-center">
        <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('habits.errorLoading')}</h3>
        <p className="text-muted-foreground mb-4">
          {error.message || t('habits.couldNotLoad')}
        </p>
        <Button onClick={() => refetch()} variant="outline" className="gap-2">
          <Target className="h-4 w-4" />
          {t('habits.tryAgain')}
        </Button>
      </Card>
    );
  }

  // Empty state
  if (!habits || habits.length === 0) {
    return (
      <Card className="border-dashed p-8 text-center">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <Target className="h-8 w-8 text-primary" />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t('habits.startTracking')}</h3>
        <p className="text-muted-foreground mb-4 max-w-md mx-auto">
          {t('habits.createFirst')}
        </p>
        <Button onClick={() => navigate('/habits')} className="gap-2">
          <Plus className="h-4 w-4" />
          {t('habits.createFirstButton')}
        </Button>
      </Card>
    );
  }

  // Calculate quick stats
  const completedToday = habits?.filter(h => h.completedToday).length || 0;
  const totalActive = habits?.length || 0;
  const activeStreaks = habits?.filter(h => 
    (h.habitType === "duration_counter" || h.habitType === "daily") && 
    (h as any).current_streak && (h as any).current_streak > 0
  ).length || 0;

  return (
    <div className="space-y-4">
      {/* Level Progress Bar */}
      {levelInfo && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Card className="p-4 bg-gradient-to-br from-primary/5 via-purple-500/5 to-primary/5 border-primary/20">
            <LevelProgressBar
              level={levelInfo.level}
              totalXP={levelInfo.totalXP}
              xpToNext={levelInfo.xpToNext}
              progressPercent={levelInfo.progressPercent}
            />
          </Card>
        </motion.div>
      )}

      {/* Header with Quick Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
            {t('habits.title')}
          </h2>
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Target className="h-3 w-3" />
              {t('habits.today')}: {completedToday}/{totalActive}
            </span>
            {activeStreaks > 0 && (
              <span className="flex items-center gap-1 text-orange-500">
                <Flame className="h-3 w-3" />
                {t('habits.streaks')}: {activeStreaks}
              </span>
            )}
            {levelInfo && (
              <span className="flex items-center gap-1 text-primary">
                ⭐ XP: {levelInfo.totalXP}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => navigate('/habits/teams')} 
            variant="outline" 
            size="sm" 
            className="gap-2"
          >
            <Users className="h-4 w-4" />
            {t('habits.teams')}
          </Button>
          <Button 
            onClick={() => navigate('/habits')} 
            variant="outline" 
            size="sm" 
            className="gap-2"
          >
            {t('habits.allHabits')}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Apple Health Style Habit Widgets - Up to 6 */}
      {displayHabits.length > 0 ? (
        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {displayHabits.map((habit, index) => (
            <motion.div
              key={habit.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ 
                duration: 0.3, 
                delay: index * 0.05,
                ease: "easeOut"
              }}
            >
              <HabitWidgetCard
                habit={habit}
                onClick={() => navigate(`/habits/${habit.id}`)}
              />
            </motion.div>
          ))}
        </div>
      ) : (
        <Card className="p-6 text-center border-dashed">
          <div className="text-4xl mb-2">🎉</div>
          <p className="text-muted-foreground">
            {t('habits.allCompleted')}
          </p>
        </Card>
      )}

      {/* Social Activity Block */}
      {feedEvents && feedEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
        >
          <Card className="p-4 bg-gradient-to-br from-accent/5 to-primary/5 border-accent/20">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">{t('social.teamActivity')}</h3>
              </div>
              <Button
                onClick={() => navigate('/habits?tab=social')}
                variant="ghost"
                size="sm"
                className="gap-2 h-8"
              >
                {t('social.allEvents')}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-2">
              {feedEvents.slice(0, 2).map((event) => (
                <div
                  key={event.id}
                  className="text-sm text-muted-foreground flex items-start gap-2 p-2 rounded-lg bg-background/50"
                >
                  <span className="text-base">
                    {event.event_type === 'completion' ? '✓' : 
                     event.event_type === 'streak' ? '🔥' : 
                     event.event_type === 'milestone' ? '🏆' : '⭐'}
                  </span>
                  <div className="flex-1">
                    <span className="font-medium text-foreground">
                      {event.profiles?.username || t('social.user')}
                    </span>
                    {' '}
                    {event.event_type === 'completion' && t('events.completion')}
                    {event.event_type === 'streak' && t('events.streak')}
                    {event.event_type === 'milestone' && t('events.milestone')}
                    {event.event_type === 'level_up' && t('events.level_up')}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
