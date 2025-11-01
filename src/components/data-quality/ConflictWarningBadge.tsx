import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import { useConflictDetection } from '@/hooks/composite/data/useMetricsV2';

interface ConflictWarningBadgeProps {
  metricName: string;
  onClick?: () => void;
}

export function ConflictWarningBadge({ metricName, onClick }: ConflictWarningBadgeProps) {
  const { data: conflicts, isLoading } = useConflictDetection(metricName);

  if (isLoading || !conflicts || conflicts.length === 0) {
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge
            variant="destructive"
            className="cursor-pointer gap-1"
            onClick={onClick}
          >
            <AlertTriangle className="w-3 h-3" />
            {conflicts.length} конфликт{conflicts.length > 1 ? 'а' : ''}
          </Badge>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">Обнаружены конфликтующие данные:</p>
            {conflicts.slice(0, 3).map((conflict, i) => (
              <div key={i} className="text-xs">
                <span className="font-medium">{conflict.metric.source}</span>:{' '}
                {conflict.metric.value} {conflict.metric.unit}
                {conflict.factors && (
                  <span className="text-muted-foreground ml-1">
                    (±{Math.round(100 - conflict.confidence)}%)
                  </span>
                )}
              </div>
            ))}
            {conflicts.length > 3 && (
              <p className="text-xs text-muted-foreground">
                +{conflicts.length - 3} ещё...
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
