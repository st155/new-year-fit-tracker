import { motion, PanInfo, AnimatePresence } from 'framer-motion';
import { 
  fadeIn, 
  ANIMATION_DURATION 
} from '@/lib/animations-v3';
import { useState, useCallback, memo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getTimeBasedTheme, getStateStyles, formatDuration, getDifficultyBadge, TimeOfDay } from '@/lib/habit-utils-v3';
import { haptics } from '@/lib/haptics';
import { useHabitCardState } from '@/features/habits/hooks';
import { HabitCelebration } from '../legacy/HabitCelebration';
import { HabitOptionsMenu } from '../legacy/HabitOptionsMenu';
import { Flame, Calendar, Target, Clock, Coins, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { getHabitIcon } from '@/lib/habit-utils-v3';
import { calculateElapsedTime, formatElapsedTime, getMilestoneProgress, calculateMoneySaved } from '@/lib/duration-utils';
import { FastingInlineWidget, DurationCounterInlineWidget, NumericCounterInlineWidget, DailyMeasurementInlineWidget } from '../widgets';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useHabitAttemptsQuery } from '@/features/habits/hooks';
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';

interface HabitCardV3Props {
  habit: any;
  onComplete?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onTap?: () => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onEdit?: () => void;
  onViewHistory?: () => void;
  compact?: boolean;
  className?: string;
}

