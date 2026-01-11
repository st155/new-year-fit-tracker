import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useChallengeGoalsQuery } from "@/features/goals/hooks";
import { Progress } from "@/components/ui/progress";
import { GoalsProgressSkeleton } from "@/components/ui/dashboard-skeleton";
import { Trophy, Droplets, Activity, Target, Dumbbell, Scale, Timer, Heart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTranslation } from "react-i18next";

// Map goal types to icons
const goalIconMap: Record<string, React.ReactNode> = {
  'water': <Droplets className="h-5 w-5 text-accent" />,
  'activity': <Activity className="h-5 w-5 text-accent" />,
  'weight': <Scale className="h-5 w-5 text-accent" />,
  'strength': <Dumbbell className="h-5 w-5 text-accent" />,
  'time': <Timer className="h-5 w-5 text-accent" />,
  'health': <Heart className="h-5 w-5 text-accent" />,
  'default': <Target className="h-5 w-5 text-primary" />,
};

function getGoalIcon(goalName: string, goalType?: string): React.ReactNode {
  const nameLower = goalName.toLowerCase();
  
  if (nameLower.includes('вод') || nameLower.includes('water')) return goalIconMap.water;
  if (nameLower.includes('вес') || nameLower.includes('weight')) return goalIconMap.weight;
  if (nameLower.includes('жим') || nameLower.includes('присед') || nameLower.includes('тяг') || nameLower.includes('подтяг')) return goalIconMap.strength;
  if (nameLower.includes('бег') || nameLower.includes('run') || nameLower.includes('планк')) return goalIconMap.time;
  if (goalType === 'strength') return goalIconMap.strength;
  if (goalType === 'cardio') return goalIconMap.activity;
  
  return goalIconMap.default;
}

export function GoalsProgress() {
  const { t } = useTranslation('goals');
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: challengeGoals, isLoading } = useChallengeGoalsQuery(user?.id);

  if (isLoading) {
    return <GoalsProgressSkeleton />;
  }

  // Transform challenge goals to display format
  const goals = (challengeGoals || []).slice(0, 3).map(goal => {
    const currentValue = goal.measurements?.[0]?.value || 0;
    const targetValue = goal.target_value || 100;
    const progress = Math.min(Math.round((currentValue / targetValue) * 100), 100);
    
    return {
      id: goal.id,
      title: goal.goal_name,
      progress,
      target: targetValue,
      current: currentValue,
      unit: goal.target_unit || '',
      icon: getGoalIcon(goal.goal_name, goal.goal_type),
    };
  });

  if (goals.length === 0) {
    return (
      <div className="space-y-3 animate-fade-in">
        <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">{t('section.title')}</h2>
        <button 
          className="w-full bg-card/40 hover:bg-card/60 rounded-xl p-4 border border-border/30 hover:border-border/50 transition-all duration-500 text-center"
          onClick={() => navigate('/goals/create')}
        >
          <Target className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">{t('section.createFirst')}</p>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">{t('section.title')}</h2>
      
      <div className="space-y-2 stagger-fade-in">
        {goals.map((goal) => (
          <button 
            key={goal.id}
            className="w-full bg-card/40 hover:bg-card/60 rounded-xl p-3 border border-border/30 hover:border-border/50 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-left group"
            onClick={() => navigate('/progress')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                  {goal.icon}
                </div>
                <span className="text-sm font-semibold text-foreground line-clamp-1">
                  {goal.title}
                </span>
              </div>
              <span className={cn(
                "text-lg font-bold",
                goal.progress >= 100 ? "text-success" : "text-foreground"
              )}>
                {goal.progress}%
              </span>
            </div>
            
            <Progress 
              value={goal.progress} 
              className="h-1.5"
            />
            
            <p className="text-[10px] text-muted-foreground mt-1.5">
              {goal.current.toFixed(1)} / {goal.target} {goal.unit}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
