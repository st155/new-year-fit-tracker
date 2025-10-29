import { Users, Dumbbell, TrendingUp } from 'lucide-react';
import { TrainerStatCard } from '@/components/trainer/ui';

interface TrainingPlanStatsProps {
  activeClients: number;
  totalWorkouts: number;
  completionRate: number;
}

export function TrainingPlanStats({
  activeClients,
  totalWorkouts,
  completionRate,
}: TrainingPlanStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <TrainerStatCard
        title="Активных клиентов"
        value={activeClients}
        icon={<Users />}
        color="blue"
        subtitle="Назначен план"
      />
      <TrainerStatCard
        title="Тренировок в неделю"
        value={totalWorkouts}
        icon={<Dumbbell />}
        color="orange"
        subtitle="В расписании"
      />
      <TrainerStatCard
        title="Выполнение"
        value={`${completionRate}%`}
        icon={<TrendingUp />}
        color="green"
        subtitle="Средний показатель"
      />
    </div>
  );
}
