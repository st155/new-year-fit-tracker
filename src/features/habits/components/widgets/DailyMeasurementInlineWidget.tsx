import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Check, TrendingUp, TrendingDown } from "lucide-react";
import { useHabitMeasurements } from "@/hooks/useHabitMeasurements";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from 'react-i18next';

interface DailyMeasurementInlineWidgetProps {
  habit: any;
  compact?: boolean;
}

export function DailyMeasurementInlineWidget({ habit, compact }: DailyMeasurementInlineWidgetProps) {
  const { t } = useTranslation('habits');
  const [value, setValue] = useState("");
  const { measurements, addMeasurement, isAdding } = useHabitMeasurements(habit.id, habit.user_id);

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

  const trend = yesterdayMeasurement && todayMeasurement
    ? todayMeasurement.value - yesterdayMeasurement.value
    : 0;

  return (
    <div className="p-3 space-y-3 bg-gradient-to-br from-cyan-500/5 to-blue-500/5 rounded-lg border border-cyan-500/20">
      {todayMeasurement ? (
        <>
          {/* Current value display */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-center justify-center w-16 h-16 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30">
                <div className="text-2xl font-bold text-cyan-500">{currentValue}</div>
                <div className="text-[10px] text-muted-foreground">{habit.measurement_unit || ""}</div>
              </div>
              <div className="space-y-0.5">
                <Badge variant="secondary" className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/30">
                  <Check className="h-3 w-3 mr-1" />
                  {t('measurement.recorded')}
                </Badge>
                {trend !== 0 && (
                  <div className={`text-xs flex items-center gap-1 ${trend > 0 ? 'text-green-500' : 'text-red-500'}`}>
                    {trend > 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                    {trend > 0 ? '+' : ''}{trend.toFixed(1)} {t('measurement.fromYesterday')}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Progress bar */}
          {targetValue > 0 && (
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <div className="text-xs text-center text-muted-foreground">
                {t('measurement.progressOfGoal', { percent: progress.toFixed(0), target: targetValue, unit: habit.measurement_unit || '' })}
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {/* Input section */}
          <div className="flex gap-2">
            <Input
              type="number"
              placeholder={t('measurement.enterValue', { unit: habit.measurement_unit || t('measurement.value') })}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              className="h-9"
              autoFocus
            />
            <Button 
              size="sm"
              onClick={handleSubmit} 
              disabled={isAdding || !value}
              className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 px-4"
            >
              <Check className="h-4 w-4" />
            </Button>
          </div>

          {/* Target hint */}
          {targetValue > 0 && (
            <div className="text-xs text-center text-muted-foreground">
              {t('measurement.targetHint', { target: targetValue, unit: habit.measurement_unit || '' })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
