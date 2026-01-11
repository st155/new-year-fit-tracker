import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Flame, TrendingUp, Calendar, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { calculateStreak, getStreakColor, getStreakEmoji, formatStreakText } from '@/lib/streak-utils';

interface StreakCardProps {
  className?: string;
}

interface GoalStreak {
  goalName: string;
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  streakBroken: boolean;
}

export function StreakCard({ className }: StreakCardProps) {
  const { t } = useTranslation('dashboardPage');
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [goalStreaks, setGoalStreaks] = useState<GoalStreak[]>([]);
  const [overallStreak, setOverallStreak] = useState({
    current: 0,
    longest: 0,
    total: 0
  });

  useEffect(() => {
    if (user) {
      loadStreakData();
    }
  }, [user]);

  const loadStreakData = async () => {
    if (!user) return;

    try {
      setLoading(true);

      // Загружаем цели пользователя
      const { data: goals } = await supabase
        .from('goals')
        .select('id, goal_name')
        .eq('user_id', user.id);

      if (!goals) return;

      const streaksData: GoalStreak[] = [];
      const allActivityDates: string[] = [];

      // Для каждой цели вычисляем streak
      for (const goal of goals) {
        // Получаем измерения для этой цели
        const { data: measurements } = await supabase
          .from('measurements')
          .select('measurement_date')
          .eq('goal_id', goal.id)
          .eq('user_id', user.id)
          .order('measurement_date', { ascending: false });

        if (measurements && measurements.length > 0) {
          const dates = measurements.map(m => m.measurement_date);
          allActivityDates.push(...dates);

          const streakData = calculateStreak(dates);
          
          streaksData.push({
            goalName: goal.goal_name,
            currentStreak: streakData.currentStreak,
            longestStreak: streakData.longestStreak,
            totalDays: streakData.totalDays,
            streakBroken: streakData.streakBroken
          });
        }
      }

      // Также учитываем тренировки
      const { data: workouts } = await supabase
        .from('workouts')
        .select('start_time')
        .eq('user_id', user.id)
        .order('start_time', { ascending: false });

      if (workouts) {
        allActivityDates.push(...workouts.map(w => w.start_time));
      }

      // Вычисляем общий streak (любая активность)
      if (allActivityDates.length > 0) {
        const overallStreakData = calculateStreak(allActivityDates);
        setOverallStreak({
          current: overallStreakData.currentStreak,
          longest: overallStreakData.longestStreak,
          total: overallStreakData.totalDays
        });
      }

      // Сортируем по текущему streak
      streaksData.sort((a, b) => b.currentStreak - a.currentStreak);
      setGoalStreaks(streaksData.slice(0, 5)); // Топ 5 целей

    } catch (error) {
      console.error('Error loading streak data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNextMilestone = (current: number): { target: number; text: string } => {
    if (current < 7) return { target: 7, text: t('streak.milestone', { days: 7 }) };
    if (current < 30) return { target: 30, text: t('streak.milestone', { days: 30 }) };
    if (current < 100) return { target: 100, text: t('streak.milestone', { days: 100 }) };
    return { target: 365, text: t('streak.milestone', { days: 365 }) };
  };

  const nextMilestone = getNextMilestone(overallStreak.current);
  const milestoneProgress = (overallStreak.current / nextMilestone.target) * 100;

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5 text-orange-500" />
            {t('streak.title')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-muted rounded mb-2"></div>
                <div className="h-2 bg-muted rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5 text-orange-500" />
          {t('streak.titleFull')}
        </CardTitle>
        <CardDescription>
          {t('streak.subtitle')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Общая серия */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-orange-500/10 to-red-500/10 border border-orange-500/20">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-3xl">{getStreakEmoji(overallStreak.current)}</span>
              <div>
                <div className="text-2xl font-bold">
                  {overallStreak.current}
                </div>
                <div className="text-xs text-muted-foreground">
                  {t('streak.current')}
                </div>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-1 text-sm">
                <Award className="h-4 w-4 text-yellow-500" />
                <span className="font-semibold">{overallStreak.longest}</span>
              </div>
              <div className="text-xs text-muted-foreground">
                {t('streak.best')}
              </div>
            </div>
          </div>

          {/* Прогресс до следующей вехи */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{t('streak.to')} {nextMilestone.text}</span>
              <span>{nextMilestone.target - overallStreak.current} {t('streak.daysLeft')}</span>
            </div>
            <Progress value={milestoneProgress} className="h-2" />
          </div>
        </div>

        {/* Серии по целям */}
        {goalStreaks.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              {t('streak.topGoals')}
            </h4>
            {goalStreaks.map((streak, index) => (
              <div 
                key={index}
                className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:border-border transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="text-lg">{getStreakEmoji(streak.currentStreak)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">
                      {streak.goalName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {streak.totalDays} {t('streak.totalDays')}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={streak.streakBroken ? "secondary" : "default"}
                    className={streak.streakBroken ? '' : getStreakColor(streak.currentStreak)}
                  >
                    {streak.currentStreak} {getStreakEmoji(streak.currentStreak)}
                  </Badge>
                  {streak.longestStreak > streak.currentStreak && (
                    <span className="text-xs text-muted-foreground">
                      {t('streak.max', { value: streak.longestStreak })}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Если нет активных серий */}
        {goalStreaks.length === 0 && overallStreak.current === 0 && (
          <div className="text-center py-6">
            <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              {t('streak.emptyState')}
            </p>
          </div>
        )}

        {/* Статистика */}
        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          <div className="text-center">
            <div className="text-xl font-bold">{overallStreak.total}</div>
            <div className="text-xs text-muted-foreground">{t('streak.totalLabel')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">{overallStreak.longest}</div>
            <div className="text-xs text-muted-foreground">{t('streak.recordLabel')}</div>
          </div>
          <div className="text-center">
            <div className="text-xl font-bold">
              {overallStreak.total > 0 
                ? Math.round((overallStreak.current / overallStreak.total) * 100) 
                : 0}%
            </div>
            <div className="text-xs text-muted-foreground">{t('streak.activityLabel')}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
