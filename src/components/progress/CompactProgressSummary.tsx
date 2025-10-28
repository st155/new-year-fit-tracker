import { Trophy, Target, CheckCircle2, Zap, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface CompactProgressSummaryProps {
  totalGoals: number;
  completedGoals: number;
  inProgressGoals: number;
  averageProgress: number;
  totalPoints: number;
  weeklyPoints: number;
}

export const CompactProgressSummary = ({
  totalGoals,
  completedGoals,
  inProgressGoals,
  averageProgress,
  totalPoints,
  weeklyPoints
}: CompactProgressSummaryProps) => {
  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      {/* Progress Bar */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <Progress value={averageProgress} autoColor className="h-2" />
        </div>
        <Badge variant="secondary" className="text-xs font-semibold">
          {Math.round(averageProgress)}%
        </Badge>
      </div>

      {/* Inline Stats */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <Target className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm font-medium">{totalGoals}</span>
          <span className="text-xs text-muted-foreground">целей</span>
        </div>

        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-success" />
          <span className="text-sm font-medium text-success">{completedGoals}</span>
          <span className="text-xs text-muted-foreground">завершено</span>
        </div>

        <div className="flex items-center gap-1.5">
          <TrendingUp className="h-3.5 w-3.5 text-accent" />
          <span className="text-sm font-medium text-accent">{inProgressGoals}</span>
          <span className="text-xs text-muted-foreground">в процессе</span>
        </div>

        <div className="flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
          <span className="text-sm font-medium text-[hsl(var(--gold))]">{totalPoints}</span>
          <span className="text-xs text-muted-foreground">pts</span>
          <span className="text-xs text-[hsl(var(--gold))]/70">+{weeklyPoints}</span>
        </div>
      </div>
    </div>
  );
};
