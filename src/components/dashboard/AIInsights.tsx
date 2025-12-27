import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sparkles, TrendingUp, AlertCircle, Trophy, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';

interface AIInsight {
  type: 'highlight' | 'action_required' | 'recommendation' | 'achievement';
  title: string;
  message: string;
  priority: 'high' | 'medium' | 'low';
}

export const AIInsights = () => {
  const { user } = useAuth();
  const { t } = useTranslation('dashboard');
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    
    const fetchInsights = async () => {
      try {
        setLoading(true);
        
        // Fetch recent data for analysis
        const [goalsData, metricsData, habitsData] = await Promise.all([
          supabase
            .from('goals')
            .select('*, measurements(*, created_at)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          
          supabase
            .from('metric_values')
            .select('*')
            .eq('user_id', user.id)
            .gte('measurement_date', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
            .order('measurement_date', { ascending: false }),
          
          supabase
            .from('habits')
            .select('*, habit_completions(*)')
            .eq('user_id', user.id)
        ]);

        const generatedInsights: AIInsight[] = [];

        // Today's Highlight - найти лучшее достижение дня
        if (metricsData.data && metricsData.data.length > 0) {
          const todayMetrics = metricsData.data.filter(m => 
            new Date(m.measurement_date).toDateString() === new Date().toDateString()
          );
          
          if (todayMetrics.length > 0) {
            generatedInsights.push({
              type: 'highlight',
              title: t('insights.todayHighlight'),
              message: t('insights.metricsToday', { count: todayMetrics.length }),
              priority: 'high'
            });
          }
        }

        // Action Required - цели без измерений > 7 дней
        if (goalsData.data) {
          const staleGoals = goalsData.data.filter(goal => {
            const lastMeasurement = goal.measurements?.[0];
            if (!lastMeasurement) return true;
            
            const daysSinceLastMeasurement = Math.floor(
              (Date.now() - new Date(lastMeasurement.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            
            return daysSinceLastMeasurement > 7;
          });

          if (staleGoals.length > 0) {
            generatedInsights.push({
              type: 'action_required',
              title: t('insights.goalsAttention'),
              message: t('insights.goalsStale', { count: staleGoals.length }),
              priority: 'high'
            });
          }
        }

        // Recommendation - habit streak
        if (habitsData.data && habitsData.data.length > 0) {
          const activeHabits = habitsData.data.filter(h => 
            h.habit_completions && h.habit_completions.length > 0
          );
          
          if (activeHabits.length > 0) {
            generatedInsights.push({
              type: 'recommendation',
              title: t('insights.habitStreak'),
              message: t('insights.habitActive', { count: activeHabits.length }),
              priority: 'medium'
            });
          }
        }

        // Achievement - weekly activity
        if (metricsData.data && metricsData.data.length >= 5) {
          generatedInsights.push({
            type: 'achievement',
            title: t('insights.activeWeek'),
            message: t('insights.weeklyMetrics', { count: metricsData.data.length }),
            priority: 'low'
          });
        }

        // Default insight if nothing found
        if (generatedInsights.length === 0) {
          generatedInsights.push({
            type: 'recommendation',
            title: t('insights.getStarted'),
            message: t('insights.getStartedDesc'),
            priority: 'medium'
          });
        }

        setInsights(generatedInsights);
      } catch (error) {
        console.error('Error fetching insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchInsights();
  }, [user]);

  const getIcon = (type: AIInsight['type']) => {
    switch (type) {
      case 'highlight':
        return <Sparkles className="h-5 w-5 text-primary" />;
      case 'action_required':
        return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'recommendation':
        return <TrendingUp className="h-5 w-5 text-accent" />;
      case 'achievement':
        return <Trophy className="h-5 w-5 text-success" />;
    }
  };

  const getPriorityColor = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-destructive';
      case 'medium':
        return 'border-l-accent';
      case 'low':
        return 'border-l-success';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            {t('insights.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          {t('insights.title')}
          <Badge variant="secondary" className="ml-auto">
            {t('insights.badge')}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`p-4 rounded-lg border-l-4 bg-muted/30 ${getPriorityColor(insight.priority)}`}
          >
            <div className="flex items-start gap-3">
              {getIcon(insight.type)}
              <div className="flex-1">
                <h4 className="font-semibold text-sm mb-1">{insight.title}</h4>
                <p className="text-sm text-muted-foreground">{insight.message}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </CardContent>
    </Card>
  );
};
