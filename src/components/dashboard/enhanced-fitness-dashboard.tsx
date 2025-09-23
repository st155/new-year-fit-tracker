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

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user, selectedDate]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const today = format(selectedDate, 'yyyy-MM-dd');
      const weekAgo = format(subDays(selectedDate, 6), 'yyyy-MM-dd');
      const monthAgo = format(subDays(selectedDate, 30), 'yyyy-MM-dd');

      // Получаем данные за сегодня
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

      // Получаем данные за неделю для графиков
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
        .gte('measurement_date', weekAgo)
        .lte('measurement_date', today)
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

      // Получаем данные из daily_health_summary
      const { data: dailySummary } = await supabase
        .from('daily_health_summary')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      // Обрабатываем сегодняшние данные
      const stats: DashboardStats = {
        recovery: null,
        sleep: null,
        strain: null,
        calories: null,
        steps: null,
        heartRate: null,
        weight: bodyComposition?.[0]?.weight || null,
        bodyFat: bodyComposition?.[0]?.body_fat_percentage || null
      };

      // Обогащаем данными из daily summary
      if (dailySummary) {
        stats.steps = stats.steps || dailySummary.steps;
        stats.heartRate = stats.heartRate || dailySummary.heart_rate_avg;
        stats.calories = stats.calories || dailySummary.active_calories;
      }

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
          case 'Вес':
            stats.weight = item.value;
            break;
          case 'Процент жира':
            stats.bodyFat = item.value;
            break;
        }
      });

      setDashboardStats(stats);

      // Подготавливаем данные для графиков
      const chartDataMap: { [key: string]: any } = {};
      
      weekData?.forEach((item: any) => {
        const date = item.measurement_date;
        if (!chartDataMap[date]) {
          chartDataMap[date] = { date, dateFormatted: format(new Date(date), 'd MMM', { locale: ru }) };
        }
        
        const metric = item.user_metrics;
        switch (metric.metric_name) {
          case 'Recovery Score':
            chartDataMap[date].recovery = item.value;
            break;
          case 'Sleep Efficiency':
          case 'Sleep Performance':
            chartDataMap[date].sleep = item.value;
            break;
          case 'Workout Strain':
            chartDataMap[date].strain = item.value;
            break;
          case 'Steps':
          case 'Количество шагов':
            chartDataMap[date].steps = item.value;
            break;
          case 'Calories':
          case 'Total Kilocalories':
            chartDataMap[date].calories = (chartDataMap[date].calories || 0) + item.value;
            break;
        }
      });

      const chartArray = Object.values(chartDataMap).sort((a: any, b: any) => 
        new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      setChartData(chartArray);

      // Подготавливаем данные для календаря активности
      const weekStart = startOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekEnd = endOfWeek(selectedDate, { weekStartsOn: 1 });
      const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

      const weeklyActivity: WeeklyActivity[] = weekDays.map((day) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const dayData = chartDataMap[dateStr];
        
        return {
          date: dateStr,
          day: format(day, 'EEE', { locale: ru }),
          steps: dayData?.steps || 0,
          calories: dayData?.calories || 0,
          strain: dayData?.strain || 0,
          recovery: dayData?.recovery || 0,
          active: (dayData?.steps || 0) > 1000
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
                {format(selectedDate, 'd MMMM yyyy', { locale: ru })} • Комплексный анализ здоровья
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date(selectedDate.getTime() - 24 * 60 * 60 * 1000))}
              >
                ← Вчера
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDate(new Date())}
                disabled={format(selectedDate, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')}
              >
                Сегодня
              </Button>
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
                  label="Восстановление"
                  color={recoveryColor}
                />
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-2">
                    <Heart className="h-4 w-4 text-red-500" />
                    <span className="font-medium">Восстановление</span>
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
                  label="Сон"
                  color={sleepColor}
                />
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-2">
                    <Moon className="h-4 w-4 text-purple-500" />
                    <span className="font-medium">Качество сна</span>
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
                  label="Нагрузка"
                  color="hsl(48, 96%, 53%)"
                />
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-2">
                    <Zap className="h-4 w-4 text-yellow-500" />
                    <span className="font-medium">Нагрузка</span>
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
                  value={dashboardStats.steps ? Math.min(dashboardStats.steps / 10000 * 100, 100) : 0}
                  max={100}
                  label="Шаги"
                  color="hsl(221, 83%, 53%)"
                />
                <div className="mt-4">
                  <div className="flex items-center justify-center gap-2">
                    <Activity className="h-4 w-4 text-blue-500" />
                    <span className="font-medium">Активность</span>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {dashboardStats.steps?.toLocaleString() || 0} / 10K
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
                <CardTitle>Динамика за неделю</CardTitle>
                <CardDescription>
                  Основные показатели здоровья и активности
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