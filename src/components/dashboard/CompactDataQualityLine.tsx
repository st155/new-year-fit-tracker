import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BarChart3, RefreshCw } from 'lucide-react';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useDataQualityHistory } from '@/hooks/useDataQualityHistory';
import { useConfidenceRecalculation } from '@/hooks/useConfidenceRecalculation';
import { useAuth } from '@/hooks/useAuth';
import { useState, memo } from 'react';
import { QualityZoneModal } from './QualityZoneModal';

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
  onZoneClick: (zoneLabel: string) => void;
}

function ColoredQualityBar({ zones, total, onZoneClick }: ColoredQualityBarProps) {
  if (total === 0) return null;
  
  return (
    <div className="space-y-1">
      {/* Цветная полоса */}
      <div className="flex h-3 rounded-full overflow-hidden bg-muted/30">
        {zones.map((zone, i) => {
          const width = (zone.count / total) * 100;
          if (width === 0) return null;
          
          return (
            <div
              key={i}
              className="transition-all duration-300 cursor-pointer hover:opacity-80"
              style={{
                width: `${width}%`,
                backgroundColor: zone.color,
              }}
              title={`${zone.label}: ${zone.count} (${Math.round(width)}%)`}
              onClick={() => onZoneClick(zone.label)}
            />
          );
        })}
      </div>
      
      {/* Лейблы под полосой */}
      <div className="flex justify-between text-xs gap-2">
        {zones.map((zone, i) => {
          if (zone.count === 0) return null;
          const percentage = Math.round((zone.count / total) * 100);
          return (
            <div
              key={i}
              className="flex items-center gap-0.5 cursor-pointer hover:opacity-80"
              style={{ color: zone.color }}
              onClick={() => onZoneClick(zone.label)}
            >
              <span>{zone.icon}</span>
              <span className="font-semibold">{zone.count} ({percentage}%)</span>
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

const CompactDataQualityLineComponent = ({ userId }: CompactDataQualityLineProps) => {
  const { user } = useAuth();
  const { averageConfidence, metricsByQuality, isLoading } = useDataQuality();
  const { data: history, isLoading: historyLoading } = useDataQualityHistory(userId);
  const { recalculate, isRecalculating } = useConfidenceRecalculation();
  const [modalZone, setModalZone] = useState<{ label: string; metrics: Array<{ metricName: string; confidence: number; source: any; factors: any }> } | null>(null);
  
  if (isLoading) return <Skeleton className="h-[50px] w-full rounded-lg" />;
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

  const handleZoneClick = (zoneLabel: string) => {
    let zoneMetrics: Array<{ metricName: string; confidence: number; source: any; factors: any }> = [];
    
    switch (zoneLabel) {
      case 'Отлично':
        zoneMetrics = metricsByQuality.excellent;
        break;
      case 'Хорошо':
        zoneMetrics = metricsByQuality.good;
        break;
      case 'Средне':
        zoneMetrics = metricsByQuality.fair;
        break;
      case 'Плохо':
        zoneMetrics = metricsByQuality.poor;
        break;
    }
    
    setModalZone({ label: zoneLabel, metrics: zoneMetrics });
  };

  return (
    <Card className="border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-3">
        {/* Заголовок */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Качество данных</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold" style={{ color: qualityColor }}>
              {Math.round(averageConfidence)}%
            </span>
            <Button 
              size="icon" 
              variant="ghost" 
              className="h-6 w-6"
              onClick={handleRecalculate}
              disabled={isRecalculating}
            >
              <RefreshCw className={`h-3 w-3 ${isRecalculating ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Тонкий прогресс бар с градиентом */}
        <div className="relative mb-2">
          <Progress 
            value={averageConfidence} 
            className="h-1.5"
          />
          {!historyLoading && history && history.length > 1 && (
            <div className="absolute -bottom-4 left-0 right-0 h-5 opacity-30 pointer-events-none">
              <svg 
                viewBox="0 0 100 20" 
                preserveAspectRatio="none" 
                className="w-full h-full"
              >
                <polyline
                  points={generateSparklinePoints(history)}
                  fill="none"
                  stroke={qualityColor}
                  strokeWidth="1"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Компактные бейджи */}
        <div className="flex items-center gap-2 flex-wrap pt-3">
          {zones.map((zone, i) => (
            zone.count > 0 && (
              <Badge 
                key={i} 
                variant="outline" 
                className="text-xs px-1.5 py-0 cursor-pointer hover:opacity-80 transition-opacity"
                style={{ borderColor: zone.color, color: zone.color }}
                onClick={() => handleZoneClick(zone.label)}
              >
                {zone.icon}{zone.count}
              </Badge>
            )
          ))}
        </div>
      </CardContent>
      
      <QualityZoneModal
        isOpen={modalZone !== null}
        onClose={() => setModalZone(null)}
        zone={modalZone}
      />
    </Card>
  );
};

// Мемоизируем компонент для оптимизации
export const CompactDataQualityLine = memo(CompactDataQualityLineComponent);
