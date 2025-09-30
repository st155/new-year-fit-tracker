import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Settings, TrendingUp, TrendingDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

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
}

const ProgressPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState("3M");
  const [challengeGoals, setChallengeGoals] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);

  useEffect(() => {
    if (user) {
      fetchChallengeGoals();
    }
  }, [user, selectedPeriod]);

  const fetchChallengeGoals = async () => {
    if (!user) return;

    try {
      // Get user's active challenges
       const { data: participations } = await supabase
         .from('challenge_participants')
         .select('challenge_id')
         .eq('user_id', user.id);
       console.log('[Progress] participations:', participations);

      if (!participations || participations.length === 0) {
        setChallengeGoals([]);
        setMetrics([]);
        return;
      }

      // Get goals for those challenges
      const { data: goals } = await supabase
        .from('goals')
        .select('*')
        .eq('is_personal', false)
        .eq('user_id', user.id)
        .in('challenge_id', participations.map(p => p.challenge_id));
      console.log('[Progress] challenge goals for user:', goals);

      // Deduplicate by goal_name
      const uniqueGoals = Array.from(new Map((goals || []).map(g => [g.goal_name, g])).values());
      setChallengeGoals(uniqueGoals);
      await buildMetrics(uniqueGoals);
    } catch (error) {
      console.error('Error fetching challenge goals:', error);
      setChallengeGoals([]);
      setMetrics([]);
    }
  };

  const buildMetrics = async (goals: any[]) => {
    if (goals.length === 0) {
      setMetrics([]);
      return;
    }

    const metricsArray: MetricCard[] = [];

    // Map goal names to metric configurations (known ones)
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
      'вес': { id: 'weight', color: '#10B981' }
    };

    const detectId = (name: string) => {
      if (name.includes('вес') || name.includes('weight')) return 'weight';
      if (name.includes('жир')) return 'body-fat';
      if (name.includes('бег') || name.includes('run')) return 'run';
      if (name.includes('vo2') || name.includes('vo₂')) return 'vo2max';
      if (name.includes('подтяг')) return 'pullups';
      if (name.includes('отжим')) return 'pushups';
      return 'generic';
    };

    const detectColor = (name: string) => {
      if (name.includes('вес') || name.includes('weight')) return '#10B981';
      if (name.includes('жир')) return '#FF6B2C';
      if (name.includes('бег') || name.includes('run')) return '#06B6D4';
      if (name.includes('vo2') || name.includes('vo₂')) return '#3B82F6';
      if (name.includes('подтяг')) return '#A855F7';
      if (name.includes('отжим')) return '#FBBF24';
      return '#64748B'; // slate
    };

    // Calculate period start date
    const periodDays = selectedPeriod === '1M' ? 30 : selectedPeriod === '3M' ? 90 : selectedPeriod === '6M' ? 180 : 365;
    const periodStart = new Date();
    periodStart.setDate(periodStart.getDate() - periodDays);

    for (const goal of goals) {
      const normalized = (goal.goal_name || '').toLowerCase();
      const mapping = goalMapping[normalized];
      const id = mapping?.id ?? detectId(normalized) ?? `goal-${goal.id}`;
      const color = mapping?.color ?? detectColor(normalized);

      // Fetch measurements for this goal for the selected period
      const { data: measurements } = await supabase
        .from('measurements')
        .select('*')
        .eq('goal_id', goal.id)
        .gte('measurement_date', periodStart.toISOString().split('T')[0])
        .order('measurement_date', { ascending: false });

      let currentValue = 0;
      let trend = 0;

      if (measurements && measurements.length > 0) {
        currentValue = Number(measurements[0].value);

        if (measurements.length > 1) {
          const oldValue = Number(measurements[measurements.length - 1].value);
          if (oldValue !== 0) {
            trend = ((currentValue - oldValue) / oldValue) * 100;
          }
        }
      }

      metricsArray.push({
        id,
        title: goal.goal_name,
        value: currentValue,
        unit: goal.target_unit || '',
        target: Number(goal.target_value) || 0,
        targetUnit: goal.target_unit || '',
        trend,
        borderColor: `border-[${color}]`,
        progressColor: `bg-[${color}]`,
        chart: id === 'vo2max'
      });
    }

    setMetrics(metricsArray);
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === "min") {
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

  return (
    <div className="min-h-screen pb-24 px-4 pt-4">
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
                  ? "bg-gradient-secondary text-white shadow-glow-secondary"
                  : "glass text-muted-foreground hover:text-foreground border border-border/30"
              )}
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
              key={metric.id}
              className={cn(
                "p-4 relative overflow-hidden transition-all duration-300 rounded-2xl",
                "border-2",
                metric.borderColor
              )}
              style={{
                background: "rgba(255, 255, 255, 0.05)",
                backdropFilter: "blur(10px)",
                WebkitBackdropFilter: "blur(10px)",
                boxShadow: `0 0 20px ${
                  metric.borderColor === "border-[#10B981]" ? "rgba(16, 185, 129, 0.4)" :
                  metric.borderColor === "border-[#FF6B2C]" ? "rgba(255, 107, 44, 0.4)" :
                  metric.borderColor === "border-[#3B82F6]" ? "rgba(59, 130, 246, 0.4)" :
                  metric.borderColor === "border-[#A855F7]" ? "rgba(168, 85, 247, 0.4)" :
                  metric.borderColor === "border-[#EF4444]" ? "rgba(239, 68, 68, 0.4)" :
                  "rgba(6, 182, 212, 0.4)"
                }`,
              }}
            >
              {/* Title and Trend */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-xs font-semibold text-foreground leading-tight">
                  {metric.title}
                </h3>
                <div
                  className={cn(
                    "px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-0.5",
                    isPositiveTrend
                      ? "bg-[#10B981] text-white"
                      : "bg-[#EF4444] text-white"
                  )}
                  style={{
                    boxShadow: isPositiveTrend
                      ? "0 0 10px rgba(16, 185, 129, 0.6)"
                      : "0 0 10px rgba(239, 68, 68, 0.6)",
                  }}
                >
                  {isPositiveTrend ? <TrendingDown className="h-2.5 w-2.5" /> : <TrendingUp className="h-2.5 w-2.5" />}
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
                      className={cn("flex-1 rounded-t")}
                      style={{
                        height: `${(value / 55) * 100}%`,
                        background: metric.borderColor === "border-[#3B82F6]" ? "#3B82F6" : "#3B82F6",
                        opacity: 0.6,
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Progress Bar */}
              <div className="space-y-1.5 mb-2">
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className={cn("h-full rounded-full transition-all duration-500")}
                    style={{
                      width: `${progress}%`,
                      background: 
                        metric.borderColor === "border-[#10B981]" ? "#10B981" :
                        metric.borderColor === "border-[#FF6B2C]" ? "#FF6B2C" :
                        metric.borderColor === "border-[#3B82F6]" ? "#3B82F6" :
                        metric.borderColor === "border-[#A855F7]" ? "#A855F7" :
                        metric.borderColor === "border-[#EF4444]" ? "#EF4444" :
                        "#06B6D4",
                      boxShadow: `0 0 8px ${
                        metric.borderColor === "border-[#10B981]" ? "rgba(16, 185, 129, 0.8)" :
                        metric.borderColor === "border-[#FF6B2C]" ? "rgba(255, 107, 44, 0.8)" :
                        metric.borderColor === "border-[#3B82F6]" ? "rgba(59, 130, 246, 0.8)" :
                        metric.borderColor === "border-[#A855F7]" ? "rgba(168, 85, 247, 0.8)" :
                        metric.borderColor === "border-[#EF4444]" ? "rgba(239, 68, 68, 0.8)" :
                        "rgba(6, 182, 212, 0.8)"
                      }`,
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
};

export default ProgressPage;
