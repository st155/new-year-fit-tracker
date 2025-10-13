import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Activity, Heart, Flame, Moon, Wind, Footprints, Scale, Zap } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';

interface MetricData {
  name: string;
  value: string;
  unit: string;
  source: string;
  icon: any;
  color: string;
  lastUpdate: string;
}

interface ProviderData {
  provider: string;
  connected: boolean;
  lastSync: string | null;
  metrics: MetricData[];
}

export function IntegrationsDataDisplay() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [providers, setProviders] = useState<ProviderData[]>([]);

  useEffect(() => {
    if (user) {
      fetchIntegrationsData();
    }
  }, [user]);

  const fetchIntegrationsData = async () => {
    setLoading(true);
    try {
      // Получаем активные интеграции
      const { data: terraTokens } = await supabase
        .from('terra_tokens')
        .select('provider, last_sync_date, is_active')
        .eq('user_id', user!.id)
        .eq('is_active', true);

      const { data: whoopTokens } = await supabase
        .from('whoop_tokens')
        .select('updated_at, is_active')
        .eq('user_id', user!.id)
        .eq('is_active', true)
        .maybeSingle();

      const providersList: ProviderData[] = [];

      // Обработка Terra провайдеров (Garmin, Fitbit, etc.)
      if (terraTokens && terraTokens.length > 0) {
        for (const token of terraTokens) {
          const metrics = await fetchProviderMetrics(token.provider);
          providersList.push({
            provider: token.provider,
            connected: true,
            lastSync: token.last_sync_date,
            metrics,
          });
        }
      }

      // Обработка Whoop
      if (whoopTokens) {
        const metrics = await fetchProviderMetrics('WHOOP');
        providersList.push({
          provider: 'WHOOP',
          connected: true,
          lastSync: whoopTokens.updated_at,
          metrics,
        });
      }

      setProviders(providersList);
    } catch (error) {
      console.error('Error fetching integrations data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviderMetrics = async (provider: string): Promise<MetricData[]> => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Получаем последние метрики для провайдера
    const { data: metricsData } = await supabase
      .from('metric_values')
      .select(`
        value,
        measurement_date,
        user_metrics!inner(
          metric_name,
          unit,
          source,
          metric_category
        )
      `)
      .eq('user_id', user!.id)
      .eq('user_metrics.source', provider.toLowerCase())
      .gte('measurement_date', yesterday.toISOString().split('T')[0])
      .order('measurement_date', { ascending: false })
      .limit(20);

    if (!metricsData || metricsData.length === 0) return [];

    // Группируем по метрикам и берем последнее значение
    const metricsMap = new Map<string, MetricData>();

    metricsData.forEach((item: any) => {
      const metricName = item.user_metrics.metric_name;
      if (!metricsMap.has(metricName)) {
        metricsMap.set(metricName, {
          name: metricName,
          value: formatValue(item.value, metricName),
          unit: item.user_metrics.unit,
          source: provider,
          icon: getMetricIcon(metricName, item.user_metrics.metric_category),
          color: getMetricColor(item.user_metrics.metric_category),
          lastUpdate: new Date(item.measurement_date).toLocaleDateString(),
        });
      }
    });

    return Array.from(metricsMap.values());
  };

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
      GARMIN: 'Garmin',
      WHOOP: 'Whoop',
      FITBIT: 'Fitbit',
      WITHINGS: 'Withings',
      OURA: 'Oura',
      POLAR: 'Polar',
      SUUNTO: 'Suunto',
    };
    return nameMap[provider.toUpperCase()] || provider;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (providers.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-muted-foreground">
          Нет подключенных интеграций
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {providers.map((provider) => (
        <Card key={provider.provider} className="overflow-hidden">
          <CardHeader className="border-b bg-muted/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CardTitle className="text-xl">
                  {getProviderDisplayName(provider.provider)}
                </CardTitle>
                <Badge variant="outline" className="bg-success/10 text-success border-success/30">
                  Подключено
                </Badge>
              </div>
              {provider.lastSync && (
                <span className="text-sm text-muted-foreground">
                  Последняя синхронизация: {new Date(provider.lastSync).toLocaleString('ru-RU')}
                </span>
              )}
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {provider.metrics.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Пока нет данных от этого устройства
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {provider.metrics.map((metric, idx) => {
                  const Icon = metric.icon;
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                      style={{
                        borderColor: `${metric.color}30`,
                        background: `linear-gradient(135deg, ${metric.color}08, transparent)`,
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            {metric.name}
                          </p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold" style={{ color: metric.color }}>
                              {metric.value}
                            </span>
                            {metric.unit && (
                              <span className="text-sm text-muted-foreground">
                                {metric.unit}
                              </span>
                            )}
                          </div>
                        </div>
                        <Icon className="h-5 w-5 opacity-50" style={{ color: metric.color }} />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {metric.lastUpdate}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
