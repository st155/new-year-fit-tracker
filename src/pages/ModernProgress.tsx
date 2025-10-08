import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, TrendingUp, TrendingDown } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { WeightProgressDetail } from "@/components/detail/WeightProgressDetail";
import { PullUpsProgressDetail } from "@/components/detail/PullUpsProgressDetail";
import { BodyFatProgressDetail } from "@/components/detail/BodyFatProgressDetail";
import { VO2MaxProgressDetail } from "@/components/detail/VO2MaxProgressDetail";
import GoalProgressDetail from "@/components/detail/GoalProgressDetail";

interface MetricCard {
  id: string;
  title: string;
  value: number;
  unit: string;
  target: number;
  targetUnit: string;
  trend: number;
  borderColor: string;
  progressColor: string;
  chart?: boolean;
  goalId?: string;
  goalType?: string;
}

export default function ModernProgress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("3M");
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [selectedMetric, setSelectedMetric] = useState<MetricCard | null>(null);

  useEffect(() => {
    if (user) {
      fetchChallengeMetrics();
    }
  }, [user, selectedPeriod]);

  const fetchChallengeMetrics = async () => {
    if (!user) return;

    try {
      const periodDays = selectedPeriod === '1M' ? 30 : selectedPeriod === '3M' ? 90 : selectedPeriod === '6M' ? 180 : 365;
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // OPTIMIZED: Parallel fetch of all data
      const [participationsRes, goalsRes, userGoalsRes, summaryRes, userMetricsRes] = await Promise.all([
        supabase.from('challenge_participants').select('challenge_id').eq('user_id', user.id),
        // IMPORTANT: fetch challenge goals for THIS user only
        supabase.from('goals').select('*').eq('is_personal', false).eq('user_id', user.id),
        supabase.from('goals').select('*').eq('user_id', user.id),
        supabase.from('daily_health_summary')
          .select('steps, active_calories, heart_rate_avg, sleep_hours, distance_km, exercise_minutes')
          .eq('user_id', user.id)
          .gte('date', periodStart.toISOString().split('T')[0])
          .order('date', { ascending: false })
          .limit(1),
        supabase.from('user_metrics')
          .select(`id, metric_name, metric_category, unit, metric_values(value, measurement_date)`)
          .eq('user_id', user.id)
          .eq('is_active', true)
      ]);

      if (!participationsRes.data || participationsRes.data.length === 0) {
        setMetrics([]);
        return;
      }

      const challengeIds = participationsRes.data.map(p => p.challenge_id);
      let uniqueGoals = Array.from(
        new Map(
          (goalsRes.data || [])
            .filter((g: any) => g.challenge_id && challengeIds.includes(g.challenge_id))
            .map((g: any) => [g.goal_name, g])
        ).values()
      );

      // Add core goals as placeholders
      const coreGoals = [
        { name: 'Подтягивания', value: 17, unit: 'раз' },
        { name: 'Жим лёжа', value: 90, unit: 'кг' },
        { name: 'Выпады назад со штангой', value: 50, unit: 'кг×8' },
        { name: 'Планка', value: 4, unit: 'мин' },
        { name: 'Отжимания', value: 60, unit: 'раз' },
        { name: 'VO₂max', value: 50, unit: 'мл/кг/мин' },
        { name: 'Бег 1 км', value: 4.0, unit: 'мин' },
        { name: 'Процент жира', value: 11, unit: '%' },
      ];

      const existing = new Set(uniqueGoals.map((g: any) => (g.goal_name || '').toLowerCase()));
      const placeholders = coreGoals
        .filter(cg => !existing.has(cg.name.toLowerCase()))
        .map(cg => ({
          id: `synthetic-${cg.name}`,
          goal_name: cg.name,
          goal_type: 'challenge',
          target_value: cg.value,
          target_unit: cg.unit,
          is_personal: false,
        }));

      uniqueGoals = [...uniqueGoals, ...placeholders];

      const userGoalsByName = new Map((userGoalsRes.data || []).map((g: any) => [(g.goal_name || '').toLowerCase(), g]));

      // OPTIMIZED: Single batch fetch of all measurements
      const goalIds = uniqueGoals
        .map((g: any) => g.id)
        .filter((id: string) => !String(id).startsWith('synthetic-'));

      const { data: allMeasurements } = await supabase
        .from('measurements')
        .select('*')
        .eq('user_id', user.id)
        .in('goal_id', goalIds)
        .gte('measurement_date', periodStart.toISOString().split('T')[0])
        .order('measurement_date', { ascending: false });

      // Index measurements by goal_id for fast lookup
      const measurementsByGoal: Record<string, any[]> = {};
      (allMeasurements || []).forEach(m => {
        if (!measurementsByGoal[m.goal_id]) measurementsByGoal[m.goal_id] = [];
        measurementsByGoal[m.goal_id].push(m);
      });

      const goalMapping: { [key: string]: { id: string; color: string } } = {
        'подтягивания': { id: 'pullups', color: '#A855F7' },
        'жим лёжа': { id: 'bench', color: '#EF4444' },
        'выпады назад со штангой': { id: 'lunges', color: '#84CC16' },
        'планка': { id: 'plank', color: '#8B5CF6' },
        'отжимания': { id: 'pushups', color: '#FBBF24' },
        'vo2max': { id: 'vo2max', color: '#3B82F6' },
        'vo₂max': { id: 'vo2max', color: '#3B82F6' },
        'бег 1 км': { id: 'run', color: '#06B6D4' },
        'процент жира': { id: 'body-fat', color: '#FF6B2C' },
        'вес': { id: 'weight', color: '#10B981' },
      };

      const detectId = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('вес') || n.includes('weight')) return 'weight';
        if (n.includes('жир') || n.includes('fat')) return 'body-fat';
        if (n.includes('бег') || n.includes('run')) return 'run';
        if (n.includes('vo2') || n.includes('vo₂')) return 'vo2max';
        if (n.includes('подтяг') || n.includes('pull-up')) return 'pullups';
        if (n.includes('отжим') || n.includes('push-up') || n.includes('bench')) return n.includes('bench') ? 'bench' : 'pushups';
        if (n.includes('планк') || n.includes('plank')) return 'plank';
        if (n.includes('выпад') || n.includes('lunge')) return 'lunges';
        return `goal-${Math.random().toString(36).slice(2, 7)}`;
      };

      const detectColor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('вес') || n.includes('weight')) return '#10B981';
        if (n.includes('жир') || n.includes('fat')) return '#FF6B2C';
        if (n.includes('бег') || n.includes('run')) return '#06B6D4';
        if (n.includes('vo2') || n.includes('vo₂')) return '#3B82F6';
        if (n.includes('подтяг') || n.includes('pull-up')) return '#A855F7';
        if (n.includes('отжим') || n.includes('push-up') || n.includes('bench')) return n.includes('bench') ? '#EF4444' : '#FBBF24';
        if (n.includes('планк') || n.includes('plank')) return '#8B5CF6';
        if (n.includes('выпад') || n.includes('lunge')) return '#84CC16';
        return '#64748B';
      };

      const metricsArray: MetricCard[] = [];

      // Build metrics from goals
      for (const goal of uniqueGoals) {
        const normalized = (goal.goal_name || '').toLowerCase();
        const mapping = goalMapping[normalized];
        const id = mapping?.id ?? detectId(normalized);
        const color = mapping?.color ?? detectColor(normalized);

        const userGoal = userGoalsByName.get(normalized);
        const realGoalId = userGoal?.id ?? goal.id;

        let currentValue = 0;
        let trend = 0;

        // Try measurements first
        const measurements = measurementsByGoal[realGoalId] || [];
        if (measurements.length > 0) {
          currentValue = Number(measurements[0].value);
          if (measurements.length > 1) {
            const oldValue = Number(measurements[measurements.length - 1].value);
            if (oldValue !== 0) {
              trend = ((currentValue - oldValue) / oldValue) * 100;
            }
          }
        }

        // If no measurements, try user_metrics by name (for synthetic goals)
        if (currentValue === 0) {
          const matchingMetric = (userMetricsRes.data || []).find((m: any) => 
            (m.metric_name || '').toLowerCase() === normalized
          );
          if (matchingMetric) {
            const values = (matchingMetric.metric_values || []) as Array<{ value: number; measurement_date: string }>;
            if (values.length > 0) {
              const sorted = values.sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime());
              currentValue = Number(sorted[0].value) || 0;
              if (sorted.length > 1) {
                const oldValue = Number(sorted[sorted.length - 1].value);
                if (oldValue !== 0) {
                  trend = ((currentValue - oldValue) / oldValue) * 100;
                }
              }
            }
          }
        }

        metricsArray.push({
          id,
          title: goal.goal_name,
          value: currentValue,
          unit: (userGoal?.target_unit ?? goal.target_unit) || '',
          target: Number(userGoal?.target_value ?? goal.target_value) || 0,
          targetUnit: (userGoal?.target_unit ?? goal.target_unit) || '',
          trend,
          borderColor: color,
          progressColor: color,
          chart: id === 'vo2max',
          goalId: realGoalId,
          goalType: userGoal?.goal_type ?? goal.goal_type
        });
      }

      // Add summary metrics
      const summary = summaryRes.data?.[0];
      if (summary?.steps != null) {
        metricsArray.push({
          id: 'steps',
          title: 'Steps',
          value: Number(summary.steps) || 0,
          unit: '',
          target: 10000,
          targetUnit: 'steps',
          trend: 0,
          borderColor: '#22C55E',
          progressColor: '#22C55E',
        });
      }

      if (summary?.active_calories != null) {
        metricsArray.push({
          id: 'calories',
          title: 'Active Calories',
          value: Number(summary.active_calories) || 0,
          unit: 'kcal',
          target: 500,
          targetUnit: 'kcal',
          trend: 0,
          borderColor: '#EF4444',
          progressColor: '#EF4444',
        });
      }

      if (summary?.heart_rate_avg != null) {
        metricsArray.push({
          id: 'hr_avg',
          title: 'Avg HR',
          value: Number(summary.heart_rate_avg) || 0,
          unit: 'bpm',
          target: 60,
          targetUnit: 'bpm',
          trend: 0,
          borderColor: '#F43F5E',
          progressColor: '#F43F5E',
        });
      }

      if (summary?.sleep_hours != null) {
        metricsArray.push({
          id: 'sleep',
          title: 'Sleep',
          value: Number(summary.sleep_hours) || 0,
          unit: 'h',
          target: 8,
          targetUnit: 'h',
          trend: 0,
          borderColor: '#6366F1',
          progressColor: '#6366F1',
        });
      }

      // Add user metrics
      const existingTitles = new Set(metricsArray.map(m => m.title.toLowerCase()));
      const getColorFor = (name: string) => {
        const n = name.toLowerCase();
        if (n.includes('strain')) return '#F97316';
        if (n.includes('sleep')) return '#6366F1';
        if (n.includes('vo2')) return '#3B82F6';
        if (n.includes('calories')) return '#EF4444';
        if (n.includes('steps')) return '#22C55E';
        if (n.includes('hrv')) return '#8B5CF6';
        if (n.includes('resting') || n.includes('heart')) return '#F43F5E';
        if (n.includes('distance')) return '#06B6D4';
        return '#64748B';
      };

      (userMetricsRes.data || []).forEach((m: any) => {
        const values = (m.metric_values || []) as Array<{ value: number; measurement_date: string }>;
        if (!values.length) return;
        const latest = values.sort((a, b) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime())[0];
        const title = m.metric_name;
        if (existingTitles.has(title.toLowerCase())) return;

        const color = getColorFor(title);
        const id = title.toLowerCase().replace(/\s+/g, '-');
        metricsArray.push({
          id,
          title,
          value: Number(latest.value) || 0,
          unit: m.unit || '',
          target: 0,
          targetUnit: m.unit || '',
          trend: 0,
          borderColor: color,
          progressColor: color,
          chart: title.toLowerCase().includes('vo2')
        });
      });

      setMetrics(metricsArray);
    } catch (error) {
      console.error('Error building progress metrics:', error);
      setMetrics([]);
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === "min" || unit === "мин") {
      const minutes = Math.floor(value);
      const seconds = Math.round((value % 1) * 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  };

  const getProgressPercentage = (metric: MetricCard) => {
    if (metric.id === 'weight' || metric.id === 'body-fat' || metric.id === 'run') {
      // For metrics where lower is better
      if (metric.value <= metric.target) return 100;
      return Math.max(0, Math.min(100, (1 - (metric.value - metric.target) / metric.target) * 100));
    }
    // For metrics where higher is better
    return Math.min(100, (metric.value / metric.target) * 100);
  };

  // Render detail view if metric selected
  if (selectedMetric) {
    const handleBack = () => setSelectedMetric(null);

    // Specialized detail components
    if (selectedMetric.id === 'weight') {
      return <WeightProgressDetail onBack={handleBack} />;
    }
    if (selectedMetric.id === 'pullups') {
      return <PullUpsProgressDetail onBack={handleBack} />;
    }
    if (selectedMetric.id === 'body-fat') {
      return <BodyFatProgressDetail onBack={handleBack} />;
    }
    if (selectedMetric.id === 'vo2max') {
      return <VO2MaxProgressDetail onBack={handleBack} />;
    }

    // Generic goal detail for others
    if (selectedMetric.goalId && !String(selectedMetric.goalId).startsWith('synthetic-')) {
      return (
        <GoalProgressDetail
          goal={{
            id: selectedMetric.goalId,
            goal_name: selectedMetric.title,
            goal_type: selectedMetric.goalType || 'general',
            target_value: selectedMetric.target,
            target_unit: selectedMetric.targetUnit
          }}
          onBack={handleBack}
        />
      );
    }
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 overflow-y-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-foreground mb-1">
          Progress Tracking
        </h1>
        <p className="text-muted-foreground text-sm">
          Monitor your fitness journey and celebrate your achievements
        </p>
      </div>

      {/* Period Filter */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="text-sm text-muted-foreground">Period:</span>
          {["1M", "3M", "6M", "1Y"].map((period) => (
            <button
              key={period}
              onClick={() => setSelectedPeriod(period)}
              className={cn(
                "px-6 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
                selectedPeriod === period
                  ? "text-white"
                  : "text-muted-foreground hover:text-foreground border border-border/30"
              )}
              style={
                selectedPeriod === period
                  ? {
                      background: "linear-gradient(135deg, #FF6B2C, #FF4B2B)",
                      boxShadow: "0 0 20px rgba(255, 107, 44, 0.5)",
                    }
                  : {
                      background: "rgba(255, 255, 255, 0.05)",
                      backdropFilter: "blur(10px)",
                    }
              }
            >
              {period}
            </button>
          ))}
        </div>
      </div>

      {/* Metrics Grid - 2 columns on all screens */}
      <div className="grid grid-cols-2 gap-3">
        {metrics.map((metric) => {
          const progress = getProgressPercentage(metric);
          const isPositiveTrend = metric.id === 'weight' || metric.id === 'body-fat' || metric.id === 'run' 
            ? metric.trend < 0 
            : metric.trend > 0;

          return (
            <div
              key={`${metric.id}-${metric.title}`}
              onClick={() => setSelectedMetric(metric)}
              className="p-4 relative overflow-hidden transition-all duration-300 rounded-2xl border-2 cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                borderColor: metric.borderColor,
                boxShadow: `0 0 20px ${metric.borderColor}40`,
              }}
            >
              {/* Title and Trend */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xs font-semibold text-foreground leading-tight">
                  {metric.title}
                </h3>
                <div
                  className="px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5 text-white"
                  style={{
                    background: isPositiveTrend ? "#10B981" : "#EF4444",
                    boxShadow: isPositiveTrend
                      ? "0 0 10px rgba(16, 185, 129, 0.6)"
                      : "0 0 10px rgba(239, 68, 68, 0.6)",
                  }}
                >
                  {isPositiveTrend ? "↓" : "↑"}
                  {Math.abs(metric.trend).toFixed(1)}%
                </div>
              </div>

              {/* Value */}
              <div className="mb-3">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-foreground">
                    {formatValue(metric.value, metric.unit)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {metric.unit !== "min" && metric.unit}
                  </span>
                </div>
              </div>

              {/* Mini Chart (for VO2 MAX) */}
              {metric.chart && (
                <div className="mb-3 h-8 flex items-end gap-0.5">
                  {[45, 48, 46, 50, 52, 51, 52.1].map((value, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-t"
                      style={{
                        height: `${(value / 55) * 100}%`,
                        background: metric.borderColor,
                        opacity: 0.6,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Progress Bar */}
              <div className="space-y-1.5 mb-2">
                <div 
                  className="h-1 rounded-full overflow-hidden"
                  style={{
                    background: "rgba(255, 255, 255, 0.1)",
                  }}
                >
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${progress}%`,
                      background: metric.progressColor,
                      boxShadow: `0 0 8px ${metric.progressColor}CC`,
                    }}
                  />
                </div>
              </div>

              {/* Target Text */}
              <p className="text-[11px] text-muted-foreground">
                Target: {metric.target} {metric.targetUnit}
              </p>

              {/* Settings Icon (for VO2 MAX) */}
              {metric.chart && (
                <button className="absolute bottom-2 right-2 text-muted-foreground/50 hover:text-foreground transition-colors">
                  <Settings className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
