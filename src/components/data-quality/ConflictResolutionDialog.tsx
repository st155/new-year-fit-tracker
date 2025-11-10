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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getConflictExplanation = (conflict: MetricWithConfidence): string => {
    const factors = conflict.factors;
    if (!factors) return "Нет дополнительной информации";
    
    const reasons = [];
    if (factors.dataFreshness > 16) reasons.push("Свежие данные");
    if (factors.sourceReliability > 32) reasons.push("Надежный источник");
    if (factors.crossValidation > 16) reasons.push("Согласуется с другими источниками");
    if (factors.measurementFrequency > 16) reasons.push("Регулярные измерения");
    
    return reasons.length > 0 ? reasons.join(" • ") : "Стандартные данные";
  };

  const getConfidenceBadge = (confidence: number) => {
    if (confidence >= 80) return { variant: 'default' as const, label: 'Высокая' };
    if (confidence >= 60) return { variant: 'secondary' as const, label: 'Средняя' };
    return { variant: 'destructive' as const, label: 'Низкая' };
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
          <DialogTitle>Разрешите конфликт данных</DialogTitle>
          <DialogDescription>
            Для метрики "{metricName}" обнаружены разные значения из разных источников.
            Выберите наиболее точное значение.
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
                          Рекомендуется
                        </Badge>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 text-sm text-muted-foreground">
                    {getConflictExplanation(conflict)}
                  </div>
                  
                  <div className="mt-2 text-xs text-muted-foreground">
                    Уверенность: {Math.round(conflict.confidence)}%
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onDismiss}>
            Отменить
          </Button>
          <Button 
            variant="ghost" 
            onClick={onDismiss}
            className="text-muted-foreground"
          >
            Игнорировать конфликт
          </Button>
          <Button 
            onClick={handleResolve}
            disabled={!selectedId}
          >
            Применить выбор
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
