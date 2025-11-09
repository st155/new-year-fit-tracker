import { useState, useCallback, useMemo } from 'react';
import { AnimatedPage } from '@/components/layout/AnimatedPage';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useMetricsView } from '@/contexts/MetricsViewContext';
import { MetricsViewToggle } from '@/components/dashboard/MetricsViewToggle';
import { 
  Activity, Heart, Zap, Moon, Footprints, Flame, Clock
} from 'lucide-react';
import { format, subDays, startOfDay, endOfDay } from 'date-fns';
import { ru } from 'date-fns/locale';
import { TremorMetricCard, TremorAreaChartCard, TremorBarChartCard } from '@/components/charts/TremorWrappers';
import { adaptMetricsToTremor, adaptStrainToTremor, adaptSleepToTremor, valueFormatters } from '@/lib/tremor-adapter';
import { MetricCard } from '@/components/fitness-data/MetricCard';
import { FitnessCard } from '@/components/ui/fitness-card';
import { cn } from '@/lib/utils';
import { Text, Metric, AreaChart, BarChart } from '@tremor/react';
import { TerraIntegration } from '@/components/integrations/TerraIntegration';
import { TerraHealthMonitor } from '@/components/integrations/TerraHealthMonitor';
import { IntegrationsDataDisplay } from '@/components/integrations/IntegrationsDataDisplay';
import { SystemHealthIndicator } from '@/components/integrations/SystemHealthIndicator';
import { AutoRefreshToggle } from '@/components/integrations/AutoRefreshToggle';
import { PageLoader } from '@/components/ui/page-loader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useMetrics } from '@/hooks/composite/data/useMetrics';
import { motion } from 'framer-motion';
import { staggerContainer, staggerItem } from '@/lib/animations';
import { EmptyState } from '@/components/ui/EmptyState';

type TimeFilter = 'today' | 'week' | 'month';

