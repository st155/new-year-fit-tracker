import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { enrichLeaderboardEntry, type LeaderboardEntry } from '@/lib/challenge-scoring-v3';

export const leaderboardQueryKeys = {
  all: ['leaderboard'] as const,
  list: (limit?: number) => [...leaderboardQueryKeys.all, 'list', limit] as const,
};

export function useLeaderboardQuery(
  userId: string | undefined,
  options?: { limit?: number }
) {
  return useQuery({
    queryKey: leaderboardQueryKeys.list(options?.limit),
    queryFn: async () => {
      if (!userId) return [];

      const { data: viewData, error } = await supabase
        .from('challenge_leaderboard_v2' as any)
        .select('*')
        .order('total_points', { ascending: false })
        .limit(options?.limit || 100);

      if (error) throw error;
      if (!viewData || viewData.length === 0) return [];

      // Process and enrich data
      const enrichedData = viewData.map((entry: any, index: number) => {
        const baseEntry: Omit<LeaderboardEntry, 'badges' | 'rank'> = {
          userId: entry.user_id,
          username: entry.username || entry.full_name || 'Anonymous',
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
