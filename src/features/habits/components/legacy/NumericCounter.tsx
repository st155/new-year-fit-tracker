import { Button } from "@/components/ui/button";
import { Plus, Minus } from "lucide-react";
import { useHabitMeasurements } from "@/hooks/useHabitMeasurements";
import { 
  getHabitSentiment, 
  getHabitIcon,
  getHabitCardClass,
  getNeonCircleClass 
} from "@/lib/habit-utils";
import { HabitSparkline } from "./HabitSparkline";
import { HabitHistory } from "./HabitHistory";
import { useTranslation } from "react-i18next";

interface NumericCounterProps {
  habit: any;
  userId?: string;
}

export function NumericCounter({ habit, userId }: NumericCounterProps) {
  const { t } = useTranslation('habits');
  const { stats, measurements, addMeasurement, isAdding } = useHabitMeasurements(habit.id, userId);

  const currentValue = stats?.total || 0;
  const targetValue = habit.target_value || 0;
  const progress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;
  const sentiment = getHabitSentiment(habit);
  const IconComponent = getHabitIcon(habit);
  const cardClass = getHabitCardClass(sentiment);
  const circleClass = getNeonCircleClass(sentiment);

  const handleIncrement = () => {
    addMeasurement({ value: 1 });
  };

  const handleDecrement = () => {
    if (currentValue > 0) {
      addMeasurement({ value: -1 });
    }
  };

  return (
    <div className={`glass-habit-card ${cardClass} p-6 group relative overflow-hidden space-y-4`}>

      {/* Hero Circle with Value */}
      <div className="flex justify-center mb-6">
        <div className={`neon-circle ${circleClass} w-48 h-48 rotate-slow`}>
          <div className="text-center">
            <div className={`text-5xl font-bold text-glow text-${sentiment === 'positive' ? 'habit-positive' : 'habit-neutral'}`}>
              {currentValue}
            </div>
            {targetValue > 0 && (
              <div className="text-sm text-muted-foreground mt-1">/ {targetValue}</div>
            )}
            <div className="text-xs text-muted-foreground mt-1">
              {habit.measurement_unit || "items"}
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
      </div>

      {/* Progress Ring */}
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
            {progress.toFixed(0)}% Complete
          </div>
        </div>
      )}

      {/* Control Buttons */}
      <div className="flex gap-2 mb-4">
        <Button
          variant="outline"
          className="flex-1 glass-strong border-white/20"
          onClick={handleDecrement}
          disabled={isAdding || currentValue === 0}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <Button
          className={`flex-1 glass-strong border-${sentiment === 'positive' ? 'habit-positive' : 'habit-neutral'}/50`}
          onClick={handleIncrement}
          disabled={isAdding}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add One
        </Button>
      </div>

      {/* Sparkline */}
      {measurements && measurements.length > 1 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{t('history.last7days')}</div>
          <HabitSparkline 
            data={measurements.slice(0, 7).reverse().map(m => m.value)}
            width={250}
            height={40}
            color={`hsl(var(--habit-${sentiment === 'positive' ? 'positive' : 'neutral'}))`}
          />
        </div>
      )}

      {/* Stats */}
      {stats && stats.count > 0 && (
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-2 glass-card rounded">
            <div className="text-xs text-muted-foreground">Total Entries</div>
            <div className="font-bold text-foreground">{stats.count}</div>
          </div>
          <div className="text-center p-2 glass-card rounded">
            <div className="text-xs text-muted-foreground">Avg per Entry</div>
            <div className="font-bold text-foreground">{stats.average.toFixed(1)}</div>
          </div>
        </div>
      )}

      {/* Recent History */}
      {measurements && measurements.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-muted-foreground">{t('history.recentEntries')}</div>
          <HabitHistory 
            measurements={measurements}
            type="measurements"
            maxItems={3}
          />
        </div>
      )}
    </div>
  );
}
