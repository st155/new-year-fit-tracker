import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, TrendingUp, TrendingDown, Target, Trophy, Calendar, Camera, Edit, Scale } from "lucide-react";
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
import { WeightTracker } from "@/components/weight/WeightTracker";
import { GoalEditor } from "@/components/goals/GoalEditor";
import GoalProgressDetail from "@/components/detail/GoalProgressDetail";
import { QuickMeasurementDialog } from "@/components/goals/QuickMeasurementDialog";
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
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";


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
  photo_url?: string;
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
  const [viewingGoalDetail, setViewingGoalDetail] = useState<Goal | null>(null);
  const [quickMeasurementGoal, setQuickMeasurementGoal] = useState<Goal | null>(null);
  const [weightData, setWeightData] = useState<{ weight: number; date: string; change?: number } | null>(null);

  // Форма для добавления измерения
  const [measurementForm, setMeasurementForm] = useState({
    value: '',
    notes: '',
    measurement_date: new Date().toISOString().split('T')[0],
    photo_url: ''
  });

  useEffect(() => {
    fetchGoalsAndMeasurements();
    fetchCurrentWeight();
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

  const fetchCurrentWeight = async () => {
    if (!user) return;

    try {
      // Сначала проверяем данные Withings из metric_values
      const { data: withingsData, error: withingsError } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, unit, source)
        `)
        .eq('user_id', user.id)
        .eq('user_metrics.metric_name', 'Вес')
        .eq('user_metrics.source', 'withings')
        .order('measurement_date', { ascending: false })
        .limit(2);

      if (withingsData && withingsData.length > 0) {
        const currentWeight = withingsData[0].value;
        const previousWeight = withingsData[1]?.value;
        const change = previousWeight ? currentWeight - previousWeight : undefined;
        
        setWeightData({
          weight: currentWeight,
          date: withingsData[0].measurement_date,
          change
        });
        return;
      }

      // Иначе используем данные из daily_health_summary
      const { data, error } = await supabase
        .from('daily_health_summary')
        .select('weight, date')
        .eq('user_id', user.id)
        .not('weight', 'is', null)
        .order('date', { ascending: false })
        .limit(2);

      if (error) throw error;

      if (data && data.length > 0) {
        const currentWeight = data[0].weight;
        const previousWeight = data[1]?.weight;
        const change = previousWeight ? currentWeight - previousWeight : undefined;
        
        setWeightData({
          weight: currentWeight,
          date: data[0].date,
          change
        });
      }
    } catch (error) {
      console.error('Error fetching current weight:', error);
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
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-3 sm:p-6">
          <div className="mb-6 sm:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-96" />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Skeleton className="h-10 w-32" />
                <Skeleton className="h-10 w-40" />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-6 w-32" />
                    <Skeleton className="h-4 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                  <div className="flex justify-between">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Если просматриваем детали цели
  if (viewingGoalDetail) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto p-3 sm:p-6">
          <GoalProgressDetail 
            goal={viewingGoalDetail} 
            onBack={() => setViewingGoalDetail(null)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
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

                      <Button onClick={addMeasurement} className="w-full">
                        Добавить измерение
                      </Button>
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
                          
                          <AppleHealthUpload onUploadComplete={() => {
                            fetchGoalsAndMeasurements();
                            toast({
                              title: 'Данные Apple Health импортированы',
                              description: 'Показатели здоровья успешно добавлены в вашу статистику.'
                            });
                          }} />
                          
                          <GarminIntegration userId={user?.id || ''} />
                        </div>
                        
                        <div className="mt-4 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-medium mb-2">💡 Рекомендации по интеграции:</h4>
                          <ul className="space-y-1">
                            <li>• Подключите все доступные устройства для полной картины здоровья</li>
                            <li>• Данные автоматически разделяются между целями и общей статистикой</li>
                            <li>• Интеграции работают в фоновом режиме</li>
                          </ul>
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="test" className="space-y-4 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                      <div className="space-y-4 pr-2">
                        <AppTestSuite />
                        <ErrorLogsViewer />
                      </div>
                    </TabsContent>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Контроль веса */}
        <WeightTracker className="mb-8" />

        {/* Инструкция для новых пользователей */}
        {goals.length === 0 && (
          <EmptyState
            icon={<Target className="h-16 w-16" />}
            title="Начните отслеживать свой прогресс!"
            description="Создайте цели для отслеживания подтягиваний, отжиманий, веса и других показателей. Добавляйте измерения и следите за своими достижениями."
            action={{
              label: "Создать первую цель",
              onClick: () => navigate('/goals/create')
            }}
            className="mb-8"
          />
        )}

        {/* Сетка целей */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {/* Карточка контроля веса */}
          {weightData && (
            <FitnessCard 
              className="p-6 animate-fade-in hover-scale transition-all duration-300 cursor-pointer border-2 border-primary/20"
              style={{ animationDelay: `0ms` }}
              onClick={() => navigate('/progress')} // Можно добавить отдельную страницу для веса
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Scale className="h-5 w-5 text-primary" />
                      <h3 className="font-semibold text-lg">Контроль веса</h3>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20">
                      Состав тела
                    </Badge>
                  </div>
                  {weightData.change && (
                    <div className="flex items-center gap-1 text-sm">
                      {weightData.change > 0 ? (
                        <TrendingUp className="h-4 w-4 text-red-500" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Текущий вес</span>
                    <span className="font-medium">{weightData.weight} кг</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Текущий</p>
                    <p className="font-medium">{weightData.weight} кг</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Изменение</p>
                    <p className={`font-medium ${
                      weightData.change 
                        ? weightData.change > 0 ? 'text-red-500' : 'text-green-500'
                        : 'text-muted-foreground'
                    }`}>
                      {weightData.change 
                        ? `${weightData.change > 0 ? '+' : ''}${weightData.change.toFixed(1)} кг`
                        : 'Нет данных'
                      }
                    </p>
                  </div>
                </div>

                <div className="text-xs text-muted-foreground">
                  Последнее: {format(new Date(weightData.date), 'd MMM', { locale: ru })}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Добавить
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Добавить вес</DialogTitle>
                        <DialogDescription>
                          Введите текущий вес
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <Input
                          type="number"
                          step="0.1"
                          placeholder="70.5"
                          onChange={async (e) => {
                            if (e.target.value && user) {
                              try {
                                const today = new Date().toISOString().split('T')[0];
                                const weight = parseFloat(e.target.value);
                                
                                const { data: existingData } = await supabase
                                  .from('daily_health_summary')
                                  .select('id')
                                  .eq('user_id', user.id)
                                  .eq('date', today)
                                  .maybeSingle();

                                if (existingData) {
                                  await supabase
                                    .from('daily_health_summary')
                                    .update({ weight })
                                    .eq('id', existingData.id);
                                } else {
                                  await supabase
                                    .from('daily_health_summary')
                                    .insert({
                                      user_id: user.id,
                                      date: today,
                                      weight
                                    });
                                }
                                
                                fetchCurrentWeight();
                                toast({
                                  title: "Успешно!",
                                  description: "Вес обновлен",
                                });
                              } catch (error) {
                                console.error('Error updating weight:', error);
                              }
                            }
                          }}
                        />
                      </div>
                    </DialogContent>
                  </Dialog>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Можно добавить детальную страницу веса
                    }}
                  >
                    <TrendingUp className="h-4 w-4 mr-1" />
                    Детали
                  </Button>
                </div>
              </div>
            </FitnessCard>
          )}

          {goals.map((goal, index) => {
            const progress = getProgressPercentage(goal);
            const trend = getTrend(goal);
            const latestMeasurement = goal.measurements?.[0];

            return (
              <FitnessCard 
                key={goal.id} 
                className="p-6 animate-fade-in hover-scale transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${(index + 1) * 100}ms` }}
                onClick={() => setViewingGoalDetail(goal)}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{goal.goal_name}</h3>
                        <GoalEditor 
                          goal={goal} 
                          onGoalUpdated={fetchGoalsAndMeasurements}
                        />
                      </div>
                      <Badge className={getGoalTypeColor(goal.goal_type)}>
                        {goal.goal_type === 'strength' ? 'Сила' :
                         goal.goal_type === 'cardio' ? 'Кардио' :
                         goal.goal_type === 'endurance' ? 'Выносливость' :
                         'Состав тела'}
                      </Badge>
                    </div>
                    {trend && (
                      <div className="flex items-center gap-1 text-sm">
                        {trend === 'up' ? (
                          <TrendingUp className="h-4 w-4 text-success" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-destructive" />
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Прогресс</span>
                      <span className="font-medium">{progress.toFixed(1)}%</span>
                    </div>
                    <Progress value={progress} className="h-2" />
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Текущий</p>
                      <p className="font-medium">
                        {latestMeasurement ? `${latestMeasurement.value} ${goal.target_unit}` : 'Нет данных'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Цель</p>
                      <p className="font-medium">{goal.target_value} {goal.target_unit}</p>
                    </div>
                  </div>

                  {latestMeasurement && (
                    <div className="text-xs text-muted-foreground">
                      Последнее: {format(new Date(latestMeasurement.measurement_date), 'd MMM', { locale: ru })}
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickMeasurementGoal(goal);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Добавить
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingGoalDetail(goal);
                      }}
                    >
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Детали
                    </Button>
                  </div>
                </div>
              </FitnessCard>
            );
          })}
        </div>

        {/* Галерея прогресса */}
        <div className="mb-8">
          <ProgressGallery />
        </div>
      </div>

      {/* Быстрое добавление измерения */}
      {quickMeasurementGoal && (
        <QuickMeasurementDialog
          goal={quickMeasurementGoal}
          isOpen={!!quickMeasurementGoal}
          onOpenChange={(open) => !open && setQuickMeasurementGoal(null)}
          onMeasurementAdded={fetchGoalsAndMeasurements}
        />
      )}
    </div>
  );
};

export default ProgressPage;