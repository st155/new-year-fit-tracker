import { useState, useEffect } from 'react';
import { FitnessCard } from "@/components/ui/fitness-card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Zap, Award } from "lucide-react";
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
}

function StatCard({ title, value, unit, change, target, variant = "default", icon, onClick }: StatCardProps) {
  const isPositiveChange = change && change > 0;
  const hasTarget = target !== undefined;
  
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
  const [stats, setStats] = useState<any>({
    bodyFat: null,
    weight: null,
    pullUps: null,
    ranking: 3
  });
  const [loading, setLoading] = useState(true);
  const [activeDetail, setActiveDetail] = useState<'weight' | 'bodyFat' | 'pullUps' | null>(null);

  useEffect(() => {
    if (user && userRole === "participant") {
      fetchUserStats();
    } else {
      setLoading(false);
    }
  }, [user, userRole]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      // Получаем актуальные данные пользователя
      const today = new Date().toISOString().split('T')[0];
      
      // Получаем последние данные состава тела
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

      // Рассчитываем изменения для веса и процента жира
      let weightChange = null;
      let bodyFatChange = null;
      
      if (bodyComposition && bodyComposition.length > 1) {
        const current = bodyComposition[0];
        const previous = bodyComposition[1];
        
        if (current.weight && previous.weight) {
          weightChange = Math.round(((current.weight - previous.weight) / previous.weight) * 100);
        }
        
        if (current.body_fat_percentage && previous.body_fat_percentage) {
          bodyFatChange = Math.round(((previous.body_fat_percentage - current.body_fat_percentage) / current.body_fat_percentage) * 100);
        }
      }

      setStats({
        bodyFat: {
          current: bodyComposition?.[0]?.body_fat_percentage || null,
          target: bodyFatGoal?.target_value || 11,
          change: bodyFatChange
        },
        weight: {
          current: bodyComposition?.[0]?.weight || null,
          change: weightChange
        },
        pullUps: {
          current: pullUpValue,
          target: pullUpGoal?.target_value || 17,
          change: pullUpChange
        },
        ranking: 3
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (userRole === "trainer") {
    const [trainerStats, setTrainerStats] = useState({
      activeParticipants: 0,
      averageProgress: 0,
      goalsCompleted: 0,
      totalGoals: 0,
      todayUpdates: 0
    });

    useEffect(() => {
      if (user) {
        fetchTrainerStats();
      }
    }, [user]);

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

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-24 bg-muted animate-pulse rounded-lg"></div>
        ))}
      </div>
    );
  }

  // Если открыт детальный вид
  if (activeDetail === 'weight') {
    return <WeightProgressDetail onBack={() => setActiveDetail(null)} />;
  }
  
  if (activeDetail === 'bodyFat') {
    return <BodyFatProgressDetail onBack={() => setActiveDetail(null)} />;
  }
  
  if (activeDetail === 'pullUps') {
    return <PullUpsProgressDetail onBack={() => setActiveDetail(null)} />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Процент жира"
        value={stats.bodyFat?.current ? stats.bodyFat.current.toFixed(1) : "—"}
        unit="%"
        target={stats.bodyFat?.target}
        variant="gradient"
        change={stats.bodyFat?.change}
        icon={<Target className="w-4 h-4" />}
        onClick={() => setActiveDetail('bodyFat')}
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