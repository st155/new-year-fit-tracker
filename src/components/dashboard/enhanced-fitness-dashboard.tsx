import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Minus,
  Trophy
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
import { enUS } from 'date-fns/locale';
import { WhoopMetrics } from '@/components/dashboard/whoop-metrics';
import { WeightProgressDetail } from '@/components/detail/WeightProgressDetail';
import { BodyFatProgressDetail } from '@/components/detail/BodyFatProgressDetail';
import { VO2MaxProgressDetail } from '@/components/detail/VO2MaxProgressDetail';
import { PullUpsProgressDetail } from '@/components/detail/PullUpsProgressDetail';
import { MetricsSettings, type MetricVisibility } from './metrics-settings';
import { ExportDataDialog } from './ExportDataDialog';
import { StreakCard } from './StreakCard';
import { AchievementsCard } from './AchievementsCard';
import { IntegrationsDataDisplay } from '@/components/integrations/IntegrationsDataDisplay';

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
        <span className="text-2xl font-bold">{normalizedValue.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
};

// Компонент метрики с трендом и градиентной рамкой
const MetricCard = ({ title, value, unit, trend, target, icon, color = "hsl(var(--primary))", gradientBorder, glowColor, onClick, children }: {
  title: string;
  value: number | null;
  unit?: string;
  trend?: number;
  target?: number;
  icon: React.ReactNode;
  color?: string;
  gradientBorder?: string;
  glowColor?: string;
  onClick?: () => void;
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
    <div 
      className={`relative p-[2px] rounded-lg transition-all duration-300 ${onClick ? 'cursor-pointer hover:scale-105' : ''}`} 
      style={{ 
        background: gradientBorder || 'transparent',
        boxShadow: glowColor ? `0 0 20px ${glowColor}40, 0 0 40px ${glowColor}20` : 'none'
      }}
      onClick={onClick}
    >
      <Card className="relative overflow-hidden group transition-all duration-300 bg-card border-0 h-full">
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-background/5 group-hover:to-background/10 transition-all duration-300" />
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div style={{ color }}>{icon}</div>
              <CardTitle className="text-sm font-medium uppercase tracking-wide">{title}</CardTitle>
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
                <span className="text-4xl font-bold">{typeof value === 'number' ? value.toFixed(1) : value}</span>
                {unit && <span className="text-sm text-muted-foreground font-medium">{unit}</span>}
              </>
            ) : (
              <span className="text-3xl text-muted-foreground">—</span>
            )}
          </div>
          
          {target && value && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span>Progress</span>
                <span>{Math.round((value / target) * 100)}%</span>
              </div>
              <Progress value={(value / target) * 100} className="h-2" />
            </div>
          )}
          
          {children}
        </CardContent>
      </Card>
    </div>
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
        <CardTitle className="text-sm">Weekly Activity</CardTitle>
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
                title={`${format(new Date(day.date), 'd MMM', { locale: enUS })}: ${day.steps} steps`}
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
  const navigate = useNavigate();
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
  const [viewingDetailType, setViewingDetailType] = useState<string | null>(null);
  const [metricsVisibility, setMetricsVisibility] = useState<MetricVisibility>({
    recovery: true,
    sleep: true,
    strain: true,
    steps: true,
    calories: true,
    heartRate: true,
    weight: true,
    bodyFat: true,
  });

  useEffect(() => {
    if (!user) return;

    // Мгновенная отрисовка из кэша
    try {
      const cached = localStorage.getItem(`dashboard_snapshot_${user.id}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (parsed?.dashboardStats) {
          setDashboardStats(parsed.dashboardStats);
          setLoading(false);
        }
      }
    } catch {}

    fetchDashboardData();
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

      // Получаем данные параллельно для максимальной скорости
      const chartStartDate = viewPeriod === 'month' 
        ? format(subDays(selectedDate, 60), 'yyyy-MM-dd') 
        : viewPeriod === 'week' 
          ? format(subDays(selectedDate, 30), 'yyyy-MM-dd')
          : weekAgo;

      const [
        { data: periodData },
        { data: chartRawData },
        { data: monthData },
        { data: bodyComposition },
        { data: dailySummaries },
      ] = await Promise.all([
        supabase
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
          .order('measurement_date', { ascending: false }),
        supabase
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
          .order('measurement_date', { ascending: true }),
        supabase
          .from('metric_values')
          .select(`
            value,
            measurement_date,
            user_metrics!inner (metric_name)
          `)
          .eq('user_id', user.id)
          .gte('measurement_date', monthAgo)
          .lte('measurement_date', today)
          .order('measurement_date', { ascending: true }),
        supabase
          .from('body_composition')
          .select('weight, body_fat_percentage, measurement_date')
          .eq('user_id', user.id)
          .order('measurement_date', { ascending: false })
          .limit(1),
        supabase
          .from('daily_health_summary')
          .select('*')
          .eq('user_id', user.id)
          .gte('date', startDate)
          .lte('date', endDate)
          .order('date', { ascending: false }),
      ]);

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
      // Сохраняем быстрый снепшот для моментальной отрисовки при следующем визите
      try {
        localStorage.setItem(
          `dashboard_snapshot_${user.id}`,
          JSON.stringify({ dashboardStats: stats, ts: Date.now() })
        );
      } catch {}


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
            dateLabel = format(weekStart, 'd MMM', { locale: enUS });
          } else if (viewPeriod === 'week') {
            // Группируем по дням для недельного вида
            dateKey = item.measurement_date;
            dateLabel = format(new Date(item.measurement_date), 'EEE d', { locale: enUS });
          } else {
            // Для дневного вида показываем часы (если есть данные)
            dateKey = item.measurement_date;
            dateLabel = format(new Date(item.measurement_date), 'd MMM', { locale: enUS });
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
          day: format(day, 'EEE', { locale: enUS }),
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

  // Handle detail views
  if (viewingDetailType) {
    const onBack = () => setViewingDetailType(null);
    
    return (
      <div className="min-h-screen bg-gradient-subtle">
        <div className="max-w-7xl mx-auto px-6 py-8">
          {viewingDetailType === 'weight' && <WeightProgressDetail onBack={onBack} />}
          {viewingDetailType === 'body_fat' && <BodyFatProgressDetail onBack={onBack} />}
          {viewingDetailType === 'vo2_max' && <VO2MaxProgressDetail onBack={onBack} />}
          {viewingDetailType === 'recovery' && <VO2MaxProgressDetail onBack={onBack} />}
          {viewingDetailType === 'sleep' && <VO2MaxProgressDetail onBack={onBack} />}
          {viewingDetailType === 'strain' && <PullUpsProgressDetail onBack={onBack} />}
          {viewingDetailType === 'steps' && <VO2MaxProgressDetail onBack={onBack} />}
        </div>
      </div>
    );
  }

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
        return format(selectedDate, 'd MMMM yyyy', { locale: enUS });
      case 'week':
        const weekStart = subDays(selectedDate, 6);
        return `${format(weekStart, 'd MMM', { locale: enUS })} - ${format(selectedDate, 'd MMM yyyy', { locale: enUS })}`;
      case 'month':
        const monthStart = subDays(selectedDate, 29);
        return `${format(monthStart, 'd MMM', { locale: enUS })} - ${format(selectedDate, 'd MMM yyyy', { locale: enUS })}`;
      default:
        return format(selectedDate, 'd MMMM yyyy', { locale: enUS });
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
                Fitness Analytics
              </h1>
              <p className="text-muted-foreground mt-1">
                {getPeriodLabel()} • Comprehensive Health Analysis
              </p>
            </div>
            <div className="flex items-center gap-4">
              <MetricsSettings 
                onSettingsChange={setMetricsVisibility}
                initialSettings={metricsVisibility}
              />
              
              {/* Селектор периода */}
              <div className="flex items-center gap-2 bg-muted/30 rounded-lg p-1">
                <Button
                  variant={viewPeriod === 'day' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewPeriod('day')}
                  className="px-3 py-1 h-8"
                >
                  Day
                </Button>
                <Button
                  variant={viewPeriod === 'week' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewPeriod('week')}
                  className="px-3 py-1 h-8"
                >
                  Week
                </Button>
                <Button
                  variant={viewPeriod === 'month' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewPeriod('month')}
                  className="px-3 py-1 h-8"
                >
                  Month
                </Button>
              </div>
              
              {/* Навигация по времени */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const days = viewPeriod === 'day' ? 1 : viewPeriod === 'week' ? 7 : 30;
                    setSelectedDate(new Date(selectedDate.getTime() - days * 24 * 60 * 60 * 1000));
                  }}
                >
                  ← {viewPeriod === 'day' ? 'Previous Day' : viewPeriod === 'week' ? 'Previous Week' : 'Previous Month'}
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
                  {viewPeriod === 'day' ? 'Today' : viewPeriod === 'week' ? 'This Week' : 'This Month'}
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
                  {viewPeriod === 'day' ? 'Next Day' : viewPeriod === 'week' ? 'Next Week' : 'Next Month'} →
                </Button>
                
                {/* Кнопка экспорта данных */}
                <ExportDataDialog />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs defaultValue="overview" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 md:grid-cols-6 gap-1">
            <TabsTrigger value="overview" className="text-xs sm:text-sm">Overview</TabsTrigger>
            <TabsTrigger value="devices" className="text-xs sm:text-sm">Devices</TabsTrigger>
            <TabsTrigger value="whoop" className="text-xs sm:text-sm">Whoop</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs sm:text-sm">Trends</TabsTrigger>
            <TabsTrigger value="composition" className="text-xs sm:text-sm">Body</TabsTrigger>
            <TabsTrigger value="activity" className="text-xs sm:text-sm">Activity</TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Device Data
                </CardTitle>
                <CardDescription>
                  Latest metrics from all connected devices
                </CardDescription>
              </CardHeader>
              <CardContent>
                <IntegrationsDataDisplay />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="overview" className="space-y-8">
            {/* This Month's Highlights */}
            <Card className="bg-gradient-primary border-primary/30 text-primary-foreground">
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-xl">
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
                    <div className="text-2xl md:text-3xl font-bold">5.2kg</div>
                    <div className="text-sm md:text-base opacity-90">Weight Lost</div>
                  </div>
                  <div 
                    className="space-y-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setViewingDetailType('body_fat')}
                  >
                    <div className="text-2xl md:text-3xl font-bold">2.1%</div>
                    <div className="text-sm md:text-base opacity-90">Body Fat Reduced</div>
                  </div>
                  <div 
                    className="space-y-2 cursor-pointer hover:opacity-80 transition-opacity"
                    onClick={() => setViewingDetailType('strain')}
                  >
                    <div className="text-2xl md:text-3xl font-bold">7</div>
                    <div className="text-sm md:text-base opacity-90">PRs Hit</div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-2xl md:text-3xl font-bold">24</div>
                    <div className="text-sm md:text-base opacity-90">Workouts Completed</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Главные показатели с круговыми прогресс-барами */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {metricsVisibility.recovery && (
                <div 
                  className="relative p-[2px] rounded-lg transition-all duration-300 cursor-pointer hover:scale-105"
                  style={{ 
                    background: 'linear-gradient(135deg, hsl(0, 84%, 60%), hsl(340, 82%, 52%))',
                    boxShadow: '0 0 20px rgba(239, 68, 68, 0.25), 0 0 40px rgba(239, 68, 68, 0.125)'
                  }}
                  onClick={() => setViewingDetailType('recovery')}
                >
                  <Card className="p-6 text-center bg-card border-0 h-full">
                    <CircularProgress
                      value={dashboardStats.recovery || 0}
                      max={100}
                      label={viewPeriod === 'day' ? 'Recovery' : 'Average'}
                      color={recoveryColor}
                    />
                    <div className="mt-4">
                      <div className="flex items-center justify-center gap-2">
                        <Heart className="h-4 w-4 text-red-500" />
                        <span className="font-medium">Recovery</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                         {viewPeriod === 'day' ? 'Today' : viewPeriod === 'week' ? 'This Week' : 'This Month'}
                      </div>
                      {trends['Recovery Score'] && (
                        <Badge variant="secondary" className="mt-2">
                          {trends['Recovery Score'] > 0 ? '+' : ''}{trends['Recovery Score'].toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {metricsVisibility.sleep && (
                <div 
                  className="relative p-[2px] rounded-lg transition-all duration-300 cursor-pointer hover:scale-105"
                  style={{ 
                    background: 'linear-gradient(135deg, hsl(270, 95%, 60%), hsl(280, 87%, 65%))',
                    boxShadow: '0 0 20px rgba(168, 85, 247, 0.25), 0 0 40px rgba(168, 85, 247, 0.125)'
                  }}
                  onClick={() => setViewingDetailType('sleep')}
                >
                  <Card className="p-6 text-center bg-card border-0 h-full">
                    <CircularProgress
                      value={dashboardStats.sleep || 0}
                      max={100}
                      label={viewPeriod === 'day' ? 'Sleep' : 'Average'}
                      color={sleepColor}
                    />
                    <div className="mt-4">
                      <div className="flex items-center justify-center gap-2">
                        <Moon className="h-4 w-4 text-purple-500" />
                        <span className="font-medium">Sleep Quality</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                         {viewPeriod === 'day' ? 'Today' : viewPeriod === 'week' ? 'This Week' : 'This Month'}
                      </div>
                      {trends['Sleep Efficiency'] && (
                        <Badge variant="secondary" className="mt-2">
                          {trends['Sleep Efficiency'] > 0 ? '+' : ''}{trends['Sleep Efficiency'].toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {metricsVisibility.strain && (
                <div 
                  className="relative p-[2px] rounded-lg transition-all duration-300 cursor-pointer hover:scale-105"
                  style={{ 
                    background: 'linear-gradient(135deg, hsl(48, 96%, 53%), hsl(38, 92%, 50%))',
                    boxShadow: '0 0 20px rgba(251, 191, 36, 0.25), 0 0 40px rgba(251, 191, 36, 0.125)'
                  }}
                  onClick={() => setViewingDetailType('strain')}
                >
                  <Card className="p-6 text-center bg-card border-0 h-full">
                    <CircularProgress
                      value={dashboardStats.strain || 0}
                      max={20}
                      label={viewPeriod === 'day' ? 'Strain' : 'Average'}
                      color="hsl(48, 96%, 53%)"
                    />
                    <div className="mt-4">
                      <div className="flex items-center justify-center gap-2">
                        <Zap className="h-4 w-4 text-yellow-500" />
                        <span className="font-medium">Strain</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {viewPeriod === 'day' ? 'Today' : viewPeriod === 'week' ? 'This Week' : 'This Month'}
                      </div>
                      {trends['Workout Strain'] && (
                        <Badge variant="secondary" className="mt-2">
                          {trends['Workout Strain'] > 0 ? '+' : ''}{trends['Workout Strain'].toFixed(1)}%
                        </Badge>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {metricsVisibility.steps && (
                <div 
                  className="relative p-[2px] rounded-lg transition-all duration-300 cursor-pointer hover:scale-105"
                  style={{ 
                    background: 'linear-gradient(135deg, hsl(221, 83%, 53%), hsl(201, 96%, 32%))',
                    boxShadow: '0 0 20px rgba(59, 130, 246, 0.25), 0 0 40px rgba(59, 130, 246, 0.125)'
                  }}
                  onClick={() => setViewingDetailType('steps')}
                >
                  <Card className="p-6 text-center bg-card border-0 h-full">
                    <CircularProgress
                      value={
                        viewPeriod === 'day' 
                          ? (dashboardStats.steps ? Math.min(dashboardStats.steps / 10000 * 100, 100) : 0)
                          : (dashboardStats.steps ? Math.min(dashboardStats.steps / (10000 * (viewPeriod === 'week' ? 7 : 30)) * 100, 100) : 0)
                      }
                      max={100}
                      label={viewPeriod === 'day' ? 'Steps' : 'Total'}
                      color="hsl(221, 83%, 53%)"
                    />
                    <div className="mt-4">
                      <div className="flex items-center justify-center gap-2">
                        <Activity className="h-4 w-4 text-blue-500" />
                        <span className="font-medium">Activity</span>
                      </div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {dashboardStats.steps?.toLocaleString() || 0} 
                        {viewPeriod === 'day' ? ' / 10K' : viewPeriod === 'week' ? ' this week' : ' this month'}
                      </div>
                    </div>
                  </Card>
                </div>
              )}
            </div>

            {/* Дополнительные метрики с градиентными рамками */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {metricsVisibility.calories && (
                <MetricCard
                  title="Calories"
                  value={dashboardStats.calories}
                  unit="kcal"
                  trend={trends['Calories'] || trends['Total Kilocalories']}
                  target={2500}
                  icon={<Flame className="h-4 w-4" />}
                  color="hsl(25, 95%, 53%)"
                  gradientBorder="linear-gradient(135deg, hsl(25, 95%, 53%), hsl(38, 92%, 50%))"
                  glowColor="hsl(25, 95%, 53%)"
                  onClick={() => navigate('/metric/steps')}
                />
              )}

              {metricsVisibility.heartRate && (
                <MetricCard
                  title="Heart Rate"
                  value={dashboardStats.heartRate}
                  unit="bpm"
                  trend={trends['Average Heart Rate']}
                  icon={<Heart className="h-4 w-4" />}
                  color="hsl(0, 84%, 60%)"
                  gradientBorder="linear-gradient(135deg, hsl(0, 84%, 60%), hsl(340, 82%, 52%))"
                  glowColor="hsl(0, 84%, 60%)"
                  onClick={() => navigate('/metric/recovery')}
                />
              )}

              {metricsVisibility.weight && (
                <MetricCard
                  title="Weight"
                  value={dashboardStats.weight}
                  unit="kg"
                  icon={<Target className="h-4 w-4" />}
                  color="hsl(142, 76%, 36%)"
                  gradientBorder="linear-gradient(135deg, hsl(142, 76%, 36%), hsl(158, 64%, 52%))"
                  glowColor="hsl(142, 76%, 36%)"
                  onClick={() => navigate('/metric/weight')}
                />
              )}

              {metricsVisibility.bodyFat && (
                <MetricCard
                  title="Body Fat"
                  value={dashboardStats.bodyFat}
                  unit="%"
                  target={12}
                  icon={<BarChart3 className="h-4 w-4" />}
                  color="hsl(270, 95%, 60%)"
                  gradientBorder="linear-gradient(135deg, hsl(270, 95%, 60%), hsl(280, 87%, 65%))"
                  glowColor="hsl(270, 95%, 60%)"
                  onClick={() => navigate('/metric/body_fat')}
                />
              )}
            </div>

            {/* График недельной динамики */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Dynamics for {viewPeriod === 'day' ? 'day' : viewPeriod === 'week' ? 'week' : 'month'}
                </CardTitle>
                <CardDescription>
                   Key health and activity metrics
                   {viewPeriod !== 'day' && ' (aggregated data)'}
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
                        name="Recovery (%)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="sleep" 
                        stroke="hsl(270, 95%, 60%)" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(270, 95%, 60%)', strokeWidth: 2, r: 4 }}
                        name="Sleep (%)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="strain" 
                        stroke="hsl(48, 96%, 53%)" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(48, 96%, 53%)', strokeWidth: 2, r: 4 }}
                        name="Strain"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Календарь активности */}
            <ActivityCalendar weeklyData={weeklyData} />
          </TabsContent>

          <TabsContent value="whoop" className="space-y-6">
            <WhoopMetrics selectedDate={selectedDate} />
          </TabsContent>

          <TabsContent value="trends" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Trend Analysis</CardTitle>
                <CardDescription>
                  Changes in your metrics over the last month
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
                        name="Steps"
                      />
                      <Area 
                        type="monotone" 
                        dataKey="calories" 
                        stackId="2"
                        stroke="hsl(25, 95%, 53%)" 
                        fill="hsl(25, 95%, 53%)"
                        fillOpacity={0.6}
                        name="Calories"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Streak Card */}
            <StreakCard />

            {/* Achievements Card */}
            <AchievementsCard />
          </TabsContent>

          <TabsContent value="composition" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover-scale transition-all duration-300" onClick={() => setViewingDetailType('weight')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-green-500" />
                    Weight Tracking
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-foreground">
                        {dashboardStats.weight ? `${dashboardStats.weight.toFixed(1)}` : '—'}
                      </div>
                      <div className="text-sm text-muted-foreground">kg</div>
                    </div>
                    {trends['Вес'] && (
                      <div className="flex items-center justify-center gap-2">
                        {trends['Вес'] > 0 ? <TrendingUp className="h-4 w-4 text-red-500" /> : <TrendingDown className="h-4 w-4 text-green-500" />}
                        <span className={`text-sm font-medium ${trends['Вес'] > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          {trends['Вес'] > 0 ? '+' : ''}{trends['Вес'].toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover-scale transition-all duration-300" onClick={() => setViewingDetailType('body_fat')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-purple-500" />
                    Body Fat %
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-foreground">
                        {dashboardStats.bodyFat ? `${dashboardStats.bodyFat.toFixed(1)}` : '—'}
                      </div>
                      <div className="text-sm text-muted-foreground">%</div>
                    </div>
                    {dashboardStats.bodyFat && (
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs">
                          <span>Progress to 12%</span>
                          <span>{Math.round((12 / dashboardStats.bodyFat) * 100)}%</span>
                        </div>
                        <Progress value={(12 / dashboardStats.bodyFat) * 100} className="h-2" />
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5 text-blue-500" />
                    Composition Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Target Weight</span>
                        <span className="font-medium">70 kg</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Target Body Fat</span>
                        <span className="font-medium">12%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Target Muscle Mass</span>
                        <span className="font-medium">65 kg</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Body Composition Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Body Composition Trends</CardTitle>
                <CardDescription>Track your weight and body fat percentage over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.filter(d => d.weight || d.bodyFat)}>
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
                        dataKey="weight" 
                        stroke="hsl(142, 76%, 36%)" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(142, 76%, 36%)', strokeWidth: 2, r: 4 }}
                        name="Weight (kg)"
                      />
                      <Line 
                        type="monotone" 
                        dataKey="bodyFat" 
                        stroke="hsl(270, 95%, 60%)" 
                        strokeWidth={3}
                        dot={{ fill: 'hsl(270, 95%, 60%)', strokeWidth: 2, r: 4 }}
                        name="Body Fat (%)"
                        yAxisId="right"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="activity" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Today's Activity</CardTitle>
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