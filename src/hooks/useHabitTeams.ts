import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import i18n from '@/i18n';

export interface HabitTeam {
  id: string;
  name: string;
  description: string | null;
  creator_id: string;
  is_public: boolean;
  member_limit: number;
  created_at: string;
  member_count?: number;
  is_member?: boolean;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  joined_at: string;
  profiles?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useHabitTeams(userId?: string) {
  return useQuery({
    queryKey: ['habit-teams', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('habit_teams')
        .select(`
          *,
          team_members!inner(user_id)
        `)
        .eq('team_members.user_id', userId);

      if (error) throw error;
      return data as HabitTeam[];
    },
    enabled: !!userId,
  });
}

export function usePublicTeams() {
  return useQuery({
    queryKey: ['public-habit-teams'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('habit_teams')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as HabitTeam[];
    },
  });
}

export function useTeamMembers(teamId?: string) {
  return useQuery({
    queryKey: ['team-members', teamId],
    queryFn: async () => {
      if (!teamId) return [];

      const { data, error } = await supabase
        .from('team_members')
        .select(`
          *,
          profiles!team_members_user_id_fkey(username, full_name, avatar_url)
        `)
        .eq('team_id', teamId);

      if (error) throw error;
      return data as any as TeamMember[];
    },
    enabled: !!teamId,
  });
}

export function useCreateTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamData: {
      name: string;
      description?: string;
      is_public: boolean;
      member_limit?: number;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase
        .from('habit_teams')
        .insert({
          ...teamData,
          creator_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add creator as owner
      const { error: memberError } = await supabase
        .from('team_members')
        .insert({
          team_id: data.id,
          user_id: user.id,
          role: 'owner',
        });

      if (memberError) throw memberError;

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-teams'] });
      toast.success(i18n.t('habitTeams:toast.teamCreated'));
    },
    onError: (error) => {
      console.error('Error creating team:', error);
      toast.error(i18n.t('habitTeams:toast.createFailed'));
    },
  });
}

export function useJoinTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('team_members')
        .insert({
          team_id: teamId,
          user_id: user.id,
          role: 'member',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-teams'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success(i18n.t('habitTeams:toast.joinedTeam'));
    },
    onError: (error) => {
      console.error('Error joining team:', error);
      toast.error(i18n.t('habitTeams:toast.joinFailed'));
    },
  });
}

export function useLeaveTeam() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (teamId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('team_members')
        .delete()
        .eq('team_id', teamId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-teams'] });
      queryClient.invalidateQueries({ queryKey: ['team-members'] });
      toast.success(i18n.t('habitTeams:toast.leftTeam'));
    },
    onError: (error) => {
      console.error('Error leaving team:', error);
      toast.error(i18n.t('habitTeams:toast.leaveFailed'));
    },
  });
}
