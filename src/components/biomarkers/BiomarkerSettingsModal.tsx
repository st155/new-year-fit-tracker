import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Info, Sparkles } from 'lucide-react';
import { useBiomarkerPreferences } from '@/hooks/composite/biomarkers/useBiomarkerPreferences';
import { useTranslation } from 'react-i18next';

interface BiomarkerSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  biomarkerId: string;
  biomarkerName: string;
  unit: string;
  referenceMin: number;
  referenceMax: number;
  currentOptimalMin?: number;
  currentOptimalMax?: number;
}

export function BiomarkerSettingsModal({
  open,
  onOpenChange,
  biomarkerId,
  biomarkerName,
  unit,
  referenceMin,
  referenceMax,
  currentOptimalMin,
  currentOptimalMax,
}: BiomarkerSettingsModalProps) {
  const { t } = useTranslation('biomarkers');
  const { preferences, upsertPreferences, isUpserting } = useBiomarkerPreferences(biomarkerId);
  
  const [optimalMin, setOptimalMin] = useState<string>('');
  const [optimalMax, setOptimalMax] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  useEffect(() => {
    if (preferences) {
      setOptimalMin(preferences.optimal_min.toString());
      setOptimalMax(preferences.optimal_max.toString());
      setNotes(preferences.notes || '');
    } else if (currentOptimalMin !== undefined && currentOptimalMax !== undefined) {
      setOptimalMin(currentOptimalMin.toString());
      setOptimalMax(currentOptimalMax.toString());
    }
  }, [preferences, currentOptimalMin, currentOptimalMax]);

  const handleSave = () => {
    const min = parseFloat(optimalMin);
    const max = parseFloat(optimalMax);

    if (isNaN(min) || isNaN(max)) {
      return;
    }

    upsertPreferences(
      { optimal_min: min, optimal_max: max, notes },
      {
        onSuccess: () => {
          onOpenChange(false);
        },
      }
    );
  };

  const rangeWidth = referenceMax - referenceMin;
  const optimalMinPos = optimalMin
    ? ((parseFloat(optimalMin) - referenceMin) / rangeWidth) * 100
    : 0;
  const optimalMaxPos = optimalMax
    ? ((parseFloat(optimalMax) - referenceMin) / rangeWidth) * 100
    : 100;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-neutral-950 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.3)]">
        <DialogHeader>
          <DialogTitle className="text-purple-400 flex items-center gap-2">
            {t('settings.title')}
          </DialogTitle>
          <DialogDescription className="text-foreground/60">
            {t('settings.description')} <span className="font-semibold text-foreground">{biomarkerName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Current Lab Range (Read-only) */}
          <div className="border border-neutral-700 rounded-lg p-4 bg-neutral-900/50">
            <div className="flex items-center gap-2 mb-3">
              <Info className="h-4 w-4 text-neutral-400" />
              <h3 className="text-sm font-semibold text-neutral-300">{t('settings.labRange')}</h3>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm">
                <span className="text-neutral-400">{t('settings.min')}</span>{' '}
                <span className="font-mono font-semibold text-foreground">{referenceMin}</span>{' '}
                <span className="text-neutral-500">{unit}</span>
              </div>
              <div className="flex-1 h-2 bg-neutral-800 rounded-full relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-neutral-600 to-neutral-600" />
              </div>
              <div className="text-sm">
                <span className="text-neutral-400">{t('settings.max')}</span>{' '}
                <span className="font-mono font-semibold text-foreground">{referenceMax}</span>{' '}
                <span className="text-neutral-500">{unit}</span>
              </div>
            </div>
          </div>

          {/* Optimal Range Inputs */}
          <div className="border border-green-500/50 rounded-lg p-4 bg-green-500/5">
            <h3 className="text-sm font-semibold text-green-400 mb-3">{t('settings.optimalRange')}</h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="space-y-2">
                <Label htmlFor="optimal-min" className="text-foreground">
                  {t('settings.optimalMin')}
                </Label>
                <Input
                  id="optimal-min"
                  type="number"
                  step="0.01"
                  value={optimalMin}
                  onChange={(e) => setOptimalMin(e.target.value)}
                  className="bg-neutral-900 border-green-500/30 focus:border-green-500"
                  placeholder={referenceMin.toString()}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="optimal-max" className="text-foreground">
                  {t('settings.optimalMax')}
                </Label>
                <Input
                  id="optimal-max"
                  type="number"
                  step="0.01"
                  value={optimalMax}
                  onChange={(e) => setOptimalMax(e.target.value)}
                  className="bg-neutral-900 border-green-500/30 focus:border-green-500"
                  placeholder={referenceMax.toString()}
                />
              </div>
            </div>

            {/* Visual Preview */}
            {optimalMin && optimalMax && (
              <div className="relative h-8 bg-neutral-800 rounded-full overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 bg-green-500/30 border-l-2 border-r-2 border-green-500 shadow-[0_0_10px_rgba(34,197,94,0.3)]"
                  style={{
                    left: `${Math.max(0, optimalMinPos)}%`,
                    right: `${Math.max(0, 100 - optimalMaxPos)}%`,
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-mono text-green-400">
                    {optimalMin} - {optimalMax} {unit}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Optional AI Suggestion Card */}
          <div className="border border-blue-500/30 rounded-lg p-4 bg-blue-500/5">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-blue-400" />
              <h3 className="text-sm font-semibold text-blue-400">{t('settings.aiSuggestion')}</h3>
            </div>
            <p className="text-xs text-foreground/70">
              {t('settings.aiSuggestionText', { biomarker: biomarkerName })}
            </p>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes" className="text-foreground">
              {t('settings.notes')}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t('settings.notesPlaceholder')}
              className="bg-neutral-900 border-neutral-700 focus:border-purple-500 min-h-[80px]"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isUpserting}
            className="border-neutral-700"
          >
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isUpserting || !optimalMin || !optimalMax}
            className="bg-purple-600 hover:bg-purple-700 shadow-[0_0_10px_rgba(168,85,247,0.3)]"
          >
            {isUpserting ? t('common.saving') : t('settings.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
