import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { enrichLeaderboardEntry, type LeaderboardEntry } from '@/lib/challenge-scoring-v3';

export const leaderboardQueryKeys = {
  all: ['leaderboard'] as const,
  list: (userId?: string, limit?: number, timePeriod?: string) => [...leaderboardQueryKeys.all, 'list', userId, limit, timePeriod] as const,
};

// Fallback query for basic leaderboard data when views fail
async function fetchFallbackLeaderboard(userId: string, limit?: number, challengeId?: string) {
  console.debug('[useLeaderboardQuery] Using fallback query', { challengeId });
  
  let targetChallengeId = challengeId;

  // If no challengeId provided, find user's challenge
  if (!targetChallengeId) {
    // Get user's most recent challenge (handles multiple participations)
    const { data: participation } = await supabase
      .from('challenge_participants')
      .select('challenge_id')
      .eq('user_id', userId)
      .order('joined_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!participation?.challenge_id) {
      console.debug('[useLeaderboardQuery] No challenge found for user');
      return [];
    }
    
    targetChallengeId = participation.challenge_id;
  }

  console.log('[useLeaderboardQuery] Fetching fallback for challenge:', targetChallengeId);

  // Get basic leaderboard data from challenge_points
  const query = supabase
    .from('challenge_points')
    .select(`
      user_id,
      points,
      streak_days,
      last_activity_date
    `)
    .eq('challenge_id', targetChallengeId)
    .order('points', { ascending: false });

  if (limit) {
    query.limit(limit);
  }

  const { data: pointsData, error: pointsError } = await query;

  if (pointsError || !pointsData) {
    console.error('[useLeaderboardQuery] Fallback query error:', pointsError);
    return [];
  }

  // Fetch profiles separately
  const userIds = pointsData.map(p => p.user_id);
  const { data: profiles } = await supabase
    .from('profiles')
    .select('user_id, username, full_name, avatar_url')
    .in('user_id', userIds);

  console.debug('[useLeaderboardQuery] Fallback returned:', pointsData.length, 'entries');

  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

  return pointsData.map((entry, index) => {
    const profile = profileMap.get(entry.user_id);
    const baseEntry: Omit<LeaderboardEntry, 'badges' | 'rank'> = {
      userId: entry.user_id,
      username: profile?.username || profile?.full_name || 'Unknown',
      fullName: profile?.full_name || 'Unknown User',
      avatarUrl: profile?.avatar_url || null,
      totalPoints: entry.points || 0,
      streakDays: entry.streak_days || 0,
      activeDays: 0,
      lastActivityDate: entry.last_activity_date,
      isUser: entry.user_id === userId,
      // Minimal data for fallback
      totalSteps: null,
      avgStrain: null,
      avgSleep: null,
      avgSleepEfficiency: null,
      avgRestingHr: null,
      avgHrv: null,
      totalActiveCalories: null,
      steps_last_7d: null,
      avg_strain_last_7d: null,
      avg_sleep_last_7d: null,
      avg_recovery_last_7d: null,
      workouts_last_7d: null,
      weekly_consistency: null,
      avgRecovery: null,
      performancePoints: 0,
      recoveryPoints: 0,
      synergyPoints: 0,
      totalGoals: 0,
      goalsWithBaseline: 0,
      trackableGoals: 0,
    };

    return enrichLeaderboardEntry(baseEntry, index + 1);
  });
}

