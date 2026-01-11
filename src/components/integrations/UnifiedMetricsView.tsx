import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Heart, Flame, Moon, Wind, Footprints, Scale, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface MetricSource {
  value: string;
  unit: string;
  source: string;
  lastUpdate: string;
  color: string;
}

interface UnifiedMetric {
  name: string;
  sources: MetricSource[];
  icon: any;
  category: string;
  activeSourceIndex: number;
}

const CACHE_VERSION = 'v3'; // Increment on structure changes - no localStorage for data

export function UnifiedMetricsView() {
  const { user } = useAuth();
  const { t } = useTranslation('common');
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [metrics, setMetrics] = useState<UnifiedMetric[]>([]);
  const [viewMode, setViewMode] = useState<'unified' | 'all'>('unified');

  // Fetch on mount (React Query handles caching)
  useEffect(() => {
    if (!user || !initialLoad) return;

    fetchUnifiedMetrics(true).then(() => {
      setInitialLoad(false);
    });
  }, [user, initialLoad]);

  // Real-time updates (без skeleton при обновлении)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('unified-metrics-live')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'unified_metrics', 
        filter: `user_id=eq.${user.id}` 
      }, () => {
        // Обновляем данные в фоне без показа loading
        fetchUnifiedMetrics(false);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // Вспомогательные функции (определяем до использования)
  const formatValue = (value: number, metricName: string): string => {
    if (metricName.toLowerCase().includes('sleep') && metricName.toLowerCase().includes('duration')) {
      const hours = Math.floor(value);
      const minutes = Math.round((value - hours) * 60);
      return `${hours}:${minutes.toString().padStart(2, '0')}`;
    }
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  };

  const getMetricIcon = (metricName: string, category: string) => {
    const name = metricName.toLowerCase();
    if (name.includes('heart') || name.includes('hrv')) return Heart;
    if (name.includes('calor') || name.includes('strain')) return Flame;
    if (name.includes('sleep')) return Moon;
    if (name.includes('vo2') || name.includes('oxygen')) return Wind;
    if (name.includes('step')) return Footprints;
    if (name.includes('weight') || name.includes('fat')) return Scale;
    if (name.includes('recovery')) return Zap;
    return Activity;
  };

  const getMetricColor = (category: string): string => {
    const colorMap: Record<string, string> = {
      recovery: 'hsl(var(--success))',
      sleep: 'hsl(var(--info))',
      workout: 'hsl(var(--warning))',
      cardio: 'hsl(var(--primary))',
      body: 'hsl(var(--metric-weight))',
    };
    return colorMap[category] || 'hsl(var(--foreground))';
  };

  const getProviderDisplayName = (provider: string): string => {
    const nameMap: Record<string, string> = {
      garmin: 'Garmin',
      whoop: 'Whoop',
      fitbit: 'Fitbit',
      withings: 'Withings',
      oura: 'Oura',
      polar: 'Polar',
      suunto: 'Suunto',
      ultrahuman: 'Ultrahuman',
    };
    return nameMap[provider.toLowerCase()] || provider;
  };

  const fetchUnifiedMetrics = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const today = new Date();
      const twoDaysAgo = new Date(today);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const todayStr = today.toISOString().split('T')[0];
      const twoDaysAgoStr = twoDaysAgo.toISOString().split('T')[0];

      // Всегда загружаем данные за последние 2 дня из unified_metrics
      const { data: metricsData } = await supabase
        .from('unified_metrics')
        .select('metric_name, value, unit, measurement_date, source, metric_category, created_at')
        .eq('user_id', user!.id)
        .in('metric_category', ['recovery', 'body', 'cardio', 'sleep', 'workout', 'activity', 'heart_rate'])
        .gte('measurement_date', twoDaysAgoStr)
        .lte('measurement_date', todayStr)
        .order('measurement_date', { ascending: false })
        .order('created_at', { ascending: false });

      // Функция для определения приоритета источников
      const getProviderPriority = (metricName: string, category: string): string[] => {
        const name = metricName.toLowerCase();
        if (category === 'recovery' || name.includes('recovery')) {
          return ['whoop', 'oura', 'garmin', 'polar', 'fitbit', 'withings', 'suunto', 'ultrahuman'];
        }
        return ['garmin', 'whoop', 'oura', 'polar', 'fitbit', 'withings', 'suunto', 'ultrahuman'];
      };

      // Группируем по названию метрики и берём самую свежую по каждому источнику
      const metricsMap = new Map<string, UnifiedMetric>();
      (metricsData || []).forEach((item: any) => {
        const metricName = item.metric_name; // direct field from unified_metrics
        const source = item.source;
        if (!metricsMap.has(metricName)) {
          metricsMap.set(metricName, {
            name: metricName,
            sources: [],
            icon: getMetricIcon(metricName, item.metric_category),
            category: item.metric_category,
            activeSourceIndex: 0,
          });
        }
        const metric = metricsMap.get(metricName)!;
        const existingSourceIndex = metric.sources.findIndex(
          (s) => s.source === getProviderDisplayName(source)
        );
        if (existingSourceIndex === -1) {
          // Добавляем новый источник
          metric.sources.push({
            value: formatValue(item.value, metricName),
            unit: item.unit,
            source: getProviderDisplayName(source),
            lastUpdate: item.measurement_date,
            color: getMetricColor(item.metric_category),
          });
        } else {
          // Проверяем, не свежее ли текущая запись
          const existing = metric.sources[existingSourceIndex];
          const existingDate = new Date(existing.lastUpdate);
          const currentDate = new Date(item.measurement_date);
          
          if (currentDate > existingDate || 
              (currentDate.getTime() === existingDate.getTime() && 
               new Date(item.created_at) > new Date(existing.lastUpdate))) {
            // Обновляем на более свежую
            metric.sources[existingSourceIndex] = {
              value: formatValue(item.value, metricName),
              unit: item.unit,
              source: getProviderDisplayName(source),
              lastUpdate: item.measurement_date,
              color: getMetricColor(item.metric_category),
            };
          }
        }
      });

      const nextMetrics = Array.from(metricsMap.values());
      
      // Применяем приоритизацию источников
      const prioritizedMetrics = nextMetrics.map((m) => {
        if (m.sources.length <= 1) return m;
        
        const priority = getProviderPriority(m.name, m.category);
        const preferredIdx = m.sources.findIndex((s) => 
          priority.includes(s.source.toLowerCase())
        );
        
        if (preferredIdx >= 0) {
          return { ...m, activeSourceIndex: preferredIdx };
        }
        return m;
      });
      
      setMetrics(prioritizedMetrics);
      // React Query handles caching - no localStorage needed
    } catch (error) {
      console.error('Error fetching unified metrics:', error);
    } finally {
      if (showLoading) setLoading(false);
    }
  };


  const handleMetricClick = (metricIndex: number) => {
    setMetrics(prev => prev.map((metric, idx) => {
      if (idx === metricIndex && metric.sources.length > 1) {
        return {
          ...metric,
          activeSourceIndex: (metric.activeSourceIndex + 1) % metric.sources.length,
        };
      }
      return metric;
    }));
  };

  // Показываем skeleton только при первой загрузке
  if (initialLoad && loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <Skeleton className="h-6 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (metrics.length === 0) {
    return (
      <Card className="p-8 text-center text-muted-foreground">
        {t('empty.noDataToday')}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="outline" className="bg-primary/10">
          <Activity className="h-3 w-3 mr-1" />
          {t('integrations:aggregated', 'Aggregated data from all sources')}
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((metric, metricIdx) => {
          const activeSource = metric.sources[metric.activeSourceIndex];
          if (!activeSource) return null;
          const Icon = metric.icon;
          const isIconValid = typeof Icon === 'function';
          const hasMultipleSources = metric.sources.length > 1;

          return (
            <div
              key={metricIdx}
              onClick={() => hasMultipleSources && handleMetricClick(metricIdx)}
              className={cn(
                "p-4 rounded-lg border transition-all",
                hasMultipleSources && "cursor-pointer hover:shadow-lg hover:scale-[1.02]"
              )}
              style={{
                borderColor: `${String(activeSource.color)}30`,
                background: `linear-gradient(135deg, ${String(activeSource.color)}08, transparent)`,
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-muted-foreground mb-1">
                    {String(metric.name)}
                  </p>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold" style={{ color: String(activeSource.color) }}>
                      {String(activeSource.value)}
                    </span>
                    {activeSource.unit && (
                      <span className="text-sm text-muted-foreground">
                        {String(activeSource.unit)}
                      </span>
                    )}
                  </div>
                </div>
                {isIconValid ? (
                  <Icon className="h-5 w-5 opacity-50" style={{ color: String(activeSource.color) }} />
                ) : null}
              </div>
              
              <div className="flex items-center justify-between mt-2">
                <Badge variant="outline" className="text-xs">
                  {String(activeSource.source)}
                </Badge>
                {hasMultipleSources && (
                  <span className="text-xs text-muted-foreground">
                    {metric.activeSourceIndex + 1}/{metric.sources.length}
                  </span>
                )}
              </div>
              
              <p className="text-xs text-muted-foreground mt-1">
                {String(activeSource.lastUpdate)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}