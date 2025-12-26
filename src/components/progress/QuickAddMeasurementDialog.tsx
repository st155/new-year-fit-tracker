import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ResponsiveDialog } from '@/components/ui/responsive-dialog';
import { CalendarIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn, formatTimeDisplay, isTimeUnit } from '@/lib/utils';
import { ChallengeGoal } from '@/features/goals/types';

interface QuickAddMeasurementDialogProps {
  goal: ChallengeGoal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QuickAddMeasurementDialog({
  goal,
  open,
  onOpenChange,
  onSuccess,
}: QuickAddMeasurementDialogProps) {
  const { user } = useAuth();
  const [value, setValue] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isTimeGoal = isTimeUnit(goal.target_unit) ||
    goal.goal_name.toLowerCase().includes('время') ||
    goal.goal_name.toLowerCase().includes('бег');

  const handleSubmit = async () => {
    if (!user?.id) {
      toast.error('Необходимо авторизоваться');
      return;
    }

    const numValue = parseFloat(value);
    if (isNaN(numValue) || numValue <= 0) {
      toast.error('Введите корректное значение');
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('measurements')
        .insert({
          goal_id: goal.id,
          user_id: user.id,
          value: numValue,
          measurement_date: format(date, 'yyyy-MM-dd'),
          unit: goal.target_unit || '',
          source: 'manual',
        });

      if (error) throw error;

      toast.success('Измерение добавлено');
      setValue('');
      setDate(new Date());
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error adding measurement:', error);
      toast.error('Не удалось добавить измерение');
    } finally {
      setIsSubmitting(false);
    }
  };

  const numValue = parseFloat(value);
  const hasValidValue = !isNaN(numValue) && numValue > 0;
  const difference = hasValidValue ? numValue - goal.current_value : 0;

  const getTrendIcon = () => {
    if (!hasValidValue || Math.abs(difference) < 0.01) {
      return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
    return difference > 0 
      ? <TrendingUp className="h-4 w-4 text-success" />
      : <TrendingDown className="h-4 w-4 text-destructive" />;
  };

  return (
    <ResponsiveDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Добавить измерение"
      description={`${goal.goal_name} • Цель: ${isTimeGoal ? formatTimeDisplay(goal.target_value) : goal.target_value?.toFixed(1)} ${goal.target_unit}`}
    >
      <div className="space-y-4 p-4 pt-0">
        {/* Value Input */}
        <div className="space-y-2">
          <Label htmlFor="value">
            Значение ({goal.target_unit})
          </Label>
          <Input
            id="value"
            type="number"
            step="0.1"
            placeholder={isTimeGoal ? "Например: 120 (секунды)" : "Например: 5.0"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
        </div>

        {/* Date Picker */}
        <div className="space-y-2">
          <Label>Дата измерения</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {format(date, 'd MMMM yyyy', { locale: ru })}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(d) => d && setDate(d)}
                disabled={(date) => date > new Date()}
                locale={ru}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Progress Preview */}
        {hasValidValue && (
          <div className="rounded-lg border bg-muted/50 p-3">
            <div className="flex items-center gap-2 text-sm">
              {getTrendIcon()}
              <span className="text-muted-foreground">
                {isTimeGoal 
                  ? formatTimeDisplay(goal.current_value)
                  : goal.current_value.toFixed(1)
                }
              </span>
              <span className="text-muted-foreground">→</span>
              <span className="font-medium">
                {isTimeGoal 
                  ? formatTimeDisplay(numValue)
                  : numValue.toFixed(1)
                }
              </span>
              {Math.abs(difference) >= 0.01 && (
                <span className={cn(
                  "text-xs",
                  difference > 0 ? "text-success" : "text-destructive"
                )}>
                  ({difference > 0 ? '+' : ''}{isTimeGoal 
                    ? formatTimeDisplay(difference)
                    : difference.toFixed(1)
                  })
                </span>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            Отмена
          </Button>
          <Button
            className="flex-1"
            onClick={handleSubmit}
            disabled={isSubmitting || !hasValidValue}
          >
            {isSubmitting ? 'Сохранение...' : 'Добавить'}
          </Button>
        </div>
      </div>
    </ResponsiveDialog>
  );
}
