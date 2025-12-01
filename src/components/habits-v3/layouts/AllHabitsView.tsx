import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HabitMiniChart } from '@/components/habits-v3/charts/HabitMiniChart';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { CheckCircle2, RotateCcw } from 'lucide-react';
import { useHabitAttempts } from '@/hooks/useHabitAttempts';
import { useAuth } from '@/hooks/useAuth';

interface AllHabitsViewProps {
  habits: any[];
  onHabitComplete?: (habitId: string) => void;
  onHabitClick?: (habitId: string) => void;
}

export function AllHabitsView({ habits, onHabitComplete, onHabitClick }: AllHabitsViewProps) {
  const { user } = useAuth();
  
  // Sort habits by completion rate
  const sortedHabits = useMemo(() => {
    if (!Array.isArray(habits) || habits.length === 0) {
      return [];
    }
    
    return [...habits].sort((a, b) => {
      const rateA = a?.stats?.completion_rate || 0;
      const rateB = b?.stats?.completion_rate || 0;
      return rateB - rateA;
    });
  }, [habits]);

  if (sortedHabits.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Нет активных привычек</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {sortedHabits.map((habit, index) => (
        <HabitCompactCard
          key={habit.id}
          habit={habit}
          index={index}
          onComplete={onHabitComplete}
          onClick={onHabitClick}
          userId={user?.id}
        />
      ))}
    </div>
  );
}

interface HabitCompactCardProps {
  habit: any;
  index: number;
  onComplete?: (habitId: string) => void;
  onClick?: (habitId: string) => void;
  userId?: string;
}

function HabitCompactCard({ habit, index, onComplete, onClick, userId }: HabitCompactCardProps) {
  const { resetHabit, isResetting } = useHabitAttempts(habit.id, userId);
  
  const isDurationCounter = habit.habit_type === 'duration_counter';
  const isDailyCheck = habit.habit_type === 'daily_check';
  const isCompleted = habit.completed_today;

  const handleAction = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isDurationCounter) {
      resetHabit({ reason: 'Сброс из списка всех привычек' });
    } else if (!isCompleted && onComplete) {
      onComplete(habit.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={cn(
          "p-4 cursor-pointer transition-all hover:shadow-lg hover:scale-[1.01]",
          "glass-card border-border/50",
          index < 3 && "border-primary/30 bg-primary/5"
        )}
        onClick={() => onClick?.(habit.id)}
      >
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <span className="text-3xl flex-shrink-0">{habit.icon || '📌'}</span>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-base truncate">
                {habit.name}
              </h3>
              <p className="text-xs text-muted-foreground">
                {habit.category || 'Привычка'}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <div className="text-2xl font-bold text-primary">
              {Math.round(habit.stats?.completion_rate || 0)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {habit.stats?.total_completions || 0} раз
            </p>
          </div>
        </div>

        {/* Mini chart */}
        <div className="mb-3">
          <HabitMiniChart 
            completions={habit.completions || []}
            days={7}
          />
        </div>

        {/* Bottom row: streak + action button + XP */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-sm">
            <span>🔥</span>
            <span className="font-semibold text-foreground">
              {habit.streak || 0}
            </span>
          </div>

          {/* Action button */}
          {isDurationCounter ? (
            <Button
              size="sm"
              variant="outline"
              onClick={handleAction}
              disabled={isResetting}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Сбросить</span>
            </Button>
          ) : isDailyCheck && !isCompleted ? (
            <Button
              size="sm"
              variant="default"
              onClick={handleAction}
              className="gap-1.5 bg-primary/90 hover:bg-primary"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Выполнить</span>
            </Button>
          ) : isCompleted ? (
            <div className="text-xs text-success flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Готово</span>
            </div>
          ) : null}

          {habit.xp_reward && (
            <div className="flex items-center gap-1 text-sm">
              <span>⭐</span>
              <span className="font-semibold text-amber-500">
                +{habit.xp_reward}
              </span>
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}
