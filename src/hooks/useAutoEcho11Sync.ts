import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { syncTodayToEcho11 } from '@/utils/elite10Connector';

const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

export function useAutoEcho11Sync(userId?: string) {
  const lastSyncRef = useRef<number>(0);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('echo11-auto-sync')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'unified_metrics',
        filter: `user_id=eq.${userId}`,
      }, async () => {
        const now = Date.now();
        
        // Debounce: no more than once per 5 minutes
        if (now - lastSyncRef.current < DEBOUNCE_MS) {
          console.log('[Echo11] Skipping sync - debounced');
          return;
        }
        
        lastSyncRef.current = now;
        console.log('[Echo11] Auto-sync triggered by unified_metrics change');

        try {
          await syncTodayToEcho11({
            sleep_quality: null,
            recovery_score: null,
            workout_type: null,
            workout_intensity: null,
            nutrition_status: null,
          });
          console.log('[Echo11] Auto-sync completed');
        } catch (e) {
          console.warn('[Echo11] Auto-sync failed:', e);
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);
}
