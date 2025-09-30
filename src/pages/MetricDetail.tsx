import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, TrendingUp, TrendingDown, Calendar, Target } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressChart } from "@/components/ui/progress-chart";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { ru } from "date-fns/locale";

interface MetricData {
  value: number;
  date: string;
  source?: string;
}

interface MetricStats {
  current: number;
  previous: number;
  change: number;
  changePercent: number;
  trend: 'up' | 'down' | 'stable';
  unit: string;
  title: string;
  description: string;
}

const metricConfigs = {
  body_fat: {
    title: "Процент жира",
    description: "Процент жировой массы тела",
    unit: "%",
    color: "from-red-400 to-orange-500",
    goodTrend: "down"
  },
  weight: {
    title: "Вес", 
    description: "Масса тела",
    unit: "кг",
    color: "from-blue-400 to-cyan-500",
    goodTrend: "stable"
  },
  vo2max: {
    title: "VO₂Max",
    description: "Максимальное потребление кислорода",
    unit: "мл/кг/мин",
    color: "from-green-400 to-emerald-500",
    goodTrend: "up"
  },
  recovery: {
    title: "Восстановление",
    description: "Показатель восстановления организма",
    unit: "%",
    color: "from-purple-400 to-violet-500",
    goodTrend: "up"
  },
  steps: {
    title: "Шаги",
    description: "Количество шагов за день",
    unit: "шагов",
    color: "from-indigo-400 to-blue-500",
    goodTrend: "up"
  },
  row_2km: {
    title: "2KM Row",
    description: "Время гребли на 2 километра",
    unit: "сек",
    color: "from-yellow-400 to-orange-500",
    goodTrend: "down"
  }
};

