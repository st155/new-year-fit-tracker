import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SyncResult {
  provider: string;
  success: boolean;
  error?: string;
}

export function useSyncAllDevices() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Get user's active Terra tokens
      const { data: tokens, error: tokensError } = await supabase
        .from('terra_tokens')
        .select('provider')
        .eq('is_active', true);

      if (tokensError) throw tokensError;
      if (!tokens || tokens.length === 0) {
        throw new Error('No active devices found');
      }

      const results: SyncResult[] = [];

      // Sync each provider - body, daily, and activity data
      for (const token of tokens) {
        const provider = token.provider.toLowerCase();
        
        // Sync body data (weight, body fat, etc.)
        try {
          const { error: bodyError } = await supabase.functions.invoke('force-terra-sync', {
            body: { provider, dataType: 'body' },
          });
          if (bodyError) throw bodyError;
          results.push({ provider: `${token.provider} (body)`, success: true });
        } catch (error) {
          results.push({ 
            provider: `${token.provider} (body)`, 
            success: false, 
            error: error.message 
          });
        }

        // Sync daily data (steps, calories, distance, etc.)
        try {
          const { error: dailyError } = await supabase.functions.invoke('force-terra-sync', {
            body: { provider, dataType: 'daily' },
          });
          if (dailyError) throw dailyError;
          results.push({ provider: `${token.provider} (daily)`, success: true });
        } catch (error) {
          results.push({ 
            provider: `${token.provider} (daily)`, 
            success: false, 
            error: error.message 
          });
        }

        // Sync activity data (workouts from last 14 days)
        try {
          const { error: activityError } = await supabase.functions.invoke('force-terra-sync', {
            body: { provider, dataType: 'activity' },
          });
          if (activityError) throw activityError;
          results.push({ provider: `${token.provider} (activity)`, success: true });
        } catch (error) {
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
        toast.success('Все устройства синхронизированы', {
          description: `Обновлено ${successCount} источников данных`,
        });
      } else {
        toast.warning('Синхронизация завершена с ошибками', {
          description: `Успешно: ${successCount}, Ошибок: ${failCount}`,
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
      toast.error('Ошибка синхронизации', {
        description: error.message,
      });
    },
  });
}
