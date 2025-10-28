import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useDataQuality } from '@/hooks/useDataQuality';
import { useConfidenceRecalculation } from '@/hooks/useConfidenceRecalculation';
import { supabase } from '@/integrations/supabase/client';
import { Sparkles, RefreshCw } from 'lucide-react';
import { CompactQualityBadges } from './CompactQualityBadges';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface AIInsight {
  emoji: string;
  message: string;
}

export function DashboardHeader() {
  const { user } = useAuth();
  const { 
    averageConfidence, 
    metricsByQuality, 
    isLoading: qualityLoading 
  } = useDataQuality();
  const { recalculate, isRecalculating } = useConfidenceRecalculation();
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

        // Data quality insight
        if (!qualityLoading && averageConfidence > 0) {
          const qualityEmoji = averageConfidence >= 80 ? '🎯' : averageConfidence >= 60 ? '💪' : '📈';
          const qualityText = averageConfidence >= 80 ? 'отличное' : averageConfidence >= 60 ? 'хорошее' : 'можно улучшить';
          generatedInsights.push({
            emoji: qualityEmoji,
            message: `Качество данных: ${averageConfidence.toFixed(0)}% - ${qualityText}`
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
  }, [user, qualityLoading, averageConfidence]);

  const handleRecalculate = () => {
    if (!user?.id) return;
    recalculate({ user_id: user.id });
  };

  const totalMetrics = Object.values(metricsByQuality).reduce(
    (sum, metrics) => sum + metrics.length, 
    0
  );

  return (
    <div className="space-y-3">
      {/* AI Insights Ticker */}
      {insights.length > 0 && (
        <div className="w-full bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border border-border/50 rounded-lg py-2.5 overflow-hidden">
          <div className="flex items-center gap-3">
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

      {/* Quality Mini-Widgets + Overall Score */}
      {!qualityLoading && totalMetrics > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-gradient-to-br from-primary/5 to-transparent border border-primary/20 rounded-lg">
          <div className="flex-1 space-y-2">
            {/* Quality Badges */}
            <CompactQualityBadges
              excellent={metricsByQuality.excellent.length}
              good={metricsByQuality.good.length}
              fair={metricsByQuality.fair.length}
              poor={metricsByQuality.poor.length}
              total={totalMetrics}
            />
            
            {/* Overall Score */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground whitespace-nowrap">
                Качество данных:
              </span>
              <div className="flex-1 max-w-xs">
                <Progress value={averageConfidence} className="h-1.5" />
              </div>
              <span className="text-sm font-bold text-primary whitespace-nowrap">
                {averageConfidence.toFixed(0)}%
              </span>
            </div>
          </div>

          {/* Recalculate Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRecalculate}
            disabled={isRecalculating}
            className="gap-2 shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRecalculating ? 'animate-spin' : ''}`} />
            <span className="text-xs">Пересчитать</span>
          </Button>
        </div>
      )}
    </div>
  );
}