export default function FitnessData() {
  const { user } = useAuth();
  const { deviceFilter } = useMetricsView();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('today');
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
        start = startOfDay(subDays(today, 7 + dateOffset * 7));
        end = endOfDay(subDays(today, dateOffset * 7));
        break;
      case 'month':
        start = startOfDay(subDays(today, 30 + dateOffset * 30));
        end = endOfDay(subDays(today, dateOffset * 30));
        break;
    }

    return { start, end };
  }, [timeFilter, dateOffset]);

  // Fetch metrics data with V2 quality hooks
  const { 
    history: metricsData = [], 
    isLoadingHistory: isLoading,
    qualitySummary 
  } = useMetrics({ 
    metricTypes: [
      'Recovery Score',
      'Day Strain',
      'Average Heart Rate',
      'Heart Rate',
      'Resting Heart Rate',
      'Sleep Performance',
      'Sleep Efficiency',
      'Steps',
      'Active Calories',
      'Workout Calories',
      'Deep Sleep Duration',
      'Light Sleep Duration',
      'REM Sleep Duration',
      'Awake Duration',
      'Sleep Duration',
    ],
    withQuality: true,
    sourceFilter: deviceFilter,
    dateRange: {
      start: calculateDateRange.start.toISOString(),
      end: calculateDateRange.end.toISOString(),
    },
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

    // Group by metric_name
    const grouped = metricsData.reduce((acc, metric) => {
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

    // Process Heart Rate - try both possible names
    const heartRateData = grouped['Average Heart Rate'] || grouped['Heart Rate'] || grouped['Resting Heart Rate'];
    if (heartRateData) {
      metrics.heartRate = heartRateData.map(m => ({
        value: m.value,
        date: format(new Date(m.measurement_date), 'HH:mm', { locale: ru }),
      }));
    }

    // Process Sleep
    const sleepDates = new Set<string>();
    metricsData.forEach(m => {
      const name = m.metric_name.toLowerCase();
      if (name.includes('sleep')) {
        sleepDates.add(m.measurement_date.split('T')[0]);
      }
    });

    sleepDates.forEach(date => {
      const dayMetrics = metricsData.filter(m => m.measurement_date.startsWith(date));
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
      metrics.cards.push({
        name: 'Recovery',
        value: Math.round(recovery.latest.value),
        unit: '%',
        icon: Activity,
        color: 'bg-gradient-to-br from-green-400 to-emerald-500',
        source: recovery.latest.source,
        sparkline: recovery.history.slice(-7).map(h => ({ value: h.value })),
        confidence: qualitySummary?.find(q => q.metricName === 'Recovery Score')?.confidence || 0,
        trend: calculateTrend(recovery.history),
      });
    }

    // Strain card
    const strain = latestMetrics.find(m => m.name === 'Day Strain');
    if (strain) {
      metrics.cards.push({
        name: 'Day Strain',
        value: strain.latest.value.toFixed(1),
        icon: Zap,
        color: 'bg-gradient-to-br from-orange-400 to-red-500',
        source: strain.latest.source,
        sparkline: strain.history.slice(-7).map(h => ({ value: h.value })),
        confidence: qualitySummary?.find(q => q.metricName === 'Day Strain')?.confidence || 0,
        trend: calculateTrend(strain.history),
      });
    }

    // Heart Rate card - try multiple names
    const hr = latestMetrics.find(m => 
      m.name === 'Average Heart Rate' || 
      m.name === 'Heart Rate' || 
      m.name === 'Resting Heart Rate'
    );
    if (hr) {
      const age = new Date().getTime() - new Date(hr.latest.measurement_date).getTime();
      metrics.cards.push({
        name: 'Heart Rate',
        value: Math.round(hr.latest.value),
        unit: 'bpm',
        icon: Heart,
        color: 'bg-gradient-to-br from-red-400 to-pink-500',
        source: hr.latest.source,
        isStale: age > 24 * 60 * 60 * 1000,
        sparkline: hr.history.slice(-20).map(h => ({ value: h.value })),
        confidence: qualitySummary?.find(q => 
          q.metricName === 'Average Heart Rate' || 
          q.metricName === 'Heart Rate' || 
          q.metricName === 'Resting Heart Rate'
        )?.confidence || 0,
        trend: calculateTrend(hr.history),
      });
    }

    // Sleep card
    const sleep = latestMetrics.find(m => 
      m.name === 'Sleep Performance' || 
      m.name === 'Sleep Efficiency'
    );
    if (sleep) {
      metrics.cards.push({
        name: 'Sleep Score',
        value: Math.round(sleep.latest.value),
        unit: sleep.latest.unit === '%' ? '%' : '/100',
        icon: Moon,
        color: 'bg-gradient-to-br from-blue-400 to-indigo-500',
        source: sleep.latest.source,
        sparkline: sleep.history.slice(-7).map(h => ({ value: h.value })),
        confidence: qualitySummary?.find(q => 
          q.metricName === 'Sleep Performance' || 
          q.metricName === 'Sleep Efficiency'
        )?.confidence || 0,
        trend: calculateTrend(sleep.history),
      });
    }

    // Steps card
    const steps = latestMetrics.find(m => m.name === 'Steps');
    if (steps) {
      metrics.cards.push({
        name: 'Steps',
        value: Math.round(steps.latest.value).toLocaleString(),
        icon: Footprints,
        color: 'bg-gradient-to-br from-cyan-400 to-blue-500',
        source: steps.latest.source,
        sparkline: steps.history.slice(-7).map(h => ({ value: h.value })),
        confidence: qualitySummary?.find(q => q.metricName === 'Steps')?.confidence || 0,
        trend: calculateTrend(steps.history),
      });
    }

    // Calories card
    const calories = latestMetrics.find(m => 
      m.name === 'Active Calories' || 
      m.name === 'Workout Calories'
    );
    if (calories) {
      metrics.cards.push({
        name: 'Calories',
        value: Math.round(calories.latest.value),
        unit: 'kcal',
        icon: Flame,
        color: 'bg-gradient-to-br from-orange-400 to-red-400',
        source: calories.latest.source,
        sparkline: calories.history.slice(-7).map(h => ({ value: h.value })),
        confidence: qualitySummary?.find(q => 
          q.metricName === 'Active Calories' || 
          q.metricName === 'Workout Calories'
        )?.confidence || 0,
        trend: calculateTrend(calories.history),
      });
    }

    return metrics;
  }, [metricsData, qualitySummary]);

  // Calculate trend between last two values
  const calculateTrend = useCallback((history: any[]) => {
    if (history.length < 2) return undefined;
    
    const current = history[history.length - 1].value;
    const previous = history[history.length - 2].value;
    const change = ((current - previous) / previous) * 100;
    
    return {
      value: Math.round(Math.abs(change)),
      direction: change > 1 ? 'up' : change < -1 ? 'down' : 'neutral' as const
    };
  }, []);

  const getDateLabel = () => {
    const { start, end } = calculateDateRange;
    
    if (timeFilter === 'today') {
      return format(start, 'd MMMM yyyy', { locale: ru });
    }
    
    return `${format(start, 'd MMM', { locale: ru })} - ${format(end, 'd MMM yyyy', { locale: ru })}`;
  };

  const handlePreviousPeriod = () => setDateOffset(prev => prev + 1);
  const handleNextPeriod = () => setDateOffset(prev => Math.max(0, prev - 1));

  if (isLoading) {
    return <PageLoader message="Загрузка фитнес-данных..." />;
  }

  const latestRecovery = processedMetrics.recovery.length > 0 
    ? processedMetrics.recovery[processedMetrics.recovery.length - 1] 
    : null;

  return (
    <AnimatedPage className="container mx-auto p-4 md:p-6 space-y-6">
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

            {/* Device filters */}
            <MetricsViewToggle />
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
          {latestRecovery && latestRecovery.value && processedMetrics.recovery.length > 0 && (
            <FitnessCard variant="gradient" className="neon-border pulse-glow col-span-full">
              <div className="p-8">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center shadow-2xl shadow-emerald-500/50">
                      <Activity className="h-10 w-10 text-white" />
                    </div>
                    <div>
                      <Text className="text-muted-foreground text-sm font-medium mb-2">Recovery Score</Text>
                      <div className="flex items-baseline gap-2">
                        <Metric className="metric-glow text-6xl">{Math.round(latestRecovery.value)}</Metric>
                        <span className="text-2xl text-muted-foreground">%</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Recovery trend chart */}
                <div className="mt-6 pt-6 border-t border-white/10">
                  <Text className="text-sm text-muted-foreground mb-4">Тренд восстановления</Text>
                  <AreaChart
                    data={adaptMetricsToTremor(processedMetrics.recovery)}
                    index="date"
                    categories={['value']}
                    colors={['emerald']}
                    showLegend={false}
                    showGridLines={true}
                    className="h-40"
                    curveType="natural"
                    valueFormatter={(value) => `${value}%`}
                  />
                </div>
              </div>
            </FitnessCard>
          )}
          
          {/* Fallback if no recovery data */}
          {(!latestRecovery || !latestRecovery.value || processedMetrics.recovery.length === 0) && (
            <EmptyState
              icon={Activity}
              title="Нет данных Recovery Score"
              description={
                deviceFilter !== 'all'
                  ? `Нет данных от ${deviceFilter.toUpperCase()} за выбранный период`
                  : 'Нет данных за выбранный период'
              }
            />
          )}

          {/* Empty state if no data */}
          {processedMetrics.cards.length === 0 && (
            <EmptyState
              icon={Activity}
              title="Нет данных для отображения"
              description={
                deviceFilter !== 'all'
                  ? `Нет данных от ${deviceFilter.toUpperCase()} за выбранный период. Попробуйте выбрать другое устройство или временной период.`
                  : 'Нет данных за выбранный период. Попробуйте выбрать другой временной период.'
              }
            />
          )}

          {/* Metrics Grid with Framer Motion */}
          {processedMetrics.cards.length > 0 && (
            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              variants={staggerContainer}
              initial="initial"
              animate="animate"
            >
              {processedMetrics.cards.map((card, index) => (
                <motion.div 
                  key={card.name} 
                  variants={staggerItem}
                  className="stagger-item"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <MetricCard
                    name={card.name}
                    value={card.value}
                    unit={card.unit}
                    icon={card.icon}
                    color={card.color}
                    source={card.source}
                    isStale={card.isStale}
                    sparkline={card.sparkline}
                    confidence={card.confidence}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {processedMetrics.strain.length > 0 && (
              <FitnessCard variant="gradient" className="hover:scale-[1.01] transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                      <Zap className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Day Strain</CardTitle>
                      <CardDescription className="text-xs">Уровень напряжения</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <BarChart
                    data={adaptStrainToTremor(processedMetrics.strain)}
                    index="date"
                    categories={['Strain']}
                    colors={['orange']}
                    showGridLines={true}
                    className="h-64"
                    valueFormatter={valueFormatters.decimal}
                  />
                </CardContent>
              </FitnessCard>
            )}
            {processedMetrics.heartRate.length > 0 && (
              <FitnessCard variant="gradient" className="hover:scale-[1.01] transition-all">
                <CardHeader>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-red-400 to-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/30">
                      <Heart className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg">Heart Rate</CardTitle>
                      <CardDescription className="text-xs">Частота сердечных сокращений</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <AreaChart
                    data={processedMetrics.heartRate.map(d => ({ date: d.date, 'Heart Rate': d.value }))}
                    index="date"
                    categories={['Heart Rate']}
                    colors={['rose']}
                    showGridLines={true}
                    className="h-64"
                    valueFormatter={valueFormatters.bpm}
                  />
                </CardContent>
              </FitnessCard>
            )}
          </div>

          {processedMetrics.sleep.length > 0 && (
            <FitnessCard variant="gradient" className="hover:scale-[1.01] transition-all">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/30">
                    <Moon className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Sleep Stages</CardTitle>
                    <CardDescription className="text-xs">Фазы сна за выбранный период</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <BarChart
                  className="h-72"
                  data={adaptSleepToTremor(processedMetrics.sleep)}
                  index="date"
                  categories={['Deep Sleep', 'Light Sleep', 'REM Sleep', 'Awake']}
                  colors={['violet', 'cyan', 'fuchsia', 'amber']}
                  stack={true}
                  valueFormatter={valueFormatters.minutes}
                  showLegend={true}
                  showGridLines={true}
                  showAnimation={true}
                />
              </CardContent>
            </FitnessCard>
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
    </AnimatedPage>
  );
}
