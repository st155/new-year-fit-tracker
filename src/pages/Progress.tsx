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
import { WeightProgressDetail } from "@/components/detail/WeightProgressDetail";
import { BodyFatProgressDetail } from "@/components/detail/BodyFatProgressDetail";
import { VO2MaxProgressDetail } from "@/components/detail/VO2MaxProgressDetail";
import { PullUpsProgressDetail } from "@/components/detail/PullUpsProgressDetail";
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
import { ProgressChart } from "@/components/ui/progress-chart";

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
  const [bodyFatData, setBodyFatData] = useState<{ current: number | null; target: number; change: number | null }>({ current: null, target: 11, change: null });
  const [dateFilter, setDateFilter] = useState("all");
  const [goalTypeFilter, setGoalTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("recent");
  const [selectedPeriod, setSelectedPeriod] = useState("3M");
  const [viewingDetailType, setViewingDetailType] = useState<string | null>(null);

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
    fetchBodyFatData();
  }, [user]);

  const fetchGoalsAndMeasurements = async () => {
    if (!user) return;
    
    try {
      const { data: goalsData, error: goalsError } = await supabase
        .from('goals')
        .select('id, goal_name, goal_type, target_value, target_unit')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (goalsError) throw goalsError;

      const { data: measurementsData, error: measurementsError } = await supabase
        .from('measurements')
        .select('*')
        .eq('user_id', user.id)
        .order('measurement_date', { ascending: false });

      if (measurementsError) throw measurementsError;

      const goalsWithMeasurements = (goalsData || []).map(goal => ({
        ...goal,
        measurements: (measurementsData || []).filter(m => m.goal_id === goal.id).sort((a, b) => 
          new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime()
        )
      }));

      setGoals(goalsWithMeasurements);
      setMeasurements(measurementsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Ошибка загрузки данных",
        description: "Не удалось загрузить данные",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentWeight = async () => {
    if (!user) return;

    try {
      const { data: withingsData } = await supabase
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

      const { data: bodyCompositionData } = await supabase
        .from('body_composition')
        .select('weight, measurement_date')
        .eq('user_id', user.id)
        .not('weight', 'is', null)
        .order('measurement_date', { ascending: false })
        .limit(2);

      if (bodyCompositionData && bodyCompositionData.length > 0) {
        const currentWeight = bodyCompositionData[0].weight;
        const previousWeight = bodyCompositionData[1]?.weight;
        const change = previousWeight ? currentWeight - previousWeight : undefined;
        
        setWeightData({
          weight: currentWeight,
          date: bodyCompositionData[0].measurement_date,
          change
        });
        return;
      }

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

  const fetchBodyFatData = async () => {
    if (!user) return;

    try {
      const { data: withingsBodyFat } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, unit, source)
        `)
        .eq('user_id', user.id)
        .eq('user_metrics.metric_name', 'Процент жира')
        .eq('user_metrics.source', 'withings')
        .order('measurement_date', { ascending: false })
        .limit(10);

      const { data: bodyComposition } = await supabase
        .from('body_composition')
        .select('body_fat_percentage, measurement_date')
        .eq('user_id', user.id)
        .order('measurement_date', { ascending: false })
        .limit(2);

      const { data: bodyFatGoal } = await supabase
        .from('goals')
        .select('target_value')
        .eq('user_id', user.id)
        .ilike('goal_name', '%жир%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let bodyFatChange = null;
      let currentBodyFat = null;

      if (withingsBodyFat && withingsBodyFat.length > 0) {
        currentBodyFat = withingsBodyFat[0].value;
        if (withingsBodyFat.length > 1) {
          const current = withingsBodyFat[0].value;
          const previous = withingsBodyFat[1].value;
          bodyFatChange = Math.round(((previous - current) / current) * 100);
        }
      } else if (bodyComposition && bodyComposition.length > 0 && bodyComposition[0].body_fat_percentage) {
        currentBodyFat = bodyComposition[0].body_fat_percentage;
        if (bodyComposition.length > 1 && bodyComposition[1].body_fat_percentage) {
          const current = bodyComposition[0].body_fat_percentage;
          const previous = bodyComposition[1].body_fat_percentage;
          bodyFatChange = Math.round(((previous - current) / current) * 100);
        }
      }

      setBodyFatData({
        current: currentBodyFat,
        target: bodyFatGoal?.target_value || 11,
        change: bodyFatChange
      });
    } catch (error) {
      console.error('Error fetching body fat data:', error);
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
    
    if (goal.goal_type === 'body_composition' || 
        goal.goal_name.toLowerCase().includes('жир') || 
        goal.goal_name.toLowerCase().includes('вес')) {
      
      if (latestMeasurement.value <= goal.target_value) {
        return 100;
      } else {
        const deviation = ((latestMeasurement.value - goal.target_value) / goal.target_value) * 100;
        return Math.max(0, Math.round(100 - deviation));
      }
    }
    
    const progress = (latestMeasurement.value / goal.target_value) * 100;
    return Math.min(100, Math.max(0, Math.round(progress)));
  };

  const getFilteredGoals = () => {
    let filtered = goals;

    if (goalTypeFilter !== "all") {
      filtered = filtered.filter(goal => goal.goal_type === goalTypeFilter);
    }

    if (dateFilter !== "all") {
      const now = new Date();
      filtered = filtered.filter(goal => {
        if (!goal.measurements || goal.measurements.length === 0) return false;
        const lastMeasurement = new Date(goal.measurements[0].measurement_date);
        
        switch (dateFilter) {
          case "week":
            return (now.getTime() - lastMeasurement.getTime()) <= 7 * 24 * 60 * 60 * 1000;
          case "month":
            return (now.getTime() - lastMeasurement.getTime()) <= 30 * 24 * 60 * 60 * 1000;
          case "quarter":
            return (now.getTime() - lastMeasurement.getTime()) <= 90 * 24 * 60 * 60 * 1000;
          default:
            return true;
        }
      });
    }

    filtered.sort((a, b) => {
      switch (sortBy) {
        case "progress":
          return getProgressPercentage(b) - getProgressPercentage(a);
        case "name":
          return a.goal_name.localeCompare(b.goal_name);
        case "recent":
        default:
          const aDate = a.measurements?.[0]?.measurement_date || '1970-01-01';
          const bDate = b.measurements?.[0]?.measurement_date || '1970-01-01';
          return new Date(bDate).getTime() - new Date(aDate).getTime();
      }
    });

    return filtered;
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
        <div className="space-y-8 pb-8">
          <div className="px-4">
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
      </div>
    );
  }

  if (viewingGoalDetail) {
    return (
      <div className="min-h-screen bg-background">
        <div className="space-y-8 pb-8">
          <div className="px-4">
            <GoalProgressDetail 
              goal={viewingGoalDetail} 
              onBack={() => setViewingGoalDetail(null)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (viewingDetailType) {
    console.log('Showing detail view for:', viewingDetailType);
    const onBack = () => {
      console.log('Back button clicked, returning to main view');
      setViewingDetailType(null);
    };
    
    return (
      <div className="min-h-screen bg-background">
        <div className="space-y-8 pb-8">
          <div className="px-4">
            {viewingDetailType === 'weight' && <WeightProgressDetail onBack={onBack} />}
            {viewingDetailType === 'body_fat' && <BodyFatProgressDetail onBack={onBack} />}
            {viewingDetailType === 'vo2_max' && <VO2MaxProgressDetail onBack={onBack} />}
            {viewingDetailType === 'pull_ups' && <PullUpsProgressDetail onBack={onBack} />}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="space-y-8 pb-8">
        {/* Заголовок */}
        <div className="px-4 py-3">
          <div className="bg-card/50 rounded-lg px-4 py-3 border border-border/50">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Progress Tracking
                </h1>
                <p className="text-muted-foreground mt-2 text-sm sm:text-base">
                  Monitor your fitness journey and celebrate your achievements
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
                          <Label htmlFor="notes">Заметки (необязательно)</Label>
                          <Textarea
                            id="notes"
                            placeholder="Дополнительная информация..."
                            value={measurementForm.notes}
                            onChange={(e) => setMeasurementForm(prev => ({ ...prev, notes: e.target.value }))}
                          />
                        </div>

                        <Button onClick={addMeasurement} className="w-full">
                          Добавить измерение
                        </Button>
                      </TabsContent>

                      <TabsContent value="photo" className="space-y-4">
                        <AIPhotoUpload />
                      </TabsContent>

                      <TabsContent value="integrations" className="space-y-4 max-h-[50vh] sm:max-h-[60vh] overflow-y-auto">
                        <div className="space-y-4 pr-2">
                          <WhoopIntegration userId={user?.id || ''} />
                          <AppleHealthIntegration />
                          <AppleHealthUpload />
                          <GarminIntegration userId={user?.id || ''} />
                          
                          <div className="bg-blue-50 p-4 rounded-lg text-sm">
                            <h4 className="font-semibold mb-2">Как работают интеграции:</h4>
                            <ul className="space-y-1 text-muted-foreground">
                              <li>• Данные загружаются автоматически в фоновом режиме</li>
                              <li>• Измерения добавляются к соответствующим целям</li>
                              <li>• Можно комбинировать ручной ввод и интеграции</li>
                              <li>• История сохраняется и синхронизируется</li>
                            </ul>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="manual-photo" className="space-y-4">
                        <PhotoUpload 
                          onPhotoUploaded={(url) => {
                            setMeasurementForm(prev => ({ ...prev, photo_url: url }));
                            toast({
                              title: "Фото загружено!",
                              description: "Фото добавлено к измерению",
                            });
                          }}
                        />
                        <div className="bg-green-50 p-4 rounded-lg text-sm">
                          <h4 className="font-semibold mb-2">Фото прогресса:</h4>
                          <ul className="space-y-1 text-muted-foreground">
                            <li>• Делайте фото в одинаковых условиях</li>
                            <li>• Одинаковое освещение и ракурс</li>
                            <li>• Фиксируйте изменения каждую неделю</li>
                            <li>• Данные автоматически разделяются между целями и общей статистикой</li>
                            <li>• Интеграции работают в фоновом режиме</li>
                          </ul>
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
        </div>

        {/* Period Filter */}
        <div className="px-4">
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-sm text-muted-foreground flex items-center">Period:</span>
            {["1M", "3M", "6M", "1Y"].map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPeriod(period)}
                className="h-8 px-3 text-xs"
              >
                {period}
              </Button>
            ))}
          </div>
        </div>

        {/* This Month's Highlights */}
        <div className="px-4">
          <Card className="bg-gradient-primary border-primary/30 text-primary-foreground mb-6">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trophy className="h-5 w-5" />
                This Month's Highlights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <div 
                  className="space-y-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setViewingDetailType('weight')}
                >
                  <div className="text-xl md:text-2xl font-bold">
                    {weightData?.change ? `${Math.abs(weightData.change).toFixed(1)}kg` : '5.2kg'}
                  </div>
                  <div className="text-xs md:text-sm opacity-90">Weight Lost</div>
                </div>
                <div 
                  className="space-y-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setViewingDetailType('body_fat')}
                >
                  <div className="text-xl md:text-2xl font-bold">
                    {bodyFatData?.change ? `${Math.abs(bodyFatData.change)}%` : '2.1%'}
                  </div>
                  <div className="text-xs md:text-sm opacity-90">Body Fat Reduced</div>
                </div>
                <div 
                  className="space-y-2 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => setViewingDetailType('pull_ups')}
                >
                  <div className="text-xl md:text-2xl font-bold">7</div>
                  <div className="text-xs md:text-sm opacity-90">PRs Hit</div>
                </div>
                <div className="space-y-2">
                  <div className="text-xl md:text-2xl font-bold">24</div>
                  <div className="text-xs md:text-sm opacity-90">Workouts Completed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Metric Cards */}
        <div className="px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {/* Weight Loss Card */}
            <Card 
              className="cursor-pointer hover-scale transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50"
              onClick={() => {
                console.log('Weight Loss card clicked');
                setViewingDetailType('weight');
              }}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Weight Loss</h3>
                    <Badge variant="destructive" className="text-xs">
                      ↓ 4.2%
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-foreground">
                      {weightData?.weight ? `${weightData.weight.toFixed(0)}` : '72'} <span className="text-lg text-muted-foreground">kg</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress to goal</span>
                        <span className="font-medium">103%</span>
                      </div>
                      <Progress value={103} className="h-2" />
                      <div className="text-sm text-muted-foreground">
                        Target: 70 kg
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Body Fat Card */}
            <Card 
              className="cursor-pointer hover-scale transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50"
              onClick={() => {
                console.log('Body Fat card clicked');
                setViewingDetailType('body_fat');
              }}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">Body Fat</h3>
                    <Badge variant="destructive" className="text-xs">
                      ↓ 8.1%
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-foreground">
                      {bodyFatData?.current ? `${bodyFatData.current.toFixed(1)}` : '18.5'} <span className="text-lg text-muted-foreground">%</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress to goal</span>
                        <span className="font-medium">123%</span>
                      </div>
                      <Progress value={123} className="h-2" />
                      <div className="text-sm text-muted-foreground">
                        Target: 15 %
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* VO2 Max Card */}
            <Card 
              className="cursor-pointer hover-scale transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50"
              onClick={() => {
                console.log('VO2 Max card clicked');
                setViewingDetailType('vo2_max');
              }}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">VO₂ Max</h3>
                    <Badge variant="destructive" className="text-xs">
                      ↓ 12.5%
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-foreground">
                      52 <span className="text-lg text-muted-foreground">ml/kg/min</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress to goal</span>
                        <span className="font-medium">95%</span>
                      </div>
                      <Progress value={95} className="h-2" />
                      <div className="text-sm text-muted-foreground">
                        Target: 55 ml/kg/min
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 2KM Row Card */}
            <Card 
              className="cursor-pointer hover-scale transition-all duration-300 bg-card/50 backdrop-blur-sm border-border/50"
              onClick={() => {
                console.log('2KM Row card clicked');
                setViewingDetailType('pull_ups');
              }}
            >
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">2KM Row</h3>
                    <Badge variant="destructive" className="text-xs">
                      ↓ 3.8%
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-3xl font-bold text-foreground">
                      445 <span className="text-lg text-muted-foreground">sec</span>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress to goal</span>
                        <span className="font-medium">106%</span>
                      </div>
                      <Progress value={106} className="h-2" />
                      <div className="text-sm text-muted-foreground">
                        Target: 420 sec
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <div className="px-4 space-y-6">
          {/* Контроль веса и состава тела */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <div onClick={() => setViewingDetailType('weight')} className="cursor-pointer">
              <WeightTracker />
            </div>
            
            {/* Карточка процента жира */}
            <FitnessCard 
              variant="gradient" 
              className="p-6 cursor-pointer hover-scale"
              onClick={() => setViewingDetailType('body_fat')}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Target className="h-4 w-4 text-current opacity-80" />
                    <p className="text-sm font-medium opacity-90">Процент жира</p>
                    {bodyFatData.current && (
                      <Badge variant="secondary" className="text-xs">Withings</Badge>
                    )}
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-current">
                        {bodyFatData.current ? bodyFatData.current.toFixed(1) : '--'}
                      </span>
                      <span className="text-sm opacity-80">%</span>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs opacity-70">
                        цель: {bodyFatData.target}%
                      </span>
                      {bodyFatData.change !== null && (
                        <Badge 
                          variant={bodyFatData.change < 0 ? "secondary" : "destructive"} 
                          className="text-xs"
                        >
                          {bodyFatData.change > 0 ? '+' : ''}{bodyFatData.change}%
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </FitnessCard>
          </div>

          {/* Фильтры и сортировка */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <Select value={goalTypeFilter} onValueChange={setGoalTypeFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Тип цели" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все типы</SelectItem>
                <SelectItem value="strength">Сила</SelectItem>
                <SelectItem value="cardio">Кардио</SelectItem>
                <SelectItem value="endurance">Выносливость</SelectItem>
                <SelectItem value="body_composition">Состав тела</SelectItem>
              </SelectContent>
            </Select>

            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Период" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Все время</SelectItem>
                <SelectItem value="week">Последняя неделя</SelectItem>
                <SelectItem value="month">Последний месяц</SelectItem>
                <SelectItem value="quarter">Последние 3 месяца</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Сортировка" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">По дате измерения</SelectItem>
                <SelectItem value="progress">По прогрессу</SelectItem>
                <SelectItem value="name">По названию</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Отображение целей */}
          {getFilteredGoals().length === 0 ? (
            <EmptyState
              icon={<Trophy className="h-16 w-16" />}
              title="Цели не найдены"
              description="Создайте свою первую цель, чтобы начать отслеживать прогресс."
              action={{
                label: "Создать цель",
                onClick: () => navigate('/goals/create')
              }}
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {getFilteredGoals().map((goal, index) => {
                const progress = getProgressPercentage(goal);
                const trend = getTrend(goal);
                const latestMeasurement = goal.measurements?.[0];
                
                return (
                  <FitnessCard 
                    key={goal.id} 
                    variant="default"
                    className="animate-fade-in cursor-pointer hover-scale p-3 md:p-4"
                    style={{ animationDelay: `${index * 100}ms` }}
                    onClick={() => setViewingGoalDetail(goal)}
                  >
                    <div className="space-y-2 md:space-y-3">
                      <div className="space-y-1">
                        <div className="flex items-center gap-1 mb-1">
                          <Target className="h-3 w-3 md:h-4 md:w-4 text-primary" />
                          <h3 className="text-xs md:text-sm font-semibold text-foreground truncate">
                            {goal.goal_name}
                          </h3>
                        </div>
                        <Badge className={`text-[10px] md:text-xs h-4 px-1 ${getGoalTypeColor(goal.goal_type)}`}>
                          {goal.goal_type}
                        </Badge>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-baseline justify-center gap-1">
                          <span className="text-lg md:text-xl font-bold text-foreground">
                            {latestMeasurement ? latestMeasurement.value : '--'}
                          </span>
                          <span className="text-[10px] md:text-xs text-muted-foreground">
                            {goal.target_unit}
                          </span>
                        </div>
                        <div className="text-[10px] md:text-xs text-muted-foreground">
                          цель: {goal.target_value}
                        </div>
                      </div>

                      <Progress value={progress} className="h-1.5 md:h-2" />

                      <div className="flex items-center justify-between">
                        <span className="text-[10px] md:text-xs text-muted-foreground">
                          {progress}%
                        </span>
                        
                        <div className="flex items-center gap-1">
                          {trend && (
                            <div className={`flex items-center ${
                              (goal.goal_type === 'body_composition' || 
                               goal.goal_name.toLowerCase().includes('жир') ||
                               goal.goal_name.toLowerCase().includes('вес'))
                                ? (trend === 'down' ? 'text-success' : 'text-destructive')
                                : (trend === 'up' ? 'text-success' : 'text-destructive')
                            }`}>
                              {((goal.goal_type === 'body_composition' || 
                                 goal.goal_name.toLowerCase().includes('жир') ||
                                 goal.goal_name.toLowerCase().includes('вес'))
                                ? (trend === 'down' ? <TrendingDown className="h-2.5 w-2.5 md:h-3 md:w-3" /> : <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" />)
                                : (trend === 'up' ? <TrendingUp className="h-2.5 w-2.5 md:h-3 md:w-3" /> : <TrendingDown className="h-2.5 w-2.5 md:h-3 md:w-3" />)
                              )}
                            </div>
                          )}
                          
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 md:h-7 md:w-7"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickMeasurementGoal(goal);
                            }}
                          >
                            <Plus className="h-2.5 w-2.5 md:h-3 md:w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </FitnessCard>
                );
              })}
            </div>
          )}

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
    </div>
  );
};

export default ProgressPage;