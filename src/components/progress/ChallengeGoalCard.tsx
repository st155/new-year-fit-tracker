import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Minus, Plus, Target, Dumbbell, Heart, Activity, Scale, Flame, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ChallengeGoal } from "@/hooks/useChallengeGoals";
import { useState } from "react";
import { QuickMeasurementDialog } from "@/components/goals/QuickMeasurementDialog";
import { cn, formatTimeDisplay, isTimeUnit } from "@/lib/utils";

interface ChallengeGoalCardProps {
  goal: ChallengeGoal;
  onMeasurementAdded: () => void;
}

const goalTypeIcons: Record<string, any> = {
  strength: Dumbbell,
  cardio: Heart,
  endurance: Activity,
  body_composition: Scale,
  health: Heart,
};

const goalThemes: Record<string, { color: string; gradient: string }> = {
  strength: { color: 'hsl(var(--chart-1))', gradient: 'from-chart-1/20 to-chart-1/5' },
  cardio: { color: 'hsl(var(--chart-2))', gradient: 'from-chart-2/20 to-chart-2/5' },
  endurance: { color: 'hsl(var(--chart-3))', gradient: 'from-chart-3/20 to-chart-3/5' },
  body_composition: { color: 'hsl(var(--chart-4))', gradient: 'from-chart-4/20 to-chart-4/5' },
  health: { color: 'hsl(var(--chart-5))', gradient: 'from-chart-5/20 to-chart-5/5' },
};

const getGoalIcon = (goalName: string, goalType: string) => {
  const nameLower = goalName.toLowerCase();
  
  if (nameLower.includes('подтяг') || nameLower.includes('pullup')) return TrendingUp;
  if (nameLower.includes('жим') || nameLower.includes('bench')) return Dumbbell;
  if (nameLower.includes('вес') || nameLower.includes('weight')) return Scale;
  if (nameLower.includes('жир') || nameLower.includes('fat')) return Flame;
  if (nameLower.includes('vo2') || nameLower.includes('во2')) return Zap;
  if (nameLower.includes('бег') || nameLower.includes('run')) return Activity;
  if (nameLower.includes('планк') || nameLower.includes('plank')) return Activity;
  
  return goalTypeIcons[goalType] || Target;
};

const getSourceBadge = (source?: 'inbody' | 'withings' | 'manual') => {
  if (!source) return null;
  
  const badges = {
    inbody: { label: 'InBody', variant: 'default' as const },
    withings: { label: 'Withings', variant: 'secondary' as const },
    manual: { label: 'Ручное', variant: 'outline' as const },
  };
  
  return badges[source];
};

