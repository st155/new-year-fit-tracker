import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Activity, RefreshCw, AlertCircle, BarChart3 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useConfidenceRecalculation } from '@/hooks/useConfidenceRecalculation';
import { useAuth } from '@/hooks/useAuth';
import { useState, memo, useMemo } from 'react';
import { QualityZoneModal } from './QualityZoneModal';

interface HealthScoreWidgetProps {
  userId?: string;
}

interface QualitySummaryMetric {
  metricName: string;
  confidence: number;
  source: any;
  factors?: {
    sourceReliability: number;
    dataFreshness: number;
    measurementFrequency: number;
    crossValidation: number;
  };
}

const HealthScoreWidgetComponent = ({ userId }: HealthScoreWidgetProps) => {
  const { t } = useTranslation('healthScore');
  const { user } = useAuth();
  const { averageConfidence, metricsByQuality, qualitySummary, isLoading } = useDataQuality();
  const { recalculate, isRecalculating } = useConfidenceRecalculation();
  const [modalZone, setModalZone] = useState<{ label: string; metrics: QualitySummaryMetric[] } | null>(null);
  
  if (isLoading) return <Skeleton className="h-[24px] w-full rounded-lg" />;
  if (!metricsByQuality) return null;

  const totalMetrics = 
    metricsByQuality.excellent.length + 
    metricsByQuality.good.length + 
    metricsByQuality.fair.length + 
    metricsByQuality.poor.length;

  if (totalMetrics === 0) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">
          {t('noData')}
        </div>
      </Card>
    );
  }

  const qualityColor = 
    averageConfidence >= 80 ? 'hsl(var(--success))' :
    averageConfidence >= 60 ? 'hsl(var(--primary))' :
    averageConfidence >= 40 ? 'hsl(var(--warning))' :
    'hsl(var(--destructive))';

  // Градиентные цвета для круга
  const getGradientColors = (value: number) => {
    if (value >= 80) return { from: 'hsl(142, 76%, 36%)', to: 'hsl(142, 76%, 46%)' };
    if (value >= 60) return { from: 'hsl(var(--primary))', to: 'hsl(var(--primary))' };
    if (value >= 40) return { from: 'hsl(43, 96%, 56%)', to: 'hsl(43, 96%, 66%)' };
    return { from: 'hsl(0, 84%, 60%)', to: 'hsl(0, 84%, 70%)' };
  };

  const gradientColors = getGradientColors(averageConfidence);

  // Helper: Получить текстовый статус здоровья
  const getHealthStatusLabel = (score: number): string => {
    if (score >= 80) return t('status.excellent');
    if (score >= 60) return t('status.good');
    if (score >= 40) return t('status.average');
    return t('status.attention');
  };

  // Helper: Получить иконку статуса
  const getHealthStatusIcon = (score: number): string => {
    if (score >= 80) return '🎉';
    if (score >= 60) return '👍';
    if (score >= 40) return '⚠️';
    return '🚨';
  };

  const handleRefresh = () => {
    if (user?.id) {
      recalculate({ user_id: user.id });
    }
  };

  const handleZoneClick = (zoneLabel: string) => {
    let metrics: QualitySummaryMetric[] = [];
    
    switch (zoneLabel) {
      case t('zones.excellent'):
        metrics = metricsByQuality.excellent;
        break;
      case t('zones.good'):
        metrics = metricsByQuality.good;
        break;
      case t('zones.fair'):
        metrics = metricsByQuality.fair;
        break;
      case t('zones.poor'):
        metrics = metricsByQuality.poor;
        break;
      case t('zones.all'):
        metrics = [
          ...metricsByQuality.excellent,
          ...metricsByQuality.good,
          ...metricsByQuality.fair,
          ...metricsByQuality.poor,
        ];
        break;
    }
    
    setModalZone({ label: zoneLabel, metrics });
  };

  // Проценты для каждой зоны
  const excellentPercent = (metricsByQuality.excellent.length / totalMetrics) * 100;
  const goodPercent = (metricsByQuality.good.length / totalMetrics) * 100;
  const fairPercent = (metricsByQuality.fair.length / totalMetrics) * 100;
  const poorPercent = (metricsByQuality.poor.length / totalMetrics) * 100;

  return (
    <Card className="p-2">
      <div className="flex items-center gap-2">
        {/* Icon + Title */}
        <Activity className="h-3 w-3 text-muted-foreground flex-shrink-0" />
        <span className="text-xs font-semibold whitespace-nowrap">{t('title')}:</span>
        
        {/* Score with color */}
        <span 
          className="text-sm font-bold tabular-nums"
          style={{ color: qualityColor }}
          title={`${Math.round(averageConfidence)}% • ${getHealthStatusLabel(averageConfidence)}`}
        >
          {Math.round(averageConfidence)}
        </span>
        
        {/* Status emoji */}
        <span className="text-xs">{getHealthStatusIcon(averageConfidence)}</span>
        
        {/* Critical badge if needed */}
        {metricsByQuality.poor.length > 2 && (
          <Badge variant="destructive" className="text-[8px] px-1 py-0 h-3.5">
            {metricsByQuality.poor.length}
          </Badge>
        )}
        
        {/* Segmented bar */}
        <div 
          className="flex-1 flex h-2 rounded-full overflow-hidden bg-muted/30 gap-[0.5px] cursor-pointer min-w-[100px]"
          onClick={() => handleZoneClick(t('zones.all'))}
          title={t('clickForDetails')}
        >
          {metricsByQuality.excellent.length > 0 && (
            <div 
              className="bg-success transition-all duration-500 hover:opacity-80"
              style={{ width: `${excellentPercent}%` }}
              title={`${t('zones.excellent')}: ${metricsByQuality.excellent.length} (${Math.round(excellentPercent)}%)`}
            />
          )}
          {metricsByQuality.good.length > 0 && (
            <div 
              className="bg-primary transition-all duration-500 hover:opacity-80"
              style={{ width: `${goodPercent}%` }}
              title={`${t('zones.good')}: ${metricsByQuality.good.length} (${Math.round(goodPercent)}%)`}
            />
          )}
          {metricsByQuality.fair.length > 0 && (
            <div 
              className="bg-warning transition-all duration-500 hover:opacity-80"
              style={{ width: `${fairPercent}%` }}
              title={`${t('zones.fair')}: ${metricsByQuality.fair.length} (${Math.round(fairPercent)}%)`}
            />
          )}
          {metricsByQuality.poor.length > 0 && (
            <div 
              className="bg-destructive transition-all duration-500 hover:opacity-80"
              style={{ width: `${poorPercent}%` }}
              title={`${t('zones.poor')}: ${metricsByQuality.poor.length} (${Math.round(poorPercent)}%)`}
            />
          )}
        </div>
        
        {/* Inline legend - numbers only */}
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground font-mono whitespace-nowrap">
          <span title={t('zones.excellent')}>{metricsByQuality.excellent.length}</span>
          <span>·</span>
          <span title={t('zones.good')}>{metricsByQuality.good.length}</span>
          <span>·</span>
          <span title={t('zones.fair')}>{metricsByQuality.fair.length}</span>
          <span>·</span>
          <span title={t('zones.poor')}>{metricsByQuality.poor.length}</span>
        </div>
        
        {/* Refresh button */}
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-5 w-5 flex-shrink-0"
          onClick={handleRefresh}
          disabled={isRecalculating}
          title={t('refresh')}
        >
          <RefreshCw className={`h-2.5 w-2.5 ${isRecalculating ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      <QualityZoneModal
        isOpen={modalZone !== null}
        onClose={() => setModalZone(null)}
        zone={modalZone}
      />
    </Card>
  );
};

// Мемоизируем компонент для оптимизации
export const HealthScoreWidget = memo(HealthScoreWidgetComponent);
