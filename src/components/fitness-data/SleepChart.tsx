import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Badge } from '@/components/ui/badge';

interface SleepChartProps {
  data: { 
    date: string; 
    deep?: number; 
    light?: number; 
    rem?: number; 
    awake?: number;
    total?: number;
    score?: number;
  }[];
}

export function SleepChart({ data }: SleepChartProps) {
  const latestScore = data[data.length - 1]?.score;
  const averageTotal = data.reduce((sum, d) => sum + (d.total || 0), 0) / data.length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sleep Analysis</CardTitle>
            <CardDescription>Фазы сна по дням</CardDescription>
          </div>
          {latestScore && (
            <Badge variant={latestScore >= 80 ? 'default' : latestScore >= 60 ? 'secondary' : 'destructive'}>
              Score: {latestScore}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
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
                label={{ value: 'Часы', angle: -90, position: 'insideLeft' }}
              />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="rounded-lg border bg-background p-3 shadow-sm">
                        <div className="grid gap-2">
                          <div className="font-medium">{data.date}</div>
                          <div className="grid gap-1 text-sm">
                            {data.deep && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Глубокий:</span>
                                <span className="font-medium">{(data.deep / 60).toFixed(1)}ч</span>
                              </div>
                            )}
                            {data.light && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Легкий:</span>
                                <span className="font-medium">{(data.light / 60).toFixed(1)}ч</span>
                              </div>
                            )}
                            {data.rem && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">REM:</span>
                                <span className="font-medium">{(data.rem / 60).toFixed(1)}ч</span>
                              </div>
                            )}
                            {data.awake && (
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Бодрствование:</span>
                                <span className="font-medium">{(data.awake / 60).toFixed(1)}ч</span>
                              </div>
                            )}
                            {data.total && (
                              <div className="flex items-center justify-between gap-4 pt-1 border-t">
                                <span className="font-medium">Всего:</span>
                                <span className="font-bold">{(data.total / 60).toFixed(1)}ч</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Bar dataKey="deep" stackId="sleep" fill="hsl(var(--chart-1))" name="Глубокий" radius={[0, 0, 0, 0]} />
              <Bar dataKey="light" stackId="sleep" fill="hsl(var(--chart-2))" name="Легкий" radius={[0, 0, 0, 0]} />
              <Bar dataKey="rem" stackId="sleep" fill="hsl(var(--chart-3))" name="REM" radius={[0, 0, 0, 0]} />
              <Bar dataKey="awake" stackId="sleep" fill="hsl(var(--chart-5))" name="Бодрствование" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        
        {/* Summary stats */}
        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="flex flex-col p-2 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">Средняя длительность</span>
            <span className="font-medium">{(averageTotal / 60).toFixed(1)}ч</span>
          </div>
          {latestScore && (
            <div className="flex flex-col p-2 rounded-lg bg-muted/50">
              <span className="text-xs text-muted-foreground">Последний Score</span>
              <span className="font-medium">{latestScore}/100</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
