/**
 * Insight Card Component
 * Visual card for displaying individual insights
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { SmartInsight } from '@/lib/insights/types';
import { X, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface InsightCardProps {
  insight: SmartInsight;
  onAction?: (insight: SmartInsight) => void;
  onDismiss?: (insightId: string) => void;
}

export function InsightCard({ insight, onAction, onDismiss }: InsightCardProps) {
  const { t } = useTranslation('insights');
  
  const priorityColor = 
    insight.priority >= 80 ? 'destructive' :
    insight.priority >= 60 ? 'default' :
    'secondary';

  const getTypeLabel = (type: string): string => {
    const typeKey = `types.${type}`;
    const translated = t(typeKey, { defaultValue: '' });
    return translated || type;
  };

  const typeLabel = getTypeLabel(insight.type);

  return (
    <div className="group relative bg-card border border-border rounded-lg p-4 hover:border-primary/50 transition-all">
      <div className="flex items-start gap-3">
        <div className="text-2xl">{insight.emoji}</div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={priorityColor} className="text-xs">
              {typeLabel}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {insight.priority}/100
            </Badge>
          </div>
          
          <p className="text-sm text-foreground font-medium leading-relaxed">
            {insight.message}
          </p>

          {insight.action && onAction && (
            <Button
              variant="ghost"
              size="sm"
              className="mt-2 h-8 px-2 text-xs group-hover:text-primary"
              onClick={() => onAction(insight)}
            >
              {t('learnMore')}
              <ChevronRight className="ml-1 h-3 w-3" />
            </Button>
          )}
        </div>

        {onDismiss && (
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={() => onDismiss(insight.id)}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
