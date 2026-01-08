import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { GoalsService } from "../../services/goals.service";
import type { MeasurementCreateInput } from "../../types";
import { toast } from "sonner";

/**
 * Mutation hooks for measurement CRUD operations
 */
export function useMeasurementMutations() {
  const queryClient = useQueryClient();
  const { t } = useTranslation('goals');

  const createMeasurement = useMutation({
    mutationFn: (input: MeasurementCreateInput) => GoalsService.createMeasurement(input),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["measurements", variables.goal_id] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      toast.success(t('toast.measurementAdded'));
    },
    onError: (error) => {
      console.error("❌ Error creating measurement:", error);
      toast.error(t('toast.failedAddMeasurement'));
    },
  });

  const createMeasurementsBatch = useMutation({
    mutationFn: (measurements: MeasurementCreateInput[]) => 
      GoalsService.createMeasurementsBatch(measurements),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      toast.success(t('toast.measurementsAdded'));
    },
    onError: (error) => {
      console.error("❌ Error creating measurements batch:", error);
      toast.error(t('toast.failedAddMeasurements'));
    },
  });

  const deleteMeasurement = useMutation({
    mutationFn: (measurementId: string) => GoalsService.deleteMeasurement(measurementId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["measurements"] });
      queryClient.invalidateQueries({ queryKey: ["goals"] });
      queryClient.invalidateQueries({ queryKey: ["challenge-goals"] });
      toast.success(t('toast.measurementDeleted'));
    },
    onError: (error) => {
      console.error("❌ Error deleting measurement:", error);
      toast.error(t('toast.failedDeleteMeasurement'));
    },
  });

  return {
    createMeasurement,
    createMeasurementsBatch,
    deleteMeasurement,
  };
}
