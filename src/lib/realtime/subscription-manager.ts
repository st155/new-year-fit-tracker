import { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

/**
 * Centralized Realtime Subscription Manager
 * 
 * Benefits:
 * - Single source of truth for subscriptions
 * - Automatic query invalidation
 * - Prevents duplicate subscriptions
 * - Easy cleanup
 */

type RealtimeEvent = 'INSERT' | 'UPDATE' | 'DELETE' | '*';
type RealtimeTable = 
  | 'client_unified_metrics'
  | 'user_metrics'
  | 'goals'
  | 'challenges'
  | 'challenge_participants'
  | 'ai_pending_actions'
  | 'habits'
  | 'habit_attempts';

interface SubscriptionConfig {
  table: RealtimeTable;
  filter?: Record<string, any>;
  events: RealtimeEvent[];
  onUpdate?: (payload: any) => void;
}

export class SubscriptionManager {
  private channels: Map<string, RealtimeChannel> = new Map();

  constructor(
    private supabase: SupabaseClient,
    private queryClient: QueryClient
  ) {}

  /**
   * Subscribe to table changes
   */
  subscribe(config: SubscriptionConfig): RealtimeChannel {
    const channelId = this.generateChannelId(config.table, config.filter);

    // Reuse existing channel
    if (this.channels.has(channelId)) {
      console.log(`[SubscriptionManager] Reusing channel: ${channelId}`);
      return this.channels.get(channelId)!;
    }

    // Create new channel
    console.log(`[SubscriptionManager] Creating channel: ${channelId}`);
    const channel = this.supabase
      .channel(channelId)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: config.table,
          filter: this.buildFilter(config.filter),
        },
        (payload) => {
          console.log(`[Realtime] ${config.table}:`, payload);
          
          // Call custom handler
          config.onUpdate?.(payload);
          
          // Auto-invalidate related queries
          this.invalidateQueriesForTable(config.table);
        }
      )
      .subscribe((status) => {
        console.log(`[Realtime] Subscription status for ${config.table}:`, status);
      });

    this.channels.set(channelId, channel);
    return channel;
  }

  /**
   * Unsubscribe from channel
   */
  unsubscribe(channel: RealtimeChannel) {
    channel.unsubscribe();
    
    // Remove from map
    for (const [id, ch] of this.channels.entries()) {
      if (ch === channel) {
        this.channels.delete(id);
        console.log(`[SubscriptionManager] Removed channel: ${id}`);
        break;
      }
    }
  }

  /**
   * Auto-invalidate queries based on table
   */
  invalidateQueriesForTable(table: RealtimeTable) {
    console.log(`[SubscriptionManager] Invalidating queries for: ${table}`);
    
    switch (table) {
      case 'user_metrics':
      case 'client_unified_metrics':
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.metrics.all,
        });
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.widgets.all,
        });
        break;
      
      case 'goals':
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.goals.all,
        });
        break;
      
      case 'challenges':
      case 'challenge_participants':
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.challenges.all,
        });
        break;
      
      case 'habits':
      case 'habit_attempts':
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.habits.all,
        });
        break;
      
      case 'ai_pending_actions':
        this.queryClient.invalidateQueries({
          queryKey: queryKeys.trainer.all,
        });
        break;
    }
  }

  /**
   * Generate unique channel ID
   */
  private generateChannelId(table: string, filter?: Record<string, any>): string {
    const filterStr = filter ? JSON.stringify(filter) : 'all';
    return `${table}:${filterStr}`;
  }

  /**
   * Build Supabase filter string
   */
  private buildFilter(filter?: Record<string, any>): string {
    if (!filter) return '';
    
    return Object.entries(filter)
      .map(([key, value]) => `${key}=eq.${value}`)
      .join(',');
  }

  /**
   * Cleanup all subscriptions
   */
  destroy() {
    console.log('[SubscriptionManager] Destroying all channels');
    for (const channel of this.channels.values()) {
      channel.unsubscribe();
    }
    this.channels.clear();
  }

  /**
   * Get active subscriptions count
   */
  getActiveCount(): number {
    return this.channels.size;
  }
}
