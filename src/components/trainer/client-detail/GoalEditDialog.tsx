import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
}

interface GoalEditDialogProps {
  goal: Goal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function GoalEditDialog({ goal, open, onOpenChange, onSuccess }: GoalEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    goal_name: goal.goal_name,
    target_value: goal.target_value,
    target_unit: goal.target_unit,
    goal_type: goal.goal_type,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('goals')
        .update({
          goal_name: formData.goal_name,
          target_value: formData.target_value,
          target_unit: formData.target_unit,
          goal_type: formData.goal_type,
          updated_at: new Date().toISOString(),
        })
        .eq('id', goal.id);

      if (error) throw error;

      toast.success('Цель обновлена');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating goal:', error);
      toast.error('Ошибка обновления цели');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Редактировать цель</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Название цели</Label>
            <Input
              value={formData.goal_name}
              onChange={(e) => setFormData(prev => ({ ...prev, goal_name: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label>Тип цели</Label>
            <Select
              value={formData.goal_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, goal_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="strength">Сила</SelectItem>
                <SelectItem value="cardio">Кардио</SelectItem>
                <SelectItem value="endurance">Выносливость</SelectItem>
                <SelectItem value="body_composition">Состав тела</SelectItem>
                <SelectItem value="flexibility">Гибкость</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Целевое значение</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.target_value}
                onChange={(e) => setFormData(prev => ({ ...prev, target_value: parseFloat(e.target.value) }))}
                required
              />
            </div>

            <div>
              <Label>Единица измерения</Label>
              <Select
                value={formData.target_unit}
                onValueChange={(value) => setFormData(prev => ({ ...prev, target_unit: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="кг">кг</SelectItem>
                  <SelectItem value="раз">раз</SelectItem>
                  <SelectItem value="%">%</SelectItem>
                  <SelectItem value="сек">сек</SelectItem>
                  <SelectItem value="мин">мин</SelectItem>
                  <SelectItem value="км">км</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Отмена
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
