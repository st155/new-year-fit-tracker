import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface TeamAchievement {
  id: string;
  type: 'collective_goal' | 'team_streak' | 'member_count' | 'total_xp';
  title: string;
  description: string;
  icon: string;
  achieved_at: string;
  metadata: any;
}

export function useTeamAchievements(teamId?: string) {
  return useQuery({
    queryKey: ['team-achievements', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      // Fetch team stats
      const { data: members } = await supabase
        .from('team_members' as any)
        .select('user_id')
        .eq('team_id', teamId);

      if (!members) return [];

      const achievements: TeamAchievement[] = [];

      // Achievement: First 5 members
      if (members.length >= 5) {
        achievements.push({
          id: 'member_5',
          type: 'member_count',
          title: 'Первые 5 участников',
          description: 'В команде 5 активных участников',
          icon: '👥',
          achieved_at: new Date().toISOString(),
          metadata: { count: members.length },
        });
      }

      // Achievement: First 10 members
      if (members.length >= 10) {
        achievements.push({
          id: 'member_10',
          type: 'member_count',
          title: 'Команда мечты',
          description: 'В команде 10 активных участников',
          icon: '🏆',
          achieved_at: new Date().toISOString(),
          metadata: { count: members.length },
        });
      }

      // Achievement: Collective goal (all members completed habit today)
      const today = new Date().toISOString().split('T')[0];
      const { data: todayCompletions } = await supabase
        .from('habit_completions' as any)
        .select('user_id')
        .in('user_id', members.map((m: any) => m.user_id))
        .gte('completed_at', today);

      const uniqueCompletions = new Set((todayCompletions as any[] || []).map((c: any) => c.user_id));
      
      if (uniqueCompletions.size === members.length && members.length > 0) {
        achievements.push({
          id: 'collective_today',
          type: 'collective_goal',
          title: 'Все вместе!',
          description: 'Все участники команды выполнили привычки сегодня',
          icon: '🎯',
          achieved_at: new Date().toISOString(),
          metadata: { date: today, count: members.length },
        });
      }

      return achievements;
    },
    enabled: !!teamId,
  });
}
