import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, Target, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';

interface ActivityEvent {
  id: string;
  type: 'habit_completion' | 'goal_created' | 'level_up' | 'streak_milestone';
  title: string;
  description: string;
  timestamp: string;
  icon: React.ReactNode;
  color: string;
}

export function RecentActivity() {
  const { user } = useAuth();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      // Fetch habit completions
      const { data: habits } = await supabase
        .from('habit_completions')
        .select('*, habits(name)')
        .eq('user_id', user.id)
        .order('completed_at', { ascending: false })
        .limit(10);

      const events: ActivityEvent[] = [];

      // Process habit completions
      habits?.forEach(completion => {
        const habitName = (completion as any).habits?.name || 'Привычка';
        events.push({
          id: completion.id,
          type: 'habit_completion',
          title: 'Привычка выполнена',
          description: habitName,
          timestamp: completion.completed_at,
          icon: <CheckCircle2 className="h-4 w-4" />,
          color: 'from-green-500 to-emerald-500',
        });
      });

      // Sort by timestamp
      events.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      return events.slice(0, 5);
    },
    enabled: !!user?.id,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Последняя активность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Последняя активность
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>Пока нет активности</p>
            <p className="text-sm mt-1">Начните выполнять привычки!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Последняя активность
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
          >
            <div className={`p-2 rounded-lg bg-gradient-to-br ${activity.color} text-white shrink-0`}>
              {activity.icon}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">{activity.title}</p>
              <p className="text-sm text-muted-foreground truncate">
                {activity.description}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {format(parseISO(activity.timestamp), 'dd MMM, HH:mm', { locale: ru })}
              </p>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
}
