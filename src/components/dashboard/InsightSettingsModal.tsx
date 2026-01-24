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
import { useTranslation } from 'react-i18next';

interface InsightSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InsightSettingsModal({ isOpen, onClose }: InsightSettingsModalProps) {
  const { t } = useTranslation('dashboard');
  const { preferences, toggleType, updateRefreshInterval, resetPreferences } =
    useInsightPersonalization();

  const INSIGHT_TYPE_LABELS: Record<InsightType, string> = {
    critical: t('insightSettings.types.critical'),
    warning: t('insightSettings.types.warning'),
    achievement: t('insightSettings.types.achievement'),
    info: t('insightSettings.types.info'),
    recommendation: t('insightSettings.types.recommendation'),
    correlation: t('insightSettings.types.correlation'),
    anomaly: t('insightSettings.types.anomaly'),
    prediction: t('insightSettings.types.prediction'),
    social: t('insightSettings.types.social'),
    trainer: t('insightSettings.types.trainer'),
    temporal: t('insightSettings.types.temporal'),
    habit_pattern: t('insightSettings.types.habit_pattern'),
    habit_risk: t('insightSettings.types.habit_risk'),
    habit_optimization: t('insightSettings.types.habit_optimization'),
    habit_chain: t('insightSettings.types.habit_chain'),
  };

  const INSIGHT_TYPE_DESCRIPTIONS: Record<InsightType, string> = {
    critical: t('insightSettings.typeDescriptions.critical'),
    warning: t('insightSettings.typeDescriptions.warning'),
    achievement: t('insightSettings.typeDescriptions.achievement'),
    info: t('insightSettings.typeDescriptions.info'),
    recommendation: t('insightSettings.typeDescriptions.recommendation'),
    correlation: t('insightSettings.typeDescriptions.correlation'),
    anomaly: t('insightSettings.typeDescriptions.anomaly'),
    prediction: t('insightSettings.typeDescriptions.prediction'),
    social: t('insightSettings.typeDescriptions.social'),
    trainer: t('insightSettings.typeDescriptions.trainer'),
    temporal: t('insightSettings.typeDescriptions.temporal'),
    habit_pattern: t('insightSettings.typeDescriptions.habit_pattern'),
    habit_risk: t('insightSettings.typeDescriptions.habit_risk'),
    habit_optimization: t('insightSettings.typeDescriptions.habit_optimization'),
    habit_chain: t('insightSettings.typeDescriptions.habit_chain'),
  };

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
          <DialogTitle>{t('insightSettings.title')}</DialogTitle>
          <DialogDescription>
            {t('insightSettings.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Insight Types */}
          <div>
            <h4 className="font-medium mb-3">{t('insightSettings.insightTypes')}</h4>
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
            <h4 className="font-medium mb-3">{t('insightSettings.refreshInterval')}</h4>
            <Select
              value={preferences.refreshInterval.toString()}
              onValueChange={(val) => updateRefreshInterval(parseInt(val))}
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">{t('insightSettings.intervals.30s')}</SelectItem>
                <SelectItem value="60">{t('insightSettings.intervals.1m')}</SelectItem>
                <SelectItem value="120">{t('insightSettings.intervals.2m')}</SelectItem>
                <SelectItem value="300">{t('insightSettings.intervals.5m')}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {t('insightSettings.refreshIntervalHint')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t">
            <Button onClick={onClose} className="flex-1">
              {t('insightSettings.save')}
            </Button>
            <Button variant="outline" onClick={resetPreferences}>
              {t('insightSettings.reset')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
