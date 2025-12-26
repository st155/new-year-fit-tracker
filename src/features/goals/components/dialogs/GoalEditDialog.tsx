import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useGoalMutations } from "../../hooks";

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number | null;
  target_unit: string;
  is_personal: boolean;
  challenge_id?: string | null;
}

interface GoalEditDialogProps {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

const goalTypeLabels: Record<string, string> = {
  strength: 'Сила',
  cardio: 'Кардио',
  endurance: 'Выносливость',
  body_composition: 'Состав тела',
  flexibility: 'Гибкость'
};

export function GoalEditDialog({ goal, open, onOpenChange, onSave }: GoalEditDialogProps) {
  const [formData, setFormData] = useState({
    goal_name: '',
    goal_type: '',
    target_value: '',
    target_unit: ''
  });

  const { updateGoal } = useGoalMutations();

  useEffect(() => {
    if (goal) {
      setFormData({
        goal_name: goal.goal_name,
        goal_type: goal.goal_type,
        target_value: goal.target_value?.toString() || '',
        target_unit: goal.target_unit
      });
    }
  }, [goal]);

  const handleSave = () => {
    if (!goal) return;

    updateGoal.mutate({
      id: goal.id,
      goal_name: formData.goal_name,
      goal_type: formData.goal_type,
      target_value: formData.target_value ? parseFloat(formData.target_value) : null,
      target_unit: formData.target_unit
    }, {
      onSuccess: () => {
        onOpenChange(false);
        onSave();
      }
    });
  };

  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Редактировать цель</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal_name">Название цели</Label>
            <Input
              id="goal_name"
              value={formData.goal_name}
              onChange={(e) => setFormData(prev => ({ ...prev, goal_name: e.target.value }))}
              placeholder="Введите название"
            />
          </div>

          <div className="space-y-2">
            <Label>Тип цели</Label>
            <Select
              value={formData.goal_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, goal_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Выберите тип" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(goalTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_value">Целевое значение</Label>
              <Input
                id="target_value"
                type="number"
                step="0.1"
                value={formData.target_value}
                onChange={(e) => setFormData(prev => ({ ...prev, target_value: e.target.value }))}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="target_unit">Единица</Label>
              <Input
                id="target_unit"
                value={formData.target_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, target_unit: e.target.value }))}
                placeholder="кг, раз, мин"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={updateGoal.isPending} 
              className="flex-1"
            >
              {updateGoal.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
            >
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
