import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useFastingWindow } from "@/hooks/useFastingWindow";
import { useHabitMeasurements } from "@/hooks/useHabitMeasurements";
import { useHabitAttempts } from "@/hooks/useHabitAttempts";
import { getHabitIcon, getHabitSentiment, getHabitNeonColor } from "@/lib/habit-utils";
import { CheckCircle2, Flame, TrendingUp, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface HabitCompactCardProps {
  habit: any;
  userId?: string;
}

export function HabitCompactCard({ habit, userId }: HabitCompactCardProps) {
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
    if (habit.habit_type === "duration_counter") {
      // Use current_attempt.start_date if available, fallback to habit.start_date
      const startDate = habit.current_attempt?.start_date || habit.start_date;
      
      if (!startDate) return;
      
      const start = new Date(startDate);
      
      // Protection against Invalid Date
      if (isNaN(start.getTime())) {
        console.error('Invalid start_date for habit:', habit.id);
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
  }, [habit.habit_type, habit.current_attempt?.start_date, habit.start_date, habit.id]);

  const moneySaved = elapsedTime && habit.custom_data?.cost_per_day
    ? Math.floor(
        ((elapsedTime.days * 24 + elapsedTime.hours) / 24) *
          habit.custom_data.cost_per_day
      )
    : null;

  // FASTING TRACKER - Modern design
  if (habit.habit_type === "fasting_tracker") {
    const { status } = fastingWindow;
    const { duration: currentDuration } = status;
    
    const hours = Math.floor((currentDuration || 0) / 60);
    const minutes = (currentDuration || 0) % 60;
    const targetHours = habit.custom_data?.target_hours || 16;
    const progress = Math.min(((currentDuration || 0) / (targetHours * 60)) * 100, 100);

    return (
      <Card className="modern-habit-card group p-6 h-full">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className={cn(
              "w-12 h-12 rounded-xl flex items-center justify-center ring-2",
              status.isFasting 
                ? "bg-gradient-to-br from-emerald-500/20 to-green-500/30 ring-emerald-500/30"
                : "bg-gradient-to-br from-orange-500/20 to-yellow-500/30 ring-orange-500/30"
            )}>
              <Icon className="h-6 w-6" style={{ color: status.isFasting ? "#10b981" : "#f97316" }} />
            </div>
            <h3 className="text-base font-bold truncate flex-1">{habit.name}</h3>
          </div>

          {/* Big Timer */}
          <div className="text-center py-3">
            <div className={cn(
              "text-5xl font-black bg-gradient-to-r bg-clip-text text-transparent",
              status.isFasting 
                ? "from-emerald-400 via-green-400 to-emerald-500"
                : "from-orange-400 via-yellow-400 to-orange-500"
            )}>
              {hours}:{minutes.toString().padStart(2, '0')}
            </div>
            <div className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
              <Clock className="h-3 w-3" />
              {Math.round(progress)}% цели
            </div>
          </div>

          {/* Progress Bar */}
          <Progress 
            value={progress} 
            className="h-3"
            variant={status.isFasting ? "success" : "warning"}
          />

          {/* Status Badge */}
          <div className="flex items-center justify-center">
            <Badge 
              variant={status.isFasting ? "excellent" : "fair"}
              className="text-sm px-4 py-1.5"
            >
              {status.isFasting ? "🔥 Голодание" : "🍽️ Прием пищи"}
            </Badge>
          </div>
        </div>
      </Card>
    );
  }

  // DURATION COUNTER - Modern with large metrics
  if (habit.habit_type === "duration_counter" && elapsedTime) {
    const totalHours = elapsedTime.days * 24 + elapsedTime.hours;
    const progressPercent = Math.min((totalHours / 720) * 100, 100); // 30 days = 720 hours

    return (
      <Card className="modern-habit-card group p-6 h-full">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500/20 to-pink-500/30 flex items-center justify-center ring-2 ring-rose-500/30">
              <Icon className="h-6 w-6" style={{ color: neonColor }} />
            </div>
            <h3 className="text-base font-bold truncate flex-1">{habit.name}</h3>
          </div>

          {/* Big Timer */}
          <div className="text-center py-3">
            <div className="text-5xl font-black bg-gradient-to-r from-rose-400 via-pink-400 to-rose-500 bg-clip-text text-transparent leading-tight">
              {elapsedTime.days > 0 && `${elapsedTime.days}д `}
              {elapsedTime.hours}ч
            </div>
            <div className="text-xs text-muted-foreground mt-2">
              Без срывов
            </div>
          </div>

          {/* Progress Bar */}
          <Progress 
            value={progressPercent} 
            className="h-2.5"
            variant="danger"
          />

          {/* Stats Row */}
          <div className="flex items-center justify-between gap-2">
            {currentAttempt && (
              <Badge variant="fair" className="flex items-center gap-1 text-xs">
                <Flame className="h-3 w-3" />
                С {new Date(currentAttempt.start_date).toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}
              </Badge>
            )}
            
            {moneySaved !== null && moneySaved > 0 && (
              <Badge variant="excellent" className="flex items-center gap-1 text-xs font-bold">
                💰 {moneySaved.toLocaleString('ru-RU')} ₽
              </Badge>
            )}
          </div>
        </div>
      </Card>
    );
  }

  // DAILY HABIT or NUMERIC COUNTER - Modern design
  const isCompletedToday = habit.completed_today;
  const currentStreak = currentAttempt ? 
    Math.floor((new Date().getTime() - new Date(currentAttempt.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const targetValue = habit.custom_data?.target_value;
  const currentValue = stats?.latest || stats?.total || 0;
  const progress = targetValue ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  return (
    <Card className="modern-habit-card group p-6 h-full">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/30 flex items-center justify-center ring-2 ring-primary/30">
            <Icon className="h-6 w-6" style={{ color: neonColor }} />
          </div>
          <h3 className="text-base font-bold truncate flex-1">{habit.name}</h3>
        </div>

        {/* Main Content */}
        {isCompletedToday ? (
          <div className="flex flex-col items-center py-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-2" />
            </motion.div>
            <Badge variant="excellent" className="text-sm">
              ✓ Выполнено
            </Badge>
          </div>
        ) : habit.habit_type === "numeric_counter" && targetValue ? (
          <div className="space-y-3 py-2">
            <div className="text-center">
              <div className="text-5xl font-black bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent">
                {currentValue}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                из <span className="font-semibold">{targetValue}</span>
              </div>
            </div>
            <Progress 
              value={progress} 
              className="h-3"
              autoColor
            />
            <div className="text-center text-xs text-muted-foreground">
              {Math.round(progress)}% выполнено
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <div className="text-sm text-muted-foreground">
              Не выполнено
            </div>
          </div>
        )}

        {/* Bottom Stats */}
        <div className="flex items-center justify-between gap-2 pt-2">
          {currentStreak > 0 && (
            <Badge variant="fair" className="flex items-center gap-1 text-xs">
              <Flame className="h-3 w-3" />
              {currentStreak}д
            </Badge>
          )}
          
          {stats && stats.total > 0 && (
            <Badge variant="outline" className="flex items-center gap-1 text-xs">
              <TrendingUp className="h-3 w-3" />
              {stats.total}
            </Badge>
          )}
        </div>
      </div>
    </Card>
  );
}
