import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, TrendingUp, TrendingDown, Target, Trophy, Calendar, Camera } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { FitnessCard } from "@/components/ui/fitness-card";
import { PhotoUpload } from "@/components/ui/photo-upload";
import { AIPhotoUpload } from "@/components/ui/ai-photo-upload";
import { WhoopIntegration } from "@/components/integrations/WhoopIntegration";
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

    try {
      // Загружаем цели пользователя
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select(`
          id,
          goal_name,
          goal_type,
          target_value,
          target_unit,
          measurements (
            id,
            value,
            unit,
            measurement_date,
            notes
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      setGoals(goalsData || []);

      // Загружаем все измерения
      const { data: measurementsData, error: measurementsError } = await supabase
        .from('measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('measurement_date', { ascending: false });

      if (measurementsError) throw measurementsError;

      setMeasurements(measurementsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить данные",
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
      <div className="max-w-7xl mx-auto p-6">
        {/* Заголовок */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Мой прогресс
              </h1>
              <p className="text-muted-foreground mt-2">
                Отслеживайте свои достижения и добавляйте новые измерения
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={() => navigate('/goals/create')}
                variant="outline"
                className="bg-gradient-accent hover:opacity-90"
              >
                <Target className="h-4 w-4 mr-2" />
                Новая цель
              </Button>

              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-gradient-primary hover:opacity-90">
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить измерение
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Добавить новое измерение</DialogTitle>
                    <DialogDescription>
                      Выберите цель и введите результат измерения
                    </DialogDescription>
                  </DialogHeader>
                  
                  <Tabs defaultValue="measurement" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                      <TabsTrigger value="measurement">Ручной ввод</TabsTrigger>
                      <TabsTrigger value="photo">ИИ-анализ</TabsTrigger>
                      <TabsTrigger value="integrations">Интеграции</TabsTrigger>
                      <TabsTrigger value="manual-photo">Фото прогресса</TabsTrigger>
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

                    <TabsContent value="integrations" className="space-y-4">
                      <div>
                        <Label className="text-base font-medium">Интеграции фитнес-устройств</Label>
                        <p className="text-sm text-muted-foreground mb-4">
                          Подключите ваши фитнес-устройства для автоматической синхронизации данных
                        </p>
                        <WhoopIntegration userId={user?.id || ''} />
                        
                        <div className="mt-4 text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg">
                          <h4 className="font-medium mb-2">Скоро будут доступны:</h4>
                          <ul className="space-y-1">
                            <li>• Apple Health - импорт данных о здоровье</li>
                            <li>• Google Fit - синхронизация активности</li>
                            <li>• Fitbit - данные тренировок и сна</li>
                          </ul>
                        </div>
                      </div>
                    </TabsContent>

                    <Button onClick={addMeasurement} className="w-full bg-gradient-primary hover:opacity-90">
                      <Plus className="h-4 w-4 mr-2" />
                      Добавить измерение
                    </Button>
                  </Tabs>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Сетка целей */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {goals.map((goal, index) => {
            const progress = getProgressPercentage(goal);
            const trend = getTrend(goal);
            const latestMeasurement = goal.measurements?.[0];

            return (
              <FitnessCard 
                key={goal.id} 
                className="p-6 animate-fade-in hover-scale transition-all duration-300"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{goal.goal_name}</h3>
                      <Badge className={getGoalTypeColor(goal.goal_type)}>
                        {goal.goal_type}
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
                    <div className="pt-2 border-t border-border/50">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(latestMeasurement.measurement_date), 'dd MMM yyyy', { locale: ru })}
                      </div>
                    </div>
                  )}
                </div>
              </FitnessCard>
            );
          })}
        </div>

        {/* Галерея прогресса */}
        <ProgressGallery />

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