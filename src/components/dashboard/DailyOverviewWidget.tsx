import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pill, Activity, Target, TrendingUp, CheckCircle2, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface DailyStats {
  supplementsTaken: number;
  supplementsScheduled: number;
  metricsLogged: number;
  goalsAchieved: number;
  totalGoals: number;
}

export function DailyOverviewWidget() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DailyStats>({
    supplementsTaken: 0,
    supplementsScheduled: 0,
    metricsLogged: 0,
    goalsAchieved: 0,
    totalGoals: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchDailyStats = async () => {
      try {
        setLoading(true);
        const today = new Date().toISOString().split('T')[0];

        // Fetch supplements taken today
        const { count: supplementsTaken } = await supabase
          .from('intake_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('taken_at', `${today}T00:00:00`)
          .lte('taken_at', `${today}T23:59:59`);

        // Fetch scheduled supplements for today
        const { data: scheduledSupplements } = await supabase
          .from('user_stack')
          .select('id')
          .eq('user_id', user.id)
          .eq('is_active', true);

        // Fetch metrics logged today
        const { count: metricsLogged } = await supabase
          .from('metric_values')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('measurement_date', today);

        // Fetch goals
        const { data: goals } = await supabase
          .from('goals')
          .select('id, target_value, measurements(value)')
          .eq('user_id', user.id);

        const goalsAchieved = goals?.filter(goal => {
          const latestMeasurement = goal.measurements?.[0]?.value;
          return latestMeasurement && latestMeasurement >= (goal.target_value || 0);
        }).length || 0;

        setStats({
          supplementsTaken: supplementsTaken || 0,
          supplementsScheduled: scheduledSupplements?.length || 0,
          metricsLogged: metricsLogged || 0,
          goalsAchieved,
          totalGoals: goals?.length || 0,
        });
      } catch (error) {
        console.error('Error fetching daily stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDailyStats();
  }, [user]);

  const progressPercentage = stats.supplementsScheduled > 0
    ? Math.round((stats.supplementsTaken / stats.supplementsScheduled) * 100)
    : 0;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Обзор дня
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            Обзор дня
          </div>
          <Badge variant={progressPercentage === 100 ? 'default' : 'secondary'}>
            {progressPercentage}%
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Прогресс дня</span>
            <span className="font-medium">
              {stats.supplementsTaken} / {stats.supplementsScheduled}
            </span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Supplements */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 rounded-lg bg-green-500/10 border border-green-500/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <Pill className="h-4 w-4 text-green-500" />
              <span className="text-xs font-medium text-muted-foreground">Добавки</span>
            </div>
            <div className="text-2xl font-bold text-green-500">
              {stats.supplementsTaken}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              из {stats.supplementsScheduled} запланировано
            </div>
          </motion.div>

          {/* Metrics */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30"
          >
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-500" />
              <span className="text-xs font-medium text-muted-foreground">Метрики</span>
            </div>
            <div className="text-2xl font-bold text-blue-500">
              {stats.metricsLogged}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              записано сегодня
            </div>
          </motion.div>

          {/* Goals */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30 col-span-2"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-purple-500" />
                <span className="text-xs font-medium text-muted-foreground">Цели</span>
              </div>
              <CheckCircle2 className="h-5 w-5 text-purple-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <div className="text-2xl font-bold text-purple-500">
                {stats.goalsAchieved}
              </div>
              <div className="text-sm text-muted-foreground">
                / {stats.totalGoals} достигнуто
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        {progressPercentage < 100 && (
          <div className="space-y-2 pt-2 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Быстрые действия:
            </p>
            <div className="flex gap-2">
              {stats.supplementsTaken < stats.supplementsScheduled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/supplements')}
                  className="flex-1 text-xs"
                >
                  <Pill className="h-3 w-3 mr-1" />
                  Принять добавки
                </Button>
              )}
              {stats.metricsLogged === 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/metrics')}
                  className="flex-1 text-xs"
                >
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Записать метрику
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Completion Message */}
        {progressPercentage === 100 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center"
          >
            <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-500">
              Отличная работа! 🎉
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Все добавки приняты сегодня
            </p>
          </motion.div>
        )}
      </CardContent>
    </Card>
  );
}
