import { Card, Metric, Text, AreaChart } from '@tremor/react';
import { Badge } from '@/components/ui/badge';
import { LucideIcon } from 'lucide-react';
import { DataQualityBadge } from '@/components/data-quality/DataQualityBadge';
import { ConflictWarningBadge } from '@/components/data-quality/ConflictWarningBadge';
import { getConfidenceColor } from '@/lib/data-quality';

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

  return (
    <Card 
      className="glass-medium border-white/10 hover:border-primary/30 transition-all"
      style={{ borderLeft: `3px solid ${getConfidenceColor(confidence)}` }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="h-4 w-4 text-white" />
          </div>
          <div className="flex gap-1 items-center">
            {source && (
              <Badge variant="outline" className="text-xs">
                {source}
              </Badge>
            )}
            <DataQualityBadge confidence={confidence} size="compact" showLabel={false} />
            <ConflictWarningBadge metricName={name} />
          </div>
        </div>
        
        <div className="space-y-1 mb-2">
          <Text className="text-muted-foreground">{name}</Text>
          <div className="flex items-baseline gap-1">
            <Metric>
              {value}
            </Metric>
            {unit && (
              <span className="text-sm text-muted-foreground ml-1">{unit}</span>
            )}
          </div>
          {subtitle && (
            <Text className="text-xs text-muted-foreground">{subtitle}</Text>
          )}
        </div>

        {/* Sparkline with Tremor */}
        {sparklineData.length > 0 && (
          <AreaChart
            data={sparklineData}
            index="index"
            categories={['value']}
            colors={['cyan']}
            showLegend={false}
            showXAxis={false}
            showYAxis={false}
            showGridLines={false}
            className="h-12 mt-2"
            curveType="natural"
          />
        )}

        {/* Stale indicator */}
        {isStale && (
          <Badge variant="secondary" className="absolute top-2 right-2 text-xs">
            Устаревшие
          </Badge>
        )}
      </div>
    </Card>
  );
}
