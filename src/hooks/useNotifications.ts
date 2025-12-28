import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import type { LucideIcon } from 'lucide-react';
import { Trophy, Target, Users, Bell, AlertCircle, MessageCircle } from 'lucide-react';

export type NotificationType = 'habit' | 'goal' | 'challenge' | 'trainer' | 'system' | 'social';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  link?: string;
  icon: LucideIcon;
  metadata?: any;
}

const getIconForType = (type: NotificationType): LucideIcon => {
  switch (type) {
    case 'habit': return Trophy;
    case 'goal': return Target;
    case 'challenge': return Users;
    case 'trainer': return MessageCircle;
    case 'system': return AlertCircle;
    case 'social': return Users;
    default: return Bell;
  }
};

export function useNotifications() {
  const { t } = useTranslation('trainerDashboard');
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    try {
      // Fetch habit notifications
      const { data: habitNotifications } = await supabase
        .from('habit_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Fetch user notifications (for goals, challenges, etc.)
      const { data: userNotifications } = await supabase
        .from('user_notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      // Combine and transform
      const combined: Notification[] = [
        ...(habitNotifications || []).map(n => ({
          id: n.id,
          type: 'habit' as NotificationType,
          title: n.title,
          message: n.message,
          timestamp: n.created_at,
          read: n.is_read,
          link: typeof n.metadata === 'object' && n.metadata !== null ? (n.metadata as any).link : undefined,
          icon: getIconForType('habit'),
          metadata: n.metadata,
        })),
        ...(userNotifications || []).map(n => ({
          id: n.id,
          type: (n.type || 'system') as NotificationType,
          title: n.title,
          message: n.message,
          timestamp: n.created_at,
          read: n.read,
          link: typeof n.metadata === 'object' && n.metadata !== null ? (n.metadata as any).link : undefined,
          icon: getIconForType((n.type || 'system') as NotificationType),
          metadata: n.metadata,
        })),
      ];

      // Sort by timestamp
      combined.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setNotifications(combined);
      setUnreadCount(combined.filter(n => !n.read).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    if (!notification || notification.read) return;

    try {
      // Update in database based on type
      if (notification.type === 'habit') {
        await supabase
          .from('habit_notifications')
          .update({ is_read: true })
          .eq('id', notificationId);
      } else {
        await supabase
          .from('user_notifications')
          .update({ read: true })
          .eq('id', notificationId);
      }

      // Update local state
      setNotifications(prev =>
        prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    if (!user?.id || unreadCount === 0) return;

    try {
      const unreadNotifications = notifications.filter(n => !n.read);
      
      // Update habit notifications
      const habitIds = unreadNotifications
        .filter(n => n.type === 'habit')
        .map(n => n.id);
      if (habitIds.length > 0) {
        await supabase
          .from('habit_notifications')
          .update({ is_read: true })
          .in('id', habitIds);
      }

      // Update user notifications
      const userIds = unreadNotifications
        .filter(n => n.type !== 'habit')
        .map(n => n.id);
      if (userIds.length > 0) {
        await supabase
          .from('user_notifications')
          .update({ read: true })
          .in('id', userIds);
      }

      // Update local state
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
      setUnreadCount(0);
      
      toast.success(t('notifications.allMarkedRead'));
    } catch (error) {
      console.error('Error marking all as read:', error);
      toast.error(t('notifications.updateError'));
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user?.id) return;

    fetchNotifications();

    // Subscribe to habit notifications
    const habitChannel = supabase
      .channel('habit-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'habit_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification: Notification = {
            id: payload.new.id,
            type: 'habit',
            title: payload.new.title,
            message: payload.new.message,
            timestamp: payload.new.created_at,
            read: false,
            icon: getIconForType('habit'),
            metadata: payload.new.metadata,
          };

          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          toast.success(newNotification.title, {
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    // Subscribe to user notifications
    const userChannel = supabase
      .channel('user-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification: Notification = {
            id: payload.new.id,
            type: (payload.new.type || 'system') as NotificationType,
            title: payload.new.title,
            message: payload.new.message,
            timestamp: payload.new.created_at,
            read: false,
            link: typeof payload.new.metadata === 'object' && payload.new.metadata !== null 
              ? (payload.new.metadata as any).link 
              : undefined,
            icon: getIconForType((payload.new.type || 'system') as NotificationType),
            metadata: payload.new.metadata,
          };

          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          toast.success(newNotification.title, {
            description: newNotification.message,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(habitChannel);
      supabase.removeChannel(userChannel);
    };
  }, [user?.id]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    refetch: fetchNotifications,
  };
}
