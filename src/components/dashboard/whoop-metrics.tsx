import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Heart, Moon, Zap, Activity, Calendar } from 'lucide-react';
import { format, subDays, subMonths } from 'date-fns';
import { ru } from 'date-fns/locale';

interface WhoopMetric {
  metric_name: string;
  metric_category: string;
  unit: string;
  value: number;
  measurement_date: string;
  notes?: string;
}

interface AggregatedMetric {
  metric_name: string;
  metric_category: string;
  unit: string;
  avg_value: number;
  min_value: number;
  max_value: number;
  data_points: number;
}

type TimePeriod = '7d' | '30d' | '6m';

interface WhoopMetricsProps {
  selectedDate: Date;
}

export function WhoopMetrics({ selectedDate }: WhoopMetricsProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<WhoopMetric[]>([]);
  const [aggregatedMetrics, setAggregatedMetrics] = useState<AggregatedMetric[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<TimePeriod>('7d');
  const [loading, setLoading] = useState(true);
  const [aggregatedLoading, setAggregatedLoading] = useState(true);
  const [syncAttempted, setSyncAttempted] = useState(false);

  useEffect(() => {
    if (user) {
      fetchWhoopMetrics();
      fetchAggregatedMetrics();
    }
  }, [user, selectedDate, selectedPeriod]);

  // Real-time updates для метрик
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('metric-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'metric_values',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log('Real-time metric update:', payload);
          // Обновляем данные при изменениях
          fetchWhoopMetrics();
          fetchAggregatedMetrics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchWhoopMetrics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      console.log('WhoopMetrics: Fetching data for date:', dateStr, 'user:', user.id);
      
      const { data } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          notes,
          created_at,
          user_metrics!inner (
            metric_name,
            metric_category,
            unit,
            source
          )
        `)
        .eq('user_id', user.id)
        .eq('user_metrics.source', 'whoop')
        .gte('measurement_date', format(subDays(selectedDate, 1), 'yyyy-MM-dd'))
        .lte('measurement_date', dateStr)
        .order('measurement_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Группируем по метрике и берем запись за выбранный день, 
      // если её нет — берем самую свежую из окна (вчера+сегодня)
      const latestMetrics = data?.reduce((acc, item) => {
        const key = `${item.user_metrics.metric_name}_${item.user_metrics.metric_category}`;
        const isToday = item.measurement_date === dateStr;
        if (!acc[key] || (!acc[key].isToday && isToday)) {
          acc[key] = {
            metric_name: item.user_metrics.metric_name,
            metric_category: item.user_metrics.metric_category,
            unit: item.user_metrics.unit,
            value: item.value,
            measurement_date: item.measurement_date,
            notes: item.notes,
            isToday,
          };
        }
        return acc;
      }, {} as Record<string, any>) || {};

      const formattedMetrics = Object.values(latestMetrics) as WhoopMetric[];
      
      console.log('WhoopMetrics: Found metrics:', formattedMetrics.length, 'for date:', dateStr);

      const hasTodayRecovery = formattedMetrics.some(
        (m) => m.metric_name === 'Recovery Score' && m.measurement_date === dateStr
      );

      if (!hasTodayRecovery && !syncAttempted) {
        try {
          await supabase.functions.invoke('whoop-integration', { body: { action: 'sync' } });
          setSyncAttempted(true);
          // Дадим API немного времени и перечитаем
          setTimeout(() => fetchWhoopMetrics(), 1500);
        } catch (e) {
          console.warn('Whoop sync failed or not available yet:', e);
        }
      }

      setMetrics(formattedMetrics);
    } catch (error) {
      console.error('Error fetching Whoop metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAggregatedMetrics = async () => {
    if (!user) return;

    try {
      setAggregatedLoading(true);
      
      const endDate = new Date();
      let startDate: Date;
      
      switch (selectedPeriod) {
        case '7d':
          startDate = subDays(endDate, 7);
          break;
        case '30d':
          startDate = subDays(endDate, 30);
          break;
        case '6m':
          startDate = subMonths(endDate, 6);
          break;
        default:
          startDate = subDays(endDate, 7);
      }

      const { data } = await supabase
        .from('metric_values')
        .select(`
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
        .eq('user_metrics.source', 'whoop')
        .gte('measurement_date', format(startDate, 'yyyy-MM-dd'))
        .lte('measurement_date', format(endDate, 'yyyy-MM-dd'))
        .order('measurement_date');

      // Группируем и агрегируем данные
      const grouped = data?.reduce((acc, item) => {
        const key = `${item.user_metrics.metric_name}_${item.user_metrics.metric_category}`;
        if (!acc[key]) {
          acc[key] = {
            metric_name: item.user_metrics.metric_name,
            metric_category: item.user_metrics.metric_category,
            unit: item.user_metrics.unit,
            values: [],
          };
        }
        acc[key].values.push(item.value);
        return acc;
      }, {} as Record<string, any>) || {};

      const aggregated = Object.values(grouped).map((group: any) => ({
        metric_name: group.metric_name,
        metric_category: group.metric_category,
        unit: group.unit,
        avg_value: group.values.reduce((sum: number, val: number) => sum + val, 0) / group.values.length,
        min_value: Math.min(...group.values),
        max_value: Math.max(...group.values),
        data_points: group.values.length,
      }));

      setAggregatedMetrics(aggregated);
    } catch (error) {
      console.error('Error fetching aggregated Whoop metrics:', error);
    } finally {
      setAggregatedLoading(false);
    }
  };

  const getMetricIcon = (category: string, metricName: string) => {
    switch (category) {
      case 'recovery':
        return <Heart className="h-4 w-4 text-green-500" />;
      case 'sleep':
        return <Moon className="h-4 w-4 text-blue-500" />;
      case 'workout':
        if (metricName.includes('Heart Rate')) {
          return <Heart className="h-4 w-4 text-red-500" />;
        }
        if (metricName.includes('Strain')) {
          return <Zap className="h-4 w-4 text-orange-500" />;
        }
        if (metricName.includes('Calories')) {
          return <Activity className="h-4 w-4 text-purple-500" />;
        }
        return <Activity className="h-4 w-4 text-blue-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const getMetricColor = (category: string, value: number, unit: string) => {
    if (unit === '%') {
      if (category === 'recovery') {
        if (value >= 75) return 'text-green-600';
        if (value >= 50) return 'text-yellow-600';
        return 'text-red-600';
      }
      if (category === 'sleep') {
        if (value >= 85) return 'text-green-600';
        if (value >= 70) return 'text-yellow-600';
        return 'text-red-600';
      }
    }
    return 'text-foreground';
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'recovery':
        return 'Восстановление';
      case 'sleep':
        return 'Сон';
      case 'workout':
        return 'Тренировки';
      default:
        return category;
    }
  };

  const getMetricDisplayName = (metricName: string) => {
    const translations: Record<string, string> = {
      'Recovery Score': 'Очки восстановления',
      'Sleep Efficiency': 'Эффективность сна',
      'Sleep Performance': 'Качество сна', 
      'Sleep Need Fulfillment': 'Выполнение потребности во сне',
      'Workout Strain': 'Нагрузка тренировки',
      'Average Heart Rate': 'Средний пульс',
      'Max Heart Rate': 'Максимальный пульс',
      'Workout Calories': 'Калории тренировки',
    };
    return translations[metricName] || metricName;
  };

  const getPeriodLabel = (period: TimePeriod) => {
    switch (period) {
      case '7d':
        return 'Неделя';
      case '30d':
        return 'Месяц';
      case '6m':
        return '6 месяцев';
      default:
        return 'Неделя';
    }
  };

  const renderAggregatedMetrics = () => {
    if (aggregatedLoading) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Сводка за {getPeriodLabel(selectedPeriod).toLowerCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          </CardContent>
        </Card>
      );
    }

    if (aggregatedMetrics.length === 0) {
      return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Сводка за {getPeriodLabel(selectedPeriod).toLowerCase()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-4">
              Нет данных Whoop за выбранный период
            </p>
          </CardContent>
        </Card>
      );
    }

    const groupedAggregated = aggregatedMetrics.reduce((acc, metric) => {
      const category = metric.metric_category;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(metric);
      return acc;
    }, {} as Record<string, AggregatedMetric[]>);

    return (
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Сводка за {getPeriodLabel(selectedPeriod).toLowerCase()}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={selectedPeriod === '7d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('7d')}
              >
                Неделя
              </Button>
              <Button
                variant={selectedPeriod === '30d' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('30d')}
              >
                Месяц
              </Button>
              <Button
                variant={selectedPeriod === '6m' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPeriod('6m')}
              >
                6 месяцев
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(groupedAggregated).map(([category, categoryMetrics]) => (
              <div key={category} className="space-y-3">
                <h4 className="font-medium flex items-center gap-2">
                  {getMetricIcon(category, '')}
                  {getCategoryTitle(category)}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryMetrics.map((metric, index) => (
                    <div key={index} className="p-3 border rounded-lg space-y-2 bg-muted/30">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {getMetricDisplayName(metric.metric_name)}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {metric.data_points} дней
                        </Badge>
                      </div>
                      
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Среднее</span>
                          <span className="font-medium">
                            {metric.unit === '%' ? Math.round(metric.avg_value) : metric.avg_value.toFixed(1)} {metric.unit}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Диапазон</span>
                          <span>
                            {metric.unit === '%' ? Math.round(metric.min_value) : metric.min_value.toFixed(1)} - {metric.unit === '%' ? Math.round(metric.max_value) : metric.max_value.toFixed(1)} {metric.unit}
                          </span>
                        </div>
                      </div>
                      
                      {metric.unit === '%' && (
                        <Progress value={metric.avg_value} className="h-1.5" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading && aggregatedLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Данные Whoop</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const groupedMetrics = metrics.reduce((acc, metric) => {
    const category = metric.metric_category;
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(metric);
    return acc;
  }, {} as Record<string, WhoopMetric[]>);

  return (
    <div className="space-y-6">
      {/* Аггрегированные данные */}
      {renderAggregatedMetrics()}
      
      {/* Данные за конкретный день */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Данные за {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
            <Badge variant="secondary" className="ml-auto">
              Whoop
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="animate-pulse space-y-4">
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-2/3"></div>
            </div>
          ) : metrics.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              Нет данных Whoop за выбранную дату
            </p>
          ) : (
            <div className="space-y-6">
              {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
                <div key={category} className="space-y-3">
                  <h4 className="font-medium flex items-center gap-2">
                    {getMetricIcon(category, '')}
                    {getCategoryTitle(category)}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {categoryMetrics.map((metric, index) => (
                      <div key={index} className="p-4 border rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">
                            {getMetricDisplayName(metric.metric_name)}
                          </span>
                          {getMetricIcon(category, metric.metric_name)}
                        </div>
                        <div className="flex items-baseline gap-2">
                          <span 
                            className={`text-2xl font-bold ${getMetricColor(category, metric.value, metric.unit)}`}
                          >
                            {metric.unit === '%' ? Math.round(metric.value) : metric.value.toFixed(1)}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {metric.unit}
                          </span>
                        </div>
                        {metric.unit === '%' && (
                          <Progress value={metric.value} className="h-2" />
                        )}
                        {metric.notes && (
                          <p className="text-xs text-muted-foreground capitalize">
                            {metric.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}