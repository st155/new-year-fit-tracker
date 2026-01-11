import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainerProgressRing } from '@/components/trainer/ui';
import { Calendar, Target } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { getIntlLocale } from '@/lib/date-locale';

interface TrainingPlanOverviewTabProps {
  createdAt: string;
  durationWeeks: number;
  totalWorkouts: number;
  activeClients: number;
  completionRate: number;
}

export function TrainingPlanOverviewTab({
  createdAt,
  durationWeeks,
  totalWorkouts,
  activeClients,
  completionRate,
}: TrainingPlanOverviewTabProps) {
  const { t } = useTranslation('trainingPlan');

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {t('overview.planInfo')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('overview.created')}</span>
            <span className="font-medium">
              {new Date(createdAt).toLocaleDateString(getIntlLocale())}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('overview.duration')}</span>
            <span className="font-medium">{durationWeeks} {t('overview.weeks')}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('overview.totalWorkouts')}</span>
            <span className="font-medium">{totalWorkouts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t('overview.activeClients')}</span>
            <span className="font-medium">{activeClients}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            {t('overview.efficiency')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">{t('overview.averageProgress')}</span>
            <div className="flex items-center gap-2">
              <TrainerProgressRing value={completionRate} size={40} strokeWidth={4} />
              <span className="font-semibold">{completionRate}%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            {t('overview.goodResults')}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
