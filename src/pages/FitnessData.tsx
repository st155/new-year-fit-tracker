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

      // For "all" source, use unified metrics
      if (selectedSource === 'all') {
        const { data: unifiedMetrics, error } = await supabase
          .rpc('get_unified_metrics', {
            p_user_id: user?.id,
            p_start_date: startDate.toISOString().split('T')[0],
            p_end_date: endDate.toISOString().split('T')[0]
          });

        if (error) throw error;

        // Convert unified metrics to the same format as regular metrics
        metrics = (unifiedMetrics || []).map((um: any) => ({
          metric_name: um.unified_metric_name,
          metric_category: um.unified_category,
          unit: um.unified_unit,
          source: 'unified',
          metric_values: [{
            value: um.aggregated_value,
            measurement_date: um.measurement_date
          }]
        }));
      } else {
        // Use cached metrics with prefetching for specific sources
        metrics = await getMetrics(startDate, endDate, selectedFilter);
      }

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

    const metricValues: { [key: string]: any } = {};

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
      const previousValue = sortedValues[1]?.value;

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
      
      // Для "all" (United Data) если есть несколько источников с одинаковым метриком - усредняем
      if (metricValues[metricKey]) {
        // Уже есть такой метрик от другого источника - усредним
        metricValues[metricKey].current = (metricValues[metricKey].current + currentValue) / 2;
        if (previousValue !== undefined && metricValues[metricKey].previous !== undefined) {
          metricValues[metricKey].previous = (metricValues[metricKey].previous + previousValue) / 2;
        }
      } else {
        metricValues[metricKey] = {
          current: currentValue,
          previous: previousValue,
          category: metric.metric_category,
          unit: metric.unit,
          source: metric.source
        };
      }
    });

    // Recovery - показываем только если данные есть
    const recoveryMetric = metricValues['Recovery Score'] || metricValues['Recovery'] || metricValues['HRV RMSSD'];
    if (recoveryMetric && recoveryMetric.current > 0) {
      // For HRV RMSSD, normalize to percentage (50-100 HRV = 30-100%)
      let recoveryValue = recoveryMetric.current;
      if (metricValues['HRV RMSSD'] && !metricValues['Recovery Score'] && !metricValues['Recovery']) {
        recoveryValue = Math.min(100, Math.max(0, (recoveryValue - 30) * 1.4));
      }
      result.recovery.score = Math.round(recoveryValue);
      result.recovery.status = recoveryValue > 70 ? 'Optimal' : recoveryValue > 40 ? 'Normal' : 'Low';
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
        borderColor: meta.color
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
        borderColor: meta.color
      });
    }

    // Recovery Score - показываем только если данные есть
    // Приоритет: Recovery Score (Whoop) > Training Readiness (Garmin) > Sleep Efficiency (Garmin) > HRV
    const recoveryForCard = 
      metricValues['Recovery Score'] || 
      metricValues['Recovery'] || 
      metricValues['Training Readiness'] ||
      metricValues['Sleep Efficiency'] ||
      metricValues['Sleep HRV RMSSD'] ||
      metricValues['HRV RMSSD'];
    
    if (recoveryForCard && recoveryForCard.current > 0) {
      let recoveryValue = recoveryForCard.current;
      
      // Normalize only for HRV metrics (50-100 HRV = 30-100%)
      if ((metricValues['Sleep HRV RMSSD'] || metricValues['HRV RMSSD']) && 
          !metricValues['Recovery Score'] && 
          !metricValues['Recovery'] &&
          !metricValues['Training Readiness'] &&
          !metricValues['Sleep Efficiency']) {
        recoveryValue = Math.min(100, Math.max(0, (recoveryValue - 30) * 1.4));
      }
      
      const meta = getMetricIcon('recovery', 'recovery');
      cards.push({
        name: 'Recovery',
        value: Math.round(recoveryValue) + '%',
        subtitle: recoveryValue > 70 ? 'Optimal' : recoveryValue > 40 ? 'Normal' : 'Low',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color
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
        borderColor: meta.color
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
        borderColor: meta.color
      });
    }

    // Heart Rate
    if (metricValues['Heart Rate'] || metricValues['Resting Heart Rate'] || metricValues['Average Heart Rate']) {
      const hr = metricValues['Heart Rate'] || metricValues['Resting Heart Rate'] || metricValues['Average Heart Rate'];
      const meta = getMetricIcon('cardio', 'heart');
      cards.push({
        name: metricValues['Resting Heart Rate'] ? 'Resting HR' : 'Heart Rate',
        value: Math.round(hr.current) + '',
        subtitle: 'bpm',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color
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
        borderColor: meta.color
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
        borderColor: meta.color
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
        borderColor: meta.color
      });
    }

    // HRV (если есть)
    if (metricValues['HRV'] || metricValues['Heart Rate Variability']) {
      const hrv = metricValues['HRV'] || metricValues['Heart Rate Variability'];
      const meta = getMetricIcon('recovery', 'hrv');
      cards.push({
        name: 'HRV',
        value: Math.round(hrv.current) + '',
        subtitle: 'ms',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color
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
        borderColor: meta.color
      });
    }

    // Любые другие метрики, которые мы еще не отобразили
    Object.keys(metricValues).forEach(metricKey => {
      // Пропускаем уже отображенные
      const displayedMetrics = [
        'Day Strain', 'Workout Strain', 'Sleep Duration', 'Sleep Quality', 'Sleep Performance',
        'Recovery Score', 'Recovery', 'VO2Max', 'Body Fat %', 'Heart Rate', 'Resting Heart Rate',
        'Average Heart Rate', 'Calories', 'Active Energy', 'Active Calories', 'Steps',
        'HRV', 'Heart Rate Variability', 'Workout Count'
      ];
      
      if (displayedMetrics.includes(metricKey)) return;
      
      const metric = metricValues[metricKey];
      const meta = getMetricIcon(metric.category, metricKey);
      
      cards.push({
        name: metricKey,
        value: Math.round(metric.current * 10) / 10 + '',
        subtitle: metric.unit || '',
        icon: meta.icon,
        color: meta.color,
        borderColor: meta.color
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
        <h2 className="text-xl font-bold text-white mb-4">Recovery</h2>
        
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
