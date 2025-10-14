import { useState, useEffect, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Activity, Heart, Flame, Footprints, Moon, TrendingUp, Droplets, Dumbbell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Leaderboard } from "./leaderboard";
import { WeeklyGoals } from "./weekly-goals";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  unit?: string;
  change?: string | null;
  subtitle?: string;
  color: string;
  onClick?: () => void;
}

function CompactMetricCard({ icon, title, value, unit, change, subtitle, color, onClick }: MetricCardProps) {
  const getColorClasses = () => {
    const colorMap: Record<string, string> = {
      'purple-500': 'border-purple-500/20 bg-purple-500/5 hover:border-purple-500/40',
      'green-500': 'border-green-500/20 bg-green-500/5 hover:border-green-500/40',
      'primary': 'border-primary/20 bg-primary/5 hover:border-primary/40',
      'orange-500': 'border-orange-500/20 bg-orange-500/5 hover:border-orange-500/40',
      'accent': 'border-accent/20 bg-accent/5 hover:border-accent/40',
      'red-500': 'border-red-500/20 bg-red-500/5 hover:border-red-500/40',
      'blue-500': 'border-blue-500/20 bg-blue-500/5 hover:border-blue-500/40',
    };
    return colorMap[color] || 'border-border/20 bg-card/5 hover:border-border/40';
  };

  return (
    <button 
      className={cn(
        "border-2 transition-all duration-500 rounded-xl p-3 text-left w-full",
        "hover:scale-105 hover:shadow-lg active:scale-95",
        "animate-fade-in group",
        getColorClasses(),
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
      disabled={!onClick}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="p-1.5 rounded-lg bg-background/50 transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
          {icon}
        </div>
        {change && (
          <Badge 
            variant={change.startsWith('-') ? "destructive" : "default"}
            className="text-[9px] h-4 px-1.5"
          >
            {change}
          </Badge>
        )}
      </div>
      
      <div className="space-y-0.5">
        <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">
          {title}
        </div>
        <div className="flex items-baseline gap-0.5">
          <span className="text-xl font-bold text-foreground">
            {value}
          </span>
          {unit && (
            <span className="text-[10px] text-muted-foreground">
              {unit}
            </span>
          )}
        </div>
        {subtitle && (
          <div className="text-[9px] text-muted-foreground">
            {subtitle}
          </div>
        )}
      </div>
    </button>
  );
}

export function AdditionalMetrics() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user } = useAuth();
  
  const [metricsData, setMetricsData] = useState<Record<string, any>>({
    sleep: { value: "—", change: null, subtitle: t('extraMetrics.subtitles.avgPerNight') },
    recovery: { value: "—", change: null, subtitle: t('dashboard.metrics.from_whoop') },
    strain: { value: "—", change: null, subtitle: t('extraMetrics.subtitles.today') },
    activeMin: { value: "—", change: null, subtitle: t('extraMetrics.subtitles.thisWeek') },
    calories: { value: "—", change: null, subtitle: t('extraMetrics.subtitles.dailyAvg') },
    avgSteps: { value: "—", change: null, subtitle: t('extraMetrics.subtitles.thisWeek') },
    restHr: { value: "—", change: null, subtitle: t('extraMetrics.subtitles.morningAvg') },
    hydration: { value: "—", change: null, subtitle: t('extraMetrics.subtitles.today') },
    workouts: { value: "—", change: null, subtitle: t('extraMetrics.subtitles.thisWeek') }
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) return;

      try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const today = now.toISOString().split('T')[0];
        const weekAgoDate = sevenDaysAgo.toISOString().split('T')[0];

        // Fetch все метрики параллельно
        const [sleepRes, recoveryRes, strainRes, activeMinRes, caloriesRes, stepsRes, restHrRes, hydrationRes, workoutsRes] = await Promise.all([
          // Sleep - среднее за последние 7 дней
          supabase
            .from('metric_values')
            .select('value, measurement_date, user_metrics!inner(metric_name)')
            .eq('user_id', user.id)
            .eq('user_metrics.metric_name', 'Sleep Duration')
            .gte('measurement_date', weekAgoDate)
            .lte('measurement_date', today)
            .order('measurement_date', { ascending: false })
            .limit(7),
          
          // Recovery - последний доступный за 7 дней
          supabase
            .from('metric_values')
            .select('value, measurement_date, user_metrics!inner(metric_name)')
            .eq('user_id', user.id)
            .eq('user_metrics.metric_name', 'Recovery')
            .gte('measurement_date', weekAgoDate)
            .lte('measurement_date', today)
            .order('measurement_date', { ascending: false })
            .limit(1),
          
          // Strain - последний доступный
          supabase
            .from('metric_values')
            .select('value, measurement_date, user_metrics!inner(metric_name)')
            .eq('user_id', user.id)
            .in('user_metrics.metric_name', ['Workout Strain', 'Day Strain'])
            .gte('measurement_date', weekAgoDate)
            .lte('measurement_date', today)
            .order('measurement_date', { ascending: false })
            .order('value', { ascending: false })
            .limit(1),
          
          // Active minutes - сумма за неделю
          supabase
            .from('daily_health_summary')
            .select('exercise_minutes')
            .eq('user_id', user.id)
            .gte('date', weekAgoDate)
            .lte('date', today)
            .not('exercise_minutes', 'is', null),
          
          // Calories - среднее за неделю
          supabase
            .from('metric_values')
            .select('value, measurement_date, user_metrics!inner(metric_name)')
            .eq('user_id', user.id)
            .in('user_metrics.metric_name', ['Calories', 'Workout Calories', 'Active Energy Burned'])
            .gte('measurement_date', weekAgoDate)
            .lte('measurement_date', today)
            .order('measurement_date', { ascending: false }),
          
          // Steps - среднее за неделю
          supabase
            .from('metric_values')
            .select('value, measurement_date, user_metrics!inner(metric_name, source)')
            .eq('user_id', user.id)
            .in('user_metrics.metric_name', ['Steps', 'Количество шагов'])
            .in('user_metrics.source', ['ultrahuman', 'garmin'])
            .gte('measurement_date', weekAgoDate)
            .lte('measurement_date', today)
            .order('measurement_date', { ascending: false }),
          
          // Resting HR - утреннее среднее за неделю
          supabase
            .from('metric_values')
            .select('value, measurement_date, user_metrics!inner(metric_name)')
            .eq('user_id', user.id)
            .in('user_metrics.metric_name', ['Resting Heart Rate', 'HRV'])
            .gte('measurement_date', weekAgoDate)
            .lte('measurement_date', today)
            .order('measurement_date', { ascending: false })
            .limit(7),
          
          // Hydration - сегодня
          supabase
            .from('metric_values')
            .select('value, measurement_date, user_metrics!inner(metric_name)')
            .eq('user_id', user.id)
            .eq('user_metrics.metric_name', 'Hydration')
            .eq('measurement_date', today)
            .maybeSingle(),
          
          // Workouts - количество за неделю
          supabase
            .from('metric_values')
            .select('measurement_date, user_metrics!inner(metric_name)')
            .eq('user_id', user.id)
            .eq('user_metrics.metric_name', 'Workout Strain')
            .gte('measurement_date', weekAgoDate)
            .lte('measurement_date', today)
        ]);

        const newMetrics = { ...metricsData };

        // Sleep
        if (sleepRes.data && sleepRes.data.length > 0) {
          const avg = sleepRes.data.reduce((sum, r) => sum + Number(r.value), 0) / sleepRes.data.length;
          newMetrics.sleep.value = avg.toFixed(1);
        }

        // Recovery - показываем последний с датой
        if (recoveryRes.data && recoveryRes.data.length > 0) {
          const recoveryRecord = recoveryRes.data[0];
          newMetrics.recovery.value = Math.round(Number(recoveryRecord.value)).toString();
          newMetrics.recovery.subtitle = `${t('dashboard.metrics.from_whoop')} (${new Date(recoveryRecord.measurement_date).toLocaleDateString()})`;
        }

        // Strain - берем последний доступный и показываем дату
        if (strainRes.data && strainRes.data.length > 0) {
          const strainRecord = strainRes.data[0];
          newMetrics.strain.value = Number(strainRecord.value).toFixed(1);
          newMetrics.strain.subtitle = new Date(strainRecord.measurement_date).toLocaleDateString('ru-RU');
        }

        // Active minutes
        if (activeMinRes.data && activeMinRes.data.length > 0) {
          const total = activeMinRes.data.reduce((sum, r) => sum + (Number(r.exercise_minutes) || 0), 0);
          newMetrics.activeMin.value = Math.round(total).toLocaleString();
        }

        // Calories - среднее за день
        if (caloriesRes.data && caloriesRes.data.length > 0) {
          // Группируем по дням и суммируем
          const dailyTotals = caloriesRes.data.reduce((acc: Record<string, number>, r) => {
            const date = r.measurement_date;
            acc[date] = (acc[date] || 0) + Number(r.value);
            return acc;
          }, {});
          const days = Object.keys(dailyTotals).length;
          if (days > 0) {
            const totalCals = Object.values(dailyTotals).reduce((sum: number, v: number) => sum + v, 0);
            const avg = totalCals / days;
            newMetrics.calories.value = Math.round(avg).toLocaleString();
          }
        }

        // Steps - среднее за неделю
        if (stepsRes.data && stepsRes.data.length > 0) {
          // Группируем по дням, берем максимум (если несколько источников)
          const dailySteps = stepsRes.data.reduce((acc: Record<string, number>, r) => {
            const date = r.measurement_date;
            const val = Number(r.value);
            acc[date] = Math.max(acc[date] || 0, val);
            return acc;
          }, {});
          const days = Object.keys(dailySteps).length;
          if (days > 0) {
            const totalSteps = Object.values(dailySteps).reduce((sum: number, v: number) => sum + v, 0);
            const avg = Math.round(totalSteps / days);
            newMetrics.avgSteps.value = avg.toLocaleString();
          }
        }

        // Resting HR
        if (restHrRes.data && restHrRes.data.length > 0) {
          const avg = restHrRes.data.reduce((sum, r) => sum + Number(r.value), 0) / restHrRes.data.length;
          newMetrics.restHr.value = Math.round(avg).toString();
        }

        // Hydration
        if (hydrationRes.data) {
          newMetrics.hydration.value = Number(hydrationRes.data.value).toFixed(1);
        }

        // Workouts - количество тренировок
        if (workoutsRes.data && workoutsRes.data.length > 0) {
          newMetrics.workouts.value = workoutsRes.data.length.toString();
        }

        setMetricsData(newMetrics);
      } catch (error) {
        console.error('Error fetching additional metrics:', error);
      }
    };

    fetchMetrics();
  }, [user]);

  const allMetrics = useMemo(() => [
    {
      icon: <Moon className="h-4 w-4 text-purple-500" />,
      title: t('extraMetrics.sleep'),
      value: metricsData.sleep.value,
      unit: t('extraMetrics.units.hours'),
      change: metricsData.sleep.change,
      subtitle: metricsData.sleep.subtitle,
      color: "purple-500",
      route: "/metric/recovery"
    },
    {
      icon: <Heart className="h-4 w-4 text-green-500" />,
      title: t('dashboard.metrics.recovery'),
      value: metricsData.recovery.value,
      unit: "%",
      change: metricsData.recovery.change,
      subtitle: metricsData.recovery.subtitle,
      color: "green-500",
      route: "/metric/recovery"
    },
    {
      icon: <TrendingUp className="h-4 w-4 text-green-500" />,
      title: t('extraMetrics.strain'),
      value: metricsData.strain.value,
      unit: "/21",
      change: metricsData.strain.change,
      subtitle: metricsData.strain.subtitle,
      color: "green-500",
      route: "/metric/steps"
    },
    {
      icon: <Activity className="h-4 w-4 text-primary" />,
      title: t('extraMetrics.activeMin'),
      value: metricsData.activeMin.value,
      unit: t('extraMetrics.units.min'),
      change: metricsData.activeMin.change,
      subtitle: metricsData.activeMin.subtitle,
      color: "primary",
      route: "/metric/steps"
    },
    {
      icon: <Flame className="h-4 w-4 text-orange-500" />,
      title: t('extraMetrics.calories'),
      value: metricsData.calories.value,
      unit: t('extraMetrics.units.kcal'),
      change: metricsData.calories.change,
      subtitle: metricsData.calories.subtitle,
      color: "orange-500",
      route: "/metric/steps"
    },
    {
      icon: <Footprints className="h-4 w-4 text-accent" />,
      title: t('extraMetrics.avgSteps'),
      value: metricsData.avgSteps.value,
      unit: t('metrics.units.steps'),
      change: metricsData.avgSteps.change,
      subtitle: metricsData.avgSteps.subtitle,
      color: "accent",
      route: "/metric/steps"
    },
    {
      icon: <Heart className="h-4 w-4 text-red-500" />,
      title: t('extraMetrics.restHr'),
      value: metricsData.restHr.value,
      unit: t('extraMetrics.units.bpm'),
      change: metricsData.restHr.change,
      subtitle: metricsData.restHr.subtitle,
      color: "red-500",
      route: "/metric/recovery"
    },
    {
      icon: <Droplets className="h-4 w-4 text-blue-500" />,
      title: t('extraMetrics.hydration'),
      value: metricsData.hydration.value,
      unit: t('extraMetrics.units.liters'),
      change: metricsData.hydration.change,
      subtitle: metricsData.hydration.subtitle,
      color: "blue-500",
      route: "/metric/steps"
    },
    {
      icon: <Dumbbell className="h-4 w-4 text-primary" />,
      title: t('extraMetrics.workouts'),
      value: metricsData.workouts.value,
      unit: t('extraMetrics.units.times'),
      change: metricsData.workouts.change,
      subtitle: metricsData.workouts.subtitle,
      color: "primary",
      route: "/metric/steps"
    }
  ], [metricsData, t]);


  return (
    <div className="space-y-4">
      {/* Compact grid layout - 2 columns on mobile, 3 on tablet, 4 on desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 stagger-fade-in">
        {/* Team Rank - Compact and clickable */}
        <button 
          className="bg-card border-2 border-primary/20 hover:border-primary/40 rounded-xl p-3 text-center transition-all duration-500 hover:scale-105 active:scale-95 cursor-pointer shadow-sm hover:shadow-glow group"
          onClick={() => navigate('/leaderboard')}
        >
          <div className="text-[10px] text-muted-foreground uppercase tracking-wide mb-0.5">{t('leaderboard.title')} {t('leaderboard.rank')}</div>
          <div className="text-2xl font-bold text-primary mb-0.5 transition-all duration-300 group-hover:scale-110">#3</div>
          <div className="text-[10px] text-muted-foreground">2KM ROW</div>
        </button>

        {/* All metrics as compact cards */}
        {allMetrics.map((metric, index) => (
          <CompactMetricCard 
            key={index} 
            {...metric} 
            onClick={metric.route ? () => navigate(metric.route) : undefined}
          />
        ))}
      </div>

      {/* Weekly Goals - Full width compact */}
      <div className="bg-card/30 rounded-xl p-3 border border-border/20 animate-fade-in">
        <WeeklyGoals />
      </div>

      {/* Leaderboard - Full width */}
      <div className="animate-fade-in">
        <Leaderboard />
      </div>
    </div>
  );
}
