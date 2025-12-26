import { useQuery } from "@tanstack/react-query";
import { GoalsService } from "../../services/goals.service";
import type { Measurement } from "../../types";

/**
 * Query hook for fetching measurements for a specific goal
 */
export function useMeasurementsQuery(goalId: string, userId?: string) {
  return useQuery({
    queryKey: ["measurements", goalId, userId],
    queryFn: async (): Promise<Measurement[]> => {
      if (!userId || !goalId) return [];
      return GoalsService.fetchMeasurementsByGoalId(goalId, userId);
    },
    enabled: !!userId && !!goalId,
    staleTime: 30 * 1000,
  });
}
