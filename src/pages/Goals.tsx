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

      console.log('[Goals Page] Loaded goals:', allGoals?.length, allGoals);

      if (allGoals && allGoals.length > 0) {
        // Загружаем измерения для каждой цели
        const goalsWithProgress = await Promise.all(
          allGoals.map(async (goal) => {
            const { data: measurements } = await supabase
              .from('measurements')
              .select('value, measurement_date')
              .eq('goal_id', goal.id)
              .order('measurement_date', { ascending: false })
              .order('created_at', { ascending: false })
              .limit(1);

            const currentValue = measurements?.[0]?.value || 0;
            
            // Более умный расчет прогресса
            let progress = 0;
            if (goal.target_value) {
              const isLowerBetter = ['вес', 'жир', 'fat', 'weight', 'бег', 'run'].some(word => 
                goal.goal_name.toLowerCase().includes(word)
              );
              
              if (isLowerBetter) {
                if (currentValue <= 0) {
                  progress = 0;
                } else if (currentValue <= goal.target_value) {
                  progress = 100;
                } else {
                  const maxReasonable = goal.target_value * 2;
                  const capped = Math.min(currentValue, maxReasonable);
                  progress = Math.max(0, Math.round(((maxReasonable - capped) / (maxReasonable - goal.target_value)) * 100));
                }
              } else {
                progress = Math.min(100, Math.round((currentValue / goal.target_value) * 100));
              }
            }
            
            console.log(`[Goals Page] ${goal.goal_name}: current=${currentValue}, target=${goal.target_value}, progress=${progress}%`);

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
    <div className="min-h-screen pb-20 px-4 pt-4">
      {/* Compact Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Goals
        </h1>
        <p className="text-xs text-muted-foreground">
          Track your fitness targets
        </p>
      </div>

      {/* Create Goal Button - Compact */}
      <div className="mb-4">
        <Button 
          onClick={() => navigate('/goals/create')}
          className="w-full h-12 bg-gradient-primary hover:opacity-90 transition-all"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Goal
        </Button>
      </div>

      {/* Current Goals Section */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-8 px-4">
          <div className="p-4 rounded-full bg-muted/20 w-16 h-16 mx-auto mb-3 flex items-center justify-center">
            <Target className="w-8 h-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-base font-semibold mb-1">No Goals Yet</h3>
          <p className="text-xs text-muted-foreground">
            Create your first goal to start tracking progress
          </p>
        </div>
      ) : (
        <>
          <div className="mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              My Current Goals ({goals.length})
            </h2>
          </div>

          <div className="space-y-2.5 mb-6">
            {goals.map((goal) => {
              const isHigherBetter = !['вес', 'жир', 'бег'].some(word => 
                goal.goal_name.toLowerCase().includes(word)
              );
              
              return (
                <div
                  key={goal.id}
                  onClick={() => handleGoalClick(goal)}
                  className="p-3 rounded-xl glass border border-border/50 hover:border-primary/30 transition-all cursor-pointer group"
                >
                  {/* Goal Header - More Compact */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors truncate">
                        {goal.goal_name}
                      </h3>
                      {!goal.is_personal && (
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 mt-0.5">
                          Challenge
                        </Badge>
                      )}
                    </div>
                    <Badge 
                      className={cn(
                        "ml-2 font-semibold text-xs h-6 px-2",
                        goal.progress >= 100 ? "bg-gradient-success" : 
                        goal.progress >= 50 ? "bg-gradient-primary" : 
                        "bg-gradient-accent"
                      )}
                    >
                      {goal.progress}%
                    </Badge>
                  </div>

                  {/* Progress Bar - Thinner */}
                  <Progress value={goal.progress} className="h-1.5 mb-2" />

                  {/* Stats - More Compact */}
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-3">
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
                        "flex items-center gap-1 text-[10px] font-medium",
                        isHigherBetter 
                          ? (goal.current_value >= goal.target_value ? "text-success" : "text-muted-foreground")
                          : (goal.current_value <= goal.target_value ? "text-success" : "text-muted-foreground")
                      )}>
                        {isHigherBetter ? (
                          goal.current_value >= goal.target_value ? (
                            <>
                              <TrendingUp className="h-3 w-3" />
                              <span>Done</span>
                            </>
                          ) : (
                            <>
                              <TrendingUp className="h-3 w-3" />
                              <span>Active</span>
                            </>
                          )
                        ) : (
                          goal.current_value <= goal.target_value ? (
                            <>
                              <TrendingDown className="h-3 w-3" />
                              <span>Done</span>
                            </>
                          ) : (
                            <>
                              <Minus className="h-3 w-3" />
                              <span>Active</span>
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

      {/* Stats Summary - Compact */}
      {goals.length > 0 && (
        <div className="pt-3 border-t border-border/30">
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl glass text-center">
              <div className="text-xl font-bold text-primary mb-0.5">{goals.length}</div>
              <div className="text-[10px] text-muted-foreground">Total Goals</div>
            </div>
            <div className="p-3 rounded-xl glass text-center">
              <div className="text-xl font-bold text-success mb-0.5">
                {goals.filter(g => g.progress >= 100).length}
              </div>
              <div className="text-[10px] text-muted-foreground">Completed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GoalsPage;
