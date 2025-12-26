import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useHabitsQuery } from '@/features/habits';
import { useHabitCompletion } from '@/hooks/useHabitCompletion';
import { useHabitInsights } from '@/hooks/useHabitInsights';
import { useUserLevel } from '@/hooks/useUserLevel';
import { useSocialNotifications } from '@/hooks/useSocialNotifications';
import { useDeleteHabit } from '@/hooks/useDeleteHabit';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SmartView, AllHabitsView } from '@/features/habits/components/layouts';
import { SocialView } from '@/features/habits/components/layouts/SocialView';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft, Trophy, Zap, BarChart3 } from 'lucide-react';
import { FAB } from '@/components/ui/fab';
import { HabitCreateDialog } from '@/features/habits/components/legacy/HabitCreateDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { ErrorState } from '@/components/ui/ErrorState';
import { PullToRefresh } from '@/components/ui/pull-to-refresh';
import { HabitsV3Onboarding } from '@/features/habits/components/onboarding/HabitsV3Onboarding';
import { ScreenReaderAnnouncement } from '@/components/ui/screen-reader-announcement';
import { HabitsInsightBanner } from '@/features/habits/components/HabitsInsightBanner';
import { LevelProgressBar } from '@/features/habits/components/gamification/LevelProgressBar';
import { LevelUpCelebration } from '@/features/habits/components/gamification/LevelUpCelebration';
import { AchievementsModal } from '@/features/habits/components/gamification/AchievementsModal';
import { NotificationCenter } from '@/features/habits/components/social/NotificationCenter';

// Lazy load heavy components
const CompactListView = lazy(() => import('@/features/habits/components/layouts/CompactListView').then(m => ({ default: m.CompactListView })));
const FocusMode = lazy(() => import('@/features/habits/components/layouts/FocusMode').then(m => ({ default: m.FocusMode })));
const TimelineView = lazy(() => import('@/features/habits/components/layouts/TimelineView').then(m => ({ default: m.TimelineView })));
const AnalyticsView = lazy(() => import('@/features/habits/components/layouts/AnalyticsView').then(m => ({ default: m.AnalyticsView })));

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
  const { data: habitsData = [], isLoading, error, refetch } = useHabitsQuery({ enabled: !!user?.id });
  const habits = Array.isArray(habitsData) ? habitsData : [];
  const { completeHabit, isCompleting } = useHabitCompletion();
  const { levelInfo } = useUserLevel();
  const { deleteHabit, archiveHabit, isDeleting, isArchiving } = useDeleteHabit();
  
  // Enable social notifications
  useSocialNotifications(!!user?.id);
  
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [showAchievements, setShowAchievements] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  
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
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  
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

  const handleArchive = (habitId: string) => {
    archiveHabit(habitId);
  };

  const handleDelete = (habitId: string) => {
    setHabitToDelete(habitId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = () => {
    if (habitToDelete) {
      deleteHabit(habitToDelete);
      setHabitToDelete(null);
      setShowDeleteDialog(false);
    }
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

  if (error && habits.length === 0) {
    return (
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <ErrorState
          title="Не удалось загрузить привычки"
          message="Произошла ошибка при загрузке данных. Попробуйте обновить страницу."
          onRetry={refetch}
        />
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
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="flex w-full overflow-x-auto scrollbar-hide gap-1 p-1">
            <TabsTrigger value="all" className="flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 whitespace-nowrap">
              📊 Все
            </TabsTrigger>
            <TabsTrigger value="smart" className="flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 whitespace-nowrap">
              🧠 Умный
            </TabsTrigger>
            <TabsTrigger value="compact" className="flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 whitespace-nowrap">
              📋 Список
            </TabsTrigger>
            <TabsTrigger value="social" className="flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 whitespace-nowrap">
              🤝 Соц
            </TabsTrigger>
            <TabsTrigger value="focus" className="flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 whitespace-nowrap">
              🎯 Фокус
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 whitespace-nowrap">
              ⏰ График
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-shrink-0 text-xs sm:text-sm px-3 py-1.5 whitespace-nowrap">
              📊 Данные
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all">
            <AllHabitsView
              habits={habits}
              onHabitComplete={handleHabitComplete}
              onHabitClick={handleHabitTap}
            />
          </TabsContent>

          <TabsContent value="smart">
              <SmartView
                habits={habits}
                onHabitComplete={handleHabitComplete}
                onHabitTap={handleHabitTap}
                onHabitArchive={handleArchive}
                onHabitDelete={handleDelete}
                onHabitEdit={(id) => navigate(`/habits/${id}`)}
                onHabitViewHistory={(id) => navigate(`/habits/${id}`)}
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
                habits={habits.filter(h => !h.completedToday)}
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

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="glass-card">
            <AlertDialogHeader>
              <AlertDialogTitle>Удалить привычку навсегда?</AlertDialogTitle>
              <AlertDialogDescription>
                Это действие нельзя отменить. Все данные о привычке будут удалены безвозвратно.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Отмена</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Удалить
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Screen reader announcements */}
        <ScreenReaderAnnouncement message={announcement} />
      </div>
    </PullToRefresh>

      {/* Create Habit Dialog */}
      <HabitCreateDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onHabitCreated={refetch}
      />

      {/* FAB for quick actions */}
      <FAB
        actions={[
          {
            label: 'Новая привычка',
            icon: Plus,
            onClick: () => setCreateDialogOpen(true),
            color: 'text-primary'
          },
          {
            label: 'Быстрое выполнение',
            icon: Zap,
            onClick: () => {
              const firstUncompleted = habits.find(h => !h.completedToday);
              if (firstUncompleted) {
                handleHabitComplete(firstUncompleted.id);
              }
            },
            badge: habits.filter(h => !h.completedToday).length,
            color: 'text-warning'
          },
          {
            label: 'Статистика',
            icon: BarChart3,
            onClick: () => navigate('/habits-v3'),
            color: 'text-info'
          }
        ]}
      />

      {/* Dev Mode Tools */}
      {import.meta.env.DEV && (
        <div className="fixed bottom-4 right-4 z-50">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="shadow-lg">
                🛠️ Dev Tools
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={async () => {
                  if (user?.id) {
                    const { generateDemoTeams } = await import('@/lib/test-data/habit-social-demo');
                    await generateDemoTeams(user.id);
                    await refetch();
                  }
                }}
              >
                Создать демо команды
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={async () => {
                  if (user?.id && habits.length > 0) {
                    const { generateDemoFeedEvents } = await import('@/lib/test-data/habit-social-demo');
                    await generateDemoFeedEvents(user.id, habits[0].id, habits[0].name);
                  }
                }}
                disabled={!habits.length}
              >
                Создать демо события
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </>
  );
}
