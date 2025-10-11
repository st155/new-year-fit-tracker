import { useState } from "react";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { Camera, Plus } from "lucide-react";

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
}

interface QuickMeasurementDialogProps {
  goal: Goal;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onMeasurementAdded: () => void;
}

export function QuickMeasurementDialog({ 
  goal, 
  isOpen, 
  onOpenChange, 
  onMeasurementAdded 
}: QuickMeasurementDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [form, setForm] = useState({
    value: '',
    notes: '',
    measurement_date: new Date().toISOString().split('T')[0],
    photo_url: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Функция для преобразования MM.SS в десятичные минуты для временных целей
  const parseTimeValue = (value: string): number => {
    if (!value) return 0;
    
    // Проверяем, является ли цель временной (содержит "время" или единицы времени)
    const isTimeGoal = goal.target_unit.includes('мин') || 
                      goal.goal_name.toLowerCase().includes('время') ||
                      goal.goal_name.toLowerCase().includes('бег') ||
                      goal.goal_name.toLowerCase().includes('км');
    
    if (isTimeGoal && value.includes('.')) {
      const parts = value.split('.');
      if (parts.length === 2 && parts[1].length <= 2) {
        const minutes = parseInt(parts[0]) || 0;
        const seconds = parseInt(parts[1]) || 0;
        return minutes + (seconds / 60);
      }
    }
    
    return parseFloat(value) || 0;
  };

  const addMeasurement = async () => {
    if (!form.value.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите значение измерения",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const parsedValue = parseTimeValue(form.value);
      
      const { error } = await supabase
        .from('measurements')
        .insert({
          user_id: user!.id,
          goal_id: goal.id,
          value: parsedValue,
          unit: goal.target_unit,
          measurement_date: form.measurement_date,
          notes: form.notes.trim() || null,
          photo_url: form.photo_url || null
        });

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: `Измерение для "${goal.goal_name}" добавлено`,
      });

      // Сбрасываем форму
      setForm({
        value: '',
        notes: '',
        measurement_date: new Date().toISOString().split('T')[0],
        photo_url: ''
      });
      
      onOpenChange(false);
      onMeasurementAdded();
    } catch (error) {
      console.error('Error adding measurement:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить измерение",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValuePlaceholder = () => {
    // Проверяем, является ли цель временной
    const isTimeGoal = goal.target_unit.includes('мин') || 
                      goal.goal_name.toLowerCase().includes('время') ||
                      goal.goal_name.toLowerCase().includes('бег') ||
                      goal.goal_name.toLowerCase().includes('км');
    
    if (isTimeGoal) {
      return "Например: 4.40 (4 мин 40 сек)";
    }
    
    return `Введите значение в ${goal.target_unit}`;
  };

  return (
    <ResponsiveDialog 
      open={isOpen} 
      onOpenChange={onOpenChange}
      title="Добавить измерение"
      description={`Быстрое добавление результата для цели: ${goal.goal_name}`}
      snapPoints={[85, 95]}
      className="max-w-[95vw] sm:max-w-md"
    >
        
        <div className="space-y-4 pt-2 pb-4 overflow-y-auto max-h-[60vh]">
          <div>
            <Label htmlFor="quick-value">
              Результат ({goal.target_unit})
            </Label>
            <Input
              id="quick-value"
              type="text"
              placeholder={getValuePlaceholder()}
              value={form.value}
              onChange={(e) => setForm(prev => ({ ...prev, value: e.target.value }))}
              className="text-lg"
              autoFocus
            />
            {(goal.target_unit.includes('мин') || goal.goal_name.toLowerCase().includes('время')) && (
              <p className="text-xs text-muted-foreground mt-1">
                💡 Для времени используйте формат ММ.СС (например: 4.40 = 4 мин 40 сек)
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="quick-date">Дата измерения</Label>
            <Input
              id="quick-date"
              type="date"
              value={form.measurement_date}
              onChange={(e) => setForm(prev => ({ ...prev, measurement_date: e.target.value }))}
            />
          </div>

          <div>
            <Label htmlFor="quick-notes">Заметки (опционально)</Label>
            <Textarea
              id="quick-notes"
              placeholder="Добавьте заметки о тренировке..."
              value={form.notes}
              onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
            />
          </div>

          <div>
            <Label className="flex items-center gap-2 mb-2">
              <Camera className="h-4 w-4" />
              Фото прогресса (опционально)
            </Label>
            <PhotoUpload
              onPhotoUploaded={(url) => setForm(prev => ({ ...prev, photo_url: url }))}
              existingPhotoUrl={form.photo_url}
              label="Добавить фото"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-2 pb-2 border-t bg-background sticky bottom-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
            disabled={isSubmitting}
          >
            Отмена
          </Button>
          <Button
            onClick={addMeasurement}
            className="flex-1 bg-gradient-primary hover:opacity-90"
            disabled={isSubmitting || !form.value.trim()}
          >
            {isSubmitting ? "Добавляю..." : "Добавить"}
          </Button>
        </div>
    </ResponsiveDialog>
  );
}