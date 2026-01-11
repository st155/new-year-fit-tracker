import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Plus, Minus, Target } from "lucide-react";
import { useHabitMeasurements } from "@/hooks/useHabitMeasurements";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

interface NumericCounterInlineWidgetProps {
  habit: any;
  compact?: boolean;
}

export function NumericCounterInlineWidget({ habit, compact }: NumericCounterInlineWidgetProps) {
  const { t } = useTranslation('habits');
  const [customValue, setCustomValue] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);
  const { measurements, addMeasurement, isAdding } = useHabitMeasurements(habit.id, habit.user_id);

  const today = new Date().toISOString().split('T')[0];
  const todayMeasurement = measurements?.find(m => m.measurement_date === today);
  const currentValue = todayMeasurement?.value || 0;

  const targetValue = habit.target_value || 0;
  const progress = targetValue > 0 ? Math.min((currentValue / targetValue) * 100, 100) : 0;

  const handleIncrement = (amount: number) => {
    const newValue = currentValue + amount;
    addMeasurement({ value: newValue });
  };

  const handleDecrement = (amount: number) => {
    if (currentValue > 0) {
      const newValue = Math.max(0, currentValue - amount);
      addMeasurement({ value: newValue });
    }
  };

  const handleCustomSubmit = () => {
    const value = parseInt(customValue);
    if (!isNaN(value) && value > 0) {
      addMeasurement({ value: currentValue + value });
      setCustomValue("");
      setShowCustomInput(false);
    }
  };

  return (
    <div className="p-3 space-y-3 bg-gradient-to-br from-purple-500/5 to-pink-500/5 rounded-lg border border-purple-500/20">
      {/* Current value display */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 border border-purple-500/30">
            <div className="text-2xl font-bold text-purple-500">{currentValue}</div>
            {targetValue > 0 && (
              <div className="text-[10px] text-muted-foreground">/{targetValue}</div>
            )}
          </div>
          <div className="space-y-0.5">
            <div className="text-sm font-medium">{habit.measurement_unit || t('numericWidget.units')}</div>
            {targetValue > 0 && (
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                {t('numericWidget.percentOfGoal', { percent: progress.toFixed(0) })}
              </div>
            )}
          </div>
        </div>

        {currentValue >= targetValue && targetValue > 0 && (
          <Badge variant="secondary" className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30 animate-pulse-slow">
            {t('numericWidget.goalAchieved')}
          </Badge>
        )}
      </div>

      {/* Progress bar */}
      {targetValue > 0 && (
        <div className="space-y-1">
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {/* Quick action buttons */}
      {!showCustomInput ? (
        <div className="grid grid-cols-4 gap-2">
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => handleDecrement(1)}
            disabled={isAdding || currentValue === 0}
            className="h-9"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <Button 
            size="sm" 
            variant="default"
            onClick={() => handleIncrement(1)}
            disabled={isAdding}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            +1
          </Button>
          <Button 
            size="sm" 
            variant="default"
            onClick={() => handleIncrement(5)}
            disabled={isAdding}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
          >
            +5
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => setShowCustomInput(true)}
            disabled={isAdding}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2">
          <Input
            type="number"
            placeholder={t('numericWidget.valuePlaceholder')}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCustomSubmit()}
            className="h-9"
            autoFocus
          />
          <Button 
            size="sm" 
            variant="default"
            onClick={handleCustomSubmit}
            disabled={isAdding || !customValue}
            className="bg-gradient-to-r from-purple-500 to-pink-500"
          >
            ✓
          </Button>
          <Button 
            size="sm" 
            variant="outline"
            onClick={() => {
              setShowCustomInput(false);
              setCustomValue("");
            }}
          >
            ✕
          </Button>
        </div>
      )}
    </div>
  );
}
