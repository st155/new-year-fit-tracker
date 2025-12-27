import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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

const GOAL_TYPE_KEYS = ['strength', 'cardio', 'endurance', 'body_composition', 'flexibility'] as const;

export function GoalEditDialog({ goal, open, onOpenChange, onSave }: GoalEditDialogProps) {
  const { t } = useTranslation('goals');
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
          <DialogTitle>{t('edit.title')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="goal_name">{t('edit.nameLabel')}</Label>
            <Input
              id="goal_name"
              value={formData.goal_name}
              onChange={(e) => setFormData(prev => ({ ...prev, goal_name: e.target.value }))}
              placeholder={t('edit.namePlaceholder')}
            />
          </div>

          <div className="space-y-2">
            <Label>{t('edit.typeLabel')}</Label>
            <Select
              value={formData.goal_type}
              onValueChange={(value) => setFormData(prev => ({ ...prev, goal_type: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('edit.typePlaceholder')} />
              </SelectTrigger>
              <SelectContent>
                {GOAL_TYPE_KEYS.map((key) => (
                  <SelectItem key={key} value={key}>{t(`types.${key}`)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="target_value">{t('edit.targetLabel')}</Label>
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
              <Label htmlFor="target_unit">{t('edit.unitLabel')}</Label>
              <Input
                id="target_unit"
                value={formData.target_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, target_unit: e.target.value }))}
                placeholder={t('edit.unitPlaceholder')}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button 
              onClick={handleSave} 
              disabled={updateGoal.isPending} 
              className="flex-1"
            >
              {updateGoal.isPending ? t('edit.saving') : t('edit.save')}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)} 
              className="flex-1"
            >
              {t('edit.cancel')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
