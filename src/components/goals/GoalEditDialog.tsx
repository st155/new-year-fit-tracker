import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  is_personal: boolean;
  challenge_id?: string;
}

interface GoalEditDialogProps {
  goal: Goal | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: () => void;
}

export function GoalEditDialog({ goal, open, onOpenChange, onSave }: GoalEditDialogProps) {
  const [formData, setFormData] = useState<Partial<Goal>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (goal) {
      setFormData(goal);
    }
  }, [goal]);

  const goalTypeLabels: Record<string, string> = {
    strength: 'Сила',
    cardio: 'Кардио',
    endurance: 'Выносливость',
    body_composition: 'Состав тела',
    flexibility: 'Гибкость'
  };

  const handleSave = async () => {
    if (!goal || !formData.goal_name?.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('goals')
        .update({
          goal_name: formData.goal_name,
          goal_type: formData.goal_type,
          target_value: formData.target_value,
          target_unit: formData.target_unit
        })
        .eq('id', goal.id);

      if (error) throw error;

      toast.success('Цель обновлена');
      onOpenChange(false);
      onSave();
    } catch (error: any) {
      console.error('Error updating goal:', error);
      toast.error('Ошибка обновления цели');
    } finally {
      setLoading(false);
    }
  };

  if (!goal) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать цель</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="goal_name">Название цели</Label>
            <Input
              id="goal_name"
              value={formData.goal_name || ''}
              onChange={(e) => setFormData({ ...formData, goal_name: e.target.value })}
              placeholder="Например: Жим лёжа"
            />
          </div>

          <div>
            <Label htmlFor="goal_type">Тип цели</Label>
            <Select
              value={formData.goal_type || ''}
              onValueChange={(value) => setFormData({ ...formData, goal_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(goalTypeLabels).map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="target_value">Целевое значение</Label>
              <Input
                id="target_value"
                type="number"
                value={formData.target_value || 0}
                onChange={(e) => setFormData({ ...formData, target_value: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="target_unit">Единица измерения</Label>
              <Input
                id="target_unit"
                value={formData.target_unit || ''}
                onChange={(e) => setFormData({ ...formData, target_unit: e.target.value })}
                placeholder="кг, раз, мин"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleSave} disabled={loading} className="flex-1">
              {loading ? 'Сохранение...' : 'Сохранить'}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}