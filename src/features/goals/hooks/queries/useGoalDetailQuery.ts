import { useQuery } from "@tanstack/react-query";
import { GoalsService } from "../../services/goals.service";
import type { Goal } from "../../types";

/**
 * Query hook for fetching a single goal by ID
 */
export function useGoalDetailQuery(goalId: string) {
  return useQuery({
    queryKey: ["goals", "detail", goalId],
    queryFn: async (): Promise<Goal | null> => {
      if (!goalId) return null;
      return GoalsService.fetchGoalById(goalId);
    },
    enabled: !!goalId,
    staleTime: 30 * 1000,
  });
}
