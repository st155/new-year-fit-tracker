import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface DisciplineData {
  name: string;
  goals: number;
  progress: number;
  trend: 'up' | 'down' | 'stable';
  trendValue: number;
}

interface DisciplineRadialChartProps {
  disciplines: DisciplineData[];
}

export const DisciplineRadialChart = ({ disciplines }: DisciplineRadialChartProps) => {
  const getProgressColor = (progress: number) => {
    if (progress >= 80) return 'bg-green-500';
    if (progress >= 50) return 'bg-blue-500';
    if (progress >= 25) return 'bg-yellow-500';
    return 'bg-orange-500';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      case 'stable':
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const weakestDiscipline = disciplines.length > 0 
    ? disciplines.reduce((min, d) => d.progress < min.progress ? d : min, disciplines[0])
    : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Discipline Breakdown</span>
          {weakestDiscipline && (
            <Badge variant="outline" className="text-xs">
              🎯 Focus: {weakestDiscipline.name}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {disciplines.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No discipline data available
          </div>
        ) : (
          disciplines.map((discipline) => (
            <div key={discipline.name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{discipline.name}</span>
                  <Badge variant="secondary" className="text-xs">
                    {discipline.goals} {discipline.goals === 1 ? 'goal' : 'goals'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(discipline.trend)}
                  <span className={`text-xs ${
                    discipline.trend === 'up' ? 'text-green-500' :
                    discipline.trend === 'down' ? 'text-red-500' :
                    'text-muted-foreground'
                  }`}>
                    {discipline.trend === 'up' ? '+' : discipline.trend === 'down' ? '-' : ''}
                    {Math.abs(discipline.trendValue)}%
                  </span>
                  <span className="font-semibold text-sm">
                    {Math.round(discipline.progress)}%
                  </span>
                </div>
              </div>
              <Progress 
                value={discipline.progress} 
                className={`h-2 ${getProgressColor(discipline.progress)}`}
              />
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
};
