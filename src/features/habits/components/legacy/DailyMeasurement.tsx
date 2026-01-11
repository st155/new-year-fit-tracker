import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, TrendingUp, TrendingDown } from "lucide-react";
import { useHabitMeasurements } from "@/hooks/useHabitMeasurements";
import { 
  getHabitSentiment, 
  getHabitIcon,
  getHabitCardClass,
  getNeonCircleClass 
} from "@/lib/habit-utils";
import { HabitHistory } from "./HabitHistory";
import { HabitSparkline } from "./HabitSparkline";
import { useTranslation } from "react-i18next";

interface DailyMeasurementProps {
  habit: any;
  userId?: string;
}

export function DailyMeasurement({ habit, userId }: DailyMeasurementProps) {
  const { t } = useTranslation('habits');
  const [value, setValue] = useState("");
  const { measurements, stats, addMeasurement, isAdding } = useHabitMeasurements(habit.id, userId);

  const today = new Date().toISOString().split('T')[0];
  const todayMeasurement = measurements?.find(m => m.measurement_date === today);
  const yesterdayMeasurement = measurements?.[1];

  const handleSubmit = () => {
    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) return;

    addMeasurement({ value: numValue });
    setValue("");
  };

  const targetValue = habit.target_value || 0;
  const currentValue = todayMeasurement?.value || 0;
  const progress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;
  const sentiment = getHabitSentiment(habit);
  const IconComponent = getHabitIcon(habit);
  const cardClass = getHabitCardClass(sentiment);
  const circleClass = getNeonCircleClass(sentiment);

  // Calculate trend
  const trend = yesterdayMeasurement && todayMeasurement
    ? todayMeasurement.value - yesterdayMeasurement.value
    : 0;

  // Last 7 days average
  const last7Days = measurements?.slice(0, 7) || [];
  const weekAverage = last7Days.length > 0
    ? last7Days.reduce((sum, m) => sum + m.value, 0) / last7Days.length
    : 0;

  return (
    <div className={`glass-habit-card ${cardClass} p-6 group relative overflow-hidden space-y-4`}>

      {/* Hero Circle with Value */}
      <div className="flex justify-center mb-6">
        <div className={`neon-circle ${circleClass} w-48 h-48 rotate-slow`}>
          <div className="text-center">
            <div className={`text-5xl font-bold text-glow text-${sentiment === 'positive' ? 'habit-positive' : 'habit-neutral'}`}>
              {currentValue || 0}
            </div>
            {targetValue > 0 && (
              <div className="text-sm text-muted-foreground mt-1">/ {targetValue}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {habit.measurement_unit || "units"}
            </div>
          </div>
        </div>
      </div>

      {/* Habit Title */}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-2 mb-1">
          <IconComponent className="h-6 w-6 text-muted-foreground" />
          <h3 className={`text-2xl font-bold text-glow text-${sentiment === 'positive' ? 'habit-positive' : 'habit-neutral'}`}>
            {habit.name}
          </h3>
        </div>
        <p className="text-xs text-muted-foreground">Today's measurement</p>
      </div>

      {/* Progress Bar */}
      {targetValue > 0 && (
        <div className="mb-6 space-y-2">
          <div className="relative h-3 rounded-full bg-white/10 overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${
                sentiment === 'positive' ? 'from-habit-positive to-success' : 'from-habit-neutral to-primary'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-xs text-center text-muted-foreground">
            {progress.toFixed(0)}% of goal
          </div>
        </div>
      )}

      {/* Input Section */}
      {!todayMeasurement ? (
        <div className="flex gap-2 mb-4">
          <Input
            type="number"
            placeholder="Enter value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="glass-strong"
          />
          <Button 
            onClick={handleSubmit} 
            disabled={isAdding || !value}
            className={`glass-strong border-${sentiment === 'positive' ? 'habit-positive' : 'habit-neutral'}/50`}
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="p-3 rounded-lg bg-gradient-to-r from-success/20 to-success/10 border border-success/30 text-center mb-4 animate-in fade-in">
          <div className="text-sm font-medium text-success">✓ Today's measurement recorded!</div>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/10">
        {trend !== 0 && (
          <div className="stat-glass-card p-3 border-t-transparent">
            <div className="flex items-center gap-2">
              {trend > 0 ? (
                <TrendingUp className="h-4 w-4 text-habit-positive" />
              ) : (
                <TrendingDown className="h-4 w-4 text-habit-negative" />
              )}
              <div>
                <div className="text-xs text-muted-foreground">vs Yesterday</div>
                <div className={`font-bold ${trend > 0 ? 'text-habit-positive' : 'text-habit-negative'}`}>
                  {trend > 0 ? '+' : ''}{trend.toFixed(1)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="stat-glass-card p-3 border-t-transparent">
          <div className="text-xs text-muted-foreground">7-day Avg</div>
          <div className="font-bold text-foreground">
            {weekAverage.toFixed(1)} {habit.measurement_unit || ""}
          </div>
        </div>
      </div>

      {/* Sparkline */}
      {measurements && measurements.length > 1 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{t('history.weekTrend')}</div>
          <HabitSparkline 
            data={measurements.slice(0, 7).reverse().map(m => m.value)}
            width={250}
            height={40}
            color={`hsl(var(--habit-${sentiment === 'positive' ? 'positive' : 'neutral'}))`}
          />
        </div>
      )}

      {/* Recent History */}
      {measurements && measurements.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{t('history.recentMeasurements')}</div>
          <HabitHistory 
            measurements={measurements}
            type="measurements"
            maxItems={5}
          />
        </div>
      )}
    </div>
  );
}
