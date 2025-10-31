import { Area, AreaChart, ResponsiveContainer, YAxis, Tooltip } from "recharts";
import { useUserWeeklyStrain } from "@/hooks/useUserWeeklyStrain";
import { MetricMiniStats } from "./MetricMiniStats";
import { format } from "date-fns";

interface WeeklyStrainChartProps {
  userId: string;
  height?: number;
}

function CustomTooltip({ active, payload }: any) {
  if (active && payload && payload.length) {
    const value = payload[0].value;
    const getZone = (val: number) => {
      if (val >= 18) return { name: 'All Out', color: 'hsl(var(--destructive))' };
      if (val >= 14) return { name: 'Hard', color: 'hsl(var(--chart-5))' };
      if (val >= 10) return { name: 'Moderate', color: 'hsl(var(--chart-3))' };
      return { name: 'Light', color: 'hsl(var(--chart-1))' };
    };
    const zone = getZone(value);
    
    return (
      <div className="bg-card border border-border rounded-lg p-2 shadow-lg">
        <p className="text-xs text-muted-foreground">
          {format(new Date(payload[0].payload.date), 'MMM dd')}
        </p>
        <p className="text-sm font-semibold" style={{ color: zone.color }}>
          {value.toFixed(1)} - {zone.name}
        </p>
      </div>
    );
  }
  return null;
}

export function WeeklyStrainChart({ userId, height = 60 }: WeeklyStrainChartProps) {
  const { data: strainData = [], isLoading } = useUserWeeklyStrain(userId);

  if (isLoading || strainData.length === 0) {
    return (
      <div className="w-full bg-muted/20 rounded animate-pulse" style={{ height }} />
    );
  }

  const values = strainData.map(d => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const maxValue = Math.max(...values, 21);

  const getStrainColor = (value: number) => {
    if (value >= 18) return 'hsl(var(--destructive))';
    if (value >= 14) return 'hsl(var(--chart-5))';
    if (value >= 10) return 'hsl(var(--chart-3))';
    return 'hsl(var(--chart-1))';
  };

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <AreaChart data={strainData}>
          <defs>
            <linearGradient id={`strainGradient-${userId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={getStrainColor(avg)} stopOpacity={0.4} />
              <stop offset="95%" stopColor={getStrainColor(avg)} stopOpacity={0} />
            </linearGradient>
          </defs>
          <YAxis domain={[0, maxValue]} hide />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey="value"
            stroke={getStrainColor(avg)}
            strokeWidth={2}
            fill={`url(#strainGradient-${userId})`}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <MetricMiniStats min={min} avg={avg} max={max} unit="" decimals={1} />
    </div>
  );
}
