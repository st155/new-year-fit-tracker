import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface AutoRefreshToggleProps {
  onRefresh: () => void;
}

export function AutoRefreshToggle({ onRefresh }: AutoRefreshToggleProps) {
  const { t } = useTranslation('integrations');
  const [enabled, setEnabled] = useState(() => {
    const stored = localStorage.getItem('integrations-auto-refresh');
    return stored === 'true';
  });

  useEffect(() => {
    localStorage.setItem('integrations-auto-refresh', String(enabled));

    if (enabled) {
      // Longer interval: 60 seconds
      const interval = setInterval(onRefresh, 60000);
      return () => clearInterval(interval);
    }
  }, [enabled, onRefresh]);

  return (
    <div className="flex items-center gap-2">
      <RefreshCw className="h-4 w-4 text-muted-foreground" />
      <Label htmlFor="auto-refresh" className="text-sm cursor-pointer">
        {t('autoRefresh', 'Auto-refresh')}
      </Label>
      <Switch
        id="auto-refresh"
        checked={enabled}
        onCheckedChange={setEnabled}
      />
    </div>
  );
}
