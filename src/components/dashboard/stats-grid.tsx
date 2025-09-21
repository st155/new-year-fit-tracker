import { FitnessCard } from "@/components/ui/fitness-card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, Zap, Award } from "lucide-react";

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

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <StatCard
        title="Процент жира"
        value="12.5"
        unit="%"
        target="10"
        variant="gradient"
        change={-8}
        icon={<Target className="w-4 h-4" />}
      />
      <StatCard
        title="Вес тела"
        value="78.2"
        unit="кг"
        change={-3}
        icon={<TrendingDown className="w-4 h-4" />}
      />
      <StatCard
        title="Подтягивания"
        value="18"
        unit="раз"
        target="25"
        variant="success"
        change={25}
        icon={<TrendingUp className="w-4 h-4" />}
      />
      <StatCard
        title="Место в рейтинге"
        value="3"
        unit="/8"
        variant="default"
        change={1}
        icon={<Award className="w-4 h-4" />}
      />
    </div>
  );
}