import { useAuth } from '@/hooks/useAuth';
import { useChallengeGoalsQuery as useChallengeGoals, ChallengeGoal } from '@/features/goals';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { EnhancedProgressCard } from '@/components/progress/EnhancedProgressCard';
import { CompactProgressSummary } from '@/components/progress/CompactProgressSummary';
import { DisciplineRadialChart } from '@/components/progress/DisciplineRadialChart';
import { BaselineComparisonCard } from '@/components/progress/BaselineComparisonCard';
import { PointsImpactCard } from '@/components/progress/PointsImpactCard';
import { QuickAddMeasurementDialog } from '@/components/progress/QuickAddMeasurementDialog';
import { Echo11SyncCard } from '@/components/progress/Echo11SyncCard';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { RefreshCw, Trophy, BarChart3, Users } from 'lucide-react';
import { EmptyState } from '@/components/ui/empty-state';
import { useNavigate } from 'react-router-dom';
import { useMemo, useEffect, useState } from 'react';
import { PageLoader } from '@/components/ui/page-loader';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function Progress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: goals, isLoading, error, refetch } = useChallengeGoals(user?.id);
  const [showLoader, setShowLoader] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<ChallengeGoal | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);

  const handleAddMeasurement = (goal: ChallengeGoal) => {
    setSelectedGoal(goal);
    setShowAddDialog(true);
  };

  // Show loader for max 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLoader(false);
      if (isLoading) {
        toast.info('Данные загружаются дольше обычного', {
          action: {
            label: 'Обновить',
            onClick: () => window.location.reload()
          }
        });
      }
    }, 2500);

    if (!isLoading) {
      setShowLoader(false);
    }

    return () => clearTimeout(timer);
  }, [isLoading]);

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    if (!goals || goals.length === 0) {
      return {
        totalGoals: 0,
        completedGoals: 0,
        inProgressGoals: 0,
        averageProgress: 0,
        totalPoints: 0,
        weeklyPoints: 0
      };
    }

    const completed = goals.filter(g => g.progress_percentage >= 100).length;
    const avgProgress = goals.reduce((sum, g) => sum + g.progress_percentage, 0) / goals.length;

    return {
      totalGoals: goals.length,
      completedGoals: completed,
      inProgressGoals: goals.length - completed,
      averageProgress: avgProgress,
      totalPoints: Math.round(avgProgress * 10),
      weeklyPoints: 50
    };
  }, [goals]);

  // Calculate discipline breakdown
  const disciplineData = useMemo(() => {
    if (!goals || goals.length === 0) return [];

    const disciplineMap = new Map<string, { goals: number; totalProgress: number }>();

    goals.forEach(goal => {
      const discipline = goal.challenge_title || 'Personal';
      const existing = disciplineMap.get(discipline) || { goals: 0, totalProgress: 0 };

      disciplineMap.set(discipline, {
        goals: existing.goals + 1,
        totalProgress: existing.totalProgress + goal.progress_percentage
      });
    });

    return Array.from(disciplineMap.entries()).map(([name, data]) => ({
      name,
      goals: data.goals,
      progress: data.totalProgress / data.goals,
      trend: Math.random() > 0.5 ? 'up' : 'down' as 'up' | 'down',
      trendValue: Math.round(Math.random() * 15)
    }));
  }, [goals]);

  // Calculate baseline comparisons
  const baselineData = useMemo(() => {
    if (!goals || goals.length === 0) return [];

    return goals
      .filter(g => g.baseline_value && g.target_value)
      .map(goal => {
        const improvementPercent = goal.baseline_value 
          ? ((goal.current_value - goal.baseline_value) / goal.baseline_value) * 100
          : 0;

        return {
          goalName: goal.goal_name,
          startValue: goal.baseline_value!,
          currentValue: goal.current_value,
          targetValue: goal.target_value!,
          unit: goal.target_unit,
          startDate: new Date().toISOString(),
          projectedCompletionDate: null,
          improvementPercent
        };
      });
  }, [goals]);

  // Calculate points impact
  const pointsData = useMemo(() => {
    if (!goals || goals.length === 0) return { goals: [], currentRank: 0, nextRankPoints: 0 };

    const goalsWithPoints = goals
      .filter(g => g.target_value)
      .map(goal => ({
        goalName: goal.goal_name,
        currentPoints: Math.round(goal.progress_percentage),
        potentialPoints: 100,
        progressPercent: goal.progress_percentage,
        priority: goal.progress_percentage < 33 ? 'high' : 
                 goal.progress_percentage < 66 ? 'medium' : 'low' as 'high' | 'medium' | 'low'
      }));

    return {
      goals: goalsWithPoints,
      currentRank: 5,
      nextRankPoints: 150
    };
  }, [goals]);

  if (isLoading && showLoader) {
    return <PageLoader message="Загрузка прогресса..." />;
  }

  // Error or empty state
  if (error || (!isLoading && (!goals || goals.length === 0))) {
    return (
      <AnimatedPage className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title={error ? "Ошибка загрузки данных" : "Нет целей для отслеживания"}
            description={error 
              ? "Не удалось загрузить прогресс. Попробуйте обновить страницу."
              : "Присоединитесь к челленджу, чтобы автоматически создать цели и начать отслеживать свой прогресс"
            }
            action={{
              label: error ? "Обновить страницу" : "Присоединиться к челленджу",
              onClick: () => error ? window.location.reload() : navigate("/challenges")
            }}
          />
        </div>
      </AnimatedPage>
    );
  }

  return (
    <AnimatedPage className="min-h-screen bg-background p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-3">
        {/* Compact Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">Прогресс</h1>
            <p className="text-xs text-muted-foreground">
              {goals?.length || 0} {goals?.length === 1 ? 'цель' : 'целей'} из челленджей
            </p>
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="gap-2 w-full sm:w-auto touch-friendly"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="sm:inline">Обновить</span>
          </Button>
        </div>

        {/* Content when goals exist */}
        {goals && goals.length > 0 && (
          <>
            {/* Compact Progress Summary */}
            <CompactProgressSummary {...overviewStats} />

            {/* Collapsible Analytics */}
            <Accordion type="multiple" className="space-y-2">
              {/* Echo11 Sync */}
              <AccordionItem value="echo11-sync" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🤖</span>
                    <span>Echo11 AI Sync</span>
                    <span className="text-xs text-muted-foreground">
                      (отправить данные в Echo11)
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <Echo11SyncCard />
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="analytics" className="border rounded-lg px-4">
                <AccordionTrigger className="text-sm hover:no-underline py-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    <span>Аналитика и статистика</span>
                    <span className="text-xs text-muted-foreground">
                      (дисциплины, очки, базовая линия)
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pt-2 pb-4">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <DisciplineRadialChart disciplines={disciplineData} />
                      <PointsImpactCard {...pointsData} />
                    </div>
                    
                    {baselineData.length > 0 && (
                      <BaselineComparisonCard data={baselineData} />
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Goals Grid */}
            <motion.div
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                Все цели ({goals.length})
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {goals.map((goal, index) => (
                  <motion.div key={goal.id} variants={staggerItem}>
                    <EnhancedProgressCard
                      goal={goal}
                      onClick={() => navigate(`/goals/${goal.id}`)}
                      onAddMeasurement={handleAddMeasurement}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </>
        )}
      </div>

      {/* Quick Add Measurement Dialog */}
      {selectedGoal && (
        <QuickAddMeasurementDialog
          goal={selectedGoal}
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onSuccess={() => {
            refetch();
            setShowAddDialog(false);
          }}
        />
      )}
    </AnimatedPage>
  );
}
