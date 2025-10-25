import { useQueryClient } from '@tanstack/react-query';
import { getPrefetcher } from '@/lib/prefetch-strategy';
import { useAuth } from './useAuth';

/**
 * Hook for prefetching data on route hover/focus
 * Usage: const prefetch = usePrefetch();
 *        <Link onMouseEnter={() => prefetch.route('/progress')}>
 */
export function usePrefetch() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const prefetchRoute = async (route: string) => {
    if (!user) return;

    try {
      const prefetcher = getPrefetcher();
      await prefetcher.prefetchRoute(user.id, route);
    } catch (error) {
      // Prefetch errors are non-critical
      console.warn('[Prefetch] Failed to prefetch route:', route, error);
    }
  };

  return {
    route: prefetchRoute,
  };
}
