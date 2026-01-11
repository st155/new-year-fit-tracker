import React from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  TrendingUp, 
  AlertTriangle, 
  Clock, 
  Dumbbell,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { useTrainingGaps, MuscleAnalysis, WellnessAnalysis } from '@/hooks/useTrainingGaps';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface WeeklyGapAnalysisProps {
  onGenerateWorkout?: () => void;
  compact?: boolean;
}

// Цвета для тепловой карты
const STATUS_COLORS = {
  recent: 'bg-green-500',
  due_soon: 'bg-yellow-500',
  neglected: 'bg-red-500',
  overdue: 'bg-red-500',
  never: 'bg-muted'
} as const;

function StatusBadge({ status, daysSince, t }: { status: string; daysSince: number | null; t: (key: string) => string }) {
  const config = {
    recent: { 
      label: daysSince === 0 ? t('gap.today') : `${daysSince}${t('gap.daysShort')}`, 
      className: 'bg-green-500/20 text-green-400 border-green-500/30'
    },
    due_soon: { 
      label: `${daysSince}${t('gap.daysShort')}`, 
      className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    },
    neglected: { 
      label: `${daysSince}${t('gap.daysShort')}!`, 
      className: 'bg-red-500/20 text-red-400 border-red-500/30'
    },
    overdue: { 
      label: `${daysSince}${t('gap.daysShort')}`, 
      className: 'bg-red-500/20 text-red-400 border-red-500/30'
    },
    never: { 
      label: '—', 
      className: 'bg-muted/50 text-muted-foreground'
    }
  };

  const c = config[status as keyof typeof config] || config.never;

  return (
    <Badge variant="outline" className={cn('text-xs px-1.5 py-0', c.className)}>
      {c.label}
    </Badge>
  );
}

function HeatmapDot({ status }: { status: string }) {
  return (
    <div 
      className={cn(
        "w-2 h-2 rounded-full",
        STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.never
      )} 
    />
  );
}

function MuscleRow({ group, analysis, t }: { group: string; analysis: MuscleAnalysis; t: (key: string) => string }) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center justify-between py-1.5 px-2 rounded-md transition-colors",
        analysis.status === 'neglected' && "bg-red-500/5",
        analysis.status === 'due_soon' && "bg-yellow-500/5"
      )}
    >
      <div className="flex items-center gap-2">
        <HeatmapDot status={analysis.status} />
        <span className="text-lg">{analysis.icon}</span>
        <span className="text-sm font-medium">{analysis.name}</span>
        {analysis.trainedCount > 0 && (
          <span className="text-xs text-muted-foreground">
            ({analysis.trainedCount}×)
          </span>
        )}
      </div>
      <StatusBadge status={analysis.status} daysSince={analysis.daysSince} t={t} />
    </motion.div>
  );
}

function WellnessRow({ activity, analysis, t }: { activity: string; analysis: WellnessAnalysis; t: (key: string) => string }) {
  if (analysis.completedCount === 0 && analysis.status === 'never') {
    return null;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        "flex items-center justify-between py-1.5 px-2 rounded-md transition-colors",
        analysis.status === 'overdue' && "bg-red-500/5"
      )}
    >
      <div className="flex items-center gap-2">
        <HeatmapDot status={analysis.status} />
        <span className="text-lg">{analysis.icon}</span>
        <span className="text-sm font-medium">{analysis.name}</span>
        {analysis.completedCount > 0 && (
          <span className="text-xs text-muted-foreground">
            ({analysis.completedCount}×)
          </span>
        )}
      </div>
      <StatusBadge status={analysis.status} daysSince={analysis.daysSince} t={t} />
    </motion.div>
  );
}

function MuscleHeatmapGrid({ muscleAnalysis, t }: { muscleAnalysis: Record<string, MuscleAnalysis>; t: (key: string) => string }) {
  const entries = Object.entries(muscleAnalysis);
  
  return (
    <div className="flex flex-wrap gap-1.5 mb-3">
      {entries.map(([group, analysis]) => (
        <div
          key={group}
          className={cn(
            "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all",
            analysis.status === 'recent' && "bg-green-500/20 text-green-400",
            analysis.status === 'due_soon' && "bg-yellow-500/20 text-yellow-400",
            analysis.status === 'neglected' && "bg-red-500/20 text-red-400 animate-pulse",
            analysis.status === 'never' && "bg-muted/30 text-muted-foreground"
          )}
          title={`${analysis.name}: ${analysis.daysSince !== null ? `${analysis.daysSince} ${t('gap.days')}` : t('gap.noData')}`}
        >
          <span>{analysis.icon}</span>
          <span className="hidden sm:inline">{analysis.name}</span>
        </div>
      ))}
    </div>
  );
}

