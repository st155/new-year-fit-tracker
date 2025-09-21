import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Heart, Moon, Zap, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface WhoopMetric {
  metric_name: string;
  metric_category: string;
  unit: string;
  value: number;
  measurement_date: string;
  notes?: string;
}

interface WhoopMetricsProps {
  selectedDate: Date;
}

export function WhoopMetrics({ selectedDate }: WhoopMetricsProps) {
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<WhoopMetric[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchWhoopMetrics();
    }
  }, [user, selectedDate]);

  const fetchWhoopMetrics = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      
      const { data } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          notes,
          user_metrics!inner (
            metric_name,
            metric_category,
            unit,
            source
          )
        `)
        .eq('user_id', user.id)
        .eq('measurement_date', dateStr)
        .eq('user_metrics.source', 'whoop')
        .order('user_metrics.metric_category')
        .order('user_metrics.metric_name');

      const formattedMetrics = data?.map(item => ({
        metric_name: item.user_metrics.metric_name,
        metric_category: item.user_metrics.metric_category,
        unit: item.user_metrics.unit,
        value: item.value,
        measurement_date: item.measurement_date,
        notes: item.notes,
      })) || [];

      setMetrics(formattedMetrics);
    } catch (error) {
      console.error('Error fetching Whoop metrics:', error);
    } finally {
      setLoading(false);
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

  if (loading) {
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

  if (metrics.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Данные Whoop</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Нет данных Whoop за выбранную дату
          </p>
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
      {Object.entries(groupedMetrics).map(([category, categoryMetrics]) => (
        <Card key={category}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getMetricIcon(category, '')}
              {getCategoryTitle(category)}
              <Badge variant="secondary" className="ml-auto">
                Whoop
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
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
          </CardContent>
        </Card>
      ))}
    </div>
  );
}