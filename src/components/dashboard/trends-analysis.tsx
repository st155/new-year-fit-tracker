import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Heart, Activity, Moon, Zap, Target } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ru } from 'date-fns/locale';

interface TrendData {
  metric_name: string;
  current_value: number;
  previous_value: number;
  change_percentage: number;
  trend_direction: 'up' | 'down' | 'stable';
  average_7_days: number;
  average_30_days: number;
}

interface TrendsAnalysisProps {
  selectedDate: Date;
}

export const TrendsAnalysis = ({ selectedDate }: TrendsAnalysisProps) => {
  const { user } = useAuth();
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchTrendsData();
    }
  }, [user, selectedDate]);

  const fetchTrendsData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const endDate = format(selectedDate, 'yyyy-MM-dd');
      const startDate30 = format(subDays(selectedDate, 30), 'yyyy-MM-dd');

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
        .gte('measurement_date', startDate30)
        .lte('measurement_date', endDate)
        .in('user_metrics.metric_name', [
          'Recovery Score', 
          'Sleep Efficiency', 
          'Sleep Performance', 
          'Workout Strain', 
          'Steps', 
          'Количество шагов',
          'Calories',
          'Total Kilocalories',
          'Average Heart Rate'
        ])
        .order('measurement_date', { ascending: true });

      // Группируем и анализируем тренды
      const metricGroups: { [key: string]: Array<{ value: number; date: string }> } = {};
      
      data?.forEach((item: any) => {
        const metricName = item.user_metrics.metric_name;
        const normalizedName = getNormalizedMetricName(metricName);
        
        if (!metricGroups[normalizedName]) {
          metricGroups[normalizedName] = [];
        }
        
        metricGroups[normalizedName].push({
          value: item.value,
          date: item.measurement_date
        });
      });

      const trends: TrendData[] = [];

      Object.entries(metricGroups).forEach(([metricName, values]) => {
        if (values.length < 2) return;

        // Сортируем по дате
        values.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const currentValue = values[values.length - 1]?.value;
        const previousValue = values[values.length - 2]?.value;
        
        if (currentValue === undefined || previousValue === undefined) return;

        const changePercentage = ((currentValue - previousValue) / previousValue) * 100;
        
        let trendDirection: 'up' | 'down' | 'stable' = 'stable';
        if (Math.abs(changePercentage) > 5) {
          trendDirection = changePercentage > 0 ? 'up' : 'down';
        }

        // Средние значения
        const last7Days = values.slice(-7);
        const average7Days = last7Days.reduce((sum, v) => sum + v.value, 0) / last7Days.length;
        const average30Days = values.reduce((sum, v) => sum + v.value, 0) / values.length;

        trends.push({
          metric_name: metricName,
          current_value: currentValue,
          previous_value: previousValue,
          change_percentage: changePercentage,
          trend_direction: trendDirection,
          average_7_days: average7Days,
          average_30_days: average30Days
        });
      });

      setTrendsData(trends);
    } catch (error) {
      console.error('Error fetching trends data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNormalizedMetricName = (metricName: string): string => {
    switch (metricName) {
      case 'Sleep Efficiency':
      case 'Sleep Performance':
        return 'Сон';
      case 'Количество шагов':
      case 'Steps':
        return 'Шаги';
      case 'Total Kilocalories':
      case 'Calories':
        return 'Калории';
      case 'Recovery Score':
        return 'Восстановление';
      case 'Workout Strain':
        return 'Нагрузка';
      case 'Average Heart Rate':
        return 'Пульс';
      default:
        return metricName;
    }
  };

  const getMetricIcon = (metricName: string) => {
    switch (metricName) {
      case 'Восстановление':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'Сон':
        return <Moon className="h-4 w-4 text-purple-500" />;
      case 'Нагрузка':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'Шаги':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'Калории':
        return <Target className="h-4 w-4 text-orange-500" />;
      case 'Пульс':
        return <Heart className="h-4 w-4 text-red-400" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendBadge = (trend: TrendData) => {
    const isPositiveTrend = (metricName: string, direction: string) => {
      // Для нагрузки и пульса покоя "down" - это хорошо
      if (['Нагрузка', 'Пульс'].includes(metricName)) {
        return direction === 'down';
      }
      // Для остальных метрик "up" - это хорошо
      return direction === 'up';
    };

    if (trend.trend_direction === 'stable') {
      return <Badge variant="secondary" className="text-xs">Стабильно</Badge>;
    }

    const isPositive = isPositiveTrend(trend.metric_name, trend.trend_direction);
    return (
      <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
        {trend.trend_direction === 'up' ? '↑' : '↓'} {Math.abs(trend.change_percentage).toFixed(1)}%
      </Badge>
    );
  };

  const getInsight = (trend: TrendData): string => {
    const absChange = Math.abs(trend.change_percentage);
    
    if (trend.trend_direction === 'stable') {
      return 'Показатель остается стабильным';
    }

    switch (trend.metric_name) {
      case 'Восстановление':
        if (trend.trend_direction === 'up') {
          return `Улучшение восстановления на ${absChange.toFixed(1)}% - отличная работа!`;
        } else {
          return `Снижение восстановления на ${absChange.toFixed(1)}% - возможно стоит больше отдыхать`;
        }
      case 'Сон':
        if (trend.trend_direction === 'up') {
          return `Качество сна улучшилось на ${absChange.toFixed(1)}%`;
        } else {
          return `Качество сна снизилось на ${absChange.toFixed(1)}% - проверьте режим сна`;
        }
      case 'Нагрузка':
        if (trend.trend_direction === 'up') {
          return `Нагрузка увеличилась на ${absChange.toFixed(1)}% - следите за восстановлением`;
        } else {
          return `Нагрузка снизилась на ${absChange.toFixed(1)}%`;
        }
      case 'Шаги':
        if (trend.trend_direction === 'up') {
          return `Активность увеличилась на ${absChange.toFixed(1)}% - продолжайте в том же духе!`;
        } else {
          return `Активность снизилась на ${absChange.toFixed(1)}%`;
        }
      default:
        return `Изменение на ${absChange.toFixed(1)}%`;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Анализ трендов...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Основные тренды */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trendsData.map((trend) => (
          <Card key={trend.metric_name}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{trend.metric_name}</CardTitle>
                {getMetricIcon(trend.metric_name)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {trend.current_value.toFixed(trend.metric_name === 'Нагрузка' ? 1 : 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Было: {trend.previous_value.toFixed(trend.metric_name === 'Нагрузка' ? 1 : 0)}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {trend.trend_direction === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    ) : trend.trend_direction === 'down' ? (
                      <TrendingDown className="h-4 w-4 text-red-500" />
                    ) : null}
                    {getTrendBadge(trend)}
                  </div>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    7 дней: {trend.average_7_days.toFixed(trend.metric_name === 'Нагрузка' ? 1 : 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    30 дней: {trend.average_30_days.toFixed(trend.metric_name === 'Нагрузка' ? 1 : 0)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Инсайты и рекомендации */}
      <Card>
        <CardHeader>
          <CardTitle>Инсайты и рекомендации</CardTitle>
          <CardDescription>
            Анализ ваших трендов за последний месяц
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trendsData.map((trend) => (
              <div key={trend.metric_name} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="mt-1">
                  {getMetricIcon(trend.metric_name)}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm">{trend.metric_name}</div>
                  <div className="text-sm text-muted-foreground">
                    {getInsight(trend)}
                  </div>
                </div>
                {getTrendBadge(trend)}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};