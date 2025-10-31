import { Area, AreaChart, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { useUserWeeklyRecovery } from "@/hooks/useUserWeeklyRecovery";
import { MetricMiniStats } from "./MetricMiniStats";
import { format } from "date-fns";

interface WeeklyRecoveryChartProps {
  userId: string;
  height?: number;
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
        <p className="text-xs text-muted-foreground">
          {format(new Date(payload[0].payload.date), 'MMM dd')}
        </p>
        <p className="text-sm font-semibold text-chart-3">
          {Math.round(payload[0].value)}% recovery
        </p>
      </div>
    );
  }
  return null;
}

export function WeeklyRecoveryChart({ userId, height = 60 }: WeeklyRecoveryChartProps) {
  const { data: recoveryData = [], isLoading } = useUserWeeklyRecovery(userId);

  if (isLoading || recoveryData.length === 0) {
    return (
      <div className="w-full bg-muted/20 rounded animate-pulse" style={{ height }} />
    );
  }

  const values = recoveryData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={recoveryData}>
          <defs>
            <linearGradient id={`recoveryGradient-${userId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--chart-3))" stopOpacity={0.4} />
              <stop offset="95%" stopColor="hsl(var(--chart-3))" stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[0, 100]} hide />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke="hsl(var(--chart-3))"
            strokeWidth={2}
            fill={`url(#recoveryGradient-${userId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <MetricMiniStats min={min} avg={avg} max={max} unit="%" decimals={0} />
    </div>
  );
}
