import { Metric, Text, AreaChart } from '@tremor/react';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { DataQualityBadge } from '@/components/data-quality/DataQualityBadge';
import { ConflictWarningBadge } from '@/components/data-quality/ConflictWarningBadge';
import { getConfidenceColor } from '@/lib/data-quality';
import { FitnessCard } from '@/components/ui/fitness-card';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  name: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  color: string;
  source?: string;
  isStale?: boolean;
  sparkline?: { value: number }[];
  subtitle?: string;
  confidence?: number;
}

export function MetricCard({
  name,
  value,
  unit,
  icon: Icon,
  color,
  source,
  isStale,
  sparkline,
  subtitle,
  confidence = 0,
}: MetricCardProps) {
  const sparklineData = sparkline?.map((s, idx) => ({ 
    index: idx.toString(), 
    value: s.value 
  })) || [];

  const getChartColor = () => {
    if (color.includes('green') || color.includes('emerald')) return 'emerald';
    if (color.includes('orange')) return 'orange';
    if (color.includes('red') || color.includes('pink')) return 'rose';
    if (color.includes('blue') || color.includes('indigo')) return 'indigo';
    if (color.includes('cyan')) return 'cyan';
    return 'cyan';
  };

  return (
    <FitnessCard 
      variant={confidence > 80 ? "gradient" : "default"}
      className={cn(
        "hover:scale-[1.02] transition-all duration-300",
        confidence > 90 && "neon-border"
      )}
    >
      <div className="p-6">
        {/* Icon with gradient background */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg",
            color
          )}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <div className="flex gap-2 items-center flex-wrap justify-end">
            {source && (
              <Badge variant="outline" className="text-xs backdrop-blur-sm">
                {source}
              </Badge>
            )}
            <DataQualityBadge confidence={confidence} size="compact" showLabel={false} />
            <ConflictWarningBadge metricName={name} />
          </div>
        </div>
        
        {/* Metric value */}
        <div className="space-y-2 mb-4">
          <Text className="text-muted-foreground text-sm font-medium">{name}</Text>
          <div className="flex items-baseline gap-2">
            <div className={cn(
              "text-3xl font-bold",
              confidence > 80 && "metric-glow"
            )}>
              {value}
            </div>
            {unit && (
              <span className="text-lg text-muted-foreground">{unit}</span>
            )}
          </div>
          {subtitle && (
            <Text className="text-xs text-muted-foreground/80">{subtitle}</Text>
          )}
        </div>

        {/* Sparkline with improved styling */}
        {sparklineData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10">
            <AreaChart
              data={sparklineData}
              index="index"
              categories={['value']}
              colors={[getChartColor()]}
              showLegend={false}
              showXAxis={false}
              showYAxis={false}
              showGridLines={false}
              className="h-16"
              curveType="natural"
            />
          </div>
        )}

        {/* Stale indicator */}
        {isStale && (
          <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
            Устаревшие
          </Badge>
        )}
      </div>
    </FitnessCard>
  );
}
