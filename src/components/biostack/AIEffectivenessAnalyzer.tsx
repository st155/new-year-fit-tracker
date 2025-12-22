import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { 
  Brain, 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
  ChevronDown,
  Lightbulb,
  Target,
  ArrowRight,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useAIEffectivenessAnalysis, AIAnalysisResult, BiomarkerComparison } from '@/hooks/biostack/useAIEffectivenessAnalysis';

interface AIEffectivenessAnalyzerProps {
  stackItemId: string;
  userId: string;
  supplementName: string;
  onAnalysisComplete?: (result: AIAnalysisResult) => void;
}

export function AIEffectivenessAnalyzer({
  stackItemId,
  userId,
  supplementName,
  onAnalysisComplete
}: AIEffectivenessAnalyzerProps) {
  const { analyze, data, isAnalyzing, error, reset } = useAIEffectivenessAnalysis();
  const [isExpanded, setIsExpanded] = useState(true);

  const handleAnalyze = async () => {
    const result = await analyze(stackItemId, userId);
    if (result && onAnalysisComplete) {
      onAnalysisComplete(result);
    }
  };

  const getVerdictConfig = (verdict: AIAnalysisResult['verdict']) => {
    switch (verdict) {
      case 'effective':
        return {
          icon: CheckCircle2,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          label: 'Эффективно',
          badgeVariant: 'default' as const
        };
      case 'needs_more_time':
        return {
          icon: Clock,
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          label: 'Нужно больше времени',
          badgeVariant: 'secondary' as const
        };
      case 'not_working':
        return {
          icon: AlertTriangle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          label: 'Не работает',
          badgeVariant: 'destructive' as const
        };
      default:
        return {
          icon: Sparkles,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-muted/30',
          label: 'Нет данных',
          badgeVariant: 'outline' as const
        };
    }
  };

  const getStatusIcon = (status: BiomarkerComparison['status']) => {
    switch (status) {
      case 'on_track':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'partial':
        return <TrendingUp className="h-4 w-4 text-amber-500" />;
      case 'no_effect':
        return <Minus className="h-4 w-4 text-muted-foreground" />;
      case 'opposite':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusLabel = (status: BiomarkerComparison['status']) => {
    switch (status) {
      case 'on_track': return 'В норме';
      case 'partial': return 'Частично';
      case 'no_effect': return 'Нет эффекта';
      case 'opposite': return 'Обратный эффект';
      default: return 'Нет данных';
    }
  };

  // Initial state - show analyze button
  if (!data && !isAnalyzing) {
    return (
      <Card className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h4 className="font-medium">AI-анализ эффективности</h4>
              <p className="text-sm text-muted-foreground">
                Сравнение ожидаемых и фактических изменений биомаркеров
              </p>
            </div>
          </div>
          <Button onClick={handleAnalyze} className="gap-2">
            <Sparkles className="h-4 w-4" />
            Анализировать
          </Button>
        </div>
        {error && (
          <p className="mt-3 text-sm text-destructive">{error}</p>
        )}
      </Card>
    );
  }

  // Loading state
  if (isAnalyzing) {
    return (
      <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
        <div className="flex flex-col items-center justify-center gap-4 py-8">
          <div className="relative">
            <div className="absolute inset-0 animate-ping">
              <Brain className="h-8 w-8 text-primary/30" />
            </div>
            <Brain className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <div className="text-center">
            <p className="font-medium">AI анализирует данные...</p>
            <p className="text-sm text-muted-foreground">
              Сравнение биомаркеров и генерация вердикта
            </p>
          </div>
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </Card>
    );
  }

  // Results state
  if (!data) return null;

  const config = getVerdictConfig(data.verdict);
  const VerdictIcon = config.icon;

  return (
    <Card className={`overflow-hidden ${config.bgColor} ${config.borderColor} border`}>
      {/* Header */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${config.bgColor}`}>
              <VerdictIcon className={`h-5 w-5 ${config.color}`} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className={`font-semibold ${config.color}`}>{config.label}</h4>
                <Badge variant={config.badgeVariant}>
                  {data.overallScore}% эффективности
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {data.weeksOnSupplement} нед. приёма • Ожидается {data.expectedTimeframeWeeks} нед.
              </p>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={handleAnalyze} disabled={isAnalyzing}>
            <RefreshCw className={`h-4 w-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          </Button>
        </div>

        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-muted-foreground mb-1">
            <span>Прогресс</span>
            <span>{Math.min(100, Math.round((data.weeksOnSupplement / data.expectedTimeframeWeeks) * 100))}%</span>
          </div>
          <Progress 
            value={Math.min(100, (data.weeksOnSupplement / data.expectedTimeframeWeeks) * 100)} 
            className="h-2"
          />
        </div>
      </div>

      {/* AI Summary */}
      <div className="p-4 border-b border-border/50 bg-background/30">
        <div className="flex items-start gap-2">
          <Lightbulb className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <p className="text-sm">{data.aiAnalysis.summary}</p>
        </div>
      </div>

      {/* Collapsible Details */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <Button variant="ghost" className="w-full justify-between p-4 rounded-none h-auto">
            <span className="text-sm font-medium">Детальный анализ</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="p-4 space-y-4">
            {/* Biomarker Comparisons */}
            {data.comparisons.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Сравнение биомаркеров
                </h5>
                <div className="space-y-2">
                  {data.comparisons.map((comparison, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg bg-background/50"
                    >
                      <div className="flex items-center gap-2">
                        {getStatusIcon(comparison.status)}
                        <span className="text-sm font-medium">{comparison.biomarker}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="text-right">
                          <span className="text-muted-foreground">Ожидалось: </span>
                          <span className={comparison.expectedChangePercent > 0 ? 'text-green-400' : 'text-red-400'}>
                            {comparison.expectedChangePercent > 0 ? '+' : ''}{comparison.expectedChangePercent}%
                          </span>
                        </div>
                        {comparison.status !== 'no_data' ? (
                          <div className="text-right">
                            <span className="text-muted-foreground">Факт: </span>
                            <span className={
                              comparison.actualChangePercent! > 0 ? 'text-green-400' : 
                              comparison.actualChangePercent! < 0 ? 'text-red-400' : ''
                            }>
                              {comparison.actualChangePercent! > 0 ? '+' : ''}{comparison.actualChangePercent}%
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">Нет данных</span>
                        )}
                        <Badge variant="outline" className="min-w-[80px] justify-center">
                          {comparison.status !== 'no_data' ? `${comparison.matchPercent}%` : '—'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Findings */}
            {data.aiAnalysis.keyFindings.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Ключевые выводы</h5>
                <ul className="space-y-1">
                  {data.aiAnalysis.keyFindings.map((finding, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      {finding}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {data.aiAnalysis.recommendations.length > 0 && (
              <div>
                <h5 className="text-sm font-medium mb-2">Рекомендации</h5>
                <ul className="space-y-1">
                  {data.aiAnalysis.recommendations.map((rec, idx) => (
                    <li key={idx} className="text-sm text-muted-foreground flex items-start gap-2">
                      <ArrowRight className="h-4 w-4 text-amber-400 mt-0.5 flex-shrink-0" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Next Steps */}
            {data.aiAnalysis.nextSteps && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/20">
                <p className="text-sm">
                  <span className="font-medium">Следующий шаг: </span>
                  {data.aiAnalysis.nextSteps}
                </p>
              </div>
            )}

            {/* Confidence */}
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/50">
              <span>Уверенность анализа</span>
              <Badge variant="outline" className="text-xs">
                {data.confidenceLevel === 'high' ? 'Высокая' : 
                 data.confidenceLevel === 'medium' ? 'Средняя' : 'Низкая'}
              </Badge>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}
