import { useState, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Activity, Heart, Zap, Moon, Footprints, Flame, Clock
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import { RecoveryScoreChart } from '@/components/fitness-data/RecoveryScoreChart';
import { StrainChart } from '@/components/fitness-data/StrainChart';
import { HeartRateChart } from '@/components/fitness-data/HeartRateChart';
import { SleepChart } from '@/components/fitness-data/SleepChart';
import { MetricsGrid } from '@/components/fitness-data/MetricsGrid';
import { TerraIntegration } from '@/components/integrations/TerraIntegration';
import { TerraHealthMonitor } from '@/components/integrations/TerraHealthMonitor';
import { IntegrationsDataDisplay } from '@/components/integrations/IntegrationsDataDisplay';
import { SystemHealthIndicator } from '@/components/integrations/SystemHealthIndicator';
import { AutoRefreshToggle } from '@/components/integrations/AutoRefreshToggle';
import { PageLoader } from '@/components/ui/page-loader';

type TimeFilter = 'today' | 'week' | 'month';
type SourceFilter = 'all' | 'whoop' | 'garmin' | 'ultrahuman';

export default function FitnessData() {
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [dateOffset, setDateOffset] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleRefresh = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // Calculate date range
  const calculateDateRange = useMemo(() => {
    const today = new Date();
    let start: Date, end: Date;

    switch (timeFilter) {
      case 'today':
        start = startOfDay(subDays(today, dateOffset));
        end = endOfDay(subDays(today, dateOffset));
        break;
      case 'week':
        start = startOfDay(subDays(today, 6 + dateOffset * 7));
        end = endOfDay(subDays(today, dateOffset * 7));
        break;
      case 'month':
        start = startOfDay(subDays(today, 29 + dateOffset * 30));
        end = endOfDay(subDays(today, dateOffset * 30));
        break;
    }

    // Use ISO strings for precise timestamp comparison
    const startISO = start.toISOString();
    const endExclusiveISO = addDays(startOfDay(end), 1).toISOString();

    return { start, end, startISO, endExclusiveISO };
  }, [timeFilter, dateOffset]);

  // Fetch metrics data
  const { data: metricsData = [], isLoading } = useQuery({
    queryKey: ['fitness-metrics', user?.id, calculateDateRange, sourceFilter, refreshKey],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from('unified_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('measurement_date', calculateDateRange.startISO)
        .lt('measurement_date', calculateDateRange.endExclusiveISO)
        .order('measurement_date', { ascending: true });

      if (sourceFilter !== 'all') {
        query = query.ilike('source', sourceFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      
      console.log(`[FitnessData] Range ISO: ${calculateDateRange.startISO} → ${calculateDateRange.endExclusiveISO}, rows: ${data?.length || 0}`);
      
      // Debug Recovery Score for Whoop + Today
      if (sourceFilter === 'whoop' && timeFilter === 'today') {
        const recoveryRecords = data?.filter(m => m.metric_name === 'Recovery Score') || [];
        console.log('[FitnessData] Recovery Score (Whoop/Today):', recoveryRecords.map(r => ({ date: r.measurement_date, value: r.value })));
      }
      
      return data || [];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Process metrics for display
  const processedMetrics = useMemo(() => {
    const metrics = {
      recovery: [] as { value: number; date: string }[],
      strain: [] as { value: number; date: string }[],
      heartRate: [] as { value: number; date: string }[],
      sleep: [] as { date: string; deep?: number; light?: number; rem?: number; awake?: number; total?: number; score?: number }[],
      cards: [] as any[],
    };

    // Deduplicate by date + metric_name + priority when sourceFilter is 'all'
    const isUnified = sourceFilter === 'all';
    let processedData = metricsData;
    
    if (isUnified) {
      const deduped = new Map<string, typeof metricsData[0]>();
      metricsData.forEach(metric => {
        const dateOnly = metric.measurement_date.split('T')[0];
        const key = `${dateOnly}-${metric.metric_name}`;
        const existing = deduped.get(key);
        const metricPriority = metric.priority ?? 999;
        const existingPriority = existing?.priority ?? 999;
        
        if (!existing || metricPriority < existingPriority) {
          deduped.set(key, metric);
        }
      });
      processedData = Array.from(deduped.values());
      
      console.log(`[FitnessData] Unified mode: ${metricsData.length} → ${processedData.length} after dedup`);
    }

    // Group by metric_name
    const grouped = processedData.reduce((acc, metric) => {
      if (!acc[metric.metric_name]) {
        acc[metric.metric_name] = [];
      }
      acc[metric.metric_name].push(metric);
      return acc;
    }, {} as Record<string, typeof metricsData>);

    // Process Recovery
    if (grouped['Recovery Score']) {
      metrics.recovery = grouped['Recovery Score'].map(m => ({
        value: m.value,
        date: format(new Date(m.measurement_date), 'dd MMM', { locale: ru }),
      }));
    }

    // Process Strain
    if (grouped['Day Strain']) {
      metrics.strain = grouped['Day Strain'].map(m => ({
        value: m.value,
        date: format(new Date(m.measurement_date), 'dd MMM', { locale: ru }),
      }));
    }

    // Process Heart Rate - try both possible names and group by day
    const heartRateData = grouped['Average Heart Rate'] || grouped['Heart Rate'] || grouped['Resting Heart Rate'];
    if (heartRateData) {
      const hrByDate = new Map<string, number[]>();
      heartRateData.forEach(m => {
        const dateOnly = m.measurement_date.split('T')[0];
        if (!hrByDate.has(dateOnly)) hrByDate.set(dateOnly, []);
        hrByDate.get(dateOnly)!.push(m.value);
      });

      metrics.heartRate = Array.from(hrByDate.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, values]) => ({
          value: Math.round(values.reduce((sum, v) => sum + v, 0) / values.length),
          date: format(new Date(date), 'dd MMM', { locale: ru }),
        }));
    }

    // Process Sleep - use processedData to avoid duplicates in unified mode
    const sleepDates = new Set<string>();
    processedData.forEach(m => {
      const name = m.metric_name.toLowerCase();
      if (name.includes('sleep')) {
        sleepDates.add(m.measurement_date.split('T')[0]);
      }
    });

    sleepDates.forEach(date => {
      const dayMetrics = processedData.filter(m => m.measurement_date.startsWith(date));
      const sleepData: any = {
        date: format(new Date(date), 'dd MMM', { locale: ru }),
      };

      dayMetrics.forEach(m => {
        if (m.metric_name === 'Deep Sleep Duration') sleepData.deep = m.value * 60;
        if (m.metric_name === 'Light Sleep Duration') sleepData.light = m.value * 60;
        if (m.metric_name === 'REM Sleep Duration') sleepData.rem = m.value * 60;
        if (m.metric_name === 'Awake Duration') sleepData.awake = m.value * 60;
        if (m.metric_name === 'Sleep Duration') sleepData.total = m.value;
        if (m.metric_name === 'Sleep Performance' || m.metric_name === 'Sleep Efficiency') sleepData.score = m.value;
      });

      if (Object.keys(sleepData).length > 1) {
        metrics.sleep.push(sleepData);
      }
    });

    // Create metric cards
    const latestMetrics = Object.entries(grouped).map(([name, values]) => {
      const latest = values[values.length - 1];
      return { name, latest, history: values };
    });

    // Recovery card
    const recovery = latestMetrics.find(m => m.name === 'Recovery Score');
    if (recovery) {
      const avgRecovery = recovery.history.length > 0
        ? Math.round(recovery.history.reduce((sum, h) => sum + h.value, 0) / recovery.history.length)
        : Math.round(recovery.latest.value);
      
      metrics.cards.push({
        name: 'Recovery',
        value: avgRecovery,
        unit: '%',
        icon: Activity,
        color: 'bg-gradient-to-br from-green-400 to-emerald-500',
        source: isUnified ? 'Unified' : recovery.latest.source,
        sparkline: recovery.history.slice(-7).map(h => ({ value: h.value })),
      });
    }

    // Strain card
    const strain = latestMetrics.find(m => m.name === 'Day Strain');
    if (strain) {
      const avgStrain = strain.history.length > 0
        ? strain.history.reduce((sum, h) => sum + h.value, 0) / strain.history.length
        : strain.latest.value;
      
      metrics.cards.push({
        name: 'Day Strain',
        value: avgStrain.toFixed(1),
        icon: Zap,
        color: 'bg-gradient-to-br from-orange-400 to-red-500',
        source: isUnified ? 'Unified' : strain.latest.source,
        sparkline: strain.history.slice(-7).map(h => ({ value: h.value })),
      });
    }

    // Heart Rate card - try multiple names
    const hr = latestMetrics.find(m => 
      m.name === 'Average Heart Rate' || 
      m.name === 'Heart Rate' || 
      m.name === 'Resting Heart Rate'
    );
    if (hr) {
      const avgHR = hr.history.length > 0
        ? Math.round(hr.history.reduce((sum, h) => sum + h.value, 0) / hr.history.length)
        : Math.round(hr.latest.value);
      
      const age = new Date().getTime() - new Date(hr.latest.measurement_date).getTime();
      metrics.cards.push({
        name: 'Heart Rate',
        value: avgHR,
        unit: 'bpm',
        icon: Heart,
        color: 'bg-gradient-to-br from-red-400 to-pink-500',
        source: isUnified ? 'Unified' : hr.latest.source,
        isStale: age > 24 * 60 * 60 * 1000,
        sparkline: hr.history.slice(-20).map(h => ({ value: h.value })),
      });
    }

    // Sleep card
    const sleep = latestMetrics.find(m => 
      m.name === 'Sleep Performance' || 
      m.name === 'Sleep Efficiency'
    );
    if (sleep) {
      const avgSleep = sleep.history.length > 0
        ? Math.round(sleep.history.reduce((sum, h) => sum + h.value, 0) / sleep.history.length)
        : Math.round(sleep.latest.value);
      
      metrics.cards.push({
        name: 'Sleep Score',
        value: avgSleep,
        unit: sleep.latest.unit === '%' ? '%' : '/100',
        icon: Moon,
        color: 'bg-gradient-to-br from-blue-400 to-indigo-500',
        source: isUnified ? 'Unified' : sleep.latest.source,
        sparkline: sleep.history.slice(-7).map(h => ({ value: h.value })),
      });
    }

    // Steps card
    const steps = latestMetrics.find(m => m.name === 'Steps');
    if (steps) {
      const totalSteps = steps.history.length > 0
        ? Math.round(steps.history.reduce((sum, h) => sum + h.value, 0))
        : Math.round(steps.latest.value);
      
      metrics.cards.push({
        name: 'Steps',
        value: totalSteps.toLocaleString(),
        icon: Footprints,
        color: 'bg-gradient-to-br from-cyan-400 to-blue-500',
        source: isUnified ? 'Unified' : steps.latest.source,
        sparkline: steps.history.slice(-7).map(h => ({ value: h.value })),
      });
    }

    // Calories card
    const calories = latestMetrics.find(m => 
      m.name === 'Active Calories' || 
      m.name === 'Workout Calories'
    );
    if (calories) {
      const totalCalories = calories.history.length > 0
        ? Math.round(calories.history.reduce((sum, h) => sum + h.value, 0))
        : Math.round(calories.latest.value);
      
      metrics.cards.push({
        name: 'Calories',
        value: totalCalories,
        unit: 'kcal',
        icon: Flame,
        color: 'bg-gradient-to-br from-orange-400 to-red-400',
        source: isUnified ? 'Unified' : calories.latest.source,
        sparkline: calories.history.slice(-7).map(h => ({ value: h.value })),
      });
    }

    return metrics;
  }, [metricsData, sourceFilter, calculateDateRange]);

  const getDateLabel = () => {
    const { start, end } = calculateDateRange;
    
    if (timeFilter === 'today') {
      return format(start, 'd MMMM yyyy', { locale: ru });
    }
    
    return `${format(start, 'd MMM', { locale: ru })} - ${format(end, 'd MMM yyyy', { locale: ru })}`;
  };

  const handlePreviousPeriod = () => setDateOffset(prev => prev + 1);
  const handleNextPeriod = () => setDateOffset(prev => Math.max(0, prev - 1));

  const sourceOptions = [
    { value: 'all' as const, label: 'Все' },
    { value: 'whoop' as const, label: 'Whoop' },
    { value: 'garmin' as const, label: 'Garmin' },
    { value: 'ultrahuman' as const, label: 'Ultrahuman' },
  ];

  if (isLoading) {
    return <PageLoader message="Загрузка фитнес-данных..." />;
  }

  const avgRecovery = processedMetrics.recovery.length > 0 
    ? processedMetrics.recovery.reduce((sum, r) => sum + r.value, 0) / processedMetrics.recovery.length
    : null;

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Фитнес дата</h1>
          <p className="text-muted-foreground mt-2">
            Ваши метрики здоровья и активности
          </p>
        </div>
        <div className="flex items-center gap-4">
          <AutoRefreshToggle onRefresh={handleRefresh} />
          <SystemHealthIndicator />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="connections">Подключения</TabsTrigger>
          <TabsTrigger value="health">Здоровье</TabsTrigger>
          <TabsTrigger value="details">Детали</TabsTrigger>
        </TabsList>

        {/* Tab 1: Overview */}
        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            {/* Time filters */}
            <div className="flex items-center gap-2">
              <Button
                variant={timeFilter === 'today' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setTimeFilter('today'); setDateOffset(0); }}
              >
                Сегодня
              </Button>
              <Button
                variant={timeFilter === 'week' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setTimeFilter('week'); setDateOffset(0); }}
              >
                Неделя
              </Button>
              <Button
                variant={timeFilter === 'month' ? 'default' : 'outline'}
                size="sm"
                onClick={() => { setTimeFilter('month'); setDateOffset(0); }}
              >
                Месяц
              </Button>
            </div>

            {/* Source filters */}
            <div className="flex items-center gap-2">
              {sourceOptions.map(option => (
                <Button
                  key={option.value}
                  variant={sourceFilter === option.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSourceFilter(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Date navigator */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePreviousPeriod}
            >
              ← Назад
            </Button>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">{getDateLabel()}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPeriod}
              disabled={dateOffset === 0}
            >
              Вперед →
            </Button>
          </div>

          {/* Hero Recovery Score */}
          {avgRecovery && (
            <RecoveryScoreChart
              score={avgRecovery}
              history={processedMetrics.recovery}
            />
          )}

          {/* Metrics Grid */}
          <MetricsGrid metrics={processedMetrics.cards} />

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {processedMetrics.strain.length > 0 && (
              <StrainChart data={processedMetrics.strain} />
            )}
            {processedMetrics.heartRate.length > 0 && (
              <HeartRateChart data={processedMetrics.heartRate} />
            )}
          </div>

          {processedMetrics.sleep.length > 0 && (
            <SleepChart data={processedMetrics.sleep} />
          )}
        </TabsContent>

        {/* Tab 2: Connections */}
        <TabsContent value="connections" className="mt-6">
          <TerraIntegration key={`connections-${refreshKey}`} />
        </TabsContent>

        {/* Tab 3: Health Monitor */}
        <TabsContent value="health" className="mt-6">
          <TerraHealthMonitor key={`health-${refreshKey}`} />
        </TabsContent>

        {/* Tab 4: Details by Device */}
        <TabsContent value="details" className="mt-6">
          <IntegrationsDataDisplay key={`details-${refreshKey}`} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
