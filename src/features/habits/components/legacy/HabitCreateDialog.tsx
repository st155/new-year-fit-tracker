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
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { DEFAULT_HABIT_TEMPLATES } from "@/lib/habit-templates";
import { useGoals } from "@/hooks/useGoals";
import { useIsMobile } from "@/hooks/primitive";
import { cn } from "@/lib/utils";

interface HabitCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  linkedGoalId?: string;
  prefilledName?: string;
  onHabitCreated?: () => void;
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

const habitTypes = [
  { value: "daily_check", label: "Daily Check-in", description: "Simple daily completion", icon: "✅" },
  { value: "duration_counter", label: "Duration Counter", description: "Track time (e.g., quit smoking)", icon: "⏱️" },
  { value: "fasting_tracker", label: "Fasting Tracker", description: "Track intermittent fasting windows", icon: "⏰🍽️" },
  { value: "numeric_counter", label: "Numeric Counter", description: "Count items (e.g., books read)", icon: "🔢" },
  { value: "daily_measurement", label: "Daily Measurement", description: "Track daily values (e.g., pages read)", icon: "📊" },
];

export function HabitCreateDialog({ open, onOpenChange, linkedGoalId, prefilledName, onHabitCreated }: HabitCreateDialogProps) {
  const { user } = useAuth();
  const { personalGoals } = useGoals(user?.id);
  const isMobile = useIsMobile();
  
  const [name, setName] = useState(prefilledName || "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");
  const [frequency, setFrequency] = useState("daily");
  const [targetCount, setTargetCount] = useState(7);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | undefined>(linkedGoalId);
  
  // New fields for custom habits
  const [habitType, setHabitType] = useState("daily_check");
  const [targetValue, setTargetValue] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState("");
  const [costPerDay, setCostPerDay] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const applyTemplate = (templateId: string) => {
    const template = DEFAULT_HABIT_TEMPLATES.find(t => t.id === templateId);
    if (!template) return;

    setName(template.name);
    setHabitType(template.habit_type);
    setCategory(template.category);
    
    if (template.custom_settings?.cost_per_day) {
      setCostPerDay(template.custom_settings.cost_per_day.toString());
    }
    
    setSelectedTemplate(templateId);
  };

  const resetForm = () => {
    setName("");
    setDescription("");
    setCategory("custom");
    setFrequency("daily");
    setTargetCount(7);
    setHabitType("daily_check");
    setTargetValue("");
    setMeasurementUnit("");
    setCostPerDay("");
    setSelectedTemplate("");
  };

  const handleCreate = async () => {
    if (!user || !name.trim()) {
      toast.error("Введите название привычки");
      return;
    }

    setIsCreating(true);
    try {
      const customSettings: any = {};
      
      if (habitType === "duration_counter" && costPerDay) {
        customSettings.cost_per_day = parseFloat(costPerDay);
        customSettings.show_health_benefits = true;
      }

      // Get AI motivation from selected template
      const template = DEFAULT_HABIT_TEMPLATES.find(t => t.id === selectedTemplate);
      const aiMotivation = template?.ai_motivation || null;

      const habitData: any = {
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        category,
        frequency,
        target_count: targetCount,
        is_active: true,
        habit_type: habitType,
        custom_settings: Object.keys(customSettings).length > 0 ? customSettings : null,
        ai_motivation: aiMotivation,
        icon: template?.icon || null,
        color: template?.color || null,
        linked_goal_id: selectedGoalId || null,
      };

      // Add type-specific fields
      if (habitType === "duration_counter") {
        habitData.start_date = new Date().toISOString().split('T')[0];
      }
      
      if ((habitType === "numeric_counter" || habitType === "daily_measurement") && targetValue) {
        habitData.target_value = parseFloat(targetValue);
        habitData.measurement_unit = measurementUnit || null;
      }

      const { error: habitError, data: newHabit } = await supabase
        .from("habits")
        .insert(habitData)
        .select()
        .single();

      if (habitError) throw habitError;

      // For duration_counter, create initial attempt
      if (habitType === "duration_counter" && newHabit) {
        const { error: attemptError } = await supabase
          .from("habit_attempts")
          .insert({
            habit_id: newHabit.id,
            user_id: user.id,
            start_date: new Date().toISOString().split('T')[0],
          });

        if (attemptError) console.error("Error creating initial attempt:", attemptError);
      }

      toast.success("Привычка создана! 🎉");
      resetForm();
      onOpenChange(false);
      onHabitCreated?.();
    } catch (error) {
      console.error("Error creating habit:", error);
      toast.error("Ошибка при создании привычки");
    } finally {
      setIsCreating(false);
    }
  };

  // Form content shared between Dialog and Drawer
  const formContent = (
    <div className="space-y-4">
      {/* Template Quick Select */}
      <div className="space-y-2">
        <Label>Популярные шаблоны</Label>
        <div className={cn(
          "gap-2",
          isMobile 
            ? "flex overflow-x-auto pb-2 snap-x -mx-4 px-4" 
            : "grid grid-cols-2"
        )}>
          {DEFAULT_HABIT_TEMPLATES.map((template) => (
            <Button
              key={template.id}
              variant={selectedTemplate === template.id ? "default" : "outline"}
              size="sm"
              onClick={() => applyTemplate(template.id)}
              className={cn(
                "justify-start",
                isMobile && "flex-shrink-0 snap-start"
              )}
            >
              <span className="mr-2">{template.icon}</span>
              {template.name}
            </Button>
          ))}
        </div>
      </div>

      {/* Habit Type Selection */}
      <div className="space-y-2">
        <Label>Тип привычки</Label>
        <RadioGroup value={habitType} onValueChange={setHabitType} className="space-y-2">
          {habitTypes.map((type) => (
            <div 
              key={type.value} 
              className={cn(
                "flex items-start space-x-2 border rounded-lg",
                isMobile ? "p-2.5" : "p-3"
              )}
            >
              <RadioGroupItem value={type.value} id={type.value} className="mt-0.5" />
              <div className="flex-1 min-w-0">
                <Label htmlFor={type.value} className="cursor-pointer font-medium text-sm">
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                </Label>
                <p className="text-xs text-muted-foreground mt-0.5 truncate">{type.description}</p>
              </div>
            </div>
          ))}
        </RadioGroup>
      </div>

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
          rows={2}
        />
      </div>

      <div className={cn("gap-4", isMobile ? "space-y-4" : "grid grid-cols-2")}>
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

        {habitType === "daily_check" && (
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
        )}
      </div>

      {/* Type-specific fields */}
      {habitType === "duration_counter" && (
        <div className="space-y-2">
          <Label htmlFor="costPerDay">Стоимость в день (₽) - опционально</Label>
          <Input
            id="costPerDay"
            type="number"
            placeholder="300"
            value={costPerDay}
            onChange={(e) => setCostPerDay(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Для подсчета сэкономленных денег (например, цена пачки сигарет)
          </p>
        </div>
      )}

      {(habitType === "numeric_counter" || habitType === "daily_measurement") && (
        <div className={cn("gap-4", isMobile ? "space-y-4" : "grid grid-cols-2")}>
          <div className="space-y-2">
            <Label htmlFor="targetValue">Целевое значение</Label>
            <Input
              id="targetValue"
              type="number"
              placeholder="12"
              value={targetValue}
              onChange={(e) => setTargetValue(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="measurementUnit">Единица измерения</Label>
            <Input
              id="measurementUnit"
              placeholder="книг / страниц / км"
              value={measurementUnit}
              onChange={(e) => setMeasurementUnit(e.target.value)}
            />
          </div>
        </div>
      )}

      {/* Goal Linking */}
      <div className="space-y-2">
        <Label htmlFor="linkedGoal">Связать с целью (опционально)</Label>
        <Select value={selectedGoalId || "none"} onValueChange={(val) => setSelectedGoalId(val === "none" ? undefined : val)}>
          <SelectTrigger>
            <SelectValue placeholder="Выберите цель" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Без цели</SelectItem>
            {personalGoals?.map((goal) => (
              <SelectItem key={goal.id} value={goal.id}>
                {goal.goal_name} ({goal.target_value} {goal.target_unit})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          При выполнении привычки автоматически будет записан прогресс в цель
        </p>
      </div>

      {frequency === "weekly" && habitType === "daily_check" && (
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
  );

  // Mobile: Drawer from bottom
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>Новая привычка</DrawerTitle>
            <DrawerDescription>
              Создайте привычку, которую хотите отслеживать
            </DrawerDescription>
          </DrawerHeader>
          
          <div className="px-4 overflow-y-auto flex-1">
            {formContent}
          </div>
          
          <DrawerFooter className="pb-8">
            <Button 
              onClick={handleCreate} 
              disabled={isCreating || !name.trim()}
              className="w-full"
            >
              {isCreating ? "Создание..." : "Создать"}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="w-full"
            >
              Отмена
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Dialog modal
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новая привычка</DialogTitle>
          <DialogDescription>
            Создайте привычку, которую хотите отслеживать
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {formContent}
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
