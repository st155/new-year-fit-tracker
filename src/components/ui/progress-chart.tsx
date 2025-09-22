import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ProgressChartProps {
  data: Array<{ value: number; date: string; notes?: string }>;
  title: string;
  unit: string;
  goalType?: string;
  targetValue?: number;
}

export function ProgressChart({ data, title, unit, goalType, targetValue }: ProgressChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>Недостаточно данных для отображения графика</CardDescription>
        </CardHeader>
        <CardContent className="h-64 flex items-center justify-center text-muted-foreground">
          Добавьте измерения для просмотра прогресса
        </CardContent>
      </Card>
    );
  }

  // Сортируем данные по дате
  const sortedData = [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  // Форматируем данные для графика
  const chartData = sortedData.map(item => ({
    ...item,
    displayDate: format(parseISO(item.date), 'd MMM', { locale: ru }),
    fullDate: format(parseISO(item.date), 'dd MMMM yyyy', { locale: ru })
  }));

  // Определяем тренд
  const firstValue = chartData[0]?.value || 0;
  const lastValue = chartData[chartData.length - 1]?.value || 0;
  const trend = lastValue > firstValue ? 'up' : 'down';
  const trendPercentage = firstValue > 0 ? Math.abs(((lastValue - firstValue) / firstValue) * 100) : 0;

  // Цвета для разных типов целей
  const getLineColor = () => {
    switch (goalType) {
      case 'strength': return 'hsl(var(--primary))';
      case 'cardio': return 'hsl(var(--accent))';
      case 'endurance': return 'hsl(var(--success))';
      case 'body_composition': return 'hsl(var(--secondary))';
      default: return 'hsl(var(--primary))';
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-medium">{data.fullDate}</p>
          <p className="text-primary">
            {payload[0].value} {unit}
          </p>
          {data.notes && (
            <p className="text-sm text-muted-foreground mt-1">{data.notes}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <CardDescription>
              {chartData.length} измерений • Последнее: {chartData[chartData.length - 1]?.value} {unit}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {trend === 'up' ? (
              <TrendingUp className="h-5 w-5 text-success" />
            ) : (
              <TrendingDown className="h-5 w-5 text-destructive" />
            )}
            <span className={`text-sm font-medium ${trend === 'up' ? 'text-success' : 'text-destructive'}`}>
              {trendPercentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            {goalType === 'strength' ? (
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Bar 
                  dataKey="value" 
                  fill={getLineColor()}
                  radius={[2, 2, 0, 0]}
                />
                {targetValue && (
                  <Line
                    type="monotone"
                    dataKey={() => targetValue}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    dot={false}
                  />
                )}
              </BarChart>
            ) : (
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="displayDate" 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <YAxis 
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                />
                <Tooltip content={<CustomTooltip />} />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke={getLineColor()}
                  strokeWidth={2}
                  dot={{ fill: getLineColor(), strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, stroke: getLineColor(), strokeWidth: 2 }}
                />
                {targetValue && (
                  <Line
                    type="monotone"
                    dataKey={() => targetValue}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="5 5"
                    strokeWidth={1}
                    dot={false}
                  />
                )}
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
        {targetValue && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center justify-between text-sm">
              <span>Цель: {targetValue} {unit}</span>
              <span className={`font-medium ${
                lastValue >= targetValue ? 'text-success' : 'text-muted-foreground'
              }`}>
                {lastValue >= targetValue ? 'Достигнута!' : `Осталось: ${(targetValue - lastValue).toFixed(1)} ${unit}`}
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}