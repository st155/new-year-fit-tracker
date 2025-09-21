import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  Activity, 
  Moon, 
  Zap, 
  TrendingUp, 
  Clock,
  Calendar,
  Target,
  Users,
  Settings,
  ChevronRight,
  Loader2
} from 'lucide-react';
import { WhoopMetrics } from '@/components/dashboard/whoop-metrics';
import { RecoveryDetails } from '@/components/dashboard/recovery-details';
import { ActivityDetails } from '@/components/dashboard/activity-details';
import { TrendsAnalysis } from '@/components/dashboard/trends-analysis';
import { HomeButton } from '@/components/ui/home-button';
import { format, isToday, isYesterday, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { AppleHealthSummary } from '@/components/dashboard/apple-health-summary';

interface MetricValue {
  id: string;
  value: number;
  measurement_date: string;
  user_metrics: {
    metric_name: string;
    metric_category: string;
    unit: string;
    source: string;
  };
}

interface TodayStats {
  recovery: number | null;
  sleep: number | null;
  strain: number | null;
  calories: number | null;
  steps: number | null;
  heartRate: number | null;
}

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [todayStats, setTodayStats] = useState<TodayStats>({
    recovery: null,
    sleep: null,
    strain: null,
    calories: null,
    steps: null,
    heartRate: null
  });
  const [weeklyData, setWeeklyData] = useState<MetricValue[]>([]);
  const [appleHealthData, setAppleHealthData] = useState<any>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());

  useEffect(() => {
    if (user) {
      fetchDashboardData();
      fetchAppleHealthData();
    }
  }, [user, selectedDate]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Получаем данные за сегодня
      const today = format(selectedDate, 'yyyy-MM-dd');
      const { data: todayData } = await supabase
        .from('metric_values')
        .select(`
          id,
          value,
          measurement_date,
          user_metrics!inner (
            metric_name,
            metric_category,
            unit,
            source
          )
        `)
        .eq('user_id', user.id)
        .eq('measurement_date', today)
        .order('created_at', { ascending: false });

      // Получаем данные за неделю для трендов
      const weekAgo = new Date(selectedDate);
      weekAgo.setDate(weekAgo.getDate() - 6);
      
      const { data: weekData } = await supabase
        .from('metric_values')
        .select(`
          id,
          value,
          measurement_date,
          user_metrics!inner (
            metric_name,
            metric_category,
            unit,
            source
          )
        `)
        .eq('user_id', user.id)
        .gte('measurement_date', format(weekAgo, 'yyyy-MM-dd'))
        .lte('measurement_date', today)
        .order('measurement_date', { ascending: true });

      setWeeklyData(weekData || []);

      // Обрабатываем сегодняшние данные
      const stats: TodayStats = {
        recovery: null,
        sleep: null,
        strain: null,
        calories: null,
        steps: null,
        heartRate: null
      };

      todayData?.forEach((item: any) => {
        const metric = item.user_metrics;
        
        switch (metric.metric_name) {
          case 'Recovery Score':
            stats.recovery = item.value;
            break;
          case 'Sleep Efficiency':
          case 'Sleep Performance':
            stats.sleep = item.value;
            break;
          case 'Workout Strain':
            stats.strain = item.value;
            break;
          case 'Workout Calories':
          case 'Calories':
          case 'Total Kilocalories':
            stats.calories = (stats.calories || 0) + item.value;
            break;
          case 'Steps':
          case 'Количество шагов':
            stats.steps = item.value;
            break;
          case 'Average Heart Rate':
          case 'Avg Heart Rate':
          case 'Пульс/ЧСС':
            stats.heartRate = item.value;
            break;
        }
      });

      setTodayStats(stats);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAppleHealthData = async () => {
    if (!user) return;

    try {
      const today = format(selectedDate, 'yyyy-MM-dd');
      
      // Получаем агрегированные данные Apple Health за сегодня
      const { data: dailySummary } = await supabase
        .from('daily_health_summary')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (dailySummary) {
        setAppleHealthData(dailySummary);
        
        // Обогащаем основные статистики данными Apple Health
        setTodayStats(prev => ({
          ...prev,
          steps: prev.steps || dailySummary.steps,
          heartRate: prev.heartRate || dailySummary.heart_rate_avg,
          calories: prev.calories || dailySummary.active_calories
        }));
      }

    } catch (error) {
      console.error('Error fetching Apple Health data:', error);
    }
  };

  const getStatusColor = (value: number | null, type: string) => {
    if (value === null) return 'text-muted-foreground';
    
    switch (type) {
      case 'recovery':
        if (value >= 75) return 'text-green-500';
        if (value >= 50) return 'text-yellow-500';
        return 'text-red-500';
      case 'sleep':
        if (value >= 85) return 'text-green-500';
        if (value >= 70) return 'text-yellow-500';
        return 'text-red-500';
      case 'strain':
        if (value >= 15) return 'text-red-500';
        if (value >= 10) return 'text-yellow-500';
        return 'text-green-500';
      default:
        return 'text-primary';
    }
  };

  const getMetricTrend = (metricName: string) => {
    const metricData = weeklyData.filter(item => 
      item.user_metrics.metric_name === metricName
    );
    
    if (metricData.length < 2) return 0;
    
    const recent = metricData.slice(-2);
    const change = recent[1].value - recent[0].value;
    const percentage = (change / recent[0].value) * 100;
    
    return percentage;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isCurrentDate = isToday(selectedDate);
  const isYesterdayDate = isYesterday(selectedDate);
  
  let dateLabel = format(selectedDate, 'd MMMM yyyy', { locale: ru });
  if (isCurrentDate) dateLabel = 'Сегодня';
  else if (isYesterdayDate) dateLabel = 'Вчера';

  return (
    <div className="min-h-screen bg-background">
      <HomeButton />
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Фитнес Дашборд</h1>
              <p className="text-muted-foreground">
                {dateLabel} • Объединенные данные всех трекеров
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}
              >
                ← Предыдущий день
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                disabled={isCurrentDate}
              >
                Сегодня
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() + 24 * 60 * 60 * 1000))}
                disabled={isCurrentDate}
              >
                Следующий день →
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="whoop">Whoop</TabsTrigger>
            <TabsTrigger value="recovery">Восстановление</TabsTrigger>
            <TabsTrigger value="activity">Активность</TabsTrigger>
            <TabsTrigger value="trends">Тренды</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Главные показатели */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Recovery Card */}
              <Card className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Восстановление</CardTitle>
                    <Heart className={`h-4 w-4 ${getStatusColor(todayStats.recovery, 'recovery')}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      {todayStats.recovery !== null ? (
                        <>
                          <span className="text-3xl font-bold">{Math.round(todayStats.recovery)}</span>
                          <span className="text-sm text-muted-foreground">%</span>
                        </>
                      ) : (
                        <span className="text-2xl text-muted-foreground">—</span>
                      )}
                    </div>
                    <Progress value={todayStats.recovery || 0} autoColor className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {todayStats.recovery !== null ? 
                        (todayStats.recovery >= 75 ? 'Отличное' : 
                         todayStats.recovery >= 50 ? 'Хорошее' : 'Требует отдыха') : 
                        'Нет данных'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Sleep Card */}
              <Card className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Сон</CardTitle>
                    <Moon className={`h-4 w-4 ${getStatusColor(todayStats.sleep, 'sleep')}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      {todayStats.sleep !== null ? (
                        <>
                          <span className="text-3xl font-bold">{Math.round(todayStats.sleep)}</span>
                          <span className="text-sm text-muted-foreground">%</span>
                        </>
                      ) : (
                        <span className="text-2xl text-muted-foreground">—</span>
                      )}
                    </div>
                    <Progress value={todayStats.sleep || 0} autoColor className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {todayStats.sleep !== null ? 
                        (todayStats.sleep >= 85 ? 'Отличный сон' : 
                         todayStats.sleep >= 70 ? 'Хороший сон' : 'Недостаточно') : 
                        'Нет данных'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Strain Card */}
              <Card className="relative overflow-hidden">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Нагрузка</CardTitle>
                    <Zap className={`h-4 w-4 ${getStatusColor(todayStats.strain, 'strain')}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-baseline gap-2">
                      {todayStats.strain !== null ? (
                        <span className="text-3xl font-bold">{todayStats.strain.toFixed(1)}</span>
                      ) : (
                        <span className="text-2xl text-muted-foreground">—</span>
                      )}
                    </div>
                    <Progress value={todayStats.strain ? Math.min(100, (todayStats.strain / 20) * 100) : 0} autoColor className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {todayStats.strain !== null ? 
                        (todayStats.strain >= 15 ? 'Высокая' : 
                         todayStats.strain >= 10 ? 'Умеренная' : 'Легкая') : 
                        'Нет данных'}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Дополнительные метрики */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Калории</CardTitle>
                    <Target className="h-4 w-4 text-orange-500" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    {todayStats.calories !== null ? (
                      <>
                        <span className="text-2xl font-bold">{Math.round(todayStats.calories)}</span>
                        <span className="text-sm text-muted-foreground">ккал</span>
                      </>
                    ) : (
                      <span className="text-xl text-muted-foreground">—</span>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Шаги</CardTitle>
                    <Activity className="h-4 w-4 text-blue-500" />
                  </div>
                  {appleHealthData?.steps && (
                    <Badge variant="secondary" className="w-fit">
                      🍎 Apple Health
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    {todayStats.steps !== null ? (
                      <span className="text-2xl font-bold">{todayStats.steps.toLocaleString()}</span>
                    ) : (
                      <span className="text-xl text-muted-foreground">—</span>
                    )}
                  </div>
                  {appleHealthData?.steps && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Цель: {Math.round((todayStats.steps || 0) / 10000 * 100)}% от 10К
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium">Пульс</CardTitle>
                    <Heart className="h-4 w-4 text-red-500" />
                  </div>
                  {appleHealthData?.heart_rate_avg && (
                    <Badge variant="secondary" className="w-fit">
                      🍎 Apple Health
                    </Badge>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-2">
                    {todayStats.heartRate !== null ? (
                      <>
                        <span className="text-2xl font-bold">{Math.round(todayStats.heartRate)}</span>
                        <span className="text-sm text-muted-foreground">bpm</span>
                      </>
                    ) : (
                      <span className="text-xl text-muted-foreground">—</span>
                    )}
                  </div>
                  {appleHealthData?.heart_rate_min && appleHealthData?.heart_rate_max && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Диапазон: {Math.round(appleHealthData.heart_rate_min)}—{Math.round(appleHealthData.heart_rate_max)} bpm
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Быстрые действия */}
            <Card>
              <CardHeader>
                <CardTitle>Быстрые действия</CardTitle>
                <CardDescription>
                  Управляйте своими данными и интеграциями
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <Button variant="outline" className="justify-start">
                    <Clock className="mr-2 h-4 w-4" />
                    Добавить измерение
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Users className="mr-2 h-4 w-4" />
                    Мои интеграции
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <TrendingUp className="mr-2 h-4 w-4" />
                    Посмотреть прогресс
                  </Button>
                  <Button variant="outline" className="justify-start">
                    <Settings className="mr-2 h-4 w-4" />
                    Настройки
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Apple Health Summary */}
            <AppleHealthSummary />
          </TabsContent>

          <TabsContent value="whoop" className="space-y-6">
            <WhoopMetrics selectedDate={selectedDate} />
          </TabsContent>

          <TabsContent value="recovery">
            <RecoveryDetails selectedDate={selectedDate} />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityDetails selectedDate={selectedDate} />
          </TabsContent>

          <TabsContent value="trends">
            <TrendsAnalysis selectedDate={selectedDate} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Dashboard;