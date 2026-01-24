import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Calculator, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";
import type { DataSource, ConfidenceLevel } from "@/hooks/useEnhancedBodyModel";

interface BodyDataSourceIndicatorProps {
  source: DataSource;
  confidence: ConfidenceLevel;
  lastInBodyDate: Date | null;
  lastUpdated: Date | null;
  weightSource?: string;
  bodyFatSource?: string;
}

export function BodyDataSourceIndicator({
  source,
  confidence,
  lastInBodyDate,
  lastUpdated,
  weightSource,
  bodyFatSource,
}: BodyDataSourceIndicatorProps) {
  const { t } = useTranslation('bodyComposition');
  
  const getSourceConfig = () => {
    switch (source) {
      case 'inbody':
        return {
          icon: <Activity className="h-3 w-3" />,
          label: t('sources.inbody'),
          variant: "default" as const,
          description: t('sources.inbodyDesc'),
        };
      case 'synthesized':
        return {
          icon: <Calculator className="h-3 w-3" />,
          label: t('sources.estimated'),
          variant: "secondary" as const,
          description: t('sources.estimatedDesc'),
        };
      case 'none':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          label: t('sources.limited'),
          variant: "outline" as const,
          description: t('sources.limitedDesc'),
        };
    }
  };

  const config = getSourceConfig();

  const getConfidenceBadge = () => {
    const colors = {
      high: "bg-green-500/10 text-green-500 border-green-500/30",
      medium: "bg-yellow-500/10 text-yellow-500 border-yellow-500/30",
      low: "bg-red-500/10 text-red-500 border-red-500/30",
    };

    return (
      <Badge variant="outline" className={colors[confidence]}>
        {confidence.toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant={config.variant} className="flex items-center gap-1.5">
              {config.icon}
              {config.label}
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-xs">
            <div className="space-y-2">
              <p className="font-semibold">{config.description}</p>
              
              {lastInBodyDate && (
                <p className="text-xs text-muted-foreground">
                  {t('sources.lastInBody')}: {format(lastInBodyDate, 'MMM dd, yyyy')}
                </p>
              )}
              
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  {t('sources.dataUpdated')}: {format(lastUpdated, 'MMM dd, yyyy')}
                </p>
              )}
              
              {(weightSource || bodyFatSource) && (
                <div className="text-xs text-muted-foreground border-t border-border pt-2">
                  <p className="font-semibold mb-1">{t('sources.dataSources')}:</p>
                  {weightSource && <p>{t('sources.weight')}: {weightSource}</p>}
                  {bodyFatSource && <p>{t('sources.bodyFat')}: {bodyFatSource}</p>}
                </div>
              )}
              
              {source === 'synthesized' && (
                <p className="text-xs text-yellow-400 border-t border-border pt-2">
                  ⚠️ {t('sources.synthesizedWarning')}
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {getConfidenceBadge()}
    </div>
  );
}
