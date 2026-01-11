import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('progress');

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
        return 'bg-destructive/10 text-destructive border-destructive/20';
      case 'medium':
        return 'bg-[hsl(var(--gold))]/10 text-[hsl(var(--gold))] border-[hsl(var(--gold))]/20';
      case 'low':
        return 'bg-success/10 text-success border-success/20';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-[hsl(var(--gold))]" />
          {t('pointsImpact.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Card */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-[hsl(var(--gold))]/10 to-secondary/10 border border-[hsl(var(--gold))]/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">{t('pointsImpact.potentialGain')}</span>
            <Badge className="bg-[hsl(var(--gold))] text-black">
              {t('pointsImpact.points', { count: totalPotentialGain })}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground">
            {t('pointsImpact.focusHint', { 
              action: nextRankPoints - totalPotentialGain > 0 ? t('pointsImpact.focusReach') : t('pointsImpact.focusOvertake'), 
              rank: currentRank - 1 
            })}
          </div>
        </div>

        {/* Top Opportunities */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            {t('pointsImpact.topOpportunities')}
          </h4>
          
          {topOpportunities.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              {t('pointsImpact.emptyState')}
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
                        {t('pointsImpact.pointsRange', { from: goal.currentPoints, to: goal.potentialPoints })}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={getPriorityColor(goal.priority)}>
                        {t(`priority.${goal.priority}`)}
                      </Badge>
                      <div className="text-xs font-semibold text-[hsl(var(--gold))]">
                        +{potentialGain}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{t('pointsImpact.progress')}</span>
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
              <span className="font-medium">{t('pointsImpact.growthScenario')}</span>
            </div>
            <p className="text-xs text-muted-foreground">
              {t('pointsImpact.ifComplete')} <span className="font-semibold text-[hsl(var(--gold))]">{t('pointsImpact.points', { count: totalPotentialGain })}</span>
              {nextRankPoints - totalPotentialGain <= 0 
                ? ` ${t('pointsImpact.andOvertake')}`
                : ` ${t('pointsImpact.andNeedMore', { more: nextRankPoints - totalPotentialGain, rank: currentRank - 1 })}`
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
