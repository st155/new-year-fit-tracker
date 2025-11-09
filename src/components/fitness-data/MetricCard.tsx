import { Metric, Text, AreaChart } from '@tremor/react';
import { Badge } from '@/components/ui/badge';
import { LucideIcon, ArrowUp, ArrowDown } from 'lucide-react';
import { DataQualityBadge } from '@/components/data-quality/DataQualityBadge';
import { ConflictWarningBadge } from '@/components/data-quality/ConflictWarningBadge';
import { getConfidenceColor } from '@/lib/data-quality';
import { FitnessCard } from '@/components/ui/fitness-card';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
  };
}

function TrendIndicator({ trend }: { trend: { value: number; direction: 'up' | 'down' | 'neutral' } }) {
  if (trend.direction === 'neutral') return null;
  
  const isPositive = trend.direction === 'up';
  
  return (
    <div className={cn(
      "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
      isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
    )}>
      {isPositive ? (
        <ArrowUp className="h-3 w-3" />
      ) : (
        <ArrowDown className="h-3 w-3" />
      )}
      <span>{Math.abs(trend.value)}%</span>
    </div>
  );
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
  trend,
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
        "group cursor-pointer transition-all duration-300",
        "hover:scale-[1.03] hover:shadow-2xl",
        confidence > 90 && "neon-border"
      )}
    >
      <div className="p-6">
        {/* Icon with gradient background */}
        <div className="flex items-start justify-between mb-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center shadow-lg relative",
            "transition-all duration-300 group-hover:scale-110 group-hover:shadow-2xl",
            color
          )}>
            <Icon className="h-6 w-6 text-white transition-transform group-hover:rotate-12" />
            
            {/* Real-time status indicator */}
            {!isStale && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse border-2 border-background" />
            )}
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
          <div className="flex items-baseline gap-2 flex-wrap">
            <div className={cn(
              "text-3xl font-bold",
              confidence > 80 && "metric-glow"
            )}>
              {value}
            </div>
            {unit && (
              <span className="text-lg text-muted-foreground">{unit}</span>
            )}
            {trend && <TrendIndicator trend={trend} />}
          </div>
          {subtitle && (
            <Text className="text-xs text-muted-foreground/80">{subtitle}</Text>
          )}
        </div>

        {/* Confidence progress bar */}
        {confidence > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Data Quality</span>
              <span>{confidence}%</span>
            </div>
            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${confidence}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className={cn(
                  "h-full rounded-full",
                  confidence > 80 ? "bg-gradient-to-r from-green-400 to-emerald-500" :
                  confidence > 50 ? "bg-gradient-to-r from-yellow-400 to-orange-500" :
                  "bg-gradient-to-r from-red-400 to-red-500"
                )}
              />
            </div>
          </div>
        )}

        {/* Sparkline with improved styling */}
        {sparklineData.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 transition-all duration-300 group-hover:scale-105">
            <AreaChart
              data={sparklineData}
              index="index"
              categories={['value']}
              colors={[getChartColor()]}
              showLegend={false}
              showXAxis={false}
              showYAxis={false}
              showGridLines={false}
              className="h-24"
              curveType="natural"
              showAnimation={true}
              animationDuration={500}
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
