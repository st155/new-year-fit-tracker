import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrainerProgressRing } from '@/components/trainer/ui';
import { Calendar, Target } from 'lucide-react';
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
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Информация о плане
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Создан:</span>
            <span className="font-medium">
              {new Date(createdAt).toLocaleDateString(getIntlLocale())}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Длительность:</span>
            <span className="font-medium">{durationWeeks} недель</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Всего тренировок:</span>
            <span className="font-medium">{totalWorkouts}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Активных клиентов:</span>
            <span className="font-medium">{activeClients}</span>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Эффективность
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Средний прогресс</span>
            <div className="flex items-center gap-2">
              <TrainerProgressRing value={completionRate} size={40} strokeWidth={4} />
              <span className="font-semibold">{completionRate}%</span>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            План показывает хорошие результаты у назначенных клиентов
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
