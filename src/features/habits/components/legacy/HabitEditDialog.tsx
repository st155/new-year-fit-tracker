import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

interface HabitEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  habit: any;
  onSuccess?: () => void;
}

export function HabitEditDialog({ 
  open, 
  onOpenChange, 
  habit,
  onSuccess 
}: HabitEditDialogProps) {
  const { t } = useTranslation('habits');
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [targetValue, setTargetValue] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (habit) {
      setName(habit.name || "");
      setDescription(habit.description || "");
      setTargetValue(habit.target_value?.toString() || "");
    }
  }, [habit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("habits")
        .update({
          name,
          description,
          target_value: targetValue ? parseFloat(targetValue) : null,
        })
        .eq("id", habit.id);

      if (error) throw error;

      toast.success(t('edit.success'));
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating habit:", error);
      toast.error(t('edit.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20">
        <DialogHeader>
          <DialogTitle>{t('edit.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t('edit.nameLabel')}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('edit.namePlaceholder')}
              required
              className="glass-card border-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">{t('edit.descLabel')}</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('edit.descPlaceholder')}
              className="glass-card border-white/20 min-h-[80px]"
            />
          </div>

          {(habit?.habit_type === 'numeric_counter' || habit?.habit_type === 'daily_measurement') && (
            <div className="space-y-2">
              <Label htmlFor="target">{t('edit.targetLabel')}</Label>
              <Input
                id="target"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder={t('edit.targetPlaceholder')}
                className="glass-card border-white/20"
              />
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="glass-card border-white/20"
            >
              {t('edit.cancel')}
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-primary to-primary-end"
            >
              {isSubmitting ? t('edit.saving') : t('edit.save')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
