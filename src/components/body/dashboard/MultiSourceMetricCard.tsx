import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Info, TrendingUp, TrendingDown } from 'lucide-react';
import { rechartsTooltipStyle } from '@/lib/chart-styles';
import { cn } from '@/lib/utils';
import { MetricValue, TimelineEntry } from '@/hooks/composite/data/useMultiSourceBodyData';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format, parseISO } from 'date-fns';
import { useMemo } from 'react';
import { ResponsiveContainer, AreaChart, Area, YAxis, Tooltip as RechartsTooltip } from 'recharts';

interface MultiSourceMetricCardProps {
  title: string;
  icon: React.ReactNode;
  data?: MetricValue;
  unit?: string;
  allSources?: MetricValue[]; // All available sources for this metric
  sparklineData?: Array<{date: string; value: number}>; // Pre-computed sparkline data
  trend?: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'stable';
  };
}

const SOURCE_COLORS = {
  INBODY: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  WITHINGS: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  GARMIN: 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20',
  OURA: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  WHOOP: 'bg-gray-500/10 text-gray-700 dark:text-gray-400 border-gray-500/20',
  MANUAL: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20',
};

export function MultiSourceMetricCard({
  title,
  icon,
  data,
  unit = '',
  allSources = [],
  sparklineData = [],
  trend,
}: MultiSourceMetricCardProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            {icon}
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-muted-foreground text-sm">No data</div>
        </CardContent>
      </Card>
    );
  }

  const sourceColor = SOURCE_COLORS[data.source.toUpperCase() as keyof typeof SOURCE_COLORS] || SOURCE_COLORS.MANUAL;

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {icon}
          {title}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                <Info className="h-3 w-3 text-muted-foreground" />
              </TooltipTrigger>
              <TooltipContent>
                <div className="space-y-1">
                  <p className="font-semibold">Data Source Priority:</p>
                  <p className="text-xs">1. InBody (95% confidence)</p>
                  <p className="text-xs">2. Withings (85% confidence)</p>
                  <p className="text-xs">3. GARMIN/OURA (75% confidence)</p>
                  <p className="text-xs">4. WHOOP (70% confidence)</p>
                  <p className="text-xs">5. Manual (50% confidence)</p>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Main Value */}
        <div>
          <div className="text-3xl font-bold">
            {data.value.toFixed(1)}
            <span className="text-base text-muted-foreground ml-1">{unit}</span>
          </div>
          
          {/* Trend */}
          {trend && (
            <div className={cn(
              'flex items-center gap-1 text-sm mt-1',
              trend.direction === 'up' ? 'text-green-600 dark:text-green-400' : 
              trend.direction === 'down' ? 'text-red-600 dark:text-red-400' : 
              'text-muted-foreground'
            )}>
              {trend.direction === 'up' ? <TrendingUp className="h-4 w-4" /> : 
               trend.direction === 'down' ? <TrendingDown className="h-4 w-4" /> : null}
              <span>
                {trend.direction === 'up' ? '+' : ''}{trend.value.toFixed(1)}{unit} 
                ({trend.percentage > 0 ? '+' : ''}{trend.percentage.toFixed(1)}%)
              </span>
            </div>
          )}
        </div>

        {/* Primary Source Badge */}
        <div className="space-y-2">
          <Badge variant="outline" className={cn('text-xs', sourceColor)}>
            {data.source}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {format(new Date(data.date), 'MMM dd, yyyy')}
          </div>
        </div>

        {/* Sparkline Chart or Confidence Score */}
        {sparklineData.length >= 2 ? (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Last 7 measurements</span>
              <span className="font-semibold">{data.confidence}%</span>
            </div>
            <div className="h-16 -mx-2">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparklineData}>
                  <defs>
                    <linearGradient id={`gradient-${title.replace(/\s/g, '-')}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <YAxis domain={['dataMin - 5', 'dataMax + 5']} hide />
                  <RechartsTooltip
                    contentStyle={rechartsTooltipStyle}
                    wrapperStyle={{ zIndex: 1000 }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const value = typeof payload[0].value === 'number' ? payload[0].value : 0;
                        return (
                          <div style={rechartsTooltipStyle}>
                            <p className="text-xs font-semibold text-popover-foreground">
                              {value.toFixed(1)}{unit}
                            </p>
                            <p className="text-xs text-popover-foreground/70">
                              {format(parseISO(payload[0].payload.date), 'MMM dd')}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    fill={`url(#gradient-${title.replace(/\s/g, '-')})`}
                    animationDuration={300}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Confidence</span>
              <span className="font-semibold">{data.confidence}%</span>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className={cn(
                  'h-full transition-all',
                  data.confidence >= 90 ? 'bg-green-500' :
                  data.confidence >= 70 ? 'bg-blue-500' :
                  data.confidence >= 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                )}
                style={{ width: `${data.confidence}%` }}
              />
            </div>
          </div>
        )}

        {/* All Sources */}
        {allSources.length > 1 && (
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-1">
              {allSources.length} sources available
            </div>
            <div className="space-y-1">
              {allSources.slice(0, 3).map((source, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className={cn(
                    'font-medium',
                    source.source === data.source ? 'text-primary' : 'text-muted-foreground'
                  )}>
                    {source.source}
                  </span>
                  <span className="text-muted-foreground">
                    {source.value.toFixed(1)}{unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
