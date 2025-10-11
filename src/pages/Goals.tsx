import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Target, Plus, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  goal_name: string;
  goal_type: string;
  target_value: number;
  target_unit: string;
  is_personal: boolean;
  challenge_id?: string;
  current_value?: number;
  progress?: number;
}

const GoalsPage = () => {
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const fetchGoals = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Загружаем все цели пользователя
      const { data: allGoals, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (allGoals && allGoals.length > 0) {
        // Загружаем измерения для каждой цели
        const goalsWithProgress = await Promise.all(
          allGoals.map(async (goal) => {
            const { data: measurements } = await supabase
              .from('measurements')
              .select('value')
              .eq('goal_id', goal.id)
              .order('measurement_date', { ascending: false })
              .limit(1);

            const currentValue = measurements?.[0]?.value || 0;
            const progress = goal.target_value 
              ? Math.min(100, Math.round((currentValue / goal.target_value) * 100))
              : 0;

            return {
              ...goal,
              current_value: currentValue,
              progress
            };
          })
        );

        setGoals(goalsWithProgress);
      } else {
        setGoals([]);
      }
    } catch (error: any) {
      console.error('Error fetching goals:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить цели",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

  const handleGoalClick = (goal: Goal) => {
    const nameMap: Record<string, string> = {
      'вес': 'weight',
      'weight': 'weight',
      'жир': 'body_fat',
      'body fat': 'body_fat',
      'процент жира': 'body_fat',
      'vo2': 'vo2max',
      'vo₂': 'vo2max',
      'подтягивания': 'pullups',
      'pull-ups': 'pullups'
    };
    
    const goalName = goal.goal_name.toLowerCase();
    for (const [key, route] of Object.entries(nameMap)) {
      if (goalName.includes(key)) {
        navigate(`/metric/${route}`);
        return;
      }
    }
    
    // Если нет специального маршрута, переходим на общий экран целей
    navigate(`/goal/${goal.id}`);
  };

  return (
    <div className="min-h-screen pb-24 px-4 pt-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-primary bg-clip-text text-transparent">
          Goals
        </h1>
        <p className="text-muted-foreground">
          Track and achieve your fitness targets
        </p>
      </div>

      {/* Create Goal Button */}
      <div className="mb-6">
        <Button 
          onClick={() => navigate('/goals/create')}
          className="w-full h-14 bg-gradient-primary hover:opacity-90 transition-all"
        >
          <Plus className="h-5 w-5 mr-2" />
          Create New Goal
        </Button>
      </div>

      {/* Current Goals Section */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12 px-4">
          <div className="p-6 rounded-full bg-muted/20 w-24 h-24 mx-auto mb-4 flex items-center justify-center">
            <Target className="w-12 h-12 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No Goals Yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Create your first goal to start tracking progress
          </p>
        </div>
      ) : (
        <>
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              My Current Goals
            </h2>
          </div>

          <div className="space-y-3 mb-8">
            {goals.map((goal) => {
              const isHigherBetter = !['вес', 'жир', 'бег'].some(word => 
                goal.goal_name.toLowerCase().includes(word)
              );
              
              return (
                <div
                  key={goal.id}
                  onClick={() => handleGoalClick(goal)}
                  className="p-4 rounded-xl glass border border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
                >
                  {/* Goal Header */}
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {goal.goal_name}
                      </h3>
                      {!goal.is_personal && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Challenge Goal
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      className={cn(
                        "ml-2 font-semibold",
                        goal.progress >= 100 ? "bg-gradient-success" : 
                        goal.progress >= 50 ? "bg-gradient-primary" : 
                        "bg-gradient-accent"
                      )}
                    >
                      {goal.progress}%
                    </Badge>
                  </div>

                  {/* Progress Bar */}
                  <Progress value={goal.progress} className="h-2 mb-3" />

                  {/* Stats */}
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-4">
                      <div>
                        <span className="text-muted-foreground">Current: </span>
                        <span className="font-medium">
                          {goal.current_value?.toFixed(1) || 0} {goal.target_unit}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Target: </span>
                        <span className="font-medium text-primary">
                          {goal.target_value} {goal.target_unit}
                        </span>
                      </div>
                    </div>

                    {goal.current_value && goal.current_value > 0 && (
                      <div className={cn(
                        "flex items-center gap-1 text-xs font-medium",
                        isHigherBetter 
                          ? (goal.current_value >= goal.target_value ? "text-success" : "text-muted-foreground")
                          : (goal.current_value <= goal.target_value ? "text-success" : "text-muted-foreground")
                      )}>
                        {isHigherBetter ? (
                          goal.current_value >= goal.target_value ? (
                            <>
                              <TrendingUp className="h-3 w-3" />
                              <span>Achieved</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-3 w-3" />
                              <span>In Progress</span>
                            </>
                          )
                        ) : (
                          goal.current_value <= goal.target_value ? (
                            <>
                              <TrendingDown className="h-3 w-3" />
                              <span>Achieved</span>
                            </>
                          ) : (
                            <>
                              <Minus className="h-3 w-3" />
                              <span>In Progress</span>
                            </>
                          )
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Additional sections can go here */}
      {goals.length > 0 && (
        <div className="pt-4 border-t border-border/30">
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-xl glass text-center">
              <div className="text-2xl font-bold text-primary mb-1">{goals.length}</div>
              <div className="text-xs text-muted-foreground">Total Goals</div>
            </div>
            <div className="p-4 rounded-xl glass text-center">
              <div className="text-2xl font-bold text-success mb-1">
                {goals.filter(g => g.progress >= 100).length}
              </div>
              <div className="text-xs text-muted-foreground">Completed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
