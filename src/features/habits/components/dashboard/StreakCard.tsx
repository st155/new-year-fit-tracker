/**
 * StreakCard - компактный квадратный виджет для счетчиков воздержания
 */

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, Cigarette, Wine, Cannabis, Coffee, Cookie } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useHabitAttemptsQuery as useHabitAttempts } from '@/features/habits/hooks';
import { cn } from '@/lib/utils';
import { differenceInDays, parseISO } from 'date-fns';
import { useTranslation } from 'react-i18next';

interface StreakCardProps {
  habit: any;
  userId: string;
  onReset?: () => void;
}

const HABIT_ICONS: Record<string, { icon: any; color: string; glowColor: string }> = {
  'smoke': { icon: Cigarette, color: 'text-orange-500', glowColor: 'shadow-orange-500/40' },
  'cigarette': { icon: Cigarette, color: 'text-orange-500', glowColor: 'shadow-orange-500/40' },
  'сигарет': { icon: Cigarette, color: 'text-orange-500', glowColor: 'shadow-orange-500/40' },
  'alcohol': { icon: Wine, color: 'text-purple-500', glowColor: 'shadow-purple-500/40' },
  'алкогол': { icon: Wine, color: 'text-purple-500', glowColor: 'shadow-purple-500/40' },
  'weed': { icon: Cannabis, color: 'text-green-500', glowColor: 'shadow-green-500/40' },
  'cannabis': { icon: Cannabis, color: 'text-green-500', glowColor: 'shadow-green-500/40' },
  'coffee': { icon: Coffee, color: 'text-amber-600', glowColor: 'shadow-amber-600/40' },
  'кофе': { icon: Coffee, color: 'text-amber-600', glowColor: 'shadow-amber-600/40' },
  'sugar': { icon: Cookie, color: 'text-pink-500', glowColor: 'shadow-pink-500/40' },
  'сахар': { icon: Cookie, color: 'text-pink-500', glowColor: 'shadow-pink-500/40' },
};

function getHabitIcon(habitName: string) {
  const lowerName = habitName.toLowerCase();
  for (const [key, value] of Object.entries(HABIT_ICONS)) {
    if (lowerName.includes(key)) {
      return value;
    }
  }
  // Default
  return { icon: RotateCcw, color: 'text-primary', glowColor: 'shadow-primary/40' };
}

export function StreakCard({ habit, userId, onReset }: StreakCardProps) {
  const { t } = useTranslation('habits');
  const { currentAttempt, resetHabit, isResetting } = useHabitAttempts(habit.id, userId);
  const [isOpen, setIsOpen] = useState(false);

  // Calculate days since start (minimum 1 if started today)
  const rawDays = currentAttempt?.start_date
    ? differenceInDays(new Date(), parseISO(currentAttempt.start_date))
    : 0;
  // If started today (0 days difference), show 1 day
  const daysCount = currentAttempt?.start_date ? Math.max(1, rawDays) : 0;

  const hasStreak = daysCount > 0;
  const iconData = getHabitIcon(habit.name);
  const IconComponent = iconData.icon;

  const handleReset = async () => {
    await resetHabit({ reason: t('streak.resetReason', 'Reset via widget') });
    onReset?.();
    setIsOpen(false);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <motion.div
          className={cn(
            "aspect-square p-4 rounded-2xl cursor-pointer",
            "bg-gradient-to-br from-card/80 to-card/40",
            "backdrop-blur-xl border border-border/30",
            "flex flex-col items-center justify-center gap-2",
            "transition-shadow duration-300",
            hasStreak && `shadow-lg ${iconData.glowColor}`
          )}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.02 }}
          layout
        >
          {/* Glow animation for active streak */}
          <AnimatePresence>
            {hasStreak && (
              <motion.div
                className="absolute inset-0 rounded-2xl"
                initial={{ opacity: 0 }}
                animate={{ 
                  opacity: [0.3, 0.6, 0.3],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: 'easeInOut'
                }}
                style={{
                  boxShadow: `0 0 30px ${iconData.glowColor.replace('shadow-', '').replace('/40', '')}`,
                }}
              />
            )}
          </AnimatePresence>

          {/* Icon */}
          <motion.div
            className={cn("relative z-10", iconData.color)}
            animate={hasStreak ? { 
              scale: [1, 1.1, 1],
            } : {}}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            <IconComponent className="w-10 h-10" />
          </motion.div>

          {/* Days count */}
          <div className="text-center relative z-10">
            <motion.div
              className="text-2xl font-bold"
              key={daysCount}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
            >
              {daysCount}
            </motion.div>
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
              {t('streak.day', { count: daysCount, defaultValue: daysCount === 1 ? 'day' : 'days' })}
            </div>
          </div>

          {/* Habit name */}
          <div className="text-[10px] text-muted-foreground text-center truncate w-full px-1 relative z-10">
            {habit.name}
          </div>
        </motion.div>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="center" className="w-48">
        <DropdownMenuItem
          onClick={handleReset}
          disabled={isResetting}
          className="text-destructive focus:text-destructive"
        >
          <RotateCcw className="w-4 h-4 mr-2" />
          {isResetting ? t('streak.resetting', 'Resetting...') : t('streak.resetCounter', 'Reset counter')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
