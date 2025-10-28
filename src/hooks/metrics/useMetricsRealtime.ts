import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { queryKeys } from '@/lib/query-keys';
import { useAuth } from '@/hooks/useAuth';
import { logger } from '@/lib/logger';

/**
 * Real-time subscription for client_unified_metrics updates
 * Automatically invalidates smart widget data when new metrics arrive
 */
export function useMetricsRealtime(enabled: boolean = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !user?.id) return;

    logger.debug('[MetricsRealtime] Setting up subscription', { userId: user.id });

    const channel = supabase
      .channel(`metrics_realtime_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'unified_metrics',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          logger.debug('[MetricsRealtime] New metric inserted', { metric: payload.new });
          
          // Invalidate ALL metrics queries to ensure fresh data
          queryClient.invalidateQueries({ queryKey: queryKeys.metrics.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.widgets.all });
          queryClient.invalidateQueries({ queryKey: queryKeys.activities.all });
          
          // Force refetch immediately
          queryClient.refetchQueries({ 
            queryKey: queryKeys.metrics.all,
            type: 'active' 
          });
        }
      )
      .subscribe((status) => {
        logger.debug('[MetricsRealtime] Subscription status', { status });
      });

    return () => {
      logger.debug('[MetricsRealtime] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [enabled, user?.id, queryClient]);
}
