import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useTranslation } from 'react-i18next';

export interface MetricVisibility {
  recovery: boolean;
  sleep: boolean;
  strain: boolean;
  steps: boolean;
  calories: boolean;
  heartRate: boolean;
  weight: boolean;
  bodyFat: boolean;
}

interface MetricsSettingsProps {
  onSettingsChange: (settings: MetricVisibility) => void;
  initialSettings?: MetricVisibility;
}

const defaultSettings: MetricVisibility = {
  recovery: true,
  sleep: true,
  strain: true,
  steps: true,
  calories: true,
  heartRate: true,
  weight: true,
  bodyFat: true,
};

export function MetricsSettings({ onSettingsChange, initialSettings }: MetricsSettingsProps) {
  const { t } = useTranslation('dashboard');
  const [settings, setSettings] = useState<MetricVisibility>(
    initialSettings || defaultSettings
  );
  const [open, setOpen] = useState(false);

  const metricLabels: Record<keyof MetricVisibility, string> = {
    recovery: t('metricsSettings.metrics.recovery'),
    sleep: t('metricsSettings.metrics.sleep'),
    strain: t('metricsSettings.metrics.strain'),
    steps: t('metricsSettings.metrics.steps'),
    calories: t('metricsSettings.metrics.calories'),
    heartRate: t('metricsSettings.metrics.heartRate'),
    weight: t('metricsSettings.metrics.weight'),
    bodyFat: t('metricsSettings.metrics.bodyFat'),
  };

  useEffect(() => {
    const saved = localStorage.getItem('metricsVisibility');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSettings(parsed);
        onSettingsChange(parsed);
      } catch {}
    }
  }, [onSettingsChange]);

  const handleToggle = (metric: keyof MetricVisibility) => {
    const updated = { ...settings, [metric]: !settings[metric] };
    setSettings(updated);
    onSettingsChange(updated);
    localStorage.setItem('metricsVisibility', JSON.stringify(updated));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Settings className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('metricsSettings.title')}</DialogTitle>
          <DialogDescription>
            {t('metricsSettings.description')}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {Object.entries(metricLabels).map(([key, label]) => (
            <Card key={key} className="p-4">
              <div className="flex items-center justify-between">
                <Label htmlFor={key} className="flex-1 cursor-pointer">
                  {label}
                </Label>
                <Switch
                  id={key}
                  checked={settings[key as keyof MetricVisibility]}
                  onCheckedChange={() => handleToggle(key as keyof MetricVisibility)}
                />
              </div>
            </Card>
          ))}
        </div>
        <div className="flex justify-end">
          <Button onClick={() => setOpen(false)}>{t('metricsSettings.done')}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
