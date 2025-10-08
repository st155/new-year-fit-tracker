import { useState, useCallback, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Settings, TrendingUp, TrendingDown, RefreshCw, Target, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { useProgressCache } from "@/hooks/useProgressCache";
import { useSwipeNavigation } from "@/hooks/useSwipeNavigation";
import { SwipeIndicator } from "@/components/ui/swipe-indicator";
import { Skeleton } from "@/components/ui/skeleton";
import { QuickMeasurementBatch } from "@/components/goals/QuickMeasurementBatch";

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

// Вспомогательные функции вне компонента
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

const buildMetricsFromData = (goals: any[], measurements: any[], bodyComposition: any[]): MetricCard[] => {
  const goalMapping: Record<string, { id: string; color: string }> = {
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

  // Дедупликация целей по имени (берем первую цель с таким именем)
  const uniqueGoals = Array.from(new Map(goals.map(g => [g.goal_name?.toLowerCase(), g])).values());

  // Карта: имя цели -> список всех goal_id с таким именем (учитываем одинаковые цели из разных челленджей)
  const nameToIds = new Map<string, string[]>();
  goals.forEach(g => {
    const key = (g.goal_name || '').toLowerCase();
    if (!nameToIds.has(key)) nameToIds.set(key, []);
    nameToIds.get(key)!.push(g.id);
  });

  // Получить и отсортировать измерения для всех goal_id, соответствующих имени
  const getMeasurementsForName = (normalizedName: string) => {
    const ids = nameToIds.get(normalizedName) || [];
    const list = measurements.filter((m: any) => ids.includes(m.goal_id));
    list.sort((a: any, b: any) => new Date(b.measurement_date).getTime() - new Date(a.measurement_date).getTime());
    return list;
  };

  return uniqueGoals.map(goal => {
    const normalized = (goal.goal_name || '').toLowerCase();
    const mapping = goalMapping[normalized];
    const id = mapping?.id ?? detectId(normalized);
    const color = mapping?.color ?? detectColor(normalized);

    const goalMeasurements = getMeasurementsForName(normalized);
    let currentValue = 0;
    let trend = 0;

    // Для процента жира попробуем взять данные из body_composition, если нет измерений
    if (id === 'body-fat' && goalMeasurements.length === 0 && bodyComposition.length > 0) {
      const latestBC = bodyComposition[0];
      currentValue = Number(latestBC.body_fat_percentage) || 0;
      
      // Считаем тренд по body_composition
      if (bodyComposition.length > 1) {
        const oldBC = bodyComposition[bodyComposition.length - 1];
        const oldValue = Number(oldBC.body_fat_percentage) || 0;
        if (oldValue !== 0) {
          trend = ((currentValue - oldValue) / oldValue) * 100;
        }
      }
    } else if (goalMeasurements.length > 0) {
      currentValue = Number(goalMeasurements[0].value) || 0;

      if (goalMeasurements.length > 1) {
        const oldValue = Number(goalMeasurements[goalMeasurements.length - 1].value) || 0;
        if (oldValue !== 0) {
          trend = ((currentValue - oldValue) / oldValue) * 100;
        }
      }
    }

    return {
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
    };
  });
};

const ProgressPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [selectedPeriod, setSelectedPeriod] = useState("3M");
  const [showQuickAdd, setShowQuickAdd] = useState(false);

  const routes = ['/', '/progress', '/challenges', '/feed'];
  const currentIndex = routes.indexOf(location.pathname);

  // Swipe navigation with visual feedback
  const { swipeProgress, swipeDirection } = useSwipeNavigation({
    routes,
    enabled: true,
  });

  // Оптимизированная функция загрузки всех данных одним запросом
  const fetchAllData = useCallback(async () => {
    if (!user) return { goals: [], metrics: [] };

    try {
      const periodDays = selectedPeriod === '1M' ? 30 : selectedPeriod === '3M' ? 90 : selectedPeriod === '6M' ? 180 : 365;
      const periodStart = new Date();
      periodStart.setDate(periodStart.getDate() - periodDays);

      // Параллельная загрузка участий, целей пользователя и body composition
      const [participationsRes, userGoalsRes, challengeGoalsRes, bodyCompositionRes] = await Promise.all([
        supabase
          .from('challenge_participants')
          .select('challenge_id')
          .eq('user_id', user.id),
        supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id),
        supabase
          .from('goals')
          .select('*')
          .eq('is_personal', false)
          .eq('user_id', user.id),
        supabase
          .from('body_composition')
          .select('*')
          .eq('user_id', user.id)
          .gte('measurement_date', periodStart.toISOString().split('T')[0])
          .order('measurement_date', { ascending: false })
      ]);

      const challengeIds = participationsRes.data?.map(p => p.challenge_id) || [];
      
      // Комбинируем персональные цели пользователя и цели из челленджей
      const challengeGoals = (challengeGoalsRes.data || []).filter(g => 
        g.challenge_id && challengeIds.includes(g.challenge_id)
      );
      
      const userGoals = userGoalsRes.data || [];
      
      // Объединяем персональные и челленджные цели, приоритет персональным
      const goalsMap = new Map();
      [...challengeGoals, ...userGoals].forEach(goal => {
        const key = goal.goal_name?.toLowerCase();
        if (key && (!goalsMap.has(key) || goal.user_id === user.id)) {
          goalsMap.set(key, goal);
        }
      });
      
      const allGoals = Array.from(goalsMap.values());
      
      if (allGoals.length === 0) {
        return { goals: [], metrics: [] };
      }

      // Загружаем только измерения за выбранный период для всех целей
      const goalIds = allGoals.map(g => g.id);
      const { data: periodMeasurements } = await supabase
        .from('measurements')
        .select('goal_id, value, measurement_date')
        .eq('user_id', user.id)
        .in('goal_id', goalIds)
        .gte('measurement_date', periodStart.toISOString().split('T')[0])
        .order('measurement_date', { ascending: false });

      // Фолбэк: последние измерения за всё время по каждой цели, если в периоде нет
      const { data: latestAll } = await supabase
        .from('measurements')
        .select('goal_id, value, measurement_date')
        .eq('user_id', user.id)
        .in('goal_id', goalIds)
        .order('measurement_date', { ascending: false });

      // Берём по одному самому свежему значению на цель
      const latestByGoal = new Map<string, { goal_id: string; value: number; measurement_date: string }>();
      (latestAll || []).forEach((m: any) => {
        if (!latestByGoal.has(m.goal_id)) latestByGoal.set(m.goal_id, m);
      });

      // Если в выбранном периоде по цели нет измерений — добавим последнее как текущую точку
      const periodByGoal = new Map<string, any[]>();
      (periodMeasurements || []).forEach((m: any) => {
        const arr = periodByGoal.get(m.goal_id) || [];
        arr.push(m);
        periodByGoal.set(m.goal_id, arr);
      });
      const mergedMeasurements: any[] = [...(periodMeasurements || [])];
      for (const gid of goalIds) {
        if (!(periodByGoal.get(gid)?.length) && latestByGoal.has(gid)) {
          mergedMeasurements.push(latestByGoal.get(gid)!);
        }
      }

      // VO2Max как резерв из metric_values (если нет измерений)
      const { data: vo2Values } = await supabase
        .from('metric_values')
        .select(`value, measurement_date, user_metrics!inner(metric_name)`) 
        .eq('user_id', user.id)
        .eq('user_metrics.metric_name', 'VO2Max')
        .gte('measurement_date', periodStart.toISOString().split('T')[0])
        .order('measurement_date', { ascending: false })
        .limit(1);

      // Быстрое построение метрик с учетом body_composition
      let metrics = buildMetricsFromData(
        allGoals, 
        mergedMeasurements, 
        bodyCompositionRes.data || []
      );

      // Подставляем VO2Max из metric_values, если метрика есть, но измерений не было
      if (vo2Values && vo2Values.length > 0) {
        metrics = metrics.map(m =>
          m.id === 'vo2max' && (!m.value || m.value === 0)
            ? { ...m, value: Number(vo2Values[0].value) || 0 }
            : m
        );
      }

      return { goals: allGoals, metrics };
    } catch (error) {
      console.error('Error fetching data:', error);
      return { goals: [], metrics: [] };
    }
  }, [user, selectedPeriod]);

  // Используем кэш
  const { data, loading, fromCache, refetch } = useProgressCache(
    `progress_v2_${user?.id}_${selectedPeriod}`,
    fetchAllData,
    [user?.id, selectedPeriod]
  );

  const challengeGoals = data?.goals || [];
  const metrics = useMemo(() => data?.metrics || [], [data?.metrics]);
  
  // Проверяем, есть ли цели без измерений
  const goalsWithoutMeasurements = useMemo(() => {
    return challengeGoals.filter(goal => {
      const metric = metrics.find(m => m.title === goal.goal_name);
      return !metric || metric.value === 0;
    });
  }, [challengeGoals, metrics]);

  const formatValue = useCallback((value: number, unit: string) => {
    if (unit === "min") {
      const minutes = Math.floor(value);
      const seconds = Math.round((value % 1) * 60);
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
    return value % 1 === 0 ? value.toString() : value.toFixed(1);
  }, []);

  const getProgressPercentage = useCallback((metric: MetricCard) => {
    if (metric.id === 'weight' || metric.id === 'body-fat' || metric.id === 'run') {
      // For metrics where lower is better
      if (metric.value <= metric.target) return 100;
      return Math.max(0, Math.min(100, (1 - (metric.value - metric.target) / metric.target) * 100));
    }
    // For metrics where higher is better
    return Math.min(100, (metric.value / metric.target) * 100);
  }, []);

  // Loading skeleton for metrics grid
  if (loading && !fromCache) {
    return (
      <div className="min-h-screen pb-24 px-4 pt-4 overflow-y-auto">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
          <Skeleton className="h-9 w-9 rounded" />
        </div>
        <div className="mb-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16" />
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-8 w-16 rounded-full" />
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Skeleton key={i} className="h-40 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 px-4 pt-4 overflow-y-auto relative">
      <SwipeIndicator 
        progress={swipeProgress}
        direction={swipeDirection}
        currentIndex={currentIndex}
        totalPages={routes.length}
      />
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">
            Progress Tracking
          </h1>
          <p className="text-muted-foreground text-sm">
            Monitor your fitness journey {fromCache && '(cached)'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => refetch()}
          disabled={loading && !fromCache}
          className="h-9 w-9 p-0"
        >
          <RefreshCw className={cn("h-4 w-4", loading && !fromCache && "animate-spin")} />
        </Button>
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

      {/* No data message or Quick Add */}
      {metrics.length === 0 && !loading && (
        <div className="mb-4 animate-fade-in">
          <div className="p-8 rounded-2xl border-2 border-dashed border-border/50 bg-card/20 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Target className="h-10 w-10 text-primary/50" />
              </div>
              <div className="space-y-2">
                <p className="text-base font-semibold text-foreground">No Goals Yet</p>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Join a challenge or create your own goals to start tracking your fitness journey!
                </p>
              </div>
              <button
                onClick={() => navigate('/challenges')}
                className="px-6 py-2.5 rounded-xl bg-gradient-primary text-white font-semibold hover:opacity-90 transition-all duration-300 hover:scale-105"
              >
                Explore Challenges
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Add measurements for goals without data */}
      {metrics.length > 0 && goalsWithoutMeasurements.length > 0 && !showQuickAdd && (
        <div className="mb-4">
          <Button
            onClick={() => setShowQuickAdd(true)}
            variant="outline"
            className="w-full"
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            Добавить измерения для {goalsWithoutMeasurements.length} целей
          </Button>
        </div>
      )}

      {showQuickAdd && user && (
        <div className="mb-4">
          <QuickMeasurementBatch
            goals={goalsWithoutMeasurements}
            userId={user.id}
            onComplete={() => {
              setShowQuickAdd(false);
              refetch();
            }}
          />
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-3 auto-rows-max">
        {metrics.map((metric) => {
          const progress = getProgressPercentage(metric);
          const isPositiveTrend = metric.id === 'weight' || metric.id === 'body-fat' || metric.id === 'run' 
            ? metric.trend < 0 
            : metric.trend > 0;

          return (
            <div
              key={`${metric.id}-${metric.title}`}
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
