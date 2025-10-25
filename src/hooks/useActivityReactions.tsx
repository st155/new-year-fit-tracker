import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type ReactionType = 'thumbs_up' | 'fire' | 'muscle' | 'party' | 'heart';

interface Reaction {
  id: string;
  activity_id: string;
  user_id: string;
  reaction_type: ReactionType;
  created_at: string;
}

interface ReactionCounts {
  [key: string]: number;
}

export function useActivityReactions(activityId: string, userId?: string) {
  const [reactions, setReactions] = useState<Reaction[]>([]);
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({});
  const [userReactions, setUserReactions] = useState<Set<ReactionType>>(new Set());
  const [loading, setLoading] = useState(true);
  const queryClient = useQueryClient();

  const fetchReactions = async () => {
    try {
      const { data, error } = await supabase
        .from('activity_reactions')
        .select('*')
        .eq('activity_id', activityId);

      if (error) throw error;

      const typedReactions = (data || []) as Reaction[];
      setReactions(typedReactions);
      
      // Calculate counts
      const counts: ReactionCounts = {};
      const userReactionSet = new Set<ReactionType>();
      
      typedReactions.forEach((reaction) => {
        counts[reaction.reaction_type] = (counts[reaction.reaction_type] || 0) + 1;
        if (userId && reaction.user_id === userId) {
          userReactionSet.add(reaction.reaction_type);
        }
      });

      setReactionCounts(counts);
      setUserReactions(userReactionSet);
    } catch (error) {
      console.error('Error fetching reactions:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReactions();

    // Subscribe to real-time updates
    const channel = supabase
      .channel(`activity_reactions:${activityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'activity_reactions',
          filter: `activity_id=eq.${activityId}`
        },
        () => {
          fetchReactions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activityId, userId]);

  const toggleReaction = async (reactionType: ReactionType) => {
    if (!userId) {
      toast.error("Please log in to react");
      return;
    }

    const hasReaction = userReactions.has(reactionType);

    // Optimistic update
    const newUserReactions = new Set(userReactions);
    const newCounts = { ...reactionCounts };

    if (hasReaction) {
      newUserReactions.delete(reactionType);
      newCounts[reactionType] = Math.max(0, (newCounts[reactionType] || 1) - 1);
    } else {
      newUserReactions.add(reactionType);
      newCounts[reactionType] = (newCounts[reactionType] || 0) + 1;
    }

    setUserReactions(newUserReactions);
    setReactionCounts(newCounts);

    try {
      if (hasReaction) {
        // Delete reaction
        const { error } = await supabase
          .from('activity_reactions')
          .delete()
          .eq('activity_id', activityId)
          .eq('user_id', userId)
          .eq('reaction_type', reactionType);

        if (error) throw error;
      } else {
        // Add reaction
        const { error } = await supabase
          .from('activity_reactions')
          .insert({
            activity_id: activityId,
            user_id: userId,
            reaction_type: reactionType
          });

        if (error) throw error;
      }

      // Haptic feedback on mobile
      if ('vibrate' in navigator) {
        navigator.vibrate(10);
      }
    } catch (error: any) {
      console.error('Error toggling reaction:', error);
      toast.error("Failed to update reaction");
      // Revert optimistic update
      fetchReactions();
    }
  };

  return {
    reactions,
    reactionCounts,
    userReactions,
    loading,
    toggleReaction
  };
}
