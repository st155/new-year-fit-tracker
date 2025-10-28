import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { useFastingWindow } from "@/hooks/useFastingWindow";
import { useHabitMeasurements } from "@/hooks/useHabitMeasurements";
import { useHabitAttempts } from "@/hooks/useHabitAttempts";
import { getHabitIcon, getHabitSentiment, getHabitNeonColor } from "@/lib/habit-utils";
import { CheckCircle2, Flame, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface HabitCompactCardProps {
  habit: any;
  userId?: string;
}

export function HabitCompactCard({ habit, userId }: HabitCompactCardProps) {
  // Debug logging
  console.log('🎯 [HabitCompactCard] Rendering:', {
    id: habit.id,
    name: habit.name,
    type: habit.habit_type,
    start_date: habit.start_date,
    completed_today: habit.completed_today,
    custom_data: habit.custom_data,
  });

  const [elapsedTime, setElapsedTime] = useState<{
    days: number;
    hours: number;
    minutes: number;
  } | null>(null);

  const Icon = getHabitIcon(habit);
  const sentiment = getHabitSentiment(habit);
  const neonColor = getHabitNeonColor(sentiment);

  const fastingWindow = useFastingWindow(habit.id, userId);
  const { stats } = useHabitMeasurements(habit.id, userId);
  const { currentAttempt } = useHabitAttempts(habit.id, userId);

  // Update elapsed time for duration counters
  useEffect(() => {
    if (habit.habit_type === "duration_counter" && habit.start_date) {
      const start = new Date(habit.start_date);
      
      // Protection against Invalid Date
      if (isNaN(start.getTime())) {
        console.error('❌ [HabitCompactCard] Invalid start_date:', habit.start_date, 'for habit:', habit.id);
        return;
      }
      
      const updateElapsed = () => {
        const now = new Date();
        const diff = now.getTime() - start.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        setElapsedTime({
          days,
          hours: hours % 24,
          minutes: minutes % 60,
        });
      };

      updateElapsed();
      const interval = setInterval(updateElapsed, 60000);
      return () => clearInterval(interval);
    }
  }, [habit]);

  const moneySaved = elapsedTime && habit.custom_data?.cost_per_day
    ? Math.floor(
        ((elapsedTime.days * 24 + elapsedTime.hours) / 24) *
          habit.custom_data.cost_per_day
      )
    : null;

  // FASTING TRACKER - Compact circular progress
  if (habit.habit_type === "fasting_tracker") {
    const { status } = fastingWindow;
    const { duration: currentDuration } = status;
    
    const hours = Math.floor((currentDuration || 0) / 60);
    const minutes = (currentDuration || 0) % 60;
    const targetHours = habit.custom_data?.target_hours || 16;
    const progress = Math.min(((currentDuration || 0) / (targetHours * 60)) * 100, 100);

    return (
      <Card className="group relative overflow-hidden p-4 hover:scale-[1.02] transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-green-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500/20 to-green-500/20 flex items-center justify-center">
              <Icon className="h-4 w-4" style={{ color: neonColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{habit.name}</h3>
            </div>
          </div>

          {/* Compact Circular Progress */}
          <div className="flex items-center justify-center">
            <div className="relative">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke="currentColor"
                  strokeWidth="6"
                  fill="none"
                  className="text-muted/20"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  stroke={status.isFasting ? "#10b981" : "#f97316"}
                  strokeWidth="6"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 34}`}
                  strokeDashoffset={`${2 * Math.PI * 34 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500"
                  style={{ filter: `drop-shadow(0 0 6px ${status.isFasting ? "#10b98180" : "#f9731680"})` }}
                />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-lg font-bold">
                  {hours}:{minutes.toString().padStart(2, '0')}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  {Math.round(progress)}%
                </div>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div className={cn(
            "text-center text-xs font-medium px-2 py-1 rounded-full",
            status.isFasting 
              ? "bg-emerald-500/20 text-emerald-400" 
              : "bg-orange-500/20 text-orange-400"
          )}>
            {status.isFasting ? "Голодание" : "Прием пищи"}
          </div>
        </div>
      </Card>
    );
  }

  // DURATION COUNTER - Big timer display
  if (habit.habit_type === "duration_counter" && elapsedTime) {
    return (
      <Card className="group relative overflow-hidden p-4 hover:scale-[1.02] transition-all duration-300">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
        
        <div className="relative space-y-3">
          {/* Header */}
          <div className="flex items-center gap-2">
            <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500/20 to-pink-500/20 flex items-center justify-center">
              <Icon className="h-4 w-4" style={{ color: neonColor }} />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm truncate">{habit.name}</h3>
            </div>
          </div>

          {/* Timer Display */}
          <div className="text-center py-2">
            <div className="text-2xl font-bold bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent">
              {elapsedTime.days > 0 && `${elapsedTime.days}д `}
              {elapsedTime.hours}ч
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">
              Без срывов
            </div>
          </div>

          {/* Money Badge */}
          {moneySaved !== null && moneySaved > 0 && (
            <div className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <span className="text-sm">💰</span>
              <div className="text-xs font-bold text-green-400">
                {moneySaved.toLocaleString('ru-RU')} ₽
              </div>
            </div>
          )}

          {/* Streak indicator */}
          {currentAttempt && (
            <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground">
              <Flame className="h-3 w-3 text-orange-500" />
              С {new Date(currentAttempt.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
            </div>
          )}
        </div>
      </Card>
    );
  }

  // DAILY HABIT or NUMERIC COUNTER
  const isCompletedToday = habit.completed_today;
  const currentStreak = currentAttempt ? 
    Math.floor((new Date().getTime() - new Date(currentAttempt.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const targetValue = habit.custom_data?.target_value;
  const currentValue = stats?.latest || stats?.total || 0;
  const progress = targetValue ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  return (
    <Card className="group relative overflow-hidden p-4 hover:scale-[1.02] transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <div className="relative space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
            <Icon className="h-4 w-4" style={{ color: neonColor }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate">{habit.name}</h3>
          </div>
        </div>

        {/* Main Content */}
        {isCompletedToday ? (
          <div className="flex flex-col items-center py-3">
            <CheckCircle2 className="h-10 w-10 text-green-500 mb-2" />
            <div className="text-xs font-medium text-green-500">
              Выполнено
            </div>
          </div>
        ) : habit.habit_type === "numeric_counter" && targetValue ? (
          <div className="space-y-2 py-2">
            <div className="text-center">
              <div className="text-xl font-bold bg-gradient-to-r from-primary to-purple-500 bg-clip-text text-transparent">
                {currentValue}
              </div>
              <div className="text-[10px] text-muted-foreground">
                из {targetValue}
              </div>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500"
                style={{ 
                  width: `${progress}%`,
                  filter: 'drop-shadow(0 0 4px hsl(var(--primary)))'
                }}
              />
            </div>
          </div>
        ) : (
          <div className="text-center py-3 text-xs text-muted-foreground">
            Не выполнено
          </div>
        )}

        {/* Streak Badge */}
        {currentStreak > 0 && (
          <div className="flex items-center justify-center gap-1.5 px-2 py-1 rounded-full bg-gradient-to-r from-orange-500/20 to-red-500/20">
            <Flame className="h-3 w-3 text-orange-500" />
            <span className="text-xs font-semibold text-orange-400">
              {currentStreak}д
            </span>
          </div>
        )}

        {/* Stats */}
        {stats && (stats.total || stats.average) && (
          <div className="flex items-center justify-center gap-2 text-[10px] text-muted-foreground">
            {stats.total > 0 && (
              <span className="flex items-center gap-0.5">
                <TrendingUp className="h-3 w-3" />
                {stats.total}
              </span>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
