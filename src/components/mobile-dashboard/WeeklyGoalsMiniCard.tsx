import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';

interface Goal {
  id: string;
  name: string;
  progress: number;
}

export function WeeklyGoalsMiniCard() {
  const { t } = useTranslation('goals');
  const { user } = useAuth();

  const { data: goals = [], isLoading } = useQuery({
    queryKey: ['mobile-weekly-goals', user?.id],
    queryFn: async (): Promise<Goal[]> => {
      if (!user?.id) return [];
      
      // Use any to bypass strict type checking
      const { data: goalsData } = await (supabase as any)
        .from('goals')
        .select('id, goal_name, goal_type, target_value')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(2);

      if (!goalsData || goalsData.length === 0) return [];

      // Get progress from goal_current_values view if available
      const { data: progressData } = await (supabase as any)
        .from('goal_current_values')
        .select('goal_id, current_value, progress')
        .in('goal_id', goalsData.map((g: any) => g.id));

      const progressMap = new Map(
        (progressData || []).map((p: any) => [p.goal_id, Math.round(p.progress || 0)])
      );

      return goalsData.map((goal: any) => ({
        id: goal.id,
        name: goal.goal_name,
        progress: progressMap.get(goal.id) || 0
      }));
    },
    enabled: !!user?.id,
    staleTime: 60000
  });

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      className="min-w-[160px] p-3 rounded-2xl bg-card/50 border border-border/50 flex flex-col gap-2"
    >
      <Link to="/goals" className="flex flex-col gap-2 h-full">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-amber-500/20 flex items-center justify-center">
            <Target className="w-4 h-4 text-amber-500" />
          </div>
          <span className="text-xs font-medium text-foreground">{t('section.title')}</span>
        </div>
        
        <div className="flex-1 flex flex-col gap-2">
          {isLoading ? (
            <div className="space-y-2">
              <div className="h-4 bg-muted/50 rounded animate-pulse" />
              <div className="h-1.5 bg-muted/50 rounded animate-pulse" />
            </div>
          ) : goals.length > 0 ? (
            goals.map((goal) => (
              <div key={goal.id} className="flex flex-col gap-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[11px] text-muted-foreground truncate max-w-[90px]">
                    {goal.name}
                  </span>
                  <span className="text-[10px] text-foreground font-medium">{goal.progress}%</span>
                </div>
                <Progress value={goal.progress} className="h-1.5" />
              </div>
            ))
          ) : (
            <p className="text-[11px] text-muted-foreground">{t('empty.noGoals')}</p>
          )}
        </div>
        
        <div className="text-[10px] text-primary mt-auto">{t('actions.addMeasurement')} →</div>
      </Link>
    </motion.div>
  );
}
