import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

const DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes
const INITIAL_SYNC_COOLDOWN_MS = 4 * 60 * 60 * 1000; // 4 hours

const ECHO11_LAST_SYNC_KEY = 'echo11_last_sync_time';

function getLastEcho11SyncTime(): number | null {
  try {
    const timestamp = localStorage.getItem(ECHO11_LAST_SYNC_KEY);
    return timestamp ? parseInt(timestamp, 10) : null;
  } catch {
    return null;
  }
}

function setLastEcho11SyncTime(time: number = Date.now()): void {
  try {
    localStorage.setItem(ECHO11_LAST_SYNC_KEY, time.toString());
  } catch {
    // Ignore storage errors
  }
}

function shouldSyncOnLoad(): boolean {
  const lastSync = getLastEcho11SyncTime();
  if (!lastSync) return true; // Never synced before
  
  return (Date.now() - lastSync) >= INITIAL_SYNC_COOLDOWN_MS; // Sync if 4+ hours passed
}

export function useAutoEcho11Sync(userId?: string) {
  const lastSyncRef = useRef<number>(0);
  const hasInitialSyncRef = useRef<boolean>(false);

  // Initial sync on app load (morning sync)
  useEffect(() => {
    // Detailed logging for debugging
    console.log('[Echo11] Hook mounted, userId:', userId);
    console.log('[Echo11] hasInitialSync:', hasInitialSyncRef.current);
    console.log('[Echo11] Last sync time:', getLastEcho11SyncTime());
    console.log('[Echo11] Should sync on load:', shouldSyncOnLoad());

    if (!userId) {
      console.log('[Echo11] No userId, skipping initial sync');
      return;
    }

    if (hasInitialSyncRef.current) {
      console.log('[Echo11] Already synced this session, skipping');
      return;
    }

    const triggerInitialSync = async () => {
      if (!shouldSyncOnLoad()) {
        console.log('[Echo11] Skipping initial sync - synced recently (within 4 hours)');
        return;
      }

      console.log('[Echo11] Triggering initial sync on app load...');
      hasInitialSyncRef.current = true;

      try {
        console.log('[Echo11] Calling sync-echo11 edge function...');
        const { data, error } = await supabase.functions.invoke('sync-echo11');
        
        if (error) {
          console.error('[Echo11] Edge function returned error:', error);
          throw error;
        }
        
        setLastEcho11SyncTime();
        lastSyncRef.current = Date.now();
        console.log('[Echo11] Initial sync completed successfully:', data);
      } catch (e) {
        console.error('[Echo11] Initial sync failed:', e);
        // Reset flag so it can retry on next mount
        hasInitialSyncRef.current = false;
      }
    };

    // Delay 3 seconds to not block app loading
    console.log('[Echo11] Scheduling sync in 3 seconds...');
    const timeoutId = setTimeout(triggerInitialSync, 3000);
    return () => clearTimeout(timeoutId);
  }, [userId]);

  // Real-time listener for new data
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
          const { data, error } = await supabase.functions.invoke('sync-echo11');
          
          if (error) {
            throw error;
          }
          
          setLastEcho11SyncTime();
          console.log('[Echo11] Auto-sync completed:', data);
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
