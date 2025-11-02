import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Activity, RefreshCw, AlertCircle, BarChart3 } from 'lucide-react';
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
  const { user } = useAuth();
  const { averageConfidence, metricsByQuality, qualitySummary, isLoading } = useDataQuality();
  const { recalculate, isRecalculating } = useConfidenceRecalculation();
  const [modalZone, setModalZone] = useState<{ label: string; metrics: QualitySummaryMetric[] } | null>(null);
  
  if (isLoading) return <Skeleton className="h-[200px] w-full rounded-lg" />;
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
          Нет данных для отображения Health Score
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
    if (score >= 80) return 'Отличное состояние';
    if (score >= 60) return 'Хорошее состояние';
    if (score >= 40) return 'Среднее состояние';
    return 'Требует внимания';
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
      case 'Отлично':
        metrics = metricsByQuality.excellent;
        break;
      case 'Хорошо':
        metrics = metricsByQuality.good;
        break;
      case 'Средне':
        metrics = metricsByQuality.fair;
        break;
      case 'Плохо':
        metrics = metricsByQuality.poor;
        break;
      case 'Все':
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
    <Card className="p-4 space-y-3">
      {/* Заголовок с inline Alert */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Health Score</span>
          {metricsByQuality.poor.length > 2 && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
              {metricsByQuality.poor.length} критич.
            </Badge>
          )}
        </div>
      </div>

      {/* Основной балл с круговым прогрессом */}
      <div className="flex items-center gap-3">
        {/* Круговой прогресс с градиентом */}
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg className="w-full h-full -rotate-90">
            <defs>
              <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradientColors.from} />
                <stop offset="100%" stopColor={gradientColors.to} />
              </linearGradient>
            </defs>
            {/* Фоновый круг */}
            <circle 
              cx="32" 
              cy="32" 
              r="26"
              className="stroke-muted/20"
              strokeWidth="6"
              fill="none"
            />
            {/* Прогресс круг */}
            <circle 
              cx="32" 
              cy="32" 
              r="26"
              stroke="url(#healthGradient)"
              strokeWidth="6"
              fill="none"
              strokeDasharray={`${(averageConfidence / 100) * 163.36} 163.36`}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span 
              className="text-xl font-bold" 
              style={{ color: qualityColor }}
              title={`${Math.round(averageConfidence)}% • ${getHealthStatusLabel(averageConfidence)}\n\nОтлично: ${metricsByQuality.excellent.length} (${Math.round(excellentPercent)}%)\nХорошо: ${metricsByQuality.good.length} (${Math.round(goodPercent)}%)\nСредне: ${metricsByQuality.fair.length} (${Math.round(fairPercent)}%)\nПлохо: ${metricsByQuality.poor.length} (${Math.round(poorPercent)}%)`}
            >
              {Math.round(averageConfidence)}
            </span>
          </div>
        </div>
        
        {/* Описание */}
        <div className="flex-1 min-w-0">
          <div className="text-base font-semibold flex items-center gap-1.5">
            <span>{getHealthStatusIcon(averageConfidence)}</span>
            <span>{getHealthStatusLabel(averageConfidence)}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            на основе {totalMetrics} {totalMetrics === 1 ? 'показателя' : 'показателей'}
          </div>
        </div>
        
        {/* Кнопка обновления */}
        <Button 
          size="icon" 
          variant="ghost" 
          className="h-8 w-8 flex-shrink-0"
          onClick={handleRefresh}
          disabled={isRecalculating}
        >
          <RefreshCw className={`h-4 w-4 ${isRecalculating ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Цветная сегментированная полоса */}
      <div className="space-y-2">
        {/* Полоса с процентами - упрощенная без Tooltip */}
        <div className="flex h-6 rounded-full overflow-hidden bg-muted/30 gap-0.5">
          {metricsByQuality.excellent.length > 0 && (
            <div 
              className="bg-success transition-all duration-500 hover:opacity-80 cursor-pointer first:rounded-l-full"
              style={{ width: `${excellentPercent}%` }}
              onClick={() => handleZoneClick('Отлично')}
              title={`Отлично: ${metricsByQuality.excellent.length} показателей (${Math.round(excellentPercent)}%)`}
            />
          )}
          {metricsByQuality.good.length > 0 && (
            <div 
              className="bg-primary transition-all duration-500 hover:opacity-80 cursor-pointer"
              style={{ width: `${goodPercent}%` }}
              onClick={() => handleZoneClick('Хорошо')}
              title={`Хорошо: ${metricsByQuality.good.length} показателей (${Math.round(goodPercent)}%)`}
            />
          )}
          {metricsByQuality.fair.length > 0 && (
            <div 
              className="bg-warning transition-all duration-500 hover:opacity-80 cursor-pointer"
              style={{ width: `${fairPercent}%` }}
              onClick={() => handleZoneClick('Средне')}
              title={`Средне: ${metricsByQuality.fair.length} показателей (${Math.round(fairPercent)}%)`}
            />
          )}
          {metricsByQuality.poor.length > 0 && (
            <div 
              className="bg-destructive transition-all duration-500 hover:opacity-80 cursor-pointer last:rounded-r-full"
              style={{ width: `${poorPercent}%` }}
              onClick={() => handleZoneClick('Плохо')}
              title={`Плохо: ${metricsByQuality.poor.length} показателей (${Math.round(poorPercent)}%)`}
            />
          )}
        </div>
        
        {/* Легенда - компактная в одну линию */}
        <div className="flex items-center justify-center gap-3 text-[10px] text-muted-foreground">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span className="font-mono">{metricsByQuality.excellent.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span className="font-mono">{metricsByQuality.good.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-warning"></div>
            <span className="font-mono">{metricsByQuality.fair.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-destructive"></div>
            <span className="font-mono">{metricsByQuality.poor.length}</span>
          </div>
        </div>
      </div>

      {/* Кнопка детального просмотра - компактная */}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full text-xs h-7"
        onClick={() => handleZoneClick('Все')}
      >
        <BarChart3 className="h-3 w-3 mr-1.5" />
        Детальная статистика
      </Button>

      {/* Модалка с метриками */}
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
