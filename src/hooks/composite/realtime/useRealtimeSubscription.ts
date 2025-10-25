import { useEffect, useRef } from 'react';
import { RealtimeChannel } from '@supabase/supabase-js';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { SubscriptionManager } from '@/lib/realtime/subscription-manager';

/**
 * COMPOSITE: Centralized realtime subscriptions
 * 
 * Replaces:
 * - useRealtime
 * - useGoalsRealtime
 * - useMeasurementsRealtime
 * - useAIActionsRealtime
 * - useChallengeParticipantsRealtime
 * 
 * Usage:
 * ```tsx
 * useRealtimeSubscription({
 *   table: 'user_metrics',
 *   events: ['INSERT', 'UPDATE'],
 *   onUpdate: (payload) => console.log(payload)
 * });
 * ```
 */

type RealtimeTable = 
  | 'client_unified_metrics'
  | 'user_metrics'
  | 'goals'
  | 'challenges'
  | 'challenge_participants'
  | 'ai_pending_actions'
  | 'habits'
  | 'habit_attempts';

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';

interface UseRealtimeOptions {
  table: RealtimeTable;
  filter?: Record<string, any>;
  events?: RealtimeEvent[];
  onUpdate?: (payload: any) => void;
  enabled?: boolean;
}

export function useRealtimeSubscription({
  table,
  filter,
  events = ['INSERT', 'UPDATE', 'DELETE'],
  onUpdate,
  enabled = true,
}: UseRealtimeOptions) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const channelRef = useRef<RealtimeChannel | null>(null);
  const managerRef = useRef<SubscriptionManager | null>(null);

  useEffect(() => {
    if (!enabled || !user) return;

    // Lazy initialize manager
    if (!managerRef.current) {
      managerRef.current = new SubscriptionManager(supabase, queryClient);
    }

    const manager = managerRef.current;

    // Subscribe
    channelRef.current = manager.subscribe({
      table,
      filter: { ...filter, user_id: user.id },
      events,
      onUpdate: (payload) => {
        // Custom handler
        onUpdate?.(payload);
        
        // Auto-invalidation handled by manager
      },
    });

    return () => {
      if (channelRef.current && managerRef.current) {
        managerRef.current.unsubscribe(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [enabled, user, table, JSON.stringify(filter), JSON.stringify(events), onUpdate]);

  return {
    isSubscribed: !!channelRef.current,
  };
}

/**
 * Convenience: Metrics realtime
 */
export function useMetricsRealtime(enabled = true) {
  return useRealtimeSubscription({
    table: 'client_unified_metrics',
    events: ['INSERT', 'UPDATE'],
    enabled,
  });
}

/**
 * Convenience: Goals realtime
 */
export function useGoalsRealtime(enabled = true) {
  return useRealtimeSubscription({
    table: 'goals',
    enabled,
  });
}

/**
 * Convenience: Challenge realtime
 */
export function useChallengeRealtime(challengeId: string, enabled = true) {
  return useRealtimeSubscription({
    table: 'challenge_participants',
    filter: { challenge_id: challengeId },
    enabled,
  });
}

/**
 * Convenience: Habits realtime
 */
export function useHabitsRealtime(enabled = true) {
  return useRealtimeSubscription({
    table: 'habits',
    enabled,
  });
}

/**
 * Convenience: AI actions realtime (for trainers)
 */
export function useAIActionsRealtime(enabled = true) {
  return useRealtimeSubscription({
    table: 'ai_pending_actions',
    events: ['INSERT'],
    enabled,
  });
}
