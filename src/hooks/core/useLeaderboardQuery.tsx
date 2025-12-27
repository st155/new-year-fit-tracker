import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { enrichLeaderboardEntry, type LeaderboardEntry } from '@/features/challenges/utils';

export const leaderboardQueryKeys = {
  all: ['leaderboard'] as const,
  list: (userId?: string, limit?: number, timePeriod?: string, challengeId?: string) => [...leaderboardQueryKeys.all, 'list', userId, limit, timePeriod, challengeId] as const,
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

  // Get weekly metrics from unified_metrics
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const { data: weeklyMetrics } = await supabase
    .from('unified_metrics')
    .select('user_id, metric_name, value, measurement_date')
    .in('user_id', userIds)
    .in('metric_name', ['Steps', 'Sleep Duration', 'Recovery Score', 'Day Strain', 'Sleep Efficiency'])
    .gte('measurement_date', sevenDaysAgoStr);

  console.debug('[useLeaderboardQuery] Fallback returned:', pointsData.length, 'entries');

  // Calculate weekly averages for each user
  const metricsMap = new Map<string, {
    avgSleep: number;
    avgRecovery: number;
    avgStrain: number;
    avgSleepEfficiency: number;
    steps: number;
    activeDays: number;
  }>();

  if (weeklyMetrics) {
    userIds.forEach(uid => {
      const userMetrics = weeklyMetrics.filter(m => m.user_id === uid);
      if (userMetrics.length > 0) {
        const sleepMetrics = userMetrics.filter(m => m.metric_name === 'Sleep Duration');
        const recoveryMetrics = userMetrics.filter(m => m.metric_name === 'Recovery Score');
        const strainMetrics = userMetrics.filter(m => m.metric_name === 'Day Strain');
        const stepMetrics = userMetrics.filter(m => m.metric_name === 'Steps');
        const sleepEffMetrics = userMetrics.filter(m => m.metric_name === 'Sleep Efficiency');
        
        const avgSleep = sleepMetrics.length > 0 
          ? sleepMetrics.reduce((sum, m) => sum + (m.value || 0), 0) / sleepMetrics.length 
          : 0;
        const avgRecovery = recoveryMetrics.length > 0 
          ? recoveryMetrics.reduce((sum, m) => sum + (m.value || 0), 0) / recoveryMetrics.length 
          : 0;
        const avgStrain = strainMetrics.length > 0 
          ? strainMetrics.reduce((sum, m) => sum + (m.value || 0), 0) / strainMetrics.length 
          : 0;
        const avgSleepEfficiency = sleepEffMetrics.length > 0 
          ? sleepEffMetrics.reduce((sum, m) => sum + (m.value || 0), 0) / sleepEffMetrics.length 
          : 0;
        
        // Deduplicate steps: take MAX per day to handle multiple devices
        const stepsByDate = new Map<string, number>();
        stepMetrics.forEach(m => {
          const date = m.measurement_date;
          const currentMax = stepsByDate.get(date) || 0;
          if (m.value && m.value > currentMax) {
            stepsByDate.set(date, m.value);
          }
        });
        const steps = Array.from(stepsByDate.values()).reduce((sum, v) => sum + v, 0);
        
        const activeDays = new Set(userMetrics.map(m => m.measurement_date)).size;
        
        metricsMap.set(uid, {
          avgSleep: Math.round(avgSleep * 10) / 10,
          avgRecovery: Math.round(avgRecovery),
          avgStrain: Math.round(avgStrain * 10) / 10,
          avgSleepEfficiency: Math.round(avgSleepEfficiency),
          steps,
          activeDays
        });
      }
    });
  }

  const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);

  return pointsData.map((entry, index) => {
    const profile = profileMap.get(entry.user_id);
    const metrics = metricsMap.get(entry.user_id);
    
    const baseEntry: Omit<LeaderboardEntry, 'badges' | 'rank'> = {
      userId: entry.user_id,
      username: profile?.username || profile?.full_name || 'Unknown',
      fullName: profile?.full_name || 'Unknown User',
      avatarUrl: profile?.avatar_url || null,
      totalPoints: entry.points || 0,
      streakDays: entry.streak_days || 0,
      activeDays: metrics?.activeDays || 0,
      lastActivityDate: entry.last_activity_date,
      isUser: entry.user_id === userId,
      totalSteps: metrics?.steps || null,
      avgStrain: metrics?.avgStrain || null,
      avgSleep: metrics?.avgSleep || null,
      avgSleepEfficiency: metrics?.avgSleepEfficiency || null,
      avgRestingHr: null,
      avgHrv: null,
      totalActiveCalories: null,
      steps_last_7d: metrics?.steps || null,
      avg_strain_last_7d: metrics?.avgStrain || null,
      avg_sleep_last_7d: metrics?.avgSleep || null,
      avg_recovery_last_7d: metrics?.avgRecovery || null,
      workouts_last_7d: null,
      weekly_consistency: null,
      avgRecovery: metrics?.avgRecovery || null,
      performancePoints: 0,
      recoveryPoints: 0,
      synergyPoints: 0,
      activityScore: 0,
      recoveryScore: 0,
      progressScore: 0,
      balanceScore: 0,
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
    queryKey: leaderboardQueryKeys.list(userId, options?.limit, options?.timePeriod, options?.challengeId),
    queryFn: async () => {
      if (!userId) return [];

      const timePeriod = options?.timePeriod || 'overall';
      const limit = options?.limit || 100;
      const challengeId = options?.challengeId;
      const queryKey = leaderboardQueryKeys.list(userId, limit, timePeriod, challengeId);

      console.log('[useLeaderboardQuery] Starting fetch:', { userId, timePeriod, limit, challengeId });

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

          // Filter by challengeId if provided
          const filteredData = challengeId 
            ? rpcData.filter((entry: any) => entry.challenge_id === challengeId)
            : rpcData;

          console.log('[useLeaderboardQuery] After challenge filter:', { 
            original: rpcData.length, 
            filtered: filteredData.length,
            challengeId,
            sampleData: filteredData.slice(0, 2).map((e: any) => ({
              username: e.full_name,
              days_with_data: e.days_with_data,
              avg_recovery_last_7d: e.avg_recovery_last_7d,
              avg_sleep_last_7d: e.avg_sleep_last_7d,
              steps_last_7d: e.steps_last_7d,
              streak_days: e.streak_days
            }))
          });

          if (filteredData.length === 0) {
            console.log('[useLeaderboardQuery] No data after challenge filter, using fallback');
            return null;
          }

          // Fetch points breakdown separately - ВАЖНО: фильтруем по challenge_id!
          const userIds = filteredData.map((entry: any) => entry.user_id);
          const targetChallengeId = challengeId || filteredData[0]?.challenge_id;
          
          let pointsQuery = supabase
            .from('challenge_points')
            .select('user_id, challenge_id, points, performance_points, recovery_points, synergy_points, activity_score, recovery_score, progress_score, balance_score, points_breakdown')
            .in('user_id', userIds);
          
          // Фильтруем по challenge_id если есть
          if (targetChallengeId) {
            pointsQuery = pointsQuery.eq('challenge_id', targetChallengeId);
          }
          
          const { data: pointsData } = await pointsQuery;

          console.log('[useLeaderboardQuery] Points data fetched:', {
            targetChallengeId,
            pointsCount: pointsData?.length || 0,
            sample: pointsData?.slice(0, 3).map(p => ({
              user_id: p.user_id.slice(0, 8),
              challenge_id: p.challenge_id?.slice(0, 8),
              points: p.points,
              activity_score: p.activity_score,
              recovery_score: p.recovery_score
            }))
          });

          // Process and enrich data
          const enrichedData = filteredData.map((entry: any, index: number) => {
            // Ищем points для ЭТОГО пользователя и ЭТОГО челленджа
            const points = pointsData?.find((p: any) => 
              p.user_id === entry.user_id && 
              (!targetChallengeId || p.challenge_id === targetChallengeId)
            );
            
            // ВАЖНО: totalPoints берём из challenge_points.points (приоритет), 
            // а RPC total_points как fallback
            const totalPoints = points?.points ?? entry.total_points ?? 0;
            
            const baseEntry: Omit<LeaderboardEntry, 'badges' | 'rank'> = {
              userId: entry.user_id,
              username: entry.full_name || entry.username || 'Anonymous',
              fullName: entry.full_name,
              avatarUrl: entry.avatar_url,
              totalPoints,
              activeDays: entry.days_with_data || entry.active_days || 0,
              lastActivityDate: entry.last_activity_date,
              streakDays: entry.streak_days || 0,
              avgRecovery: Math.round(entry.avg_recovery_last_7d || entry.avg_recovery || 0),
              avgStrain: Math.round((entry.avg_strain_last_7d || entry.avg_strain || 0) * 10) / 10,
              avgSleep: Math.round((entry.avg_sleep_last_7d || entry.avg_sleep || 0) * 10) / 10,
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
              activityScore: points?.activity_score || 0,
              recoveryScore: points?.recovery_score || 0,
              progressScore: points?.progress_score || 0,
              balanceScore: points?.balance_score || 0,
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
          
          console.log('✅ [useLeaderboardQuery] RPC enriched data:', {
            total: sortedData.length,
            challengeId: targetChallengeId,
            sample: sortedData.slice(0, 5).map((e, i) => ({
              rank: i + 1,
              username: e.username,
              totalPoints: e.totalPoints,
              activityScore: e.activityScore,
              recoveryScore: e.recoveryScore,
              progressScore: e.progressScore,
              balanceScore: e.balanceScore
            }))
          });
          
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
        console.log('[useLeaderboardQuery] Using RPC data (fast path)');
        return rpcResult;
      }

      // RPC timed out, fetch fallback immediately
      console.log('[useLeaderboardQuery] RPC timeout -> returning fallback (fast path)');
      const fallbackData = await fetchFallbackLeaderboard(userId, limit, challengeId);

      // Continue RPC in background and update when ready
      rpcPromise.then((lateRpcResult) => {
        if (lateRpcResult !== null && !rpcFinished) {
          console.log('[useLeaderboardQuery] RPC finished late -> updating cache silently');
          queryClient.setQueryData(queryKey, lateRpcResult);
        }
      });

      console.log('[useLeaderboardQuery] Returning fallback data:', { count: fallbackData.length });
      return fallbackData;

    },
    enabled: !!userId,
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: true,
  });
}
