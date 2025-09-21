import { useState, useEffect } from "react";
import { Edit3, Save, X, Target, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  measurements?: any[];
}

interface GoalEditorProps {
  goal: Goal;
  onGoalUpdated: () => void;
  className?: string;
}

export function GoalEditor({ goal, onGoalUpdated, className }: GoalEditorProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [goalForm, setGoalForm] = useState({
    goal_name: goal.goal_name,
    goal_type: goal.goal_type,
    target_value: goal.target_value.toString(),
    target_unit: goal.target_unit
  });

  const goalTypes = [
    { 
      value: 'strength', 
      label: 'Силовые упражнения', 
      color: 'bg-primary/10 text-primary border-primary/20',
      description: 'Подтягивания, отжимания, приседания, жим лежа'
    },
    { 
      value: 'cardio', 
      label: 'Кардио', 
      color: 'bg-accent/10 text-accent border-accent/20',
      description: 'Бег, велосипед, плавание, ходьба'
    },
    { 
      value: 'endurance', 
      label: 'Выносливость', 
      color: 'bg-success/10 text-success border-success/20',
      description: 'Длительность тренировок, количество кругов'
    },
    { 
      value: 'body_composition', 
      label: 'Состав тела', 
      color: 'bg-secondary/10 text-secondary-foreground border-secondary/20',
      description: 'Вес, процент жира, объемы тела'
    }
  ];

  const updateGoal = async () => {
    if (!goalForm.goal_name || !goalForm.target_value || !goalForm.target_unit) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('goals')
        .update({
          goal_name: goalForm.goal_name,
          goal_type: goalForm.goal_type,
          target_value: parseFloat(goalForm.target_value),
          target_unit: goalForm.target_unit
        })
        .eq('id', goal.id)
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Цель обновлена",
      });

      setIsDialogOpen(false);
      onGoalUpdated();
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить цель",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getGoalTypeColor = (goalType: string) => {
    const type = goalTypes.find(t => t.value === goalType);
    return type?.color || 'bg-muted text-muted-foreground';
  };

  const getProgressPercentage = () => {
    if (!goal.measurements || goal.measurements.length === 0) return 0;
    
    const latestMeasurement = goal.measurements[0];
    const progress = (latestMeasurement.value / goal.target_value) * 100;
    
    return Math.min(100, Math.max(0, progress));
  };

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <Edit3 className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-primary" />
            Редактировать цель
          </DialogTitle>
          <DialogDescription>
            Измените параметры вашей цели. Прогресс и измерения сохранятся.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Текущий прогресс */}
          <Card className="bg-muted/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Текущий прогресс</span>
                <Badge className={getGoalTypeColor(goal.goal_type)}>
                  {goalTypes.find(t => t.value === goal.goal_type)?.label}
                </Badge>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-baseline gap-2 mb-1">
                    <span className="text-lg font-bold">
                      {goal.measurements && goal.measurements.length > 0 
                        ? goal.measurements[0].value 
                        : 0}
                    </span>
                    <span className="text-sm text-muted-foreground">/ {goal.target_value}</span>
                    <span className="text-sm text-muted-foreground">{goal.target_unit}</span>
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-300"
                      style={{ width: `${getProgressPercentage()}%` }}
                    />
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-medium">{Math.round(getProgressPercentage())}%</span>
                  <p className="text-xs text-muted-foreground">завершено</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Форма редактирования */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="goal_name">Название цели *</Label>
              <Input
                id="goal_name"
                placeholder="Например: Подтягивания"
                value={goalForm.goal_name}
                onChange={(e) => setGoalForm(prev => ({ ...prev, goal_name: e.target.value }))}
              />
            </div>

            <div>
              <Label>Тип цели *</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                {goalTypes.map((type) => (
                  <Card
                    key={type.value}
                    className={`cursor-pointer transition-all duration-200 hover:scale-105 ${
                      goalForm.goal_type === type.value
                        ? 'ring-2 ring-primary bg-primary/5'
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setGoalForm(prev => ({ ...prev, goal_type: type.value }))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge className={type.color}>
                          {type.label}
                        </Badge>
                        {goalForm.goal_type === type.value && (
                          <div className="w-2 h-2 bg-primary rounded-full"></div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {type.description}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target_value">Целевое значение *</Label>
                <Input
                  id="target_value"
                  type="number"
                  step="0.1"
                  placeholder="10"
                  value={goalForm.target_value}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="target_unit">Единица измерения *</Label>
                <Input
                  id="target_unit"
                  placeholder="кг, раз, км, мин"
                  value={goalForm.target_unit}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, target_unit: e.target.value }))}
                />
              </div>
            </div>
          </div>

          {/* Кнопки действий */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              className="flex-1"
            >
              <X className="h-4 w-4 mr-2" />
              Отмена
            </Button>
            <Button
              onClick={updateGoal}
              disabled={loading}
              className="flex-1 bg-gradient-primary hover:opacity-90"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Сохранение...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}