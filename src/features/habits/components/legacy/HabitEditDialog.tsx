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

      toast.success("Привычка обновлена");
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error("Error updating habit:", error);
      toast.error("Ошибка при обновлении привычки");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-strong border-white/20">
        <DialogHeader>
          <DialogTitle>Редактировать привычку</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Название привычки"
              required
              className="glass-card border-white/20"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Описание привычки"
              className="glass-card border-white/20 min-h-[80px]"
            />
          </div>

          {(habit?.habit_type === 'numeric_counter' || habit?.habit_type === 'daily_measurement') && (
            <div className="space-y-2">
              <Label htmlFor="target">Целевое значение</Label>
              <Input
                id="target"
                type="number"
                value={targetValue}
                onChange={(e) => setTargetValue(e.target.value)}
                placeholder="Цель"
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
              Отмена
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-gradient-to-r from-primary to-primary-end"
            >
              {isSubmitting ? "Сохранение..." : "Сохранить"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
