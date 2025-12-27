import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const GOAL_TYPE_KEYS = ['strength', 'cardio', 'endurance', 'body_composition', 'flexibility'] as const;
const UNIT_KEYS = ['kg', 'reps', 'percent', 'sec', 'min', 'km'] as const;

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
  const { t } = useTranslation('trainer');
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

      toast.success(t('goalEdit.success'));
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating goal:', error);
      toast.error(t('goalEdit.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('goalEdit.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>{t('goalEdit.nameLabel')}</Label>
            <Input
              value={formData.goal_name}
              onChange={(e) => setFormData(prev => ({ ...prev, goal_name: e.target.value }))}
              required
            />
          </div>

          <div>
            <Label>{t('goalEdit.typeLabel')}</Label>
            <Select
              value={formData.goal_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, goal_type: value }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TYPE_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>{t(`goalTypes.${key}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>{t('goalEdit.targetLabel')}</Label>
              <Input
                type="number"
                step="0.1"
                value={formData.target_value}
                onChange={(e) => setFormData(prev => ({ ...prev, target_value: parseFloat(e.target.value) }))}
                required
              />
            </div>

            <div>
              <Label>{t('goalEdit.unitLabel')}</Label>
              <Select
                value={formData.target_unit}
                onValueChange={(value) => setFormData(prev => ({ ...prev, target_unit: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {UNIT_KEYS.map((key) => (
                    <SelectItem key={key} value={t(`units.${key}`)}>{t(`units.${key}`)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('goalEdit.cancel')}
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('goalEdit.save')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
