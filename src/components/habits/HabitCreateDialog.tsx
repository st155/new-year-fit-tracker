import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface HabitCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const categories = [
  { value: "fitness", label: "Фитнес" },
  { value: "nutrition", label: "Питание" },
  { value: "sleep", label: "Сон" },
  { value: "mindfulness", label: "Медитация" },
  { value: "custom", label: "Другое" },
];

const frequencies = [
  { value: "daily", label: "Ежедневно" },
  { value: "weekly", label: "Еженедельно" },
  { value: "custom", label: "Кастомное" },
];

export function HabitCreateDialog({ open, onOpenChange }: HabitCreateDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");
  const [frequency, setFrequency] = useState("daily");
  const [targetCount, setTargetCount] = useState(7);
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      toast.error("Введите название привычки");
      return;
    }

    setIsCreating(true);
    try {
      const { error } = await supabase.from("habits").insert({
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        category,
        frequency,
        target_count: targetCount,
        is_active: true,
      });

      if (error) throw error;

      toast.success("Привычка создана! 🎉");
      onOpenChange(false);
      
      // Reset form
      setName("");
      setDescription("");
      setCategory("custom");
      setFrequency("daily");
      setTargetCount(7);
    } catch (error) {
      console.error("Error creating habit:", error);
      toast.error("Ошибка при создании привычки");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Новая привычка</DialogTitle>
          <DialogDescription>
            Создайте привычку, которую хотите отслеживать
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Название*</Label>
            <Input
              id="name"
              placeholder="Например: Утренняя зарядка"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Описание</Label>
            <Textarea
              id="description"
              placeholder="Опишите вашу привычку..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Категория</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat) => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency">Частота</Label>
            <Select value={frequency} onValueChange={setFrequency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {frequencies.map((freq) => (
                  <SelectItem key={freq.value} value={freq.value}>
                    {freq.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {frequency === "weekly" && (
            <div className="space-y-2">
              <Label htmlFor="target">Цель (раз в неделю)</Label>
              <Input
                id="target"
                type="number"
                min={1}
                max={7}
                value={targetCount}
                onChange={(e) => setTargetCount(Number(e.target.value))}
              />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Отмена
          </Button>
          <Button onClick={handleCreate} disabled={isCreating || !name.trim()}>
            {isCreating ? "Создание..." : "Создать"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
