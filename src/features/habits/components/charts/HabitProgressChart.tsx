import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Line, Area, ComposedChart, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

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
  const { t, i18n } = useTranslation('habits');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  
  // Prepare chart data
  const chartData = data.map(d => ({
    date: format(new Date(d.date), 'dd MMM', { locale: dateLocale }),
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
        <CardTitle className="text-lg">{t('progress.title')}: {habitName}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          {isDurationCounter ? (
            // Area chart для duration counter (показывает накопление дней)
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id={`streakGradient-${habitName}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--habit-positive))" stopOpacity={0.6}/>
                  <stop offset="50%" stopColor="hsl(var(--habit-positive))" stopOpacity={0.2}/>
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
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              {/* Milestone reference lines */}
              {[7, 30, 90].map(milestone => {
                const hasMilestone = chartData.some(d => d.streakValue >= milestone && d.streakValue < milestone + 5);
                if (!hasMilestone) return null;
                return (
                  <ReferenceLine 
                    key={milestone}
                    y={milestone}
                    stroke="hsl(var(--primary))"
                    strokeDasharray="3 3"
                    label={{ value: t('progress.days', { count: milestone }), position: "right", fill: "hsl(var(--primary))", fontSize: 11 }}
                  />
                );
              })}
              {/* Показываем линии сброса */}
              {chartData.map((d, i) => 
                d.hasReset ? (
                  <ReferenceLine 
                    key={i} 
                    x={d.date} 
                    stroke="hsl(var(--habit-negative))" 
                    strokeDasharray="3 3"
                    label={{ value: t('progress.reset'), position: "top", fill: "hsl(var(--habit-negative))" }}
                  />
                ) : null
              )}
              <Area 
                type="monotone" 
                dataKey="streakValue" 
                stroke="hsl(var(--habit-positive))" 
                strokeWidth={3}
                fillOpacity={1} 
                fill={`url(#streakGradient-${habitName})`}
                name={t('progress.streakDays')}
                dot={{ fill: 'hsl(var(--habit-positive))', r: 4, strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                activeDot={{ r: 6, fill: 'hsl(var(--habit-positive))' }}
                style={{ filter: 'drop-shadow(0 2px 8px hsla(var(--primary), 0.4))' }}
              />
            </ComposedChart>
          ) : (
            // Area chart для daily_check с градиентом
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id={`dailyGradient-${habitName}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--habit-positive))" stopOpacity={0.6}/>
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
                domain={[0, 1]}
                ticks={[0, 1]}
                tickFormatter={(v) => v === 1 ? '✓' : '✗'}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'hsl(var(--card))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '8px',
                  color: 'hsl(var(--foreground))'
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
                formatter={(value: any) => [value === 1 ? t('progress.completed') : t('progress.skipped'), t('progress.status')]}
              />
              <Area
                type="stepAfter"
                dataKey="value"
                stroke="hsl(var(--habit-positive))"
                strokeWidth={3}
                fill={`url(#dailyGradient-${habitName})`}
                dot={{ 
                  fill: 'hsl(var(--habit-positive))', 
                  r: 6,
                  strokeWidth: 2,
                  stroke: 'hsl(var(--background))'
                }}
                activeDot={{ r: 8, fill: 'hsl(var(--habit-positive))' }}
                style={{ filter: 'drop-shadow(0 2px 8px hsla(var(--primary), 0.4))' }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
