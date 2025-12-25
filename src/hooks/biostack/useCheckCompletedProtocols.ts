import { useEffect } from 'react';
import { healthApi } from '@/lib/api';
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
        const { data, error } = await healthApi.checkCompletedProtocols();
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