export function useLeaderboardQuery(
  userId: string | undefined,
  options?: { limit?: number; timePeriod?: 'overall' | 'week' | 'month'; challengeId?: string }
) {
  const queryClient = useQueryClient();
  
  return useQuery({
    queryKey: leaderboardQueryKeys.list(userId, options?.limit, options?.timePeriod),
    queryFn: async () => {
      if (!userId) return [];

      const timePeriod = options?.timePeriod || 'overall';
      const limit = options?.limit || 100;
      const challengeId = options?.challengeId;
      const queryKey = leaderboardQueryKeys.list(userId, limit, timePeriod);

      // If challengeId is provided, skip RPC and use fallback directly
      if (challengeId) {
        console.log('[useLeaderboardQuery] Using direct fallback for challenge:', challengeId);
        return fetchFallbackLeaderboard(userId, limit, challengeId);
      }

      console.log('[useLeaderboardQuery] Fetching via RPC:', { userId, timePeriod, limit });

      const startTime = Date.now();
      let rpcFinished = false;

      // Start RPC call
      const rpcPromise = supabase
        .rpc('get_leaderboard_for_viewer', {
          viewer: userId,
          time_period: timePeriod,
          limit_n: limit
        })
        .then(async ({ data: rpcData, error: rpcError }) => {
          const elapsed = Date.now() - startTime;
          console.log(`[useLeaderboardQuery] RPC finished in ${elapsed}ms`, { 
            dataLength: rpcData?.length, 
            error: rpcError 
          });

          if (rpcError) {
            console.error('[useLeaderboardQuery] RPC error:', rpcError);
            return null;
          }
          
          if (!rpcData || rpcData.length === 0) {
            console.log('[useLeaderboardQuery] RPC returned 0 rows');
            return null;
          }

          // Fetch points breakdown separately
          const userIds = rpcData.map((entry: any) => entry.user_id);
          const { data: pointsData } = await supabase
            .from('challenge_points')
            .select('user_id, performance_points, recovery_points, synergy_points, points_breakdown')
            .in('user_id', userIds);

          // Process and enrich data
          const enrichedData = rpcData.map((entry: any, index: number) => {
            const points = pointsData?.find((p: any) => p.user_id === entry.user_id);
            
            const baseEntry: Omit<LeaderboardEntry, 'badges' | 'rank'> = {
              userId: entry.user_id,
              username: entry.full_name || entry.username || 'Anonymous',
              fullName: entry.full_name,
              avatarUrl: entry.avatar_url,
              totalPoints: entry.total_points || 0,
              activeDays: entry.days_with_data || 0,
              lastActivityDate: entry.last_activity_date,
              streakDays: entry.streak_days || 0,
              avgRecovery: Math.round(entry.avg_recovery || 0),
              avgStrain: Math.round((entry.avg_strain || 0) * 10) / 10,
              avgSleep: Math.round((entry.avg_sleep || 0) * 10) / 10,
              avgSleepEfficiency: Math.round(entry.avg_sleep_efficiency || 0),
              avgRestingHr: Math.round(entry.avg_resting_hr || 0),
              avgHrv: Math.round(entry.avg_hrv || 0),
              totalSteps: entry.total_steps || 0,
              totalActiveCalories: entry.total_calories || 0,
              steps_last_7d: entry.steps_last_7d || 0,
              avg_strain_last_7d: entry.avg_strain_last_7d || null,
              avg_sleep_last_7d: entry.avg_sleep_last_7d || null,
              avg_recovery_last_7d: entry.avg_recovery_last_7d || null,
              workouts_last_7d: entry.workouts_last_7d || 0,
              weekly_consistency: entry.weekly_consistency || 0,
              performancePoints: points?.performance_points || 0,
              recoveryPoints: points?.recovery_points || 0,
              synergyPoints: points?.synergy_points || 0,
              pointsBreakdown: points?.points_breakdown as any || undefined,
              totalGoals: 0,
              goalsWithBaseline: 0,
              trackableGoals: 0,
              isUser: entry.user_id === userId
            };

            return enrichLeaderboardEntry(baseEntry, index + 1);
          });

          // Re-sort after badge bonus
          const sortedData = enrichedData.sort((a, b) => b.totalPoints - a.totalPoints);
          
          console.log('✅ [Leaderboard] RPC enriched data:', sortedData.slice(0, 3).map(e => ({
            username: e.username,
            badges: e.badges.length,
            finalPoints: e.totalPoints
          })));
          
          // Update ranks after re-sorting
          return sortedData.map((entry, index) => ({
            ...entry,
            rank: index + 1
          }));
        });

      // Timeout: if RPC doesn't finish in 2s, return fallback immediately
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => {
          if (!rpcFinished) {
            console.warn('[useLeaderboardQuery] RPC timeout (2s) -> using fallback');
            resolve(null);
          }
        }, 2000);
      });

      const rpcResult = await Promise.race([rpcPromise, timeoutPromise]);

      if (rpcResult !== null) {
        // RPC finished quickly
        rpcFinished = true;
        return rpcResult;
      }

      // RPC timed out, fetch fallback immediately
      console.log('[useLeaderboardQuery] Returning fallback (fast path)');
      const fallbackData = await fetchFallbackLeaderboard(userId, limit, challengeId);

      // Continue RPC in background and update when ready
      rpcPromise.then((lateRpcResult) => {
        if (lateRpcResult !== null && !rpcFinished) {
          console.log('[useLeaderboardQuery] RPC finished late -> updating cache silently');
          queryClient.setQueryData(queryKey, lateRpcResult);
        }
      });

      return fallbackData;

    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
