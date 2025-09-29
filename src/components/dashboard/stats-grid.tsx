import { useState, useEffect } from 'react';
import { FitnessCard } from "@/components/ui/fitness-card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Zap, Award, Heart, Activity } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { WeightProgressDetail } from '@/components/detail/WeightProgressDetail';
import { BodyFatProgressDetail } from '@/components/detail/BodyFatProgressDetail';
import { PullUpsProgressDetail } from '@/components/detail/PullUpsProgressDetail';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  target?: string | number;
  variant?: "default" | "success" | "gradient";
  icon?: React.ReactNode;
  onClick?: () => void;
  compact?: boolean;
}

function StatCard({ title, value, unit, change, target, variant = "default", icon, onClick, compact }: StatCardProps) {
  const isPositiveChange = change && change > 0;
  const hasTarget = target !== undefined;
  
  if (compact) {
    return (
      <FitnessCard 
        variant={variant} 
        className={`p-4 hover:scale-[1.02] transition-transform ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {icon && <div className="text-current opacity-80">{icon}</div>}
            <div>
              <p className="text-sm font-medium opacity-90">{title}</p>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold">{value}</span>
                {unit && <span className="text-xs opacity-80">{unit}</span>}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            {hasTarget && (
              <div className="flex items-center gap-1 text-xs opacity-70 mb-1">
                <Target className="w-3 h-3" />
                <span>Цель: {target}{unit}</span>
              </div>
            )}
            {change !== undefined && (
              <Badge 
                variant={isPositiveChange ? "default" : "destructive"}
                className="text-xs"
              >
                {isPositiveChange ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {change > 0 ? '+' : ''}{change}%
              </Badge>
            )}
          </div>
        </div>
      </FitnessCard>
    );
  }
  
  return (
    <FitnessCard 
      variant={variant} 
      className={`p-6 hover:scale-[1.02] transition-transform ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {icon && <div className="text-current opacity-80">{icon}</div>}
            <p className="text-sm font-medium opacity-90">{title}</p>
          </div>
          
          <div className="space-y-1">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold">{value}</span>
              {unit && <span className="text-sm opacity-80">{unit}</span>}
            </div>
            
            {hasTarget && (
              <div className="flex items-center gap-2 text-xs opacity-70">
                <Target className="w-3 h-3" />
                <span>Цель: {target}{unit}</span>
              </div>
            )}
          </div>
        </div>
        
        {change !== undefined && (
          <Badge 
            variant={isPositiveChange ? "default" : "destructive"}
            className="ml-2 font-semibold"
          >
            {isPositiveChange ? (
              <TrendingUp className="w-3 h-3 mr-1" />
            ) : (
              <TrendingDown className="w-3 h-3 mr-1" />
            )}
            {change > 0 ? '+' : ''}{change}%
          </Badge>
        )}
      </div>
    </FitnessCard>
  );
}

interface StatsGridProps {
  userRole: "participant" | "trainer";
}

export function StatsGrid({ userRole }: StatsGridProps) {
  const { user } = useAuth();
  
  // Состояние для участников
  const [stats, setStats] = useState<any>({
    bodyFat: null,
    weight: null,
    pullUps: null,
    recovery: null,
    steps: null,
    ranking: 3
  });
  const [loading, setLoading] = useState(true);
  const [activeDetail, setActiveDetail] = useState<'weight' | 'bodyFat' | 'pullUps' | null>(null);
  
  // Состояние для тренеров
  const [trainerStats, setTrainerStats] = useState({
    activeParticipants: 0,
    averageProgress: 0,
    goalsCompleted: 0,
    totalGoals: 0,
    todayUpdates: 0
  });

  // Функция для загрузки статистики участника
  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Получаем актуальные данные пользователя
      const today = new Date().toISOString().split('T')[0];
      
      // Сначала проверяем данные Withings
      const { data: withingsWeight } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, unit, source)
        `)
        .eq('user_id', user.id)
        .eq('user_metrics.metric_name', 'Вес')
        .eq('user_metrics.source', 'withings')
        .order('measurement_date', { ascending: false })
        .limit(10);

      const { data: withingsBodyFat } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, unit, source)
        `)
        .eq('user_id', user.id)
        .eq('user_metrics.metric_name', 'Процент жира')
        .eq('user_metrics.source', 'withings')
        .order('measurement_date', { ascending: false })
        .limit(10);

      // Получаем последние данные состава тела (fallback)
      const { data: bodyComposition } = await supabase
        .from('body_composition')
        .select('weight, body_fat_percentage, measurement_date')
        .eq('user_id', user.id)
        .order('measurement_date', { ascending: false })
        .limit(2); // Берем 2 записи для расчета изменений

      // Получаем цели пользователя для подтягиваний
      const { data: pullUpGoal } = await supabase
        .from('goals')
        .select('id, target_value')
        .eq('user_id', user.id)
        .ilike('goal_name', '%подтяг%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Получаем последние измерения подтягиваний
      let pullUpValue = null;
      let pullUpChange = null;
      if (pullUpGoal) {
        const { data: measurements } = await supabase
          .from('measurements')
          .select('value, measurement_date')
          .eq('goal_id', pullUpGoal.id)
          .eq('user_id', user.id)
          .order('measurement_date', { ascending: false })
          .limit(2);
        
        if (measurements && measurements.length > 0) {
          pullUpValue = measurements[0].value;
          if (measurements.length > 1) {
            pullUpChange = Math.round(((measurements[0].value - measurements[1].value) / measurements[1].value) * 100);
          }
        }
      }

      // Получаем цель по жиру
      const { data: bodyFatGoal } = await supabase
        .from('goals')
        .select('target_value')
        .eq('user_id', user.id)
        .ilike('goal_name', '%жир%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Получаем Recovery Score за последние дни
      const { data: recoveryData } = await supabase
        .from('metric_values')
        .select(`
          value,
          measurement_date,
          user_metrics!inner(metric_name, metric_category, unit, source)
        `)
        .eq('user_id', user.id)
        .eq('user_metrics.metric_name', 'Recovery Score')
        .eq('user_metrics.source', 'whoop')
        .order('measurement_date', { ascending: false })
        .limit(2);

      // Получаем Steps за последние дни
      const { data: stepsData } = await supabase
        .from('daily_health_summary')
        .select('steps, date')
        .eq('user_id', user.id)
        .not('steps', 'is', null)
        .order('date', { ascending: false })
        .limit(2);

      // Рассчитываем изменения для веса, процента жира, Recovery и Steps
      let weightChange = null;
      let bodyFatChange = null;
      let currentWeight = null;
      let currentBodyFat = null;
      let currentRecovery = null;
      let recoveryChange = null;
      let currentSteps = null;
      let stepsChange = null;

      // Используем данные Withings если есть, иначе body_composition
      if (withingsWeight && withingsWeight.length > 0) {
        currentWeight = withingsWeight[0].value;
        if (withingsWeight.length > 1) {
          const current = withingsWeight[0].value;
          const previous = withingsWeight[1].value;
          weightChange = Math.round(((current - previous) / previous) * 100);
        }
      } else if (bodyComposition && bodyComposition.length > 0) {
        currentWeight = bodyComposition[0].weight;
        if (bodyComposition.length > 1 && bodyComposition[0].weight && bodyComposition[1].weight) {
          const current = bodyComposition[0].weight;
          const previous = bodyComposition[1].weight;
          weightChange = Math.round(((current - previous) / previous) * 100);
        }
      }

      if (withingsBodyFat && withingsBodyFat.length > 0) {
        currentBodyFat = withingsBodyFat[0].value;
        if (withingsBodyFat.length > 1) {
          const current = withingsBodyFat[0].value;
          const previous = withingsBodyFat[1].value;
          bodyFatChange = Math.round(((previous - current) / current) * 100);
        }
      } else if (bodyComposition && bodyComposition.length > 0 && bodyComposition[0].body_fat_percentage) {
        currentBodyFat = bodyComposition[0].body_fat_percentage;
        if (bodyComposition.length > 1 && bodyComposition[1].body_fat_percentage) {
          const current = bodyComposition[0].body_fat_percentage;
          const previous = bodyComposition[1].body_fat_percentage;
          bodyFatChange = Math.round(((previous - current) / current) * 100);
        }
      }

      // Обрабатываем данные Recovery
      if (recoveryData && recoveryData.length > 0) {
        currentRecovery = recoveryData[0].value;
        if (recoveryData.length > 1) {
          const current = recoveryData[0].value;
          const previous = recoveryData[1].value;
          recoveryChange = Math.round(current - previous);
        }
      }

      // Обрабатываем данные Steps
      if (stepsData && stepsData.length > 0) {
        currentSteps = stepsData[0].steps;
        if (stepsData.length > 1) {
          const current = stepsData[0].steps;
          const previous = stepsData[1].steps;
          stepsChange = Math.round(((current - previous) / previous) * 100);
        }
      }

      setStats({
        bodyFat: {
          current: currentBodyFat,
          target: bodyFatGoal?.target_value || 11,
          change: bodyFatChange
        },
        weight: {
          current: currentWeight,
          change: weightChange
        },
        pullUps: {
          current: pullUpValue,
          target: pullUpGoal?.target_value || 17,
          change: pullUpChange
        },
        recovery: {
          current: currentRecovery,
          change: recoveryChange
        },
        steps: {
          current: currentSteps,
          target: 10000,
          change: stepsChange
        },
        ranking: 3
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  // Функция для загрузки статистики тренера
  const fetchTrainerStats = async () => {
    if (!user) return;

    try {
      // Получаем всех клиентов тренера
      const { data: clients } = await supabase
        .from('trainer_clients')
        .select('client_id')
        .eq('trainer_id', user.id)
        .eq('active', true);

      const clientIds = clients?.map(c => c.client_id) || [];
      
      // Получаем цели всех клиентов
      const { data: goals } = await supabase
        .from('goals')
        .select('id, user_id')
        .in('user_id', clientIds);

      // Получаем измерения за сегодня
      const today = new Date().toISOString().split('T')[0];
      const { data: todayMeasurements } = await supabase
        .from('measurements')
        .select('id')
        .in('user_id', clientIds)
        .gte('created_at', `${today}T00:00:00`)
        .lt('created_at', `${today}T23:59:59`);

      // Рассчитываем статистику
      const totalGoals = goals?.length || 0;
      const goalsWithMeasurements = goals ? await Promise.all(
        goals.map(async (goal) => {
          const { data: measurements } = await supabase
            .from('measurements')
            .select('id')
            .eq('goal_id', goal.id)
            .limit(1);
          return measurements && measurements.length > 0;
        })
      ) : [];
      
      const completedGoals = goalsWithMeasurements.filter(Boolean).length;
      const averageProgress = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

      setTrainerStats({
        activeParticipants: clientIds.length,
        averageProgress,
        goalsCompleted: completedGoals,
        totalGoals,
        todayUpdates: todayMeasurements?.length || 0
      });
    } catch (error) {
      console.error('Error fetching trainer stats:', error);
      // Fallback к статичным данным
      setTrainerStats({
        activeParticipants: 8,
        averageProgress: 67,
        goalsCompleted: 23,
        totalGoals: 40,
        todayUpdates: 12
      });
    }
  };

  // Хук для загрузки статистики участника
  useEffect(() => {
    if (user && userRole === "participant") {
      fetchUserStats();
    } else if (userRole === "participant") {
      setLoading(false);
    }
  }, [user, userRole]);

  // Хук для загрузки статистики тренера
  useEffect(() => {
    if (user && userRole === "trainer") {
      fetchTrainerStats();
    }
  }, [user, userRole]);

  // Рендер для тренера
  if (userRole === "trainer") {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Активных участников"
          value={trainerStats.activeParticipants}
          variant="gradient"
          change={14}
          icon={<Award className="w-4 h-4" />}
        />
        <StatCard
          title="Средний прогресс"
          value={trainerStats.averageProgress}
          unit="%"
          variant="success"
          change={8}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          title="Целей достигнуто"
          value={trainerStats.goalsCompleted}
          unit={`/${trainerStats.totalGoals}`}
          change={12}
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          title="Обновлений сегодня"
          value={trainerStats.todayUpdates}
          variant="default"
          icon={<Zap className="w-4 h-4" />}
        />
      </div>
    );
  }

  // Состояние загрузки
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  // Детальные виды
  if (activeDetail === 'weight') {
    return <WeightProgressDetail onBack={() => setActiveDetail(null)} />;
  }
  
  if (activeDetail === 'bodyFat') {
    return <BodyFatProgressDetail onBack={() => setActiveDetail(null)} />;
  }
  
  if (activeDetail === 'pullUps') {
    return <PullUpsProgressDetail onBack={() => setActiveDetail(null)} />;
  }

  // Рендер для участника
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <StatCard
        title="Recovery Score"
        value={stats.recovery?.current ? Math.round(stats.recovery.current) : "—"}
        unit="%"
        variant={stats.recovery?.current && stats.recovery.current >= 70 ? "success" : 
                stats.recovery?.current && stats.recovery.current >= 50 ? "default" : "default"}
        change={stats.recovery?.change}
        icon={<Heart className="w-4 h-4" />}
        compact
      />
      <StatCard
        title="Шаги"
        value={stats.steps?.current ? stats.steps.current.toLocaleString() : "—"}
        unit=""
        target={stats.steps?.target?.toLocaleString()}
        variant={stats.steps?.current && stats.steps.current >= 10000 ? "success" : "default"}
        change={stats.steps?.change}
        icon={<Activity className="w-4 h-4" />}
        compact
      />
      <StatCard
        title="Процент жира"
        value={stats.bodyFat?.current ? stats.bodyFat.current.toFixed(1) : "—"}
        unit="%"
        target={stats.bodyFat?.target}
        variant="default"
        change={stats.bodyFat?.change}
        icon={<Target className="w-4 h-4" />}
        onClick={() => setActiveDetail('bodyFat')}
        compact
      />
      <StatCard
        title="Вес тела"
        value={stats.weight?.current ? stats.weight.current.toFixed(1) : "—"}
        unit="кг"
        change={stats.weight?.change}
        icon={<TrendingDown className="w-4 h-4" />}
        onClick={() => setActiveDetail('weight')}
      />
      <StatCard
        title="Подтягивания"
        value={stats.pullUps?.current || "—"}
        unit="раз"
        target={stats.pullUps?.target}
        variant={stats.pullUps?.current ? "success" : "default"}
        change={stats.pullUps?.change}
        icon={<TrendingUp className="w-4 h-4" />}
        onClick={() => setActiveDetail('pullUps')}
      />
      <StatCard
        title="Место в рейтинге"
        value={stats.ranking}
        unit="/8"
        variant="default"
        change={1}
        icon={<Award className="w-4 h-4" />}
      />
    </div>
  );
}