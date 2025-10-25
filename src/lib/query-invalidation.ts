import { QueryClient } from '@tanstack/react-query';
import { metricsQueryKeys } from '@/hooks/metrics/useUnifiedMetricsQuery';
import { profileQueryKeys } from '@/hooks/core/useProfileQuery';
import { leaderboardQueryKeys } from '@/hooks/core/useLeaderboardQuery';

/**
 * Centralized query invalidation strategy
 * 
 * WHEN TO INVALIDATE:
 * - After adding/updating metrics (manual entry, sync, upload)
 * - After Terra/Whoop/Withings sync
 * - After body composition update
 * - On logout (clear all user cache)
 */

export class QueryInvalidator {
  constructor(private queryClient: QueryClient) {}

  /**
   * After adding a metric (manual entry, sync, upload)
   */
  async onMetricAdded(userId: string, metricName?: string) {
    await Promise.all([
      // Invalidate unified metrics
      this.queryClient.invalidateQueries({
        queryKey: metricsQueryKeys.unified(userId),
      }),
      
      // Invalidate activity feed
      this.queryClient.invalidateQueries({
        queryKey: ['activities', 'feed', userId],
      }),

      // Invalidate leaderboard (metrics affect points)
      this.queryClient.invalidateQueries({
        queryKey: leaderboardQueryKeys.all,
      }),
    ]);
  }

  /**
   * After Terra/Whoop/Withings sync (batch invalidation)
   */
  async onDataSync(userId: string) {
    await this.queryClient.invalidateQueries({
      predicate: (query) => {
        const key = JSON.stringify(query.queryKey);
        return key.includes('metrics') && key.includes(userId);
      },
    });
  }

  /**
   * After body composition update (InBody, Withings scales)
   */
  async onBodyCompositionUpdated(userId: string) {
    await Promise.all([
      this.onMetricAdded(userId, 'Body Fat Percentage'),
      this.onMetricAdded(userId, 'Weight'),
      this.onMetricAdded(userId, 'Muscle Mass'),
      
      // Invalidate body-specific queries
      this.queryClient.invalidateQueries({
        queryKey: ['body', 'composition', userId],
      }),
    ]);
  }

  /**
   * After profile update
   */
  async onProfileUpdated(userId: string) {
    await this.queryClient.invalidateQueries({
      queryKey: profileQueryKeys.profile(userId),
    });
  }

  /**
   * On logout - clear all user cache
   */
  async clearUserCache(userId: string) {
    await this.queryClient.removeQueries({
      predicate: (query) => {
        return JSON.stringify(query.queryKey).includes(userId);
      },
    });
  }

  /**
   * Manual refresh (pull-to-refresh)
   */
  async refreshAll(userId: string) {
    await this.queryClient.invalidateQueries({
      predicate: (query) => {
        return JSON.stringify(query.queryKey).includes(userId);
      },
    });
  }
}

// Singleton instance
let invalidator: QueryInvalidator | null = null;

export function initInvalidator(queryClient: QueryClient) {
  invalidator = new QueryInvalidator(queryClient);
}

export function getInvalidator(): QueryInvalidator {
  if (!invalidator) {
    throw new Error('QueryInvalidator not initialized. Call initInvalidator() first.');
  }
  return invalidator;
}
