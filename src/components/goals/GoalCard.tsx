import { useState } from "react";
import { Edit, Target, TrendingUp, TrendingDown, Minus, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { FitnessCard } from "@/components/ui/fitness-card";

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  current_value?: number;
  progress_percentage?: number;
  trend?: string;
  measurements?: any[];
}

interface GoalCardProps {
  goal: Goal;
  onAddMeasurement?: (goalId: string) => void;
  className?: string;
}

export function GoalCard({ goal, onAddMeasurement, className }: GoalCardProps) {
  const navigate = useNavigate();
  const [isHovered, setIsHovered] = useState(false);

  const getGoalTypeColor = (goalType: string) => {
    switch (goalType) {
      case 'strength':
        return 'bg-gradient-accent text-white border-none';
      case 'cardio':
      case 'endurance':
        return 'bg-gradient-primary text-white border-none';
      case 'body_composition':
        return 'bg-gradient-success text-white border-none';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getGoalTypeLabel = (goalType: string) => {
    switch (goalType) {
      case 'strength':
        return 'Сила';
      case 'cardio':
        return 'Кардио';
      case 'endurance':
        return 'Выносливость';
      case 'body_composition':
        return 'Тело';
      default:
        return goalType;
    }
  };

  const getTrendIcon = (trend?: string) => {
    if (!trend) return <Minus className="h-3 w-3" />;
    
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingDown className="h-3 w-3 text-red-500" />;
      default:
        return <Minus className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 60) return 'bg-yellow-500';
    if (percentage >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <FitnessCard 
      className={`relative overflow-hidden transition-all duration-300 hover:shadow-glow ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Target className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{goal.goal_name}</h3>
              <Badge className={getGoalTypeColor(goal.goal_type)} variant="secondary">
                {getGoalTypeLabel(goal.goal_type)}
              </Badge>
            </div>
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm"
                className={`transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/goals/edit/${goal.id}`)}>
                <Edit className="h-4 w-4 mr-2" />
                Редактировать
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onAddMeasurement?.(goal.id)}
                className="text-primary"
              >
                <Target className="h-4 w-4 mr-2" />
                Добавить результат
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold">
                {goal.current_value || 0}
              </span>
              <span className="text-sm text-muted-foreground">
                / {goal.target_value} {goal.target_unit}
              </span>
              {getTrendIcon(goal.trend)}
            </div>
            <div className="text-right">
              <div className="text-lg font-semibold text-primary">
                {goal.progress_percentage || 0}%
              </div>
              <div className="text-xs text-muted-foreground">
                прогресс
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Progress 
              value={goal.progress_percentage || 0} 
              className="h-3"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Начало</span>
              <span>
                {goal.measurements?.length || 0} измерений
              </span>
              <span>Цель</span>
            </div>
          </div>

          <Button
            onClick={() => onAddMeasurement?.(goal.id)}
            variant="outline"
            size="sm"
            className="w-full hover:bg-primary hover:text-white"
          >
            <Target className="h-4 w-4 mr-2" />
            Добавить результат
          </Button>
        </div>
      </CardContent>
    </FitnessCard>
  );
}