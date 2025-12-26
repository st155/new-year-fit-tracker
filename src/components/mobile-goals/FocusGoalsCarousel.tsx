import { motion } from "framer-motion";
import { Flame, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  Carousel, 
  CarouselContent, 
  CarouselItem 
} from "@/components/ui/carousel";
import type { ChallengeGoal } from "@/features/goals/types";

interface FocusGoalsCarouselProps {
  goals: ChallengeGoal[];
  onGoalClick?: (goal: ChallengeGoal) => void;
}

function AnimatedRing({ 
  value, 
  size = 72, 
  strokeWidth = 6,
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

  const getGradientId = (v: number) => {
    if (v >= 100) return "focus-gradient-success";
    if (v >= 75) return "focus-gradient-primary";
    return "focus-gradient-warning";
  };

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <defs>
        <linearGradient id="focus-gradient-success" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(142, 76%, 46%)" />
          <stop offset="100%" stopColor="hsl(142, 76%, 36%)" />
        </linearGradient>
        <linearGradient id="focus-gradient-primary" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(180, 100%, 40%)" />
        </linearGradient>
        <linearGradient id="focus-gradient-warning" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(38, 92%, 50%)" />
          <stop offset="100%" stopColor="hsl(25, 95%, 53%)" />
        </linearGradient>
      </defs>
      
      {/* Background circle */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-muted/20"
      />
      
      {/* Progress circle */}
      <motion.circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke={`url(#${getGradientId(value)})`}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.5, delay, ease: "easeOut" }}
        style={{
          filter: `drop-shadow(0 0 8px hsla(var(--primary), 0.5))`
        }}
      />
    </svg>
  );
}

function FocusCard({ 
  goal, 
  index, 
  onClick 
}: { 
  goal: ChallengeGoal; 
  index: number; 
  onClick?: () => void;
}) {
  const progress = Math.round(goal.progress_percentage || 0);
  
  const formatValue = (value: number | null | undefined, unit: string | null | undefined) => {
    if (value === null || value === undefined) return '--';
    if (unit === '%') return `${value.toFixed(1)}%`;
    return value.toFixed(1);
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.1 }}
      onClick={onClick}
      className={cn(
        "relative p-4 rounded-2xl",
        "bg-gradient-to-br from-card/80 to-card/40",
        "border border-border/50 backdrop-blur-sm",
        "cursor-pointer active:scale-[0.98] transition-transform",
        "min-h-[140px] flex flex-col items-center justify-center gap-2"
      )}
    >
      {/* Challenge Badge */}
      {goal.challenge_id && (
        <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 border border-orange-500/30">
          <Flame className="h-3 w-3 text-orange-500" />
          <span className="text-[10px] font-medium text-orange-500">Challenge</span>
        </div>
      )}

      {/* Circular Progress */}
      <div className="relative">
        <AnimatedRing value={progress} delay={index * 0.15} />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{progress}%</span>
        </div>
      </div>

      {/* Goal Info */}
      <div className="text-center">
        <p className="font-medium text-sm text-foreground truncate max-w-[120px]">
          {goal.goal_name}
        </p>
        <p className="text-xs text-muted-foreground">
          {formatValue(goal.current_value, goal.target_unit)}
          {goal.target_value && (
            <span> / {formatValue(goal.target_value, goal.target_unit)}</span>
          )}
        </p>
      </div>

      {/* Source Badge */}
      {goal.source && goal.source !== 'manual' && (
        <div className="absolute bottom-2 left-2">
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground uppercase">
            {goal.source}
          </span>
        </div>
      )}
    </motion.div>
  );
}

export function FocusGoalsCarousel({ goals, onGoalClick }: FocusGoalsCarouselProps) {
  if (goals.length === 0) return null;

  return (
    <div className="px-4 py-3">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-3">
        <Zap className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold text-foreground">Focus Goals</h3>
        <span className="text-xs text-muted-foreground">Top {goals.length}</span>
      </div>

      {/* Carousel */}
      <Carousel
        opts={{
          align: "start",
          loop: false,
        }}
        className="w-full"
      >
        <CarouselContent className="-ml-3">
          {goals.map((goal, index) => (
            <CarouselItem key={goal.id} className="pl-3 basis-[45%] sm:basis-[35%]">
              <FocusCard 
                goal={goal} 
                index={index} 
                onClick={() => onGoalClick?.(goal)}
              />
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>
    </div>
  );
}
