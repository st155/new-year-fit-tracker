import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Trophy, Droplets, Activity } from "lucide-react";

interface Goal {
  id: string;
  title: string;
  progress: number;
  target: number;
  current: number;
  icon: "trophy" | "droplets" | "activity";
}

export function GoalsProgress() {
  const { user } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      if (!user) return;

        try {
          const goalsResult = await supabase
            .from('goals')
            .select('id, goal_name, target_value, is_active')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .limit(3);

        if (goalsResult.data) {
          const formattedGoals: Goal[] = goalsResult.data.map((goal: any) => {
            const progress = 50; // Mock progress since we don't have current_value
            
            let icon: "trophy" | "droplets" | "activity" = "trophy";
            if (goal.goal_name.toLowerCase().includes('water') || goal.goal_name.toLowerCase().includes('hydrat')) {
              icon = "droplets";
            } else if (goal.goal_name.toLowerCase().includes('push') || goal.goal_name.toLowerCase().includes('exercise')) {
              icon = "activity";
            }

            return {
              id: goal.id,
              title: goal.goal_name,
              progress: Math.round(progress),
              target: goal.target_value || 0,
              current: Math.round(goal.target_value * 0.5) || 0, // Mock current value
              icon
            };
          });

          // Add mock goals if we don't have enough
          const mockGoals: Goal[] = [
            {
              id: 'mock-1',
              title: 'Stay hydrated! Drink 3L of water today',
              progress: 75,
              target: 3,
              current: 2.25,
              icon: 'droplets'
            },
            {
              id: 'mock-2', 
              title: 'Push-ups',
              progress: 90,
              target: 100,
              current: 90,
              icon: 'activity'
            }
          ];

          const allGoals = [...formattedGoals, ...mockGoals].slice(0, 3);
          setGoals(allGoals);
        }
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
    return (
      <div className="px-6 space-y-4">
        <h2 className="text-lg font-bold text-muted-foreground">YOUR GOALS</h2>
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="px-6 space-y-4">
      <h2 className="text-lg font-bold text-muted-foreground">YOUR GOALS</h2>
      
      <div className="space-y-3">
        {goals.map((goal) => (
          <div 
            key={goal.id}
            className="bg-card/30 rounded-lg p-4 border border-border/30"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                {getIcon(goal.icon)}
                {goal.progress >= 100 ? (
                  <span className="text-2xl font-bold text-success">
                    {goal.progress}%
                  </span>
                ) : (
                  <span className="text-2xl font-bold text-foreground">
                    {goal.progress}%
                  </span>
                )}
              </div>
              <span className="text-lg font-bold text-foreground">
                {goal.progress}%
              </span>
            </div>
            
            <Progress 
              value={goal.progress} 
              className="h-2 mb-2"
            />
            
            <p className="text-sm text-muted-foreground">
              {goal.title}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}