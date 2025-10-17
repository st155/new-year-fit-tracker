import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

interface UseRealtimeOptions {
  table: string;
  event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
  filter?: string;
  onInsert?: (payload: any) => void;
  onUpdate?: (payload: any) => void;
  onDelete?: (payload: any) => void;
  onChange?: (payload: any) => void;
}

export const useRealtime = ({
  table,
  event = '*',
  filter,
  onInsert,
  onUpdate,
  onDelete,
  onChange
}: UseRealtimeOptions) => {
  useEffect(() => {
    let channel: RealtimeChannel;

    const setupSubscription = () => {
      const channelName = `${table}_changes_${Date.now()}`;
      
      channel = supabase.channel(channelName);

      const subscriptionConfig: any = {
        event,
        schema: 'public',
        table
      };

      if (filter) {
        subscriptionConfig.filter = filter;
      }

      channel
        .on('postgres_changes', subscriptionConfig, (payload) => {
          console.log(`[Realtime] ${table} change:`, payload);

          // Call specific handlers
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new);
          } else if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new);
          } else if (payload.eventType === 'DELETE' && onDelete) {
            onDelete(payload.old);
          }

          // Call general change handler
          if (onChange) {
            onChange(payload);
          }
        })
        .subscribe((status) => {
          console.log(`[Realtime] Subscription status for ${table}:`, status);
        });
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [table, event, filter]);
};

// Specific hooks for common use cases
export const useGoalsRealtime = (userId: string, onUpdate: () => void) => {
  useRealtime({
    table: 'goals',
    filter: `user_id=eq.${userId}`,
    onChange: onUpdate
  });
};

export const useMeasurementsRealtime = (userId: string, onUpdate: () => void) => {
  useRealtime({
    table: 'measurements',
    filter: `user_id=eq.${userId}`,
    onChange: onUpdate
  });
};

export const useAIActionsRealtime = (trainerId: string, onNewAction: (action: any) => void) => {
  useRealtime({
    table: 'ai_pending_actions',
    event: 'INSERT',
    filter: `trainer_id=eq.${trainerId}`,
    onInsert: onNewAction
  });
};

export const useChallengeParticipantsRealtime = (challengeId: string, onUpdate: () => void) => {
  useRealtime({
    table: 'challenge_participants',
    filter: `challenge_id=eq.${challengeId}`,
    onChange: onUpdate
  });
};
