import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Activity, Calculator, AlertCircle } from "lucide-react";
import { format } from "date-fns";
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
  const getSourceConfig = () => {
    switch (source) {
      case 'inbody':
        return {
          icon: <Activity className="h-3 w-3" />,
          label: "InBody Data",
          variant: "default" as const,
          description: "Precise segmental analysis from InBody scan",
        };
      case 'synthesized':
        return {
          icon: <Calculator className="h-3 w-3" />,
          label: "Estimated",
          variant: "secondary" as const,
          description: "Synthesized from weight and body fat data",
        };
      case 'none':
        return {
          icon: <AlertCircle className="h-3 w-3" />,
          label: "Limited Data",
          variant: "outline" as const,
          description: "Insufficient data for analysis",
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
                  Last InBody: {format(lastInBodyDate, 'MMM dd, yyyy')}
                </p>
              )}
              
              {lastUpdated && (
                <p className="text-xs text-muted-foreground">
                  Data updated: {format(lastUpdated, 'MMM dd, yyyy')}
                </p>
              )}
              
              {(weightSource || bodyFatSource) && (
                <div className="text-xs text-muted-foreground border-t border-border pt-2">
                  <p className="font-semibold mb-1">Data sources:</p>
                  {weightSource && <p>Weight: {weightSource}</p>}
                  {bodyFatSource && <p>Body Fat: {bodyFatSource}</p>}
                </div>
              )}
              
              {source === 'synthesized' && (
                <p className="text-xs text-yellow-400 border-t border-border pt-2">
                  ⚠️ Segmental data is estimated. For precise analysis, schedule an InBody scan.
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
