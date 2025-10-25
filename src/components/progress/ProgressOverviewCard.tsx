import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, Target, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ProgressOverviewCardProps {
  totalGoals: number;
  completedGoals: number;
  inProgressGoals: number;
  averageProgress: number;
  totalPoints: number;
  weeklyPoints: number;
}

export const ProgressOverviewCard = ({
  totalGoals,
  completedGoals,
  inProgressGoals,
  averageProgress,
  totalPoints,
  weeklyPoints
}: ProgressOverviewCardProps) => {
  const completionRate = totalGoals > 0 ? Math.round((completedGoals / totalGoals) * 100) : 0;

  return (
    <Card className="bg-gradient-to-br from-primary/10 via-background to-background border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5 text-primary" />
          Progress Overview
          <Badge variant="secondary" className="ml-auto">
            {completionRate}% Complete
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall Progress</span>
            <span className="font-semibold">{Math.round(averageProgress)}%</span>
          </div>
          <Progress value={averageProgress} className="h-3" />
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1 text-muted-foreground text-xs">
              <Target className="h-3 w-3" />
              Total Goals
            </div>
            <div className="text-2xl font-bold">{totalGoals}</div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-green-600 dark:text-green-400 text-xs">
              <Trophy className="h-3 w-3" />
              Completed
            </div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {completedGoals}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400 text-xs">
              <TrendingUp className="h-3 w-3" />
              In Progress
            </div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {inProgressGoals}
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1 text-yellow-600 dark:text-yellow-400 text-xs">
              <Zap className="h-3 w-3" />
              Points
            </div>
            <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {totalPoints}
            </div>
            <div className="text-xs text-muted-foreground">
              +{weeklyPoints} this week
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
