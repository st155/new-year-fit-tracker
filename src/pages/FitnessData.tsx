import { useState, useEffect, useCallback } from "react";
import { Flame, Moon, Zap, Scale, Heart, Footprints, Wind, Dumbbell, Activity, TrendingUp, Watch } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFitnessDataCache } from "@/hooks/useFitnessDataCache";
import { IntegrationsCard } from "@/components/dashboard/integrations-card";
import { DateNavigator } from "@/components/dashboard/DateNavigator";
import { Button } from "@/components/ui/button";

interface MetricCard {
  name: string;
  value: string;
  subtitle: string;
  icon: any;
  color: string;
  borderColor: string;
  isUnified?: boolean;
  sourceCount?: number;
}

interface DashboardData {
  recovery: {
    score: number;
    status: string;
  };
  cards: MetricCard[];
}

type TimeFilter = 'today' | 'week' | 'month';
type SourceFilter = 'all' | 'whoop' | 'garmin' | 'ultrahuman';

export default function FitnessData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getMetrics, loading: cacheLoading } = useFitnessDataCache(user?.id);
  
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('today');
  const [selectedSource, setSelectedSource] = useState<SourceFilter>('all');
  const [dateOffset, setDateOffset] = useState(0);
  const [challengeGoals, setChallengeGoals] = useState<string[]>([]);
  const [data, setData] = useState<DashboardData>({
    recovery: { score: 0, status: '' },
    cards: []
  });

  useEffect(() => {
    if (user) {
      fetchChallengeGoals();
    }
  }, [user]);

  useEffect(() => {
    if (user && challengeGoals.length >= 0) {
      fetchDashboardData();
    }
  }, [user, challengeGoals, selectedFilter, dateOffset, selectedSource]);

  // Слушаем события обновления Whoop данных
  useEffect(() => {
    const handleWhoopUpdate = () => {
      console.log('Whoop data updated, refreshing...');
      fetchDashboardData();
    };
    
    window.addEventListener('whoop-data-updated', handleWhoopUpdate);
    
    return () => {
      window.removeEventListener('whoop-data-updated', handleWhoopUpdate);
    };
  }, [selectedSource, dateOffset]);

  const fetchChallengeGoals = async () => {
    try {
      // Get user's active challenges
      const { data: participations } = await supabase
        .from('challenge_participants')
        .select('challenge_id')
        .eq('user_id', user?.id);

      if (!participations || participations.length === 0) {
        setChallengeGoals([]);
        return;
      }

      // Get goals for those challenges
      const { data: goals } = await supabase
        .from('goals')
        .select('goal_name')
        .eq('is_personal', false)
        .in('challenge_id', participations.map(p => p.challenge_id));

      const goalNames = goals?.map(g => g.goal_name.toLowerCase()) || [];
      setChallengeGoals(goalNames);
    } catch (error) {
      console.error('Error fetching challenge goals:', error);
      setChallengeGoals([]);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Calculate date range based on selected filter and offset
      let startDate: Date;
      let endDate: Date;
      
      switch (selectedFilter) {
        case 'today':
          // Используем UTC дату для синхронизации с базой данных
          const now = new Date();
          const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dateOffset));
          startDate = new Date(utcDate.setUTCHours(0, 0, 0, 0));
          endDate = new Date(utcDate.setUTCHours(23, 59, 59, 999));
          
          // For Whoop, extend range to include yesterday for Recovery Score
          // (Whoop provides Recovery Score in the morning for the previous day)
          if (selectedSource === 'whoop') {
            startDate.setDate(startDate.getDate() - 1);
          }
          break;
        case 'week':
          const weekStart = new Date();
          weekStart.setDate(weekStart.getDate() + (dateOffset * 7) - 7);
          startDate = new Date(weekStart.setHours(0, 0, 0, 0));
          endDate = new Date();
          endDate.setDate(weekStart.getDate() + 7);
          break;
        case 'month':
          const monthStart = new Date();
          monthStart.setDate(monthStart.getDate() + (dateOffset * 30) - 30);
          startDate = new Date(monthStart.setHours(0, 0, 0, 0));
          endDate = new Date();
          endDate.setDate(monthStart.getDate() + 30);
          break;
      }
      
      let metrics: any[];

      // Load metrics from all sources or specific source
      metrics = await getMetrics(startDate, endDate, selectedFilter, selectedSource === 'all' ? undefined : selectedSource);

      // Process metrics to populate dashboard
      const processed = processMetrics(metrics);
      setData(processed);
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load data',
        variant: 'destructive'
      });
      setLoading(false);
    }
  };

  const handlePreviousPeriod = () => {
    setDateOffset(dateOffset - 1);
  };

  const handleNextPeriod = () => {
    if (dateOffset < 0) {
      setDateOffset(dateOffset + 1);
    }
  };

  const getDateLabel = () => {
    const now = new Date();
    switch (selectedFilter) {
      case 'today':
        const today = new Date(now);
        today.setDate(today.getDate() + dateOffset);
        return today.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
      case 'week':
        const weekStart = new Date(now);
        weekStart.setDate(weekStart.getDate() + (dateOffset * 7));
        return `Week of ${weekStart.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })}`;
      case 'month':
        const monthDate = new Date(now);
        monthDate.setMonth(monthDate.getMonth() + dateOffset);
        return monthDate.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
      default:
        return '';
    }
  };

  const isInChallengeGoals = (metricName: string): boolean => {
    if (challengeGoals.length === 0) return true; // Show all if no challenge
    
    const normalized = metricName.toLowerCase();
    return challengeGoals.some(goal => 
      normalized.includes(goal) || 
      goal.includes(normalized) ||
      (goal.includes('подтягивания') && normalized.includes('pull')) ||
      (goal.includes('жим') && normalized.includes('bench')) ||
      (goal.includes('выпады') && normalized.includes('lunge')) ||
      (goal.includes('планка') && normalized.includes('plank')) ||
      (goal.includes('отжимания') && normalized.includes('push')) ||
      (goal.includes('vo2') && normalized.includes('vo2')) ||
      (goal.includes('бег') && normalized.includes('run')) ||
      (goal.includes('жир') && normalized.includes('fat'))
    );
  };

  const processMetrics = (metrics: any[]): DashboardData => {
    const result: DashboardData = {
      recovery: { score: 0, status: '' },
      cards: []
    };

    if (!metrics) return result;

    // Функция определения веса источника
    const getSourceWeight = (source: string): number => {
      const s = source?.toLowerCase() || '';
      if (s === 'whoop') return 1.0;
      if (s === 'garmin') return 0.9;
      if (s === 'ultrahuman') return 0.8;
      if (s === 'manual' || s === 'apple_health') return 0.7;
      return 0.5;
    };

    // Store multiple sources per metric for weighted averaging
    const metricSources: { [key: string]: Array<{value: number, source: string, weight: number, date: string, category: string, unit: string}> } = {};

    // Обрабатываем метрики и фильтруем по источнику
    metrics.forEach(metric => {
      // Фильтруем по источнику на уровне metric
      if (selectedSource !== 'all' && metric.source?.toLowerCase() !== selectedSource) {
        return; // Пропускаем эту метрику, если источник не совпадает
      }

      const values = (metric as any).metric_values || [];
      if (values.length === 0) return;
      
      const sortedValues = [...values].sort((a, b) => 
        new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime()
      );
      
      const latestValue = sortedValues[0]?.value;

      let currentValue: number;
      
      // Для Day Strain берем максимальное значение за день (не сумму!)
      // Whoop рассчитывает Day Strain по формуле, а не суммирует тренировки
      if (selectedFilter === 'today' && (metric.metric_name === 'Day Strain' || metric.metric_name === 'Workout Strain')) {
        currentValue = Math.max(...sortedValues.map(v => v.value || 0));
      } else if (selectedFilter === 'today') {
        // For recovery metrics from Whoop, if no data today, take the latest available
        if (metric.metric_category === 'recovery' && selectedSource === 'whoop' && latestValue === undefined) {
          // Recovery Score is typically available from yesterday, not same day
          return; // Will be handled separately
        }
        currentValue = latestValue;
      } else {
        // Для week/month берем среднее
        const sum = sortedValues.reduce((acc, v) => acc + (v.value || 0), 0);
        currentValue = sum / sortedValues.length;
      }

      const metricKey = metric.metric_name;
      const weight = getSourceWeight(metric.source);
      
      if (!metricSources[metricKey]) {
        metricSources[metricKey] = [];
      }
      
      metricSources[metricKey].push({
        value: currentValue,
        source: metric.source,
        weight: weight,
        date: sortedValues[0]?.measurement_date,
        category: metric.metric_category,
        unit: metric.unit
      });
    });

    // Calculate weighted averages or single values
    const metricValues: { [key: string]: any } = {};
    
    Object.entries(metricSources).forEach(([metricName, sources]) => {
      if (selectedSource === 'all' && sources.length > 1) {
        // Взвешенное среднее для нескольких источников
        const totalWeight = sources.reduce((sum, s) => sum + s.weight, 0);
        const weightedSum = sources.reduce((sum, s) => sum + (s.value * s.weight), 0);
        const unified = weightedSum / totalWeight;
        
        // Список источников для отображения
        const sourcesStr = sources.map(s => s.source).join(' + ');
        
        metricValues[metricName] = {
          current: unified,
          category: sources[0].category,
          unit: sources[0].unit,
          source: sourcesStr,
          date: sources[0].date,
          isUnified: true,
          sourceCount: sources.length,
          sources: sources // Сохраняем все источники для детального отображения
        };
      } else {
        // Один источник - просто берем значение
        metricValues[metricName] = {
          current: sources[0].value,
          category: sources[0].category,
          unit: sources[0].unit,
          source: sources[0].source,
          date: sources[0].date,
          isUnified: false,
          sourceCount: 1
        };
      }
    });

    // Debug: log what metrics we have for recovery
    if (selectedSource === 'all') {
      console.log('🔍 [Recovery Debug] Available metrics:', {
        'Recovery Score': metricValues['Recovery Score'],
        'Training Readiness': metricValues['Training Readiness'],
        'Body Battery': metricValues['Body Battery'],
        'Movement Index': metricValues['Movement Index'],
        'Sleep Efficiency': metricValues['Sleep Efficiency'],
        'HRV RMSSD': metricValues['HRV RMSSD']
      });
    }

    // ========= UNIFIED RECOVERY SCORE ==========
    const getUnifiedRecovery = () => {
      if (selectedSource !== 'all') {
        // Если выбран конкретный источник - используем логику приоритета
        // Priority 1: Whoop Recovery Score (самый точный)
        if (metricValues['Recovery Score'] && metricValues['Recovery Score'].source?.toLowerCase() === 'whoop') {
          return {
            value: metricValues['Recovery Score'].current,
            source: 'Whoop',
            sourceName: 'Whoop Recovery',
            isNormalized: false,
            sourceCount: 1
          };
        }
        
        // Priority 2: Garmin Training Readiness
        if (metricValues['Training Readiness']) {
          return {
            value: metricValues['Training Readiness'].current,
            source: 'Garmin',
            sourceName: 'Training Readiness',
            isNormalized: false,
            sourceCount: 1
          };
        }
        
        // Priority 3: Garmin Body Battery
        if (metricValues['Body Battery']) {
          return {
            value: metricValues['Body Battery'].current,
            source: 'Garmin',
            sourceName: 'Body Battery',
            isNormalized: false,
            sourceCount: 1
          };
        }
        
        // Priority 4: Garmin Sleep Efficiency
        if (metricValues['Sleep Efficiency'] && metricValues['Sleep Efficiency'].source?.toLowerCase() === 'garmin') {
          return {
            value: metricValues['Sleep Efficiency'].current,
            source: 'Garmin',
            sourceName: 'Sleep Efficiency',
            isNormalized: false,
            sourceCount: 1
          };
        }
        
        // Priority 5: Ultrahuman Movement Index
        if (metricValues['Movement Index'] && metricValues['Movement Index'].source?.toLowerCase() === 'ultrahuman') {
          return {
            value: metricValues['Movement Index'].current,
            source: 'Ultrahuman',
            sourceName: 'Movement Index',
            isNormalized: false,
            sourceCount: 1
          };
        }

        // Priority 6: Ultrahuman HRV RMSSD (normalized)
        if (metricValues['HRV RMSSD'] && metricValues['HRV RMSSD'].source?.toLowerCase() === 'ultrahuman') {
          const hrv = metricValues['HRV RMSSD'].current;
          const normalized = Math.min(100, Math.max(0, ((hrv - 30) / 70) * 100));
          return {
            value: normalized,
            source: 'Ultrahuman',
            sourceName: 'HRV (normalized)',
            isNormalized: true,
            sourceCount: 1
          };
        }
        
        // Priority 7: Garmin Resting HR fallback
        if (metricValues['Resting Heart Rate'] && metricValues['Resting Heart Rate'].source?.toLowerCase() === 'garmin') {
          const restingHR = metricValues['Resting Heart Rate'].current;
          const normalized = Math.min(100, Math.max(0, 100 - ((restingHR - 40) / 40) * 100));
          return {
            value: normalized,
            source: 'Garmin',
            sourceName: 'Resting HR (normalized)',
            isNormalized: true,
            sourceCount: 1
          };
        }
        
        return null;
      } else {
        // UNIFIED MODE: weighted averaging with one metric per tracker (best available)
        const recoveryMetrics: Array<{value: number, source: string, weight: number, name: string, date?: string}> = [];
        
        // Priority 1: Whoop Recovery Score
        if (metricValues['Recovery Score']) {
          const sources = metricValues['Recovery Score'].sources || [metricValues['Recovery Score']];
          const whoopRecovery = sources.find((s: any) => s.source?.toLowerCase() === 'whoop');
          if (whoopRecovery || metricValues['Recovery Score'].source?.toLowerCase() === 'whoop') {
            recoveryMetrics.push({
              value: whoopRecovery?.value || metricValues['Recovery Score'].current,
              source: 'Whoop',
              weight: 1.0,
              name: 'Recovery',
              date: whoopRecovery?.date || metricValues['Recovery Score'].date
            });
          }
        }
        
        // Priority 2: Garmin - use ONLY the best available metric (no duplicates)
        if (metricValues['Training Readiness']) {
          recoveryMetrics.push({
            value: metricValues['Training Readiness'].current,
            source: 'Garmin',
            weight: 0.95,
            name: 'Readiness',
            date: metricValues['Training Readiness'].date
          });
        } else if (metricValues['Body Battery']) {
          recoveryMetrics.push({
            value: metricValues['Body Battery'].current,
            source: 'Garmin',
            weight: 0.9,
            name: 'Battery',
            date: metricValues['Body Battery'].date
          });
        } else if (metricValues['Sleep Efficiency']?.source?.toLowerCase() === 'garmin') {
          recoveryMetrics.push({
            value: metricValues['Sleep Efficiency'].current,
            source: 'Garmin',
            weight: 0.7,
            name: 'Sleep',
            date: metricValues['Sleep Efficiency'].date
          });
        }
        
        // Priority 3: Ultrahuman - use ONLY the best available metric (no duplicates)
        if (metricValues['Movement Index']?.source?.toLowerCase() === 'ultrahuman') {
          recoveryMetrics.push({
            value: metricValues['Movement Index'].current,
            source: 'Ultrahuman',
            weight: 0.85,
            name: 'Movement',
            date: metricValues['Movement Index'].date
          });
        } else if (metricValues['HRV RMSSD']?.source?.toLowerCase() === 'ultrahuman') {
          const hrv = metricValues['HRV RMSSD'].current;
          const normalized = Math.min(100, Math.max(0, ((hrv - 30) / 70) * 100));
          recoveryMetrics.push({
            value: normalized,
            source: 'Ultrahuman',
            weight: 0.6,
            name: 'HRV',
            date: metricValues['HRV RMSSD'].date
          });
        }
        
        if (recoveryMetrics.length === 0) return null;
        
        // Weighted average
        const totalWeight = recoveryMetrics.reduce((sum, m) => sum + m.weight, 0);
        const weightedSum = recoveryMetrics.reduce((sum, m) => sum + (m.value * m.weight), 0);
        const unifiedValue = weightedSum / totalWeight;
        
        // Create brief description
        const sourcesStr = recoveryMetrics
          .map(m => `${m.source} ${Math.round(m.value)}%`)
          .join(' + ');
        
        return {
          value: unifiedValue,
          source: 'Unified',
          sourceName: sourcesStr,
          isNormalized: false,
          sourceCount: recoveryMetrics.length
        };
      }
    };

    const unifiedRecovery = getUnifiedRecovery();
    if (unifiedRecovery && unifiedRecovery.value > 0) {
      result.recovery.score = Math.round(unifiedRecovery.value);
      result.recovery.status = unifiedRecovery.value > 70 ? 'Optimal' : unifiedRecovery.value > 40 ? 'Normal' : 'Low';
    }

    // Build cards - показываем ВСЕ доступные метрики
    const cards: MetricCard[] = [];

    // Функция для определения иконки и цвета по категории
    const getMetricIcon = (category: string, name: string) => {
      if (name.toLowerCase().includes('strain')) return { icon: Flame, color: '#F97316' };
      if (name.toLowerCase().includes('sleep')) return { icon: Moon, color: '#6366F1' };
      if (name.toLowerCase().includes('vo2')) return { icon: Wind, color: '#06B6D4' };
      if (name.toLowerCase().includes('fat')) return { icon: Scale, color: '#EF4444' };
      if (name.toLowerCase().includes('heart') || name.toLowerCase().includes('hr')) return { icon: Heart, color: '#EC4899' };
      if (name.toLowerCase().includes('step')) return { icon: Footprints, color: '#8B5CF6' };
      if (name.toLowerCase().includes('calor')) return { icon: Flame, color: '#F59E0B' };
      if (name.toLowerCase().includes('workout')) return { icon: Dumbbell, color: '#10B981' };
      if (name.toLowerCase().includes('recovery')) return { icon: TrendingUp, color: '#14B8A6' };
      
      switch (category) {
        case 'recovery': return { icon: TrendingUp, color: '#14B8A6' };
        case 'sleep': return { icon: Moon, color: '#6366F1' };
        case 'workout': return { icon: Dumbbell, color: '#10B981' };
        case 'cardio': return { icon: Activity, color: '#06B6D4' };
        case 'body': return { icon: Scale, color: '#EF4444' };
        default: return { icon: Activity, color: '#8B5CF6' };
      }
    };

    // Strain
    if ((metricValues['Day Strain'] || metricValues['Workout Strain'])) {
      const strain = metricValues['Day Strain'] || metricValues['Workout Strain'];
      const value = Math.round(strain.current * 10) / 10;
      const meta = getMetricIcon('workout', 'strain');
      cards.push({
        name: 'Strain',
        value: value.toString(),
        subtitle: value > 15 ? 'Very High' : value > 10 ? 'High' : 'Moderate',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: strain.isUnified,
        sourceCount: strain.sourceCount
      });
    }

    // Sleep Duration
    if (metricValues['Sleep Duration']) {
      const sleepDur = metricValues['Sleep Duration'];
      const hours = Math.floor(sleepDur.current);
      const minutes = Math.round((sleepDur.current - hours) * 60);
      const quality = metricValues['Sleep Quality'] || metricValues['Sleep Performance'];
      const meta = getMetricIcon('sleep', 'sleep');
      cards.push({
        name: 'Sleep',
        value: `${hours}h ${minutes}m`,
        subtitle: quality ? `Quality: ${Math.round(quality.current)}%` : '',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: sleepDur.isUnified,
        sourceCount: sleepDur.sourceCount
      });
    }

    // Recovery Card - show unified recovery with source
    if (unifiedRecovery && unifiedRecovery.value > 0) {
      const meta = getMetricIcon('recovery', 'recovery');
      cards.push({
        name: 'Recovery',
        value: Math.round(unifiedRecovery.value) + '%',
        subtitle: `${unifiedRecovery.sourceName} • ${result.recovery.status}`,
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: selectedSource === 'all' && unifiedRecovery.sourceCount > 1,
        sourceCount: unifiedRecovery.sourceCount
      });
    }

    // Movement Index (Ultrahuman) - show as separate card if available
    if (metricValues['Movement Index'] && metricValues['Movement Index'].source?.toLowerCase() === 'ultrahuman') {
      const movementIndex = metricValues['Movement Index'];
      const meta = getMetricIcon('recovery', 'movement');
      cards.push({
        name: 'Movement Index',
        value: Math.round(movementIndex.current) + '%',
        subtitle: movementIndex.current > 70 ? 'Excellent' : movementIndex.current > 50 ? 'Good' : 'Low',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: movementIndex.isUnified,
        sourceCount: movementIndex.sourceCount
      });
    }

    // VO2 Max
    if (metricValues['VO2Max']) {
      const vo2 = metricValues['VO2Max'];
      const meta = getMetricIcon('cardio', 'vo2');
      cards.push({
        name: 'VO2 Max',
        value: Math.round(vo2.current * 10) / 10 + '',
        subtitle: 'ml/kg/min',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: vo2.isUnified,
        sourceCount: vo2.sourceCount
      });
    }

    // Body Fat %
    if (metricValues['Body Fat %']) {
      const fat = metricValues['Body Fat %'];
      const diff = fat.previous ? fat.current - fat.previous : 0;
      const trend = diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
      const meta = getMetricIcon('body', 'fat');
      cards.push({
        name: 'Body Fat %',
        value: `${Math.round(fat.current * 10) / 10}%`,
        subtitle: trend,
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: fat.isUnified,
        sourceCount: fat.sourceCount
      });
    }

    // Heart Rate with stale data indicator
    if (metricValues['Heart Rate'] || metricValues['Resting Heart Rate'] || metricValues['Average Heart Rate']) {
      const hr = metricValues['Heart Rate'] || metricValues['Resting Heart Rate'] || metricValues['Average Heart Rate'];
      const meta = getMetricIcon('cardio', 'heart');
      
      // Check if data is stale (older than today)
      const isStale = selectedFilter === 'today' && hr.date && 
        new Date(hr.date).toDateString() !== new Date().toDateString();
      
      cards.push({
        name: metricValues['Resting Heart Rate'] ? 'Resting HR' : 'Heart Rate',
        value: Math.round(hr.current) + '',
        subtitle: isStale ? `bpm (${new Date(hr.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})` : 'bpm',
        icon: meta.icon,
        color: isStale ? '#EAB308' : meta.color,
        borderColor: isStale ? '#EAB308' : meta.color,
        isUnified: hr.isUnified,
        sourceCount: hr.sourceCount
      });
    }

    // Calories / Active Energy
    if (metricValues['Calories'] || metricValues['Active Energy'] || metricValues['Active Calories']) {
      const cal = metricValues['Calories'] || metricValues['Active Energy'] || metricValues['Active Calories'];
      const meta = getMetricIcon('workout', 'calor');
      cards.push({
        name: 'Calories',
        value: Math.round(cal.current) + '',
        subtitle: 'kcal',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: cal.isUnified,
        sourceCount: cal.sourceCount
      });
    }

    // Steps
    if (metricValues['Steps']) {
      const steps = metricValues['Steps'];
      const meta = getMetricIcon('cardio', 'step');
      cards.push({
        name: 'Steps',
        value: Math.round(steps.current).toLocaleString(),
        subtitle: 'per day',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: steps.isUnified,
        sourceCount: steps.sourceCount
      });
    }

    // Sleep Performance / Quality
    if (metricValues['Sleep Performance'] && !metricValues['Sleep Duration']) {
      const perf = metricValues['Sleep Performance'];
      const meta = getMetricIcon('sleep', 'sleep');
      cards.push({
        name: 'Sleep Quality',
        value: Math.round(perf.current) + '%',
        subtitle: perf.current > 80 ? 'Excellent' : perf.current > 60 ? 'Good' : 'Poor',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: perf.isUnified,
        sourceCount: perf.sourceCount
      });
    }

    // HRV with stale data indicator
    if (metricValues['HRV'] || metricValues['Heart Rate Variability']) {
      const hrv = metricValues['HRV'] || metricValues['Heart Rate Variability'];
      const meta = getMetricIcon('recovery', 'hrv');
      
      // Check if data is stale (older than today)
      const isStale = selectedFilter === 'today' && hrv.date && 
        new Date(hrv.date).toDateString() !== new Date().toDateString();
      
      cards.push({
        name: 'HRV',
        value: Math.round(hrv.current) + '',
        subtitle: isStale ? `ms (${new Date(hrv.date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })})` : 'ms',
        icon: meta.icon,
        color: isStale ? '#EAB308' : meta.color,
        borderColor: isStale ? '#EAB308' : meta.color,
        isUnified: hrv.isUnified,
        sourceCount: hrv.sourceCount
      });
    }

    // Workout Count
    if (metricValues['Workout Count']) {
      const count = metricValues['Workout Count'];
      const meta = getMetricIcon('workout', 'workout');
      cards.push({
        name: 'Workouts',
        value: Math.round(count.current) + '',
        subtitle: selectedFilter === 'today' ? 'today' : selectedFilter === 'week' ? 'this week' : 'this month',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: count.isUnified,
        sourceCount: count.sourceCount
      });
    }

    // Respiratory Rate (Whoop)
    if (metricValues['Respiratory Rate']) {
      const respRate = metricValues['Respiratory Rate'];
      const meta = getMetricIcon('recovery', 'respiratory');
      cards.push({
        name: 'Respiratory Rate',
        value: (Math.round(respRate.current * 10) / 10) + '',
        subtitle: 'brpm',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: respRate.isUnified,
        sourceCount: respRate.sourceCount
      });
    }

    // SpO2 / Blood Oxygen
    if (metricValues['SpO2'] || metricValues['Blood Oxygen']) {
      const spo2 = metricValues['SpO2'] || metricValues['Blood Oxygen'];
      const meta = getMetricIcon('recovery', 'spo2');
      cards.push({
        name: 'SpO2',
        value: (Math.round(spo2.current * 10) / 10) + '%',
        subtitle: 'Blood Oxygen',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: spo2.isUnified,
        sourceCount: spo2.sourceCount
      });
    }

    // Max Heart Rate
    if (metricValues['Max Heart Rate']) {
      const maxHR = metricValues['Max Heart Rate'];
      const meta = getMetricIcon('cardio', 'max_hr');
      cards.push({
        name: 'Max Heart Rate',
        value: Math.round(maxHR.current) + '',
        subtitle: 'bpm',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: maxHR.isUnified,
        sourceCount: maxHR.sourceCount
      });
    }

    // Time in Bed (Whoop/Garmin)
    if (metricValues['Time in Bed']) {
      const timeInBed = metricValues['Time in Bed'];
      const hours = Math.floor(timeInBed.current);
      const minutes = Math.round((timeInBed.current - hours) * 60);
      const meta = getMetricIcon('sleep', 'time_in_bed');
      cards.push({
        name: 'Time in Bed',
        value: `${hours}:${minutes.toString().padStart(2, '0')}`,
        subtitle: 'hours',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: timeInBed.isUnified,
        sourceCount: timeInBed.sourceCount
      });
    }

    // ========= SHOW ALL OTHER AVAILABLE METRICS ==========
    // Exclude metrics already shown in specific cards above
    const shownMetrics = new Set([
      'Day Strain', 'Workout Strain', 'Sleep Duration', 'Sleep Quality', 'Sleep Performance',
      'Recovery Score', 'Recovery', 'Training Readiness', 'Sleep Efficiency', 
      'VO2Max', 'Body Fat %', 'Heart Rate', 'Resting Heart Rate', 'Average Heart Rate',
      'Calories', 'Active Energy', 'Active Calories', 'Steps', 'Weight',
      'HRV RMSSD', 'Sleep HRV RMSSD', 'HRV', 'Heart Rate Variability', 'Workout Count',
      'Ultrahuman Recovery', 'Movement Index',
      'Respiratory Rate', 'SpO2', 'Blood Oxygen', 'Max Heart Rate', 'Time in Bed'
    ]);

    // Add all other metrics dynamically
    Object.entries(metricValues).forEach(([metricName, metricData]) => {
      if (shownMetrics.has(metricName)) return;
      if (!metricData.current || metricData.current === 0) return;

      const meta = getMetricIcon(metricData.category || 'activity', metricName);
      
      // Format value based on metric type
      let formattedValue = '';
      let subtitle = '';
      
      if (metricData.unit === '%') {
        formattedValue = `${Math.round(metricData.current)}%`;
      } else if (metricData.unit === 'bpm') {
        formattedValue = `${Math.round(metricData.current)}`;
        subtitle = 'bpm';
      } else if (metricData.unit === 'ms') {
        formattedValue = `${Math.round(metricData.current)}`;
        subtitle = 'ms';
      } else if (metricData.unit === 'kcal') {
        formattedValue = `${Math.round(metricData.current)}`;
        subtitle = 'kcal';
      } else if (metricName.toLowerCase().includes('duration') || metricName.toLowerCase().includes('time')) {
        const hours = Math.floor(metricData.current);
        const minutes = Math.round((metricData.current - hours) * 60);
        formattedValue = `${hours}h ${minutes}m`;
      } else {
        formattedValue = `${Math.round(metricData.current * 10) / 10}`;
        subtitle = metricData.unit || '';
      }

      // Add source info if available
      if (metricData.isUnified && metricData.sourceCount > 1) {
        subtitle = subtitle ? `${subtitle} • ${metricData.sourceCount} sources` : `${metricData.sourceCount} sources`;
      } else if (metricData.source && selectedSource === 'all' && !metricData.isUnified) {
        subtitle = subtitle ? `${subtitle} • ${metricData.source}` : metricData.source;
      }

      cards.push({
        name: metricName,
        value: formattedValue,
        subtitle: subtitle,
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color,
        isUnified: metricData.isUnified,
        sourceCount: metricData.sourceCount
      });
    });

    result.cards = cards;
    return result;
  };

  const sourceOptions = [
    { value: 'all', label: 'United Data', icon: Activity },
    { value: 'whoop', label: 'Whoop', icon: Zap },
    { value: 'garmin', label: 'Garmin', icon: Watch },
    { value: 'ultrahuman', label: 'Ultrahuman', icon: TrendingUp }
  ];

  const getRecoveryColor = () => {
    const score = data.recovery.score;
    if (score >= 70) return { color: '#10B981', shadow: '#10B98166' };
    if (score >= 40) return { color: '#FBBF24', shadow: '#FBBF2466' };
    return { color: '#EF4444', shadow: '#EF444466' };
  };

  const recoveryColor = getRecoveryColor();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground tracking-wider">
            FITNESS TRACKER DATA
          </h1>
          <p className="text-muted-foreground mt-1">Просмотр данных с ваших фитнес-устройств</p>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {sourceOptions.map((source) => {
            const Icon = source.icon;
            return (
              <Button
                key={source.value}
                variant={selectedSource === source.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedSource(source.value as SourceFilter)}
                className="gap-2"
              >
                <Icon className="w-4 h-4" />
                {source.label}
              </Button>
            );
          })}
        </div>
      </div>
      
      <div className="mb-6">
        <DateNavigator
          selectedFilter={selectedFilter}
          dateOffset={dateOffset}
          onFilterChange={setSelectedFilter}
          onDateOffsetChange={setDateOffset}
          getDateLabel={getDateLabel}
        />
      </div>

      {/* Hero Card: Recovery */}
      {data.recovery.score > 0 && (
        <div
          className="relative rounded-3xl p-6 mb-4 transition-all duration-300"
          style={{
            background: 'rgba(0, 0, 0, 0.3)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
            border: '2px solid',
            borderColor: recoveryColor.color,
            boxShadow: `0 0 30px ${recoveryColor.color}66`
          }}
        >
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">
                {selectedSource === 'all' ? 'Recovery Index' : 'Recovery'}
              </h2>
              {selectedSource === 'all' && data.recovery.score > 0 && (
                <p className="text-white/60 text-xs mt-1">
                  {(() => {
                    const recoveryCard = data.cards.find(c => c.name === 'Recovery');
                    if (recoveryCard?.subtitle) {
                      // Extract source names from subtitle (format: "Whoop 89% + Ultrahuman 50% • Status")
                      const sources = recoveryCard.subtitle.split(' • ')[0];
                      return sources;
                    }
                    return 'Unified data';
                  })()}
                </p>
              )}
            </div>
            {selectedSource === 'all' && data.recovery.score > 0 && (
              <div className="bg-primary/10 backdrop-blur px-3 py-1 rounded-full text-xs text-white flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {data.cards.find(c => c.name === 'Recovery')?.sourceCount || 1} sources
              </div>
            )}
          </div>
          
          <div className="flex items-center justify-center">
            {/* Donut Chart - Smaller */}
            <div className="relative w-32 h-32">
              <svg className="w-full h-full transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.1)"
                  strokeWidth="12"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="52"
                  fill="none"
                  stroke={recoveryColor.color}
                  strokeWidth="12"
                  strokeDasharray={`${2 * Math.PI * 52 * (data.recovery.score / 100)} ${2 * Math.PI * 52}`}
                  strokeLinecap="round"
                  style={{
                    filter: `drop-shadow(0 0 6px ${recoveryColor.color})`
                  }}
                />
              </svg>
              
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="text-3xl font-bold text-white">{data.recovery.score}%</div>
                <div className="text-xs text-white/80">{data.recovery.status}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {data.cards.map((card, idx) => (
          <div
            key={idx}
            className="relative rounded-2xl p-4 transition-all duration-300"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '2px solid',
              borderColor: card.borderColor,
              boxShadow: `0 0 15px ${card.color}44`
            }}
          >
            <div 
              className="w-10 h-10 rounded-full flex items-center justify-center mb-3"
              style={{
                background: `linear-gradient(135deg, ${card.color}22, ${card.color}44)`
              }}
            >
              <card.icon className="h-5 w-5" style={{ color: card.color }} />
            </div>
            
            <h3 className="text-white text-sm font-bold mb-1">{card.name}</h3>
            <div className="text-white text-2xl font-bold mb-0.5">{card.value}</div>
            <div className="text-white/70 text-xs">{card.subtitle}</div>
          </div>
        ))}
      </div>

      {/* Integrations Status - moved to bottom */}
      <div className="mt-6">
        <IntegrationsCard />
      </div>
    </div>
  );
}
