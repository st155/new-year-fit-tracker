import { ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MetricCardBaseProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon?: ReactNode;
  change?: string;
  color?: "body-fat" | "weight" | "vo2max" | "row" | "recovery" | "steps" | "purple-500" | "green-500" | "primary" | "orange-500" | "accent" | "red-500" | "blue-500";
  onClick?: () => void;
  className?: string;
  compact?: boolean;
}

export function MetricCardBase({
  title,
  value,
  unit,
  subtitle,
  icon,
  change,
  color = "primary",
  onClick,
  className,
  compact = false,
}: MetricCardBaseProps) {
  const getColorClasses = () => {
    const colorMap: Record<string, string> = {
      'purple-500': 'border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40',
      'green-500': 'border-green-500/20 bg-green-500/5 hover:border-green-500/40',
      'primary': 'border-primary/20 bg-primary/5 hover:border-primary/40',
      'orange-500': 'border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40',
      'accent': 'border-accent/20 bg-accent/5 hover:border-accent/40',
      'red-500': 'border-red-500/20 bg-red-500/5 hover:border-red-500/40',
      'blue-500': 'border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40',
    };
    return colorMap[color] || 'border-border/20 bg-card/5 hover:border-border/40';
  };

  const cssVarMap: Record<string, string> = {
    'body-fat': '--metric-body-fat',
    'weight': '--metric-weight',
    'vo2max': '--metric-vo2max',
    'row': '--metric-row',
    'recovery': '--success',
    'steps': '--metric-steps',
  };

  const varName = cssVarMap[color];
  const wrapperStyle = varName ? {
    background: `linear-gradient(135deg, hsl(var(${varName}) / 0.5), hsl(var(${varName}) / 0.15) 35%, transparent)`,
    boxShadow: `0 0 24px hsl(var(${varName}) / 0.35)`,
  } : undefined;

  if (compact) {
    return (
      <button 
        className={cn(
          "border-2 transition-all duration-500 rounded-xl p-3 text-left w-full",
          "hover:scale-105 hover:shadow-lg active:scale-95",
          "animate-fade-in group",
          getColorClasses(),
          onClick && "cursor-pointer",
          className
        )}
        onClick={onClick}
        disabled={!onClick}
      >
        <div className="flex items-start justify-between mb-2">
          {icon && (
            <div className="p-1.5 rounded-lg bg-background/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
              {icon}
            </div>
          )}
          {change && (
            <Badge 
              variant={change.startsWith('-') ? "destructive" : "default"}
              className="text-[9px] h-4 px-1.5"
            >
              {change}
            </Badge>
          )}
        </div>
        
        <div className="space-y-0.5">
          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
            {title}
          </div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-xl font-bold text-foreground">
              {value}
            </span>
            {unit && (
              <span className="text-[10px] text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
          {subtitle && (
            <div className="text-[9px] text-muted-foreground">
              {subtitle}
            </div>
          )}
        </div>
      </button>
    );
  }

  return (
    <div
      className={cn(
        'relative rounded-xl p-[2px] transition-all duration-300',
        onClick && 'hover:scale-105 cursor-pointer',
        className
      )}
      style={wrapperStyle}
      onClick={onClick}
    >
      <Card className="relative overflow-hidden bg-card rounded-[0.9rem] border-0 h-full">
        <CardContent className="p-4 relative z-10">
          <div className="text-sm font-medium text-muted-foreground mb-2">
            {title}
          </div>
          <div className="flex items-baseline gap-1 mb-2">
            <span className="text-2xl font-bold text-foreground">
              {value}
            </span>
            {unit && (
              <span className="text-sm text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between">
            {subtitle && (
              <span className="text-xs text-muted-foreground">
                {subtitle}
              </span>
            )}
            {change && (
              <Badge
                variant={change.startsWith('-') ? 'destructive' : 'default'}
                className="text-xs"
              >
                {change}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
