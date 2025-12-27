/**
 * Conflict Resolution Dialog
 * User-friendly UI for resolving data conflicts
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import type { MetricWithConfidence } from '@/lib/data-quality';

interface ConflictResolutionDialogProps {
  metricName: string;
  conflicts: MetricWithConfidence[];
  open: boolean;
  onResolve: (selectedMetricId: string) => void;
  onDismiss: () => void;
}

export function ConflictResolutionDialog({
  metricName,
  conflicts,
  open,
  onResolve,
  onDismiss
}: ConflictResolutionDialogProps) {
  const { t } = useTranslation('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getConflictExplanation = (conflict: MetricWithConfidence): string => {
    const factors = conflict.factors;
    if (!factors) return t('conflictDialog.noInfo');
    
    const reasons = [];
    if (factors.dataFreshness > 16) reasons.push(t('conflictDialog.freshData'));
    if (factors.sourceReliability > 32) reasons.push(t('conflictDialog.reliableSource'));
    if (factors.crossValidation > 16) reasons.push(t('conflictDialog.crossValidated'));
    if (factors.measurementFrequency > 16) reasons.push(t('conflictDialog.frequentMeasurements'));
    
    return reasons.length > 0 ? reasons.join(" • ") : t('conflictDialog.standardData');
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return { variant: 'default' as const, label: t('conflictDialog.confidenceHigh') };
    if (confidence >= 60) return { variant: 'secondary' as const, label: t('conflictDialog.confidenceMedium') };
    return { variant: 'destructive' as const, label: t('conflictDialog.confidenceLow') };
  };

  const handleResolve = () => {
    if (selectedId) {
      onResolve(selectedId);
      setSelectedId(null);
    }
  };

  return (
    <Dialog open={open && conflicts.length > 0} onOpenChange={onDismiss}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t('conflictDialog.title')}</DialogTitle>
          <DialogDescription>
            {t('conflictDialog.description', { metricName })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-3 py-4 max-h-[400px] overflow-y-auto">
          {conflicts.map((conflict) => {
            const confidenceBadge = getConfidenceBadge(conflict.confidence);
            const isSelected = selectedId === conflict.metric.metric_id;
            const isRecommended = conflict.confidence > 70;

            return (
              <Card
                key={conflict.metric.metric_id}
                className={cn(
                  "cursor-pointer transition-all hover:border-primary relative",
                  isSelected && "border-primary border-2 ring-2 ring-primary/20"
                )}
                onClick={() => setSelectedId(conflict.metric.metric_id)}
              >
                <CardContent className="p-4">
                  {isSelected && (
                    <div className="absolute -top-2 -right-2">
                      <CheckCircle className="h-6 w-6 text-primary bg-background rounded-full" />
                    </div>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline" className="font-mono">
                        {conflict.metric.source}
                      </Badge>
                      <div className="text-2xl font-bold">
                        {conflict.metric.value} {conflict.metric.unit}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={confidenceBadge.variant}>
                        {confidenceBadge.label}
                      </Badge>
                      {isRecommended && (
                        <Badge className="bg-green-500">
                          {t('conflictDialog.recommended')}
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-muted-foreground">
                    {getConflictExplanation(conflict)}
                  </div>
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    {t('conflictDialog.confidence', { value: Math.round(conflict.confidence) })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDismiss}>
            {t('conflictDialog.cancel')}
          </Button>
          <Button 
            variant="ghost" 
            onClick={onDismiss}
            className="text-muted-foreground"
          >
            {t('conflictDialog.ignore')}
          </Button>
          <Button 
            onClick={handleResolve}
            disabled={!selectedId}
          >
            {t('conflictDialog.apply')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
