import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { enrichLeaderboardEntry, type LeaderboardEntry } from '@/lib/challenge-scoring-v3';

interface UseLeaderboardOptions {
  limit?: number;
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useLeaderboard(options: UseLeaderboardOptions = {}) {
  const { user } = useAuth();
  const { limit, autoRefresh = false, refreshInterval = 30000 } = options;
  
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [challengeId, setChallengeId] = useState<string | null>(null);

  const fetchLeaderboard = async () => {
    try {
      if (!user) {
        setLeaderboard([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      // Query the optimized view
      const { data, error: queryError } = await supabase
        .from('challenge_leaderboard_v2')
        .select('*')
        .order('total_points', { ascending: false })
        .limit(limit || 100);

      if (queryError) throw queryError;

      if (!data || data.length === 0) {
        setLeaderboard([]);
        setChallengeId(null);
        setLoading(false);
        return;
      }

      // Get challenge ID from first entry
      setChallengeId(data[0].challenge_id);

      // Enrich entries with badges and ranks
      const enrichedData = data.map((entry, index) => {
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
          totalGoals: entry.total_goals || 0,
          goalsWithBaseline: entry.goals_with_baseline || 0,
          trackableGoals: entry.trackable_goals || 0,
          isUser: entry.user_id === user.id
        };

        return enrichLeaderboardEntry(baseEntry, index + 1);
      });

      // Re-sort after badge bonus
      const sortedData = enrichedData.sort((a, b) => b.totalPoints - a.totalPoints);
      
      // Update ranks after re-sorting
      const finalData = sortedData.map((entry, index) => ({
        ...entry,
        rank: index + 1
      }));

      setLeaderboard(finalData);
    } catch (err) {
      console.error('Error fetching leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
      setLeaderboard([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();

    if (autoRefresh) {
      const interval = setInterval(fetchLeaderboard, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [user, limit, autoRefresh, refreshInterval]);

  // Subscribe to real-time updates
  useEffect(() => {
    if (!challengeId || !user) return;

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
          fetchLeaderboard();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [challengeId, user]);

  return {
    leaderboard,
    loading,
    error,
    challengeId,
    refresh: fetchLeaderboard,
    userEntry: leaderboard.find(entry => entry.isUser),
    topThree: leaderboard.slice(0, 3)
  };
}
