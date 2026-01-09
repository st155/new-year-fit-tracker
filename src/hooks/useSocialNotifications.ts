import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import i18n from '@/i18n';
import { useAuth } from '@/hooks/useAuth';
import { useHabitNotificationsRealtime } from '@/hooks/composite/realtime';
import { supabase } from '@/integrations/supabase/client';
import type { NotificationPreferences } from '@/features/habits/components/settings/NotificationSettings';

const DEFAULT_PREFERENCES: NotificationPreferences = {
  friend_completions: true,
  reactions: true,
  team_invites: true,
  achievements: true,
  reminders: true,
  quiet_mode: false,
};

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
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_PREFERENCES);

  // Load notification preferences
  useEffect(() => {
    if (!user) return;

    const loadPreferences = async () => {
      try {
        const { data } = await supabase
          .from('profiles')
          .select('notification_preferences')
          .eq('id', user.id)
          .single();

        if (data?.notification_preferences) {
          setPreferences({ ...DEFAULT_PREFERENCES, ...(data.notification_preferences as any) });
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      }
    };

    loadPreferences();
  }, [user]);
  
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
          
          // Check quiet mode first
          if (preferences.quiet_mode) {
            console.log('🔕 [SocialNotifications] Quiet mode enabled, skipping toast');
            return;
          }
          
          // Show toast based on notification type
          switch (notification.notification_type) {
            case 'friend_completion':
              if (!preferences.friend_completions) return;
              toast.success(i18n.t('habits:notifications.friendCompletion'), {
                description: notification.message,
                duration: 4000,
              });
              break;
              
            case 'reaction':
              if (!preferences.reactions) return;
              toast(i18n.t('habits:notifications.newReaction'), {
                description: notification.message,
                duration: 3000,
              });
              break;
              
            case 'team_invite':
              if (!preferences.team_invites) return;
              toast.success(i18n.t('habits:notifications.teamInvite'), {
                description: notification.message,
                duration: 5000,
                action: {
                  label: i18n.t('habits:notifications.view'),
                  onClick: () => {
                    // Navigate to teams page
                    window.location.href = '/habits-v3?tab=social';
                  },
                },
              });
              break;
              
            case 'achievement':
              if (!preferences.achievements) return;
              toast.success(i18n.t('habits:notifications.newAchievement'), {
                description: notification.message,
                duration: 5000,
              });
              break;
              
            case 'milestone':
              if (!preferences.achievements) return;
              toast(i18n.t('habits:notifications.milestone'), {
                description: notification.message,
                duration: 4000,
              });
              break;
              
            case 'streak':
              if (!preferences.achievements) return;
              toast.success(i18n.t('habits:notifications.newStreak'), {
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
  }, [enabled, user?.id, preferences]);
}
