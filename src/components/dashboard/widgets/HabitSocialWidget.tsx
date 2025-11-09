import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useHabitFeed } from "@/hooks/useHabitFeed";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Bell, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { useHabitNotificationsRealtime } from "@/hooks/composite/realtime";
import { motion, AnimatePresence } from "framer-motion";

export function HabitSocialWidget() {
  const { user } = useAuth();
  const { data: feedEvents = [], isLoading } = useHabitFeed();
  const navigate = useNavigate();

  // Enable real-time for notifications
  useHabitNotificationsRealtime(!!user?.id);

  // Get unread notifications count
  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['habit-notifications-unread', user?.id],
    queryFn: async () => {
      if (!user?.id) return 0;
      const { count } = await supabase
        .from('habit_notifications' as any)
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      return count || 0;
    },
    enabled: !!user?.id,
    staleTime: 10000, // Real-time updates will refresh this
  });

  if (isLoading) {
    return (
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="space-y-3">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  const recentEvents = feedEvents.slice(0, 3);

  return (
    <Card 
      className="overflow-hidden hover:shadow-lg transition-all hover:scale-[1.02] cursor-pointer border-primary/30"
      onClick={() => navigate('/habits-v3?tab=social')}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Социальная активность</p>
              <p className="text-sm font-semibold">Habits 3.0</p>
            </div>
          </div>
          {unreadCount > 0 && (
            <Badge variant="secondary" className="bg-primary/20 text-primary">
              <Bell className="h-3 w-3 mr-1" />
              {unreadCount}
            </Badge>
          )}
        </div>

        {recentEvents.length === 0 ? (
          <div className="text-center py-4 text-sm text-muted-foreground space-y-2">
            <Sparkles className="h-8 w-8 mx-auto text-primary/50 animate-pulse" />
            <p className="font-medium">Завершайте привычки и вступайте в команды!</p>
            <p className="text-xs">Ваша активность появится здесь 🚀</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence mode="popLayout">
              {recentEvents.map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ 
                    opacity: 1, 
                    x: 0,
                    transition: {
                      delay: index * 0.1,
                      duration: 0.3
                    }
                  }}
                  exit={{ opacity: 0, x: 20 }}
                  layout
                >
                  <div className="flex items-start gap-2 p-2 rounded-lg bg-background/50 hover:bg-background transition-colors">
                <span className="text-base flex-shrink-0">
                  {event.event_type === 'completion' ? '✓' : 
                   event.event_type === 'streak' ? '🔥' : 
                   event.event_type === 'milestone' ? '🏆' : '⭐'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">
                    {event.profiles?.username || 'Пользователь'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.event_type === 'completion' && 'выполнил привычку'}
                    {event.event_type === 'streak' && 'достиг серии'}
                    {event.event_type === 'milestone' && 'достиг цели'}
                    {event.event_type === 'level_up' && 'повысил уровень'}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground flex-shrink-0">
                  {formatDistanceToNow(new Date(event.created_at), { 
                    addSuffix: true,
                    locale: ru 
                  })}
                </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            <p className="text-xs text-muted-foreground text-center pt-2">
              Нажмите для просмотра всех событий
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
