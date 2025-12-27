import { lazy, Suspense, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useHabitsQuery } from '@/features/habits';
import { useCompleteHabit, useHabitInsights, useDeleteHabit } from '@/features/habits/hooks';
import { useUserLevel } from '@/hooks/useUserLevel';
import { useSocialNotifications } from '@/hooks/useSocialNotifications';
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
import { SmartView, AllHabitsView } from '@/features/habits/components/layouts';
import { HabitsDashboardV4 } from '@/features/habits/components/dashboard';
import { ViewSwitcher, ViewMode } from '@/features/habits/components/ViewSwitcher';
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
const AnalyticsView = lazy(() => import('@/features/habits/components/layouts/AnalyticsView').then(m => ({ default: m.AnalyticsView })));

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <Skeleton key={i} className="h-32 w-full" />
    ))}
  </div>
);

export default function HabitsV3() {
  const { t } = useTranslation('habits');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: habitsData = [], isLoading, error, refetch } = useHabitsQuery({ enabled: !!user?.id });
  const habits = Array.isArray(habitsData) ? habitsData : [];
  const { completeHabit, isCompleting } = useCompleteHabit();
  const { levelInfo } = useUserLevel();
  const { deleteHabit, archiveHabit, isDeleting, isArchiving } = useDeleteHabit();
  
  // Enable social notifications
  useSocialNotifications(!!user?.id);
  
  const [showLevelUp, setShowLevelUp] = useState(false);
  const [newLevel, setNewLevel] = useState(0);
  const [showAchievements, setShowAchievements] = useState(false);
  const [habitToDelete, setHabitToDelete] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('widgets');
  
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
        `${t('completion.success')}: "${habit.name}". +${result.xpEarned} XP. ${result.streakCount > 1 ? t('completion.streak', { count: result.streakCount }) : ''}`
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
          title={t('error.title')}
          message={t('error.message')}
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
            <h1 className="text-3xl font-bold">{t('title')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <ViewSwitcher value={viewMode} onChange={setViewMode} />
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

        {/* View Content */}
        <div className="space-y-6">
          {viewMode === 'widgets' && (
            <HabitsDashboardV4
              habits={habits}
              userId={user?.id}
              onHabitComplete={handleHabitComplete}
              isCompleting={isCompleting}
            />
          )}

          {viewMode === 'list' && (
            <Suspense fallback={<LoadingSkeleton />}>
              <CompactListView
                habits={habits}
                onHabitComplete={handleHabitComplete}
                onHabitTap={handleHabitTap}
              />
            </Suspense>
          )}

          {viewMode === 'analytics' && (
            <Suspense fallback={<LoadingSkeleton />}>
              <AnalyticsView
                habits={habits}
                userId={user?.id}
              />
            </Suspense>
          )}
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent className="glass-card">
            <AlertDialogHeader>
              <AlertDialogTitle>{t('delete.title')}</AlertDialogTitle>
              <AlertDialogDescription>
                {t('delete.description')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>{t('delete.cancel')}</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {t('delete.confirm')}
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
            label: t('actions.newHabit'),
            icon: Plus,
            onClick: () => setCreateDialogOpen(true),
            color: 'text-primary'
          },
          {
            label: t('actions.quickComplete'),
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
            label: t('actions.statistics'),
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
                🛠️ {t('devTools.title')}
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
                {t('devTools.createDemoTeams')}
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
                {t('devTools.createDemoEvents')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </>
  );
}
