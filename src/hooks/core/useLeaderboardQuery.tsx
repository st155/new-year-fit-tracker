import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { enrichLeaderboardEntry, type LeaderboardEntry } from '@/lib/challenge-scoring-v3';

export const leaderboardQueryKeys = {
  all: ['leaderboard'] as const,
  list: (limit?: number, timePeriod?: string) => [...leaderboardQueryKeys.all, 'list', limit, timePeriod] as const,
};

export function useLeaderboardQuery(
  userId: string | undefined,
  options?: { limit?: number; timePeriod?: 'overall' | 'week' | 'month' }
) {
  return useQuery({
    queryKey: leaderboardQueryKeys.list(options?.limit, options?.timePeriod),
    queryFn: async () => {
      if (!userId) return [];

      const timePeriod = options?.timePeriod || 'overall';
      const viewName = timePeriod === 'week' 
        ? 'challenge_leaderboard_week'
        : timePeriod === 'month'
        ? 'challenge_leaderboard_month'
        : 'challenge_leaderboard_v2';

      const { data: viewData, error } = await supabase
        .from(viewName as any)
        .select('*')
        .order('total_points', { ascending: false })
        .limit(options?.limit || 100);

      if (error) throw error;
      if (!viewData || viewData.length === 0) return [];

      // Fetch points breakdown separately
      const userIds = viewData.map((entry: any) => entry.user_id);
      const { data: pointsData } = await supabase
        .from('challenge_points')
        .select('user_id, performance_points, recovery_points, synergy_points, points_breakdown')
        .in('user_id', userIds);

      // Process and enrich data
      const enrichedData = viewData.map((entry: any, index: number) => {
        const points = pointsData?.find((p: any) => p.user_id === entry.user_id);
        
        const baseEntry: Omit<LeaderboardEntry, 'badges' | 'rank'> = {
          userId: entry.user_id,
          username: entry.full_name || entry.username || 'Anonymous',
          fullName: entry.full_name,
          avatarUrl: entry.avatar_url,
          totalPoints: entry.total_points || 0,
          activeDays: entry.active_days || 0,
          lastActivityDate: entry.last_activity_date,
          streakDays: entry.streak_days || 0,
          avgRecovery: Math.round(entry.avg_recovery || 0),
          avgStrain: Math.round((entry.avg_strain || 0) * 10) / 10,
          avgSleep: Math.round((entry.avg_sleep || 0) * 10) / 10,
          avgSleepEfficiency: Math.round(entry.avg_sleep_efficiency || 0),
          avgRestingHr: Math.round(entry.avg_resting_hr || 0),
          avgHrv: Math.round(entry.avg_hrv || 0),
          totalSteps: entry.total_steps || 0,
          totalActiveCalories: entry.total_active_calories || 0,
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
      
      // Update ranks after re-sorting
      return sortedData.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));
    },
    enabled: !!userId,
    staleTime: 1 * 60 * 1000, // 1 minute
    gcTime: 3 * 60 * 1000,
  });
}