export function WeeklyGapAnalysis({ onGenerateWorkout, compact = false }: WeeklyGapAnalysisProps) {
  const { t } = useTranslation('wellness');
  const { data, isLoading, error, refetch, isRefetching } = useTrainingGaps();

  if (isLoading) {
    return (
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            {t('gap.weeklyAnalysis')}
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
          <p>{t('gap.loadError')}</p>
          <Button variant="ghost" size="sm" onClick={() => refetch()} className="mt-2">
            <RefreshCw className="h-4 w-4 mr-1" />
            {t('gap.retry')}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const muscleEntries = Object.entries(data.muscleAnalysis);
  const wellnessEntries = Object.entries(data.wellnessAnalysis)
    .filter(([_, a]) => a.completedCount > 0 || a.status !== 'never');

  const neglectedMuscles = muscleEntries.filter(([_, a]) => a.status === 'neglected');
  const hasWarnings = neglectedMuscles.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className={cn(
        "bg-card/50 backdrop-blur-sm border-border/50",
        hasWarnings && "border-yellow-500/30"
      )}>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {t('gap.weeklyAnalysis')}
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
              {t('gap.workoutsForPeriod', { count: data.stats.totalWorkouts, days: data.stats.periodDays })} 
              (~{data.stats.avgWorkoutsPerWeek.toFixed(1)}/{t('gap.weekShort')})
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Тепловая карта мышц */}
          {compact && <MuscleHeatmapGrid muscleAnalysis={data.muscleAnalysis} t={t} />}
          
          {/* Группы мышц - детальный вид */}
          {!compact && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Dumbbell className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('gap.muscleGroups')}
                </span>
              </div>
              <div className="space-y-0.5">
                {muscleEntries
                  .sort((a, b) => {
                    const order = { neglected: 0, never: 1, due_soon: 2, recent: 3 };
                    return (order[a[1].status as keyof typeof order] ?? 4) - 
                           (order[b[1].status as keyof typeof order] ?? 4);
                  })
                  .map(([group, analysis], idx) => (
                    <motion.div
                      key={group}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <MuscleRow group={group} analysis={analysis} t={t} />
                    </motion.div>
                  ))}
              </div>
            </div>
          )}

          {/* Wellness */}
          {wellnessEntries.length > 0 && !compact && (
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <Sparkles className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('gap.wellness')}
                </span>
              </div>
              <div className="space-y-0.5">
                {wellnessEntries
                  .sort((a, b) => {
                    const order = { overdue: 0, due_soon: 1, recent: 2, never: 3 };
                    return (order[a[1].status as keyof typeof order] ?? 4) - 
                           (order[b[1].status as keyof typeof order] ?? 4);
                  })
                  .map(([activity, analysis], idx) => (
                    <motion.div
                      key={activity}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <WellnessRow activity={activity} analysis={analysis} t={t} />
                    </motion.div>
                  ))}
              </div>
            </div>
          )}

          {/* Рекомендации */}
          {data.recommendations.length > 0 && !compact && (
            <div className="pt-2 border-t border-border/50">
              <div className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                {t('gap.recommendations')}
              </div>
              <div className="space-y-1.5">
                {data.recommendations.slice(0, 3).map((rec, idx) => (
                  <motion.div 
                    key={idx}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.2 + idx * 0.1 }}
                    className={cn(
                      "text-xs p-2 rounded-md",
                      rec.type === 'warning' && "bg-yellow-500/10 text-yellow-400",
                      rec.type === 'info' && "bg-blue-500/10 text-blue-400",
                      rec.type === 'success' && "bg-green-500/10 text-green-400"
                    )}
                  >
                    {rec.message}
                  </motion.div>
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
              {t('gap.generateWorkout')}
            </Button>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
