import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarIcon, TrendingUp, TrendingDown, Minus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface PeriodComparisonProps {
  clientId: string;
}

interface MetricComparison {
  name: string;
  period1Value: number | null;
  period2Value: number | null;
  change: number;
  changePercent: number;
  unit: string;
  improved: boolean | null;
}

export function PeriodComparison({ clientId }: PeriodComparisonProps) {
  const [period1, setPeriod1] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
    to: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
  });

  const [period2, setPeriod2] = useState<DateRange | undefined>({
    from: new Date(Date.now() - 29 * 24 * 60 * 60 * 1000),
    to: new Date(),
  });

  const { data: comparison, isLoading } = useQuery({
    queryKey: ['period-comparison', clientId, period1, period2],
    queryFn: async () => {
      if (!period1?.from || !period1?.to || !period2?.from || !period2?.to) {
        return null;
      }

      // Fetch metrics for both periods
      const { data: metrics1 } = await supabase
        .from('unified_metrics')
        .select('*')
        .eq('user_id', clientId)
        .gte('measurement_date', format(period1.from, 'yyyy-MM-dd'))
        .lte('measurement_date', format(period1.to, 'yyyy-MM-dd'));

      const { data: metrics2 } = await supabase
        .from('unified_metrics')
        .select('*')
        .eq('user_id', clientId)
        .gte('measurement_date', format(period2.from, 'yyyy-MM-dd'))
        .lte('measurement_date', format(period2.to, 'yyyy-MM-dd'));

      if (!metrics1 || !metrics2) return [];

      // Calculate averages for key metrics
      const metricNames = ['Recovery Score', 'Day Strain', 'Sleep Duration', 'Sleep Efficiency', 'Steps', 'Weight', 'HRV'];
      
      const comparisons: MetricComparison[] = metricNames.map((name) => {
        const period1Metrics = metrics1.filter((m) => m.metric_name === name);
        const period2Metrics = metrics2.filter((m) => m.metric_name === name);

        const avg1 = period1Metrics.length > 0
          ? period1Metrics.reduce((sum, m) => sum + Number(m.value), 0) / period1Metrics.length
          : null;

        const avg2 = period2Metrics.length > 0
          ? period2Metrics.reduce((sum, m) => sum + Number(m.value), 0) / period2Metrics.length
          : null;

        let change = 0;
        let changePercent = 0;
        let improved: boolean | null = null;

        if (avg1 !== null && avg2 !== null) {
          change = avg2 - avg1;
          changePercent = avg1 !== 0 ? (change / avg1) * 100 : 0;
          
          // Determine if change is improvement (higher is better for most metrics, except Weight could be either)
          const higherIsBetter = ['Recovery Score', 'Sleep Duration', 'Sleep Efficiency', 'HRV'].includes(name);
          const lowerIsBetter = ['Day Strain'].includes(name);
          
          if (higherIsBetter) {
            improved = change > 0;
          } else if (lowerIsBetter) {
            improved = change < 0;
          }
        }

        const unit = period2Metrics[0]?.unit || period1Metrics[0]?.unit || '';

        return {
          name,
          period1Value: avg1,
          period2Value: avg2,
          change,
          changePercent,
          unit,
          improved,
        };
      }).filter((m) => m.period1Value !== null || m.period2Value !== null);

      return comparisons;
    },
    enabled: !!clientId && !!period1?.from && !!period1?.to && !!period2?.from && !!period2?.to,
  });

  const renderTrendIcon = (improved: boolean | null) => {
    if (improved === null) return <Minus className="h-4 w-4" />;
    return improved ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />;
  };

  const renderChangeBadge = (changePercent: number, improved: boolean | null) => {
    if (improved === null) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Minus className="h-3 w-3" />
          {changePercent.toFixed(1)}%
        </Badge>
      );
    }

    return (
      <Badge
        variant={improved ? 'default' : 'destructive'}
        className="gap-1"
      >
        {improved ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {Math.abs(changePercent).toFixed(1)}%
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Period Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Период 1</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !period1 && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {period1?.from ? (
                    period1.to ? (
                      <>
                        {format(period1.from, 'd MMM', { locale: ru })} -{' '}
                        {format(period1.to, 'd MMM yyyy', { locale: ru })}
                      </>
                    ) : (
                      format(period1.from, 'd MMM yyyy', { locale: ru })
                    )
                  ) : (
                    <span>Выберите период</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={period1?.from}
                  selected={period1}
                  onSelect={setPeriod1}
                  numberOfMonths={2}
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Период 2</CardTitle>
          </CardHeader>
          <CardContent>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    'w-full justify-start text-left font-normal',
                    !period2 && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {period2?.from ? (
                    period2.to ? (
                      <>
                        {format(period2.from, 'd MMM', { locale: ru })} -{' '}
                        {format(period2.to, 'd MMM yyyy', { locale: ru })}
                      </>
                    ) : (
                      format(period2.from, 'd MMM yyyy', { locale: ru })
                    )
                  ) : (
                    <span>Выберите период</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={period2?.from}
                  selected={period2}
                  onSelect={setPeriod2}
                  numberOfMonths={2}
                  locale={ru}
                />
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Results */}
      <Card>
        <CardHeader>
          <CardTitle>Сравнение метрик</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !comparison || comparison.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Нет данных для сравнения в выбранных периодах
            </div>
          ) : (
            <div className="space-y-4">
              {comparison.map((metric) => (
                <div
                  key={metric.name}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="font-medium">{metric.name}</div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {metric.period1Value?.toFixed(1) || '—'} {metric.unit}
                      <span className="mx-2">→</span>
                      {metric.period2Value?.toFixed(1) || '—'} {metric.unit}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-sm font-medium">
                        {metric.change > 0 ? '+' : ''}
                        {metric.change.toFixed(1)} {metric.unit}
                      </div>
                    </div>
                    {renderChangeBadge(metric.changePercent, metric.improved)}
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
