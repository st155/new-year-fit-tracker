import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Target } from "lucide-react";

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  challenge_id?: string;
}

interface FirstMeasurementDialogProps {
  goals: Goal[];
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export function FirstMeasurementDialog({ goals, open, onClose, onComplete }: FirstMeasurementDialogProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [measurements, setMeasurements] = useState<Record<string, number>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const currentGoal = goals[currentIndex];
  const progress = ((currentIndex + 1) / goals.length) * 100;
  const completedCount = Object.keys(measurements).length;

  const handleNext = () => {
    const value = measurements[currentGoal.id];
    
    if (!value || value <= 0) {
      toast.error("Введите корректное значение");
      return;
    }

    if (currentIndex < goals.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSkip = () => {
    if (currentIndex < goals.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Insert all baseline measurements
      const baselinePromises = Object.entries(measurements).map(([goalId, value]) => {
        return supabase.from('goal_baselines').insert({
          goal_id: goalId,
          user_id: user.id,
          baseline_value: value,
          source: 'manual',
          recorded_at: new Date().toISOString()
        });
      });

      const results = await Promise.all(baselinePromises);
      const errors = results.filter(r => r.error);
      
      if (errors.length > 0) {
        throw new Error(errors[0].error.message);
      }

      toast.success(`✅ Сохранено ${completedCount} начальных измерений!`, {
        description: "Теперь вы можете отслеживать свой прогресс"
      });

      onComplete();
      onClose();
    } catch (error: any) {
      console.error('Error saving baselines:', error);
      toast.error("Ошибка сохранения", {
        description: error.message
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleValueChange = (value: string) => {
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0) {
      setMeasurements(prev => ({
        ...prev,
        [currentGoal.id]: numValue
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Начальные измерения
          </DialogTitle>
          <DialogDescription>
            Шаг {currentIndex + 1} из {goals.length}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Progress value={progress} className="h-2" />
          
          <div className="text-sm text-muted-foreground text-center">
            {completedCount} / {goals.length} измерений добавлено
          </div>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="baseline-value" className="text-base font-semibold">
                {currentGoal?.goal_name}
              </Label>
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Input
                    id="baseline-value"
                    type="number"
                    step="0.01"
                    placeholder="Введите текущее значение"
                    value={measurements[currentGoal?.id] || ''}
                    onChange={(e) => handleValueChange(e.target.value)}
                    className="text-lg"
                    autoFocus
                  />
                </div>
                <div className="text-muted-foreground font-medium min-w-[60px]">
                  {currentGoal?.target_unit}
                </div>
              </div>
            </div>

            {currentGoal?.target_value && (
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">Цель</div>
                <div className="text-lg font-semibold">
                  {currentGoal.target_value} {currentGoal.target_unit}
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isSubmitting}
              className="flex-1"
            >
              Пропустить
            </Button>
            <Button
              onClick={handleNext}
              disabled={isSubmitting || !measurements[currentGoal?.id]}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Сохранение...
                </>
              ) : currentIndex === goals.length - 1 ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Завершить
                </>
              ) : (
                'Далее'
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}