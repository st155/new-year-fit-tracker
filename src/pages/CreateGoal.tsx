import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Target, ArrowLeft, Plus, Save } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FitnessCard } from "@/components/ui/fitness-card";
import { HomeButton } from "@/components/ui/home-button";

const CreateGoalPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [goalForm, setGoalForm] = useState({
    goal_name: '',
    goal_type: 'strength',
    target_value: '',
    target_unit: '',
    notes: ''
  });

  const goalTypes = [
    { 
      value: 'strength', 
      label: 'Силовые упражнения', 
      color: 'bg-primary/10 text-primary border-primary/20', 
      description: 'Подтягивания, отжимания, приседания, жим лежа',
      examples: ['Подтягивания - 50 раз', 'Отжимания - 100 раз', 'Приседания - 200 раз']
    },
    { 
      value: 'cardio', 
      label: 'Кардио', 
      color: 'bg-accent/10 text-accent border-accent/20', 
      description: 'Бег, велосипед, плавание, ходьба',
      examples: ['Бег - 10 км', 'Велосипед - 50 км', 'Плавание - 2 км']
    },
    { 
      value: 'endurance', 
      label: 'Выносливость', 
      color: 'bg-success/10 text-success border-success/20', 
      description: 'Длительность тренировок, количество кругов',
      examples: ['Тренировка - 90 мин', 'Круги - 20 кругов', 'Планка - 10 мин']
    },
    { 
      value: 'body_composition', 
      label: 'Состав тела', 
      color: 'bg-secondary/10 text-secondary-foreground border-secondary/20', 
      description: 'Вес, процент жира, объемы тела',
      examples: ['Вес - 70 кг', 'Процент жира - 15 %', 'Талия - 80 см']
    }
  ];

  const createGoal = async () => {
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
      // Получаем активный челлендж пользователя
      const { data: challengeData } = await supabase
        .from('challenge_participants')
        .select(`
          challenge_id,
          challenges (
            id,
            title,
            is_active
          )
        `)
        .eq('user_id', user!.id);

      let challengeId = null;
      if (challengeData && challengeData.length > 0) {
        const activeChallenge = challengeData.find(p => 
          p.challenges && (p.challenges as any).is_active
        );
        challengeId = activeChallenge?.challenge_id;
      }

      const { error } = await supabase
        .from('goals')
        .insert({
          user_id: user!.id,
          challenge_id: challengeId,
          goal_name: goalForm.goal_name,
          goal_type: goalForm.goal_type,
          target_value: parseFloat(goalForm.target_value),
          target_unit: goalForm.target_unit,
          is_personal: true
        });

      if (error) throw error;

      toast({
        title: "Успех!",
        description: "Цель создана успешно",
      });

      navigate('/progress');
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать цель",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedGoalType = goalTypes.find(type => type.value === goalForm.goal_type);

  return (
    <div className="min-h-screen bg-background">
      <HomeButton />
      <div className="max-w-2xl mx-auto p-6">
        {/* Заголовок */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/progress')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к прогрессу
          </Button>
          
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Создать новую цель
          </h1>
          <p className="text-muted-foreground mt-2">
            Установите персональную цель для отслеживания прогресса
          </p>
        </div>

        <FitnessCard className="p-6 animate-fade-in">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Информация о цели
              </h2>
            </div>

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
                <Label htmlFor="goal_type">Тип цели *</Label>
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

              <div>
                <Label htmlFor="notes">Описание (опционально)</Label>
                <Textarea
                  id="notes"
                  placeholder="Добавьте описание или заметки к цели..."
                  value={goalForm.notes}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            {selectedGoalType && (
              <Card className="bg-muted/30 border-dashed">
                <CardContent className="p-4">
                  <h4 className="font-medium mb-2">Предварительный просмотр:</h4>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">{goalForm.goal_name || 'Название цели'}</span>
                    <Badge className={selectedGoalType.color}>
                      {selectedGoalType.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Цель: {goalForm.target_value || '0'} {goalForm.target_unit || 'единиц'}
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => navigate('/progress')}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={createGoal}
                disabled={loading}
                className="flex-1 bg-gradient-primary hover:opacity-90"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Создание...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Создать цель
                  </>
                )}
              </Button>
            </div>
          </div>
        </FitnessCard>
      </div>
    </div>
  );
};

export default CreateGoalPage;