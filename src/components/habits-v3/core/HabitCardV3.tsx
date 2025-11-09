import { motion, PanInfo } from 'framer-motion';
import { useState, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getTimeBasedTheme, getStateStyles, formatDuration, getDifficultyBadge, TimeOfDay } from '@/lib/habit-utils-v3';
import { haptics } from '@/lib/haptics';
import { useHabitCardState } from '@/hooks/useHabitCardState';
import { HabitCelebration } from '@/components/habits/HabitCelebration';
import { Flame, Calendar, Target } from 'lucide-react';
import { getHabitIcon } from '@/lib/habit-utils';

interface HabitCardV3Props {
  habit: any;
  onComplete?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
  compact?: boolean;
  className?: string;
}

export function HabitCardV3({
  habit,
  onComplete,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  compact = false,
  className
}: HabitCardV3Props) {
  const { state, expanded, showCelebration, celebrate } = useHabitCardState(habit);
  const [dragX, setDragX] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(false);

  const theme = getTimeBasedTheme(habit.time_of_day as TimeOfDay);
  const stateStyles = getStateStyles(state);
  const difficulty = getDifficultyBadge(habit.difficulty_level);
  const HabitIcon = getHabitIcon(habit);

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    const swipeThreshold = 100;
    
    if (info.offset.x > swipeThreshold) {
      // Swipe right → Complete
      haptics.complete();
      celebrate();
      onSwipeRight?.();
      onComplete?.();
    } else if (info.offset.x < -swipeThreshold) {
      // Swipe left → Quick menu
      haptics.swipe();
      onSwipeLeft?.();
    }
    
    setDragX(0);
    setShowSwipeHint(false);
  }, [onSwipeRight, onComplete, onSwipeLeft, celebrate]);

  const handleTap = useCallback(() => {
    haptics.tap();
    onTap?.();
  }, [onTap]);

  return (
    <>
      <motion.div
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDrag={(event, info) => {
          setDragX(info.offset.x);
          if (Math.abs(info.offset.x) > 20 && !showSwipeHint) {
            setShowSwipeHint(true);
          }
        }}
        onDragEnd={handleDragEnd}
        whileTap={{ scale: 0.98 }}
        className={cn("relative touch-none", className)}
        role="article"
        aria-label={`Привычка: ${habit.name}`}
        tabIndex={0}
      >
        {/* Swipe indicators */}
        <motion.div
          className="absolute left-4 top-1/2 -translate-y-1/2 z-0"
          animate={{ opacity: dragX < -20 ? 1 : 0 }}
        >
          <div className="text-2xl">⚙️</div>
        </motion.div>
        
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2 z-0"
          animate={{ opacity: dragX > 20 ? 1 : 0 }}
        >
          <div className="text-2xl">✓</div>
        </motion.div>

        <Card
          className={cn(
            "relative z-10 transition-all duration-300 hover:shadow-lg cursor-pointer",
            "bg-gradient-to-br glass-card",
            theme.gradient,
            stateStyles.className,
            state !== 'completed' && theme.glow,
            stateStyles.glow,
            compact ? "p-3" : "p-4"
          )}
          onClick={handleTap}
        >
          <CardHeader className={cn("p-0", compact ? "pb-2" : "pb-3")}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                {/* Icon */}
                <div className={cn(
                  "flex items-center justify-center rounded-lg p-2",
                  "bg-background/50"
                )}>
                  <HabitIcon className={cn("w-5 h-5", theme.textColor)} />
                </div>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-semibold truncate",
                    compact ? "text-sm" : "text-base"
                  )}>
                    {habit.name}
                  </h3>
                  {!compact && habit.category && (
                    <p className="text-xs text-muted-foreground truncate">
                      {habit.category}
                    </p>
                  )}
                </div>
              </div>

              {/* Time badge */}
              <Badge variant="outline" className={cn(
                "flex items-center gap-1 shrink-0",
                theme.textColor
              )}>
                <span>{theme.icon}</span>
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {!compact && (
              <div className="flex items-center gap-3 text-xs text-muted-foreground pt-2">
                {/* Streak */}
                {habit.streak > 0 && (
                  <div className="flex items-center gap-1">
                    <Flame className="w-4 h-4 text-orange-500" />
                    <span>{habit.streak} дней</span>
                  </div>
                )}

                {/* Estimated duration */}
                {habit.estimated_duration_minutes && (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDuration(habit.estimated_duration_minutes)}</span>
                  </div>
                )}

                {/* Difficulty */}
                {difficulty && (
                  <div className="flex items-center gap-1">
                    <span>{difficulty.icon}</span>
                    <span>{difficulty.label}</span>
                  </div>
                )}

                {/* XP Reward */}
                {habit.xp_reward && (
                  <div className="flex items-center gap-1">
                    <Target className="w-4 h-4 text-amber-500" />
                    <span>+{habit.xp_reward} XP</span>
                  </div>
                )}
              </div>
            )}

            {/* State indicator */}
            {state === 'completed' && (
              <div className="mt-2 text-sm text-green-500 font-medium">
                ✓ Выполнено
              </div>
            )}
            {state === 'at_risk' && (
              <div className="mt-2 text-sm text-orange-500 font-medium">
                ⚠️ Требует внимания
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Celebration effect */}
      <HabitCelebration 
        trigger={showCelebration} 
        type={habit.streak % 7 === 0 ? 'milestone' : 'completion'} 
      />
    </>
  );
}

// Memoize component for performance
export default memo(HabitCardV3, (prev, next) => {
  // Custom comparison for optimal re-rendering
  return (
    prev.habit.id === next.habit.id &&
    prev.habit.completed_today === next.habit.completed_today &&
    prev.habit.streak === next.habit.streak &&
    prev.habit.name === next.habit.name &&
    prev.compact === next.compact
  );
});

