import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus, Target, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface GoalProgress {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  current_value: number;
  progress_percentage: number;
  trend: 'up' | 'down' | 'stable';
  is_personal: boolean;
  challenge_title?: string;
}

interface ProgressOverviewProps {
  className?: string;
}

const ProgressOverview = ({ className }: ProgressOverviewProps) => {
  const { t } = useTranslation('progress');
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<GoalProgress[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadGoalsProgress();
    }
  }, [user]);

  const loadGoalsProgress = async () => {
    try {
      // Загружаем цели пользователя
      const { data: userGoals, error: goalsError } = await supabase
        .from('goals')
        .select(`
          id,
          goal_name,
          goal_type,
          target_value,
          target_unit,
          is_personal,
          challenge_id,
          challenges (title)
        `)
        .eq('user_id', user?.id);

      if (goalsError) throw goalsError;

      // Для каждой цели получаем последние измерения
      const progressData: GoalProgress[] = [];

      for (const goal of userGoals || []) {
        // Ищем метрику, соответствующую цели
        const { data: metrics, error: metricsError } = await supabase
          .from('user_metrics')
          .select('id, metric_name')
          .eq('user_id', user?.id)
          .ilike('metric_name', `%${goal.goal_name}%`)
          .limit(1);

        if (metricsError) continue;

        let currentValue = 0;
        let trend: 'up' | 'down' | 'stable' = 'stable';

        if (metrics && metrics.length > 0) {
          const metricId = metrics[0].id;

          // Получаем последние 2 значения для определения тренда
          const { data: values, error: valuesError } = await supabase
            .from('metric_values')
            .select('value, measurement_date')
            .eq('metric_id', metricId)
            .order('measurement_date', { ascending: false })
            .limit(2);

          if (!valuesError && values && values.length > 0) {
            currentValue = Number(values[0].value);

            if (values.length > 1) {
              const prevValue = Number(values[1].value);
              if (currentValue > prevValue) trend = 'up';
              else if (currentValue < prevValue) trend = 'down';
            }
          }
        }

        const targetValue = Number(goal.target_value) || 100;
        const progressPercentage = Math.min((currentValue / targetValue) * 100, 100);

        progressData.push({
          id: goal.id,
          goal_name: goal.goal_name,
          goal_type: goal.goal_type,
          target_value: targetValue,
          target_unit: goal.target_unit || '',
          current_value: currentValue,
          progress_percentage: progressPercentage,
          trend,
          is_personal: goal.is_personal,
          challenge_title: goal.challenges?.title
        });
      }

      setGoals(progressData);
    } catch (error) {
      console.error('Error loading goals progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          {t('goal.progressOverview')}
        </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
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

  if (goals.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          {t('goal.progressOverview')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-6">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">{t('goal.noActiveGoals')}</p>
          <p className="text-sm text-muted-foreground mt-1">
            {t('goal.createGoalsHint')}
          </p>
        </div>
      </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="h-5 w-5" />
          {t('goal.progressOverview')}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {goals.slice(0, 5).map((goal) => {
            const getClickHandler = () => {
              const nameMap: Record<string, string> = {
                'вес': 'weight',
                'weight': 'weight',
                'жир': 'body_fat',
                'body fat': 'body_fat',
                'процент жира': 'body_fat',
                'vo2': 'vo2max',
                'шаги': 'steps',
                'steps': 'steps'
              };
              
              const goalName = goal.goal_name.toLowerCase();
              for (const [key, route] of Object.entries(nameMap)) {
                if (goalName.includes(key)) {
                  return () => navigate(`/metric/${route}`);
                }
              }
              return undefined;
            };

            return (
              <div 
                key={goal.id} 
                className={`space-y-2 p-3 rounded-lg transition-all duration-300 ${
                  getClickHandler() ? 'cursor-pointer hover:bg-accent/50 hover:shadow-sm' : ''
                }`}
                onClick={getClickHandler()}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{goal.goal_name}</h4>
                    {getTrendIcon(goal.trend)}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={goal.is_personal ? "secondary" : "default"} className="text-xs">
                      {goal.is_personal ? t('goal.personal') : goal.challenge_title}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {goal.current_value.toFixed(1)}/{goal.target_value} {goal.target_unit}
                    </span>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <Progress 
                    value={goal.progress_percentage} 
                    className="h-2"
                    color={getProgressColor(goal.progress_percentage)}
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{t('goal.completed', { percent: goal.progress_percentage.toFixed(1) })}</span>
                    <span className="capitalize">{goal.goal_type}</span>
                  </div>
                </div>
              </div>
            );
          })}
          
          {goals.length > 5 && (
            <div className="pt-2 border-t">
              <p className="text-sm text-muted-foreground text-center">
                {t('goal.otherGoals', { count: goals.length - 5 })}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default ProgressOverview;