import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OptimizedChart } from '@/components/charts/OptimizedChart';
import { CategoryMetric } from '@/hooks/medical-documents/useCategoryDetail';
import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface CategoryMetricCardProps {
  metric: CategoryMetric;
  category: string;
}

const statusColors = {
  optimal: 'from-blue-500/20 to-cyan-500/20 border-blue-500/50',
  normal: 'from-green-500/20 to-emerald-500/20 border-green-500/50',
  warning: 'from-yellow-500/20 to-orange-500/20 border-yellow-500/50',
  critical: 'from-red-500/20 to-pink-500/20 border-red-500/50',
};

const statusBadges = {
  optimal: { label: 'Оптимально', className: 'bg-blue-500/20 text-blue-500 border-blue-500/50' },
  normal: { label: 'Норма', className: 'bg-green-500/20 text-green-500 border-green-500/50' },
  warning: { label: 'Внимание', className: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50' },
  critical: { label: 'Критично', className: 'bg-red-500/20 text-red-500 border-red-500/50' },
};

export function CategoryMetricCard({ metric, category }: CategoryMetricCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    // Navigate to biomarker detail page if it's a lab result
    if (category === 'blood_test' || category === 'lab_urine') {
      navigate(`/biomarkers/${metric.biomarkerId}`);
    }
  };

  const isQuantitative = typeof metric.currentValue === 'number' && metric.history.length > 0;
  const statusBadge = statusBadges[metric.status];

  // Calculate trend direction
  const trendDirection = isQuantitative && metric.history.length > 1
    ? metric.history[metric.history.length - 1].value > metric.history[0].value
      ? 'up'
      : 'down'
    : null;

  return (
    <Card
      onClick={handleClick}
      className={cn(
        'cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg bg-gradient-to-br',
        statusColors[metric.status]
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{metric.icon}</span>
            <CardTitle className="text-base">{metric.name}</CardTitle>
          </div>
          <Badge variant="outline" className={statusBadge.className}>
            {statusBadge.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Current Value */}
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-bold">{metric.currentValue}</span>
          {metric.unit && (
            <span className="text-sm text-muted-foreground">{metric.unit}</span>
          )}
          {trendDirection && (
            trendDirection === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500 ml-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 ml-1" />
            )
          )}
        </div>

        {/* Mini Chart */}
        {isQuantitative && metric.history.length > 0 && (
          <div className="h-16 -mx-2">
            <OptimizedChart
              type="line"
              data={metric.history}
              config={{
                xKey: 'date',
                yKey: 'value',
                color: metric.status === 'critical' ? '#ef4444' : 
                       metric.status === 'warning' ? '#f59e0b' :
                       metric.status === 'optimal' ? '#3b82f6' : '#10b981',
                showGrid: false,
                showTooltip: false,
                showLegend: false,
              }}
              height={64}
            />
          </div>
        )}

        {/* Statistics */}
        {isQuantitative && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            <div>
              <p className="text-muted-foreground">Мин</p>
              <p className="font-semibold">{metric.trend.min.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Сред</p>
              <p className="font-semibold">{metric.trend.avg.toFixed(1)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Макс</p>
              <p className="font-semibold">{metric.trend.max.toFixed(1)}</p>
            </div>
          </div>
        )}

        {/* Test Count */}
        <div className="pt-2 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            {metric.testCount} измерени{metric.testCount === 1 ? 'е' : metric.testCount < 5 ? 'я' : 'й'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
