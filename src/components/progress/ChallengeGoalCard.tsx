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
import { useAuth } from '@/hooks/useAuth';
import { useDataQuality } from '@/hooks/useDataQuality';
import { DataQualityBadge } from '@/components/data-quality';

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
  if (nameLower.includes('во2') || nameLower.includes('vo2')) return Zap;
  if (nameLower.includes('бег') || nameLower.includes('run')) return Activity;
  if (nameLower.includes('планк') || nameLower.includes('plank')) return Activity;
  
  return goalTypeIcons[goalType] || Target;
};

// Helper: Map goal name to metric name for quality tracking
const getMetricNameFromGoal = (goalName: string): string | null => {
  const name = goalName.toLowerCase();
  if (name.includes('вес') || name.includes('weight')) return 'Weight';
  if (name.includes('жир') || name.includes('fat') || name.includes('body fat')) return 'Body Fat %';
  if (name.includes('мышц') || name.includes('muscle')) return 'Skeletal Muscle Mass';
  if (name.includes('vo2') || name.includes('во2')) return 'VO2 Max';
  if (name.includes('bmr') || name.includes('калор')) return 'BMR';
  if (name.includes('шаг') || name.includes('step')) return 'Steps';
  if (name.includes('сон') || name.includes('sleep')) return 'Sleep Duration';
  if (name.includes('пульс') || name.includes('heart')) return 'Heart Rate';
  return null;
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
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  
  // Get data quality for this goal's metric
  const { getMetricWithQuality } = useDataQuality();
  const metricName = getMetricNameFromGoal(goal.goal_name);
  const metricWithQuality = metricName ? getMetricWithQuality(metricName) : null;
  
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
        className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer group min-h-[280px]"
        onClick={handleCardClick}
      >
        <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
        
        <CardContent className="p-5 relative">
          {/* Trend Indicator and Quality Badge - Top Right Corner */}
          <div className="absolute top-4 right-4 flex items-center gap-2">
            {metricWithQuality && metricWithQuality.confidence < 80 && (
              <DataQualityBadge
                confidence={metricWithQuality.confidence}
                factors={metricWithQuality.factors}
                metricName={metricName!}
                userId={user?.id}
              />
            )}
            {goal.trend !== 'stable' && (
              <div 
                className="flex items-center gap-1"
                style={{ color: getTrendColor() }}
              >
                {goal.trend === 'up' ? (
                  <TrendingUp className="h-4 w-4" />
                ) : (
                  <TrendingDown className="h-4 w-4" />
                )}
              </div>
            )}
          </div>

          {/* Icon - Centered */}
          <div className="flex justify-center mb-2">
            <div 
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ backgroundColor: `${theme.color}15` }}
            >
              <Icon className="h-6 w-6" style={{ color: theme.color }} />
            </div>
          </div>

          {/* Progress Bar - СРАЗУ ПОСЛЕ ИКОНКИ */}
          <div className="mb-2">
            <Progress 
              value={goal.progress_percentage ?? 0} 
              autoColor={true} 
              className="h-2"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {goal.progress_percentage === 0 
                  ? (goal.current_value === 0 ? "Нужен первый замер" : "0% выполнено")
                  : `${goal.progress_percentage.toFixed(0)}% выполнено`
                }
              </span>
              {goal.trend !== 'stable' && (
                <span className="text-xs font-medium" style={{ color: getTrendColor() }}>
                  {goal.trend === 'up' ? '↗' : '↘'} {Math.abs(goal.trend_percentage).toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Title - Centered */}
          <h3 className="font-semibold text-center mb-1.5 line-clamp-2 px-8">
            {goal.goal_name}
          </h3>

          {/* Badges - Centered, ТОЛЬКО ОДИН badge */}
          <div className="flex items-center justify-center mb-2.5">
            {goal.is_personal ? (
              <Badge variant="outline" className="text-xs">Личная</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">{goal.challenge_title}</Badge>
            )}
          </div>

          {/* Values - Centered */}
          <div className="flex items-center justify-center gap-2 mb-2">
            <span 
              className={cn(
                "font-bold",
                goal.current_value === 0 ? "text-xl text-muted-foreground" : "text-2xl"
              )}
              style={goal.current_value > 0 ? { color: theme.color } : {}}
            >
              {isTimeGoal 
                ? formatTimeDisplay(goal.current_value)
                : goal.current_value.toFixed(1)
              }
            </span>
            <span className="text-sm text-muted-foreground">
              / {goal.target_value 
                  ? (isTimeGoal
                      ? formatTimeDisplay(goal.target_value)
                      : goal.target_value)
                  : '?'
                } {goal.target_unit}
            </span>
          </div>

          {/* Sparkline - Fixed Height, Centered */}
          <div className="h-7 flex items-end justify-center gap-[2px]">
            {goal.measurements.length > 0 ? (
              goal.measurements.slice(0, 10).reverse().map((m, i) => {
                const max = Math.max(...goal.measurements.slice(0, 10).map(d => d.value));
                const min = Math.min(...goal.measurements.slice(0, 10).map(d => d.value));
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
              })
            ) : (
              <div className="text-xs text-muted-foreground/50 text-center">
                Нет истории замеров
              </div>
            )}
          </div>

          {/* Add Button - Bottom Right */}
          <Button
            size="icon"
            variant="ghost"
            className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={handleAddClick}
          >
            <Plus className="h-4 w-4" />
          </Button>
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
