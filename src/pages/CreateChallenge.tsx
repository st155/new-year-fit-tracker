import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar, Target, Trophy, Users, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FitnessCard } from "@/components/ui/fitness-card";
import { HomeButton } from "@/components/ui/home-button";

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
}

const CreateChallengePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [challengeForm, setChallengeForm] = useState({
    title: '',
    description: '',
    start_date: '',
    end_date: ''
  });

  const [goals, setGoals] = useState<Goal[]>([]);
  const [newGoal, setNewGoal] = useState({
    goal_name: '',
    goal_type: 'strength',
    target_value: '',
    target_unit: ''
  });

  const goalTypes = [
    { value: 'strength', label: 'Сила', color: 'bg-primary/10 text-primary border-primary/20' },
    { value: 'cardio', label: 'Кардио', color: 'bg-accent/10 text-accent border-accent/20' },
    { value: 'endurance', label: 'Выносливость', color: 'bg-success/10 text-success border-success/20' },
    { value: 'body_composition', label: 'Композиция тела', color: 'bg-secondary/10 text-secondary-foreground border-secondary/20' },
    { value: 'flexibility', label: 'Гибкость', color: 'bg-muted/50 text-muted-foreground border-muted' }
  ];

  const addGoal = () => {
    if (!newGoal.goal_name || !newGoal.target_value || !newGoal.target_unit) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля цели",
        variant: "destructive",
      });
      return;
    }

    const goal: Goal = {
      id: Date.now().toString(),
      goal_name: newGoal.goal_name,
      goal_type: newGoal.goal_type,
      target_value: parseFloat(newGoal.target_value),
      target_unit: newGoal.target_unit
    };

    setGoals([...goals, goal]);
    setNewGoal({
      goal_name: '',
      goal_type: 'strength',
      target_value: '',
      target_unit: ''
    });
  };

  const removeGoal = (id: string) => {
    setGoals(goals.filter(g => g.id !== id));
  };

  const createChallenge = async () => {
    if (!challengeForm.title || !challengeForm.start_date || !challengeForm.end_date) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    if (goals.length === 0) {
      toast({
        title: "Ошибка",
        description: "Добавьте хотя бы одну цель",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Создаем челлендж
      const { data: challengeData, error: challengeError } = await supabase
        .from('challenges')
        .insert({
          title: challengeForm.title,
          description: challengeForm.description,
          start_date: challengeForm.start_date,
          end_date: challengeForm.end_date,
          created_by: user!.id,
          is_active: true
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Добавляем цели к челленджу
      const goalsWithChallengeId = goals.map(goal => ({
        challenge_id: challengeData.id,
        goal_name: goal.goal_name,
        goal_type: goal.goal_type,
        target_value: goal.target_value,
        target_unit: goal.target_unit,
        is_personal: false,
        user_id: null
      }));

      const { error: goalsError } = await supabase
        .from('goals')
        .insert(goalsWithChallengeId);

      if (goalsError) throw goalsError;

      toast({
        title: "Успех!",
        description: "Челлендж создан успешно",
      });

      navigate('/challenges');
    } catch (error) {
      console.error('Error creating challenge:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать челлендж",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getGoalTypeInfo = (type: string) => {
    return goalTypes.find(gt => gt.value === type) || goalTypes[0];
  };

  return (
    <div className="min-h-screen bg-background">
      <HomeButton />
      <div className="max-w-4xl mx-auto p-6">
        {/* Заголовок */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => navigate('/challenges')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Назад к челленджам
          </Button>
          
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Создать новый челлендж
          </h1>
          <p className="text-muted-foreground mt-2">
            Создайте мотивирующий челлендж для вашей команды
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Основная информация */}
          <FitnessCard className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-primary" />
                  Основная информация
                </h2>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Название челленджа *</Label>
                  <Input
                    id="title"
                    placeholder="Например: Фитнес к лету 2024"
                    value={challengeForm.title}
                    onChange={(e) => setChallengeForm(prev => ({ ...prev, title: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="description">Описание</Label>
                  <Textarea
                    id="description"
                    placeholder="Опишите цели и мотивацию челленджа..."
                    value={challengeForm.description}
                    onChange={(e) => setChallengeForm(prev => ({ ...prev, description: e.target.value }))}
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="start_date">Дата начала *</Label>
                    <Input
                      id="start_date"
                      type="date"
                      value={challengeForm.start_date}
                      onChange={(e) => setChallengeForm(prev => ({ ...prev, start_date: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="end_date">Дата окончания *</Label>
                    <Input
                      id="end_date"
                      type="date"
                      value={challengeForm.end_date}
                      onChange={(e) => setChallengeForm(prev => ({ ...prev, end_date: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>
          </FitnessCard>

          {/* Цели челленджа */}
          <FitnessCard className="p-6">
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Цели челленджа
                </h2>
              </div>

              {/* Добавление новой цели */}
              <div className="space-y-4 p-4 border border-border rounded-lg bg-muted/20">
                <h3 className="font-medium">Добавить цель</h3>
                
                <div className="space-y-3">
                  <div>
                    <Label htmlFor="goal_name">Название цели</Label>
                    <Input
                      id="goal_name"
                      placeholder="Например: Подтягивания"
                      value={newGoal.goal_name}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, goal_name: e.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label htmlFor="goal_type">Тип</Label>
                      <select
                        id="goal_type"
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={newGoal.goal_type}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, goal_type: e.target.value }))}
                      >
                        {goalTypes.map(type => (
                          <option key={type.value} value={type.value}>
                            {type.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label htmlFor="target_unit">Единица</Label>
                      <Input
                        id="target_unit"
                        placeholder="кг, раз, км"
                        value={newGoal.target_unit}
                        onChange={(e) => setNewGoal(prev => ({ ...prev, target_unit: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="target_value">Целевое значение</Label>
                    <Input
                      id="target_value"
                      type="number"
                      step="0.1"
                      placeholder="10"
                      value={newGoal.target_value}
                      onChange={(e) => setNewGoal(prev => ({ ...prev, target_value: e.target.value }))}
                    />
                  </div>

                  <Button onClick={addGoal} className="w-full" variant="outline">
                    Добавить цель
                  </Button>
                </div>
              </div>

              {/* Список целей */}
              <div className="space-y-3">
                {goals.map((goal) => {
                  const typeInfo = getGoalTypeInfo(goal.goal_type);
                  return (
                    <div key={goal.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-background">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{goal.goal_name}</h4>
                          <Badge className={typeInfo.color}>
                            {typeInfo.label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Цель: {goal.target_value} {goal.target_unit}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeGoal(goal.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        Удалить
                      </Button>
                    </div>
                  );
                })}

                {goals.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Target className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Цели не добавлены</p>
                  </div>
                )}
              </div>
            </div>
          </FitnessCard>
        </div>

        {/* Кнопка создания */}
        <div className="mt-8 flex justify-end">
          <Button
            onClick={createChallenge}
            disabled={loading}
            className="bg-gradient-primary hover:opacity-90 px-8"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Создание...
              </>
            ) : (
              <>
                <Trophy className="h-4 w-4 mr-2" />
                Создать челлендж
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateChallengePage;