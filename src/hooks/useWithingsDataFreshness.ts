import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface WithingsDataFreshness {
  isStale: boolean;
  lastSyncDate: Date | null;
  daysSinceSync: number;
  hasData: boolean;
  metricsCount7Days: number;
}

export function useWithingsDataFreshness() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['withings-data-freshness', user?.id],
    queryFn: async (): Promise<WithingsDataFreshness> => {
      if (!user) {
        return {
          isStale: true,
          lastSyncDate: null,
          daysSinceSync: 0,
          hasData: false,
          metricsCount7Days: 0,
        };
      }

      // Check for recent Withings data
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentMetrics, error } = await supabase
        .from('unified_metrics')
        .select('measurement_date, created_at')
        .eq('user_id', user.id)
        .eq('provider', 'WITHINGS')
        .gte('measurement_date', sevenDaysAgo.toISOString().split('T')[0])
        .order('measurement_date', { ascending: false });

      if (error) {
        console.error('[WITHINGS FRESHNESS] Error:', error);
        return {
          isStale: true,
          lastSyncDate: null,
          daysSinceSync: 0,
          hasData: false,
          metricsCount7Days: 0,
        };
      }

      const hasData = (recentMetrics?.length ?? 0) > 0;
      const lastSyncDate = hasData && recentMetrics?.[0]?.measurement_date 
        ? new Date(recentMetrics[0].measurement_date)
        : null;

      const daysSinceSync = lastSyncDate
        ? Math.floor((Date.now() - lastSyncDate.getTime()) / (1000 * 60 * 60 * 24))
        : 999;

      const isStale = daysSinceSync > 1 || !hasData;

      return {
        isStale,
        lastSyncDate,
        daysSinceSync,
        hasData,
        metricsCount7Days: recentMetrics?.length ?? 0,
      };
    },
    enabled: !!user,
    refetchInterval: 5 * 60 * 1000, // Check every 5 minutes
    staleTime: 2 * 60 * 1000, // Consider stale after 2 minutes
  });
}
