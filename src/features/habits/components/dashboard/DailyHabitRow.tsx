/**
 * DailyHabitRow - компактная строка привычки для ежедневных рутин
 * Поддержка duration_counter привычек со счётчиком дней
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import { Check, Circle, RotateCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useHabitAttempts } from '@/hooks/useHabitAttempts';
import { differenceInDays, parseISO } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface DailyHabitRowProps {
  habit: any;
  onComplete: (habitId: string) => void;
  isCompleting?: boolean;
  userId?: string;
}

// Icon mapping based on habit name keywords
const HABIT_EMOJIS: Record<string, string> = {
  'зарядк': '🏋️',
  'exercise': '🏋️',
  'workout': '💪',
  'тренировк': '💪',
  'чтени': '📚',
  'read': '📚',
  'book': '📖',
  'медитаци': '🧘',
  'meditat': '🧘',
  'вод': '💧',
  'water': '💧',
  'сон': '😴',
  'sleep': '😴',
  'walk': '🚶',
  'прогулк': '🚶',
  'vitamin': '💊',
  'витамин': '💊',
  'journal': '📝',
  'дневник': '📝',
  'stretch': '🤸',
  'растяжк': '🤸',
  // Streak habits
  'курить': '🚭',
  'smoke': '🚭',
  'сигарет': '🚭',
  'алкогол': '🍷',
  'alcohol': '🍷',
  'weed': '🌿',
  'cannabis': '🌿',
};

function getHabitEmoji(habitName: string): string {
  const lowerName = habitName.toLowerCase();
  for (const [key, emoji] of Object.entries(HABIT_EMOJIS)) {
    if (lowerName.includes(key)) {
      return emoji;
    }
  }
  return '✨';
}

// Check if this is a streak/abstinence habit
function isStreakHabit(habit: any): boolean {
  const type = habit.habit_type?.toLowerCase() || '';
  const name = habit.name?.toLowerCase() || '';
  
  return (
    type === 'duration_counter' ||
    name.includes('без ') ||
    name.includes('no ') ||
    name.includes('quit') ||
    name.includes('free') ||
    name.includes('бросить') ||
    name.includes('не пью') ||
    name.includes('не ем') ||
    name.includes('курить') ||
    name.includes('курени') ||
    name.includes('алкогол') ||
    name.includes('smoke') ||
    name.includes('weed') ||
    name.includes('sober')
  );
}

export function DailyHabitRow({ habit, onComplete, isCompleting, userId }: DailyHabitRowProps) {
  const { t } = useTranslation('habits');
  const isCompleted = habit.completedToday;
  const emoji = getHabitEmoji(habit.name);
  const isStreak = isStreakHabit(habit);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Only fetch attempts for streak habits
  const { currentAttempt, resetHabit, isResetting } = useHabitAttempts(
    isStreak ? habit.id : '', 
    userId || ''
  );

  // Calculate streak days
  const streakDays = currentAttempt?.start_date
    ? Math.max(1, differenceInDays(new Date(), parseISO(currentAttempt.start_date)))
    : 0;

  const handleClick = () => {
    if (isStreak) {
      // For streak habits, open reset menu
      setIsMenuOpen(true);
    } else if (!isCompleted && !isCompleting) {
      onComplete(habit.id);
    }
  };

  const handleReset = async () => {
    await resetHabit({ reason: t('resetHabit.reason') });
    setIsMenuOpen(false);
  };

  const rowContent = (
    <motion.div
      layout
      layoutId={habit.id}
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: isCompleted && !isStreak ? 0.5 : 1, 
        y: 0,
      }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ 
        duration: 0.2,
        layout: { duration: 0.3 }
      }}
      className={cn(
        "flex items-center justify-between h-12 px-4 rounded-xl",
        "bg-card/50 backdrop-blur-sm border border-border/30",
        "cursor-pointer transition-colors",
        !isCompleted && !isStreak && "hover:bg-card/70 active:bg-card/90",
        isStreak && "hover:bg-card/70 active:bg-card/90",
        isCompleted && !isStreak && "pointer-events-none"
      )}
      onClick={isStreak ? undefined : handleClick}
      whileTap={!isCompleted || isStreak ? { scale: 0.98 } : {}}
    >
      {/* Left: Icon and name */}
      <div className="flex items-center gap-3">
        <span className="text-lg">{emoji}</span>
        <span className={cn(
          "text-sm font-medium truncate max-w-[140px]",
          isCompleted && !isStreak && "line-through text-muted-foreground"
        )}>
          {habit.name}
        </span>
      </div>

      {/* Right: Streak badge or Checkbox */}
      {isStreak ? (
        <div className="flex items-center gap-2">
          {/* Streak counter badge */}
          <motion.div
            className={cn(
              "px-2.5 py-1 rounded-full text-xs font-bold",
              "bg-primary/10 text-primary border border-primary/20"
            )}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 20 }}
          >
            {t('streakDays', { count: streakDays })}
          </motion.div>
        </div>
      ) : (
        <motion.button
          className={cn(
            "w-6 h-6 rounded-full flex items-center justify-center",
            "border-2 transition-colors",
            isCompleted
              ? "bg-primary border-primary text-primary-foreground"
              : "border-muted-foreground/50 hover:border-primary"
          )}
          whileTap={{ scale: 0.8 }}
          disabled={isCompleting}
        >
          {isCompleted ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
            >
              <Check className="w-3.5 h-3.5" />
            </motion.div>
          ) : (
            <Circle className="w-3.5 h-3.5 opacity-0" />
          )}
        </motion.button>
      )}
    </motion.div>
  );

  // Wrap streak habits in dropdown menu
  if (isStreak) {
    return (
      <DropdownMenu open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DropdownMenuTrigger asChild>
          {rowContent}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={handleReset}
            disabled={isResetting}
            className="text-destructive focus:text-destructive"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            {isResetting ? t('resetHabit.resetting') : t('resetHabit.resetCounter')}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  return rowContent;
}
