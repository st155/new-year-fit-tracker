import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Dumbbell,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useTrainingGaps, MuscleAnalysis, WellnessAnalysis } from '@/hooks/useTrainingGaps';
import { cn } from '@/lib/utils';

interface WeeklyGapAnalysisProps {
  onGenerateWorkout?: () => void;
  compact?: boolean;
}

function StatusBadge({ status, daysSince }: { status: string; daysSince: number | null }) {
  const config = {
    recent: { 
      label: daysSince === 0 ? 'Сегодня' : `${daysSince}д назад`, 
      variant: 'default' as const,
      className: 'bg-green-500/20 text-green-400 border-green-500/30'
    },
    due_soon: { 
      label: `${daysSince}д назад`, 
      variant: 'secondary' as const,
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    },
    neglected: { 
      label: `${daysSince}д — нужно!`, 
      variant: 'destructive' as const,
      className: 'bg-red-500/20 text-red-400 border-red-500/30'
    },
    overdue: { 
      label: `${daysSince}д — пропущено`, 
      variant: 'destructive' as const,
      className: 'bg-red-500/20 text-red-400 border-red-500/30'
    },
    never: { 
      label: 'Нет данных', 
      variant: 'outline' as const,
      className: 'bg-muted/50 text-muted-foreground'
    }
  };

  const c = config[status as keyof typeof config] || config.never;

  return (
    <Badge variant={c.variant} className={cn('text-xs', c.className)}>
      {c.label}
    </Badge>
  );
}

function MuscleRow({ group, analysis }: { group: string; analysis: MuscleAnalysis }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-lg">{analysis.icon}</span>
        <span className="text-sm font-medium">{analysis.name}</span>
      </div>
      <StatusBadge status={analysis.status} daysSince={analysis.daysSince} />
    </div>
  );
}

function WellnessRow({ activity, analysis }: { activity: string; analysis: WellnessAnalysis }) {
  if (analysis.completedCount === 0 && analysis.status === 'never') {
    return null; // Скрываем неиспользуемые активности
  }

  return (
    <div className="flex items-center justify-between py-1.5">
      <div className="flex items-center gap-2">
        <span className="text-lg">{analysis.icon}</span>
        <span className="text-sm font-medium">{analysis.name}</span>
      </div>
      <StatusBadge status={analysis.status} daysSince={analysis.daysSince} />
    </div>
  );
}

export function WeeklyGapAnalysis({ onGenerateWorkout, compact = false }: WeeklyGapAnalysisProps) {
  const { data, isLoading, error, refetch, isRefetching } = useTrainingGaps();

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Анализ недели
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3, 4].map(i => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="py-6 text-center text-muted-foreground">
          <p>Не удалось загрузить анализ</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-1" />
            Повторить
          </Button>
        </CardContent>
      </Card>
    );
  }

  const muscleEntries = Object.entries(data.muscleAnalysis);
  const wellnessEntries = Object.entries(data.wellnessAnalysis)
    .filter(([_, a]) => a.completedCount > 0 || a.status !== 'never');

  const neglectedMuscles = muscleEntries.filter(([_, a]) => a.status === 'neglected' || a.status === 'never');
  const hasWarnings = neglectedMuscles.length > 0 || data.recommendations.some(r => r.type === 'warning');

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              Анализ недели
              {hasWarnings && (
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
              )}
            </CardTitle>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefetching && "animate-spin")} />
            </Button>
          </div>
          {data.stats && (
            <p className="text-xs text-muted-foreground">
              {data.stats.totalWorkouts} тренировок за {data.stats.periodDays} дней 
              (~{data.stats.avgWorkoutsPerWeek}/нед)
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Группы мышц */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Группы мышц
              </span>
            </div>
            <div className="space-y-0.5">
              {muscleEntries
                .sort((a, b) => {
                  const order = { neglected: 0, never: 1, due_soon: 2, recent: 3 };
                  return (order[a[1].status as keyof typeof order] ?? 4) - 
                         (order[b[1].status as keyof typeof order] ?? 4);
                })
                .slice(0, compact ? 4 : undefined)
                .map(([group, analysis]) => (
                  <MuscleRow key={group} group={group} analysis={analysis} />
                ))}
            </div>
          </div>

          {/* Wellness */}
          {wellnessEntries.length > 0 && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  Wellness
                </span>
              </div>
              <div className="space-y-0.5">
                {wellnessEntries
                  .sort((a, b) => {
                    const order = { overdue: 0, due_soon: 1, recent: 2, never: 3 };
                    return (order[a[1].status as keyof typeof order] ?? 4) - 
                           (order[b[1].status as keyof typeof order] ?? 4);
                  })
                  .slice(0, compact ? 3 : undefined)
                  .map(([activity, analysis]) => (
                    <WellnessRow key={activity} activity={activity} analysis={analysis} />
                  ))}
              </div>
            </div>
          )}

          {/* Рекомендации */}
          {data.recommendations.length > 0 && !compact && (
            <div className="pt-2 border-t border-border/50">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                Рекомендации
              </div>
              <div className="space-y-1.5">
                {data.recommendations.slice(0, 3).map((rec, idx) => (
                  <div 
                    key={idx} 
                    className={cn(
                      "text-xs p-2 rounded-md",
                      rec.type === 'warning' && "bg-yellow-500/10 text-yellow-400",
                      rec.type === 'info' && "bg-blue-500/10 text-blue-400",
                      rec.type === 'success' && "bg-green-500/10 text-green-400"
                    )}
                  >
                    {rec.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Кнопка генерации */}
          {onGenerateWorkout && (
            <Button 
              onClick={onGenerateWorkout}
              className="w-full mt-2"
              variant="secondary"
              size="sm"
            >
              <Dumbbell className="h-4 w-4 mr-2" />
              Сгенерировать тренировку
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
