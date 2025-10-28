import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface HeartRateChartProps {
  data: { date: string; value: number }[];
  restingHR?: number;
  maxHR?: number;
}

export function HeartRateChart({ data, restingHR, maxHR }: HeartRateChartProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Heart Rate</CardTitle>
        <CardDescription>Пульс за период</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <defs>
                <linearGradient id="hrGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-4))" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="hsl(var(--chart-4))" stopOpacity={0.1} />
                </linearGradient>
              </defs>
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
                domain={[40, 'auto']}
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
                              HR
                            </span>
                            <span className="font-bold text-foreground">
                              {data.value} bpm
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
              {restingHR && (
                <ReferenceLine
                  y={restingHR}
                  stroke="hsl(var(--primary))"
                  strokeDasharray="3 3"
                  label={{ value: `Resting: ${restingHR}`, position: 'left', fontSize: 12 }}
                />
              )}
              {maxHR && (
                <ReferenceLine
                  y={maxHR}
                  stroke="hsl(var(--destructive))"
                  strokeDasharray="3 3"
                  label={{ value: `Max: ${maxHR}`, position: 'left', fontSize: 12 }}
                />
              )}
              <Area
                type="monotone"
                dataKey="value"
                stroke="hsl(var(--chart-4))"
                strokeWidth={2}
                fill="url(#hrGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* HR Zones */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
          <div className="flex flex-col p-2 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">Recovery</span>
            <span className="font-medium">50-60%</span>
          </div>
          <div className="flex flex-col p-2 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">Fat Burn</span>
            <span className="font-medium">60-70%</span>
          </div>
          <div className="flex flex-col p-2 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">Cardio</span>
            <span className="font-medium">70-80%</span>
          </div>
          <div className="flex flex-col p-2 rounded-lg bg-muted/50">
            <span className="text-xs text-muted-foreground">Peak</span>
            <span className="font-medium">80-90%</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
