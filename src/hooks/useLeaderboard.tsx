import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { useLeaderboardQuery } from './core/useLeaderboardQuery';

interface UseLeaderboardOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
  timePeriod?: 'overall' | 'week' | 'month';
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const { user, loading: authLoading } = useAuth();
  const { limit, autoRefresh = false, refreshInterval = 30000, timePeriod = 'overall' } = options;
  
  const { 
    data: leaderboard = [], 
    isLoading: queryLoading, 
    error: queryError,
    refetch 
  } = useLeaderboardQuery(user?.id, { limit, timePeriod });

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    
    const interval = setInterval(() => refetch(), refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, refetch]);

  // Subscribe to real-time updates for challenge points
  useEffect(() => {
    if (!user) return;

    // Get user's current challenge_id
    const getChallengeId = async () => {
      const { data } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('user_id', user.id)
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return data?.challenge_id;
    };

    getChallengeId().then((challengeId) => {
      if (!challengeId) {
        console.log('[Leaderboard] No challenge found for realtime subscription');
        return;
      }

      console.log('[Leaderboard] Setting up realtime subscription for challenge:', challengeId);

      const channel = supabase
        .channel(`leaderboard_challenge_${challengeId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'challenge_points',
            filter: `challenge_id=eq.${challengeId}`
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
    });
  }, [user, refetch]);

  console.log('[useLeaderboard] State:', {
    authLoading,
    queryLoading,
    userId: user?.id,
    leaderboardLength: leaderboard.length,
    finalLoading: authLoading || (queryLoading && !!user?.id)
  });

  return {
    leaderboard,
    loading: authLoading || (queryLoading && !!user?.id),
    error: queryError?.message || null,
    challengeId: leaderboard[0]?.userId || null,
    refresh: refetch,
    userEntry: leaderboard.find(entry => entry.isUser),
    topThree: leaderboard.slice(0, 3),
  };
}
