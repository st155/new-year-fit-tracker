import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { 
  Dumbbell, Heart, Moon, Zap, Scale, Activity, 
  TrendingUp, TrendingDown, Minus, Flame
} from "lucide-react";
import type { ChallengeGoal } from "@/features/goals/types";

interface CompactGoalCardProps {
  goal: ChallengeGoal;
  onClick?: () => void;
  delay?: number;
}

const goalIcons: Record<string, React.ElementType> = {
  strength: Dumbbell,
  cardio: Heart,
  sleep: Moon,
  recovery: Zap,
  body_composition: Scale,
  biomarkers: Activity,
  habit: Activity,
  endurance: Heart,
};

function AnimatedCircularProgress({ 
  value, 
  size = 56, 
  strokeWidth = 5,
  delay = 0 
}: { 
  value: number; 
  size?: number; 
  strokeWidth?: number;
  delay?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(value, 100) / 100) * circumference;

  // Color based on progress
  const getColor = (v: number) => {
    if (v >= 100) return "hsl(var(--success))";
    if (v >= 75) return "hsl(var(--primary))";
    if (v >= 50) return "hsl(var(--warning))";
    return "hsl(var(--muted-foreground))";
  };

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-muted/30"
      />
      {/* Progress circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={getColor(value)}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, delay, ease: "easeOut" }}
        style={{
          filter: value >= 75 ? `drop-shadow(0 0 4px ${getColor(value)})` : undefined
        }}
      />
    </svg>
  );
}

export function CompactGoalCard({ goal, onClick, delay = 0 }: CompactGoalCardProps) {
  const Icon = goalIcons[goal.goal_type] || Activity;
  const progress = Math.round(goal.progress_percentage || 0);
  
  // Trend icon
  const TrendIcon = goal.trend === 'up' ? TrendingUp : goal.trend === 'down' ? TrendingDown : Minus;
  const trendColor = goal.trend === 'up' ? 'text-success' : goal.trend === 'down' ? 'text-destructive' : 'text-muted-foreground';

  // Format value
  const formatValue = (value: number | null | undefined, unit: string | null | undefined) => {
    if (value === null || value === undefined) return '--';
    if (unit === '%') return `${value.toFixed(1)}%`;
    if (unit === 'kg' || unit === 'lbs') return `${value.toFixed(1)} ${unit}`;
    if (Number.isInteger(value)) return value.toString();
    return value.toFixed(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: delay * 0.05 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-4 p-4 rounded-xl",
        "bg-card/50 border border-border/50",
        "hover:bg-card/80 hover:border-primary/30 transition-all",
        "cursor-pointer active:scale-[0.98]"
      )}
    >
      {/* Circular Progress with Icon */}
      <div className="relative flex-shrink-0">
        <AnimatedCircularProgress value={progress} delay={delay * 0.1} />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon className="h-5 w-5 text-foreground/70" />
        </div>
      </div>

      {/* Goal Info */}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-foreground truncate">{goal.goal_name}</p>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            {formatValue(goal.current_value, goal.target_unit)}
            {goal.target_value && (
              <span className="text-muted-foreground/60"> / {formatValue(goal.target_value, goal.target_unit)}</span>
            )}
          </span>
          
          {/* Trend */}
          {goal.trend_percentage !== undefined && goal.trend_percentage !== 0 && (
            <span className={cn("flex items-center gap-0.5 text-xs", trendColor)}>
              <TrendIcon className="h-3 w-3" />
              {Math.abs(goal.trend_percentage).toFixed(1)}%
            </span>
          )}
        </div>

        {/* Challenge Badge */}
        {goal.challenge_id && (
          <div className="flex items-center gap-1 mt-1">
            <Flame className="h-3 w-3 text-orange-500" />
            <span className="text-xs text-orange-500 font-medium">Challenge</span>
          </div>
        )}
      </div>

      {/* Progress Percentage */}
      <div className="text-right">
        <p className={cn(
          "text-lg font-bold",
          progress >= 100 ? "text-success" : "text-foreground"
        )}>
          {progress}%
        </p>
      </div>
    </motion.div>
  );
}
