import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Info } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatMeasurement } from '@/lib/units';

interface Goal {
  id: string;
  goal_name: string;
  target_value: number;
  target_unit: string;
  current_value: number;
}

interface QuickMeasurementDialogProps {
  goal: Goal;
  clientId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function QuickMeasurementDialog({ 
  goal, 
  clientId, 
  open, 
  onOpenChange, 
  onSuccess 
}: QuickMeasurementDialogProps) {
  const [value, setValue] = useState<string>('');
  const [date, setDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    const numValue = parseFloat(value);
    
    if (isNaN(numValue) || numValue <= 0) {
      toast({
        title: 'Ошибка',
        description: 'Введите корректное значение',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('measurements')
        .insert({
          user_id: clientId,
          goal_id: goal.id,
          value: numValue,
          measurement_date: date.toISOString().split('T')[0],
          unit: goal.target_unit,
          source: 'trainer'
        });

      if (error) throw error;

      toast({
        title: 'Готово',
        description: `Измерение добавлено: ${formatMeasurement(numValue, goal.target_unit)}`
      });
      
      onSuccess();
      setValue('');
    } catch (error) {
      console.error('Error adding measurement:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось добавить измерение',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const predictedProgress = value ? parseFloat(value) : 0;
  const progressDiff = predictedProgress - (goal.current_value || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Добавить измерение</DialogTitle>
          <DialogDescription>
            {goal.goal_name} (цель: {formatMeasurement(goal.target_value, goal.target_unit)})
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="value">Значение ({goal.target_unit})</Label>
            <Input
              id="value"
              type="number"
              step="0.1"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={`Введите значение в ${goal.target_unit}`}
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Дата измерения</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-start text-left">
                  <Calendar className="mr-2 h-4 w-4" />
                  {format(date, 'PPP', { locale: ru })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <CalendarComponent
                  mode="single"
                  selected={date}
                  onSelect={(date) => date && setDate(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {value && goal.current_value > 0 && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Текущий прогресс: {formatMeasurement(goal.current_value, goal.target_unit)} → {formatMeasurement(predictedProgress, goal.target_unit)}
                {progressDiff > 0 && (
                  <span className="text-green-600 ml-2 font-semibold">
                    📈 +{progressDiff.toFixed(1)} {goal.target_unit}
                  </span>
                )}
                {progressDiff < 0 && (
                  <span className="text-red-600 ml-2 font-semibold">
                    📉 {progressDiff.toFixed(1)} {goal.target_unit}
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !value}>
            {loading ? 'Добавление...' : 'Добавить'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
