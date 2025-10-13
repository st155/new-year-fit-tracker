import { useState, useEffect, useCallback } from "react";
import { Flame, Moon, Zap, Scale, Heart, Footprints, Wind, Dumbbell, Activity, TrendingUp } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useFitnessDataCache } from "@/hooks/useFitnessDataCache";
import { IntegrationsCard } from "@/components/dashboard/integrations-card";
import { DateNavigator } from "@/components/dashboard/DateNavigator";

interface MetricCard {
  name: string;
  value: string;
  subtitle: string;
  icon: any;
  color: string;
  borderColor: string;
}

interface DashboardData {
  readiness: {
    score: number;
    status: string;
  };
  cards: MetricCard[];
}

type TimeFilter = 'today' | 'week' | 'month';

export default function FitnessData() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { getMetrics, loading: cacheLoading } = useFitnessDataCache(user?.id);
  
  const [loading, setLoading] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<TimeFilter>('today');
  const [dateOffset, setDateOffset] = useState(0);
  const [challengeGoals, setChallengeGoals] = useState<string[]>([]);
  const [data, setData] = useState<DashboardData>({
    readiness: { score: 0, status: '' },
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
  }, [user, challengeGoals, selectedFilter, dateOffset]);

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
      
      // Use cached metrics with prefetching
      const metrics = await getMetrics(startDate, endDate, selectedFilter);

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
        // Используем UTC дату для корректного отображения
        const utcDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + dateOffset));
        if (dateOffset === 0) return 'Today';
        if (dateOffset === -1) return 'Yesterday';
        return utcDate.toLocaleDateString('en-US', { day: 'numeric', month: 'short', timeZone: 'UTC' });
      case 'week':
        if (dateOffset === 0) return 'Week';
        return `${Math.abs(dateOffset)} week${Math.abs(dateOffset) > 1 ? 's' : ''} ago`;
      case 'month':
        if (dateOffset === 0) return 'Month';
        return `${Math.abs(dateOffset)} month${Math.abs(dateOffset) > 1 ? 's' : ''} ago`;
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
      readiness: { score: 85, status: 'Optimal' },
      cards: []
    };

    if (!metrics) return result;

    const metricValues: { [key: string]: any } = {};

    metrics.forEach(metric => {
      const values = (metric as any).metric_values || [];
      if (values.length === 0) return;
      
      const sortedValues = [...values].sort((a, b) => 
        new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime()
      );
      
      // Calculate average for the period
      const sum = sortedValues.reduce((acc, v) => acc + (v.value || 0), 0);
      const avgValue = sum / sortedValues.length;
      const latestValue = sortedValues[0]?.value;
      const previousValue = sortedValues[1]?.value;

      const currentValue = (selectedFilter === 'today' && metric.metric_name === 'Workout Strain')
        ? sum
        : (selectedFilter === 'today' ? latestValue : avgValue);

      metricValues[metric.metric_name] = {
        current: currentValue,
        previous: previousValue,
        category: metric.metric_category,
        unit: metric.unit
      };
    });

    // Readiness
    if (metricValues['Recovery Score'] || metricValues['Recovery']) {
      const recovery = metricValues['Recovery Score'] || metricValues['Recovery'];
      result.readiness.score = Math.round(recovery.current);
      result.readiness.status = recovery.current > 70 ? 'Optimal' : recovery.current > 40 ? 'Normal' : 'Low';
    }

    // Build cards - only for challenge goals
    const cards: MetricCard[] = [];

    // Strain (always show if available)
    if ((metricValues['Day Strain'] || metricValues['Workout Strain'])) {
      const strain = metricValues['Day Strain'] || metricValues['Workout Strain'];
      const value = Math.round(strain.current * 10) / 10;
      cards.push({
        name: 'Strain',
        value: value.toString(),
        subtitle: value > 15 ? 'Very High' : value > 10 ? 'High' : 'Moderate',
        icon: Flame,
        color: '#F97316',
        borderColor: '#F97316'
      });
    }

    // Sleep (always show if available)
    if (metricValues['Sleep Duration']) {
      const sleepDur = metricValues['Sleep Duration'];
      const hours = Math.floor(sleepDur.current);
      const minutes = Math.round((sleepDur.current - hours) * 60);
      const quality = metricValues['Sleep Quality'] || metricValues['Sleep Performance'];
      cards.push({
        name: 'Sleep',
        value: `${hours}h ${minutes}m`,
        subtitle: quality ? `Quality: ${Math.round(quality.current)}%` : '',
        icon: Moon,
        color: '#6366F1',
        borderColor: '#6366F1'
      });
    }

    // VO2 Max (challenge goal)
    if (metricValues['VO2Max'] && isInChallengeGoals('vo2max')) {
      const vo2 = metricValues['VO2Max'];
      cards.push({
        name: 'VO2 Max',
        value: Math.round(vo2.current * 10) / 10 + '',
        subtitle: 'ml/kg/min',
        icon: Wind,
        color: '#06B6D4',
        borderColor: '#06B6D4'
      });
    }

    // Body Fat (challenge goal)
    if (metricValues['Body Fat %'] && isInChallengeGoals('жир')) {
      const fat = metricValues['Body Fat %'];
      const diff = fat.previous ? fat.current - fat.previous : 0;
      const trend = diff > 0 ? `+${diff.toFixed(1)}%` : `${diff.toFixed(1)}%`;
      cards.push({
        name: 'Body Fat %',
        value: `${Math.round(fat.current * 10) / 10}%`,
        subtitle: trend,
        icon: Scale,
        color: '#10B981',
        borderColor: '#10B981'
      });
    }

    // Pull-ups (challenge goal)
    if (metricValues['Pull-ups'] && isInChallengeGoals('подтягивания')) {
      const pullups = metricValues['Pull-ups'];
      cards.push({
        name: 'Pull-ups',
        value: Math.round(pullups.current) + '',
        subtitle: 'reps',
        icon: Dumbbell,
        color: '#A855F7',
        borderColor: '#A855F7'
      });
    }

    // Bench Press (challenge goal)
    if (metricValues['Bench Press'] && isInChallengeGoals('жим')) {
      const bench = metricValues['Bench Press'];
      cards.push({
        name: 'Bench Press',
        value: Math.round(bench.current) + '',
        subtitle: 'kg',
        icon: Dumbbell,
        color: '#EF4444',
        borderColor: '#EF4444'
      });
    }

    // Push-ups (challenge goal)
    if (metricValues['Push-ups'] && isInChallengeGoals('отжимания')) {
      const pushups = metricValues['Push-ups'];
      cards.push({
        name: 'Push-ups',
        value: Math.round(pushups.current) + '',
        subtitle: 'reps',
        icon: Dumbbell,
        color: '#FBBF24',
        borderColor: '#FBBF24'
      });
    }

    // Plank (challenge goal)
    if (metricValues['Plank'] && isInChallengeGoals('планка')) {
      const plank = metricValues['Plank'];
      cards.push({
        name: 'Plank',
        value: Math.round(plank.current) + '',
        subtitle: 'min',
        icon: Activity,
        color: '#8B5CF6',
        borderColor: '#8B5CF6'
      });
    }

    // 1km Run (challenge goal)
    if (metricValues['1km Run'] && isInChallengeGoals('бег')) {
      const run = metricValues['1km Run'];
      cards.push({
        name: '1km Run',
        value: Math.round(run.current * 10) / 10 + '',
        subtitle: 'min',
        icon: Footprints,
        color: '#06B6D4',
        borderColor: '#06B6D4'
      });
    }

    // Lunges (challenge goal)
    if (metricValues['Lunges'] && isInChallengeGoals('выпады')) {
      const lunges = metricValues['Lunges'];
      cards.push({
        name: 'Lunges',
        value: Math.round(lunges.current) + '',
        subtitle: 'kg×8',
        icon: Dumbbell,
        color: '#84CC16',
        borderColor: '#84CC16'
      });
    }

    // General tracker metrics (always show if available)
    if (metricValues['Steps']) {
      const steps = metricValues['Steps'];
      cards.push({
        name: 'Steps',
        value: Math.round(steps.current).toString(),
        subtitle: 'per day',
        icon: Footprints,
        color: '#22C55E',
        borderColor: '#22C55E'
      });
    }

    if (metricValues['Workout Calories'] || metricValues['Active Calories']) {
      const cals = metricValues['Workout Calories'] || metricValues['Active Calories'];
      cards.push({
        name: 'Calories',
        value: Math.round(cals.current).toString(),
        subtitle: 'kcal',
        icon: Flame,
        color: '#EF4444',
        borderColor: '#EF4444'
      });
    }

    if (metricValues['Heart Rate Avg'] || metricValues['Average Heart Rate']) {
      const hr = metricValues['Heart Rate Avg'] || metricValues['Average Heart Rate'];
      cards.push({
        name: 'Avg Heart Rate',
        value: Math.round(hr.current).toString(),
        subtitle: 'bpm',
        icon: Heart,
        color: '#F43F5E',
        borderColor: '#F43F5E'
      });
    }

    if (metricValues['Resting Heart Rate']) {
      const rhr = metricValues['Resting Heart Rate'];
      cards.push({
        name: 'Resting HR',
        value: Math.round(rhr.current).toString(),
        subtitle: 'bpm',
        icon: Heart,
        color: '#EC4899',
        borderColor: '#EC4899'
      });
    }

    if (metricValues['Weight']) {
      const w = metricValues['Weight'];
      cards.push({
        name: 'Weight',
        value: (Math.round(w.current * 10) / 10).toString(),
        subtitle: 'kg',
        icon: Scale,
        color: '#10B981',
        borderColor: '#10B981'
      });
    }

    if (metricValues['Distance']) {
      const d = metricValues['Distance'];
      cards.push({
        name: 'Distance',
        value: (Math.round(d.current * 10) / 10).toString(),
        subtitle: 'km',
        icon: Activity,
        color: '#06B6D4',
        borderColor: '#06B6D4'
      });
    }

    if (metricValues['HRV'] || metricValues['Heart Rate Variability']) {
      const hrv = metricValues['HRV'] || metricValues['Heart Rate Variability'];
      cards.push({
        name: 'HRV',
        value: Math.round(hrv.current).toString(),
        subtitle: 'ms',
        icon: Heart,
        color: '#8B5CF6',
        borderColor: '#8B5CF6'
      });
    }

    if (metricValues['Workout Count']) {
      const wc = metricValues['Workout Count'];
      cards.push({
        name: 'Workouts',
        value: Math.round(wc.current).toString(),
        subtitle: 'total',
        icon: Dumbbell,
        color: '#F59E0B',
        borderColor: '#F59E0B'
      });
    }

    if (metricValues['Exercise Minutes']) {
      const em = metricValues['Exercise Minutes'];
      cards.push({
        name: 'Activity',
        value: Math.round(em.current).toString(),
        subtitle: 'min',
        icon: Zap,
        color: '#FBBF24',
        borderColor: '#FBBF24'
      });
    }

    // Add all remaining metrics that aren't already added
    Object.keys(metricValues).forEach(metricName => {
      const alreadyAdded = cards.some(c => 
        c.name.toLowerCase().includes(metricName.toLowerCase()) ||
        metricName.toLowerCase().includes(c.name.toLowerCase())
      );
      
      if (!alreadyAdded) {
        const metric = metricValues[metricName];
        cards.push({
          name: metricName,
          value: (Math.round(metric.current * 10) / 10).toString(),
          subtitle: metric.unit || '',
          icon: Activity,
          color: '#64748B',
          borderColor: '#64748B'
        });
      }
    });

    result.cards = cards;
    return result;
  };

  const getReadinessColor = (score: number) => {
    if (score > 70) return { color: '#10B981', label: 'Excellent' };
    if (score > 40) return { color: '#F59E0B', label: 'Normal' };
    return { color: '#EF4444', label: 'Low' };
  };

  const readinessColor = getReadinessColor(data.readiness.score);

  if (loading) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-foreground tracking-wider mb-4">
          FITNESS TRACKER DATA
        </h1>
        
        <DateNavigator
          selectedFilter={selectedFilter}
          dateOffset={dateOffset}
          onFilterChange={setSelectedFilter}
          onDateOffsetChange={setDateOffset}
          getDateLabel={getDateLabel}
        />
      </div>

      {/* Hero Card: Readiness - More Compact */}
      <div
        className="relative rounded-3xl p-6 mb-4 transition-all duration-300"
        style={{
          background: 'rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          border: '2px solid',
          borderColor: readinessColor.color,
          boxShadow: `0 0 30px ${readinessColor.color}66`
        }}
      >
        <h2 className="text-xl font-bold text-white mb-4">Readiness</h2>
        
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
                stroke={readinessColor.color}
                strokeWidth="12"
                strokeDasharray={`${2 * Math.PI * 52 * (data.readiness.score / 100)} ${2 * Math.PI * 52}`}
                strokeLinecap="round"
                style={{
                  filter: `drop-shadow(0 0 6px ${readinessColor.color})`
                }}
              />
            </svg>
            
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold text-white">{data.readiness.score}%</div>
              <div className="text-xs text-white/80">{data.readiness.status}</div>
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
