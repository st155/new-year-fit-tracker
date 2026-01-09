import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { terraApi } from '@/lib/api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface SyncResult {
  provider: string;
  success: boolean;
  error?: string;
}

export function useSyncAllDevices() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('integrations');

  return useMutation({
    mutationFn: async () => {
      // Get user's active Terra tokens
      const { data: tokens, error: tokensError } = await supabase
        .from('terra_tokens')
        .select('provider')
        .eq('is_active', true);

      if (tokensError) throw tokensError;
      if (!tokens || tokens.length === 0) {
        throw new Error(t('sync.noActiveDevices'));
      }

      const results: SyncResult[] = [];

      // Sync each provider - body, daily, and activity data
      for (const token of tokens) {
        const provider = token.provider.toLowerCase();
        
        // Sync body data (weight, body fat, etc.)
        try {
          const { error: bodyError } = await terraApi.forceSync(provider, 'body');
          if (bodyError) throw bodyError;
          results.push({ provider: `${token.provider} (body)`, success: true });
        } catch (error: any) {
          results.push({ 
            provider: `${token.provider} (body)`, 
            success: false, 
            error: error.message 
          });
        }

        // Sync daily data (steps, calories, distance, etc.)
        try {
          const { error: dailyError } = await terraApi.forceSync(provider, 'daily');
          if (dailyError) throw dailyError;
          results.push({ provider: `${token.provider} (daily)`, success: true });
        } catch (error: any) {
          results.push({ 
            provider: `${token.provider} (daily)`, 
            success: false, 
            error: error.message 
          });
        }

        // Sync activity data (workouts from last 14 days)
        try {
          const { error: activityError } = await terraApi.forceSync(provider, 'activity');
          if (activityError) throw activityError;
          results.push({ provider: `${token.provider} (activity)`, success: true });
        } catch (error: any) {
          results.push({ 
            provider: `${token.provider} (activity)`, 
            success: false, 
            error: error.message 
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      const successCount = results.filter(r => r.success).length;
      const failCount = results.filter(r => !r.success).length;

      if (failCount === 0) {
        toast.success(t('sync.allSynced'), {
          description: t('sync.syncedCount', { count: successCount }),
        });
      } else {
        toast.warning(t('sync.syncWithErrors'), {
          description: t('sync.syncStats', { success: successCount, fail: failCount }),
        });
      }
      
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: ['widgets'] });
      queryClient.invalidateQueries({ queryKey: ['unified-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['terra-diagnostics'] });
      queryClient.invalidateQueries({ queryKey: ['withings-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['body-metrics-withings'] });
    },
    onError: (error: Error) => {
      toast.error(t('sync.syncError'), {
        description: error.message,
      });
    },
  });
}
