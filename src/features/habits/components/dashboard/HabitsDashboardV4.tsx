/**
 * HabitsDashboardV4 - Bento Grid дашборд для привычек
 * Apple Widgets style с Glassmorphism
 */

import { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { XPProgressSlim } from './XPProgressSlim';
import { FastingBentoWidget } from './FastingBentoWidget';
import { StreakCard } from './StreakCard';
import { DailyHabitRow } from './DailyHabitRow';
import { useUserLevel } from '@/hooks/useUserLevel';

interface HabitsDashboardV4Props {
  habits: any[];
  userId?: string;
  onHabitComplete: (habitId: string) => void;
  isCompleting?: boolean;
}

export function HabitsDashboardV4({ 
  habits, 
  userId, 
  onHabitComplete,
  isCompleting 
}: HabitsDashboardV4Props) {
  const { levelInfo } = useUserLevel();

  // Categorize habits
  const { fastingHabits, streakHabits, dailyHabits } = useMemo(() => {
    const fasting: any[] = [];
    const streak: any[] = [];
    const daily: any[] = [];

    habits.forEach(habit => {
      const type = habit.habit_type?.toLowerCase() || '';
      const name = habit.name?.toLowerCase() || '';

      // Fasting tracker
      if (type === 'fasting_tracker' || name.includes('голодан') || name.includes('fasting')) {
        fasting.push(habit);
      }
      // Duration counter (abstinence/streak habits) - расширенные keywords
      else if (
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
      ) {
        streak.push(habit);
      }
      // Everything else is daily
      else {
        daily.push(habit);
      }
    });

    return { fastingHabits: fasting, streakHabits: streak, dailyHabits: daily };
  }, [habits]);

  // Sort daily habits: incomplete first, then completed
  const sortedDailyHabits = useMemo(() => {
    return [...dailyHabits].sort((a, b) => {
      if (a.completedToday === b.completedToday) return 0;
      return a.completedToday ? 1 : -1;
    });
  }, [dailyHabits]);

  if (!userId) {
    return null;
  }

  return (
    <div className="space-y-4">
      {/* XP Progress - Slim version */}
      {levelInfo && (
        <XPProgressSlim
          level={levelInfo.level}
          totalXP={levelInfo.totalXP}
          xpToNext={levelInfo.xpToNext}
          progressPercent={levelInfo.progressPercent}
        />
      )}

      {/* Bento Grid */}
      <div className="grid grid-cols-2 gap-3">
        {/* Fasting Widget - Full width */}
        <AnimatePresence mode="popLayout">
          {fastingHabits.map(habit => (
            <FastingBentoWidget
              key={habit.id}
              habit={habit}
              userId={userId}
            />
          ))}
        </AnimatePresence>

        {/* Streak Cards - Square widgets */}
        <AnimatePresence mode="popLayout">
          {streakHabits.map(habit => (
            <StreakCard
              key={habit.id}
              habit={habit}
              userId={userId}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Daily Habits - Compact list */}
      {sortedDailyHabits.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-1">
            Ежедневные привычки
          </h3>
          <motion.div className="space-y-2" layout>
            <AnimatePresence mode="popLayout">
              {sortedDailyHabits.map(habit => (
                <DailyHabitRow
                  key={habit.id}
                  habit={habit}
                  onComplete={onHabitComplete}
                  isCompleting={isCompleting}
                  userId={userId}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* Empty state */}
      {habits.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-12 text-muted-foreground"
        >
          <p className="text-lg mb-2">Нет привычек</p>
          <p className="text-sm">Создайте первую привычку, чтобы начать</p>
        </motion.div>
      )}
    </div>
  );
}
