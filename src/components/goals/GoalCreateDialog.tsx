import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface GoalCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (goalData: any) => Promise<void>;
}

const predefinedGoals = [
  { name: "Гребля 2 км", type: "endurance", unit: "мин:сек", targetValue: "8:30" },
  { name: "Бег 1 км", type: "endurance", unit: "мин:сек", targetValue: "4:00" },
  { name: "Подтягивания", type: "strength", unit: "раз", targetValue: "17" },
  { name: "Жим лёжа", type: "strength", unit: "кг", targetValue: "90" },
  { name: "Выпады назад со штангой", type: "strength", unit: "кг×раз", targetValue: "50×8" },
  { name: "Планка", type: "endurance", unit: "мин", targetValue: "4" },
  { name: "Отжимания", type: "strength", unit: "раз", targetValue: "60" },
  { name: "Подъём ног в висе до перекладины", type: "strength", unit: "раз", targetValue: "17" },
  { name: "VO2max", type: "health", unit: "мл/кг/мин", targetValue: "50" },
  { name: "Процент жира", type: "body", unit: "%", targetValue: "11" }
];

export function GoalCreateDialog({ open, onOpenChange, onSave }: GoalCreateDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<string>('');
  const [customGoal, setCustomGoal] = useState({
    name: '',
    type: '',
    unit: '',
    targetValue: ''
  });

  const handlePredefinedGoalSelect = (goalName: string) => {
    const goal = predefinedGoals.find(g => g.name === goalName);
    if (goal) {
      setSelectedGoal(goalName);
      setCustomGoal({
        name: goal.name,
        type: goal.type,
        unit: goal.unit,
        targetValue: goal.targetValue
      });
    }
  };

  const convertTargetValue = (value: string, unit: string): number => {
    // Обработка времени в формате мин:сек
    if (unit === "мин:сек") {
      const [min, sec] = value.split(':').map(Number);
      return min * 60 + (sec || 0); // конвертируем в секунды
    }
    
    // Обработка весов с повторениями (например, "50×8")
    if (value.includes('×')) {
      const [weight] = value.split('×').map(Number);
      return weight;
    }
    
    return parseFloat(value) || 0;
  };

  const handleSave = async () => {
    if (!customGoal.name || !customGoal.type || !customGoal.unit || !customGoal.targetValue) {
      toast({
        title: "Ошибка",
        description: "Пожалуйста, заполните все поля",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const targetValue = convertTargetValue(customGoal.targetValue, customGoal.unit);
      
      await onSave({
        goal_name: customGoal.name,
        goal_type: customGoal.type,
        target_value: targetValue,
        target_unit: customGoal.unit
      });

      // Сброс формы
      setSelectedGoal('');
      setCustomGoal({
        name: '',
        type: '',
        unit: '',
        targetValue: ''
      });
    } catch (error) {
      console.error('Error saving goal:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Создать новую цель</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Предустановленные цели */}
          <div className="space-y-2">
            <Label>Выберите цель из списка</Label>
            <Select value={selectedGoal} onValueChange={handlePredefinedGoalSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Выберите предустановленную цель" />
              </SelectTrigger>
              <SelectContent>
                {predefinedGoals.map((goal) => (
                  <SelectItem key={goal.name} value={goal.name}>
                    {goal.name} — {goal.targetValue} {goal.unit}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-center text-sm text-muted-foreground">
            или создайте свою цель
          </div>

          {/* Пользовательская цель */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="goalName">Название цели</Label>
              <Input
                id="goalName"
                value={customGoal.name}
                onChange={(e) => setCustomGoal(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Например: Приседания"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="goalType">Тип цели</Label>
                <Select
                  value={customGoal.type}
                  onValueChange={(value) => setCustomGoal(prev => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите тип" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="strength">Сила</SelectItem>
                    <SelectItem value="endurance">Выносливость</SelectItem>
                    <SelectItem value="body">Тело</SelectItem>
                    <SelectItem value="health">Здоровье</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="goalUnit">Единица измерения</Label>
                <Input
                  id="goalUnit"
                  value={customGoal.unit}
                  onChange={(e) => setCustomGoal(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="кг, раз, мин"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetValue">Целевое значение</Label>
              <Input
                id="targetValue"
                value={customGoal.targetValue}
                onChange={(e) => setCustomGoal(prev => ({ ...prev, targetValue: e.target.value }))}
                placeholder="100, 4:30, 50×8"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Отмена
            </Button>
            <Button
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Создание..." : "Создать цель"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}