import { useState, useEffect } from "react";
import { FitnessCard } from "@/components/ui/fitness-card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Trophy, Timer, Zap, Edit2, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { GoalCreateDialog } from "@/components/goals/GoalCreateDialog";
import { GoalEditDialog } from "@/components/goals/GoalEditDialog";

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

interface DisplayGoal {
  id: string;
  title: string;
  current: number;
  target: number;
  unit: string;
  progress: number;
  category: "strength" | "endurance" | "body" | "cardio";
  icon: React.ReactNode;
  rawGoal: Goal;
  displayCurrent?: string;
  displayTarget?: string;
}

const goalIcons = {
  strength: <Zap className="w-4 h-4" />,
  endurance: <Timer className="w-4 h-4" />,
  body: <Target className="w-4 h-4" />,
  cardio: <Activity className="w-4 h-4" />,
  body_composition: <Target className="w-4 h-4" />
};

const goalColors = {
  strength: "bg-gradient-accent",
  endurance: "bg-gradient-primary", 
  body: "bg-gradient-success",
  cardio: "bg-gradient-primary",
  body_composition: "bg-gradient-success"
};

interface GoalsSectionProps {
  userRole: "participant" | "trainer";
}

export function GoalsSection({ userRole }: GoalsSectionProps) {
  const [goals, setGoals] = useState<DisplayGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchGoals = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      // Ищем активный челлендж пользователя
      const { data: participantData } = await supabase
        .from('challenge_participants')
        .select(`
          challenge_id,
          challenges!inner ( is_active )
        `)
        .eq('user_id', user.id)
        .eq('challenges.is_active', true)
        .limit(1)
        .maybeSingle();

      // Загружаем личные цели пользователя
      const { data: personalGoals, error: personalErr } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_personal', true);

      if (personalErr) throw personalErr;

      let mergedGoals: Goal[] = personalGoals || [];

      // Если пользователь в активном челлендже, добавляем цели челленджа
      if (participantData?.challenge_id) {
        const { data: challengeGoals, error: chErr } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', user.id)
          .eq('challenge_id', participantData.challenge_id)
          .eq('is_personal', false);
        if (chErr) throw chErr;
        if (challengeGoals) {
          // Помещаем цели челленджа впереди списка
          mergedGoals = [...challengeGoals, ...mergedGoals];
        }
      }

      if (mergedGoals.length) {
        const goalsWithProgress = await Promise.all(
          mergedGoals.map(async (goal) => {
            const { data: measurements } = await supabase
              .from('measurements')
              .select('value, measurement_date, created_at, source')
              .eq('goal_id', goal.id)
              .order('measurement_date', { ascending: false })
              .order('created_at', { ascending: false })
              .limit(1);

            const currentValue = measurements?.[0]?.value || 0;
            
            let progress = 0;
            if (goal.target_value) {
              if (isTimeBasedGoal(goal.goal_name, goal.target_unit)) {
                const currentDecimal = convertTimeToDecimal(currentValue);
                const targetDecimal = convertTimeToDecimal(goal.target_value);
                if (currentDecimal > 0) {
                  progress = Math.min(100, Math.round((targetDecimal / currentDecimal) * 100));
                }
              } else if (isLowerIsBetterGoal(goal.goal_name, goal.goal_type)) {
                if (currentValue <= 0) {
                  progress = 0;
                } else if (currentValue <= goal.target_value) {
                  progress = 100;
                } else {
                  const maxReasonableValue = goal.target_value * 3;
                  const cappedCurrent = Math.min(currentValue, maxReasonableValue);
                  progress = Math.max(0, Math.round(((maxReasonableValue - cappedCurrent) / (maxReasonableValue - goal.target_value)) * 100));
                }
              } else {
                progress = Math.min(100, Math.round((currentValue / goal.target_value) * 100));
              }
            }
            
            const category = mapGoalTypeToCategory(goal.goal_type);
            
            return {
              id: goal.id,
              title: goal.goal_name,
              current: currentValue,
              target: goal.target_value || 0,
              unit: goal.target_unit || '',
              progress,
              category,
              icon: goalIcons[category] || goalIcons.strength,
              rawGoal: goal,
              displayCurrent: isTimeBasedGoal(goal.goal_name, goal.target_unit || '') ? formatTimeDisplay(currentValue) : currentValue.toString(),
              displayTarget: isTimeBasedGoal(goal.goal_name, goal.target_unit || '') ? formatTimeDisplay(goal.target_value || 0) : (goal.target_value || 0).toString()
            } as DisplayGoal;
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

  // Конвертирует время из формата MM.SS в десятичные минуты
  const convertTimeToDecimal = (timeValue: number): number => {
    const minutes = Math.floor(timeValue);
    const seconds = Math.round((timeValue - minutes) * 100);
    return minutes + (seconds / 60);
  };

  // Форматирует время для отображения
  const formatTimeDisplay = (timeValue: number): string => {
    const minutes = Math.floor(timeValue);
    const seconds = Math.round((timeValue - minutes) * 100);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const isLowerIsBetterGoal = (goalName: string, goalType: string): boolean => {
    const nameLower = goalName.toLowerCase();
    
    return goalType === 'body_composition' || 
           nameLower.includes('жир') || 
           nameLower.includes('вес') ||
           (nameLower.includes('бег') && nameLower.includes('км')) ||
           (nameLower.includes('гребля') && nameLower.includes('км'));
  };

  const isTimeBasedGoal = (goalName: string, unit: string): boolean => {
    const nameLower = goalName.toLowerCase();
    const unitLower = unit.toLowerCase();
    
    return (nameLower.includes('бег') || 
            nameLower.includes('гребля') || 
            nameLower.includes('время') ||
            unitLower.includes('мин') || 
            unitLower.includes('сек')) &&
           !nameLower.includes('планка'); // Планка - исключение, там больше = лучше
  };

  const mapGoalTypeToCategory = (goalType: string): "strength" | "endurance" | "body" | "cardio" => {
    switch (goalType) {
      case 'strength': return 'strength';
      case 'endurance': return 'endurance';
      case 'cardio': return 'cardio';
      case 'body_composition': return 'body';
      default: return 'strength';
    }
  };

  const handleEditGoal = (goal: DisplayGoal) => {
    setEditingGoal(goal.rawGoal);
    setEditDialogOpen(true);
  };

  useEffect(() => {
    fetchGoals();
  }, [user]);

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
        <GoalCreateDialog onGoalCreated={fetchGoals} />
      </div>
      
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>У вас пока нет целей</p>
          <p className="text-sm">Добавьте первую цель, чтобы начать отслеживать прогресс</p>
        </div>
      ) : (
        <div className="space-y-3">
          {goals.map((goal) => (
            <div key={goal.id} className="p-4 rounded-lg bg-muted/20 border border-border/50 hover:border-primary/30 transition-colors group">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {goal.icon}
                  <h4 className="font-semibold">{goal.title}</h4>
                </div>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-semibold ${goalColors[goal.category]} text-white border-none`}
                  >
                    {goal.progress}%
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                    onClick={() => handleEditGoal(goal)}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Текущий:</span>
                    <span className="font-medium">{goal.displayCurrent || goal.current} {goal.unit}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground">Цель:</span>
                    <span className="font-medium text-primary">{goal.displayTarget || goal.target} {goal.unit}</span>
                  </div>
                </div>
                <span className="text-sm font-semibold text-primary">{goal.progress}%</span>
              </div>
              <Progress value={goal.progress} className="h-2" />
            </div>
          ))}
        </div>
      )}
      
      <GoalEditDialog
        goal={editingGoal}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSave={fetchGoals}
      />
    </FitnessCard>
  );
}