import { useMutation, useQueryClient } from "@tanstack/react-query";
import { GoalsService } from "../../services/goals.service";
import type { MeasurementCreateInput } from "../../types";
import { toast } from "sonner";

/**
 * Mutation hooks for measurement CRUD operations
 */
export function useMeasurementMutations() {
  const queryClient = useQueryClient();

  const createMeasurement = useMutation({
    mutationFn: (input: MeasurementCreateInput) => GoalsService.createMeasurement(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["measurements", variables.goal_id] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      toast.success("Измерение добавлено");
    },
    onError: (error) => {
      console.error("❌ Error creating measurement:", error);
      toast.error("Ошибка добавления измерения");
    },
  });

  const createMeasurementsBatch = useMutation({
    mutationFn: (measurements: MeasurementCreateInput[]) => 
      GoalsService.createMeasurementsBatch(measurements),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      toast.success("Измерения добавлены");
    },
    onError: (error) => {
      console.error("❌ Error creating measurements batch:", error);
      toast.error("Ошибка добавления измерений");
    },
  });

  const deleteMeasurement = useMutation({
    mutationFn: (measurementId: string) => GoalsService.deleteMeasurement(measurementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      toast.success("Измерение удалено");
    },
    onError: (error) => {
      console.error("❌ Error deleting measurement:", error);
      toast.error("Ошибка удаления измерения");
    },
  });

  return {
    createMeasurement,
    createMeasurementsBatch,
    deleteMeasurement,
  };
}
