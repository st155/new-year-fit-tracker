import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export interface LifecycleAlert {
  id: string;
  user_id: string;
  protocol_id: string;
  alert_type: 'retest_prompt' | 'protocol_completed';
  message: string;
  is_read: boolean;
  dismissed_at: string | null;
  created_at: string;
  protocol?: {
    stack_name: string;
    supplement_products?: {
      name: string;
      brand?: string;
    } | null;
  };
}

export const useLifecycleAlerts = (userId: string | undefined) => {
  const { t } = useTranslation('biostack');
  const queryClient = useQueryClient();

  // Fetch unread, non-dismissed alerts
  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ['lifecycle-alerts', userId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from('protocol_lifecycle_alerts')
        .select(`
          *,
          protocol:user_stack!protocol_id (
            stack_name,
            supplement_products (
              name,
              brand
            )
          )
        `)
        .eq('user_id', userId)
        .eq('is_read', false)
        .is('dismissed_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching lifecycle alerts:', error);
        throw error;
      }

      return (data || []).map(alert => ({
        ...alert,
        protocol: Array.isArray(alert.protocol) ? alert.protocol[0] : alert.protocol
      })) as LifecycleAlert[];
    },
    enabled: !!userId,
  });

  // Mark alert as read
  const markAsReadMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('protocol_lifecycle_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-alerts', userId] });
    },
    onError: (error) => {
      console.error('❌ Error marking alert as read:', error);
      toast.error(t('toast.failedUpdateAlert'));
    },
  });

  // Dismiss alert
  const dismissAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      const { error } = await supabase
        .from('protocol_lifecycle_alerts')
        .update({ 
          is_read: true,
          dismissed_at: new Date().toISOString() 
        })
        .eq('id', alertId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lifecycle-alerts', userId] });
      toast.success(t('toast.alertDismissed'));
    },
    onError: (error) => {
      console.error('❌ Error dismissing alert:', error);
      toast.error(t('toast.failedDismissAlert'));
    },
  });

  // Real-time subscription for new alerts
  useEffect(() => {
    if (!userId) return;

    console.log('🔔 Setting up real-time subscription for lifecycle alerts');

    const channel = supabase
      .channel('protocol_alerts')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'protocol_lifecycle_alerts',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('🔔 New lifecycle alert received:', payload);
          queryClient.invalidateQueries({ queryKey: ['lifecycle-alerts', userId] });
          toast.info(t('toast.newAlertReceived'));
        }
      )
      .subscribe();

    return () => {
      console.log('🔕 Cleaning up lifecycle alerts subscription');
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);

  return {
    alerts,
    isLoading,
    markAsRead: markAsReadMutation.mutate,
    dismissAlert: dismissAlertMutation.mutate,
    unreadCount: alerts.length,
  };
};
