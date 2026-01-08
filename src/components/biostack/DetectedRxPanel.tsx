import { useTranslation } from 'react-i18next';
import { useDoctorRecommendations } from '@/hooks/biostack/useDoctorRecommendations';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DetectedRxPanelProps {
  documentId: string;
}

export function DetectedRxPanel({ documentId }: DetectedRxPanelProps) {
  const { t } = useTranslation('biostack');
  const {
    recommendations,
    isLoading,
    addToStack,
    isAddingToStack,
    dismiss,
    isDismissing,
    addAllToStack,
    isAddingAll,
  } = useDoctorRecommendations(documentId);

  if (isLoading) {
    return (
      <Card className="bg-neutral-950 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
        <div className="p-6 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-green-400" />
        </div>
      </Card>
    );
  }

  if (recommendations.length === 0) {
    return null; // Hide panel completely when no recommendations
  }

  const getConfidenceBadgeClass = (score: number) => {
    if (score >= 80) {
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    } else if (score >= 50) {
      return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    } else {
      return 'bg-red-500/10 text-red-400 border-red-500/20';
    }
  };

  const getConfidenceIcon = (score: number) => {
    if (score >= 80) return '✅';
    if (score >= 50) return '⚠️';
    return '🔴';
  };

  return (
    <Card className="bg-neutral-950 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)] rounded-lg overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <span>📋</span>
          <span>{t('detectedRx.title')}</span>
          <span className="text-sm text-muted-foreground">({recommendations.length})</span>
        </h3>
        <Button
          onClick={() => addAllToStack(recommendations)}
          disabled={isAddingAll || recommendations.length === 0}
          className="bg-green-500/10 border border-green-500/50 text-green-400 hover:bg-green-500/20 transition-all"
        >
          {isAddingAll ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              {t('detectedRx.adding')}
            </>
          ) : (
            t('detectedRx.addAll')
          )}
        </Button>
      </div>

      {/* Recommendations Grid */}
      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => (
          <Card
            key={rec.id}
            className={cn(
              "bg-neutral-900 border-neutral-800 transition-all duration-300",
              "hover:border-green-500/30 hover:shadow-[0_0_10px_rgba(34,197,94,0.2)]"
            )}
          >
            <div className="p-4 space-y-3">
              {/* Header: Name + Confidence */}
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-foreground flex-1">
                  {rec.supplement_name}
                </h4>
                <span
                  className={cn(
                    "px-2 py-1 rounded text-xs font-medium border whitespace-nowrap",
                    getConfidenceBadgeClass(rec.confidence_score)
                  )}
                >
                  {getConfidenceIcon(rec.confidence_score)} {rec.confidence_score}%
                </span>
              </div>

              {/* Metadata Badges */}
              <div className="flex flex-wrap gap-2">
                {rec.dosage && (
                  <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <span>💊</span>
                    <span>{rec.dosage}</span>
                  </span>
                )}
                {rec.frequency && (
                  <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <span>📅</span>
                    <span>{rec.frequency}</span>
                  </span>
                )}
                {rec.duration && (
                  <span className="px-2 py-1 rounded text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                    <span>⏱</span>
                    <span>{rec.duration}</span>
                  </span>
                )}
              </div>

              {/* Rationale */}
              {rec.rationale && (
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {rec.rationale}
                </p>
              )}

              {/* Doctor Info */}
              {(rec.doctor_name || rec.prescription_date) && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  {rec.doctor_name && <span>👨‍⚕️ {rec.doctor_name}</span>}
                  {rec.prescription_date && (
                    <span>
                      {new Date(rec.prescription_date).toLocaleDateString()}
                    </span>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  onClick={() => addToStack(rec)}
                  disabled={isAddingToStack}
                  className="flex-1 bg-green-500/10 border border-green-500/50 text-green-400 hover:bg-green-500/20 transition-all"
                  size="sm"
                >
                  {isAddingToStack ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                      {t('detectedRx.adding')}
                    </>
                  ) : (
                    t('detectedRx.addToStack')
                  )}
                </Button>
                <Button
                  onClick={() => dismiss(rec.id)}
                  disabled={isDismissing}
                  variant="outline"
                  className="bg-neutral-800 border-neutral-700 text-muted-foreground hover:bg-neutral-700"
                  size="sm"
                >
                  {isDismissing ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    t('detectedRx.dismiss')
                  )}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </Card>
  );
}
