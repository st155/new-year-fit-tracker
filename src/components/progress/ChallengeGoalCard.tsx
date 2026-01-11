import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, TrendingDown, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ChallengeGoal } from "@/features/goals/types";
import { useState } from "react";
import { QuickMeasurementDialog } from "@/features/goals/components";
import { cn, formatTimeDisplay } from "@/lib/utils";
import { useAuth } from '@/hooks/useAuth';
import { useDataQuality } from '@/hooks/useDataQuality';
import { DataQualityBadge } from '@/components/data-quality';
import { 
  goalThemes, 
  getGoalIcon, 
  getSourceBadge, 
  getMetricNameFromGoal,
  getTrendColor,
  isTimeGoal as checkIsTimeGoal
} from "./utils/goalCardUtils";

interface ChallengeGoalCardProps {
  goal: ChallengeGoal;
  onMeasurementAdded: () => void;
}

export function ChallengeGoalCard({ goal, onMeasurementAdded }: ChallengeGoalCardProps) {
  const { t } = useTranslation('progress');
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
  const isTimeGoal = checkIsTimeGoal(goal.goal_name, goal.target_unit);
  const trendColor = getTrendColor(goal.trend, goal.trend_percentage, goal.goal_name);

  const handleCardClick = () => {
    navigate(`/goals/${goal.id}`);
  };

  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowQuickAdd(true);
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
                style={{ color: trendColor }}
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

          {/* Progress Bar */}
          <div className="mb-2">
            <Progress 
              value={Math.min(goal.progress_percentage ?? 0, 100)} 
              autoColor={true} 
              className={cn(
                "h-2",
                goal.progress_percentage > 100 && "animate-pulse"
              )}
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-muted-foreground">
                {goal.progress_percentage === 0 
                  ? (goal.current_value === 0 ? t('goal.needFirstMeasurement') : t('goal.completed', { percent: 0 }))
                  : goal.progress_percentage >= 100
                    ? `${t('goal.completed', { percent: goal.progress_percentage.toFixed(0) })} ${
                        goal.progress_percentage > 100 ? '⚡' : '✓'
                      }`
                    : t('goal.completed', { percent: goal.progress_percentage.toFixed(0) })
                }
              </span>
              {goal.trend !== 'stable' && (
                <span className="text-xs font-medium" style={{ color: trendColor }}>
                  {goal.trend === 'up' ? '↗' : '↘'} {Math.abs(goal.trend_percentage).toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Title - Centered */}
          <h3 className="font-semibold text-center mb-1.5 line-clamp-2 px-8">
            {goal.goal_name}
          </h3>

          {/* Badges - Centered */}
          <div className="flex items-center justify-center gap-2 mb-2.5">
            {goal.is_personal ? (
              <Badge variant="outline" className="text-xs">{t('goal.personal')}</Badge>
            ) : (
              <Badge variant="secondary" className="text-xs">{goal.challenge_title}</Badge>
            )}
            {goal.progress_percentage > 100 && (
              <Badge variant="success" className="text-xs">
                {t('goal.overachieved')}
              </Badge>
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
                {t('goal.noMeasurementHistory')}
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
