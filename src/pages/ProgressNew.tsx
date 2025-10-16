import { useState } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useGoals } from "@/hooks/useGoals";
import { useBodyComposition } from "@/hooks/useBodyComposition";
import { Settings, RefreshCw, Target, Activity, TrendingUp, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressWidgetCard } from "@/components/progress/ProgressWidgetCard";
import { ProgressWidgetSettings } from "@/components/progress/ProgressWidgetSettings";
import { WeightProgressDetail } from '@/components/detail/WeightProgressDetail';
import { BodyFatProgressDetail } from '@/components/detail/BodyFatProgressDetail';
import { PullUpsProgressDetail } from '@/components/detail/PullUpsProgressDetail';
import { VO2MaxProgressDetail } from '@/components/detail/VO2MaxProgressDetail';
import GoalProgressDetail from '@/components/detail/GoalProgressDetail';
import { cn } from "@/lib/utils";

export interface ProgressWidget {
  id: string;
  goal_id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  is_visible: boolean;
  position: number;
  size?: 'small' | 'medium' | 'large';
}

export default function ProgressNew() {
  const { user } = useAuth();
  const { personalGoals, challengeGoals, isLoading: goalsLoading } = useGoals(user?.id);
  const { history, isLoading: bodyLoading } = useBodyComposition(user?.id);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [activeDetail, setActiveDetail] = useState<{ type: string; goal?: any } | null>(null);
  const [widgetsConfig, setWidgetsConfig] = useState<ProgressWidget[]>([]);

  const isLoading = goalsLoading || bodyLoading;
  const allGoals = [...(personalGoals || []), ...(challengeGoals || [])];

  // Initialize widgets from goals
  const initializeWidgets = () => {
    if (!allGoals.length) return;

    const initialWidgets: ProgressWidget[] = allGoals
      .filter(goal => goal.target_value)
      .map((goal, index) => ({
        id: goal.id,
        goal_id: goal.id,
        goal_name: goal.goal_name,
        goal_type: goal.goal_type,
        target_value: goal.target_value,
        target_unit: goal.target_unit || '',
        is_visible: true,
        position: index,
        size: 'medium'
      }));

    setWidgetsConfig(initialWidgets);
  };

  // Initialize widgets when goals are loaded
  if (allGoals.length > 0 && widgetsConfig.length === 0 && !isLoading) {
    initializeWidgets();
  }

  const handleWidgetUpdate = (newWidgets: ProgressWidget[]) => {
    setWidgetsConfig(newWidgets);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleWidgetClick = (widget: ProgressWidget) => {
    const goalName = widget.goal_name.toLowerCase();
    
    if (goalName.includes('вес') || goalName.includes('weight') || goalName.includes('масса')) {
      setActiveDetail({ type: 'weight' });
    } else if (goalName.includes('жир') || goalName.includes('fat')) {
      setActiveDetail({ type: 'bodyFat' });
    } else if (goalName.includes('подтяг') || goalName.includes('pull')) {
      setActiveDetail({ type: 'pullups' });
    } else if (goalName.includes('vo2')) {
      setActiveDetail({ type: 'vo2max' });
    } else {
      setActiveDetail({ type: 'goal', goal: allGoals.find(g => g.id === widget.goal_id) });
    }
  };

  // Show detail views
  if (activeDetail) {
    if (activeDetail.type === 'weight') {
      return <WeightProgressDetail onBack={() => setActiveDetail(null)} />;
    }
    if (activeDetail.type === 'bodyFat') {
      return <BodyFatProgressDetail onBack={() => setActiveDetail(null)} />;
    }
    if (activeDetail.type === 'pullups') {
      return <PullUpsProgressDetail onBack={() => setActiveDetail(null)} />;
    }
    if (activeDetail.type === 'vo2max') {
      return <VO2MaxProgressDetail onBack={() => setActiveDetail(null)} />;
    }
    if (activeDetail.type === 'goal' && activeDetail.goal) {
      return <GoalProgressDetail goal={activeDetail.goal} onBack={() => setActiveDetail(null)} />;
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between">
            <Skeleton className="h-10 w-48" />
            <Skeleton className="h-10 w-32" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const visibleWidgets = widgetsConfig
    .filter(w => w.is_visible)
    .sort((a, b) => a.position - b.position);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Прогресс по целям</h1>
            <p className="text-muted-foreground mt-1">
              Отслеживайте прогресс по всем целям
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Обновить
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSettingsOpen(true)}
              className="gap-2"
            >
              <Settings className="h-4 w-4" />
              Настроить
            </Button>
          </div>
        </div>

        {/* Widgets Grid - Adaptive columns */}
        {visibleWidgets.length === 0 ? (
          <div className="text-center py-16 border rounded-lg bg-card/50">
            <Target className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Нет целей для отслеживания</h3>
            <p className="text-muted-foreground mb-4">
              Создайте цели, чтобы начать отслеживать прогресс
            </p>
            <Button onClick={() => setSettingsOpen(true)}>
              <Target className="h-4 w-4 mr-2" />
              Настроить виджеты
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {visibleWidgets.map((widget) => (
              <ProgressWidgetCard
                key={widget.id}
                widget={widget}
                onClick={() => handleWidgetClick(widget)}
              />
            ))}
          </div>
        )}

        {/* Quick Stats Summary */}
        {visibleWidgets.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4">
            <div className="p-4 rounded-lg border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Target className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Всего целей</p>
                  <p className="text-2xl font-bold">{visibleWidgets.length}</p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Activity className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Активные</p>
                  <p className="text-2xl font-bold">
                    {visibleWidgets.filter(w => w.is_visible).length}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-lg border bg-card/50 backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Категории</p>
                  <p className="text-2xl font-bold">
                    {new Set(visibleWidgets.map(w => w.goal_type)).size}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Dialog */}
      <ProgressWidgetSettings
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        widgets={widgetsConfig}
        allGoals={allGoals}
        onUpdate={handleWidgetUpdate}
      />
    </div>
  );
}
