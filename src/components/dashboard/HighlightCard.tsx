import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface MetricItem {
  label: string;
  value: string | number | null;
  unit?: string;
  icon?: LucideIcon;
}

interface HighlightCardProps {
  title: string;
  icon: LucideIcon;
  metrics: MetricItem[];
  variant: 'recovery' | 'body' | 'activity';
  className?: string;
}

const variantStyles = {
  recovery: {
    bg: 'bg-gradient-to-br from-emerald-500/20 to-emerald-600/10',
    border: 'border-emerald-500/30',
    iconBg: 'bg-emerald-500/20',
    iconColor: 'text-emerald-400',
    accentText: 'text-emerald-400',
  },
  body: {
    bg: 'bg-gradient-to-br from-blue-500/20 to-blue-600/10',
    border: 'border-blue-500/30',
    iconBg: 'bg-blue-500/20',
    iconColor: 'text-blue-400',
    accentText: 'text-blue-400',
  },
  activity: {
    bg: 'bg-gradient-to-br from-orange-500/20 to-orange-600/10',
    border: 'border-orange-500/30',
    iconBg: 'bg-orange-500/20',
    iconColor: 'text-orange-400',
    accentText: 'text-orange-400',
  },
};

export function HighlightCard({ title, icon: Icon, metrics, variant, className }: HighlightCardProps) {
  const styles = variantStyles[variant];
  
  // Find the primary metric (first one with a value)
  const primaryMetric = metrics.find(m => m.value !== null && m.value !== undefined);
  const secondaryMetrics = metrics.filter(m => m !== primaryMetric && m.value !== null && m.value !== undefined);

  return (
    <div
      className={cn(
        'rounded-2xl border p-6 flex flex-col justify-between',
        'h-[70vh] min-h-[400px] max-h-[600px]',
        styles.bg,
        styles.border,
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className={cn('p-3 rounded-xl', styles.iconBg)}>
          <Icon className={cn('h-6 w-6', styles.iconColor)} />
        </div>
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      </div>

      {/* Primary Metric - Large Display */}
      {primaryMetric && (
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className={cn('text-6xl font-bold tracking-tight', styles.accentText)}>
            {primaryMetric.value}
          </div>
          <div className="text-muted-foreground text-sm mt-2">
            {primaryMetric.label}
            {primaryMetric.unit && <span className="ml-1">{primaryMetric.unit}</span>}
          </div>
        </div>
      )}

      {/* Secondary Metrics - Grid at bottom */}
      {secondaryMetrics.length > 0 && (
        <div className="grid grid-cols-2 gap-4 mt-4">
          {secondaryMetrics.map((metric, index) => (
            <div key={index} className="bg-background/30 rounded-xl p-4 text-center">
              <div className="text-2xl font-semibold text-foreground">
                {metric.value}
                {metric.unit && <span className="text-sm text-muted-foreground ml-1">{metric.unit}</span>}
              </div>
              <div className="text-xs text-muted-foreground mt-1">{metric.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!primaryMetric && secondaryMetrics.length === 0 && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground text-sm">Нет данных</p>
        </div>
      )}
    </div>
  );
}
