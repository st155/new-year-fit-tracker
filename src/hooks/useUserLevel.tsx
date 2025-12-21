/**
 * User Level Hook
 * Fetches and manages user level and XP data
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getUserLevelInfo, type UserLevel } from '@/lib/gamification/level-system';

export function useUserLevel() {
  const { user } = useAuth();
  const [levelInfo, setLevelInfo] = useState<UserLevel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLevelInfo(null);
      setIsLoading(false);
      return;
    }

    loadUserLevel();

    // Subscribe to XP changes
    const channel = supabase
      .channel('xp-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'xp_history',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadUserLevel();
        }
      )
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [user]);

  const loadUserLevel = async () => {
    if (!user) return;

    try {
      setIsLoading(true);
      setError(null);

      // Get total XP from xp_history
      const { data, error: xpError } = await supabase
        .from('xp_history' as any)
        .select('xp_earned')
        .eq('user_id', user.id);

      if (xpError) throw xpError;

      const totalXP = (data || []).reduce((sum: number, record: any) => sum + (record.xp_earned || 0), 0);
      const info = getUserLevelInfo(totalXP);
      
      setLevelInfo(info);
    } catch (err) {
      console.error('Error loading user level:', err);
      setError(err instanceof Error ? err.message : 'Failed to load level');
      // Set default level on error
      setLevelInfo(getUserLevelInfo(0));
    } finally {
      setIsLoading(false);
    }
  };

  const refetch = () => {
    loadUserLevel();
  };

  return {
    levelInfo,
    isLoading,
    error,
    refetch,
  };
}
