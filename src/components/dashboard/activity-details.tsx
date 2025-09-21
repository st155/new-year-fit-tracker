import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Activity, Zap, Target, Clock, TrendingUp, TrendingDown } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ActivityData {
  strain: number | null;
  calories: number | null;
  steps: number | null;
  active_time: number | null;
  date: string;
}

interface ActivityDetailsProps {
  selectedDate: Date;
}

export const ActivityDetails = ({ selectedDate }: ActivityDetailsProps) => {
  const { user } = useAuth();
  const [activityData, setActivityData] = useState<ActivityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchActivityData();
    }
  }, [user, selectedDate]);

  const fetchActivityData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Получаем данные за последние 7 дней
      const endDate = format(selectedDate, 'yyyy-MM-dd');
      const startDate = format(new Date(selectedDate.getTime() - 6 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd');

      const { data } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner (
            metric_name,
            metric_category
          )
        `)
        .eq('user_id', user.id)
        .gte('measurement_date', startDate)
        .lte('measurement_date', endDate)
        .in('user_metrics.metric_name', ['Workout Strain', 'Calories', 'Total Kilocalories', 'Workout Calories', 'Steps', 'Количество шагов', 'Active Time'])
        .order('measurement_date', { ascending: false });

      // Группируем данные по датам
      const groupedData: { [key: string]: Partial<ActivityData> } = {};
      
      data?.forEach((item: any) => {
        const date = item.measurement_date;
        if (!groupedData[date]) {
          groupedData[date] = { date };
        }

        switch (item.user_metrics.metric_name) {
          case 'Workout Strain':
            groupedData[date].strain = item.value;
            break;
          case 'Calories':
          case 'Total Kilocalories':
          case 'Workout Calories':
            groupedData[date].calories = (groupedData[date].calories || 0) + item.value;
            break;
          case 'Steps':
          case 'Количество шагов':
            groupedData[date].steps = item.value;
            break;
          case 'Active Time':
            groupedData[date].active_time = item.value;
            break;
        }
      });

      const formattedData = Object.values(groupedData) as ActivityData[];
      setActivityData(formattedData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    } catch (error) {
      console.error('Error fetching activity data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStrainLevel = (strain: number | null) => {
    if (!strain) return { label: 'Нет данных', color: 'secondary' };
    if (strain >= 15) return { label: 'Высокая', color: 'destructive' };
    if (strain >= 10) return { label: 'Умеренная', color: 'warning' };
    return { label: 'Легкая', color: 'success' };
  };

  const getActivityLevel = (steps: number | null) => {
    if (!steps) return { label: 'Нет данных', color: 'secondary' };
    if (steps >= 10000) return { label: 'Активный день', color: 'success' };
    if (steps >= 5000) return { label: 'Умеренная активность', color: 'warning' };
    return { label: 'Низкая активность', color: 'destructive' };
  };

  const getTrend = (current: number | null, previous: number | null) => {
    if (!current || !previous) return null;
    const change = current - previous;
    const threshold = current > 100 ? current * 0.05 : 5; // 5% change or minimum 5 units
    if (Math.abs(change) < threshold) return null;
    return change > 0 ? 'up' : 'down';
  };

  if (loading) {
    return <div className="text-center py-8">Загрузка данных активности...</div>;
  }

  const todayData = activityData[0];
  const yesterdayData = activityData[1];

  return (
    <div className="space-y-6">
      {/* Основные показатели активности */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Нагрузка</CardTitle>
              <Zap className="h-4 w-4 text-yellow-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {todayData?.strain ? todayData.strain.toFixed(1) : '—'}
                </span>
                {getTrend(todayData?.strain, yesterdayData?.strain) && (
                  getTrend(todayData?.strain, yesterdayData?.strain) === 'up' ? 
                    <TrendingUp className="h-4 w-4 text-red-500" /> :
                    <TrendingDown className="h-4 w-4 text-green-500" />
                )}
              </div>
              <Progress 
                value={todayData?.strain ? Math.min(100, (todayData.strain / 20) * 100) : 0} 
                autoColor 
                className="h-2" 
              />
              <Badge variant={getStrainLevel(todayData?.strain).color === 'success' ? 'default' : getStrainLevel(todayData?.strain).color as any}>
                {getStrainLevel(todayData?.strain).label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Калории</CardTitle>
              <Target className="h-4 w-4 text-orange-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {todayData?.calories ? Math.round(todayData.calories) : '—'}
                </span>
                {getTrend(todayData?.calories, yesterdayData?.calories) && (
                  getTrend(todayData?.calories, yesterdayData?.calories) === 'up' ? 
                    <TrendingUp className="h-4 w-4 text-green-500" /> :
                    <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <Progress 
                value={todayData?.calories ? Math.min(100, (todayData.calories / 3000) * 100) : 0} 
                autoColor 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">ккал</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Шаги</CardTitle>
              <Activity className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {todayData?.steps ? todayData.steps.toLocaleString() : '—'}
                </span>
                {getTrend(todayData?.steps, yesterdayData?.steps) && (
                  getTrend(todayData?.steps, yesterdayData?.steps) === 'up' ? 
                    <TrendingUp className="h-4 w-4 text-green-500" /> :
                    <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <Progress 
                value={todayData?.steps ? Math.min(100, (todayData.steps / 10000) * 100) : 0} 
                autoColor 
                className="h-2" 
              />
              <Badge variant={getActivityLevel(todayData?.steps).color === 'success' ? 'default' : getActivityLevel(todayData?.steps).color as any}>
                {getActivityLevel(todayData?.steps).label}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Активное время</CardTitle>
              <Clock className="h-4 w-4 text-green-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold">
                  {todayData?.active_time ? Math.round(todayData.active_time) : '—'}
                </span>
                {getTrend(todayData?.active_time, yesterdayData?.active_time) && (
                  getTrend(todayData?.active_time, yesterdayData?.active_time) === 'up' ? 
                    <TrendingUp className="h-4 w-4 text-green-500" /> :
                    <TrendingDown className="h-4 w-4 text-red-500" />
                )}
              </div>
              <Progress 
                value={todayData?.active_time ? Math.min(100, (todayData.active_time / 120) * 100) : 0} 
                autoColor 
                className="h-2" 
              />
              <p className="text-xs text-muted-foreground">мин</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* История активности */}
      <Card>
        <CardHeader>
          <CardTitle>История активности</CardTitle>
          <CardDescription>
            Динамика активности за последние 7 дней
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activityData.map((data, index) => (
              <div key={data.date} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="text-sm font-medium min-w-[100px]">
                    {format(new Date(data.date), 'd MMM', { locale: ru })}
                  </div>
                  <div className="flex items-center gap-4">
                    {data.strain && (
                      <div className="flex items-center gap-2">
                        <Zap className="h-3 w-3 text-yellow-500" />
                        <span className="text-sm">{data.strain.toFixed(1)}</span>
                      </div>
                    )}
                    {data.calories && (
                      <div className="flex items-center gap-2">
                        <Target className="h-3 w-3 text-orange-500" />
                        <span className="text-sm">{Math.round(data.calories)} ккал</span>
                      </div>
                    )}
                    {data.steps && (
                      <div className="flex items-center gap-2">
                        <Activity className="h-3 w-3 text-blue-500" />
                        <span className="text-sm">{data.steps.toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Badge variant={getStrainLevel(data.strain).color === 'success' ? 'default' : getStrainLevel(data.strain).color as any} className="text-xs">
                    {getStrainLevel(data.strain).label}
                  </Badge>
                  <Badge variant={getActivityLevel(data.steps).color === 'success' ? 'default' : getActivityLevel(data.steps).color as any} className="text-xs">
                    {getActivityLevel(data.steps).label}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};