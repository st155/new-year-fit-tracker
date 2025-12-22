import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  Clock, 
  FlaskConical,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { format, differenceInWeeks, addWeeks } from 'date-fns';
import { ru } from 'date-fns/locale';

interface SupplementTimelineProps {
  supplementName: string;
  startDate: string;
  expectedEffectWeeks: number;
  hasRecentLabResults?: boolean;
  lastLabDate?: string;
}

export function SupplementTimeline({
  supplementName,
  startDate,
  expectedEffectWeeks,
  hasRecentLabResults = false,
  lastLabDate,
}: SupplementTimelineProps) {
  const start = new Date(startDate);
  const now = new Date();
  const weeksElapsed = differenceInWeeks(now, start);
  const progressPercent = Math.min((weeksElapsed / expectedEffectWeeks) * 100, 100);
  const expectedEffectDate = addWeeks(start, expectedEffectWeeks);
  const recommendedLabDate = addWeeks(start, Math.max(expectedEffectWeeks - 1, 4));
  
  const isEffectExpected = weeksElapsed >= expectedEffectWeeks;
  const shouldDoLab = weeksElapsed >= expectedEffectWeeks - 2 && !hasRecentLabResults;

  const getStatusConfig = () => {
    if (isEffectExpected && hasRecentLabResults) {
      return {
        status: 'ready',
        color: 'text-green-400',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/30',
        message: 'Можно оценить эффективность',
      };
    }
    if (isEffectExpected && !hasRecentLabResults) {
      return {
        status: 'needs_lab',
        color: 'text-amber-400',
        bgColor: 'bg-amber-500/10',
        borderColor: 'border-amber-500/30',
        message: 'Рекомендуется сдать анализы',
      };
    }
    if (shouldDoLab) {
      return {
        status: 'upcoming',
        color: 'text-blue-400',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/30',
        message: 'Скоро время для анализов',
      };
    }
    return {
      status: 'in_progress',
      color: 'text-purple-400',
      bgColor: 'bg-purple-500/10',
      borderColor: 'border-purple-500/30',
      message: 'Накопительный эффект',
    };
  };

  const config = getStatusConfig();

  return (
    <Card className={`p-4 ${config.bgColor} ${config.borderColor} border`}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FlaskConical className={`h-5 w-5 ${config.color}`} />
            <span className="font-semibold">{supplementName}</span>
          </div>
          <Badge variant="outline" className={config.borderColor}>
            Неделя {weeksElapsed} из {expectedEffectWeeks}
          </Badge>
        </div>

        {/* Progress bar */}
        <div className="space-y-2">
          <Progress value={progressPercent} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Начало</span>
            <span className={config.color}>{config.message}</span>
            <span>Эффект</span>
          </div>
        </div>

        {/* Timeline details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Добавлено</p>
              <p className="font-medium">{format(start, 'd MMM yyyy', { locale: ru })}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 p-2 rounded-lg bg-background/50">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-xs text-muted-foreground">Ожидаемый эффект</p>
              <p className="font-medium">{format(expectedEffectDate, 'd MMM yyyy', { locale: ru })}</p>
            </div>
          </div>
        </div>

        {/* Lab recommendation */}
        {shouldDoLab && (
          <div className={`flex items-center gap-3 p-3 rounded-lg ${
            config.status === 'needs_lab' ? 'bg-amber-500/10' : 'bg-blue-500/10'
          }`}>
            {config.status === 'needs_lab' ? (
              <AlertCircle className="h-5 w-5 text-amber-400 flex-shrink-0" />
            ) : (
              <CheckCircle2 className="h-5 w-5 text-blue-400 flex-shrink-0" />
            )}
            <div>
              <p className={`font-medium ${
                config.status === 'needs_lab' ? 'text-amber-400' : 'text-blue-400'
              }`}>
                {config.status === 'needs_lab' ? 'Время сдать анализы' : 'Анализы через ~2 недели'}
              </p>
              <p className="text-xs text-muted-foreground">
                Рекомендуемая дата: {format(recommendedLabDate, 'd MMM yyyy', { locale: ru })}
              </p>
            </div>
          </div>
        )}

        {/* Last lab info */}
        {lastLabDate && (
          <div className="text-xs text-muted-foreground text-center">
            Последний анализ: {format(new Date(lastLabDate), 'd MMM yyyy', { locale: ru })}
          </div>
        )}
      </div>
    </Card>
  );
}