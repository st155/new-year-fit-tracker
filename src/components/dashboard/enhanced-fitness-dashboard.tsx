import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Heart, 
  Activity, 
  Moon, 
  Zap, 
  TrendingUp, 
  TrendingDown,
  Target,
  Calendar,
  Clock,
  Flame,
  Award,
  BarChart3,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { format, subDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { ru } from 'date-fns/locale';

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

interface DashboardStats {
  recovery: number | null;
  sleep: number | null;
  strain: number | null;
  calories: number | null;
  steps: number | null;
  heartRate: number | null;
  weight: number | null;
  bodyFat: number | null;
}

interface WeeklyActivity {
  date: string;
  day: string;
  steps: number;
  calories: number;
  strain: number;
  recovery: number;
  active: boolean;
}

// Круговой прогресс компонент
const CircularProgress = ({ value, max = 100, size = 120, strokeWidth = 12, label, color = "hsl(var(--primary))" }: {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  label: string;
  color?: string;
}) => {
  const normalizedValue = Math.min(Math.max(value, 0), max);
  const percentage = (normalizedValue / max) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="transform -rotate-90">
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="hsl(var(--muted))"
          strokeWidth={strokeWidth}
          fill="none"
          opacity={0.3}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-in-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold">{normalizedValue}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
};

// Компонент метрики с трендом
const MetricCard = ({ title, value, unit, trend, target, icon, color = "hsl(var(--primary))", children }: {
  title: string;
  value: number | null;
  unit?: string;
  trend?: number;
  target?: number;
  icon: React.ReactNode;
  color?: string;
  children?: React.ReactNode;
}) => {
  const getTrendIcon = () => {
    if (!trend || Math.abs(trend) < 1) return <Minus className="h-3 w-3 text-muted-foreground" />;
    return trend > 0 ? 
      <ArrowUp className="h-3 w-3 text-green-500" /> : 
      <ArrowDown className="h-3 w-3 text-red-500" />;
  };

  const getTrendColor = () => {
    if (!trend || Math.abs(trend) < 1) return 'text-muted-foreground';
    return trend > 0 ? 'text-green-500' : 'text-red-500';
  };

  return (
    <Card className="relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/5 group-hover:to-background/10 transition-all duration-300" />
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div style={{ color }}>{icon}</div>
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
          </div>
          {trend !== undefined && (
            <div className="flex items-center gap-1">
              {getTrendIcon()}
              <span className={`text-xs font-medium ${getTrendColor()}`}>
                {trend > 0 ? '+' : ''}{trend.toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          {value !== null ? (
            <>
              <span className="text-3xl font-bold">{typeof value === 'number' ? value.toFixed(value % 1 === 0 ? 0 : 1) : value}</span>
              {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
            </>
          ) : (
            <span className="text-2xl text-muted-foreground">—</span>
          )}
        </div>
        
        {target && value && (
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span>Прогресс</span>
              <span>{Math.round((value / target) * 100)}%</span>
            </div>
            <Progress value={(value / target) * 100} className="h-2" />
          </div>
        )}
        
        {children}
      </CardContent>
    </Card>
  );
};

// Календарь активности (heatmap)
const ActivityCalendar = ({ weeklyData }: { weeklyData: WeeklyActivity[] }) => {
  const getIntensityColor = (value: number, max: number) => {
    const intensity = value / max;
    if (intensity === 0) return 'bg-muted';
    if (intensity < 0.25) return 'bg-green-200';
    if (intensity < 0.5) return 'bg-green-400';
    if (intensity < 0.75) return 'bg-green-600';
    return 'bg-green-800';
  };

  const maxSteps = Math.max(...weeklyData.map(d => d.steps), 1);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Активность за неделю</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-2">
          {weeklyData.map((day, index) => (
            <div key={index} className="text-center">
              <div className="text-xs text-muted-foreground mb-1">
                {day.day}
              </div>
              <div 
                className={`w-8 h-8 rounded-sm ${getIntensityColor(day.steps, maxSteps)} flex items-center justify-center cursor-pointer hover:scale-110 transition-transform`}
                title={`${format(new Date(day.date), 'd MMM', { locale: ru })}: ${day.steps} шагов`}
              >
                {day.active && (
                  <div className="w-2 h-2 bg-white rounded-full opacity-80" />
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export const EnhancedFitnessDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewPeriod, setViewPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [dashboardStats, setDashboardStats] = useState<DashboardStats>({
    recovery: null,
    sleep: null,
    strain: null,  
    calories: null,
    steps: null,
    heartRate: null,
    weight: null,
    bodyFat: null
  });
  const [weeklyData, setWeeklyData] = useState<WeeklyActivity[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [trends, setTrends] = useState<{ [key: string]: number }>({});
  const [aggregatedStats, setAggregatedStats] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, selectedDate, viewPeriod]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const today = format(selectedDate, 'yyyy-MM-dd');
      let startDate: string;
      let endDate: string;
      
      // Определяем период в зависимости от выбранного режима
      switch (viewPeriod) {
        case 'day':
          startDate = today;
          endDate = today;
          break;
        case 'week':
          startDate = format(subDays(selectedDate, 6), 'yyyy-MM-dd');
          endDate = today;
          break;
        case 'month':
          startDate = format(subDays(selectedDate, 29), 'yyyy-MM-dd');
          endDate = today;
          break;
        default:
          startDate = today;
          endDate = today;
      }
      
      const weekAgo = format(subDays(selectedDate, 6), 'yyyy-MM-dd');
      const monthAgo = format(subDays(selectedDate, 30), 'yyyy-MM-dd');

      // Получаем данные за выбранный период
      const { data: periodData } = await supabase
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
        .gte('measurement_date', startDate)
        .lte('measurement_date', endDate)
        .order('measurement_date', { ascending: false });

      // Получаем данные для графиков (всегда берем больший период для контекста)
      const chartStartDate = viewPeriod === 'month' ? format(subDays(selectedDate, 60), 'yyyy-MM-dd') 
                            : viewPeriod === 'week' ? format(subDays(selectedDate, 30), 'yyyy-MM-dd')
                            : weekAgo;
                            
      const { data: chartRawData } = await supabase
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
        .gte('measurement_date', chartStartDate)
        .lte('measurement_date', endDate)
        .order('measurement_date', { ascending: true });

      // Получаем данные за месяц для трендов
      const { data: monthData } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner (metric_name)
        `)
        .eq('user_id', user.id)
        .gte('measurement_date', monthAgo)
        .lte('measurement_date', today)
        .order('measurement_date', { ascending: true });

      // Получаем данные веса и жира из body_composition
      const { data: bodyComposition } = await supabase
        .from('body_composition')
        .select('weight, body_fat_percentage, measurement_date')
        .eq('user_id', user.id)
        .order('measurement_date', { ascending: false })
        .limit(1);

      // Получаем данные из daily_health_summary за период
      const { data: dailySummaries } = await supabase
        .from('daily_health_summary')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false });

      // Агрегируем данные в зависимости от периода
      const aggregateData = (data: any[], summaries: any[]) => {
        const aggregated: any = {
          recovery: { values: [], avg: 0, total: 0, count: 0 },
          sleep: { values: [], avg: 0, total: 0, count: 0 },
          strain: { values: [], avg: 0, total: 0, count: 0 },
          calories: { values: [], avg: 0, total: 0, count: 0 },
          steps: { values: [], avg: 0, total: 0, count: 0 },
          heartRate: { values: [], avg: 0, total: 0, count: 0 },
          weight: { values: [], avg: 0, latest: null },
          bodyFat: { values: [], avg: 0, latest: null }
        };

        // Обрабатываем metric_values
        data?.forEach((item: any) => {
          const metric = item.user_metrics;
          const value = item.value;
          
          switch (metric.metric_name) {
            case 'Recovery Score':
              aggregated.recovery.values.push(value);
              aggregated.recovery.total += value;
              aggregated.recovery.count++;
              break;
            case 'Sleep Efficiency':
            case 'Sleep Performance':
              aggregated.sleep.values.push(value);
              aggregated.sleep.total += value;
              aggregated.sleep.count++;
              break;
            case 'Workout Strain':
              aggregated.strain.values.push(value);
              aggregated.strain.total += value;
              aggregated.strain.count++;
              break;
            case 'Workout Calories':
            case 'Calories':
            case 'Total Kilocalories':
              aggregated.calories.values.push(value);
              aggregated.calories.total += value;
              aggregated.calories.count++;
              break;
            case 'Steps':
            case 'Количество шагов':
              aggregated.steps.values.push(value);
              aggregated.steps.total += value;
              aggregated.steps.count++;
              break;
            case 'Average Heart Rate':
            case 'Avg Heart Rate':
            case 'Пульс/ЧСС':
              aggregated.heartRate.values.push(value);
              aggregated.heartRate.total += value;
              aggregated.heartRate.count++;
              break;
            case 'Вес':
              aggregated.weight.values.push(value);
              aggregated.weight.latest = value;
              break;
            case 'Процент жира':
              aggregated.bodyFat.values.push(value);
              aggregated.bodyFat.latest = value;
              break;
          }
        });

        // Обрабатываем daily summaries
        summaries?.forEach((summary: any) => {
          if (summary.steps) {
            aggregated.steps.values.push(summary.steps);
            aggregated.steps.total += summary.steps;
            aggregated.steps.count++;
          }
          if (summary.heart_rate_avg) {
            aggregated.heartRate.values.push(summary.heart_rate_avg);
            aggregated.heartRate.total += summary.heart_rate_avg;
            aggregated.heartRate.count++;
          }
          if (summary.active_calories) {
            aggregated.calories.values.push(summary.active_calories);
            aggregated.calories.total += summary.active_calories;
            aggregated.calories.count++;
          }
        });

        // Рассчитываем средние значения
        Object.keys(aggregated).forEach(key => {
          const metric = aggregated[key];
          if (metric.count > 0) {
            metric.avg = metric.total / metric.count;
          }
          if (metric.values.length > 0 && key === 'weight') {
            metric.latest = metric.values[0]; // Последнее значение
          }
          if (metric.values.length > 0 && key === 'bodyFat') {
            metric.latest = metric.values[0]; // Последнее значение
          }
        });

        return aggregated;
      };

      const aggregated = aggregateData(periodData, dailySummaries);
      setAggregatedStats(aggregated);

      // Формируем статистику для отображения
      const stats: DashboardStats = {
        recovery: viewPeriod === 'day' ? (aggregated.recovery.values[0] || null) : (aggregated.recovery.avg || null),
        sleep: viewPeriod === 'day' ? (aggregated.sleep.values[0] || null) : (aggregated.sleep.avg || null),
        strain: viewPeriod === 'day' ? (aggregated.strain.values[0] || null) : (aggregated.strain.avg || null),
        calories: viewPeriod === 'day' ? (aggregated.calories.values[0] || null) : (aggregated.calories.total || null),
        steps: viewPeriod === 'day' ? (aggregated.steps.values[0] || null) : (aggregated.steps.total || null),
        heartRate: viewPeriod === 'day' ? (aggregated.heartRate.values[0] || null) : (aggregated.heartRate.avg || null),
        weight: aggregated.weight.latest || bodyComposition?.[0]?.weight || null,
        bodyFat: aggregated.bodyFat.latest || bodyComposition?.[0]?.body_fat_percentage || null
      };

      setDashboardStats(stats);

      // Подготавливаем данные для графиков с учетом периода
      const prepareChartData = (rawData: any[]) => {
        const chartDataMap: { [key: string]: any } = {};
        
        rawData?.forEach((item: any) => {
          let dateKey: string;
          let dateLabel: string;
          
          // Группируем данные в зависимости от периода
          if (viewPeriod === 'month') {
            // Группируем по неделям для месячного вида
            const weekStart = startOfWeek(new Date(item.measurement_date), { weekStartsOn: 1 });
            dateKey = format(weekStart, 'yyyy-MM-dd');
            dateLabel = format(weekStart, 'd MMM', { locale: ru });
          } else if (viewPeriod === 'week') {
            // Группируем по дням для недельного вида
            dateKey = item.measurement_date;
            dateLabel = format(new Date(item.measurement_date), 'EEE d', { locale: ru });
          } else {
            // Для дневного вида показываем часы (если есть данные)
            dateKey = item.measurement_date;
            dateLabel = format(new Date(item.measurement_date), 'd MMM', { locale: ru });
          }
          
          if (!chartDataMap[dateKey]) {
            chartDataMap[dateKey] = { 
              date: dateKey, 
              dateFormatted: dateLabel,
              recovery: 0, recoveryCount: 0,
              sleep: 0, sleepCount: 0,
              strain: 0, strainCount: 0,
              steps: 0, stepsCount: 0,
              calories: 0, caloriesCount: 0
            };
          }
          
          const metric = item.user_metrics;
          const dataPoint = chartDataMap[dateKey];
          
          switch (metric.metric_name) {
            case 'Recovery Score':
              dataPoint.recovery += item.value;
              dataPoint.recoveryCount++;
              break;
            case 'Sleep Efficiency':
            case 'Sleep Performance':
              dataPoint.sleep += item.value;
              dataPoint.sleepCount++;
              break;
            case 'Workout Strain':
              dataPoint.strain += item.value;
              dataPoint.strainCount++;
              break;
            case 'Steps':
            case 'Количество шагов':
              dataPoint.steps += item.value;
              dataPoint.stepsCount++;
              break;
            case 'Calories':
            case 'Total Kilocalories':
              dataPoint.calories += item.value;
              dataPoint.caloriesCount++;
              break;
          }
        });

        // Вычисляем средние значения
        const chartArray = Object.values(chartDataMap).map((item: any) => ({
          ...item,
          recovery: item.recoveryCount > 0 ? item.recovery / item.recoveryCount : null,
          sleep: item.sleepCount > 0 ? item.sleep / item.sleepCount : null,
          strain: item.strainCount > 0 ? item.strain / item.strainCount : null,
          steps: item.stepsCount > 0 ? (viewPeriod === 'day' ? item.steps / item.stepsCount : item.steps) : null,
          calories: item.caloriesCount > 0 ? (viewPeriod === 'day' ? item.calories / item.caloriesCount : item.calories) : null
        })).sort((a: any, b: any) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );

        return chartArray;
      };

      const chartArray = prepareChartData(chartRawData);
      setChartData(chartArray);

      // Подготавливаем данные для календаря активности
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

      const weeklyActivity: WeeklyActivity[] = weekDays.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        // Находим данные для этого дня из chartRawData
        const dayMetrics = chartRawData?.filter(item => item.measurement_date === dateStr) || [];
        
        let daySteps = 0;
        let dayCalories = 0;
        let dayStrain = 0;
        let dayRecovery = 0;
        
        dayMetrics.forEach((item: any) => {
          const metric = item.user_metrics;
          switch (metric.metric_name) {
            case 'Steps':
            case 'Количество шагов':
              daySteps = Math.max(daySteps, item.value);
              break;
            case 'Calories':
            case 'Total Kilocalories':
              dayCalories += item.value;
              break;
            case 'Workout Strain':
              dayStrain = Math.max(dayStrain, item.value);
              break;
            case 'Recovery Score':
              dayRecovery = Math.max(dayRecovery, item.value);
              break;
          }
        });
        
        return {
          date: dateStr,
          day: format(day, 'EEE', { locale: ru }),
          steps: daySteps,
          calories: dayCalories,
          strain: dayStrain,
          recovery: dayRecovery,
          active: daySteps > 1000
        };
      });

      setWeeklyData(weeklyActivity);

      // Рассчитываем тренды
      const calculatedTrends: { [key: string]: number } = {};
      
      const metricGroups: { [key: string]: Array<{ value: number; date: string }> } = {};
      
      monthData?.forEach((item: any) => {
        const metricName = item.user_metrics.metric_name;
        if (!metricGroups[metricName]) {
          metricGroups[metricName] = [];
        }
        metricGroups[metricName].push({
          value: item.value,
          date: item.measurement_date
        });
      });

      Object.entries(metricGroups).forEach(([metricName, values]) => {
        if (values.length >= 2) {
          values.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
          const recent = values.slice(-7); // Последние 7 дней
          const previous = values.slice(-14, -7); // Предыдущие 7 дней
          
          if (recent.length > 0 && previous.length > 0) {
            const recentAvg = recent.reduce((sum, v) => sum + v.value, 0) / recent.length;
            const previousAvg = previous.reduce((sum, v) => sum + v.value, 0) / previous.length;
            const change = ((recentAvg - previousAvg) / previousAvg) * 100;
            calculatedTrends[metricName] = change;
          }
        }
      });

      setTrends(calculatedTrends);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-primary" />
          </div>
          <p className="text-muted-foreground">Загрузка фитнес данных...</p>
        </div>
      </div>
    );
  }

  const recoveryColor = dashboardStats.recovery 
    ? dashboardStats.recovery >= 75 
      ? 'hsl(142, 76%, 36%)'
      : dashboardStats.recovery >= 50 
      ? 'hsl(48, 96%, 53%)'
      : 'hsl(0, 84%, 60%)'
    : 'hsl(var(--muted))';

  const sleepColor = dashboardStats.sleep
    ? dashboardStats.sleep >= 85
      ? 'hsl(142, 76%, 36%)'
      : dashboardStats.sleep >= 70
      ? 'hsl(48, 96%, 53%)'
      : 'hsl(0, 84%, 60%)'
    : 'hsl(var(--muted))';

  const getPeriodLabel = () => {
    switch (viewPeriod) {
      case 'day':
        return format(selectedDate, 'd MMMM yyyy', { locale: ru });
      case 'week':
        const weekStart = subDays(selectedDate, 6);
        return `${format(weekStart, 'd MMM', { locale: ru })} - ${format(selectedDate, 'd MMM yyyy', { locale: ru })}`;
      case 'month':
        const monthStart = subDays(selectedDate, 29);
        return `${format(monthStart, 'd MMM', { locale: ru })} - ${format(selectedDate, 'd MMM yyyy', { locale: ru })}`;
      default:
        return format(selectedDate, 'd MMMM yyyy', { locale: ru });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur supports-[backdrop-filter]:bg-card/50">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                Фитнес Аналитика
              </h1>
              <p className="text-muted-foreground mt-1">
                {getPeriodLabel()} • Комплексный анализ здоровья
              </p>
            </div>
            <div className="flex items-center gap-4">
              {/* Селектор периода */}
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-1">
                <Button
                  variant={viewPeriod === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewPeriod('day')}
                  className="px-3 py-1 h-8"
                >
                  День
                </Button>
                <Button
                  variant={viewPeriod === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewPeriod('week')}
                  className="px-3 py-1 h-8"
                >
                  Неделя
                </Button>
                <Button
                  variant={viewPeriod === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewPeriod('month')}
                  className="px-3 py-1 h-8"
                >
                  Месяц
                </Button>
              </div>
              
              {/* Навигация по времени */}
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const days = viewPeriod === 'day' ? 1 : viewPeriod === 'week' ? 7 : 30;
                    setSelectedDate(new Date(selectedDate.getTime() - days * 24 * 60 * 60 * 1000));
                  }}
                >
                  ← {viewPeriod === 'day' ? 'Предыдущий день' : viewPeriod === 'week' ? 'Предыдущая неделя' : 'Предыдущий месяц'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedDate(new Date())}
                  disabled={
                    viewPeriod === 'day' 
                      ? format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                      : selectedDate.getTime() > new Date().getTime()
                  }
                >
                  {viewPeriod === 'day' ? 'Сегодня' : viewPeriod === 'week' ? 'Текущая неделя' : 'Текущий месяц'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const days = viewPeriod === 'day' ? 1 : viewPeriod === 'week' ? 7 : 30;
                    setSelectedDate(new Date(selectedDate.getTime() + days * 24 * 60 * 60 * 1000));
                  }}
                  disabled={
                    viewPeriod === 'day' 
                      ? format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
                      : selectedDate.getTime() > new Date().getTime()
                  }
                >
                  {viewPeriod === 'day' ? 'Следующий день' : viewPeriod === 'week' ? 'Следующая неделя' : 'Следующий месяц'} →
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Обзор</TabsTrigger>
            <TabsTrigger value="trends">Тренды</TabsTrigger>
            <TabsTrigger value="composition">Состав тела</TabsTrigger>
            <TabsTrigger value="activity">Активность</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-8">
            {/* Главные показатели с круговыми прогресс-барами */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="p-6 text-center">
                <CircularProgress
                  value={dashboardStats.recovery || 0}
                  max={100}
                  label={viewPeriod === 'day' ? 'Восстановление' : 'Среднее'}
                  color={recoveryColor}
                />
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="font-medium">Восстановление</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {viewPeriod === 'day' ? 'Сегодня' : viewPeriod === 'week' ? 'За неделю' : 'За месяц'}
                  </div>
                  {trends['Recovery Score'] && (
                    <Badge variant="secondary" className="mt-2">
                      {trends['Recovery Score'] > 0 ? '+' : ''}{trends['Recovery Score'].toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </Card>

              <Card className="p-6 text-center">
                <CircularProgress
                  value={dashboardStats.sleep || 0}
                  max={100}
                  label={viewPeriod === 'day' ? 'Сон' : 'Среднее'}
                  color={sleepColor}
                />
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-2">
                    <Moon className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Качество сна</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {viewPeriod === 'day' ? 'Сегодня' : viewPeriod === 'week' ? 'За неделю' : 'За месяц'}
                  </div>
                  {trends['Sleep Efficiency'] && (
                    <Badge variant="secondary" className="mt-2">
                      {trends['Sleep Efficiency'] > 0 ? '+' : ''}{trends['Sleep Efficiency'].toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </Card>

              <Card className="p-6 text-center">
                <CircularProgress
                  value={dashboardStats.strain || 0}
                  max={20}
                  label={viewPeriod === 'day' ? 'Нагрузка' : 'Среднее'}
                  color="hsl(48, 96%, 53%)"
                />
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">Нагрузка</span>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {viewPeriod === 'day' ? 'Сегодня' : viewPeriod === 'week' ? 'За неделю' : 'За месяц'}
                  </div>
                  {trends['Workout Strain'] && (
                    <Badge variant="secondary" className="mt-2">
                      {trends['Workout Strain'] > 0 ? '+' : ''}{trends['Workout Strain'].toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </Card>

              <Card className="p-6 text-center">
                <CircularProgress
                  value={
                    viewPeriod === 'day' 
                      ? (dashboardStats.steps ? Math.min(dashboardStats.steps / 10000 * 100, 100) : 0)
                      : (dashboardStats.steps ? Math.min(dashboardStats.steps / (10000 * (viewPeriod === 'week' ? 7 : 30)) * 100, 100) : 0)
                  }
                  max={100}
                  label={viewPeriod === 'day' ? 'Шаги' : 'Всего'}
                  color="hsl(221, 83%, 53%)"
                />
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Активность</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {dashboardStats.steps?.toLocaleString() || 0} 
                    {viewPeriod === 'day' ? ' / 10K' : viewPeriod === 'week' ? ' за неделю' : ' за месяц'}
                  </div>
                </div>
              </Card>
            </div>

            {/* Дополнительные метрики */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Калории"
                value={dashboardStats.calories}
                unit="ккал"
                trend={trends['Calories'] || trends['Total Kilocalories']}
                target={2500}
                icon={<Flame className="h-4 w-4" />}
                color="hsl(25, 95%, 53%)"
              />

              <MetricCard
                title="Пульс"
                value={dashboardStats.heartRate}
                unit="уд/мин"
                trend={trends['Average Heart Rate']}
                icon={<Heart className="h-4 w-4" />}
                color="hsl(0, 84%, 60%)"
              />

              <MetricCard
                title="Вес"
                value={dashboardStats.weight}
                unit="кг"
                icon={<Target className="h-4 w-4" />}
                color="hsl(142, 76%, 36%)"
              />

              <MetricCard
                title="Процент жира"
                value={dashboardStats.bodyFat}
                unit="%"
                target={12}
                icon={<BarChart3 className="h-4 w-4" />}
                color="hsl(270, 95%, 60%)"
              />
            </div>

            {/* График недельной динамики */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Динамика за {viewPeriod === 'day' ? 'день' : viewPeriod === 'week' ? 'неделю' : 'месяц'}
                </CardTitle>
                <CardDescription>
                  Основные показатели здоровья и активности
                  {viewPeriod !== 'day' && ' (агрегированные данные)'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis 
                        dataKey="dateFormatted" 
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <YAxis 
                        tick={{ fontSize: 12 }}
                        stroke="hsl(var(--muted-foreground))"
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '6px'
                        }}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="recovery" 
                        stroke="hsl(142, 76%, 36%)" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 2, r: 4 }}
                        name="Восстановление (%)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sleep" 
                        stroke="hsl(270, 95%, 60%)" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(270, 95%, 60%)', strokeWidth: 2, r: 4 }}
                        name="Сон (%)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="strain" 
                        stroke="hsl(48, 96%, 53%)" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(48, 96%, 53%)', strokeWidth: 2, r: 4 }}
                        name="Нагрузка"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Календарь активности */}
            <ActivityCalendar weeklyData={weeklyData} />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Анализ трендов</CardTitle>
                <CardDescription>
                  Изменения ваших показателей за последний месяц
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="dateFormatted" />
                      <YAxis />
                      <Tooltip />
                      <Area 
                        type="monotone" 
                        dataKey="steps" 
                        stackId="1"
                        stroke="hsl(221, 83%, 53%)" 
                        fill="hsl(221, 83%, 53%)"
                        fillOpacity={0.6}
                        name="Шаги"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="calories" 
                        stackId="2"
                        stroke="hsl(25, 95%, 53%)" 
                        fill="hsl(25, 95%, 53%)"
                        fillOpacity={0.6}
                        name="Калории"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="composition" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Состав тела</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span>Вес</span>
                      <span className="font-bold">{dashboardStats.weight ? `${dashboardStats.weight.toFixed(1)} кг` : '—'}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span>Процент жира</span>
                      <span className="font-bold">{dashboardStats.bodyFat ? `${dashboardStats.bodyFat.toFixed(1)}%` : '—'}</span>
                    </div>
                    {dashboardStats.bodyFat && (
                      <Progress value={dashboardStats.bodyFat} className="h-3" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Цели по составу тела</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm">
                      <div className="flex justify-between mb-1">
                        <span>Целевой жир</span>
                        <span>12%</span>
                      </div>
                      <Progress value={dashboardStats.bodyFat ? (12 / dashboardStats.bodyFat) * 100 : 0} className="h-2" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Активность сегодня</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={[
                        { name: 'Шаги', value: dashboardStats.steps || 0, target: 10000 },
                        { name: 'Калории', value: dashboardStats.calories || 0, target: 2500 }
                      ]}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="value" fill="hsl(var(--primary))" />
                        <Bar dataKey="target" fill="hsl(var(--muted))" opacity={0.3} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Распределение активности</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Активные калории', value: dashboardStats.calories || 0 },
                            { name: 'Базовые калории', value: 1800 }
                          ]}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="hsl(var(--primary))"
                          dataKey="value"
                        >
                          <Cell fill="hsl(25, 95%, 53%)" />
                          <Cell fill="hsl(var(--muted))" />
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};