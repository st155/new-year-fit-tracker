/**
 * Insight Settings Modal
 * Allows users to personalize their Smart Insights preferences
 */

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useInsightPersonalization } from '@/hooks/useInsightPersonalization';
import type { InsightType } from '@/lib/insights/types';

interface InsightSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
  critical: 'Критические',
  warning: 'Предупреждения',
  achievement: 'Достижения',
  info: 'Информация',
  recommendation: 'Рекомендации',
  correlation: 'Корреляции',
  anomaly: 'Аномалии',
  prediction: 'Предсказания',
  social: 'Социальные',
  trainer: 'От тренера',
  temporal: 'Временные паттерны',
};

const INSIGHT_TYPE_DESCRIPTIONS: Record<InsightType, string> = {
  critical: 'Проблемы, требующие немедленного внимания',
  warning: 'Важные предупреждения и напоминания',
  achievement: 'Ваши успехи и рекорды',
  info: 'Общая информация и статистика',
  recommendation: 'Персональные рекомендации',
  correlation: 'Взаимосвязи между метриками',
  anomaly: 'Необычные отклонения от нормы',
  prediction: 'Прогнозы достижения целей',
  social: 'Челленджи и сравнения',
  trainer: 'Сообщения от вашего тренера',
  temporal: 'Временные закономерности',
};

export function InsightSettingsModal({ isOpen, onClose }: InsightSettingsModalProps) {
  const { preferences, toggleType, updateRefreshInterval, resetPreferences } =
    useInsightPersonalization();

  const insightTypes: InsightType[] = [
    'critical',
    'warning',
    'achievement',
    'recommendation',
    'info',
    'correlation',
    'anomaly',
    'prediction',
    'social',
    'trainer',
    'temporal',
  ];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Настройки Smart AI Insights</DialogTitle>
          <DialogDescription>
            Настройте, какие типы инсайтов вы хотите видеть
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Insight Types */}
          <div>
            <h4 className="font-medium mb-3">Типы инсайтов</h4>
            <div className="space-y-3">
              {insightTypes.map((type) => (
                <div key={type} className="flex items-start gap-3">
                  <Checkbox
                    id={`insight-${type}`}
                    checked={preferences.enabledTypes.includes(type)}
                    onCheckedChange={() => toggleType(type)}
                  />
                  <div className="grid gap-0.5">
                    <Label
                      htmlFor={`insight-${type}`}
                      className="cursor-pointer font-medium"
                    >
                      {INSIGHT_TYPE_LABELS[type]}
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      {INSIGHT_TYPE_DESCRIPTIONS[type]}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Refresh Interval */}
          <div>
            <h4 className="font-medium mb-3">Частота обновления</h4>
            <Select
              value={preferences.refreshInterval.toString()}
              onValueChange={(val) => updateRefreshInterval(parseInt(val))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30 секунд</SelectItem>
                <SelectItem value="60">1 минута</SelectItem>
                <SelectItem value="120">2 минуты</SelectItem>
                <SelectItem value="300">5 минут</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Как часто инсайты будут автоматически обновляться
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={onClose} className="flex-1">
              Сохранить
            </Button>
            <Button variant="outline" onClick={resetPreferences}>
              Сбросить
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
