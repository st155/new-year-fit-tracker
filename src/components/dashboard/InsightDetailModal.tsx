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
        return 'Это критическая проблема, требующая немедленного внимания. Рекомендуем принять меры как можно скорее.';
      case 'warning':
        return 'Обратите внимание на этот показатель. Раннее вмешательство может предотвратить проблемы в будущем.';
      case 'achievement':
        return 'Отличная работа! Продолжайте в том же духе.';
      case 'correlation':
        return 'Мы обнаружили взаимосвязь между вашими метриками. Это может помочь оптимизировать ваши действия.';
      case 'anomaly':
        return 'Обнаружено необычное отклонение от ваших обычных показателей. Проверьте, всё ли в порядке.';
      case 'prediction':
        return 'На основе текущих данных мы прогнозируем достижение вашей цели в указанные сроки.';
      case 'recommendation':
        return 'Мы рекомендуем добавить эту метрику для более полной картины вашего здоровья.';
      default:
        return 'Дополнительная информация об этом инсайте.';
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
              <span className="text-muted-foreground">Приоритет:</span>
              <span className="font-medium">{insight.priority}/100</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Источник:</span>
              <span className="font-medium capitalize">{insight.source}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Время:</span>
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
                Подробнее
              </Button>
            )}
            <Button variant="outline" onClick={handleHide}>
              Скрыть инсайт
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
