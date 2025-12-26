import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useMeasurementMutations } from "../../hooks";
import { toast } from "sonner";

interface Goal {
  id: string;
  goal_name: string;
  target_value: number;
  target_unit: string;
}

interface QuickMeasurementBatchProps {
  goals: Goal[];
  userId: string;
  onComplete: () => void;
}

export function QuickMeasurementBatch({ goals, userId, onComplete }: QuickMeasurementBatchProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  const { createMeasurementsBatch } = useMeasurementMutations();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const measurementInputs = goals
      .filter(goal => values[goal.id] && values[goal.id].trim() !== '')
      .map(goal => ({
        user_id: userId,
        goal_id: goal.id,
        value: parseFloat(values[goal.id]),
        unit: goal.target_unit,
        measurement_date: new Date().toISOString().split('T')[0],
        source: 'manual' as const
      }));

    if (measurementInputs.length === 0) {
      toast.error("Введите хотя бы одно значение");
      return;
    }

    createMeasurementsBatch.mutate(measurementInputs, {
      onSuccess: () => {
        onComplete();
      }
    });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Добавить начальные измерения</h3>
          <p className="text-sm text-muted-foreground">
            Введите текущие значения для ваших целей
          </p>
        </div>
        <Button variant="ghost" size="icon" onClick={onComplete}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {goals.map(goal => (
          <div key={goal.id} className="flex items-center gap-3">
            <div className="flex-1">
              <Label htmlFor={`goal-${goal.id}`} className="text-sm">
                {goal.goal_name}
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id={`goal-${goal.id}`}
                  type="number"
                  step="any"
                  placeholder={`Текущее значение`}
                  value={values[goal.id] || ''}
                  onChange={(e) => setValues(prev => ({ ...prev, [goal.id]: e.target.value }))}
                  className="flex-1"
                />
                <span className="text-sm text-muted-foreground w-16">
                  {goal.target_unit}
                </span>
                <span className="text-xs text-muted-foreground/60 w-24">
                  Цель: {goal.target_value}
                </span>
              </div>
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-4">
          <Button type="button" variant="outline" onClick={onComplete}>
            Отмена
          </Button>
          <Button type="submit" disabled={createMeasurementsBatch.isPending}>
            <Save className="h-4 w-4 mr-2" />
            {createMeasurementsBatch.isPending ? "Сохранение..." : "Сохранить"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
