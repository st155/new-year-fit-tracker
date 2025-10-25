import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useLeaderboardQuery } from './core/useLeaderboardQuery';

interface UseLeaderboardOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const { user } = useAuth();
  const { limit, autoRefresh = false, refreshInterval = 30000 } = options;
  
  const { 
    data: leaderboard = [], 
    isLoading: loading, 
    error: queryError,
    refetch 
  } = useLeaderboardQuery(user?.id, { limit });

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => refetch(), refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetch]);

  // Subscribe to real-time metric updates
  useEffect(() => {
    if (!user || leaderboard.length === 0) return;

    const challengeId = leaderboard[0]?.userId;
    console.log('[Leaderboard] Setting up real-time subscription for challenge:', challengeId);

    const channel = supabase
      .channel(`leaderboard_${challengeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'metric_values',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          console.log('[Leaderboard] Metrics updated, refreshing...');
          refetch();
        }
      )
      .subscribe();

    return () => {
      console.log('[Leaderboard] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [user, leaderboard, refetch]);

  return {
    leaderboard,
    loading,
    error: queryError?.message || null,
    challengeId: leaderboard[0]?.userId || null,
    refresh: refetch,
    userEntry: leaderboard.find(entry => entry.isUser),
    topThree: leaderboard.slice(0, 3),
  };
}
