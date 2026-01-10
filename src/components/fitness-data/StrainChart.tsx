import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useTranslation } from 'react-i18next';

interface StrainChartProps {
  data: { date: string; value: number }[];
}

export function StrainChart({ data }: StrainChartProps) {
  const { t } = useTranslation('fitnessData');
  
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Day Strain</CardTitle>
          <CardDescription>{t('strain.noData')}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const getStrainColor = (value: number) => {
    if (value < 10) return 'hsl(var(--chart-1))'; // Low - blue
    if (value < 14) return 'hsl(var(--chart-2))'; // Moderate - green
    if (value < 18) return 'hsl(var(--chart-3))'; // High - orange
    return 'hsl(var(--chart-4))'; // Extreme - red
  };

  const average = data.reduce((sum, d) => sum + d.value, 0) / data.length;

  const chartData = data.map(d => ({
    ...d,
    fill: getStrainColor(d.value),
  }));

  return (
    <Card>
      <CardHeader>
        <CardTitle>Day Strain</CardTitle>
        <CardDescription>{t('strain.subtitle')}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis
                dataKey="date"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="grid gap-2">
                          <div className="flex flex-col">
                            <span className="text-[0.70rem] uppercase text-muted-foreground">
                              Strain
                            </span>
                            <span className="font-bold text-foreground">
                              {data.value.toFixed(1)}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {data.date}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                y={average}
                stroke="hsl(var(--muted-foreground))"
                strokeDasharray="3 3"
                label={{ value: t('strain.average'), position: 'right' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-1))' }} />
            <span className="text-muted-foreground">{t('strain.levels.low')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-2))' }} />
            <span className="text-muted-foreground">{t('strain.levels.moderate')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-3))' }} />
            <span className="text-muted-foreground">{t('strain.levels.high')}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: 'hsl(var(--chart-4))' }} />
            <span className="text-muted-foreground">{t('strain.levels.extreme')}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
