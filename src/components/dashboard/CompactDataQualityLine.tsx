import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BarChart3, RefreshCw, AlertCircle } from 'lucide-react';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useDataQualityHistory } from '@/hooks/useDataQualityHistory';
import { useConfidenceRecalculation } from '@/hooks/useConfidenceRecalculation';
import { useAuth } from '@/hooks/useAuth';
import { useState, memo, useMemo } from 'react';
import { QualityZoneModal } from './QualityZoneModal';

interface CompactDataQualityLineProps {
  userId?: string;
}

interface QualityHistoryPoint {
  date: string;
  avgConfidence: number;
}

interface QualitySummaryMetric {
  metricName: string;
  confidence: number;
  source: any;
  factors: any;
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
  const { averageConfidence, metricsByQuality, qualitySummary, isLoading } = useDataQuality();
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

  // Helper: Get issue reason
  const getIssueReason = (metric: QualitySummaryMetric): string => {
    if (!metric.factors) return 'низкое';
    
    const factors = metric.factors;
    const issues = [];
    
    if (factors.dataFreshness < 10) issues.push('устарело');
    if (factors.measurementFrequency < 10) issues.push('редко');
    if (factors.sourceReliability < 20) issues.push('ненадежно');
    if (factors.crossValidation < 10) issues.push('отклонение');
    
    return issues[0] || 'низкое';
  };

  // Helper: Get quality icon
  const getQualityIcon = (confidence: number): string => {
    if (confidence >= 80) return '✓';
    if (confidence >= 60) return '↗';
    if (confidence >= 40) return '⚠';
    return '✗';
  };

  // Average factors for tooltip
  const avgFactors = useMemo(() => {
    if (!qualitySummary || qualitySummary.length === 0) {
      return { sourceReliability: 0, dataFreshness: 0, measurementFrequency: 0, crossValidation: 0 };
    }
    
    const sum = qualitySummary.reduce((acc, m) => ({
      sourceReliability: acc.sourceReliability + (m.factors?.sourceReliability || 0),
      dataFreshness: acc.dataFreshness + (m.factors?.dataFreshness || 0),
      measurementFrequency: acc.measurementFrequency + (m.factors?.measurementFrequency || 0),
      crossValidation: acc.crossValidation + (m.factors?.crossValidation || 0),
    }), { sourceReliability: 0, dataFreshness: 0, measurementFrequency: 0, crossValidation: 0 });
    
    return {
      sourceReliability: Math.round(sum.sourceReliability / qualitySummary.length),
      dataFreshness: Math.round(sum.dataFreshness / qualitySummary.length),
      measurementFrequency: Math.round(sum.measurementFrequency / qualitySummary.length),
      crossValidation: Math.round(sum.crossValidation / qualitySummary.length),
    };
  }, [qualitySummary]);

  // Problem metrics (poor + fair), sorted by confidence
  const poorAndFairMetrics = useMemo(() => {
    return [...metricsByQuality.poor, ...metricsByQuality.fair]
      .sort((a, b) => a.confidence - b.confidence);
  }, [metricsByQuality]);

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
        {/* Alert для плохих метрик */}
        {metricsByQuality.poor.length > 0 && (
          <Alert variant="destructive" className="mb-3 py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle className="text-xs font-semibold">Требует внимания</AlertTitle>
            <AlertDescription className="text-xs">
              {metricsByQuality.poor.length} {metricsByQuality.poor.length === 1 ? 'метрика' : 'метрик'} с низким качеством данных
            </AlertDescription>
          </Alert>
        )}

        {/* Заголовок */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">Качество данных</span>
          </div>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="text-sm font-bold cursor-help" style={{ color: qualityColor }}>
                    {Math.round(averageConfidence)}%
                  </span>
                </TooltipTrigger>
                <TooltipContent side="left">
                  <div className="space-y-1.5 text-xs">
                    <div className="font-semibold mb-2">Breakdown качества:</div>
                    <div className="flex justify-between gap-4">
                      <span>📊 Надежность:</span>
                      <span className="font-mono">{avgFactors.sourceReliability}/40</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>🕐 Актуальность:</span>
                      <span className="font-mono">{avgFactors.dataFreshness}/20</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>📈 Частота:</span>
                      <span className="font-mono">{avgFactors.measurementFrequency}/20</span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span>✓ Валидация:</span>
                      <span className="font-mono">{avgFactors.crossValidation}/20</span>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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

        {/* Сегментированный прогресс бар */}
        <div className="relative mb-2">
          <div className="flex h-3 rounded-full overflow-hidden bg-muted/30 gap-[1px]">
            {totalMetrics > 0 && (
              <>
                <div 
                  className="bg-success transition-all duration-500"
                  style={{ width: `${(metricsByQuality.excellent.length / totalMetrics) * 100}%` }}
                />
                <div 
                  className="bg-primary transition-all duration-500"
                  style={{ width: `${(metricsByQuality.good.length / totalMetrics) * 100}%` }}
                />
                <div 
                  className="bg-warning transition-all duration-500"
                  style={{ width: `${(metricsByQuality.fair.length / totalMetrics) * 100}%` }}
                />
                <div 
                  className="bg-destructive transition-all duration-500"
                  style={{ width: `${(metricsByQuality.poor.length / totalMetrics) * 100}%` }}
                />
              </>
            )}
          </div>
          
          {/* Sparkline поверх */}
          {!historyLoading && history && history.length > 1 && (
            <div className="absolute -bottom-3 left-0 right-0 h-4 opacity-40 pointer-events-none">
              <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-full">
                <polyline
                  points={generateSparklinePoints(history)}
                  fill="none"
                  stroke={qualityColor}
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Топ проблемных метрик */}
        {poorAndFairMetrics.length > 0 && (
          <div className="space-y-1.5 pt-3">
            {poorAndFairMetrics.slice(0, 3).map((m, i) => (
              <div key={i} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span>{getQualityIcon(m.confidence)}</span>
                  <span className="font-medium truncate">{m.metricName}</span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-muted-foreground">{Math.round(m.confidence)}%</span>
                  <Badge variant="outline" className="text-xs px-1.5 py-0">
                    {getIssueReason(m)}
                  </Badge>
                </div>
              </div>
            ))}
            
            {/* Кнопка "Все метрики" */}
            {totalMetrics > 3 && (
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full text-xs h-7 mt-2"
                onClick={() => setModalZone({ 
                  label: 'Все', 
                  metrics: [...poorAndFairMetrics, ...metricsByQuality.good, ...metricsByQuality.excellent] 
                })}
              >
                Посмотреть все {totalMetrics} {totalMetrics === 1 ? 'метрику' : totalMetrics < 5 ? 'метрики' : 'метрик'}
              </Button>
            )}
          </div>
        )}
        
        {/* Если все метрики хорошие */}
        {poorAndFairMetrics.length === 0 && totalMetrics > 0 && (
          <div className="pt-3 text-xs text-center text-muted-foreground">
            ✓ Все метрики в отличном состоянии
          </div>
        )}
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
