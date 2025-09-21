import { useState, useEffect } from 'react';
import { FitnessCard } from "@/components/ui/fitness-card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Zap, Award } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

interface StatCardProps {
  title: string;
  value: string | number;
  unit?: string;
  change?: number;
  target?: string | number;
  variant?: "default" | "success" | "gradient";
  icon?: React.ReactNode;
}

function StatCard({ title, value, unit, change, target, variant = "default", icon }: StatCardProps) {
  const isPositiveChange = change && change > 0;
  const hasTarget = target !== undefined;
  
  return (
    <FitnessCard variant={variant} className="p-6 hover:scale-[1.02] transition-transform">
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
        .select('weight, body_fat_percentage')
        .eq('user_id', user.id)
        .order('measurement_date', { ascending: false })
        .limit(1)
        .maybeSingle();

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
      if (pullUpGoal) {
        const { data: measurements } = await supabase
          .from('measurements')
          .select('value')
          .eq('goal_id', pullUpGoal.id)
          .eq('user_id', user.id)
          .order('measurement_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        
        pullUpValue = measurements?.value || null;
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

      setStats({
        bodyFat: {
          current: bodyComposition?.body_fat_percentage || null,
          target: bodyFatGoal?.target_value || 12
        },
        weight: bodyComposition?.weight || null,
        pullUps: {
          current: pullUpValue,
          target: pullUpGoal?.target_value || 18
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
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Активных участников"
          value="8"
          variant="gradient"
          change={14}
          icon={<Award className="w-4 h-4" />}
        />
        <StatCard
          title="Средний прогресс"
          value="67"
          unit="%"
          variant="success"
          change={8}
          icon={<TrendingUp className="w-4 h-4" />}
        />
        <StatCard
          title="Целей достигнуто"
          value="23"
          unit="/40"
          change={12}
          icon={<Target className="w-4 h-4" />}
        />
        <StatCard
          title="Обновлений сегодня"
          value="12"
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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Процент жира"
        value={stats.bodyFat?.current ? stats.bodyFat.current.toFixed(1) : "—"}
        unit="%"
        target={stats.bodyFat?.target}
        variant="gradient"
        change={stats.bodyFat?.current && stats.bodyFat?.target 
          ? Math.round(((stats.bodyFat.target - stats.bodyFat.current) / stats.bodyFat.current) * 100)
          : undefined}
        icon={<Target className="w-4 h-4" />}
      />
      <StatCard
        title="Вес тела"
        value={stats.weight ? stats.weight.toFixed(1) : "—"}
        unit="кг"
        change={stats.weight ? -3 : undefined}
        icon={<TrendingDown className="w-4 h-4" />}
      />
      <StatCard
        title="Подтягивания"
        value={stats.pullUps?.current || "—"}
        unit="раз"
        target={stats.pullUps?.target}
        variant={stats.pullUps?.current ? "success" : "default"}
        change={stats.pullUps?.current && stats.pullUps?.target
          ? Math.round(((stats.pullUps.current - (stats.pullUps.target * 0.8)) / (stats.pullUps.target * 0.8)) * 100)
          : undefined}
        icon={<TrendingUp className="w-4 h-4" />}
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