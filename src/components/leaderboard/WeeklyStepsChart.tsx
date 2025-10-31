import { Bar, BarChart, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { useUserWeeklySteps } from "@/hooks/useUserWeeklySteps";
import { MetricMiniStats } from "./MetricMiniStats";
import { format } from "date-fns";

interface WeeklyStepsChartProps {
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
        <p className="text-sm font-semibold text-chart-1">
          {payload[0].value.toLocaleString()} steps
        </p>
      </div>
    );
  }
  return null;
}

export function WeeklyStepsChart({ userId, height = 60 }: WeeklyStepsChartProps) {
  const { data: stepsData = [], isLoading } = useUserWeeklySteps(userId);

  if (isLoading || stepsData.length === 0) {
    return (
      <div className="w-full bg-muted/20 rounded animate-pulse" style={{ height }} />
    );
  }

  const values = stepsData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const maxValue = Math.max(...values);

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={stepsData}>
          <YAxis domain={[0, maxValue * 1.1]} hide />
          <Tooltip content={<CustomTooltip />} />
          <Bar
            dataKey="value"
            fill="hsl(var(--chart-1))"
            radius={[4, 4, 0, 0]}
            isAnimationActive={false}
          />
        </BarChart>
      </ResponsiveContainer>
      <MetricMiniStats min={min} avg={avg} max={max} unit="" decimals={0} />
    </div>
  );
}
