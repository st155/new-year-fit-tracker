import { useQuery } from "@tanstack/react-query";
import { GoalsService } from "../../services/goals.service";
import type { Goal, GoalsQueryResult, GoalSource } from "../../types";
import { toast } from "sonner";
import i18n from "@/i18n";

/**
 * Query hook for fetching user's personal and challenge goals
 * Replaces the old useGoals hook
 */
export function useGoalsQuery(userId?: string): GoalsQueryResult {
  const { data, isLoading, error } = useQuery({
    queryKey: ["goals", userId],
    queryFn: async () => {
      if (!userId) return { personal: [], challenge: [] };

      try {
        const goals = await GoalsService.fetchGoals(userId);
        const goalIds = goals.map(g => g.id);
        
        // Fetch measurements and current values in parallel
        const [measurements, currentValues] = await Promise.all([
          GoalsService.fetchMeasurements(userId, goalIds),
          GoalsService.fetchGoalCurrentValues(goalIds),
        ]);

        // Attach measurements and current values to goals
        const goalsWithData: Goal[] = goals.map(goal => {
          const goalMeasurements = measurements.filter(m => m.goal_id === goal.id);
          const currentValueData = currentValues.find(cv => cv.goal_id === goal.id);
          
          return {
            ...goal,
            measurements: goalMeasurements,
            current_value: currentValueData?.current_value || goalMeasurements[0]?.value || 0,
            source: (currentValueData?.source as GoalSource) || 'manual',
          };
        });

        const personal = goalsWithData.filter(g => g.is_personal);
        const challenge = goalsWithData.filter(g => !g.is_personal);

        return { personal, challenge };
      } catch (error) {
        console.error('❌ Error fetching goals:', error);
        toast.error(i18n.t('goals:errors.loadingGoals'));
        return { personal: [], challenge: [] };
      }
    },
    enabled: !!userId,
    staleTime: 30 * 1000, // 30 seconds for faster updates
  });

  return {
    personalGoals: data?.personal,
    challengeGoals: data?.challenge,
    isLoading,
    error: error as Error | null,
  };
}
