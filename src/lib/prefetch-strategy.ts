import { QueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { metricsQueryKeys } from '@/hooks/metrics/useUnifiedMetricsQuery';
import { profileQueryKeys } from '@/hooks/core/useProfileQuery';
import { leaderboardQueryKeys } from '@/hooks/core/useLeaderboardQuery';
import { dateRangeUTC } from './datetime-utils';

/**
 * Prefetching strategy for instant navigation
 * 
 * WHEN TO PREFETCH:
 * - After login (critical data)
 * - On hover/focus on route links
 * - Before route transitions
 */

export class PrefetchStrategy {
  constructor(private queryClient: QueryClient) {}

  /**
   * Prefetch after login - critical data
   */
  async prefetchAfterLogin(userId: string) {
    console.log('[Prefetch] Prefetching critical data after login');

    await Promise.all([
      // Dashboard metrics
      this.queryClient.prefetchQuery({
        queryKey: metricsQueryKeys.unified(userId),
        queryFn: async () => {
          const { data } = await supabase
            .from('unified_metrics')
            .select('*')
            .eq('user_id', userId)
            .order('priority', { ascending: true })
            .order('measurement_date', { ascending: false })
            .limit(50);
          return data || [];
        },
        staleTime: 2 * 60 * 1000,
      }),

      // User profile
      this.queryClient.prefetchQuery({
        queryKey: profileQueryKeys.profile(userId),
        queryFn: async () => {
          const { data } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .single();
          return data;
        },
        staleTime: 10 * 60 * 1000,
      }),
      
      // Prefetch routes (data only, не загружаем тяжелые библиотеки)
      this.prefetchRoute(userId, '/progress'),
      this.prefetchRoute(userId, '/body'),
      this.prefetchRoute(userId, '/goals'),
    ]);

    console.log('[Prefetch] Critical data loaded');
  }

  /**
   * Prefetch route data on hover
   */
  async prefetchRoute(userId: string, route: string) {
    console.log('[Prefetch] Preloading route:', route);

    switch (route) {
      case '/progress':
        await this.prefetchProgressPage(userId);
        break;
      case '/body':
        await this.prefetchBodyPage(userId);
        break;
      case '/goals':
        await this.prefetchGoalsPage(userId);
        break;
      case '/leaderboard':
        await this.prefetchLeaderboardPage(userId);
        break;
    }
  }

  private async prefetchProgressPage(userId: string) {
    const { start } = dateRangeUTC(90); // 90 days of history

    await this.queryClient.prefetchQuery({
      queryKey: metricsQueryKeys.filtered(userId, { startDate: start }),
      queryFn: async () => {
        const { data } = await supabase
          .from('unified_metrics')
          .select('*')
          .eq('user_id', userId)
          .gte('measurement_date', start)
          .order('measurement_date', { ascending: false });
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }

  private async prefetchBodyPage(userId: string) {
    await Promise.all([
      // Body composition history
      this.queryClient.prefetchQuery({
        queryKey: ['body', 'composition', userId],
        queryFn: async () => {
          const { data } = await supabase
            .from('body_composition')
            .select('*')
            .eq('user_id', userId)
            .order('measurement_date', { ascending: false })
            .limit(30);
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      }),

      // InBody analyses
      this.queryClient.prefetchQuery({
        queryKey: ['inbody', 'analyses', userId],
        queryFn: async () => {
          const { data } = await supabase
            .from('inbody_analyses')
            .select('*')
            .eq('user_id', userId)
            .order('test_date', { ascending: false })
            .limit(10);
          return data || [];
        },
        staleTime: 5 * 60 * 1000,
      }),
    ]);
  }

  private async prefetchGoalsPage(userId: string) {
    await this.queryClient.prefetchQuery({
      queryKey: ['goals', 'active', userId],
      queryFn: async () => {
        const { data } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false });
        return data || [];
      },
      staleTime: 5 * 60 * 1000,
    });
  }

  private async prefetchLeaderboardPage(userId: string) {
    await this.queryClient.prefetchQuery({
      queryKey: leaderboardQueryKeys.list(userId, 100, 'overall'),
      queryFn: async () => {
        const { data } = await supabase
          .rpc('get_leaderboard_for_viewer', {
            viewer: userId,
            time_period: 'overall',
            limit_n: 100
          });
        return data || [];
      },
      staleTime: 1 * 60 * 1000,
    });
  }
}

/**
 * No-op prefetcher for cases when real prefetcher isn't ready yet
 */
class NoopPrefetcher {
  async prefetchAfterLogin(userId: string) {
    // No-op: silently skip prefetch
  }

  async prefetchRoute(userId: string, route: string) {
    // No-op: silently skip prefetch
  }
}

// Singleton instances
let prefetcher: PrefetchStrategy | null = null;
const noopPrefetcher = new NoopPrefetcher();
let warnedAboutNoop = false;

export function initPrefetcher(queryClient: QueryClient) {
  prefetcher = new PrefetchStrategy(queryClient);
  console.log('[Prefetch] Strategy initialized');
}

export function getPrefetcher(): PrefetchStrategy | NoopPrefetcher {
  if (!prefetcher) {
    if (!warnedAboutNoop) {
      console.warn('[Prefetch] Using NOOP prefetcher (not initialized yet)');
      warnedAboutNoop = true;
    }
    return noopPrefetcher as any;
  }
  return prefetcher;
}
