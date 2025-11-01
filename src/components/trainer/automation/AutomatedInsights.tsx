/**
 * AutomatedInsights - Автоматические инсайты и рекомендации
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  Zap, 
  Moon,
  Activity,
  ThumbsUp,
  Info
} from 'lucide-react';

interface Insight {
  type: 'warning' | 'success' | 'info' | 'danger';
  category: 'recovery' | 'sleep' | 'activity' | 'strain' | 'general';
  title: string;
  description: string;
  metric_value?: number;
  trend?: 'up' | 'down' | 'stable';
  priority: number;
}

interface AutomatedInsightsProps {
  clientId: string;
}

export function AutomatedInsights({ clientId }: AutomatedInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    generateInsights();
  }, [clientId]);

  const generateInsights = async () => {
    try {
      const insights: Insight[] = [];
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const fourteenDaysAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      // Fetch recent metrics
      const { data: recentMetrics, error } = await supabase
        .from('unified_metrics')
        .select('metric_name, value, measurement_date')
        .eq('user_id', clientId)
        .gte('measurement_date', fourteenDaysAgo)
        .order('measurement_date', { ascending: false });

      if (error) throw error;

      // Group by metric name
      const metricsByName = new Map<string, number[]>();
      recentMetrics?.forEach(m => {
        if (!metricsByName.has(m.metric_name)) {
          metricsByName.set(m.metric_name, []);
        }
        metricsByName.get(m.metric_name)!.push(m.value);
      });

      // Check for overtraining (high strain + low recovery)
      const strainValues = metricsByName.get('Day Strain') || [];
      const recoveryValues = metricsByName.get('Recovery Score') || [];
      
      if (strainValues.length > 0 && recoveryValues.length > 0) {
        const avgStrain = strainValues.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, strainValues.length);
        const avgRecovery = recoveryValues.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, recoveryValues.length);
        
        if (avgStrain > 18 && avgRecovery < 33) {
          insights.push({
            type: 'danger',
            category: 'strain',
            title: 'Риск перетренированности',
            description: `Высокая нагрузка (${avgStrain.toFixed(1)}) при низком восстановлении (${avgRecovery.toFixed(0)}%). Рекомендуется отдых.`,
            metric_value: avgRecovery,
            trend: 'down',
            priority: 1,
          });
        } else if (avgRecovery > 67 && avgStrain < 10) {
          insights.push({
            type: 'success',
            category: 'recovery',
            title: 'Отличное восстановление',
            description: `Высокий уровень восстановления (${avgRecovery.toFixed(0)}%) и низкая нагрузка. Можно увеличить интенсивность.`,
            metric_value: avgRecovery,
            trend: 'up',
            priority: 3,
          });
        }
      }

      // Check sleep trends
      const sleepValues = metricsByName.get('Sleep Duration') || [];
      if (sleepValues.length >= 7) {
        const recentSleep = sleepValues.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
        const prevSleep = sleepValues.slice(7, 14).reduce((a, b) => a + b, 0) / Math.min(7, sleepValues.slice(7).length);
        
        if (recentSleep < 6) {
          insights.push({
            type: 'warning',
            category: 'sleep',
            title: 'Недостаточный сон',
            description: `Средняя продолжительность сна: ${recentSleep.toFixed(1)}ч. Рекомендуется 7-9 часов.`,
            metric_value: recentSleep,
            trend: recentSleep < prevSleep ? 'down' : 'stable',
            priority: 2,
          });
        } else if (recentSleep > prevSleep + 0.5) {
          insights.push({
            type: 'success',
            category: 'sleep',
            title: 'Улучшение качества сна',
            description: `Сон увеличился на ${((recentSleep - prevSleep) * 60).toFixed(0)} минут в неделю. Отличный прогресс!`,
            metric_value: recentSleep,
            trend: 'up',
            priority: 4,
          });
        }
      }

      // Check activity consistency
      const stepsValues = metricsByName.get('Steps') || [];
      if (stepsValues.length >= 7) {
        const avgSteps = stepsValues.slice(0, 7).reduce((a, b) => a + b, 0) / 7;
        const consistency = stepsValues.slice(0, 7).filter(s => s > 5000).length;
        
        if (consistency >= 5) {
          insights.push({
            type: 'success',
            category: 'activity',
            title: 'Стабильная активность',
            description: `${consistency} дней с активностью >5000 шагов. Средняя: ${avgSteps.toFixed(0)} шагов/день.`,
            metric_value: avgSteps,
            trend: 'up',
            priority: 5,
          });
        } else if (consistency < 3) {
          insights.push({
            type: 'info',
            category: 'activity',
            title: 'Низкая активность',
            description: `Только ${consistency} активных дней на неделе. Попробуйте увеличить ежедневную активность.`,
            metric_value: avgSteps,
            trend: 'down',
            priority: 3,
          });
        }
      }

      // Check data quality
      const uniqueDates = new Set(recentMetrics?.map(m => m.measurement_date) || []);
      if (uniqueDates.size < 5) {
        insights.push({
          type: 'warning',
          category: 'general',
          title: 'Недостаточно данных',
          description: `За последние 7 дней получены данные только за ${uniqueDates.size} дней. Проверьте синхронизацию устройств.`,
          priority: 2,
        });
      }

      // Sort by priority
      insights.sort((a, b) => a.priority - b.priority);
      
      setInsights(insights);
    } catch (error) {
      console.error('Error generating insights:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (category: string) => {
    switch (category) {
      case 'recovery': return Activity;
      case 'sleep': return Moon;
      case 'activity': return TrendingUp;
      case 'strain': return Zap;
      default: return Info;
    }
  };

  const getVariant = (type: string) => {
    switch (type) {
      case 'danger': return 'destructive';
      case 'warning': return 'outline';
      case 'success': return 'default';
      default: return 'secondary';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Анализ данных...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (insights.length === 0) {
    return (
      <Alert>
        <ThumbsUp className="h-4 w-4" />
        <AlertTitle>Все в порядке</AlertTitle>
        <AlertDescription>
          Автоматический анализ не выявил проблем. Клиент находится в хорошей форме.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5" />
          Автоматические инсайты
        </CardTitle>
        <CardDescription>
          Найдено {insights.length} важных наблюдений на основе данных клиента
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights.map((insight, idx) => {
          const Icon = getIcon(insight.category);
          
          return (
            <Alert key={idx} variant={insight.type === 'danger' ? 'destructive' : 'default'}>
              <Icon className="h-4 w-4" />
              <AlertTitle className="flex items-center gap-2">
                {insight.title}
                <Badge variant={getVariant(insight.type) as any}>
                  {insight.category}
                </Badge>
                {insight.trend && (
                  insight.trend === 'up' ? 
                    <TrendingUp className="h-4 w-4 text-success" /> : 
                    <TrendingDown className="h-4 w-4 text-destructive" />
                )}
              </AlertTitle>
              <AlertDescription>{insight.description}</AlertDescription>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
}
