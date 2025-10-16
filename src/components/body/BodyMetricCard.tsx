import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { cn } from "@/lib/utils";
import { MetricData } from "@/hooks/useAggregatedBodyMetrics";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface BodyMetricCardProps {
  title: string;
  icon?: React.ReactNode;
  data?: MetricData;
  onClick?: () => void;
}

export function BodyMetricCard({ title, icon, data, onClick }: BodyMetricCardProps) {
  if (!data) {
    return (
      <Card className={cn("relative overflow-hidden", onClick && "cursor-pointer hover:shadow-lg transition-shadow")}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          {icon && <div className="text-muted-foreground opacity-50">{icon}</div>}
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-muted-foreground">No data</div>
          <p className="text-xs text-muted-foreground mt-1">Add measurements</p>
        </CardContent>
      </Card>
    );
  }

  const getTrendIcon = () => {
    if (!data.trend || Math.abs(data.trend) < 0.01) {
      return <Minus className="h-3 w-3" />;
    }
    return data.trend > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!data.trend || Math.abs(data.trend) < 0.01) {
      return 'text-muted-foreground';
    }
    // For body fat, down is good
    if (title === 'Body Fat %') {
      return data.trend < 0 ? 'text-green-400' : 'text-orange-400';
    }
    // For weight and muscle, context matters
    return data.trend > 0 ? 'text-green-400' : 'text-red-400';
  };

  const getSourceBadge = () => {
    const badges = {
      inbody: { label: 'InBody', variant: 'default' as const, className: 'bg-primary/20 text-primary' },
      withings: { label: 'Withings', variant: 'secondary' as const, className: 'bg-blue-500/20 text-blue-400' },
      manual: { label: 'Manual', variant: 'outline' as const, className: '' },
    };
    const badge = badges[data.source];
    return (
      <Badge variant={badge.variant} className={cn("text-xs", badge.className)}>
        {badge.label}
      </Badge>
    );
  };

  const getZoneBadge = () => {
    if (!data.zone) return null;
    
    const zones = {
      athlete: { label: 'Athlete', className: 'bg-green-500/20 text-green-400' },
      optimal: { label: 'Optimal', className: 'bg-green-500/20 text-green-400' },
      average: { label: 'Average', className: 'bg-blue-500/20 text-blue-400' },
      high: { label: 'High', className: 'bg-orange-500/20 text-orange-400' },
      healthy: { label: 'Healthy', className: 'bg-green-500/20 text-green-400' },
      elevated: { label: 'Elevated', className: 'bg-yellow-500/20 text-yellow-400' },
    };

    const zone = zones[data.zone as keyof typeof zones];
    if (!zone) return null;

    return (
      <Badge variant="outline" className={cn("text-xs ml-2", zone.className)}>
        {zone.label}
      </Badge>
    );
  };

  return (
    <Card 
      className={cn(
        "relative overflow-hidden transition-all duration-300",
        onClick && "cursor-pointer hover:shadow-lg hover:scale-[1.02]"
      )}
      onClick={onClick}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{data.value.toFixed(1)}</span>
          <span className="text-sm text-muted-foreground">{data.unit}</span>
        </div>

        {data.trend !== undefined && Math.abs(data.trend) >= 0.01 && (
          <div className={cn("flex items-center gap-1", getTrendColor())}>
            {getTrendIcon()}
            <span className="text-xs font-semibold">
              {Math.abs(data.trend).toFixed(2)}{data.unit}
              {data.trendPercent && (
                <span className="ml-1">({data.trendPercent > 0 ? '+' : ''}{data.trendPercent.toFixed(1)}%)</span>
              )}
            </span>
          </div>
        )}

        {data.sparklineData && data.sparklineData.length > 1 && (
          <div className="h-12 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.sparklineData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2">
            {getSourceBadge()}
            {getZoneBadge()}
          </div>
          <p className="text-xs text-muted-foreground">
            {new Date(data.date).toLocaleDateString()}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
