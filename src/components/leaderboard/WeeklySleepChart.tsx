import { Area, AreaChart, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { useUserWeeklySleep } from "@/hooks/useUserWeeklySleep";
import { MetricMiniStats } from "./MetricMiniStats";
import { format } from "date-fns";

interface WeeklySleepChartProps {
  userId: string;
  height?: number;
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    return (
      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
        <p className="text-xs text-muted-foreground">
          {format(new Date(payload[0].payload.date), 'MMM dd')}
        </p>
        <p className="text-sm font-semibold text-chart-2">
          {value.toFixed(1)}% sleep
        </p>
      </div>
    );
  }
  return null;
}

export function WeeklySleepChart({ userId, height = 60 }: WeeklySleepChartProps) {
  const { data: sleepData = [], isLoading } = useUserWeeklySleep(userId);

  if (isLoading) {
    return (
      <div className="w-full bg-muted/20 rounded animate-pulse" style={{ height }} />
    );
  }

  if (sleepData.length === 0) {
    return (
      <div className="flex items-center justify-center bg-muted/10 rounded text-xs text-muted-foreground" style={{ height }}>
        No data available
      </div>
    );
  }

  const values = sleepData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const maxValue = Math.max(...values, 100);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={sleepData}>
          <defs>
            <linearGradient id={`sleepGradient-${userId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-2))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--chart-2))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[0, maxValue]} hide />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--chart-2))"
            strokeWidth={2}
            fill={`url(#sleepGradient-${userId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <MetricMiniStats min={min} avg={avg} max={max} unit="%" decimals={1} />
    </div>
  );
}
