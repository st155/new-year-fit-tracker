import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { LineChart, Line, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { TrendingUp, TrendingDown, Plus } from "lucide-react";
import { ChallengeGoal } from "@/features/goals/types";
import { cn, formatTimeDisplay } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
import { useMemo } from "react";
import { 
  goalThemes, 
  getGoalIcon, 
  getSourceBadge, 
  getTrendColor,
  isTimeGoal as checkIsTimeGoal
} from "./utils/goalCardUtils";

interface EnhancedProgressCardProps {
  goal: ChallengeGoal;
  onClick?: () => void;
  onAddMeasurement?: (goal: ChallengeGoal) => void;
}

export function EnhancedProgressCard({ goal, onClick, onAddMeasurement }: EnhancedProgressCardProps) {
  const theme = goalThemes[goal.goal_type] || goalThemes.strength;
  const Icon = getGoalIcon(goal.goal_name, goal.goal_type);
  const sourceBadge = getSourceBadge(goal.source);
  const isTimeGoal = checkIsTimeGoal(goal.goal_name, goal.target_unit);
  const trendColor = getTrendColor(goal.trend, goal.trend_percentage, goal.goal_name);

  // Prepare chart data (last 30 measurements)
  const chartData = useMemo(() => {
    return goal.measurements
      .slice(0, 30)
      .sort((a, b) => new Date(a.measurement_date).getTime() - new Date(b.measurement_date).getTime())
      .map(m => ({
        date: m.measurement_date,
        value: m.value,
      }));
  }, [goal.measurements]);

  // Calculate statistics
  const stats = useMemo(() => {
    const values = goal.measurements.map(m => m.value);
    if (values.length === 0) return null;
    
    return {
      min: Math.min(...values),
      max: Math.max(...values),
      avg: values.reduce((a, b) => a + b, 0) / values.length,
    };
  }, [goal.measurements]);

  const hasData = goal.measurements.length > 0;

  return (
    <Card 
      className={cn(
        "overflow-hidden hover:shadow-lg transition-all hover:scale-[1.01]",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className={`h-1 bg-gradient-to-r ${theme.gradient}`} />
      
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Icon className="h-4 w-4" style={{ color: theme.color }} />
            <span className="line-clamp-1">{goal.goal_name}</span>
          </CardTitle>
          
          <div className="flex items-center gap-2">
            {goal.trend !== 'stable' && (
              <div 
                className="flex items-center gap-1 text-xs font-medium"
                style={{ color: trendColor }}
              >
                {goal.trend === 'up' ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>{Math.abs(goal.trend_percentage).toFixed(0)}%</span>
              </div>
            )}
            {onAddMeasurement && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-full hover:bg-primary/10"
                onClick={(e) => {
                  e.stopPropagation();
                  onAddMeasurement(goal);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2 mt-1">
          {goal.is_personal ? (
            <Badge variant="outline" className="text-xs">Личная</Badge>
          ) : (
            <Badge variant="secondary" className="text-xs">{goal.challenge_title}</Badge>
          )}
          {sourceBadge && (
            <Badge variant={sourceBadge.variant} className="text-xs">
              {sourceBadge.label}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current Value */}
        <div>
          <div className="text-2xl font-bold" style={{ color: theme.color }}>
            {isTimeGoal 
              ? formatTimeDisplay(goal.current_value)
              : goal.current_value.toFixed(1)
            } {goal.target_unit}
          </div>
          <div className="text-xs text-muted-foreground">
            Цель: {isTimeGoal 
              ? formatTimeDisplay(goal.target_value)
              : goal.target_value.toFixed(1)
            } {goal.target_unit}
          </div>
        </div>

        {/* Progress Bar */}
        <div>
          <Progress 
            value={Math.min(goal.progress_percentage ?? 0, 100)} 
            autoColor={true} 
            className="h-2"
          />
          <div className="flex items-center justify-between mt-1">
            <span className="text-xs text-muted-foreground">
              {goal.progress_percentage.toFixed(0)}% выполнено
            </span>
            {goal.progress_percentage > 100 && (
              <Badge variant="default" className="text-xs">
                Перевыполнено! 🎉
              </Badge>
            )}
          </div>
        </div>

        {/* Line Chart */}
        {hasData && chartData.length > 1 && (
          <div className="h-[80px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <YAxis hide domain={['auto', 'auto']} />
                <Tooltip 
                  content={({ active, payload }) => {
                    if (active && payload && payload[0]) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-background border rounded px-2 py-1 text-xs shadow-lg">
                          <div className="font-medium text-primary">
                            {format(parseISO(data.date), 'd MMM yyyy', { locale: ru })}
                          </div>
                          <div className="text-muted-foreground">
                            {isTimeGoal 
                              ? formatTimeDisplay(payload[0].value as number)
                              : (payload[0].value as number).toFixed(1)
                            } {goal.target_unit}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={theme.color}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Statistics */}
        {stats && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <div className="font-medium text-muted-foreground">Базовая</div>
              <div className="font-semibold">
                {goal.baseline_value 
                  ? (isTimeGoal 
                      ? formatTimeDisplay(goal.baseline_value)
                      : goal.baseline_value.toFixed(1))
                  : '—'
                }
              </div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Средняя</div>
              <div className="font-semibold">
                {isTimeGoal 
                  ? formatTimeDisplay(stats.avg)
                  : stats.avg.toFixed(1)
                }
              </div>
            </div>
            <div>
              <div className="font-medium text-muted-foreground">Макс</div>
              <div className="font-semibold">
                {isTimeGoal 
                  ? formatTimeDisplay(stats.max)
                  : stats.max.toFixed(1)
                }
              </div>
            </div>
          </div>
        )}

        {/* No data state */}
        {!hasData && (
          <div className="text-xs text-muted-foreground/50 text-center py-4">
            Нет истории замеров
          </div>
        )}
      </CardContent>
    </Card>
  );
}
