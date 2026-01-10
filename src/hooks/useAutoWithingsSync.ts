import { useEffect } from 'react';
import { useWithingsDataFreshness } from './useWithingsDataFreshness';
import { toast } from 'sonner';
import i18n from '@/i18n';

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
      toast.info(i18n.t('integrations:withings.dataStale'), {
        description: i18n.t('integrations:withings.dataStaleDesc', { days: freshness.daysSinceSync }),
        duration: 10000,
        action: {
          label: i18n.t('integrations:withings.refresh'),
          onClick: () => {
            // Trigger sync via global event or navigation
            window.location.href = '/withings-debug';
          },
        },
      });
    }
  }, [enabled, freshness, staleThresholdHours]);
}
