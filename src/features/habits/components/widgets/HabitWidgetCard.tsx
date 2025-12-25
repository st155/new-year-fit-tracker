import { useMemo, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { getHabitTheme } from '@/lib/habit-widget-themes';
import { CircularProgress } from './CircularProgress';
import { HabitSparklineWidget } from './HabitSparklineWidget';

interface HabitWidgetCardProps {
  habit: any;
  onClick?: () => void;
}

export function HabitWidgetCard({ habit, onClick }: HabitWidgetCardProps) {
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const theme = getHabitTheme(habit.habit_type);

  // Update elapsed time for duration counters
  useEffect(() => {
    if (habit.habit_type === 'duration_counter' && habit.start_date) {
      const updateElapsed = () => {
        const start = new Date(habit.start_date);
        const now = new Date();
        const days = Math.floor((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        setElapsedTime(days);
      };
      
      updateElapsed();
      const interval = setInterval(updateElapsed, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [habit.habit_type, habit.start_date]);

  const metrics = useMemo(() => {
    const habitType = habit.habit_type;

    if (habitType === 'duration_counter') {
      const days = elapsedTime;
      const milestone = habit.custom_data?.ai_motivation?.next_milestone || 30;
      const progress = (days / milestone) * 100;
      const moneySaved = habit.cost_per_day ? (days * habit.cost_per_day).toFixed(0) : null;

      return {
        value: days,
        max: milestone,
        progress,
        label: 'дней',
        subtitle: moneySaved ? `💰 ${moneySaved}₽` : `Цель: ${milestone}д`,
        detail: `Серия: ${habit.streak || 0} дней`,
      };
    }

    if (habitType === 'fasting_tracker') {
      const fastingHours = habit.custom_data?.fasting_hours || 0;
      const targetHours = habit.target_value || 16;
      const progress = (fastingHours / targetHours) * 100;

      return {
        value: Math.floor(fastingHours),
        max: targetHours,
        progress,
        label: 'часов',
        subtitle: '🔥 Пост активен',
        detail: `Окно: ${targetHours}ч`,
      };
    }

    if (habitType === 'numeric_counter' || habitType === 'daily_measurement') {
      const current = habit.current_value || 0;
      const target = habit.target_value || 100;
      const progress = (current / target) * 100;

      return {
        value: Math.floor(current),
        max: target,
        progress,
        label: habit.unit || '',
        subtitle: `Цель: ${target}${habit.unit || ''}`,
        detail: `Прогресс: ${Math.round(progress)}%`,
      };
    }

    // Default: daily habit
    const streak = habit.streak || 0;
    const target = habit.target_value || 30;
    const progress = (streak / target) * 100;

    return {
      value: streak,
      max: target,
      progress,
      label: 'дней',
      subtitle: `Серия: ${streak}`,
      detail: `До цели: ${target - streak}д`,
    };
  }, [habit, elapsedTime]);

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="cursor-pointer"
    >
      <Card
        className={cn(
          'relative overflow-hidden',
          'bg-gradient-to-br glass-card',
          'hover:shadow-glow transition-all duration-300',
          theme.gradient,
          theme.glowClass
        )}
      >
        <div className="p-4">
          {/* Header: Icon + Title */}
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{habit.icon || theme.icon}</span>
            <h3 className="font-semibold text-sm truncate flex-1">
              {habit.name}
            </h3>
          </div>

          {/* Circular Progress */}
          <div className="flex justify-center mb-4">
            <CircularProgress
              value={metrics.value}
              max={metrics.max}
              size={100}
              strokeWidth={10}
              gradient={theme.ringGradient}
              label={metrics.label}
            />
          </div>

          {/* Sparkline */}
          <div className="mb-3 h-10">
            <HabitSparklineWidget
              habitId={habit.id}
              habitType={habit.habit_type}
              color={theme.ringGradient[0]}
              height={40}
            />
          </div>

          {/* Stats */}
          <div className="space-y-1">
            <div className="text-xs font-medium text-center">
              {metrics.subtitle}
            </div>
            <div className="text-xs text-muted-foreground text-center">
              {metrics.detail}
            </div>
          </div>

          {/* Completion Badge */}
          {habit.completed_today && (
            <Badge 
              className="absolute top-2 right-2 bg-success text-success-foreground"
              variant="default"
            >
              ✓
            </Badge>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