export function ChallengeGoalCard({ goal, onMeasurementAdded }: ChallengeGoalCardProps) {
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  const theme = goalThemes[goal.goal_type] || goalThemes.strength;
  const Icon = getGoalIcon(goal.goal_name, goal.goal_type);
  const sourceBadge = getSourceBadge(goal.source);

  const handleCardClick = () => {
    navigate(`/goals/${goal.id}`);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQuickAdd(true);
  };

  const goalNameLower = goal.goal_name.toLowerCase();
  const isTimeGoal = isTimeUnit(goal.target_unit) ||
    goalNameLower.includes('время') ||
    goalNameLower.includes('бег');

  const isDurationGoal = goalNameLower.includes('планка') || 
    goalNameLower.includes('plank') ||
    goalNameLower.includes('vo2');

  const isRunningGoal = goalNameLower.includes('бег') || 
    goalNameLower.includes('run') ||
    goalNameLower.includes('км');

  const isLowerBetter = (goalNameLower.includes('жир') || 
    goalNameLower.includes('вес') ||
    isRunningGoal) && !isDurationGoal;

  const getTrendColor = () => {
    if (Math.abs(goal.trend_percentage) < 0.5) return 'hsl(var(--muted-foreground))';
    
    const isImproving = isLowerBetter ? goal.trend === 'down' : goal.trend === 'up';
    return isImproving ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
  };

  return (
    <>
      <Card 
        className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group"
        onClick={handleCardClick}
      >
        <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
        
        <CardContent className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="h-5 w-5 flex-shrink-0" style={{ color: theme.color }} />
                <div className="flex flex-col">
                  <h3 className="font-semibold">{goal.goal_name}</h3>
                  {goal.baseline_value && goal.baseline_value !== goal.current_value && (
                    <span className="text-xs text-muted-foreground">
                      Начал с: {isTimeGoal 
                        ? formatTimeDisplay(goal.baseline_value)
                        : goal.baseline_value.toFixed(1)
                      } {goal.target_unit}
                    </span>
                  )}
                  {!goal.baseline_value && goal.current_value > 0 && (
                    <span className="text-xs text-muted-foreground/60">
                      Ожидаем второй замер для точного прогресса
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {goal.is_personal ? (
                  <Badge variant="outline" className="text-xs">Личная</Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">{goal.challenge_title}</Badge>
                )}
                {goal.subSources && goal.subSources.length > 0 ? (
                  goal.subSources.map(s => (
                    <Badge 
                      key={s.source} 
                      variant={s.source === goal.source ? 'default' : 'outline'}
                      className="text-xs"
                    >
                      {s.label} {s.value.toFixed(1)}%
                    </Badge>
                  ))
                ) : sourceBadge && (
                  <Badge variant={sourceBadge.variant} className="text-xs">
                    {sourceBadge.label}
                  </Badge>
                )}
              </div>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleAddClick}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Values */}
          <div className="mb-4">
            <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-bold" style={{ color: theme.color }}>
              {isTimeGoal 
                ? formatTimeDisplay(goal.current_value)
                : goal.current_value.toFixed(1)
              }
            </span>
            <span className="text-muted-foreground">
              / {goal.target_value 
                  ? (isTimeGoal
                      ? formatTimeDisplay(goal.target_value)
                      : goal.target_value)
                  : '?'
                }
            </span>
              <span className="text-sm text-muted-foreground">{goal.target_unit}</span>
            </div>
            {goal.current_value === 0 ? (
              <Badge variant="outline" className="text-xs mt-1">
                Нужен первый замер
              </Badge>
            ) : (
              <div className="text-sm text-muted-foreground">
                {goal.progress_percentage.toFixed(0)}% выполнено
              </div>
            )}
          </div>

          {/* Progress Bar */}
          <Progress value={goal.progress_percentage} autoColor={true} className="mb-4" />

          {/* Sparkline & Trend */}
          <div className="flex items-center justify-between">
            {/* Mini sparkline */}
            <div className="flex items-end gap-[2px] h-8">
              {goal.measurements.slice(0, 7).reverse().map((m, i) => {
                const max = Math.max(...goal.measurements.slice(0, 7).map(d => d.value));
                const min = Math.min(...goal.measurements.slice(0, 7).map(d => d.value));
                const range = max - min || 1;
                const height = ((m.value - min) / range) * 100;
                
                return (
                  <div
                    key={i}
                    className="w-1 rounded-full opacity-60"
                    style={{
                      height: `${Math.max(height, 10)}%`,
                      backgroundColor: theme.color,
                    }}
                  />
                );
              })}
            </div>

            {/* Trend */}
            {goal.trend !== 'stable' && (
              <div 
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: getTrendColor() }}
              >
                {goal.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(goal.trend_percentage).toFixed(1)}%</span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <QuickMeasurementDialog
        goal={{
          id: goal.id,
          goal_name: goal.goal_name,
          goal_type: goal.goal_type,
          target_value: goal.target_value,
          target_unit: goal.target_unit,
        }}
        isOpen={showQuickAdd}
        onOpenChange={setShowQuickAdd}
        onMeasurementAdded={() => {
          setShowQuickAdd(false);
          onMeasurementAdded();
        }}
      />
    </>
  );
}
