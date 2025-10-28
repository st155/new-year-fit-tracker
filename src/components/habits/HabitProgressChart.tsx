import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Line, Area, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface HabitProgressChartProps {
  habitId: string;
  habitName: string;
  habitType: string;
  data: Array<{
    date: string;
    completed: boolean;
    streak_day?: number;
    reset?: boolean;
    value?: number;
  }>;
}

export function HabitProgressChart({ habitName, habitType, data }: HabitProgressChartProps) {
  // Prepare chart data
  const chartData = data.map(d => ({
    date: format(new Date(d.date), 'dd MMM', { locale: ru }),
    fullDate: d.date,
    // Для daily_check: 1 = выполнено, 0 = пропущено
    value: d.completed ? 1 : 0,
    // Для duration_counter: накопленные дни
    streakValue: d.streak_day || 0,
    // Падения отмечаем
    hasReset: d.reset || false,
  }));

  const isDurationCounter = habitType === 'duration_counter';

  return (
    <Card className="glass-card border-white/10">
      <CardHeader>
        <CardTitle className="text-lg">Прогресс: {habitName}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={200}>
          {isDurationCounter ? (
            // Area chart для duration counter (показывает накопление дней)
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id={`streakGradient-${habitName}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--habit-positive))" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="hsl(var(--habit-positive))" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              {/* Показываем линии сброса */}
              {chartData.map((d, i) => 
                d.hasReset ? (
                  <ReferenceLine 
                    key={i} 
                    x={d.date} 
                    stroke="hsl(var(--habit-negative))" 
                    strokeDasharray="3 3"
                    label={{ value: "Сброс", position: "top", fill: "hsl(var(--habit-negative))" }}
                  />
                ) : null
              )}
              <Area 
                type="monotone" 
                dataKey="streakValue" 
                stroke="hsl(var(--habit-positive))" 
                fillOpacity={1} 
                fill={`url(#streakGradient-${habitName})`}
                name="Дни стрика"
              />
            </ComposedChart>
          ) : (
            // Line chart для daily_check (точки = выполнения)
            <ComposedChart data={chartData}>
              <XAxis 
                dataKey="date" 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis 
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                domain={[0, 1]}
                ticks={[0, 1]}
                tickFormatter={(v) => v === 1 ? '✓' : '✗'}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--background))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: any) => [value === 1 ? 'Выполнено' : 'Пропущено', 'Статус']}
              />
              <Line 
                type="stepAfter" 
                dataKey="value" 
                stroke="hsl(var(--habit-positive))" 
                strokeWidth={2}
                dot={{ 
                  fill: 'hsl(var(--habit-positive))', 
                  r: 4,
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))'
                }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
