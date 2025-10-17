import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Activity, Heart, Flame, Moon, Wind, Footprints, Scale, Zap, RefreshCw } from 'lucide-react';
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

  // Реал-тайм обновление при появлении новых метрик/синхронизации
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('integrations-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'metric_values', filter: `user_id=eq.${user.id}` }, () => fetchIntegrationsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'terra_tokens', filter: `user_id=eq.${user.id}` }, () => fetchIntegrationsData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'whoop_tokens', filter: `user_id=eq.${user.id}` }, () => fetchIntegrationsData())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
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

  // Нормализация названий метрик (русский → английский)
  const normalizeMetricName = (name: string): string => {
    const mapping: Record<string, string> = {
      'Вес': 'Weight',
      'Процент жира': 'Body Fat Percentage',
      'Мышечная масса': 'Muscle Mass',
      'Процент мышц': 'Muscle Percentage',
      'Пульсовое давление': 'Pulse Pressure',
      'Рост': 'Height'
    };
    return mapping[name] || name;
  };

  const fetchProviderMetrics = async (provider: string): Promise<MetricData[]> => {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const todayStr = today.toISOString().split('T')[0];
    const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

    // Получаем последние метрики для провайдера за последние 7 дней
    const { data: metricsData } = await supabase
      .from('metric_values')
      .select(`
        value,
        measurement_date,
        created_at,
        user_metrics!inner(
          metric_name,
          unit,
          source,
          metric_category
        )
      `)
      .eq('user_id', user!.id)
      .eq('user_metrics.source', provider.toLowerCase())
      .gte('measurement_date', sevenDaysAgoStr)
      .lte('measurement_date', todayStr)
      .order('measurement_date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(100);

    if (!metricsData || metricsData.length === 0) return [];

    // Приоритетные метрики для отображения
    const priorityMetrics = [
      // Whoop metrics
      'Recovery Score',
      'Day Strain', 
      'Workout Strain',
      'Sleep Performance',
      'Sleep Efficiency',
      'Sleep Duration',
      'Workout Calories',
      'Average Heart Rate',
      'Max Heart Rate',
      
      // Withings metrics
      'Weight',
      'Body Fat Percentage',
      'Muscle Mass',
      'Muscle Percentage',
      'Pulse Pressure',
      'Height',
      
      // Other metrics
      'VO2Max',
      'Steps',
      'Heart Rate'
    ];

    // Нормализуем единицы измерения для избежания дубликатов
    const normalizeUnit = (metricName: string, unit: string): string => {
      if (metricName === 'Day Strain' || metricName === 'Workout Strain') return 'strain';
      if (metricName === 'Recovery Score') return '%';
      if (metricName === 'HRV (rMSSD)') return 'ms';
      if (metricName === 'Workout Calories') return 'kcal';
      return unit;
    };

    // Группируем по метрикам и берем последнее значение (с правильной единицей измерения)
    const metricsMap = new Map<string, MetricData>();

    metricsData.forEach((item: any) => {
      const rawMetricName = item.user_metrics.metric_name;
      const metricName = normalizeMetricName(rawMetricName); // Нормализуем название
      const normalizedUnit = normalizeUnit(metricName, item.user_metrics.unit);
      
      // Пропускаем метрики, которые ошибочно помечены как whoop (Weight и Height от Withings)
      if (provider === 'WHOOP' && (metricName === 'Weight' || metricName === 'Height' || metricName === 'Вес' || metricName === 'Рост')) {
        return;
      }
      
      // Берем только правильную единицу измерения
      if (item.user_metrics.unit !== normalizedUnit) {
        return; // Пропускаем дубликаты с неправильными единицами
      }
      
      // Уникальный ключ = нормализованное название метрики (избегаем дубликатов русский/английский)
      if (!metricsMap.has(metricName)) {
        metricsMap.set(metricName, {
          name: metricName,
          value: formatValue(item.value, metricName),
          unit: normalizedUnit,
          source: provider,
          icon: getMetricIcon(metricName, item.user_metrics.metric_category),
          color: getMetricColor(item.user_metrics.metric_category),
          lastUpdate: new Date(item.measurement_date).toLocaleDateString('ru-RU'),
        });
      }
    });

    // Специальная логика для Steps: показываем максимум за сегодня,
    // так как события могут приходить не по порядку и перезаписывать более поздние значения
    try {
      const { data: stepsToday } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          created_at,
          user_metrics!inner(
            metric_name,
            unit,
            source,
            metric_category
          )
        `)
        .eq('user_id', user!.id)
        .eq('user_metrics.source', provider.toLowerCase())
        .eq('user_metrics.metric_name', 'Steps')
        .eq('measurement_date', todayStr)
        .order('value', { ascending: false })
        .limit(1);

      if (stepsToday && stepsToday.length > 0) {
        const s: any = stepsToday[0];
        metricsMap.set('Steps', {
          name: 'Steps',
          value: formatValue(s.value, 'Steps'),
          unit: s.user_metrics.unit,
          source: provider,
          icon: getMetricIcon('Steps', s.user_metrics.metric_category),
          color: getMetricColor(s.user_metrics.metric_category),
          lastUpdate: new Date(s.measurement_date).toLocaleDateString('ru-RU'),
        });
      }
    } catch (e) {
      console.warn('Steps override failed', e);
    }

    // Сортируем метрики: сначала приоритетные, потом остальные
    const allMetrics = Array.from(metricsMap.values());
    return allMetrics.sort((a, b) => {
      const aIndex = priorityMetrics.indexOf(a.name);
      const bIndex = priorityMetrics.indexOf(b.name);
      
      if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex;
      if (aIndex !== -1) return -1;
      if (bIndex !== -1) return 1;
      return a.name.localeCompare(b.name);
    });
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
              <div className="flex items-center gap-3">
                {provider.lastSync && (
                  <span className="text-sm text-muted-foreground">
                    Последняя синхронизация: {new Date(provider.lastSync).toLocaleString('ru-RU')}
                  </span>
                )}
                <Button variant="outline" size="sm" onClick={fetchIntegrationsData}>
                  <RefreshCw className="h-4 w-4 mr-1" /> Обновить
                </Button>
              </div>
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
                  const isIconValid = typeof Icon === 'function';
                  return (
                    <div
                      key={idx}
                      className="p-4 rounded-lg border bg-card hover:shadow-md transition-all"
                      style={{
                        borderColor: `${String(metric.color)}30`,
                        background: `linear-gradient(135deg, ${String(metric.color)}08, transparent)`,
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-muted-foreground mb-1">
                            {String(metric.name)}
                          </p>
                          <div className="flex items-baseline gap-1">
                            <span className="text-2xl font-bold" style={{ color: String(metric.color) }}>
                              {String(metric.value)}
                            </span>
                            {metric.unit && (
                              <span className="text-sm text-muted-foreground">
                                {String(metric.unit)}
                              </span>
                            )}
                          </div>
                        </div>
                        {isIconValid ? (
                          <Icon className="h-5 w-5 opacity-50" style={{ color: String(metric.color) }} />
                        ) : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">
                        {String(metric.lastUpdate)}
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
