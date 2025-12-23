import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { subDays, format } from 'date-fns';
import type { UnifiedRecommendation } from './useAllRecommendations';

interface MetricData {
  date: string;
  value: number;
  source: string;
}

async function fetchMetricData(
  userId: string,
  metricName: string,
  days: number = 7
): Promise<MetricData[]> {
  const endDate = new Date();
  const startDate = subDays(endDate, days);

  const { data } = await supabase
    .from('unified_metrics')
    .select('measurement_date, value, source')
    .eq('user_id', userId)
    .eq('metric_name', metricName)
    .gte('measurement_date', format(startDate, 'yyyy-MM-dd'))
    .lt('measurement_date', format(endDate, 'yyyy-MM-dd'))
    .order('measurement_date', { ascending: true });

  return (data || []).map(item => ({
    date: item.measurement_date,
    value: item.value,
    source: item.source || 'unknown',
  }));
}

function calculateTrend(data: MetricData[]): 'increasing' | 'decreasing' | 'stable' {
  if (data.length < 3) return 'stable';
  
  const recent = data.slice(-3);
  const isDecreasing = recent[0].value > recent[1].value && recent[1].value > recent[2].value;
  const isIncreasing = recent[0].value < recent[1].value && recent[1].value < recent[2].value;
  
  if (isDecreasing) return 'decreasing';
  if (isIncreasing) return 'increasing';
  return 'stable';
}

function getAverage(data: MetricData[]): number {
  if (data.length === 0) return 0;
  return data.reduce((sum, d) => sum + d.value, 0) / data.length;
}

function getLatest(data: MetricData[]): MetricData | null {
  return data.length > 0 ? data[data.length - 1] : null;
}

