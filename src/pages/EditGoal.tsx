import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Target, ArrowLeft, Save, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { FitnessCard } from "@/components/ui/fitness-card";


const EditGoalPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [goal, setGoal] = useState<any>(null);
  const [goalForm, setGoalForm] = useState({
    goal_name: '',
    goal_type: '',
    target_value: '',
    target_unit: ''
  });

  const goalTypes = [
    { value: 'strength', label: 'Силовые упражнения', examples: 'Подтягивания, отжимания, приседания' },
    { value: 'cardio', label: 'Кардио', examples: 'Бег, велосипед, плавание' },
    { value: 'endurance', label: 'Выносливость', examples: 'Длительность тренировки, количество кругов' },
    { value: 'body_composition', label: 'Состав тела', examples: 'Вес, процент жира, объемы' }
  ];

  useEffect(() => {
    if (id) {
      fetchGoal();
    }
  }, [id]);

  const fetchGoal = async () => {
    if (!user || !id) return;

    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;

      if (data) {
        setGoal(data);
        setGoalForm({
          goal_name: data.goal_name,
          goal_type: data.goal_type,
          target_value: data.target_value?.toString() || '',
          target_unit: data.target_unit || ''
        });
      }
    } catch (error) {
      console.error('Error fetching goal:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить цель",
        variant: "destructive",
      });
      navigate('/progress');
    }
  };

  const updateGoal = async () => {
    if (!goalForm.goal_name || !goalForm.goal_type || !goalForm.target_value || !goalForm.target_unit) {
      toast({
        title: "Ошибка",
        description: "Заполните все поля",
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
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Цель обновлена",
      });

      navigate('/progress');
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

  const deleteGoal = async () => {
    if (!id) return;
    
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', id)
        .eq('user_id', user!.id);

      if (error) throw error;

      toast({
        title: "Цель удалена",
        description: "Цель и все связанные измерения были удалены",
      });

      navigate('/progress');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить цель",
        variant: "destructive",
      });
    }
  };

  const getGoalTypeInfo = (type: string) => {
    return goalTypes.find(gt => gt.value === type) || goalTypes[0];
  };

  if (!goal) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Загрузка цели...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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
            Редактировать цель
          </h1>
          <p className="text-muted-foreground mt-2">
            Измените параметры вашей цели
          </p>
        </div>

        <FitnessCard className="p-8">
          <div className="space-y-6">
            <div>
              <Label htmlFor="goal_name">Название цели</Label>
              <Input
                id="goal_name"
                placeholder="Например: Подтягивания за подход"
                value={goalForm.goal_name}
                onChange={(e) => setGoalForm(prev => ({ ...prev, goal_name: e.target.value }))}
                className="mt-1"
              />
            </div>

            <div>
              <Label>Тип цели</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                {goalTypes.map((type) => (
                  <Card 
                    key={type.value}
                    className={`cursor-pointer transition-all ${
                      goalForm.goal_type === type.value 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover:bg-muted/50'
                    }`}
                    onClick={() => setGoalForm(prev => ({ ...prev, goal_type: type.value }))}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{type.label}</h4>
                          <p className="text-sm text-muted-foreground">{type.examples}</p>
                        </div>
                        {goalForm.goal_type === type.value && (
                          <Badge variant="default">Выбрано</Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="target_value">Целевое значение</Label>
                <Input
                  id="target_value"
                  type="number"
                  step="0.1"
                  placeholder="100"
                  value={goalForm.target_value}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, target_value: e.target.value }))}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="target_unit">Единица измерения</Label>
                <Input
                  id="target_unit"
                  placeholder="раз, кг, км, мин"
                  value={goalForm.target_unit}
                  onChange={(e) => setGoalForm(prev => ({ ...prev, target_unit: e.target.value }))}
                  className="mt-1"
                />
              </div>
            </div>

            {goalForm.goal_type && (
              <div className="p-4 bg-muted/30 rounded-lg">
                <h4 className="font-medium mb-2">Информация о типе цели:</h4>
                <p className="text-sm text-muted-foreground">
                  <strong>{getGoalTypeInfo(goalForm.goal_type).label}:</strong> {getGoalTypeInfo(goalForm.goal_type).examples}
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-4">
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
                    Сохранить изменения
                  </>
                )}
              </Button>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Удалить
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Удалить цель?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Это действие нельзя отменить. Цель и все связанные с ней измерения будут удалены навсегда.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Отмена</AlertDialogCancel>
                    <AlertDialogAction onClick={deleteGoal}>
                      Удалить
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </FitnessCard>
      </div>
    </div>
  );
};

export default EditGoalPage;