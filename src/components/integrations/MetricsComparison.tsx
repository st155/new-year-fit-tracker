import { useUnifiedMetricsQuery } from '@/hooks/metrics';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';

export function MetricsComparison() {
  const { user } = useAuth();
  const [selectedMetric, setSelectedMetric] = useState<string>('');
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);
  
  const { data: metrics = [], isLoading: loading } = useUnifiedMetricsQuery(
    user?.id, 
    {
      metricName: selectedMetric || undefined,
      startDate,
      endDate: new Date()
    }
  );

  // Получаем уникальные метрики
  const uniqueMetrics = Array.from(new Set(metrics.map(m => m.metric_name)));

  // Группируем данные по дате для графика
  const chartData = metrics.reduce((acc, metric) => {
    const dateKey = metric.measurement_date;
    if (!acc[dateKey]) {
      acc[dateKey] = { date: dateKey, [metric.metric_name]: {} };
    }
    
    // Добавляем значение от этого источника
    if (!acc[dateKey][metric.metric_name]) {
      acc[dateKey][metric.metric_name] = {};
    }
    acc[dateKey][metric.metric_name][metric.source] = metric.value;
    
    return acc;
  }, {} as Record<string, any>);

  const chartArray = Object.values(chartData).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  // Цвета для источников
  const sourceColors: Record<string, string> = {
    whoop: '#FF3B30',
    withings: '#007AFF',
    terra: '#34C759',
    unified: '#5856D6'
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[400px] w-full" />
        <Skeleton className="h-[200px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Детальное сравнение источников данных</CardTitle>
          <CardDescription>
            Сравните показатели от разных устройств и посмотрите как они отличаются
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Выберите метрику:</label>
            <Select value={selectedMetric} onValueChange={setSelectedMetric}>
              <SelectTrigger className="w-[250px]">
                <SelectValue placeholder="Все метрики" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Все метрики</SelectItem>
                {uniqueMetrics.map(metric => (
                  <SelectItem key={metric} value={metric}>
                    {metric}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {chartArray.length > 0 && (
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartArray}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(date) => format(new Date(date), 'dd MMM', { locale: ru })}
                    className="text-xs"
                  />
                  <YAxis className="text-xs" />
                  <Tooltip 
                    labelFormatter={(date) => format(new Date(date), 'dd MMMM yyyy', { locale: ru })}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend />
                  
                  {/* Линии для каждого источника */}
                  {Object.keys(chartArray[0] || {})
                    .filter(key => key !== 'date')
                    .map(source => (
                      <Line
                        key={source}
                        type="monotone"
                        dataKey={source}
                        stroke={sourceColors[source] || '#8884d8'}
                        strokeWidth={source === 'unified' ? 3 : 2}
                        dot={source === 'unified'}
                        name={source === 'unified' ? 'Агрегированное' : source.toUpperCase()}
                      />
                    ))}
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Таблица с детальным сравнением */}
      <Card>
        <CardHeader>
          <CardTitle>Сравнительная таблица</CardTitle>
          <CardDescription>
            Детальное сравнение значений от разных источников
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.slice(0, 10).map((metric, index) => (
              <div key={index} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold">{metric.metric_name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(metric.measurement_date), 'dd MMMM yyyy', { locale: ru })}
                    </p>
                  </div>
                  <Badge variant="secondary">
                    {metric.value} {metric.unit}
                  </Badge>
                </div>
                
                <div className="bg-muted/50 rounded-md p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium uppercase">{metric.source}</span>
                    <span className="text-sm">
                      {metric.value} {metric.unit}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
