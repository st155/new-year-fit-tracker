import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

interface GoalTemplate {
  name: string;
  type: string;
  value: number;
  unit: string;
}

const goalTemplates: GoalTemplate[] = [
  { name: "Гребля 2 км", type: "endurance", value: 8.5, unit: "мин" },
  { name: "Бег 1 км", type: "endurance", value: 4.0, unit: "мин" },
  { name: "Подтягивания", type: "strength", value: 17, unit: "раз" },
  { name: "Жим лёжа", type: "strength", value: 90, unit: "кг" },
  { name: "Выпады назад со штангой", type: "strength", value: 50, unit: "кг ×8" },
  { name: "Планка", type: "endurance", value: 4, unit: "мин" },
  { name: "Отжимания", type: "strength", value: 60, unit: "раз" },
  { name: "Подъём ног в висе до перекладины", type: "strength", value: 17, unit: "раз" },
  { name: "VO2max", type: "cardio", value: 52, unit: "мл/кг/мин" },
  { name: "Процент жира", type: "body_composition", value: 11, unit: "%" }
];

const goalTypeLabels: Record<string, string> = {
  strength: 'Сила',
  cardio: 'Кардио',
  endurance: 'Выносливость',
  body_composition: 'Состав тела',
  flexibility: 'Гибкость'
};

interface GoalCreateDialogProps {
  onGoalCreated: () => void;
}

export function GoalCreateDialog({ onGoalCreated }: GoalCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [customGoal, setCustomGoal] = useState({
    name: "",
    type: "",
    value: 0,
    unit: ""
  });
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleTemplateSelect = (templateName: string) => {
    const template = goalTemplates.find(t => t.name === templateName);
    if (template) {
      setCustomGoal({
        name: template.name,
        type: template.type,
        value: template.value,
        unit: template.unit
      });
      setSelectedTemplate(templateName);
    }
  };

  const handleCreate = async () => {
    if (!user || !customGoal.name.trim()) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user.id,
          goal_name: customGoal.name,
          goal_type: customGoal.type,
          target_value: customGoal.value,
          target_unit: customGoal.unit,
          is_personal: true
        });

      if (error) throw error;

      toast({
        title: "Успех",
        description: "Цель создана"
      });
      setOpen(false);
      setSelectedTemplate("");
      setCustomGoal({ name: "", type: "", value: 0, unit: "" });
      onGoalCreated();
    } catch (error: any) {
      console.error('Error creating goal:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать цель",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="fitness" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Добавить
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Создать цель</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Выберите шаблон или создайте свою цель</Label>
            <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите готовую цель" />
              </SelectTrigger>
              <SelectContent>
                {goalTemplates.map((template) => (
                  <SelectItem key={template.name} value={template.name}>
                    {template.name} - {template.value} {template.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="goal_name">Название цели</Label>
            <Input
              id="goal_name"
              value={customGoal.name}
              onChange={(e) => setCustomGoal({ ...customGoal, name: e.target.value })}
              placeholder="Введите название цели"
            />
          </div>

          <div>
            <Label htmlFor="goal_type">Тип цели</Label>
            <Select
              value={customGoal.type}
              onValueChange={(value) => setCustomGoal({ ...customGoal, type: value })}
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
            <div>
              <Label htmlFor="target_value">Целевое значение</Label>
              <Input
                id="target_value"
                type="number"
                step="0.1"
                value={customGoal.value || ""}
                onChange={(e) => setCustomGoal({ ...customGoal, value: parseFloat(e.target.value) || 0 })}
              />
            </div>
            <div>
              <Label htmlFor="target_unit">Единица</Label>
              <Input
                id="target_unit"
                value={customGoal.unit}
                onChange={(e) => setCustomGoal({ ...customGoal, unit: e.target.value })}
                placeholder="кг, раз, мин"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            <Button onClick={handleCreate} disabled={loading || !customGoal.name.trim()} className="flex-1">
              {loading ? 'Создание...' : 'Создать'}
            </Button>
            <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Отмена
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}