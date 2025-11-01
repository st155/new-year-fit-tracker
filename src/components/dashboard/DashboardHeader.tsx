import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles } from 'lucide-react';
import { SparklesCore } from '@/components/aceternity';

interface AIInsight {
  emoji: string;
  message: string;
}

export function DashboardHeader() {
  const { user } = useAuth();
  const [insights, setInsights] = useState<AIInsight[]>([]);

  useEffect(() => {
    if (!user) return;
    
    const fetchInsights = async () => {
      try {
        const [goalsData, metricsData] = await Promise.all([
          supabase
            .from('goals')
            .select('*, measurements(created_at)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false }),
          
          supabase
            .from('metric_values')
            .select('*')
            .eq('user_id', user.id)
            .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
            .order('created_at', { ascending: false })
        ]);

        const generatedInsights: AIInsight[] = [];

        // Today's synced metrics
        if (metricsData.data && metricsData.data.length > 0) {
          const todayMetrics = metricsData.data.filter(m => 
            new Date(m.created_at).toDateString() === new Date().toDateString()
          );
          
          if (todayMetrics.length > 0) {
            generatedInsights.push({
              emoji: '🔥',
              message: `Сегодня синхронизировано ${todayMetrics.length} метрик`
            });
          }
        }

        // Stale goals needing attention
        if (goalsData.data) {
          const staleGoals = goalsData.data.filter(goal => {
            const lastMeasurement = goal.measurements?.[0];
            if (!lastMeasurement) return true;
            
            const daysSince = Math.floor(
              (Date.now() - new Date(lastMeasurement.created_at).getTime()) / (1000 * 60 * 60 * 24)
            );
            
            return daysSince > 7;
          });

          if (staleGoals.length > 0) {
            generatedInsights.push({
              emoji: '⚠️',
              message: `${staleGoals.length} ${staleGoals.length === 1 ? 'цель требует' : 'целей требуют'} внимания`
            });
          }
        }

        // Active metrics count
        if (metricsData.data && metricsData.data.length > 0) {
          generatedInsights.push({
            emoji: '📊',
            message: `${metricsData.data.length} записей метрик за последние 24 часа`
          });
        }


        // Weekly achievement
        if (metricsData.data && metricsData.data.length >= 10) {
          generatedInsights.push({
            emoji: '🏆',
            message: `${metricsData.data.length} метрик за сутки - продолжайте!`
          });
        }

        // Default message
        if (generatedInsights.length === 0) {
          generatedInsights.push({
            emoji: '🎯',
            message: 'Начните логировать метрики для получения AI инсайтов'
          });
        }

        setInsights(generatedInsights);
      } catch (error) {
        console.error('Error fetching insights:', error);
      }
    };

    fetchInsights();
  }, [user]);

  return (
    <div className="space-y-3">
      {/* AI Insights Ticker with Sparkles Background */}
      {insights.length > 0 && (
        <div className="relative w-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-border/50 rounded-lg py-2.5 overflow-hidden">
          {/* Sparkles Background */}
          <div className="absolute inset-0 w-full h-full">
            <SparklesCore
              id="dashboardSparkles"
              background="transparent"
              minSize={0.4}
              maxSize={1}
              particleDensity={50}
              className="w-full h-full"
              particleColor="#06b6d4"
              speed={0.5}
            />
          </div>
          
          {/* Content */}
          <div className="relative z-10 flex items-center gap-3">
            <Sparkles className="h-4 w-4 text-primary shrink-0 ml-4 animate-pulse" />
            <div className="flex-1 overflow-hidden">
              <div className="flex gap-8 animate-[marquee_30s_linear_infinite] whitespace-nowrap">
                {[...insights, ...insights].map((insight, i) => (
                  <span key={i} className="text-sm font-medium text-foreground flex items-center gap-2">
                    <span>{insight.emoji}</span>
                    <span>{insight.message}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
