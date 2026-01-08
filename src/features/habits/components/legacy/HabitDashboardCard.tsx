import { useState, useEffect } from "react";
import { useTranslation } from 'react-i18next';
import { Card } from "@/components/ui/card";
import { FastingControlButton } from "./FastingControlButton";
import { useFastingWindow } from "@/hooks/useFastingWindow";
import { useHabitMeasurements } from "@/hooks/useHabitMeasurements";
import { useHabitAttempts } from "@/hooks/useHabitAttempts";
import { getHabitIcon, getHabitSentiment, getHabitNeonColor } from "@/lib/habit-utils";
import { CheckCircle2, TrendingUp, Flame } from "lucide-react";
import { HabitHistory } from "./HabitHistory";
import { HabitSparkline } from "./HabitSparkline";

interface HabitDashboardCardProps {
  habit: any;
  userId?: string;
}

export function HabitDashboardCard({ habit, userId }: HabitDashboardCardProps) {
  const { t } = useTranslation('habits');
  const [elapsedTime, setElapsedTime] = useState<{
    days: number;
    hours: number;
    minutes: number;
  } | null>(null);

  const Icon = getHabitIcon(habit);
  const sentiment = getHabitSentiment(habit);
  const neonColor = getHabitNeonColor(sentiment);

  // Hooks for different habit types
  const fastingWindow = useFastingWindow(habit.id, userId);
  const { stats, measurements } = useHabitMeasurements(habit.id, userId);
  const { currentAttempt, attempts } = useHabitAttempts(habit.id, userId);

  // Update elapsed time for duration counters
  useEffect(() => {
    if (habit.habit_type === "duration_counter" && habit.custom_data?.start_date) {
      const updateElapsed = () => {
        const start = new Date(habit.custom_data.start_date);
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

  // Calculate money saved for duration counter
  const moneySaved = elapsedTime && habit.custom_data?.cost_per_day
    ? Math.floor(
        ((elapsedTime.days * 24 + elapsedTime.hours) / 24) *
          habit.custom_data.cost_per_day
      )
    : null;

  // Render Fasting Tracker
  if (habit.habit_type === "fasting_tracker") {
    const { currentWindow, status } = fastingWindow;
    const { duration: currentDuration } = status;
    
    const hours = Math.floor((currentDuration || 0) / 60);
    const minutes = (currentDuration || 0) % 60;
    const targetHours = habit.custom_data?.target_hours || 16;
    const progress = Math.min(((currentDuration || 0) / (targetHours * 60)) * 100, 100);

    return (
      <Card className="habit-dashboard-card group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="habit-icon-container">
              <Icon className="h-6 w-6" style={{ color: neonColor }} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{habit.name}</h3>
              <p className="text-xs text-muted-foreground">Интервальное голодание</p>
            </div>
          </div>

          {/* Main Metric - Circular Progress */}
          <div className="flex flex-col items-center py-4">
            <div className="relative">
              {/* Circular Progress Ring */}
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-muted/20"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="url(#fasting-gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - progress / 100)}`}
                  strokeLinecap="round"
                  className="transition-all duration-500 habit-ring-glow"
                />
                <defs>
                  <linearGradient id="fasting-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={status.isFasting ? "#10b981" : "#f97316"} />
                    <stop offset="100%" stopColor={status.isFasting ? "#059669" : "#dc2626"} />
                  </linearGradient>
                </defs>
              </svg>
              
              {/* Time Display */}
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="habit-metric-number text-3xl">
                  {hours}:{minutes.toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {Math.round(progress)}% до цели
                </div>
              </div>
            </div>
          </div>

          {/* Control Button */}
          <FastingControlButton
            status={{
              isFasting: status.isFasting,
              isEating: status.isEating,
            }}
            onStartFasting={fastingWindow.startFasting}
            onStartEating={fastingWindow.startEating}
            onEndEating={fastingWindow.endEating}
            isLoading={fastingWindow.isStarting || fastingWindow.isEnding || fastingWindow.isFastingStarting}
            className="py-4 text-sm"
          />

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Flame className="h-3 w-3" />
              <span>Цель: {targetHours}ч</span>
            </div>
            {currentWindow && (
              <span>
                Окно {currentWindow.fasting_duration ? `${Math.floor(currentWindow.fasting_duration / 60)}:${(currentWindow.fasting_duration % 60).toString().padStart(2, '0')}` : '—'}
              </span>
            )}
          </div>

          {/* Recent History */}
          {fastingWindow.windows && fastingWindow.windows.length > 1 && (
            <div className="pt-3 space-y-2">
              <div className="text-xs text-muted-foreground">Последние окна</div>
              <HabitHistory 
                windows={fastingWindow.windows.slice(1, 4)}
                type="windows"
                maxItems={3}
              />
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Render Duration Counter (e.g., No Smoking)
  if (habit.habit_type === "duration_counter" && elapsedTime) {
    return (
      <Card className="habit-dashboard-card group relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        
        <div className="relative p-6 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3">
            <div className="habit-icon-container">
              <Icon className="h-6 w-6" style={{ color: neonColor }} />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg">{habit.name}</h3>
              <p className="text-xs text-muted-foreground">Счётчик времени</p>
            </div>
          </div>

          {/* Main Metric - Large Timer */}
          <div className="flex flex-col items-center py-6">
            <div className="habit-metric-number text-4xl mb-2">
              {elapsedTime.days > 0 && `${elapsedTime.days}д `}
              {elapsedTime.hours}ч {elapsedTime.minutes}м
            </div>
            <div className="text-sm text-muted-foreground">
              Прошло без срывов
            </div>
          </div>

          {/* Money Saved */}
          {moneySaved !== null && moneySaved > 0 && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/20">
              <span className="text-2xl">💰</span>
              <div>
                <div className="text-lg font-bold text-green-400">
                  {moneySaved.toLocaleString('ru-RU')} ₽
                </div>
                <div className="text-xs text-muted-foreground">Сэкономлено</div>
              </div>
            </div>
          )}

          {/* Stats */}
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <Flame className="h-3 w-3" />
              <span>Без срывов с {new Date(currentAttempt?.start_date || '').toLocaleDateString('ru-RU')}</span>
            </div>
            {currentAttempt?.days_lasted && (
              <span>Лучшая: {currentAttempt.days_lasted} дн.</span>
            )}
          </div>

          {/* Recent Attempts History */}
          {attempts && attempts.length > 1 && (
            <div className="pt-3 space-y-2">
              <div className="text-xs text-muted-foreground">История попыток</div>
              <HabitHistory 
                attempts={attempts.filter(a => a.end_date).slice(0, 3)}
                type="attempts"
                maxItems={3}
              />
            </div>
          )}
        </div>
      </Card>
    );
  }

  // Render Daily Habit or Numeric Counter
  const isCompletedToday = habit.completed_today;
  const currentStreak = currentAttempt ? 
    Math.floor((new Date().getTime() - new Date(currentAttempt.start_date).getTime()) / (1000 * 60 * 60 * 24)) : 0;
  const targetValue = habit.custom_data?.target_value;
  const currentValue = stats?.latest || stats?.total || 0;
  const progress = targetValue ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  return (
    <Card className="habit-dashboard-card group relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      
      <div className="relative p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="habit-icon-container">
            <Icon className="h-6 w-6" style={{ color: neonColor }} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-lg">{habit.name}</h3>
            <p className="text-xs text-muted-foreground">
              {habit.habit_type === "numeric_counter" ? "Числовой счётчик" : "Ежедневная привычка"}
            </p>
          </div>
        </div>

        {/* Main Status */}
        <div className="flex flex-col items-center py-6">
          {isCompletedToday ? (
            <div className="flex flex-col items-center">
              <CheckCircle2 className="h-16 w-16 text-green-500 mb-3 animate-scale-in" />
              <div className="text-lg font-semibold text-green-500">
                {t('dashboard.completedToday')}
              </div>
            </div>
          ) : habit.habit_type === "numeric_counter" && targetValue ? (
            <div className="flex flex-col items-center w-full">
              <div className="habit-metric-number text-4xl mb-2">
                {currentValue} / {targetValue}
              </div>
              <div className="w-full mt-3">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-purple-500 transition-all duration-500 habit-progress-glow"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground text-center mt-2">
                  {Math.round(progress)}% {t('dashboard.completed')}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              {t('dashboard.pending')}
            </div>
          )}
        </div>

        {/* Streak */}
        {currentStreak > 0 && (
          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20">
            <Flame className="h-5 w-5 text-orange-500" />
            <div>
              <div className="text-lg font-bold text-orange-400">
                {t('streakDays', { count: currentStreak })}
              </div>
              <div className="text-xs text-muted-foreground">{t('dashboard.streak')}</div>
            </div>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
            <div className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              <span>{t('dashboard.total')}: {stats.total || 0}</span>
            </div>
            {stats.average && (
              <span>{t('dashboard.average')}: {stats.average.toFixed(1)}</span>
            )}
          </div>
        )}

        {/* Recent Measurements + Sparkline */}
        {habit.habit_type === "numeric_counter" && measurements && measurements.length > 1 && (
          <div className="pt-3 space-y-3">
            <div className="text-xs text-muted-foreground">{t('dashboard.trend')}</div>
            <HabitSparkline 
              data={measurements.slice(0, 7).reverse().map(m => m.value)}
              width={200}
              height={30}
              color={neonColor}
            />
            <HabitHistory 
              measurements={measurements.slice(0, 3)}
              type="measurements"
              maxItems={3}
            />
          </div>
        )}
      </div>
    </Card>
  );
}
