import { cn } from "@/lib/utils";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

interface MetricCardProps {
  title: string;
  value?: string | number;
  unit?: string;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

export function MetricCard({
  title,
  value,
  unit,
  change,
  trend,
  icon,
  className,
  children
}: MetricCardProps) {
  const getTrendIcon = () => {
    if (!trend || trend === 'stable') return <Minus className="h-3 w-3" />;
    return trend === 'up' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const getTrendColor = () => {
    if (!trend || trend === 'stable') return 'text-muted-foreground';
    return trend === 'up' ? 'text-green-400' : 'text-red-400';
  };

  return (
    <div className={cn("inbody-card p-4", className)}>
      <div className="flex items-start justify-between mb-2">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          {title}
        </h3>
        {icon && <div className="text-primary/60">{icon}</div>}
      </div>
      
      {children || (
        <>
          <div className="flex items-baseline gap-1">
            <span className="text-3xl font-bold metric-glow">
              {typeof value === 'number' ? value.toFixed(1) : value}
            </span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          
          {change !== undefined && trend && (
            <div className={cn("flex items-center gap-1 mt-1", getTrendColor())}>
              {getTrendIcon()}
              <span className="text-xs font-semibold">
                {Math.abs(change).toFixed(2)}{unit}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
