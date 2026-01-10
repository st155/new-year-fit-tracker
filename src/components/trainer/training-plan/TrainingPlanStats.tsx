import { Users, Dumbbell, TrendingUp } from 'lucide-react';
import { TrainerStatCard } from '@/components/trainer/ui';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('trainerHealth');
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <TrainerStatCard
        title={t('stats.activeClients')}
        value={activeClients}
        icon={<Users />}
        color="blue"
        subtitle={t('stats.planAssigned')}
      />
      <TrainerStatCard
        title={t('stats.workoutsPerWeek')}
        value={totalWorkouts}
        icon={<Dumbbell />}
        color="orange"
        subtitle={t('stats.inSchedule')}
      />
      <TrainerStatCard
        title={t('stats.completion')}
        value={`${completionRate}%`}
        icon={<TrendingUp />}
        color="green"
        subtitle={t('stats.averageRate')}
      />
    </div>
  );
}
