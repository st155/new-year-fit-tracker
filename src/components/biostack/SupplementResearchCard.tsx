import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Beaker, 
  Link2, 
  Loader2,
  ChevronDown,
  ChevronUp,
  FlaskConical
} from 'lucide-react';
import { useState } from 'react';
import { SupplementCorrelation, useAutoLinkBiomarkers } from '@/hooks/biostack/useAutoLinkBiomarkers';

interface SupplementResearchCardProps {
  stackItemId: string;
  supplementName: string;
  correlations?: SupplementCorrelation[];
  linkedBiomarkerIds?: string[];
  scientificName?: string;
  confidence?: number;
  onLinkComplete?: () => void;
}

export function SupplementResearchCard({
  stackItemId,
  supplementName,
  correlations = [],
  linkedBiomarkerIds = [],
  scientificName,
  confidence,
  onLinkComplete,
}: SupplementResearchCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { mutate: autoLink, isPending } = useAutoLinkBiomarkers();

  const handleAutoLink = () => {
    autoLink(
      { stackItemId, supplementName },
      { onSuccess: () => onLinkComplete?.() }
    );
  };

  const getCorrelationIcon = (type: string) => {
    switch (type) {
      case 'increases':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'decreases':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-yellow-500" />;
    }
  };

  const getEvidenceBadge = (level: string) => {
    switch (level) {
      case 'high':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Высокий</Badge>;
      case 'moderate':
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Средний</Badge>;
      default:
        return <Badge className="bg-neutral-500/20 text-neutral-400 border-neutral-500/30">Низкий</Badge>;
    }
  };

  const hasLinkedBiomarkers = linkedBiomarkerIds.length > 0 || correlations.length > 0;

  return (
    <Card className="bg-neutral-950 border-neutral-800 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-neutral-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-purple-500/10">
              <FlaskConical className="h-5 w-5 text-purple-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">{supplementName}</h3>
              {scientificName && (
                <p className="text-xs text-muted-foreground">
                  {scientificName} {confidence && `(${confidence}% match)`}
                </p>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            {hasLinkedBiomarkers ? (
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                <Link2 className="h-3 w-3 mr-1" />
                {correlations.length || linkedBiomarkerIds.length} биомаркеров
              </Badge>
            ) : (
              <Button 
                size="sm" 
                variant="outline" 
                onClick={handleAutoLink}
                disabled={isPending}
                className="border-purple-500/30 hover:bg-purple-500/10"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Beaker className="h-4 w-4 mr-1" />
                )}
                Привязать биомаркеры
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Correlations */}
      {correlations.length > 0 && (
        <div className="p-4">
          {/* Summary row */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between text-left hover:bg-neutral-900/50 -mx-4 px-4 py-2 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2 flex-wrap">
              {correlations.slice(0, 3).map((corr, idx) => (
                <div key={idx} className="flex items-center gap-1 text-sm">
                  {getCorrelationIcon(corr.correlationType)}
                  <span className="text-muted-foreground">{corr.biomarkerName}</span>
                  <span className={corr.expectedChangePercent > 0 ? 'text-green-400' : 'text-red-400'}>
                    {corr.expectedChangePercent > 0 ? '+' : ''}{corr.expectedChangePercent}%
                  </span>
                </div>
              ))}
              {correlations.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{correlations.length - 3} ещё
                </span>
              )}
            </div>
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>

          {/* Expanded details */}
          {isExpanded && (
            <div className="mt-4 space-y-3">
              {correlations.map((corr, idx) => (
                <div 
                  key={idx} 
                  className="p-3 rounded-lg bg-neutral-900/50 border border-neutral-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getCorrelationIcon(corr.correlationType)}
                      <span className="font-medium">{corr.biomarkerName}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${
                        corr.expectedChangePercent > 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {corr.expectedChangePercent > 0 ? '+' : ''}{corr.expectedChangePercent}%
                      </span>
                      {getEvidenceBadge(corr.evidenceLevel)}
                    </div>
                  </div>
                  
                  {corr.researchSummary && (
                    <p className="text-sm text-muted-foreground">
                      {corr.researchSummary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Empty state for linked but no correlations loaded */}
      {!hasLinkedBiomarkers && !isPending && (
        <div className="p-4 text-center text-muted-foreground">
          <Beaker className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Нажмите "Привязать биомаркеры" для поиска научных данных</p>
        </div>
      )}
    </Card>
  );
}
