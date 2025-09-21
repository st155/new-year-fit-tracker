import { useState, useEffect } from 'react';
import { FitnessCard } from "@/components/ui/fitness-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Plus, Target, Trophy, Timer, Zap, Edit, MoreVertical } from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  current_value?: number;
  progress_percentage?: number;
  is_personal: boolean;
}

interface GoalsSectionProps {
  userRole: "participant" | "trainer";
}

export function GoalsSection({ userRole }: GoalsSectionProps) {
  console.log('GoalsSection rendering with userRole:', userRole);
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  console.log('GoalsSection: user =', user, 'loading =', loading);

  useEffect(() => {
    const loadGoals = async () => {
      if (!user || userRole !== "participant") {
        setLoading(false);
        return;
      }

      try {
        const { data: userGoals, error } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('is_personal', true)
          .order('created_at', { ascending: true });

        if (error) {
          console.error('Goals loading error:', error);
          setGoals([]);
        } else {
          setGoals(userGoals || []);
        }
      } catch (error) {
        console.error('Unexpected error loading goals:', error);
        setGoals([]);
      } finally {
        setLoading(false);
      }
    };

    loadGoals();
  }, [user, userRole]);

  const getGoalIcon = (goalType: string) => {
    const type = goalType.toLowerCase();
    if (type.includes('сила') || type.includes('жим') || type.includes('подтяг') || type.includes('отжим')) {
      return <Zap className="w-4 h-4" />;
    }
    if (type.includes('бег') || type.includes('гребля') || type.includes('время') || type.includes('vo2')) {
      return <Timer className="w-4 h-4" />;
    }
    return <Target className="w-4 h-4" />;
  };

  const getGoalColor = (goalType: string) => {
    const type = goalType.toLowerCase();
    if (type.includes('сила') || type.includes('жим') || type.includes('подтяг') || type.includes('отжим')) {
      return "bg-gradient-accent";
    }
    if (type.includes('бег') || type.includes('гребля') || type.includes('время') || type.includes('vo2')) {
      return "bg-gradient-primary";
    }
    return "bg-gradient-success";
  };

  if (userRole === "trainer") {
    return (
      <FitnessCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold">Общий прогресс команды</h3>
          </div>
          <Button variant="outline" size="sm">
            Посмотреть всех
          </Button>
        </div>
        
        <div className="space-y-4">
          {["Антон С.", "Дмитрий К.", "Михаил Л.", "Александр П."].map((name, index) => (
            <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-sm font-bold">
                  {name[0]}
                </div>
                <span className="font-medium">{name}</span>
                <Badge variant="outline" className="text-xs">
                  {4 - index} цели
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <Progress value={85 - index * 5} className="w-20" />
                <span className="text-sm font-medium w-12">{85 - index * 5}%</span>
              </div>
            </div>
          ))}
        </div>
      </FitnessCard>
    );
  }

  return (
    <FitnessCard className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-bold">Мои цели</h3>
        </div>
        <Button variant="fitness" size="sm">
          <Plus className="w-4 h-4 mr-1" />
          Добавить
        </Button>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 bg-muted/20 animate-pulse rounded-lg"></div>
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-8">
          <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h4 className="text-lg font-semibold mb-2">Пока нет целей</h4>
          <p className="text-muted-foreground mb-4">
            Создайте свою первую цель для отслеживания прогресса
          </p>
          <Button variant="fitness">
            <Plus className="w-4 h-4 mr-2" />
            Создать первую цель
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => (
            <div key={goal.id} className="p-4 rounded-lg bg-muted/20 border border-border/50 hover:border-primary/30 transition-colors">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {getGoalIcon(goal.goal_type)}
                  <h4 className="font-semibold">{goal.goal_name}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-semibold ${getGoalColor(goal.goal_type)} text-white border-none`}
                  >
                    {Math.round(goal.progress_percentage || 0)}%
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Редактировать
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        Удалить
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Текущий:</span>
                  <span className="font-medium">
                    {goal.current_value || 0} {goal.target_unit}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Цель:</span>
                  <span className="font-medium text-primary">
                    {goal.target_value} {goal.target_unit}
                  </span>
                </div>
                <Progress value={goal.progress_percentage || 0} className="h-2" />
              </div>
            </div>
          ))}
        </div>
      )}
    </FitnessCard>
  );
}