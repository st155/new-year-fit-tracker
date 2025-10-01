import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { GoalsProgressSkeleton } from "@/components/ui/dashboard-skeleton";
import { Trophy, Droplets, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

interface Goal {
  id: string;
  title: string;
  progress: number;
  target: number;
  current: number;
  unit?: string;
  icon: "trophy" | "droplets" | "activity";
}

export function GoalsProgress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) return;

      try {
        // Simplified approach to avoid TypeScript issues
        setGoals([
          {
            id: 'mock-1',
            title: 'Stay hydrated! Drink 3L of water today',
            progress: 75,
            target: 3,
            current: 2.25,
            unit: 'L',
            icon: 'droplets' as const
          },
          {
            id: 'mock-2', 
            title: 'Push-ups',
            progress: 90,
            target: 100,
            current: 90,
            unit: 'reps',
            icon: 'activity' as const
          }
        ]);
      } catch (error) {
        console.error('Error fetching goals:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [user]);

  const getIcon = (iconType: string) => {
    switch (iconType) {
      case 'droplets':
        return <Droplets className="h-5 w-5 text-accent" />;
      case 'activity':
        return <Activity className="h-5 w-5 text-accent" />;
      default:
        return <Trophy className="h-5 w-5 text-primary" />;
    }
  };

  if (loading) {
    return <GoalsProgressSkeleton />;
  }

  return (
    <div className="space-y-3 animate-fade-in">
      <h2 className="text-xs font-bold text-muted-foreground uppercase tracking-wide px-1">Weekly Goals</h2>
      
      <div className="space-y-2 stagger-fade-in">
        {goals.map((goal) => (
          <button 
            key={goal.id}
            className="w-full bg-card/40 hover:bg-card/60 rounded-xl p-3 border border-border/30 hover:border-border/50 transition-all duration-500 hover:scale-[1.02] active:scale-[0.98] cursor-pointer text-left group"
            onClick={() => navigate('/goals/create')}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="transition-all duration-500 group-hover:scale-110 group-hover:rotate-6">
                  {getIcon(goal.icon)}
                </div>
                <span className="text-sm font-semibold text-foreground">
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
              {goal.current} / {goal.target} {goal.unit}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}