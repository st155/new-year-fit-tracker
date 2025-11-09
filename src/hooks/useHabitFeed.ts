import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface HabitFeedEvent {
  id: string;
  user_id: string;
  habit_id: string | null;
  team_id: string | null;
  event_type: string;
  event_data: any;
  visibility: string;
  created_at: string;
  profiles?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
  feed_reactions?: FeedReaction[];
  reaction_counts?: Record<string, number>;
  user_reaction?: string | null;
}

export interface FeedReaction {
  id: string;
  event_id: string;
  user_id: string;
  reaction_type: string;
  created_at: string;
}

export function useHabitFeed(teamId?: string) {
  return useQuery({
    queryKey: ['habit-feed', teamId],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      let query = supabase
        .from('habit_feed_events' as any)
        .select(`
          *,
          profiles!habit_feed_events_user_id_fkey(username, full_name, avatar_url),
          feed_reactions(id, user_id, reaction_type)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (teamId) {
        query = query.eq('team_id', teamId);
      } else {
        // Show public events and user's own events
        query = query.or(`visibility.eq.public,user_id.eq.${user.id}`);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Process reactions
      return (data as any[]).map(event => {
        const reactions = event.feed_reactions || [];
        const reactionCounts: Record<string, number> = {};
        
        reactions.forEach((r: FeedReaction) => {
          reactionCounts[r.reaction_type] = (reactionCounts[r.reaction_type] || 0) + 1;
        });

        const userReaction = reactions.find((r: FeedReaction) => r.user_id === user.id)?.reaction_type;

        return {
          ...event,
          reactions,
          reaction_counts: reactionCounts,
          user_reaction: userReaction,
        };
      }) as HabitFeedEvent[];
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useAddReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ eventId, reactionType }: { eventId: string; reactionType: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feed_reactions' as any)
        .insert({
          event_id: eventId,
          user_id: user.id,
          reaction_type: reactionType,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-feed'] });
    },
  });
}

export function useRemoveReaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('feed_reactions' as any)
        .delete()
        .eq('event_id', eventId)
        .eq('user_id', user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-feed'] });
    },
  });
}

export function useHabitNotifications(userId?: string) {
  return useQuery({
    queryKey: ['habit-notifications', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('habit_notifications' as any)
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('habit_notifications' as any)
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['habit-notifications'] });
    },
  });
}
