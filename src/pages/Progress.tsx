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
  const [metrics, setMetrics] = useState<MetricCard[]>([
    {
      id: "weight",
      title: "Weight Loss",
      value: 72,
      unit: "kg",
      target: 70,
      targetUnit: "kg",
      trend: -4.2,
      borderColor: "border-[#10B981]",
      progressColor: "bg-[#10B981]",
    },
    {
      id: "body-fat",
      title: "Body Fat",
      value: 18.5,
      unit: "%",
      target: 15,
      targetUnit: "%",
      trend: -8.1,
      borderColor: "border-[#FF6B2C]",
      progressColor: "bg-[#FF6B2C]",
    },
    {
      id: "vo2max",
      title: "VO₂ MAX",
      value: 52.1,
      unit: "ML/KG/MIN",
      target: 55,
      targetUnit: "ML/KG/MIN",
      trend: 3,
      borderColor: "border-[#3B82F6]",
      progressColor: "bg-[#3B82F6]",
      chart: true,
    },
    {
      id: "pullups",
      title: "Pull-ups",
      value: 18,
      unit: "reps",
      target: 25,
      targetUnit: "reps",
      trend: 3,
      borderColor: "border-[#A855F7]",
      progressColor: "bg-[#A855F7]",
    },
    {
      id: "pushups",
      title: "Push-ups",
      value: 75,
      unit: "kg",
      target: 80,
      targetUnit: "kg",
      trend: 5,
      borderColor: "border-[#EF4444]",
      progressColor: "bg-[#EF4444]",
    },
    {
      id: "run",
      title: "1km Run",
      value: 3.5,
      unit: "min",
      target: 3.45,
      targetUnit: "min",
      trend: -2,
      borderColor: "border-[#06B6D4]",
      progressColor: "bg-[#06B6D4]",
    },
  ]);

  useEffect(() => {
    if (user) {
      fetchRealMetrics();
    }
  }, [user]);

  const fetchRealMetrics = async () => {
    if (!user) return;

    try {
      // Fetch weight data
      const { data: weightData } = await supabase
        .from('body_composition')
        .select('weight, measurement_date')
        .eq('user_id', user.id)
        .not('weight', 'is', null)
        .order('measurement_date', { ascending: false })
        .limit(2);

      // Fetch body fat data
      const { data: bodyFatData } = await supabase
        .from('body_composition')
        .select('body_fat_percentage, measurement_date')
        .eq('user_id', user.id)
        .not('body_fat_percentage', 'is', null)
        .order('measurement_date', { ascending: false })
        .limit(2);

      // Fetch goals for targets
      const { data: goalsData } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id);

      // Update metrics with real data
      setMetrics(prev => prev.map(metric => {
        if (metric.id === 'weight' && weightData && weightData.length > 0) {
          const current = weightData[0].weight;
          const previous = weightData[1]?.weight;
          const weightGoal = goalsData?.find(g => g.goal_name.toLowerCase().includes('вес'));
          
          return {
            ...metric,
            value: Number(current),
            target: weightGoal?.target_value || metric.target,
            trend: previous ? ((previous - current) / current) * 100 : metric.trend,
          };
        }
        
        if (metric.id === 'body-fat' && bodyFatData && bodyFatData.length > 0) {
          const current = bodyFatData[0].body_fat_percentage;
          const previous = bodyFatData[1]?.body_fat_percentage;
          const bodyFatGoal = goalsData?.find(g => g.goal_name.toLowerCase().includes('жир'));
          
          return {
            ...metric,
            value: Number(current),
            target: bodyFatGoal?.target_value || metric.target,
            trend: previous ? ((previous - current) / current) * 100 : metric.trend,
          };
        }
        
        return metric;
      }));
    } catch (error) {
      console.error('Error fetching metrics:', error);
    }
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
