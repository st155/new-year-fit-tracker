import { 
  Target, 
  Dumbbell, 
  Heart, 
  Activity, 
  Scale, 
  Flame, 
  Zap, 
  TrendingUp 
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Goal type to icon mapping
export const goalTypeIcons: Record<string, LucideIcon> = {
  strength: Dumbbell,
  cardio: Heart,
  endurance: Activity,
  body_composition: Scale,
  health: Heart,
};

// Goal type to theme mapping
export const goalThemes: Record<string, { color: string; gradient: string }> = {
  strength: { color: 'hsl(var(--chart-1))', gradient: 'from-chart-1/20 to-chart-1/5' },
  cardio: { color: 'hsl(var(--chart-2))', gradient: 'from-chart-2/20 to-chart-2/5' },
  endurance: { color: 'hsl(var(--chart-3))', gradient: 'from-chart-3/20 to-chart-3/5' },
  body_composition: { color: 'hsl(var(--chart-4))', gradient: 'from-chart-4/20 to-chart-4/5' },
  health: { color: 'hsl(var(--chart-5))', gradient: 'from-chart-5/20 to-chart-5/5' },
};

// Get icon based on goal name and type
export const getGoalIcon = (goalName: string, goalType: string): LucideIcon => {
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

// Source badge configuration
export type SourceType = 'inbody' | 'withings' | 'manual' | 'garmin' | 'whoop';

export interface SourceBadgeConfig {
  label: string;
  variant: 'default' | 'secondary' | 'outline';
}

export const getSourceBadge = (source?: SourceType): SourceBadgeConfig | null => {
  if (!source) return null;
  
  const badges: Record<SourceType, SourceBadgeConfig> = {
    inbody: { label: 'InBody', variant: 'default' },
    withings: { label: 'Withings', variant: 'secondary' },
    manual: { label: 'Ручное', variant: 'outline' },
    garmin: { label: 'Garmin', variant: 'secondary' },
    whoop: { label: 'WHOOP', variant: 'secondary' },
  };
  
  return badges[source];
};

// Map goal name to metric name for data quality tracking
export const getMetricNameFromGoal = (goalName: string): string | null => {
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

// Determine if lower values are better for this goal
export const isLowerBetterGoal = (goalName: string): boolean => {
  const nameLower = goalName.toLowerCase();
  
  const isDurationGoal = nameLower.includes('планка') || 
    nameLower.includes('plank') ||
    nameLower.includes('vo2');
  
  const isRunningGoal = nameLower.includes('бег') || 
    nameLower.includes('run') ||
    nameLower.includes('км');
  
  return (nameLower.includes('жир') || 
    nameLower.includes('вес') ||
    isRunningGoal) && !isDurationGoal;
};

// Get trend color based on goal type and trend direction
export const getTrendColor = (
  trend: 'up' | 'down' | 'stable',
  trendPercentage: number,
  goalName: string
): string => {
  if (Math.abs(trendPercentage) < 0.5) return 'hsl(var(--muted-foreground))';
  
  const isLowerBetter = isLowerBetterGoal(goalName);
  const isImproving = isLowerBetter ? trend === 'down' : trend === 'up';
  return isImproving ? 'hsl(var(--success))' : 'hsl(var(--destructive))';
};

// Check if goal uses time units
export const isTimeGoal = (goalName: string, targetUnit?: string | null): boolean => {
  const nameLower = goalName.toLowerCase();
  const isTimeUnit = targetUnit && ['сек', 'мин', 'час', 'sec', 'min', 'hr', 's', 'm', 'h'].some(
    u => targetUnit.toLowerCase().includes(u)
  );
  return isTimeUnit || nameLower.includes('время') || nameLower.includes('бег');
};
