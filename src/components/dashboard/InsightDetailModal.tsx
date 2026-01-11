/**
 * Insight Detail Modal
 * Shows detailed information about a specific insight
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import type { SmartInsight } from '@/lib/insights/types';
import { getIntlLocale } from '@/lib/date-locale';

interface InsightDetailModalProps {
  insight: SmartInsight | null;
  isOpen: boolean;
  onClose: () => void;
  onHide: (insightId: string) => void;
}

export function InsightDetailModal({
  insight,
  isOpen,
  onClose,
  onHide,
}: InsightDetailModalProps) {
  const { t } = useTranslation('insights');
  const navigate = useNavigate();

  if (!insight) return null;

  const handleAction = () => {
    if (insight.action.path) {
      navigate(insight.action.path);
    }
    onClose();
  };

  const handleHide = () => {
    onHide(insight.id);
    onClose();
  };

  const getDetailedDescription = () => {
    switch (insight.type) {
      case 'critical':
        return t('modal.descriptions.critical');
      case 'warning':
        return t('modal.descriptions.warning');
      case 'achievement':
        return t('modal.descriptions.achievement');
      case 'correlation':
        return t('modal.descriptions.correlation');
      case 'anomaly':
        return t('modal.descriptions.anomaly');
      case 'prediction':
        return t('modal.descriptions.prediction');
      case 'recommendation':
        return t('modal.descriptions.recommendation');
      default:
        return t('modal.descriptions.default');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span>{insight.emoji}</span>
            <span>{insight.message}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            {getDetailedDescription()}
          </p>

          <div className="flex flex-col gap-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('modal.priority')}</span>
              <span className="font-medium">{insight.priority}/100</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('modal.source')}</span>
              <span className="font-medium capitalize">{insight.source}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">{t('modal.time')}</span>
              <span className="font-medium">
                {insight.timestamp.toLocaleTimeString(getIntlLocale(), {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>

          <div className="flex gap-2 pt-4">
            {insight.action.path && (
              <Button onClick={handleAction} className="flex-1">
                {t('modal.details')}
              </Button>
            )}
            <Button variant="outline" onClick={handleHide}>
              {t('modal.hide')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
