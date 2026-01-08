import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { AlertTriangle } from 'lucide-react';
import { useConflictDetection } from '@/hooks/composite/data/useMetricsV2';
import { ConflictResolutionDialog } from './ConflictResolutionDialog';
import { useTranslation } from 'react-i18next';

interface ConflictWarningBadgeProps {
  metricName: string;
  onClick?: () => void;
}

export function ConflictWarningBadge({ metricName, onClick }: ConflictWarningBadgeProps) {
  const { t } = useTranslation('widgets');
  const { data: conflicts, isLoading } = useConflictDetection(metricName);
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading || !conflicts || conflicts.length === 0) {
    return null;
  }

  const handleResolve = (metricId: string) => {
    console.log('Resolved conflict with metric:', metricId);
    setDialogOpen(false);
  };

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="destructive"
              className="cursor-pointer gap-1"
              onClick={() => {
                setDialogOpen(true);
                onClick?.();
              }}
            >
              <AlertTriangle className="w-3 h-3" />
              {t('conflicts', { count: conflicts.length })}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              <p className="font-semibold">{t('conflicts.detected')}</p>
              <p className="text-xs text-muted-foreground">{t('conflicts.clickToResolve')}</p>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ConflictResolutionDialog
        metricName={metricName}
        conflicts={conflicts}
        open={dialogOpen}
        onResolve={handleResolve}
        onDismiss={() => setDialogOpen(false)}
      />
    </>
  );
}
