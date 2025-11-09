import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Target, Flame, Trophy, TrendingUp } from 'lucide-react';

interface OverviewStatsProps {
  todayCompleted: number;
  todayTotal: number;
  weekStreak: number;
  totalXP: number;
  level?: number;
  weekTrend?: number; // percentage change from last week
}

export function OverviewStats({
  todayCompleted,
  todayTotal,
  weekStreak,
  totalXP,
  level = 1,
  weekTrend = 0
}: OverviewStatsProps) {
  const todayProgress = todayTotal > 0 ? (todayCompleted / todayTotal) * 100 : 0;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {/* Today's Progress */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Сегодня</p>
              <p className="text-2xl font-bold">
                {todayCompleted}/{todayTotal}
              </p>
            </div>
            <div className="p-2 rounded-lg bg-primary/20">
              <Target className="w-5 h-5 text-primary" />
            </div>
          </div>
          <Progress value={todayProgress} autoColor className="h-2" />
          <p className="text-xs text-muted-foreground mt-2">
            {Math.round(todayProgress)}% выполнено
          </p>
        </CardContent>
      </Card>

      {/* Week Streak */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Серия</p>
              <p className="text-2xl font-bold flex items-center gap-2">
                <Flame className="w-6 h-6 text-orange-500" />
                {weekStreak}
              </p>
            </div>
            {weekTrend !== 0 && (
              <div className={cn(
                "flex items-center gap-1 text-xs px-2 py-1 rounded-full",
                weekTrend > 0 ? "bg-green-500/20 text-green-500" : "bg-red-500/20 text-red-500"
              )}>
                <TrendingUp className={cn(
                  "w-3 h-3",
                  weekTrend < 0 && "rotate-180"
                )} />
                {Math.abs(weekTrend)}%
              </div>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {weekStreak > 0 ? 'Так держать! 🔥' : 'Начните серию'}
          </p>
        </CardContent>
      </Card>

      {/* Total XP & Level */}
      <Card className="glass-card">
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-sm text-muted-foreground">Опыт</p>
              <p className="text-2xl font-bold flex items-center gap-2">
                <Trophy className="w-6 h-6 text-amber-500" />
                {totalXP}
              </p>
            </div>
            <div className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-500 text-xs font-bold">
              LVL {level}
            </div>
          </div>
          <div className="space-y-1">
            <Progress 
              value={((totalXP % 1000) / 1000) * 100} 
              className="h-2 bg-amber-500/20"
            />
            <p className="text-xs text-muted-foreground">
              {totalXP % 1000}/1000 до уровня {level + 1}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
