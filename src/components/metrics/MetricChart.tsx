import { useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MetricRecord } from '@/hooks/useMetricDetail';

interface MetricChartProps {
  records: MetricRecord[];
  metricName: string;
  color: string;
}

export function MetricChart({ records, metricName, color }: MetricChartProps) {
  const chartData = useMemo(() => {
    // Group by date and take average if multiple values per day
    const groupedByDate = records.reduce((acc, record) => {
      const date = record.measurement_date;
      if (!acc[date]) {
        acc[date] = { values: [], date };
      }
      acc[date].values.push(record.value);
      return acc;
    }, {} as Record<string, { values: number[]; date: string }>);

    return Object.values(groupedByDate)
      .map(({ date, values }) => ({
        date,
        value: values.reduce((sum, v) => sum + v, 0) / values.length,
        displayDate: format(parseISO(date), 'd MMM', { locale: ru }),
      }))
      .reverse(); // Oldest to newest for chart
  }, [records]);

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>История</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground text-center py-8">
            Нет данных для отображения
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>История за последние 90 дней</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="displayDate"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
              }}
              labelStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Area
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              fill="url(#colorValue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
