import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Heart, Activity, Moon, Zap, Target } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

interface TrendData {
  metric_name: string;
  metric_key: string;
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
  const { t, i18n } = useTranslation('dashboard');
  const [trendsData, setTrendsData] = useState<TrendData[]>([]);
  const [loading, setLoading] = useState(true);
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

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
      const metricGroups: { [key: string]: { key: string; values: Array<{ value: number; date: string }> } } = {};
      
      data?.forEach((item: any) => {
        const metricName = item.user_metrics.metric_name;
        const { key, name } = getNormalizedMetricInfo(metricName);
        
        if (!metricGroups[key]) {
          metricGroups[key] = { key, values: [] };
        }
        
        metricGroups[key].values.push({
          value: item.value,
          date: item.measurement_date
        });
      });

      const trends: TrendData[] = [];

      Object.entries(metricGroups).forEach(([metricKey, { values }]) => {
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
          metric_name: t(`trends.metrics.${metricKey}`),
          metric_key: metricKey,
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

  const getNormalizedMetricInfo = (metricName: string): { key: string; name: string } => {
    switch (metricName) {
      case 'Sleep Efficiency':
      case 'Sleep Performance':
        return { key: 'sleep', name: t('trends.metrics.sleep') };
      case 'Количество шагов':
      case 'Steps':
        return { key: 'steps', name: t('trends.metrics.steps') };
      case 'Total Kilocalories':
      case 'Calories':
        return { key: 'calories', name: t('trends.metrics.calories') };
      case 'Recovery Score':
        return { key: 'recovery', name: t('trends.metrics.recovery') };
      case 'Workout Strain':
        return { key: 'strain', name: t('trends.metrics.strain') };
      case 'Average Heart Rate':
        return { key: 'heartRate', name: t('trends.metrics.heartRate') };
      default:
        return { key: metricName, name: metricName };
    }
  };

  const getMetricIcon = (metricKey: string) => {
    switch (metricKey) {
      case 'recovery':
        return <Heart className="h-4 w-4 text-red-500" />;
      case 'sleep':
        return <Moon className="h-4 w-4 text-purple-500" />;
      case 'strain':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'steps':
        return <Activity className="h-4 w-4 text-blue-500" />;
      case 'calories':
        return <Target className="h-4 w-4 text-orange-500" />;
      case 'heartRate':
        return <Heart className="h-4 w-4 text-red-400" />;
      default:
        return <TrendingUp className="h-4 w-4 text-gray-500" />;
    }
  };

  const getTrendBadge = (trend: TrendData) => {
    const isPositiveTrend = (metricKey: string, direction: string) => {
      // Для нагрузки и пульса покоя "down" - это хорошо
      if (['strain', 'heartRate'].includes(metricKey)) {
        return direction === 'down';
      }
      // Для остальных метрик "up" - это хорошо
      return direction === 'up';
    };

    if (trend.trend_direction === 'stable') {
      return <Badge variant="secondary" className="text-xs">{t('trends.stable')}</Badge>;
    }

    const isPositive = isPositiveTrend(trend.metric_key, trend.trend_direction);
    return (
      <Badge variant={isPositive ? "default" : "destructive"} className="text-xs">
        {trend.trend_direction === 'up' ? '↑' : '↓'} {Math.abs(trend.change_percentage).toFixed(1)}%
      </Badge>
    );
  };

  const getInsight = (trend: TrendData): string => {
    const absChange = Math.abs(trend.change_percentage).toFixed(1);
    
    if (trend.trend_direction === 'stable') {
      return t('trends.stableInsight');
    }

    switch (trend.metric_key) {
      case 'recovery':
        return trend.trend_direction === 'up' 
          ? t('trends.insights.recoveryUp', { change: absChange })
          : t('trends.insights.recoveryDown', { change: absChange });
      case 'sleep':
        return trend.trend_direction === 'up'
          ? t('trends.insights.sleepUp', { change: absChange })
          : t('trends.insights.sleepDown', { change: absChange });
      case 'strain':
        return trend.trend_direction === 'up'
          ? t('trends.insights.strainUp', { change: absChange })
          : t('trends.insights.strainDown', { change: absChange });
      case 'steps':
        return trend.trend_direction === 'up'
          ? t('trends.insights.stepsUp', { change: absChange })
          : t('trends.insights.stepsDown', { change: absChange });
      default:
        return t('trends.insights.default', { change: absChange });
    }
  };

  if (loading) {
    return <div className="text-center py-8">{t('trends.loading')}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Основные тренды */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {trendsData.map((trend) => (
          <Card key={trend.metric_key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium">{trend.metric_name}</CardTitle>
                {getMetricIcon(trend.metric_key)}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      {trend.current_value.toFixed(trend.metric_key === 'strain' ? 1 : 0)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('trends.was')}: {trend.previous_value.toFixed(trend.metric_key === 'strain' ? 1 : 0)}
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
                    {t('trends.days7')}: {trend.average_7_days.toFixed(trend.metric_key === 'strain' ? 1 : 0)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {t('trends.days30')}: {trend.average_30_days.toFixed(trend.metric_key === 'strain' ? 1 : 0)}
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
          <CardTitle>{t('trends.insightsTitle')}</CardTitle>
          <CardDescription>
            {t('trends.insightsDesc')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {trendsData.map((trend) => (
              <div key={trend.metric_key} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                <div className="mt-1">
                  {getMetricIcon(trend.metric_key)}
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
