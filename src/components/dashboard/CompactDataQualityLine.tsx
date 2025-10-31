import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { BarChart3, RefreshCw } from 'lucide-react';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useDataQualityHistory } from '@/hooks/useDataQualityHistory';
import { useConfidenceRecalculation } from '@/hooks/useConfidenceRecalculation';
import { useAuth } from '@/hooks/useAuth';

interface CompactDataQualityLineProps {
  userId?: string;
}

interface QualityHistoryPoint {
  date: string;
  avgConfidence: number;
}

interface ColoredQualityBarProps {
  zones: Array<{ icon: string; label: string; count: number; color: string }>;
  total: number;
}

function ColoredQualityBar({ zones, total }: ColoredQualityBarProps) {
  if (total === 0) return null;
  
  return (
    <div className="space-y-1">
      {/* Цветная полоса */}
      <div className="flex h-2 rounded-full overflow-hidden bg-muted/30">
        {zones.map((zone, i) => {
          const width = (zone.count / total) * 100;
          if (width === 0) return null;
          
          return (
            <div
              key={i}
              className="transition-all duration-300"
              style={{
                width: `${width}%`,
                backgroundColor: zone.color,
              }}
              title={`${zone.label}: ${zone.count} (${Math.round(width)}%)`}
            />
          );
        })}
      </div>
      
      {/* Лейблы под полосой */}
      <div className="flex justify-between text-[10px]">
        {zones.map((zone, i) => {
          if (zone.count === 0) return null;
          return (
            <div
              key={i}
              className="flex items-center gap-0.5"
              style={{ color: zone.color }}
            >
              <span>{zone.icon}</span>
              <span className="font-medium">{zone.count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function generateSparklinePoints(history: QualityHistoryPoint[]) {
  if (!history || history.length < 2) return '';
  
  return history
    .map((point, i) => {
      const x = (i / (history.length - 1)) * 100;
      const y = 20 - (point.avgConfidence / 100) * 20;
      return `${x},${y}`;
    })
    .join(' ');
}

export function CompactDataQualityLine({ userId }: CompactDataQualityLineProps) {
  const { user } = useAuth();
  const { averageConfidence, metricsByQuality, isLoading } = useDataQuality();
  const { data: history } = useDataQualityHistory(userId);
  const { recalculate, isRecalculating } = useConfidenceRecalculation();
  
  if (isLoading) return <Skeleton className="h-[70px] w-full" />;
  if (!metricsByQuality) return null;

  // Цвет на основе общего балла
  const getQualityColor = (score: number) => {
    if (score >= 80) return 'hsl(var(--success))';
    if (score >= 60) return 'hsl(var(--primary))';
    if (score >= 40) return 'hsl(var(--warning))';
    return 'hsl(var(--destructive))';
  };

  const qualityColor = getQualityColor(averageConfidence);
  
  const zones = [
    { icon: '✓', label: 'Отлично', count: metricsByQuality.excellent.length, color: 'hsl(var(--success))' },
    { icon: '↗', label: 'Хорошо', count: metricsByQuality.good.length, color: 'hsl(var(--primary))' },
    { icon: '⚠', label: 'Средне', count: metricsByQuality.fair.length, color: 'hsl(var(--warning))' },
    { icon: '✗', label: 'Плохо', count: metricsByQuality.poor.length, color: 'hsl(var(--destructive))' },
  ];

  const totalMetrics = zones.reduce((sum, z) => sum + z.count, 0);

  const handleRecalculate = () => {
    if (user?.id) {
      recalculate({ user_id: user.id });
    }
  };

  return (
    <Card>
      <CardContent className="p-2.5">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Качество данных</h3>
          </div>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-7 w-7"
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Основной контент: Балл + Цветная полоса */}
        <div className="flex items-start gap-3 mb-2">
          {/* Балл */}
          <div className="text-xl font-bold min-w-[50px]" style={{ color: qualityColor }}>
            {Math.round(averageConfidence)}%
          </div>
          
          {/* Цветная полоса */}
          <div className="flex-1">
            <ColoredQualityBar zones={zones} total={totalMetrics} />
          </div>
        </div>

        {/* Мини-график тренда */}
        {history && history.length > 1 ? (
          <div className="h-[15px] opacity-50">
            <svg 
              viewBox="0 0 100 20" 
              preserveAspectRatio="none" 
              className="w-full h-full"
            >
              <polyline
                points={generateSparklinePoints(history)}
                fill="none"
                stroke={qualityColor}
                strokeWidth="1.5"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </div>
        ) : (
          <div className="h-[15px] flex items-center justify-center text-[10px] text-muted-foreground opacity-50">
            Недостаточно данных
          </div>
        )}
      </CardContent>
    </Card>
  );
}
