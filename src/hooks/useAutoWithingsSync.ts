import { useEffect } from 'react';
import { useWithingsDataFreshness } from './useWithingsDataFreshness';
import { toast } from 'sonner';

interface AutoSyncOptions {
  enabled?: boolean;
  staleThresholdHours?: number;
}

/**
 * Optional hook for automatic Withings sync prompts
 * Can be enabled in user settings
 */
export function useAutoWithingsSync(options: AutoSyncOptions = {}) {
  const { enabled = false, staleThresholdHours = 6 } = options;
  const { data: freshness } = useWithingsDataFreshness();

  useEffect(() => {
    if (!enabled || !freshness) return;

    const staleThresholdDays = staleThresholdHours / 24;

    if (freshness.hasData && freshness.daysSinceSync > staleThresholdDays) {
      toast.info('Данные Withings устарели', {
        description: `Последняя синхронизация была ${freshness.daysSinceSync} дн. назад. Рекомендуем обновить.`,
        duration: 10000,
        action: {
          label: 'Обновить',
          onClick: () => {
            // Trigger sync via global event or navigation
            window.location.href = '/withings-debug';
          },
        },
      });
    }
  }, [enabled, freshness, staleThresholdHours]);
}
