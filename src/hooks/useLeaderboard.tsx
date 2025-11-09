import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useLeaderboardQuery } from './core/useLeaderboardQuery';
import { usePreferredChallenge } from './usePreferredChallenge';

interface UseLeaderboardOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  timePeriod?: 'overall' | 'week' | 'month';
  challengeId?: string; // Allow manual override
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const { user, loading: authLoading } = useAuth();
  const { limit, autoRefresh = false, refreshInterval = 30000, timePeriod = 'overall', challengeId: manualChallengeId } = options;
  
  // Get preferred challenge if no manual override
  const { challengeId: preferredChallengeId, title: challengeTitle, isLoading: challengesLoading } = usePreferredChallenge(user?.id);
  const effectiveChallengeId = manualChallengeId || preferredChallengeId;

  const { 
    data: leaderboard = [], 
    isLoading: queryLoading, 
    error: queryError,
    refetch 
  } = useLeaderboardQuery(user?.id, { limit, timePeriod, challengeId: effectiveChallengeId || undefined });

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => refetch(), refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetch]);

  // Subscribe to real-time updates for challenge points
  useEffect(() => {
    if (!user || !effectiveChallengeId) return;

    console.log('[Leaderboard] Setting up realtime subscription for challenge:', effectiveChallengeId);

    const channel = supabase
      .channel(`leaderboard_challenge_${effectiveChallengeId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'challenge_points',
          filter: `challenge_id=eq.${effectiveChallengeId}`
        },
        () => {
          console.log('[Leaderboard] Challenge points updated, refreshing...');
          refetch();
        }
      )
      .subscribe();

    return () => {
      console.log('[Leaderboard] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [user, effectiveChallengeId, refetch]);

  console.log('[useLeaderboard] State:', {
    authLoading,
    challengesLoading,
    queryLoading,
    userId: user?.id,
    effectiveChallengeId,
    challengeTitle,
    leaderboardLength: leaderboard.length,
    finalLoading: authLoading || challengesLoading || (queryLoading && !!user?.id),
    dataSample: leaderboard.slice(0, 3).map(e => ({
      username: e.username,
      steps_last_7d: e.steps_last_7d,
      avg_strain_last_7d: e.avg_strain_last_7d,
      avg_sleep_last_7d: e.avg_sleep_last_7d,
      avg_recovery_last_7d: e.avg_recovery_last_7d,
      avgSleepEfficiency: e.avgSleepEfficiency,
      streakDays: e.streakDays
    }))
  });

  return {
    leaderboard,
    loading: authLoading || challengesLoading || (queryLoading && !!user?.id),
    error: queryError?.message || null,
    challengeId: effectiveChallengeId,
    challengeTitle,
    refresh: refetch,
    userEntry: leaderboard.find(entry => entry.isUser),
    topThree: leaderboard.slice(0, 3),
  };
}
