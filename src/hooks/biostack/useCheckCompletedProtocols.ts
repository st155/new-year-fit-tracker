import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Hook to automatically check for completed protocols on mount
 * Invokes check-completed-protocols edge function to create lifecycle alerts
 */
export function useCheckCompletedProtocols() {
  const { user } = useAuth();
  
  useEffect(() => {
    if (!user?.id) return;
    
    // Run once on mount (page load)
    const checkProtocols = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('check-completed-protocols');
        if (error) {
          console.error('[LIFECYCLE] Error checking protocols:', error);
        } else {
          console.log('[LIFECYCLE] Checked protocols:', data);
        }
      } catch (e) {
        console.error('[LIFECYCLE] Failed to check protocols:', e);
      }
    };
    
    checkProtocols();
  }, [user?.id]);
}
