import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dumbbell, Heart, TrendingUp, Weight, Activity, Target, Edit, Plus, Calendar } from 'lucide-react';
import { formatMeasurement, formatStrengthGoal, isStrengthWeightGoal } from '@/lib/units';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  target_reps?: number | null;
  current_value: number;
  current_reps?: number | null;
  progress_percentage: number;
  last_measurement_date: string | null;
  measurements_count: number;
}

interface GoalCardProps {
  goal: Goal;
  onAddMeasurement?: () => void;
  onEdit?: () => void;
}

export function GoalCard({ goal, onAddMeasurement, onEdit }: GoalCardProps) {
  const getGoalIcon = (type: string) => {
    switch (type) {
      case 'strength':
        return <Dumbbell className="h-5 w-5" />;
      case 'cardio':
        return <Heart className="h-5 w-5" />;
      case 'endurance':
        return <TrendingUp className="h-5 w-5" />;
      case 'body_composition':
        return <Weight className="h-5 w-5" />;
      case 'flexibility':
        return <Activity className="h-5 w-5" />;
      default:
        return <Target className="h-5 w-5" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-muted-foreground';
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn("p-2 rounded-lg bg-primary/10", getProgressColor(goal.progress_percentage))}>
              {getGoalIcon(goal.goal_type)}
            </div>
            <div>
              <CardTitle className="text-lg">{goal.goal_name}</CardTitle>
              <CardDescription className="text-xs">
                {goal.measurements_count || 0} измерений
              </CardDescription>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Badge variant={goal.progress_percentage >= 100 ? "default" : "secondary"}>
              {goal.progress_percentage}%
            </Badge>
            {onEdit && (
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          <Progress 
            value={Math.min(goal.progress_percentage, 100)} 
            className="h-2"
          />
          
          <div className="flex justify-between items-center text-sm">
            <div>
              <span className="text-muted-foreground">Текущее: </span>
              <span className="font-semibold">
                {isStrengthWeightGoal(goal.goal_type, goal.target_unit)
                  ? formatStrengthGoal(goal.current_value || 0, goal.target_unit, goal.current_reps)
                  : formatMeasurement(goal.current_value || 0, goal.target_unit)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Цель: </span>
              <span className="font-semibold">
                {isStrengthWeightGoal(goal.goal_type, goal.target_unit)
                  ? formatStrengthGoal(goal.target_value, goal.target_unit, goal.target_reps)
                  : formatMeasurement(goal.target_value, goal.target_unit)}
              </span>
            </div>
          </div>

          {goal.last_measurement_date && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              Последнее: {format(new Date(goal.last_measurement_date), 'dd.MM.yyyy', { locale: ru })}
            </div>
          )}

          {onAddMeasurement && (
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full mt-2"
              onClick={onAddMeasurement}
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить измерение
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
