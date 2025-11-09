import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHabits } from '@/hooks/useHabits';
import { useHabitCompletion } from '@/hooks/useHabitCompletion';
import { useHabitInsights } from '@/hooks/useHabitInsights';
import { useUserLevel } from '@/hooks/useUserLevel';
import { useSocialNotifications } from '@/hooks/useSocialNotifications';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartView } from '@/components/habits-v3/layouts';
import { SocialView } from '@/components/habits-v3/layouts/SocialView';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Trophy } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { HabitsV3Onboarding } from '@/components/habits-v3/onboarding/HabitsV3Onboarding';
import { ScreenReaderAnnouncement } from '@/components/ui/screen-reader-announcement';
import { HabitsInsightBanner } from '@/components/habits-v3/HabitsInsightBanner';
import { LevelProgressBar } from '@/components/habits-v3/gamification/LevelProgressBar';
import { LevelUpCelebration } from '@/components/habits-v3/gamification/LevelUpCelebration';
import { AchievementsModal } from '@/components/habits-v3/gamification/AchievementsModal';
import { NotificationCenter } from '@/components/habits-v3/social/NotificationCenter';

// Lazy load heavy components
const CompactListView = lazy(() => import('@/components/habits-v3/layouts/CompactListView').then(m => ({ default: m.CompactListView })));
const FocusMode = lazy(() => import('@/components/habits-v3/layouts/FocusMode').then(m => ({ default: m.FocusMode })));
const TimelineView = lazy(() => import('@/components/habits-v3/layouts/TimelineView').then(m => ({ default: m.TimelineView })));
const AnalyticsView = lazy(() => import('@/components/habits-v3/layouts/AnalyticsView').then(m => ({ default: m.AnalyticsView })));

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <Skeleton key={i} className="h-32 w-full" />
    ))}
  </div>
);

export default function HabitsV3() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { habits, isLoading, refetch } = useHabits(user?.id || '');
  const { completeHabit, isCompleting } = useHabitCompletion();
  const { levelInfo } = useUserLevel();
  
  // Enable social notifications
  useSocialNotifications(!!user?.id);
  
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [showAchievements, setShowAchievements] = useState(false);
  
  // Get habit insights
  const { all: insights, isLoading: insightsLoading } = useHabitInsights({
    userId: user?.id,
    habits: habits || [],
    enabled: !!user?.id && habits.length > 0,
  });
  
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem('habitsV3_onboarding_completed');
  });
  const [announcement, setAnnouncement] = useState('');
  
  const handleOnboardingComplete = () => {
    localStorage.setItem('habitsV3_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  useEffect(() => {
    if (!user) {
      navigate('/auth');
    }
  }, [user, navigate]);

  const handleHabitComplete = async (habitId: string) => {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const result = await completeHabit(habitId, habit);
    if (result?.success) {
      setAnnouncement(
        `Привычка "${habit.name}" выполнена. +${result.xpEarned} XP. ${result.streakCount > 1 ? `${result.streakCount} дней подряд!` : ''}`
      );
      
      // Show level up celebration
      if (result.newLevel) {
        setNewLevel(result.newLevel);
        setShowLevelUp(true);
      }
      
      await refetch();
    }
  };

  const handleHabitTap = (habitId: string) => {
    navigate(`/habits/${habitId}`);
  };

  const handleRefresh = async () => {
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <>
      <HabitsV3Onboarding open={showOnboarding} onComplete={handleOnboardingComplete} />
      <LevelUpCelebration open={showLevelUp} onOpenChange={setShowLevelUp} newLevel={newLevel} />
      <AchievementsModal open={showAchievements} onOpenChange={setShowAchievements} />
      <ScreenReaderAnnouncement message={announcement} />
      
      <PullToRefresh onRefresh={handleRefresh}>
        <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold">Привычки 3.0</h1>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button variant="outline" size="icon" onClick={() => setShowAchievements(true)}>
              <Trophy className="w-5 h-5" />
            </Button>
            <Button onClick={() => navigate('/habits/new')} size="lg">
              <Plus className="w-5 h-5 mr-2" />
              Добавить
            </Button>
          </div>
        </div>

        {/* Level Progress */}
        {levelInfo && (
          <div className="mb-6">
            <LevelProgressBar
              level={levelInfo.level}
              totalXP={levelInfo.totalXP}
              xpToNext={levelInfo.xpToNext}
              progressPercent={levelInfo.progressPercent}
            />
          </div>
        )}

        {/* Insights Banner */}
        {!insightsLoading && insights.length > 0 && (
          <HabitsInsightBanner
            insights={insights}
            onAction={(insight) => {
              if (insight.action?.type === 'navigate' && insight.action.path) {
                navigate(insight.action.path);
              }
            }}
          />
        )}

        {/* Tabs */}
        <Tabs defaultValue="smart" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
            <TabsTrigger value="smart" className="text-xs sm:text-sm">
              🧠 Умный
            </TabsTrigger>
            <TabsTrigger value="compact" className="text-xs sm:text-sm">
              📋 Список
            </TabsTrigger>
            <TabsTrigger value="social" className="text-xs sm:text-sm">
              🤝 Соц
            </TabsTrigger>
            <TabsTrigger value="focus" className="text-xs sm:text-sm hidden lg:block">
              🎯 Фокус
            </TabsTrigger>
            <TabsTrigger value="timeline" className="text-xs sm:text-sm hidden lg:block">
              ⏰ График
            </TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs sm:text-sm hidden lg:block">
              📊 Данные
            </TabsTrigger>
          </TabsList>

          <TabsContent value="smart">
            <SmartView
              habits={habits}
              onHabitComplete={handleHabitComplete}
              onHabitTap={handleHabitTap}
            />
          </TabsContent>

          <TabsContent value="compact">
            <Suspense fallback={<LoadingSkeleton />}>
              <CompactListView
                habits={habits}
                onHabitComplete={handleHabitComplete}
                onHabitTap={handleHabitTap}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="focus">
            <Suspense fallback={<LoadingSkeleton />}>
              <FocusMode
                habits={habits.filter(h => !h.completed_today)}
                onHabitComplete={handleHabitComplete}
                onExit={() => navigate('/habits-v3')}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="timeline">
            <Suspense fallback={<LoadingSkeleton />}>
              <TimelineView
                habits={habits}
                onHabitClick={handleHabitTap}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="analytics">
            <Suspense fallback={<LoadingSkeleton />}>
              <AnalyticsView
                habits={habits}
                userId={user?.id}
              />
            </Suspense>
          </TabsContent>

          <TabsContent value="social">
            <SocialView />
          </TabsContent>
        </Tabs>
      </div>
    </PullToRefresh>
    </>
  );
}
