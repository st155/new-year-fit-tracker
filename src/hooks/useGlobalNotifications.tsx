import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';

export interface GlobalNotification {
  id: string;
  type: 'goal' | 'habit' | 'metric' | 'insight' | 'conflict';
  icon: string;
  message: string;
  href: string;
  priority: number;
}

export function useGlobalNotifications() {
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      return;
    }

    const fetchNotifications = async () => {
      setIsLoading(true);
      const newNotifications: GlobalNotification[] = [];

      try {
        // Import dynamically to avoid TypeScript issues
        const { supabase } = await import('@/integrations/supabase/client');

        // @ts-ignore - Suppress deep instantiation error
        const goalsResult = await supabase
          .from('goals')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('requires_attention', true);

        const goalsCount = goalsResult?.count || 0;
        if (goalsCount > 0) {
          newNotifications.push({
            id: 'goals-attention',
            type: 'goal',
            icon: '🎯',
            message: t('globalNotifications.goalsAttention', { count: goalsCount }),
            href: '/goals?filter=attention',
            priority: 1,
          });
        }

        // @ts-ignore - Suppress deep instantiation error
        const conflictsResult = await supabase
          .from('unified_metrics')
          .select('metric_name')
          .eq('user_id', user.id)
          .eq('has_conflicts', true);

        const conflictsData = conflictsResult?.data || [];
        if (conflictsData.length > 0) {
          const uniqueMetrics = new Set(conflictsData.map((d: any) => d.metric_name));
          const conflicts = uniqueMetrics.size;
          newNotifications.push({
            id: 'data-conflicts',
            type: 'conflict',
            icon: '⚠️',
            message: t('globalNotifications.metricsConflicts', { count: conflicts }),
            href: '/?tab=quality',
            priority: 2,
          });
        }

        // @ts-ignore - Suppress deep instantiation error
        const challengesResult = await supabase
          .from('challenge_participants')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('status', 'active');

        const challengesCount = challengesResult?.count || 0;
        if (challengesCount > 0) {
          newNotifications.push({
            id: 'active-challenges',
            type: 'habit',
            icon: '🏆',
            message: t('globalNotifications.activeChallenges', { count: challengesCount }),
            href: '/progress',
            priority: 4,
          });
        }

        setNotifications(newNotifications);
      } catch (error) {
        console.error('[useGlobalNotifications] Error:', error);
        setNotifications([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchNotifications();

    // Refresh every 2 minutes
    const interval = setInterval(fetchNotifications, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [user?.id]);

  return { notifications, isLoading };
}
