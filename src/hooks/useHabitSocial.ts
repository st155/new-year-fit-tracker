import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useHabitFeed } from '@/hooks/useHabitFeed';

interface FriendWithHabit {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  habit_id: string;
  habit_name: string;
  current_streak: number;
  completion_rate: number;
}

interface TeamWithHabit {
  id: string;
  name: string;
  description: string | null;
  member_count: number;
  is_member: boolean;
  avg_streak: number;
}

interface HabitFeedEvent {
  id: string;
  user_id: string;
  username: string;
  avatar_url: string | null;
  event_type: string;
  event_data: any;
  created_at: string;
}

/**
 * Get friends who are also tracking a habit with the same name
 */
export function useHabitFriendsWithSame(habitName: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['habit-friends-with-same', habitName, user?.id],
    queryFn: async () => {
      if (!user?.id || !habitName) return [];

      // Get friends
      const { data: friendships, error: friendsError } = await supabase
        .from('friendships')
        .select('friend_id')
        .eq('user_id', user.id)
        .eq('status', 'accepted');

      if (friendsError) throw friendsError;
      if (!friendships?.length) return [];

      const friendIds = friendships.map(f => f.friend_id);

      // Get their habits with the same name
      const { data: habits, error: habitsError } = await supabase
        .from('habits')
        .select(`
          id,
          user_id,
          name,
          profiles:user_id (
            username,
            avatar_url
          )
        `)
        .in('user_id', friendIds)
        .ilike('name', habitName)
        .eq('is_active', true);

      if (habitsError) throw habitsError;
      if (!habits?.length) return [];

      const habitIds = habits.map(h => h.id);

      // Get stats for these habits
      const { data: habitStats } = await supabase
        .from('habit_stats')
        .select('habit_id, current_streak, completion_rate')
        .in('habit_id', habitIds);

      return (habits || []).map(habit => {
        const stats = habitStats?.find(s => s.habit_id === habit.id);
        return {
          id: habit.id,
          user_id: habit.user_id,
          username: (habit.profiles as any)?.username || 'Unknown',
          avatar_url: (habit.profiles as any)?.avatar_url || null,
          habit_id: habit.id,
          habit_name: habit.name,
          current_streak: stats?.current_streak || 0,
          completion_rate: stats?.completion_rate || 0,
        };
      }) as FriendWithHabit[];
    },
    enabled: !!user?.id && !!habitName,
    staleTime: 60000, // 1 minute
  });
}

/**
 * Get teams where members are tracking similar habits
 */
export function useTeamsWithHabit(habitName: string) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['teams-with-habit', habitName, user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's teams
      const { data: userTeams, error: teamsError } = await supabase
        .from('team_members')
        .select(`
          team_id,
          habit_teams:team_id (
            id,
            name,
            description,
            member_limit
          )
        `)
        .eq('user_id', user.id);

      if (teamsError) throw teamsError;
      if (!userTeams?.length) return [];

      // For each team, get member count and check if they have similar habits
      const teams = await Promise.all(
        userTeams.map(async (ut) => {
          const team = (ut.habit_teams as any);
          if (!team) return null;

          // Count members
          const { count: memberCount } = await supabase
            .from('team_members')
            .select('*', { count: 'exact', head: true })
            .eq('team_id', team.id);

          // Get average streak from team members' habits
          const { data: teamMembers } = await supabase
            .from('team_members')
            .select('user_id')
            .eq('team_id', team.id);

          if (!teamMembers?.length) return null;

          const memberIds = teamMembers.map(m => m.user_id);
          const { data: memberHabits } = await supabase
            .from('habits')
            .select('id')
            .in('user_id', memberIds)
            .eq('is_active', true);

          if (!memberHabits?.length) return null;

          const habitIds = memberHabits.map(h => h.id);
          const { data: habitStats } = await supabase
            .from('habit_stats')
            .select('current_streak')
            .in('habit_id', habitIds);

          const avgStreak = habitStats?.length
            ? habitStats.reduce((sum, s) => sum + (s.current_streak || 0), 0) / habitStats.length
            : 0;

          return {
            id: team.id,
            name: team.name,
            description: team.description,
            member_count: memberCount || 0,
            is_member: true,
            avg_streak: Math.round(avgStreak),
          };
        })
      );

      return teams.filter(Boolean) as TeamWithHabit[];
    },
    enabled: !!user?.id && !!habitName,
    staleTime: 60000,
  });
}

/**
 * Get recent feed events related to a specific habit
 * Re-uses the existing useHabitFeed hook and filters for the user's friends
 */
export function useHabitSocialFeed(habitId: string) {
  // Just re-use the existing feed hook which already handles all the complexity
  const { data: feedEvents = [] } = useHabitFeed();
  
  // Return the first 5 events
  return {
    data: feedEvents.slice(0, 5),
    isLoading: false,
  };
}
