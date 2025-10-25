import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MetricColor, METRIC_COLOR_VARS } from '@/lib/metric-config';

interface MetricCardProps {
  title: string;
  value: string;
  unit?: string;
  change?: string;
  subtitle?: string;
  color: MetricColor;
  source?: string;
  sources?: string[];
  onSourceChange?: (source: string) => void;
  onClick?: () => void;
}

export function MetricCard({ 
  title, 
  value, 
  unit, 
  change, 
  subtitle, 
  color, 
  source, 
  sources, 
  onSourceChange,
  onClick 
}: MetricCardProps) {
  const [currentSourceIndex, setCurrentSourceIndex] = useState(0);

  const varName = METRIC_COLOR_VARS[color];
  const wrapperStyle = {
    background: `linear-gradient(135deg, hsl(var(${varName}) / 0.5), hsl(var(${varName}) / 0.15) 35%, transparent)`,
    boxShadow: `0 0 24px hsl(var(${varName}) / 0.35)`,
  };

  const handleSourceClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sources && sources.length > 1 && onSourceChange) {
      const nextIndex = (currentSourceIndex + 1) % sources.length;
      setCurrentSourceIndex(nextIndex);
      onSourceChange(sources[nextIndex]);
    }
  };

  const displaySource = sources && sources.length > 0 ? sources[currentSourceIndex] : source;
  const hasMultipleSources = sources && sources.length > 1;

  return (
    <div
      className={cn(
        'relative rounded-xl p-[2px] transition-all duration-300 hover:scale-105 cursor-pointer'
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
            <div className="flex items-center gap-2">
              {displaySource && (
                <Badge 
                  variant="outline" 
                  className={cn(
                    "text-xs capitalize cursor-pointer hover:bg-accent transition-colors",
                    hasMultipleSources && "animate-pulse"
                  )}
                  onClick={handleSourceClick}
                >
                  {displaySource}
                  {hasMultipleSources && ` (${currentSourceIndex + 1}/${sources.length})`}
                </Badge>
              )}
              {subtitle && !displaySource && (
                <span className="text-xs text-muted-foreground">
                  {subtitle}
                </span>
              )}
            </div>
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