export function HabitCardV3({
  habit,
  onComplete,
  onSwipeLeft,
  onSwipeRight,
  onTap,
  onArchive,
  onDelete,
  onEdit,
  onViewHistory,
  compact = false,
  className
}: HabitCardV3Props) {
  const { t } = useTranslation('habits');
  const { state, expanded, showCelebration, celebrate, toggle } = useHabitCardState(habit);
  const [dragX, setDragX] = useState(0);
  const [showSwipeHint, setShowSwipeHint] = useState(false);
  const [elapsedTime, setElapsedTime] = useState<{ days: number; hours: number; minutes: number } | null>(null);
  const [isLongPress, setIsLongPress] = useState(false);
  const [swipeLeftCount, setSwipeLeftCount] = useState(0);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetReason, setResetReason] = useState("");
  const longPressTimer = useRef<NodeJS.Timeout>();
  const swipeResetTimer = useRef<NodeJS.Timeout>();
  const { user } = useAuth();

  // Hook for reset functionality - ALWAYS call unconditionally to follow React hooks rules
  const isDurationCounter = habit.habit_type === 'duration_counter';
  const habitAttempts = useHabitAttemptsQuery(
    isDurationCounter ? habit.id : '', 
    isDurationCounter ? user?.id : undefined
  );
  const { resetHabit, isResetting, currentAttempt } = isDurationCounter 
    ? habitAttempts 
    : { resetHabit: () => {}, isResetting: false, currentAttempt: null };

  const theme = getTimeBasedTheme(habit.time_of_day as TimeOfDay);
  const stateStyles = getStateStyles(state);
  const difficulty = getDifficultyBadge(habit.difficulty_level);
  const HabitIcon = getHabitIcon(habit);

  // Calculate elapsed time for duration_counter
  useEffect(() => {
    if (habit.habit_type === 'duration_counter' && habit.current_attempt?.start_date) {
      const updateElapsed = () => {
        const elapsed = calculateElapsedTime(habit.current_attempt.start_date);
        setElapsedTime(elapsed);
      };
      
      updateElapsed();
      const interval = setInterval(updateElapsed, 60000); // Update every minute
      
      return () => clearInterval(interval);
    } else {
      setElapsedTime(null);
    }
  }, [habit.habit_type, habit.current_attempt?.start_date]);

  // Calculate milestone progress
  const milestone = elapsedTime ? getMilestoneProgress(elapsedTime.days) : null;
  const moneySaved = elapsedTime && habit.custom_settings?.cost_per_day 
    ? calculateMoneySaved(elapsedTime.days, habit.custom_settings.cost_per_day)
    : null;

  const handleDragEnd = useCallback((event: any, info: PanInfo) => {
    const swipeThreshold = 100;
    const deleteThreshold = 150;
    
    if (info.offset.x > swipeThreshold) {
      // Swipe right → Complete
      haptics.complete();
      celebrate();
      onSwipeRight?.();
      onComplete?.();
      setSwipeLeftCount(0);
    } else if (info.offset.x < -deleteThreshold) {
      // Strong swipe left → Quick delete (if confirmed)
      if (swipeLeftCount > 0) {
        haptics.error();
        onDelete?.();
      } else {
        setSwipeLeftCount(1);
        toast(t('card.swipeAgainToDelete'), { duration: 2000 });
        
        // Reset after 3 seconds
        if (swipeResetTimer.current) clearTimeout(swipeResetTimer.current);
        swipeResetTimer.current = setTimeout(() => setSwipeLeftCount(0), 3000);
      }
    } else if (info.offset.x < -swipeThreshold) {
      // Normal swipe left → Options menu
      haptics.swipe();
      onSwipeLeft?.();
      setSwipeLeftCount(0);
    }
    
    setDragX(0);
    setShowSwipeHint(false);
  }, [onSwipeRight, onComplete, onSwipeLeft, onDelete, celebrate, swipeLeftCount]);

  const handlePointerDown = useCallback(() => {
    setIsLongPress(false);
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true);
      haptics.tap();
      onTap?.(); // Navigate to details on long press
    }, 800);
  }, [onTap]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    
    if (!isLongPress) {
      // Short tap → toggle expanded
      haptics.tap();
      toggle();
    }
    setIsLongPress(false);
  }, [isLongPress, toggle]);

  const handlePointerCancel = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
    }
    setIsLongPress(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (!habit.completed_today) {
          haptics.complete();
          celebrate();
          onComplete?.();
        }
        break;
      case 'e':
      case 'E':
        e.preventDefault();
        onTap?.();
        break;
      case 'ArrowRight':
        e.preventDefault();
        if (!habit.completed_today) {
          haptics.complete();
          celebrate();
          onSwipeRight?.();
          onComplete?.();
        }
        break;
      case 'ArrowLeft':
        e.preventDefault();
        haptics.swipe();
        onSwipeLeft?.();
        break;
    }
  }, [habit.completed_today, onComplete, onTap, onSwipeRight, onSwipeLeft, celebrate]);

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
        aria-label={t('aria.habitLabel', {
          name: habit.name,
          status: habit.completed_today 
            ? t('aria.completed')
            : t('aria.notCompleted', { streak: (habit as any).current_streak || (habit as any).streak || 0 })
        })}
        aria-describedby={`habit-desc-${habit.id}`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Hidden description for screen readers */}
        <div id={`habit-desc-${habit.id}`} className="sr-only">
          {habit.category && t('aria.category', { category: habit.category })}
          {habit.xp_reward && t('aria.reward', { xp: habit.xp_reward })}
          {habit.estimated_duration_minutes && 
            t('aria.duration', { duration: formatDuration(habit.estimated_duration_minutes) })}
          {t('aria.instructions')}
        </div>
        {/* Swipe indicators */}
        <motion.div
          className="absolute left-4 top-1/2 -translate-y-1/2 z-0"
          animate={{ 
            opacity: dragX < -20 ? 1 : 0,
            scale: dragX < -100 ? 1.2 : 1,
          }}
        >
          <div className="text-2xl">
            {swipeLeftCount > 0 ? '🗑️' : '⚙️'}
          </div>
        </motion.div>
        
        <motion.div
          className="absolute right-4 top-1/2 -translate-y-1/2 z-0"
          animate={{ 
            opacity: dragX > 20 ? 1 : 0,
            scale: dragX > 100 ? 1.3 : 1,
          }}
        >
          <div className="text-2xl">✅</div>
        </motion.div>

        {/* Swipe progress bar */}
        {Math.abs(dragX) > 20 && (
          <motion.div
            className="absolute bottom-0 left-0 right-0 h-1"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div 
              className={cn(
                "h-full transition-colors",
                dragX > 0 ? "bg-green-500" : "bg-red-500"
              )}
              style={{ 
                width: `${Math.min(100, Math.abs(dragX))}%`,
                marginLeft: dragX > 0 ? 0 : 'auto',
              }}
            />
          </motion.div>
        )}

        <Card
          className={cn(
            "relative z-10 transition-all duration-300 hover:shadow-lg cursor-pointer habit-card-compact",
            "bg-gradient-to-br glass-card",
            theme.gradient,
            stateStyles.className,
            state !== 'completed' && theme.glow,
            stateStyles.glow,
            compact ? "p-2" : "p-3",
            isLongPress && "ring-2 ring-primary/50"
          )}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
        >
          {/* Mini progress bar */}
          <div className="absolute top-0 left-0 right-0 h-0.5 overflow-hidden rounded-t-lg">
            <div
              className={cn(
                "h-full transition-all duration-500",
                state === 'completed' && "bg-gradient-to-r from-emerald-500 to-green-500",
                state === 'in_progress' && "bg-gradient-to-r from-blue-500 to-cyan-500",
                state === 'not_started' && "bg-muted/50"
              )}
              style={{ 
                width: state === 'completed' ? '100%' : 
                       state === 'in_progress' ? '50%' : '0%' 
              }}
            />
          </div>
          <CardHeader className={cn("p-0", compact ? "pb-1.5" : "pb-2")}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 flex-1">
                {/* Icon */}
                <div className={cn(
                  "flex items-center justify-center rounded-lg",
                  compact ? "p-1.5" : "p-2",
                  "bg-background/50"
                )}>
                  <HabitIcon className={cn(compact ? "w-4 h-4" : "w-5 h-5", theme.textColor)} />
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

              {/* Expand/Collapse button */}
              {(habit.habit_type === 'fasting_tracker' || 
                habit.habit_type === 'duration_counter' || 
                habit.habit_type === 'numeric_counter' || 
                habit.habit_type === 'daily_measurement') && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle();
                  }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onPointerUp={(e) => e.stopPropagation()}
                >
                  {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </Button>
              )}

              {/* Options Menu */}
              <HabitOptionsMenu
                onEdit={onEdit}
                onArchive={onArchive}
                onDelete={onDelete}
                onViewHistory={onViewHistory}
              />
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {/* Duration Counter Timer (large) */}
            {!compact && habit.habit_type === 'duration_counter' && elapsedTime && (
              <div className="mt-3 space-y-2">
                {/* Large timer display */}
                <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5">
                  <Clock className="w-5 h-5 text-primary" />
                  <div className="text-2xl font-bold text-primary">
                    {formatElapsedTime(elapsedTime.days, elapsedTime.hours, elapsedTime.minutes)}
                  </div>
                </div>

                {/* Milestone progress */}
                {milestone && (
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{t('milestoneProgress', { label: milestone.label })}</span>
                      <span className="font-medium">{Math.round(milestone.progress)}%</span>
                    </div>
                    <Progress value={milestone.progress} className="h-2" />
                  </div>
                )}

                {/* Money saved */}
                {moneySaved !== null && moneySaved > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <Coins className="w-4 h-4 text-amber-500" />
                    <span className="text-muted-foreground">{t('card.moneySaved')}:</span>
                    <span className="font-semibold text-amber-500">{moneySaved.toLocaleString()}₽</span>
                  </div>
                )}
              </div>
            )}

            {/* Daily Check Habit - Quick Complete Button */}
            {!compact && habit.habit_type === 'daily_check' && !habit.completed_today && (
              <div className="mt-3">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    celebrate();
                    onComplete?.();
                  }}
                  className="w-full bg-green-500 hover:bg-green-600"
                  size="sm"
                >
                  <Check className="h-4 w-4 mr-2" />
                  {t('actions.markComplete')}
                </Button>
              </div>
            )}

            {/* Regular habit info */}
            {!compact && habit.habit_type !== 'duration_counter' && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1.5">
                {/* Streak */}
                {habit.streak > 0 && (
                  <div className="flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-orange-500" />
                    <span className="text-xs">{habit.streak}</span>
                  </div>
                )}

                {/* XP Reward */}
                {habit.xp_reward && (
                  <div className="flex items-center gap-1">
                    <Target className="w-3.5 h-3.5 text-amber-500" />
                    <span className="text-xs">+{habit.xp_reward}</span>
                  </div>
                )}
              </div>
            )}
            
            {/* Compact mode - only show streak */}
            {compact && habit.streak > 0 && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                <Flame className="w-3 h-3 text-orange-500" />
                <span>{habit.streak}</span>
              </div>
            )}

            {/* Duration Counter Badge (compact) */}
            {habit.habit_type === 'duration_counter' && elapsedTime && (
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {t('progress.days', { count: elapsedTime.days })}
                  </Badge>
                {moneySaved !== null && moneySaved > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Coins className="w-3 h-3 text-amber-500" />
                    {moneySaved.toLocaleString()}₽
                  </Badge>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs border border-red-500/30 hover:border-red-500/50 hover:bg-red-500/5"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!user?.id) {
                      toast.error(t('toast.authRequired'));
                      return;
                    }
                    console.log('Opening reset dialog for habit:', habit.id);
                    setShowResetDialog(true);
                  }}
                >
                  🔄 {t('progress.reset')}
                </Button>
              </div>
            )}

            {/* State indicator */}
            {state === 'completed' && (
              <div className="mt-2 text-sm text-green-500 font-medium">
                ✓ {t('progress.completed')}
              </div>
            )}
            {state === 'at_risk' && (
              <div className="mt-2 text-sm text-orange-500 font-medium">
                {t('smartView.atRiskTitle')}
              </div>
            )}

            {/* Inline Widgets - показывать только когда expanded */}
            <AnimatePresence>
              {expanded && user?.id && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3" onClick={(e) => e.stopPropagation()}>
                    {habit.habit_type === 'fasting_tracker' && (
                      <FastingInlineWidget habit={habit} userId={user.id} compact={compact} />
                    )}
                    {habit.habit_type === 'duration_counter' && (
                      <DurationCounterInlineWidget habit={habit} compact={compact} />
                    )}
                    {habit.habit_type === 'numeric_counter' && (
                      <NumericCounterInlineWidget habit={habit} compact={compact} />
                    )}
                    {habit.habit_type === 'daily_measurement' && (
                      <DailyMeasurementInlineWidget habit={habit} compact={compact} />
                    )}
                    {(!habit.habit_type || habit.habit_type === 'checkbox') && (
                      <div className="text-sm text-muted-foreground text-center py-3 px-4 bg-muted/20 rounded-lg border border-muted-foreground/20">
                        💡 {t('card.swipeRightHint')} →
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </motion.div>

      {/* Celebration effect */}
      <HabitCelebration 
        trigger={showCelebration} 
        type={habit.streak % 7 === 0 ? 'milestone' : 'completion'} 
      />

      {/* Reset confirmation dialog */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('card.resetCounter')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('card.resetDescription', { days: elapsedTime?.days || 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder={t('card.whatHappened')}
            value={resetReason}
            onChange={(e) => setResetReason(e.target.value)}
            className="min-h-[80px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>{t('delete.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.stopPropagation();
                console.log('Reset clicked:', { 
                  habitId: habit.id, 
                  userId: user?.id, 
                  reason: resetReason,
                  currentAttempt 
                });
                resetHabit({ reason: resetReason });
                // Immediately update local state for instant UI feedback
                setElapsedTime({ days: 0, hours: 0, minutes: 0 });
                setShowResetDialog(false);
                setResetReason("");
              }}
              disabled={isResetting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isResetting ? t('card.resetting') : t('card.startFresh')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
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

