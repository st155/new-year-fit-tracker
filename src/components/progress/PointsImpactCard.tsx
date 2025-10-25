import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Zap, Target, TrendingUp } from 'lucide-react';
import { Progress } from '@/components/ui/progress';

interface GoalPointsData {
  goalName: string;
  currentPoints: number;
  potentialPoints: number;
  progressPercent: number;
  priority: 'high' | 'medium' | 'low';
}

interface PointsImpactCardProps {
  goals: GoalPointsData[];
  currentRank: number;
  nextRankPoints: number;
}

export const PointsImpactCard = ({ goals, currentRank, nextRankPoints }: PointsImpactCardProps) => {
  const topOpportunities = [...goals]
    .sort((a, b) => (b.potentialPoints - b.currentPoints) - (a.potentialPoints - a.currentPoints))
    .slice(0, 3);

  const totalPotentialGain = topOpportunities.reduce(
    (sum, goal) => sum + (goal.potentialPoints - goal.currentPoints), 
    0
  );

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20';
      case 'low':
        return 'bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-yellow-500" />
          Points Impact Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Card */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border border-yellow-500/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Potential Gain</span>
            <Badge className="bg-yellow-500 text-black">
              +{totalPotentialGain} points
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            Focus on top opportunities to climb {nextRankPoints - totalPotentialGain > 0 ? 'closer to' : 'past'} rank #{currentRank - 1}
          </div>
        </div>

        {/* Top Opportunities */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            Top Opportunities
          </h4>
          
          {topOpportunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Complete more goals to see point opportunities
            </div>
          ) : (
            topOpportunities.map((goal) => {
              const potentialGain = goal.potentialPoints - goal.currentPoints;
              
              return (
                <div 
                  key={goal.goalName}
                  className="p-3 rounded-lg border bg-card space-y-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-medium text-sm truncate">{goal.goalName}</h5>
                      <div className="text-xs text-muted-foreground mt-1">
                        {goal.currentPoints} → {goal.potentialPoints} points
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getPriorityColor(goal.priority)}>
                        {goal.priority}
                      </Badge>
                      <div className="text-xs font-semibold text-yellow-600 dark:text-yellow-400">
                        +{potentialGain}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">{Math.round(goal.progressPercent)}%</span>
                    </div>
                    <Progress value={goal.progressPercent} className="h-1.5" />
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* What If Calculator */}
        {totalPotentialGain > 0 && (
          <div className="p-3 rounded-lg bg-muted/30 border">
            <div className="flex items-center gap-2 text-sm mb-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium">What If Scenario</span>
            </div>
            <p className="text-xs text-muted-foreground">
              If you complete these 3 goals, you'll gain <span className="font-semibold text-yellow-600 dark:text-yellow-400">+{totalPotentialGain} points</span>
              {nextRankPoints - totalPotentialGain <= 0 
                ? ' and overtake your next competitor! 🔥'
                : ` and need ${nextRankPoints - totalPotentialGain} more to reach rank #${currentRank - 1}.`
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
