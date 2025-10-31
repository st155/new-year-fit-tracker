interface MetricMiniStatsProps {
  min: number;
  avg: number;
  max: number;
  unit?: string;
  decimals?: number;
}

export function MetricMiniStats({ min, avg, max, unit = '', decimals = 1 }: MetricMiniStatsProps) {
  const format = (value: number) => {
    return decimals === 0 ? Math.round(value) : value.toFixed(decimals);
  };

  return (
    <div className="flex items-center justify-between text-xs text-muted-foreground mt-1">
      <span>Min: {format(min)}{unit}</span>
      <span className="font-semibold text-foreground">Avg: {format(avg)}{unit}</span>
      <span>Max: {format(max)}{unit}</span>
    </div>
  );
}
