import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react';
import { Line, LineChart, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface MetricStatsCardProps {
  title: string;
  icon?: LucideIcon;
  current: number;
  average: number;
  min: number;
  max: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  trendPercent: number;
  sparklineData: { date: string; value: number }[];
  color?: string;
}

export function MetricStatsCard({
  title,
  icon: Icon,
  current,
  average,
  min,
  max,
  unit,
  trend,
  trendPercent,
  sparklineData,
  color = 'hsl(var(--primary))',
}: MetricStatsCardProps) {
  const { t } = useTranslation('trainerDashboard');

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up':
        return 'text-green-500';
      case 'down':
        return 'text-red-500';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {Icon && <Icon className="h-4 w-4" style={{ color }} />}
            {title}
          </CardTitle>
          <Badge variant="outline" className="gap-1">
            {getTrendIcon()}
            <span className={getTrendColor()}>
              {Math.abs(trendPercent).toFixed(1)}%
            </span>
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Current Value */}
          <div>
            <div className="text-3xl font-bold">
              {current.toFixed(1)}
              <span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span>
            </div>
            <p className="text-xs text-muted-foreground">{t('visualization.currentValue')}</p>
          </div>

          {/* Sparkline */}
          {sparklineData.length > 0 && (
            <div className="h-16 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={sparklineData}>
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={color}
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Stats Row */}
          <div className="grid grid-cols-3 gap-2 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground">{t('visualization.average')}</p>
              <p className="font-medium text-sm">{average.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('visualization.min')}</p>
              <p className="font-medium text-sm">{min.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{t('visualization.max')}</p>
              <p className="font-medium text-sm">{max.toFixed(1)}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
