import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, CheckCircle2, Dumbbell, Trophy, Heart, Flame } from 'lucide-react';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { motion } from 'framer-motion';
import { Skeleton } from '@/components/ui/skeleton';
import { useTranslation } from 'react-i18next';
import type { ActivityItem } from '@/hooks/profile/useProfileSummary';

interface RecentActivityProps {
  activities: ActivityItem[];
  isLoading?: boolean;
}

const getActivityConfig = (t: (key: string) => string): Record<string, { icon: React.ReactNode; color: string; label: string }> => ({
  'habit_completion': {
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: 'from-green-500 to-emerald-500',
    label: t('recentActivity.types.habit_completion')
  },
  'workout': {
    icon: <Dumbbell className="h-4 w-4" />,
    color: 'from-blue-500 to-cyan-500',
    label: t('recentActivity.types.workout')
  },
  'milestone': {
    icon: <Trophy className="h-4 w-4" />,
    color: 'from-yellow-500 to-orange-500',
    label: t('recentActivity.types.milestone')
  },
  'health_metric': {
    icon: <Heart className="h-4 w-4" />,
    color: 'from-red-500 to-pink-500',
    label: t('recentActivity.types.health_metric')
  }
});

export function RecentActivity({ activities, isLoading }: RecentActivityProps) {
  const { t, i18n } = useTranslation('profile');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;
  const activityConfig = getActivityConfig(t);

  const formatActivityDate = (dateStr: string): string => {
    const date = parseISO(dateStr);
    const time = format(date, 'HH:mm');
    if (isToday(date)) return t('recentActivity.today', { time });
    if (isYesterday(date)) return t('recentActivity.yesterday', { time });
    return format(date, 'd MMM, HH:mm', { locale: dateLocale });
  };

  const getActivityTitle = (activity: ActivityItem): string => {
    if (activity.title) {
      const cleaned = activity.title
        .replace(/^Выполнена привычка:?\s*/i, '')
        .replace(/^Completed habit:?\s*/i, '')
        .replace(/^Тренировка:?\s*/i, '')
        .replace(/^Workout:?\s*/i, '');
      return cleaned || activity.title;
    }
    return activityConfig[activity.type]?.label || t('recentActivity.activity');
  };

  const getActivityDescription = (activity: ActivityItem): string | null => {
    const meta = activity.metadata;
    if (!meta) return null;
    
    const parts: string[] = [];
    
    if (meta.duration_minutes) {
      parts.push(t('recentActivity.units.min', { value: Math.round(meta.duration_minutes) }));
    }
    if (meta.calories) {
      parts.push(`${Math.round(meta.calories)} kcal`);
    }
    if (meta.distance_km) {
      parts.push(`${meta.distance_km.toFixed(1)} ${i18n.language === 'ru' ? 'км' : 'km'}`);
    }
    if (meta.streak) {
      parts.push(t('recentActivity.units.streak', { days: meta.streak }));
    }
    
    return parts.length > 0 ? parts.join(' · ') : null;
  };

  if (isLoading) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            {t('recentActivity.title')}
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

  if (!activities || activities.length === 0) {
    return (
      <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            {t('recentActivity.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Activity className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">{t('recentActivity.noActivity')}</p>
            <p className="text-xs mt-1">{t('recentActivity.startTip')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="h-5 w-5 text-primary" />
            {t('recentActivity.title')}
          </CardTitle>
          <Badge variant="outline" className="text-xs">
            {t('recentActivity.events', { count: activities.length })}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.slice(0, 6).map((activity, index) => {
          const config = activityConfig[activity.type] || activityConfig['health_metric'];
          const title = getActivityTitle(activity);
          const description = getActivityDescription(activity);

          return (
            <motion.div
              key={activity.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
              className="flex items-start gap-3 p-2.5 rounded-lg bg-background/50 hover:bg-background/80 transition-colors"
            >
              <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color} text-white shrink-0`}>
                {config.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{title}</p>
                {description && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {description}
                  </p>
                )}
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatActivityDate(activity.timestamp)}
                </p>
              </div>
              {activity.source && activity.source !== 'habits' && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0 bg-background/50">
                  {activity.source}
                </Badge>
              )}
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}
