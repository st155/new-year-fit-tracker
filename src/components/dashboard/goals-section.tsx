import { useState, useEffect } from 'react';
import { FitnessCard } from "@/components/ui/fitness-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
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
import { GoalCreateDialog } from '@/components/goals/GoalCreateDialog';
import { GoalEditDialog } from '@/components/goals/GoalEditDialog';

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

const goalIcons = {
  strength: <Zap className="w-4 h-4" />,
  endurance: <Timer className="w-4 h-4" />,
  body: <Target className="w-4 h-4" />
};

const goalColors = {
  strength: "bg-gradient-accent",
  endurance: "bg-gradient-primary", 
  body: "bg-gradient-success"
};

interface GoalsSectionProps {
  userRole: "participant" | "trainer";
}

export function GoalsSection({ userRole }: GoalsSectionProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  useEffect(() => {
    if (user && userRole === "participant") {
      loadUserGoals();
    }
  }, [user, userRole]);

  const loadUserGoals = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Загружаем цели пользователя
      const { data: userGoals, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_personal', true)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Для каждой цели получаем последние измерения
      const goalsWithProgress = await Promise.all(
        (userGoals || []).map(async (goal) => {
          let currentValue = 0;
          let progressPercentage = 0;

          try {
            // Ищем последние измерения для этой цели
            const { data: measurements } = await supabase
              .from('measurements')
              .select('value')
              .eq('goal_id', goal.id)
              .eq('user_id', user.id)
              .order('measurement_date', { ascending: false })
              .limit(1);

            if (measurements && measurements.length > 0) {
              currentValue = Number(measurements[0].value);
              const targetValue = Number(goal.target_value) || 1;
              progressPercentage = Math.min((currentValue / targetValue) * 100, 100);
            }
          } catch (error) {
            console.error('Error loading measurements for goal:', goal.id, error);
          }

          return {
            ...goal,
            current_value: currentValue,
            progress_percentage: progressPercentage
          };
        })
      );

      setGoals(goalsWithProgress);
    } catch (error) {
      console.error('Error loading goals:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось загрузить цели",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGoal = async (goalData: any) => {
    try {
      const { error } = await supabase
        .from('goals')
        .insert({
          ...goalData,
          user_id: user?.id,
          is_personal: true
        });

      if (error) throw error;

      toast({
        title: "Успех",
        description: "Цель успешно создана"
      });

      await loadUserGoals();
      setCreateDialogOpen(false);
    } catch (error) {
      console.error('Error creating goal:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось создать цель",
        variant: "destructive"
      });
    }
  };

  const handleEditGoal = async (goalData: any) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update(goalData)
        .eq('id', editingGoal?.id)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Успех",
        description: "Цель успешно обновлена"
      });

      await loadUserGoals();
      setEditingGoal(null);
    } catch (error) {
      console.error('Error updating goal:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось обновить цель",
        variant: "destructive"
      });
    }
  };

  const handleDeleteGoal = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .delete()
        .eq('id', goalId)
        .eq('user_id', user?.id);

      if (error) throw error;

      toast({
        title: "Успех",
        description: "Цель успешно удалена"
      });

      await loadUserGoals();
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось удалить цель",
        variant: "destructive"
      });
    }
  };

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
    <>
      <FitnessCard className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold">Мои цели</h3>
          </div>
          <Button 
            variant="fitness" 
            size="sm"
            onClick={() => setCreateDialogOpen(true)}
          >
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
            <Button 
              variant="fitness"
              onClick={() => setCreateDialogOpen(true)}
            >
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
                        <DropdownMenuItem onClick={() => setEditingGoal(goal)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Редактировать
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleDeleteGoal(goal.id)}
                          className="text-destructive"
                        >
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

      <GoalCreateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSave={handleCreateGoal}
      />

      {editingGoal && (
        <GoalEditDialog
          goal={editingGoal}
          open={!!editingGoal}
          onOpenChange={(open) => !open && setEditingGoal(null)}
          onSave={handleEditGoal}
        />
      )}
    </>
  );
}