function generateRecommendationsFromMetrics(metrics: {
  recovery: MetricData[];
  hrv: MetricData[];
  sleepDuration: MetricData[];
  sleepEfficiency: MetricData[];
  strain: MetricData[];
  restingHr: MetricData[];
}): UnifiedRecommendation[] {
  const recommendations: UnifiedRecommendation[] = [];
  const now = new Date().toISOString();

  // === Recovery Analysis ===
  const latestRecovery = getLatest(metrics.recovery);
  const avgRecovery = getAverage(metrics.recovery);
  const recoveryTrend = calculateTrend(metrics.recovery);

  if (latestRecovery && latestRecovery.value < 50) {
    recommendations.push({
      id: 'recovery-low-today',
      category: 'exercise',
      source: 'device',
      title: 'Низкое восстановление сегодня',
      description: `Recovery ${Math.round(latestRecovery.value)}% — рекомендуем лёгкую активность или отдых вместо интенсивной тренировки.`,
      priority: 'high',
      status: 'pending',
      actionable: false,
      metadata: {
        deviceSource: latestRecovery.source,
        confidence: 0.9,
      },
      createdAt: now,
    });
  } else if (avgRecovery > 0 && avgRecovery < 60) {
    recommendations.push({
      id: 'recovery-low-week',
      category: 'sleep',
      source: 'device',
      title: 'Восстановление ниже нормы',
      description: `Среднее recovery за неделю ${Math.round(avgRecovery)}%. Уделите внимание качеству сна и управлению стрессом.`,
      priority: 'medium',
      status: 'pending',
      actionable: false,
      metadata: {
        confidence: 0.85,
      },
      createdAt: now,
    });
  }

  if (recoveryTrend === 'decreasing' && latestRecovery && latestRecovery.value < 70) {
    recommendations.push({
      id: 'recovery-declining',
      category: 'lifestyle',
      source: 'ai',
      title: 'Recovery снижается',
      description: 'Тренд recovery направлен вниз 3+ дня. Возможна перетренированность или накопленный стресс.',
      priority: 'high',
      status: 'pending',
      actionable: false,
      metadata: {
        confidence: 0.8,
      },
      createdAt: now,
    });
  }

  // === HRV Analysis ===
  const latestHrv = getLatest(metrics.hrv);
  const avgHrv = getAverage(metrics.hrv);
  const hrvTrend = calculateTrend(metrics.hrv);

  if (hrvTrend === 'decreasing' && metrics.hrv.length >= 3) {
    const drop = metrics.hrv[0].value - (latestHrv?.value || 0);
    if (drop > 10) {
      recommendations.push({
        id: 'hrv-declining',
        category: 'lifestyle',
        source: 'device',
        title: 'HRV снижается',
        description: `HRV упало на ${Math.round(drop)} ms за последние дни. Это может указывать на стресс, недосып или начало болезни.`,
        priority: 'high',
        status: 'pending',
        actionable: false,
        metadata: {
          deviceSource: latestHrv?.source,
          confidence: 0.85,
        },
        createdAt: now,
      });
    }
  }

  // === Sleep Duration Analysis ===
  const avgSleepDuration = getAverage(metrics.sleepDuration);
  const latestSleep = getLatest(metrics.sleepDuration);

  if (avgSleepDuration > 0 && avgSleepDuration < 7) {
    recommendations.push({
      id: 'sleep-duration-low',
      category: 'sleep',
      source: 'device',
      title: 'Недостаточно сна',
      description: `Среднее время сна ${avgSleepDuration.toFixed(1)} ч за неделю. Цель — 7-8 часов для оптимального восстановления.`,
      priority: avgSleepDuration < 6 ? 'high' : 'medium',
      status: 'pending',
      actionable: false,
      metadata: {
        deviceSource: latestSleep?.source,
        confidence: 0.9,
      },
      createdAt: now,
    });
  }

  // === Sleep Efficiency Analysis ===
  const avgEfficiency = getAverage(metrics.sleepEfficiency);
  const latestEfficiency = getLatest(metrics.sleepEfficiency);

  if (avgEfficiency > 0 && avgEfficiency < 85) {
    recommendations.push({
      id: 'sleep-efficiency-low',
      category: 'sleep',
      source: 'ai',
      title: 'Качество сна можно улучшить',
      description: `Эффективность сна ${Math.round(avgEfficiency)}%. Попробуйте: затемнение, прохладу 18-19°C, отказ от экранов за час до сна.`,
      priority: avgEfficiency < 75 ? 'high' : 'medium',
      status: 'pending',
      actionable: false,
      metadata: {
        deviceSource: latestEfficiency?.source,
        confidence: 0.8,
      },
      createdAt: now,
    });
  }

  // === Strain Analysis ===
  const avgStrain = getAverage(metrics.strain);
  const latestStrain = getLatest(metrics.strain);

  if (latestRecovery && latestStrain) {
    // High strain with low recovery = overtrain risk
    if (latestStrain.value > 15 && latestRecovery.value < 50) {
      recommendations.push({
        id: 'strain-recovery-mismatch',
        category: 'exercise',
        source: 'ai',
        title: 'Высокая нагрузка при низком recovery',
        description: `Strain ${latestStrain.value.toFixed(1)} при recovery ${Math.round(latestRecovery.value)}%. Риск перетренированности — снизьте интенсивность.`,
        priority: 'high',
        status: 'pending',
        actionable: false,
        metadata: {
          confidence: 0.85,
        },
        createdAt: now,
      });
    }
  }

  // === Resting Heart Rate Analysis ===
  const latestRhr = getLatest(metrics.restingHr);
  const rhrTrend = calculateTrend(metrics.restingHr);

  if (rhrTrend === 'increasing' && metrics.restingHr.length >= 3) {
    const rise = (latestRhr?.value || 0) - metrics.restingHr[0].value;
    if (rise > 5) {
      recommendations.push({
        id: 'rhr-rising',
        category: 'lifestyle',
        source: 'device',
        title: 'Пульс покоя растёт',
        description: `RHR вырос на ${Math.round(rise)} bpm за последние дни. Это может указывать на стресс, недосып или начало заболевания.`,
        priority: rise > 10 ? 'high' : 'medium',
        status: 'pending',
        actionable: false,
        metadata: {
          deviceSource: latestRhr?.source,
          confidence: 0.8,
        },
        createdAt: now,
      });
    }
  }

  // === Positive Recommendations ===
  if (latestRecovery && latestRecovery.value >= 80) {
    recommendations.push({
      id: 'recovery-high-today',
      category: 'exercise',
      source: 'device',
      title: 'Отличное восстановление!',
      description: `Recovery ${Math.round(latestRecovery.value)}% — идеальный день для интенсивной тренировки или PR.`,
      priority: 'low',
      status: 'pending',
      actionable: false,
      metadata: {
        deviceSource: latestRecovery.source,
        confidence: 0.9,
      },
      createdAt: now,
    });
  }

  return recommendations;
}

export function useMetricsRecommendations(userId: string | undefined) {
  return useQuery({
    queryKey: ['metrics-recommendations', userId],
    queryFn: async () => {
      if (!userId) return [];

      // Fetch all relevant metrics in parallel
      const [recovery, hrv, sleepDuration, sleepEfficiency, strain, restingHr] = await Promise.all([
        fetchMetricData(userId, 'Recovery Score'),
        fetchMetricData(userId, 'HRV'),
        fetchMetricData(userId, 'Sleep Duration'),
        fetchMetricData(userId, 'Sleep Efficiency'),
        fetchMetricData(userId, 'Day Strain'),
        fetchMetricData(userId, 'Resting Heart Rate'),
      ]);

      return generateRecommendationsFromMetrics({
        recovery,
        hrv,
        sleepDuration,
        sleepEfficiency,
        strain,
        restingHr,
      });
    },
    enabled: !!userId,
    staleTime: 10 * 60 * 1000, // 10 minutes
  });
}
