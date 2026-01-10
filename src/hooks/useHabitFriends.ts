import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import i18n from '@/i18n';

export interface Friendship {
  id: string;
  user_id: string;
  friend_id: string;
  status: 'pending' | 'accepted' | 'blocked';
  created_at: string;
  friend_profile?: {
    username: string | null;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export function useFriends(userId?: string) {
  return useQuery({
    queryKey: ['friends', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('friendships' as any)
        .select(`
          *,
          friend_profile:profiles(username, full_name, avatar_url)
        `)
        .eq('user_id', userId)
        .eq('status', 'accepted');

      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!userId,
  });
}

export function useFriendRequests(userId?: string) {
  return useQuery({
    queryKey: ['friend-requests', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('friendships' as any)
        .select(`
          *,
          friend_profile:profiles(username, full_name, avatar_url)
        `)
        .eq('friend_id', userId)
        .eq('status', 'pending');

      if (error) throw error;
      return (data as any[]) || [];
    },
    enabled: !!userId,
  });
}

export function useSendFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('friendships' as any)
        .insert({
          user_id: user.id,
          friend_id: friendId,
          status: 'pending',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success(i18n.t('habits:friends.requestSent'));
    },
    onError: (error: any) => {
      toast.error(error.message || i18n.t('habits:friends.requestSentError'));
    },
  });
}

export function useAcceptFriendRequest() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendshipId: string) => {
      const { error } = await supabase
        .from('friendships' as any)
        .update({ status: 'accepted' })
        .eq('id', friendshipId);

      if (error) throw error;

      // Create reverse friendship
      const { data: friendship } = await supabase
        .from('friendships' as any)
        .select('user_id, friend_id')
        .eq('id', friendshipId)
        .single();

      if (friendship) {
        await supabase
          .from('friendships' as any)
          .insert({
            user_id: (friendship as any).friend_id,
            friend_id: (friendship as any).user_id,
            status: 'accepted',
          });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      queryClient.invalidateQueries({ queryKey: ['friend-requests'] });
      toast.success(i18n.t('habits:friends.requestAccepted'));
    },
    onError: (error: any) => {
      toast.error(error.message || i18n.t('habits:friends.requestAcceptError'));
    },
  });
}

export function useRemoveFriend() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (friendId: string) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      // Remove both directions
      await supabase
        .from('friendships' as any)
        .delete()
        .or(`and(user_id.eq.${user.id},friend_id.eq.${friendId}),and(user_id.eq.${friendId},friend_id.eq.${user.id})`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['friends'] });
      toast.success(i18n.t('habits:friends.friendRemoved'));
    },
    onError: (error: any) => {
      toast.error(error.message || i18n.t('habits:friends.friendRemoveError'));
    },
  });
}
