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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { completeOnboardingStep, ONBOARDING_STEPS } from "@/lib/onboarding-utils";

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

const habitTypes = [
  { value: "daily_check", label: "Daily Check-in", description: "Simple daily completion", icon: "✅" },
  { value: "duration_counter", label: "Duration Counter", description: "Track time (e.g., quit smoking)", icon: "⏱️" },
  { value: "numeric_counter", label: "Numeric Counter", description: "Count items (e.g., books read)", icon: "🔢" },
  { value: "daily_measurement", label: "Daily Measurement", description: "Track daily values (e.g., pages read)", icon: "📊" },
];

const habitTemplates = [
  { 
    name: "Бросить курить", 
    type: "duration_counter", 
    category: "fitness", 
    icon: "🚭",
    settings: { cost_per_day: 300 }
  },
  { 
    name: "Не пить алкоголь", 
    type: "duration_counter", 
    category: "fitness", 
    icon: "🚫🍺",
  },
  { 
    name: "Прочитать книги", 
    type: "numeric_counter", 
    category: "custom", 
    icon: "📚",
    target_value: 12,
    measurement_unit: "книг"
  },
  { 
    name: "Читать страниц в день", 
    type: "daily_measurement", 
    category: "custom", 
    icon: "📖",
    target_value: 50,
    measurement_unit: "страниц"
  },
];

export function HabitCreateDialog({ open, onOpenChange }: HabitCreateDialogProps) {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("custom");
  const [frequency, setFrequency] = useState("daily");
  const [targetCount, setTargetCount] = useState(7);
  const [isCreating, setIsCreating] = useState(false);
  
  // New fields for custom habits
  const [habitType, setHabitType] = useState("daily_check");
  const [targetValue, setTargetValue] = useState("");
  const [measurementUnit, setMeasurementUnit] = useState("");
  const [costPerDay, setCostPerDay] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");

  const applyTemplate = (templateName: string) => {
    const template = habitTemplates.find(t => t.name === templateName);
    if (!template) return;

    setName(template.name);
    setHabitType(template.type);
    setCategory(template.category);
    
    if (template.target_value) setTargetValue(template.target_value.toString());
    if (template.measurement_unit) setMeasurementUnit(template.measurement_unit);
    if (template.settings?.cost_per_day) setCostPerDay(template.settings.cost_per_day.toString());
    
    setSelectedTemplate(templateName);
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
      }

      const habitData: any = {
        user_id: user.id,
        name: name.trim(),
        description: description.trim() || null,
        category,
        frequency,
        target_count: targetCount,
        is_active: true,
        habit_type: habitType,
        custom_settings: customSettings,
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
      
      // Mark onboarding step as completed
      completeOnboardingStep(user.id, ONBOARDING_STEPS.CREATE_HABITS);
      
      onOpenChange(false);
      
      // Reset form
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
    } catch (error) {
      console.error("Error creating habit:", error);
      toast.error("Ошибка при создании привычки");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Новая привычка</DialogTitle>
          <DialogDescription>
            Создайте привычку, которую хотите отслеживать
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Template Quick Select */}
          <div className="space-y-2">
            <Label>Шаблоны</Label>
            <div className="grid grid-cols-2 gap-2">
              {habitTemplates.map((template) => (
                <Button
                  key={template.name}
                  variant={selectedTemplate === template.name ? "default" : "outline"}
                  size="sm"
                  onClick={() => applyTemplate(template.name)}
                  className="justify-start"
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
            <RadioGroup value={habitType} onValueChange={setHabitType}>
              {habitTypes.map((type) => (
                <div key={type.value} className="flex items-start space-x-2 border rounded-lg p-3">
                  <RadioGroupItem value={type.value} id={type.value} />
                  <div className="flex-1">
                    <Label htmlFor={type.value} className="cursor-pointer font-medium">
                      <span className="mr-2">{type.icon}</span>
                      {type.label}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">{type.description}</p>
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
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
