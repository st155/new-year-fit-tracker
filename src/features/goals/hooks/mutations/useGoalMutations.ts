import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GoalsService } from "../../services/goals.service";
import type { GoalCreateInput, GoalUpdateInput } from "../../types";
import { toast } from "sonner";

/**
 * Mutation hooks for goal CRUD operations
 */
export function useGoalMutations() {
  const queryClient = useQueryClient();

  const createGoal = useMutation({
    mutationFn: (input: GoalCreateInput) => GoalsService.createGoal(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      toast.success("Цель создана");
    },
    onError: (error) => {
      console.error("❌ Error creating goal:", error);
      toast.error("Ошибка создания цели");
    },
  });

  const updateGoal = useMutation({
    mutationFn: (input: GoalUpdateInput) => GoalsService.updateGoal(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["goals", "detail", variables.id] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      toast.success("Цель обновлена");
    },
    onError: (error) => {
      console.error("❌ Error updating goal:", error);
      toast.error("Ошибка обновления цели");
    },
  });

  const deleteGoal = useMutation({
    mutationFn: (goalId: string) => GoalsService.deleteGoal(goalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      toast.success("Цель удалена");
    },
    onError: (error) => {
      console.error("❌ Error deleting goal:", error);
      toast.error("Ошибка удаления цели");
    },
  });

  return {
    createGoal,
    updateGoal,
    deleteGoal,
  };
}
