import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pill, TrendingUp, Clock, ChevronRight } from "lucide-react";
import { useBiomarkerCorrelations } from "@/hooks/biomarkers/useBiomarkerCorrelations";
import { Skeleton } from "@/components/ui/skeleton";
import { useTranslation } from "react-i18next";

interface RecommendedSupplementsCardProps {
  biomarkerId: string;
  onAddToStack?: (supplementName: string) => void;
}

export function RecommendedSupplementsCard({ 
  biomarkerId, 
  onAddToStack 
}: RecommendedSupplementsCardProps) {
  const { t } = useTranslation('biomarkers');
  const { data: correlations, isLoading } = useBiomarkerCorrelations(biomarkerId);

  if (isLoading) {
    return (
      <Card className="bg-neutral-950 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
        <div className="p-6 space-y-4">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      </Card>
    );
  }

  if (!correlations || correlations.length === 0) {
    return null;
  }

  const getEvidenceBadgeClass = (level: string) => {
    switch (level) {
      case 'high':
        return 'bg-green-500/10 text-green-400 border-green-500/20';
      case 'moderate':
        return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
      case 'low':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      default:
        return 'bg-neutral-500/10 text-neutral-400 border-neutral-500/20';
    }
  };

  const getCorrelationIcon = (type: string) => {
    if (type === 'increases') return '↑';
    if (type === 'decreases') return '↓';
    return '~';
  };

  return (
    <Card className="bg-neutral-950 border-purple-500/50 shadow-[0_0_10px_rgba(168,85,247,0.3)]">
      <div className="p-6 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Pill className="h-5 w-5 text-purple-400" />
          <h3 className="text-lg font-semibold text-foreground">
            {t('supplements.title')}
          </h3>
        </div>

        {/* Supplement List */}
        <div className="space-y-3">
          {correlations.map((corr) => (
            <div
              key={corr.id}
              className="p-4 bg-neutral-900/50 rounded-lg border border-neutral-800 hover:border-purple-500/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 space-y-2">
                  {/* Supplement Name & Evidence */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-medium text-foreground capitalize">
                      {corr.supplement_name.replace(/_/g, ' ')}
                    </h4>
                    <Badge 
                      variant="outline" 
                      className={getEvidenceBadgeClass(corr.evidence_level)}
                    >
                      {corr.evidence_level === 'high' ? t('supplements.evidenceHigh') : 
                       corr.evidence_level === 'moderate' ? t('supplements.evidenceModerate') : t('supplements.evidenceLow')}
                    </Badge>
                  </div>

                  {/* Expected Change */}
                  <div className="flex items-center gap-2 text-sm">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    <span className="text-muted-foreground">
                      {getCorrelationIcon(corr.correlation_type)}
                      {Math.abs(corr.expected_change_percent)}% {t('supplements.expectedChange')}
                    </span>
                  </div>

                  {/* Timeframe */}
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-blue-400" />
                    <span className="text-muted-foreground">
                      {t('supplements.resultIn', { weeks: corr.timeframe_weeks })}
                    </span>
                  </div>

                  {/* Research Summary */}
                  {corr.research_summary && (
                    <p className="text-xs text-muted-foreground leading-relaxed pt-2 border-t border-neutral-800">
                      {corr.research_summary}
                    </p>
                  )}
                </div>

                {/* Add to Stack Button */}
                {onAddToStack && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="shrink-0 bg-purple-500/10 hover:bg-purple-500/20 border-purple-500/30 text-purple-400 hover:text-purple-300"
                    onClick={() => onAddToStack(corr.supplement_name)}
                  >
                    {t('supplements.add')}
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
