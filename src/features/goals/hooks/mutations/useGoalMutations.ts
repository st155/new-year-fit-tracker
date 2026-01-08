import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { GoalsService } from "../../services/goals.service";
import type { GoalCreateInput, GoalUpdateInput } from "../../types";
import { toast } from "sonner";

/**
 * Mutation hooks for goal CRUD operations
 */
export function useGoalMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('goals');

  const createGoal = useMutation({
    mutationFn: (input: GoalCreateInput) => GoalsService.createGoal(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      toast.success(t('toast.goalCreated'));
    },
    onError: (error) => {
      console.error("❌ Error creating goal:", error);
      toast.error(t('toast.failedCreateGoal'));
    },
  });

  const updateGoal = useMutation({
    mutationFn: (input: GoalUpdateInput) => GoalsService.updateGoal(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals", "detail", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      toast.success(t('toast.goalUpdated'));
    },
    onError: (error) => {
      console.error("❌ Error updating goal:", error);
      toast.error(t('toast.failedUpdateGoal'));
    },
  });

  const deleteGoal = useMutation({
    mutationFn: (goalId: string) => GoalsService.deleteGoal(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      toast.success(t('toast.goalDeleted'));
    },
    onError: (error) => {
      console.error("❌ Error deleting goal:", error);
      toast.error(t('toast.failedDeleteGoal'));
    },
  });

  return {
    createGoal,
    updateGoal,
    deleteGoal,
  };
}
