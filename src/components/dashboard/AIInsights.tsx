import { useEffect, useState } from 'react';
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
              title: "🔥 Today's Highlight",
              message: `You've logged ${todayMetrics.length} metrics today! Keep the momentum going.`,
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
              title: "⚠️ Goals Need Attention",
              message: `${staleGoals.length} goal${staleGoals.length > 1 ? 's' : ''} haven't been updated in over a week. Time to log progress!`,
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
              title: "💪 Habit Streak Power",
              message: `You're maintaining ${activeHabits.length} active habits. Consistency is key to success!`,
              priority: 'medium'
            });
          }
        }

        // Achievement - weekly activity
        if (metricsData.data && metricsData.data.length >= 5) {
          generatedInsights.push({
            type: 'achievement',
            title: "🏆 Active Week",
            message: `You've logged ${metricsData.data.length} metrics this week. You're on fire!`,
            priority: 'low'
          });
        }

        // Default insight if nothing found
        if (generatedInsights.length === 0) {
          generatedInsights.push({
            type: 'recommendation',
            title: "🎯 Get Started",
            message: "Start logging your metrics and completing habits to see personalized insights here!",
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
        return <Sparkles className="h-5 w-5 text-yellow-500" />;
      case 'action_required':
        return <AlertCircle className="h-5 w-5 text-orange-500" />;
      case 'recommendation':
        return <TrendingUp className="h-5 w-5 text-blue-500" />;
      case 'achievement':
        return <Trophy className="h-5 w-5 text-green-500" />;
    }
  };

  const getPriorityColor = (priority: AIInsight['priority']) => {
    switch (priority) {
      case 'high':
        return 'border-l-orange-500';
      case 'medium':
        return 'border-l-blue-500';
      case 'low':
        return 'border-l-green-500';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Insights
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
          AI Insights
          <Badge variant="secondary" className="ml-auto">
            Smart Analysis
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
