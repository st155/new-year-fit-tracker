import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, TrendingUp, AlertTriangle, XCircle } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useConfidenceRecalculation } from '@/hooks/useConfidenceRecalculation';

function CompactRadialProgress({ value, size = 80 }: { value: number; size?: number }) {
  const radius = (size - 16) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;
  
  const getColor = (val: number) => {
    if (val >= 80) return 'hsl(var(--success))';
    if (val >= 60) return 'hsl(var(--primary))';
    if (val >= 40) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="none"
          className="text-muted/10"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={getColor(value)}
          strokeWidth="8"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="text-2xl font-bold" style={{ color: getColor(value) }}>
          {value.toFixed(0)}%
        </div>
      </div>
    </div>
  );
}

export function DataQualityWidget() {
  const { user } = useAuth();
  const { 
    averageConfidence, 
    metricsByQuality,
    isLoading 
  } = useDataQuality();
  const { recalculate, isRecalculating } = useConfidenceRecalculation();

  if (isLoading || !metricsByQuality) {
    return null;
  }

  const totalMetrics = 
    metricsByQuality.excellent.length +
    metricsByQuality.good.length +
    metricsByQuality.fair.length +
    metricsByQuality.poor.length;

  if (totalMetrics === 0) {
    return null;
  }

  const segments = [
    { 
      label: 'Отлично', 
      count: metricsByQuality.excellent.length, 
      color: 'bg-green-500',
      icon: CheckCircle2
    },
    { 
      label: 'Хорошо', 
      count: metricsByQuality.good.length, 
      color: 'bg-blue-500',
      icon: TrendingUp
    },
    { 
      label: 'Средне', 
      count: metricsByQuality.fair.length, 
      color: 'bg-yellow-500',
      icon: AlertTriangle
    },
    { 
      label: 'Плохо', 
      count: metricsByQuality.poor.length, 
      color: 'bg-red-500',
      icon: XCircle
    },
  ];

  const handleRecalculate = () => {
    if (user?.id) {
      recalculate({ user_id: user.id });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Left: Radial Progress */}
          <CompactRadialProgress value={averageConfidence} />

          {/* Middle: Stacked Bar */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Качество данных</h3>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleRecalculate}
                disabled={isRecalculating}
                className="h-7 w-7"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
              </Button>
            </div>

            {/* Stacked bar */}
            <div className="flex h-2 rounded-full overflow-hidden bg-muted/20">
              {segments.map((segment, idx) => {
                const percentage = (segment.count / totalMetrics) * 100;
                return percentage > 0 ? (
                  <div
                    key={idx}
                    className={`${segment.color} transition-all`}
                    style={{ width: `${percentage}%` }}
                  />
                ) : null;
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-3 text-xs">
              {segments.map((segment, idx) => {
                const Icon = segment.icon;
                const percentage = (segment.count / totalMetrics) * 100;
                if (segment.count === 0) return null;
                
                return (
                  <div key={idx} className="flex items-center gap-1">
                    <Icon className="h-3 w-3 text-muted-foreground" />
                    <span className="text-muted-foreground">
                      {segment.count} <span className="text-muted-foreground/60">({percentage.toFixed(0)}%)</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
