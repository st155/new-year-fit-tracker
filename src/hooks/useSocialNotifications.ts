import { useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { useHabitNotificationsRealtime } from '@/hooks/composite/realtime';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook for showing toast notifications for important social events
 * Shows notifications for:
 * - Friends completing the same habit
 * - New reactions on user's events
 * - Team invitations
 * - Achievement milestones
 */
export function useSocialNotifications(enabled = true) {
  const { user } = useAuth();
  
  // Enable real-time subscription
  useHabitNotificationsRealtime(enabled && !!user?.id);

  useEffect(() => {
    if (!enabled || !user?.id) return;

    console.log('[SocialNotifications] Setting up subscription for user:', user.id);

    const channel = supabase
      .channel(`social_notifications_${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'habit_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('[SocialNotifications] New notification:', payload);
          
          const notification = payload.new as any;
          
          // Show toast based on notification type
          switch (notification.notification_type) {
            case 'friend_completion':
              toast.success('🎉 Друг выполнил привычку!', {
                description: notification.message,
                duration: 4000,
              });
              break;
              
            case 'reaction':
              toast('❤️ Новая реакция!', {
                description: notification.message,
                duration: 3000,
              });
              break;
              
            case 'team_invite':
              toast.success('👥 Приглашение в команду!', {
                description: notification.message,
                duration: 5000,
                action: {
                  label: 'Просмотреть',
                  onClick: () => {
                    // Navigate to teams page
                    window.location.href = '/habits-v3?tab=social';
                  },
                },
              });
              break;
              
            case 'achievement':
              toast.success('🏆 Новое достижение!', {
                description: notification.message,
                duration: 5000,
              });
              break;
              
            case 'milestone':
              toast('⭐ Важная веха!', {
                description: notification.message,
                duration: 4000,
              });
              break;
              
            case 'streak':
              toast.success('🔥 Новая серия!', {
                description: notification.message,
                duration: 4000,
              });
              break;
              
            default:
              toast(notification.message, {
                duration: 3000,
              });
          }
        }
      )
      .subscribe((status) => {
        console.log('[SocialNotifications] Subscription status:', status);
      });

    return () => {
      console.log('[SocialNotifications] Cleaning up subscription');
      supabase.removeChannel(channel);
    };
  }, [enabled, user?.id]);
}
