import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, TrendingUp, TrendingDown, Target, Trophy, Calendar, Camera, Edit } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FitnessCard } from "@/components/ui/fitness-card";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { AIPhotoUpload } from "@/components/ui/ai-photo-upload";
import { WhoopIntegration } from "@/components/integrations/WhoopIntegration";
import { AppleHealthIntegration } from "@/components/integrations/AppleHealthIntegration";
import { AppleHealthUpload } from "@/components/integrations/AppleHealthUpload";
import { GarminIntegration } from "@/components/integrations/GarminIntegration";
import { ErrorLogsViewer } from "@/components/ui/error-logs-viewer";
import { AppTestSuite } from "@/components/ui/app-test-suite";
import { ProgressGallery } from "@/components/ui/progress-gallery";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { HomeButton } from "@/components/ui/home-button";
import { GoalCard } from "@/components/goals/GoalCard";
import { WeightMeasurementDialog } from "@/components/measurements/WeightMeasurementDialog";
import { VO2MaxCard } from "@/components/metrics/VO2MaxCard";

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  measurements?: any[];
}

interface Measurement {
  id: string;
  value: number;
  unit: string;
  measurement_date: string;
  notes?: string;
  goal_id: string;
}

const ProgressPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [showWeightDialog, setShowWeightDialog] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<string | null>(null);

  // Форма для добавления измерения
  const [measurementForm, setMeasurementForm] = useState({
    value: '',
    notes: '',
    measurement_date: new Date().toISOString().split('T')[0],
    photo_url: ''
  });

  useEffect(() => {
    fetchGoalsAndMeasurements();
  }, [user]);

  const fetchGoalsAndMeasurements = async () => {
    if (!user) return;
    
    console.log('Fetching goals and measurements for user:', user.id);

    try {
      // Загружаем цели пользователя (сначала загружаем простые цели)
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, goal_name, goal_type, target_value, target_unit')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsError) {
        console.error('Goals error:', goalsError);
        throw goalsError;
      }

      console.log('Goals loaded:', goalsData);

      // Загружаем все измерения
      const { data: measurementsData, error: measurementsError } = await supabase
        .from('measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('measurement_date', { ascending: false });

      if (measurementsError) {
        console.error('Measurements error:', measurementsError);
        throw measurementsError;
      }

      console.log('Measurements loaded:', measurementsData);

      // Объединяем данные вручную
      const goalsWithMeasurements = (goalsData || []).map(goal => ({
        ...goal,
        measurements: (measurementsData || []).filter(m => m.goal_id === goal.id).sort((a, b) => 
          new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime()
        )
      }));

      console.log('Goals with measurements:', goalsWithMeasurements);

      setGoals(goalsWithMeasurements);
      setMeasurements(measurementsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Ошибка загрузки данных",
        description: `Не удалось загрузить данные: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addMeasurement = async () => {
    if (!selectedGoal || !measurementForm.value) {
      toast({
        title: "Ошибка",
        description: "Заполните все обязательные поля",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('measurements')
        .insert({
          user_id: user!.id,
          goal_id: selectedGoal.id,
          value: parseFloat(measurementForm.value),
          unit: selectedGoal.target_unit,
          measurement_date: measurementForm.measurement_date,
          notes: measurementForm.notes,
          photo_url: measurementForm.photo_url
        });

      if (error) throw error;

      toast({
        title: "Успешно!",
        description: "Измерение добавлено",
      });

      setIsAddDialogOpen(false);
      setMeasurementForm({ value: '', notes: '', measurement_date: new Date().toISOString().split('T')[0], photo_url: '' });
      setSelectedGoal(null);
      fetchGoalsAndMeasurements();
    } catch (error) {
      console.error('Error adding measurement:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось добавить измерение",
        variant: "destructive",
      });
    }
  };

  const getProgressPercentage = (goal: Goal) => {
    if (!goal.measurements || goal.measurements.length === 0) return 0;
    
    const latestMeasurement = goal.measurements[0];
    const progress = (latestMeasurement.value / goal.target_value) * 100;
    
    // Для целей где меньше = лучше (например, вес, процент жира)
    const reverseGoals = ['weight_loss', 'body_composition'];
    if (reverseGoals.includes(goal.goal_type)) {
      return Math.min(100, Math.max(0, 100 - progress + 100));
    }
    
    return Math.min(100, Math.max(0, progress));
  };

  const getTrend = (goal: Goal) => {
    if (!goal.measurements || goal.measurements.length < 2) return null;
    
    const latest = goal.measurements[0].value;
    const previous = goal.measurements[1].value;
    
    return latest > previous ? 'up' : 'down';
  };

  const handleAddMeasurement = (goalId: string) => {
    const goal = goals.find(g => g.id === goalId);
    if (goal && goal.goal_type === 'body_composition' && goal.target_unit === 'кг') {
      setSelectedGoalId(goalId);
      setShowWeightDialog(true);
    } else {
      setIsAddDialogOpen(true);
    }
  };

  const handleMeasurementAdded = () => {
    fetchGoalsAndMeasurements();
    setShowWeightDialog(false);
    setSelectedGoalId(null);
  };

  const getGoalTypeColor = (goalType: string) => {
    const colors = {
      strength: 'bg-primary/10 text-primary border-primary/20',
      cardio: 'bg-accent/10 text-accent border-accent/20',
      endurance: 'bg-success/10 text-success border-success/20',
      body_composition: 'bg-secondary/10 text-secondary-foreground border-secondary/20'
    };
    return colors[goalType as keyof typeof colors] || 'bg-muted text-muted-foreground';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Загружаем ваш прогресс...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <HomeButton />
      <div className="max-w-7xl mx-auto p-3 sm:p-6">
        {/* Заголовок */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Мой прогресс
              </h1>
              <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                Отслеживайте свои достижения и добавляйте новые измерения. 
                <strong className="block sm:inline"> Для добавления показателей (подтягивания, отжимания и т.д.) сначала создайте цель, затем добавляйте измерения.</strong>
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <Button
                onClick={() => navigate('/goals/create')}
                variant="outline"
                className="bg-gradient-accent hover:opacity-90 w-full sm:w-auto"
                size="sm"
              >
                <Target className="h-4 w-4 mr-2" />
                Новая цель
              </Button>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary hover:opacity-90 w-full sm:w-auto" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить измерение
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[95vh] overflow-y-auto mx-2">
                  <DialogHeader>
                    <DialogTitle>Добавить новое измерение</DialogTitle>
                    <DialogDescription>
                      <div className="space-y-2">
                        <p>Выберите цель и введите результат измерения</p>
                        <div className="bg-blue-50 p-3 rounded-lg text-sm">
                          <strong>💡 Подсказка:</strong> Если нужной цели нет в списке, сначала создайте её через кнопку "Новая цель"
                        </div>
                      </div>
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="measurement" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5 h-auto">
                      <TabsTrigger value="measurement" className="text-xs sm:text-sm">Ручной ввод</TabsTrigger>
                      <TabsTrigger value="photo" className="text-xs sm:text-sm">ИИ-анализ</TabsTrigger>
                      <TabsTrigger value="integrations" className="text-xs sm:text-sm">Интеграции</TabsTrigger>
                      <TabsTrigger value="manual-photo" className="text-xs sm:text-sm">Фото прогресса</TabsTrigger>
                      <TabsTrigger value="test" className="text-xs sm:text-sm">Тестирование</TabsTrigger>
                    </TabsList>

                    <TabsContent value="measurement" className="space-y-4">
                      <div>
                        <Label htmlFor="goal-select">Цель</Label>
                        <Select onValueChange={(value) => {
                          const goal = goals.find(g => g.id === value);
                          setSelectedGoal(goal || null);
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Выберите цель" />
                          </SelectTrigger>
                          <SelectContent>
                            {goals.map((goal) => (
                              <SelectItem key={goal.id} value={goal.id}>
                                {goal.goal_name} ({goal.target_unit})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="value">Результат</Label>
                        <Input
                          id="value"
                          type="number"
                          step="0.1"
                          placeholder={selectedGoal ? `Введите значение в ${selectedGoal.target_unit}` : "Значение"}
                          value={measurementForm.value}
                          onChange={(e) => setMeasurementForm(prev => ({ ...prev, value: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="date">Дата измерения</Label>
                        <Input
                          id="date"
                          type="date"
                          value={measurementForm.measurement_date}
                          onChange={(e) => setMeasurementForm(prev => ({ ...prev, measurement_date: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label htmlFor="notes">Заметки (опционально)</Label>
                        <Textarea
                          id="notes"
                          placeholder="Добавьте заметки о тренировке или условиях измерения..."
                          value={measurementForm.notes}
                          onChange={(e) => setMeasurementForm(prev => ({ ...prev, notes: e.target.value }))}
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="manual-photo" className="space-y-4">
                      <div>
                        <Label className="text-base font-medium">Фото прогресса</Label>
                        <p className="text-sm text-muted-foreground mb-4">
                          Добавьте фото для визуального отслеживания прогресса
                        </p>
                        <PhotoUpload
                          onPhotoUploaded={(url) => setMeasurementForm(prev => ({ ...prev, photo_url: url }))}
                          existingPhotoUrl={measurementForm.photo_url}
                          label="Добавить фото прогресса"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="photo" className="space-y-4">
                      <div>
                        <Label className="text-base font-medium">Скриншот фитнес-трекера</Label>
                        <p className="text-sm text-muted-foreground mb-4">
                          Загрузите скриншот с данными трекера - ИИ автоматически извлечет все показатели
                        </p>
                        <AIPhotoUpload
                          onDataExtracted={(result) => {
                            if (result.success && result.saved) {
                              // Обновляем данные после успешного анализа
                              fetchGoalsAndMeasurements();
                              setIsAddDialogOpen(false);
                              setMeasurementForm({ value: '', notes: '', measurement_date: new Date().toISOString().split('T')[0], photo_url: '' });
                              setSelectedGoal(null);
                            }
                          }}
                          onPhotoUploaded={(url) => setMeasurementForm(prev => ({ ...prev, photo_url: url }))}
                          existingPhotoUrl={measurementForm.photo_url}
                          goalId={selectedGoal?.id}
                          label="Загрузить скриншот трекера"
                        />
                      </div>
                    </TabsContent>

                    <TabsContent value="integrations" className="space-y-4 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                      <div>
                        <Label className="text-base font-medium">Интеграции фитнес-устройств</Label>
                        <p className="text-sm text-muted-foreground mb-4">
                          Подключите ваши фитнес-устройства для автоматической синхронизации данных
                        </p>
                        
                        <div className="space-y-4 pr-2">
                          <WhoopIntegration userId={user?.id || ''} />
                          
                          <AppleHealthUpload />
                          
                          <GarminIntegration userId={user?.id || ''} />
                        </div>
                        
                        <div className="mt-4 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-medium mb-2">💡 Рекомендации по интеграции:</h4>
                          <ul className="space-y-1">
                            <li>• Подключите все доступные устройства для полной картины здоровья</li>
                            <li>• Данные автоматически разделяются между целями и общей статистикой</li>
                            <li>• Просматривайте полную историю на странице "Данные трекеров"</li>
                          </ul>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="test" className="space-y-4 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                      <AppTestSuite />
                    </TabsContent>

                    <Button onClick={addMeasurement} className="w-full bg-gradient-primary hover:opacity-90">
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить измерение
                    </Button>
                  </Tabs>
                </DialogContent>
              </Dialog>

              {/* Weight Measurement Dialog */}
              {selectedGoalId && (
                <WeightMeasurementDialog
                  open={showWeightDialog}
                  onOpenChange={setShowWeightDialog}
                  goalId={selectedGoalId}
                  onMeasurementAdded={handleMeasurementAdded}
                />
              )}
            </div>
          </div>
        </div>

        {/* Инструкция для новых пользователей */}
        {goals.length === 0 && (
          <Card className="mb-8 border-dashed border-2 border-primary/30">
            <CardContent className="pt-6">
              <div className="text-center space-y-4">
                <Target className="h-16 w-16 mx-auto text-primary/50" />
                <div>
                  <h3 className="text-xl font-semibold mb-2">Начните отслеживать свой прогресс!</h3>
                  <p className="text-muted-foreground mb-4">
                    Чтобы добавлять показатели (подтягивания, отжимания, вес и т.д.), сначала создайте цели
                  </p>
                  <div className="bg-blue-50 p-4 rounded-lg text-left">
                    <h4 className="font-medium mb-2">📋 Как это работает:</h4>
                    <ol className="text-sm space-y-1">
                      <li><strong>1.</strong> Создайте цель (например: "Подтягивания - 50 раз")</li>
                      <li><strong>2.</strong> Добавляйте измерения ваших текущих показателей</li>
                      <li><strong>3.</strong> Отслеживайте прогресс в красивых графиках</li>
                    </ol>
                  </div>
                </div>
                <Button
                  onClick={() => navigate('/goals/create')}
                  className="bg-gradient-primary hover:opacity-90"
                  size="lg"
                >
                  <Target className="h-5 w-5 mr-2" />
                  Создать первую цель
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* VO2 Max Card - отдельно от целей */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4">Кардио показатели</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <VO2MaxCard selectedDate={new Date()} showTrend={true} />
          </div>
        </div>

        {/* Сетка целей */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {goals.map((goal, index) => (
            <GoalCard
              key={goal.id}
              goal={{
                ...goal,
                current_value: goal.measurements && goal.measurements.length > 0 
                  ? goal.measurements[0].value 
                  : 0,
                progress_percentage: getProgressPercentage(goal),
                trend: getTrend(goal) === 'up' ? 'up' : getTrend(goal) === 'down' ? 'down' : 'none'
              }}
              onAddMeasurement={handleAddMeasurement}
              className="animate-fade-in hover-scale transition-all duration-300"
            />
          ))}
        </div>

        {/* Галерея прогресса */}
        <ProgressGallery />

        {/* Системные функции */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Системные функции</CardTitle>
            <CardDescription>
              Тестирование, логи ошибок и диагностика приложения
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="logs" className="space-y-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="logs">Логи ошибок</TabsTrigger>
                <TabsTrigger value="test">Тестирование</TabsTrigger>
              </TabsList>

              <TabsContent value="logs" className="space-y-4">
                <ErrorLogsViewer />
              </TabsContent>

              <TabsContent value="test" className="space-y-4">
                <AppTestSuite />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        {/* Недавние измерения */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-primary" />
              Недавние измерения
            </CardTitle>
            <CardDescription>
              Ваши последние результаты
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {measurements.slice(0, 10).map((measurement) => {
                const goal = goals.find(g => g.id === measurement.goal_id);
                return (
                  <div key={measurement.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div>
                      <h4 className="font-medium">{goal?.goal_name}</h4>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(measurement.measurement_date), 'dd MMM yyyy', { locale: ru })}
                      </p>
                      {measurement.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{measurement.notes}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-lg">
                        {measurement.value} {measurement.unit}
                      </p>
                    </div>
                  </div>
                );
              })}

              {measurements.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Пока нет измерений</p>
                  <p className="text-sm">Добавьте первое измерение, чтобы начать отслеживать прогресс</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProgressPage;