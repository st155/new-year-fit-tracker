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
import { Camera, Calendar, ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
  const [showOptional, setShowOptional] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

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
      
      console.log('Adding measurement:', {
        goal_id: goal.id,
        goal_name: goal.goal_name,
        value: parsedValue,
        unit: goal.target_unit,
        measurement_date: form.measurement_date,
        user_id: user!.id
      });
      
      const { data, error } = await supabase
        .from('measurements')
        .insert({
          user_id: user!.id,
          goal_id: goal.id,
          value: parsedValue,
          unit: goal.target_unit,
          measurement_date: form.measurement_date,
          notes: form.notes.trim() || null,
          photo_url: form.photo_url || null
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Measurement added successfully:', data);

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
      
      // Обновляем данные и закрываем диалог
      onMeasurementAdded();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error adding measurement:', error);
      toast({
        title: "Ошибка при добавлении",
        description: error?.message || "Не удалось добавить измерение. Попробуйте еще раз.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getValuePlaceholder = () => {
    const isTimeGoal = goal.target_unit.includes('мин') || 
                      goal.goal_name.toLowerCase().includes('время') ||
                      goal.goal_name.toLowerCase().includes('бег') ||
                      goal.goal_name.toLowerCase().includes('км');
    
    if (isTimeGoal) {
      return "Например: 4.40 (4 мин 40 сек)";
    }
    
    return `Введите значение в ${goal.target_unit}`;
  };

  const isNumericGoal = () => {
    return goal.target_unit.toLowerCase().includes('reps') || 
           goal.target_unit.toLowerCase().includes('раз') ||
           goal.target_unit.toLowerCase().includes('повтор');
  };

  const isWeightGoal = () => {
    return goal.target_unit.toLowerCase().includes('kg') || 
           goal.target_unit.toLowerCase().includes('кг') ||
           goal.goal_name.toLowerCase().includes('вес');
  };

  const adjustValue = (increment: number) => {
    const currentValue = parseFloat(form.value) || 0;
    const newValue = Math.max(0, currentValue + increment);
    setForm(prev => ({ ...prev, value: newValue.toString() }));
  };

  const formatDate = () => {
    const today = new Date().toISOString().split('T')[0];
    if (form.measurement_date === today) {
      return "Сегодня";
    }
    return new Date(form.measurement_date).toLocaleDateString('ru-RU', { 
      day: 'numeric', 
      month: 'short' 
    });
  };

  return (
    <ResponsiveDialog 
      open={isOpen} 
      onOpenChange={onOpenChange}
      title={goal.goal_name}
      snapPoints={[55, 80]}
      className="max-w-[95vw] sm:max-w-md"
    >
        
        <div className="space-y-3 pt-1 pb-2 overflow-y-auto max-h-[65vh]">
          {/* Goal Info */}
          <div className="text-sm text-muted-foreground">
            🎯 Цель: {goal.target_value} {goal.target_unit}
          </div>

          {/* Result Input */}
          <div>
            <Label htmlFor="quick-value" className="text-sm">
              Результат
            </Label>
            <Input
              id="quick-value"
              type="text"
              placeholder={getValuePlaceholder()}
              value={form.value}
              onChange={(e) => setForm(prev => ({ ...prev, value: e.target.value }))}
              className="text-2xl h-14 font-semibold"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              {goal.target_unit}
              {(goal.target_unit.includes('мин') || goal.goal_name.toLowerCase().includes('время')) && 
                " • Формат: ММ.СС (например: 4.40 = 4 мин 40 сек)"}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            {isNumericGoal() && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustValue(1)}
                  className="h-8"
                >
                  +1
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustValue(5)}
                  className="h-8"
                >
                  +5
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustValue(10)}
                  className="h-8"
                >
                  +10
                </Button>
              </>
            )}
            
            {isWeightGoal() && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustValue(-0.5)}
                  className="h-8"
                >
                  -0.5
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustValue(0.5)}
                  className="h-8"
                >
                  +0.5
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => adjustValue(1)}
                  className="h-8"
                >
                  +1.0
                </Button>
              </>
            )}

            {/* Date Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="h-8 ml-auto"
            >
              <Calendar className="h-3 w-3 mr-1" />
              {formatDate()}
            </Button>
          </div>

          {/* Date Picker (conditional) */}
          {showDatePicker && (
            <div>
              <Input
                type="date"
                value={form.measurement_date}
                onChange={(e) => setForm(prev => ({ ...prev, measurement_date: e.target.value }))}
                className="h-9"
              />
            </div>
          )}

          {/* Optional Fields - Collapsible */}
          <Collapsible open={showOptional} onOpenChange={setShowOptional}>
            <CollapsibleTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start text-sm h-9"
              >
                <ChevronDown className={`h-4 w-4 mr-2 transition-transform ${showOptional ? 'rotate-180' : ''}`} />
                {showOptional ? 'Скрыть' : 'Добавить'} заметку или фото
              </Button>
            </CollapsibleTrigger>
            
            <CollapsibleContent className="space-y-3 pt-2">
              <div>
                <Label htmlFor="quick-notes" className="text-sm">Заметки</Label>
                <Textarea
                  id="quick-notes"
                  placeholder="Добавьте заметки о тренировке..."
                  value={form.notes}
                  onChange={(e) => setForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="text-sm"
                />
              </div>

              <div>
                <Label className="flex items-center gap-2 mb-2 text-sm">
                  <Camera className="h-3 w-3" />
                  Фото прогресса
                </Label>
                <PhotoUpload
                  onPhotoUploaded={(url) => setForm(prev => ({ ...prev, photo_url: url }))}
                  existingPhotoUrl={form.photo_url}
                  label="Добавить фото"
                />
              </div>
            </CollapsibleContent>
          </Collapsible>
        </div>

        <div className="flex gap-2 pt-2 pb-2 border-t bg-background sticky bottom-0">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="text-sm"
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