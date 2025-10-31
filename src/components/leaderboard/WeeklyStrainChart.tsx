import { Area, AreaChart, ResponsiveContainer, YAxis } from "recharts";
import { useUserWeeklyStrain } from "@/hooks/useUserWeeklyStrain";

interface WeeklyStrainChartProps {
  userId: string;
  height?: number;
}

export function WeeklyStrainChart({ userId, height = 60 }: WeeklyStrainChartProps) {
  const { data: strainData = [], isLoading } = useUserWeeklyStrain(userId);

  if (isLoading || strainData.length === 0) {
    return (
      <div className="w-full bg-muted/20 rounded animate-pulse" style={{ height }} />
    );
  }

  const getStrainColor = (value: number) => {
    if (value >= 18) return 'hsl(var(--destructive))';
    if (value >= 14) return 'hsl(var(--chart-5))';
    if (value >= 10) return 'hsl(var(--chart-3))';
    return 'hsl(var(--chart-1))';
  };

  const maxValue = Math.max(...strainData.map(d => d.value), 21);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={strainData}>
        <defs>
          <linearGradient id={`strainGradient-${userId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <YAxis domain={[0, maxValue]} hide />
        <Area
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          fill={`url(#strainGradient-${userId})`}
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
