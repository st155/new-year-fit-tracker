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
    <Card className="p-4 space-y-4">
      {/* Alert для плохих показателей */}
      {metricsByQuality.poor.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Показатели требуют внимания</AlertTitle>
          <AlertDescription>
            {metricsByQuality.poor.length} {metricsByQuality.poor.length === 1 ? 'показатель' : 'показателей'} в критическом состоянии
          </AlertDescription>
        </Alert>
      )}

      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-semibold">Health Score</span>
        </div>
      </div>

      {/* Основной балл с круговым прогрессом */}
      <div className="flex items-center gap-4">
        {/* Круговой прогресс */}
        <div className="relative w-20 h-20 flex-shrink-0">
          <svg className="w-full h-full -rotate-90">
            {/* Фоновый круг */}
            <circle 
              cx="40" 
              cy="40" 
              r="34"
              className="stroke-muted/20"
              strokeWidth="8"
              fill="none"
            />
            {/* Прогресс круг */}
            <circle 
              cx="40" 
              cy="40" 
              r="34"
              stroke={qualityColor}
              strokeWidth="8"
              fill="none"
              strokeDasharray={`${(averageConfidence / 100) * 213.63} 213.63`}
              strokeLinecap="round"
              className="transition-all duration-500"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span 
                    className="text-2xl font-bold cursor-help" 
                    style={{ color: qualityColor }}
                  >
                    {Math.round(averageConfidence)}
                  </span>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <div className="space-y-2 text-xs">
                    <div className="font-semibold">Распределение показателей:</div>
                    <div className="space-y-1">
                      <div className="flex justify-between gap-4">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-success"></div>
                          Отлично:
                        </span>
                        <span className="font-mono">{metricsByQuality.excellent.length} ({Math.round(excellentPercent)}%)</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-primary"></div>
                          Хорошо:
                        </span>
                        <span className="font-mono">{metricsByQuality.good.length} ({Math.round(goodPercent)}%)</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-warning"></div>
                          Средне:
                        </span>
                        <span className="font-mono">{metricsByQuality.fair.length} ({Math.round(fairPercent)}%)</span>
                      </div>
                      <div className="flex justify-between gap-4">
                        <span className="flex items-center gap-1">
                          <div className="w-2 h-2 rounded-full bg-destructive"></div>
                          Плохо:
                        </span>
                        <span className="font-mono">{metricsByQuality.poor.length} ({Math.round(poorPercent)}%)</span>
                      </div>
                    </div>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
        {/* Полоса с процентами */}
        <div className="flex h-4 rounded-full overflow-hidden bg-muted/30">
          {metricsByQuality.excellent.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="bg-success transition-all duration-500 hover:opacity-80 cursor-pointer"
                    style={{ width: `${excellentPercent}%` }}
                    onClick={() => handleZoneClick('Отлично')}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">Отлично: {metricsByQuality.excellent.length}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {metricsByQuality.good.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="bg-primary transition-all duration-500 hover:opacity-80 cursor-pointer"
                    style={{ width: `${goodPercent}%` }}
                    onClick={() => handleZoneClick('Хорошо')}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">Хорошо: {metricsByQuality.good.length}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {metricsByQuality.fair.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="bg-warning transition-all duration-500 hover:opacity-80 cursor-pointer"
                    style={{ width: `${fairPercent}%` }}
                    onClick={() => handleZoneClick('Средне')}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">Средне: {metricsByQuality.fair.length}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          {metricsByQuality.poor.length > 0 && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div 
                    className="bg-destructive transition-all duration-500 hover:opacity-80 cursor-pointer"
                    style={{ width: `${poorPercent}%` }}
                    onClick={() => handleZoneClick('Плохо')}
                  />
                </TooltipTrigger>
                <TooltipContent>
                  <span className="text-xs">Плохо: {metricsByQuality.poor.length}</span>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>
        
        {/* Легенда под полосой */}
        <div className="flex justify-between text-[10px] text-muted-foreground px-1">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-success"></div>
            <span>{metricsByQuality.excellent.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-primary"></div>
            <span>{metricsByQuality.good.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-warning"></div>
            <span>{metricsByQuality.fair.length}</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-destructive"></div>
            <span>{metricsByQuality.poor.length}</span>
          </div>
        </div>
      </div>

      {/* Кнопка детального просмотра */}
      <Button 
        variant="outline" 
        size="sm" 
        className="w-full text-xs h-8"
        onClick={() => handleZoneClick('Все')}
      >
        <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
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
