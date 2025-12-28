import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Sparkles
} from 'lucide-react';

interface ExpectedChange {
  biomarker: string;
  percent: number;
  timeframeWeeks?: number;
}

interface ActualChange {
  biomarker: string;
  percent: number;
  startValue?: number;
  endValue?: number;
  unit?: string;
}

export type EffectivenessVerdict = 'effective' | 'needs_more_time' | 'not_working' | 'no_data';

interface SupplementEffectivenessInsightProps {
  supplementName: string;
  expectedChange?: ExpectedChange;
  actualChange?: ActualChange;
  verdict: EffectivenessVerdict;
  startDate?: string;
  weeksOnSupplement?: number;
}

export function SupplementEffectivenessInsight({
  supplementName,
  expectedChange,
  actualChange,
  verdict,
  startDate,
  weeksOnSupplement = 0,
}: SupplementEffectivenessInsightProps) {
  const { t } = useTranslation('supplements');
  
  const getVerdictConfig = () => {
    switch (verdict) {
      case 'effective':
        return {
          icon: CheckCircle2,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10',
          borderColor: 'border-green-500/30',
          title: t('effectiveness.effective'),
          description: t('effectiveness.effectiveDesc'),
        };
      case 'needs_more_time':
        return {
          icon: Clock,
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10',
          borderColor: 'border-amber-500/30',
          title: t('effectiveness.needsMoreTime'),
          description: t('effectiveness.needsMoreTimeDesc'),
        };
      case 'not_working':
        return {
          icon: AlertTriangle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10',
          borderColor: 'border-red-500/30',
          title: t('effectiveness.notWorking'),
          description: t('effectiveness.notWorkingDesc'),
        };
      default:
        return {
          icon: Sparkles,
          color: 'text-muted-foreground',
          bgColor: 'bg-muted/10',
          borderColor: 'border-muted/30',
          title: t('effectiveness.noData'),
          description: t('effectiveness.noDataDesc'),
        };
    }
  };

  const config = getVerdictConfig();
  const VerdictIcon = config.icon;

  // Calculate effectiveness percentage
  const effectivenessPercent = expectedChange && actualChange
    ? Math.round((actualChange.percent / expectedChange.percent) * 100)
    : null;

  return (
    <Card className={`p-4 ${config.bgColor} ${config.borderColor} border`}>
      <div className="space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <VerdictIcon className={`h-5 w-5 ${config.color}`} />
            <span className={`font-semibold ${config.color}`}>{config.title}</span>
          </div>
          {effectivenessPercent !== null && (
            <Badge 
              variant="outline" 
              className={effectivenessPercent >= 80 ? 'border-green-500/50 text-green-400' : 
                effectivenessPercent >= 50 ? 'border-amber-500/50 text-amber-400' : 
                'border-red-500/50 text-red-400'}
            >
              {t('effectiveness.effectivenessPercent', { percent: effectivenessPercent })}
            </Badge>
          )}
        </div>

        {/* Comparison */}
        {expectedChange && actualChange && (
          <div className="grid grid-cols-2 gap-4">
            {/* Expected */}
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">{t('effectiveness.expected')}</p>
              <div className="flex items-center gap-1">
                {expectedChange.percent > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                )}
                <span className={`font-semibold ${expectedChange.percent > 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {expectedChange.percent > 0 ? '+' : ''}{expectedChange.percent}%
                </span>
                <span className="text-sm text-muted-foreground">{expectedChange.biomarker}</span>
              </div>
              {expectedChange.timeframeWeeks && (
                <p className="text-xs text-muted-foreground mt-1">
                  {t('effectiveness.forWeeks', { weeks: expectedChange.timeframeWeeks })}
                </p>
              )}
            </div>

            {/* Actual */}
            <div className="p-3 rounded-lg bg-background/50">
              <p className="text-xs text-muted-foreground mb-1">{t('effectiveness.actual')}</p>
              <div className="flex items-center gap-1">
                {actualChange.percent > 0 ? (
                  <TrendingUp className="h-4 w-4 text-green-500" />
                ) : actualChange.percent < 0 ? (
                  <TrendingDown className="h-4 w-4 text-red-500" />
                ) : null}
                <span className={`font-semibold ${
                  actualChange.percent > 0 ? 'text-green-400' : 
                  actualChange.percent < 0 ? 'text-red-400' : 'text-muted-foreground'
                }`}>
                  {actualChange.percent > 0 ? '+' : ''}{actualChange.percent}%
                </span>
                <span className="text-sm text-muted-foreground">{actualChange.biomarker}</span>
              </div>
              {actualChange.startValue !== undefined && actualChange.endValue !== undefined && (
                <p className="text-xs text-muted-foreground mt-1">
                  {actualChange.startValue} → {actualChange.endValue} {actualChange.unit}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Context */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{config.description}</span>
          {weeksOnSupplement > 0 && (
            <span className="text-muted-foreground">
              {t('effectiveness.weeksOnSupplement', { weeks: weeksOnSupplement })}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}