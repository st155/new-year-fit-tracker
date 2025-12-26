import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useChallengeGoalsQuery } from "@/features/goals/hooks";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import { GoalsSummaryHeader } from "./GoalsSummaryHeader";
import { FocusGoalsCarousel } from "./FocusGoalsCarousel";
import { GoalCategoryTabs } from "./GoalCategoryTabs";
import { 
  GoalCreateDialog, 
  QuickMeasurementDialog 
} from "@/features/goals/components";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { FAB } from "@/components/ui/fab";
import type { ChallengeGoal } from "@/features/goals/types";

export function MobileGoalsHub() {
  const { user } = useAuth();
  const { data: goals, isLoading, refetch } = useChallengeGoalsQuery(user?.id);
  const { userEntry } = useLeaderboard();
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<ChallengeGoal | null>(null);

  const totalPoints = userEntry?.totalPoints || 0;

  // Calculate stats
  const stats = useMemo(() => {
    if (!goals) return { active: 0, completed: 0 };
    const active = goals.filter(g => (g.progress_percentage || 0) < 100).length;
    const completed = goals.filter(g => (g.progress_percentage || 0) >= 100).length;
    return { active, completed };
  }, [goals]);

  // Get TOP-3 focus goals (priority: challenge > close to target > has trend)
  const focusGoals = useMemo(() => {
    if (!goals) return [];
    
    return goals
      .filter(g => g.has_target && (g.progress_percentage || 0) < 100)
      .sort((a, b) => {
        // Challenge goals first
        if (a.challenge_id && !b.challenge_id) return -1;
        if (b.challenge_id && !a.challenge_id) return 1;
        
        // Then by progress (closer to 100% = higher priority)
        const aProgress = a.progress_percentage || 0;
        const bProgress = b.progress_percentage || 0;
        
        // Prioritize 70-95% range (close to completion)
        const aInRange = aProgress >= 70 && aProgress < 100;
        const bInRange = bProgress >= 70 && bProgress < 100;
        if (aInRange && !bInRange) return -1;
        if (bInRange && !aInRange) return 1;
        
        return bProgress - aProgress;
      })
      .slice(0, 3);
  }, [goals]);

  // Categorize goals
  const categories = useMemo(() => {
    if (!goals) return { 
      fitness: [], 
      biostack: [], 
      habits: [], 
      challenge: [] 
    };

    const fitnessTypes = ['strength', 'cardio', 'endurance'];
    const biostackTypes = ['body_composition', 'biomarkers'];
    const habitTypes = ['habit', 'recovery', 'sleep'];

    return {
      fitness: goals.filter(g => fitnessTypes.includes(g.goal_type)),
      biostack: goals.filter(g => biostackTypes.includes(g.goal_type)),
      habits: goals.filter(g => habitTypes.includes(g.goal_type)),
      challenge: goals.filter(g => !!g.challenge_id),
    };
  }, [goals]);

  const handleGoalClick = (goal: ChallengeGoal) => {
    setSelectedGoal(goal);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background px-4 py-4 space-y-4">
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-36 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-20 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="min-h-screen bg-background"
    >
      {/* Header with refresh */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h1 className="text-xl font-bold">Goals</h1>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => refetch()}
          className="h-9 w-9"
        >
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary Header */}
      <GoalsSummaryHeader 
        activeCount={stats.active}
        completedCount={stats.completed}
        totalPoints={totalPoints}
      />

      {/* Focus Carousel */}
      <FocusGoalsCarousel 
        goals={focusGoals} 
        onGoalClick={handleGoalClick}
      />

      {/* Category Tabs */}
      <GoalCategoryTabs 
        categories={categories} 
        onGoalClick={handleGoalClick}
      />

      {/* FAB */}
      <FAB
        actions={[
          {
            label: 'New Goal',
            icon: Plus,
            onClick: () => setCreateDialogOpen(true),
            color: 'text-primary'
          }
        ]}
      />

      {/* Dialogs */}
      <GoalCreateDialog 
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onGoalCreated={() => refetch()}
      />

      {selectedGoal && (
        <QuickMeasurementDialog
          goal={selectedGoal}
          isOpen={!!selectedGoal}
          onOpenChange={(open) => !open && setSelectedGoal(null)}
          onMeasurementAdded={() => {
            setSelectedGoal(null);
            refetch();
          }}
        />
      )}
    </motion.div>
  );
}
