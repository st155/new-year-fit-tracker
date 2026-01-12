import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Activity, BarChart3 } from 'lucide-react';
import type { MetricStats } from '@/hooks/useMetricDetail';
import { useTranslation } from 'react-i18next';

interface MetricStatsProps {
  stats: MetricStats;
  unit: string;
  metricName: string;
}

const formatValue = (value: number, metricName: string, t: (key: string, options?: any) => string): string => {
  if (metricName.toLowerCase().includes('sleep') && metricName.toLowerCase().includes('duration')) {
    const hours = Math.floor(value);
    const minutes = Math.round((value - hours) * 60);
    return t('units:duration.hoursMinutes', { hours, minutes });
  }
  
  if (metricName === 'Steps') {
    return Math.round(value).toLocaleString();
  }
  
  return value % 1 === 0 ? value.toString() : value.toFixed(1);
};

export function MetricStats({ stats, unit, metricName }: MetricStatsProps) {
  const { t } = useTranslation(['health', 'units']);
  
  const trendIsPositive = stats.trend > 0;
  const trendIcon = trendIsPositive ? TrendingUp : TrendingDown;
  const trendColor = Math.abs(stats.trend) < 0.5 
    ? 'text-muted-foreground' 
    : trendIsPositive 
      ? 'text-success' 
      : 'text-destructive';

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('metrics.statistics')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4" />
              {t('metrics.average')}
            </p>
            <p className="text-2xl font-bold">
              {formatValue(stats.average, metricName, t)} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              {t('metrics.records')}
            </p>
            <p className="text-2xl font-bold">{stats.count}</p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('metrics.maximum')}
            </p>
            <p className="text-2xl font-bold">
              {formatValue(stats.max, metricName, t)} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              {t('metrics.minimum')}
            </p>
            <p className="text-2xl font-bold">
              {formatValue(stats.min, metricName, t)} <span className="text-sm font-normal text-muted-foreground">{unit}</span>
            </p>
          </div>
        </div>

        <div className="pt-4 border-t">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">{t('metrics.trendDays')}</p>
            <div className={`flex items-center gap-1 ${trendColor}`}>
              {React.createElement(trendIcon, { className: 'h-4 w-4' })}
              <span className="font-semibold">
                {Math.abs(stats.trend).toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