export default function MetricDetail() {
  const { metricType } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [data, setData] = useState<MetricData[]>([]);
  const [stats, setStats] = useState<MetricStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'week' | 'month' | '3months'>('month');

  const config = metricConfigs[metricType as keyof typeof metricConfigs];

  useEffect(() => {
    if (!user || !metricType || !config) {
      navigate('/dashboard');
      return;
    }

    fetchMetricData();
  }, [user, metricType, timeRange]);

  const fetchMetricData = async () => {
    if (!user || !metricType) return;

    try {
      setLoading(true);
      
      const now = new Date();
      let startDate: Date;
      
      switch (timeRange) {
        case 'week':
          startDate = subDays(now, 7);
          break;
        case 'month':
          startDate = subDays(now, 30);
          break;
        case '3months':
          startDate = subDays(now, 90);
          break;
      }

      let metricData: MetricData[] = [];

      if (metricType === 'body_fat') {
        console.log('Fetching body_fat data for timeRange:', timeRange, 'from:', startDate.toISOString());
        
        // Получаем данные из body_composition и metric_values
        const [bcData, mvData] = await Promise.all([
          supabase
            .from('body_composition')
            .select('body_fat_percentage, measurement_date')
            .eq('user_id', user.id)
            .not('body_fat_percentage', 'is', null)
            .gte('measurement_date', startDate.toISOString().split('T')[0])
            .order('measurement_date', { ascending: true }),
          supabase
            .from('metric_values')
            .select(`value, measurement_date, user_metrics!inner(metric_name, source)`)
            .eq('user_id', user.id)
            .gte('measurement_date', startDate.toISOString().split('T')[0])
            .order('measurement_date', { ascending: true })
        ]);

        console.log('Body composition data:', bcData);
        console.log('Metric values data:', mvData);

        // Фильтруем metric_values по именам метрик
        const filteredMvData = (mvData.data || []).filter(item => {
          const metricName = (item.user_metrics as any)?.metric_name || '';
          return metricName === 'Body Fat Percentage' || 
                 metricName === 'Процент жира' ||
                 metricName === 'Body Fat %' ||
                 metricName.toLowerCase().includes('body fat') ||
                 metricName.toLowerCase().includes('жир');
        });

        console.log('Filtered metric values:', filteredMvData);

        const bcEntries = (bcData.data || []).map(item => ({
          value: Number(item.body_fat_percentage),
          date: item.measurement_date,
          source: 'manual'
        }));

        const mvEntries = filteredMvData.map(item => ({
          value: Number(item.value),
          date: item.measurement_date,
          source: (item.user_metrics as any)?.source || 'unknown'
        }));

        console.log('BC entries:', bcEntries.length, 'MV entries:', mvEntries.length);

        // Сортируем по дате и приоритету источника
        const allEntries = [...bcEntries, ...mvEntries];
        const priorityMap = { 'withings': 3, 'manual': 1, 'unknown': 0 };
        
        metricData = allEntries
          .sort((a, b) => {
            const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateCompare !== 0) return dateCompare;
            return (priorityMap[b.source as keyof typeof priorityMap] || 0) - (priorityMap[a.source as keyof typeof priorityMap] || 0);
          })
          .filter((entry, index, arr) => {
            const sameDate = arr.filter(e => e.date === entry.date);
            if (sameDate.length === 1) return true;
            return sameDate.indexOf(entry) === 0;
          });
        
        console.log('Final metric data:', metricData.length, 'entries');
      }
      else if (metricType === 'weight') {
        const [bcData, mvData] = await Promise.all([
          supabase
            .from('body_composition')
            .select('weight, measurement_date')
            .eq('user_id', user.id)
            .not('weight', 'is', null)
            .gte('measurement_date', startDate.toISOString().split('T')[0])
            .order('measurement_date', { ascending: true }),
          supabase
            .from('metric_values')
            .select(`value, measurement_date, user_metrics!inner(metric_name, source)`)
            .eq('user_id', user.id)
            .in('user_metrics.metric_name', ['Weight', 'Вес'])
            .gte('measurement_date', startDate.toISOString().split('T')[0])
            .order('measurement_date', { ascending: true })
        ]);

        const bcEntries = (bcData.data || []).map(item => ({
          value: Number(item.weight),
          date: item.measurement_date,
          source: 'manual'
        }));

        const mvEntries = (mvData.data || []).map(item => ({
          value: Number(item.value),
          date: item.measurement_date,
          source: (item.user_metrics as any)?.source || 'unknown'
        }));

        // Сортируем по дате и приоритету источника (Withings > manual)
        const allEntries = [...bcEntries, ...mvEntries];
        const priorityMap = { 'withings': 3, 'manual': 1, 'unknown': 0 };
        
        metricData = allEntries
          .sort((a, b) => {
            const dateCompare = new Date(a.date).getTime() - new Date(b.date).getTime();
            if (dateCompare !== 0) return dateCompare;
            return (priorityMap[b.source as keyof typeof priorityMap] || 0) - (priorityMap[a.source as keyof typeof priorityMap] || 0);
          })
          .filter((entry, index, arr) => {
            // Убираем дубликаты по дате, оставляя с высшим приоритетом
            const sameDate = arr.filter(e => e.date === entry.date);
            if (sameDate.length === 1) return true;
            return sameDate.indexOf(entry) === 0;
          });
      }
      else if (metricType === 'steps') {
        const [dhsData, mvData] = await Promise.all([
          supabase
            .from('daily_health_summary')
            .select('steps, date')
            .eq('user_id', user.id)
            .not('steps', 'is', null)
            .gte('date', startDate.toISOString().split('T')[0])
            .order('date', { ascending: true }),
          supabase
            .from('metric_values')
            .select(`value, measurement_date, user_metrics!inner(metric_name)`)
            .eq('user_id', user.id)
            .in('user_metrics.metric_name', ['Steps', 'Количество шагов'])
            .gte('measurement_date', startDate.toISOString().split('T')[0])
            .order('measurement_date', { ascending: true })
        ]);

        const dhsEntries = (dhsData.data || []).map(item => ({
          value: Number(item.steps),
          date: item.date,
          source: 'health_summary'
        }));

        const mvEntries = (mvData.data || []).map(item => ({
          value: Number(item.value),
          date: item.measurement_date,
          source: 'metric'
        }));

        metricData = [...dhsEntries, ...mvEntries].sort((a, b) => 
          new Date(a.date).getTime() - new Date(b.date).getTime()
        );
      }
      else {
        // Для других метрик (vo2max, recovery, row_2km)
        const metricNames = {
          vo2max: 'VO2Max',
          recovery: 'Recovery Score',
          row_2km: '2KM Row'
        };

        const { data: mvData } = await supabase
          .from('metric_values')
          .select(`value, measurement_date, user_metrics!inner(metric_name, source)`)
          .eq('user_id', user.id)
          .eq('user_metrics.metric_name', metricNames[metricType as keyof typeof metricNames])
          .gte('measurement_date', startDate.toISOString().split('T')[0])
          .order('measurement_date', { ascending: true });

        metricData = (mvData || []).map(item => ({
          value: Number(item.value),
          date: item.measurement_date,
          source: (item.user_metrics as any)?.source || 'unknown'
        }));
      }

      // Вычисляем статистику за весь выбранный период
      if (metricData.length >= 2) {
        // Показываем среднее значение за период для всех метрик
        const sum = metricData.reduce((acc, item) => acc + item.value, 0);
        const current = sum / metricData.length;
        
        console.log(`[${metricType}] Period: ${timeRange}, Data points: ${metricData.length}, Average: ${current.toFixed(2)}`);
        
        const previous = metricData[0].value; // Первое значение в периоде
        const change = current - previous;
        const changePercent = previous !== 0 ? (change / previous) * 100 : 0;
        
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (Math.abs(changePercent) > 1) {
          trend = change > 0 ? 'up' : 'down';
        }

        setStats({
          current,
          previous,
          change,
          changePercent,
          trend,
          unit: config.unit,
          title: config.title,
          description: config.description
        });
      } else if (metricData.length === 1) {
        setStats({
          current: metricData[0].value,
          previous: 0,
          change: 0,
          changePercent: 0,
          trend: 'stable',
          unit: config.unit,
          title: config.title,
          description: config.description
        });
      }

      setData(metricData);
    } catch (error) {
      console.error('Error fetching metric data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!config) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Метрика не найдена</h1>
          <Button onClick={() => navigate('/dashboard')}>
            Вернуться на главную
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Назад
          </Button>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r bg-clip-text text-transparent" 
                style={{ backgroundImage: `linear-gradient(to right, ${config.color.split(' ')[0]}, ${config.color.split(' ')[2]})` }}>
              {config.title}
            </h1>
            <p className="text-muted-foreground">{config.description}</p>
          </div>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2 mb-6">
          {[
            { key: 'week', label: 'Неделя' },
            { key: 'month', label: 'Месяц' },
            { key: '3months', label: '3 месяца' }
          ].map(range => (
            <Button
              key={range.key}
              variant={timeRange === range.key ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(range.key as any)}
            >
              {range.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-6">
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-96 w-full" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Среднее за период
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {stats.current.toFixed(1)} {stats.unit}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Изменение
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2">
                      <div className="text-2xl font-bold">
                        {stats.change > 0 ? '+' : ''}{stats.change.toFixed(1)} {stats.unit}
                      </div>
                      {stats.trend === 'up' && <TrendingUp className="h-5 w-5 text-green-500" />}
                      {stats.trend === 'down' && <TrendingDown className="h-5 w-5 text-red-500" />}
                    </div>
                    <Badge variant={stats.changePercent > 0 ? "default" : "secondary"} className="mt-1">
                      {stats.changePercent > 0 ? '+' : ''}{stats.changePercent.toFixed(1)}%
                    </Badge>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Количество записей
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {data.length}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      за {timeRange === 'week' ? 'неделю' : timeRange === 'month' ? 'месяц' : '3 месяца'}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Chart */}
            {data.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    График изменений
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ProgressChart 
                    data={data.map(item => ({
                      date: item.date,
                      value: item.value
                    }))}
                    title={config.title}
                    unit={config.unit}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12">
                  <div className="text-center">
                    <Calendar className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">Нет данных</h3>
                    <p className="text-muted-foreground mb-4">
                      За выбранный период нет записей для этой метрики
                    </p>
                    <Button onClick={() => navigate('/progress')} variant="outline">
                      Добавить измерение
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent entries */}
            {data.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Последние записи</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.slice(-10).reverse().map((entry, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border">
                        <div>
                          <div className="font-semibold">
                            {entry.value.toFixed(1)} {config.unit}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {format(new Date(entry.date), 'dd MMMM yyyy', { locale: ru })}
                          </div>
                        </div>
                        {entry.source && (
                          <Badge variant="outline" className="text-xs">
                            {entry.source === 'whoop' ? 'Whoop' : 
                             entry.source === 'withings' ? 'Withings' :
                             entry.source === 'manual' ? 'Ручное' : 
                             entry.source}
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}