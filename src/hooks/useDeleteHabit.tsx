import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useDeleteHabit() {
  const queryClient = useQueryClient();

  const deleteHabit = useMutation({
    mutationFn: async (habitId: string) => {
      // Delete related data in order
      const { error: completionsError } = await supabase
        .from("habit_completions")
        .delete()
        .eq("habit_id", habitId);
      
      if (completionsError) throw completionsError;

      const { error: measurementsError } = await supabase
        .from("habit_measurements")
        .delete()
        .eq("habit_id", habitId);
      
      if (measurementsError) throw measurementsError;

      const { error: attemptsError } = await supabase
        .from("habit_attempts")
        .delete()
        .eq("habit_id", habitId);
      
      if (attemptsError) throw attemptsError;

      const { error: statsError } = await supabase
        .from("habit_stats")
        .delete()
        .eq("habit_id", habitId);
      
      if (statsError) throw statsError;

      // Finally delete the habit itself
      const { error: habitError } = await supabase
        .from("habits")
        .delete()
        .eq("id", habitId);

      if (habitError) throw habitError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      toast.success("Привычка удалена навсегда");
    },
    onError: (error) => {
      console.error("Error deleting habit:", error);
      toast.error("Ошибка при удалении привычки");
    },
  });

  const archiveHabit = useMutation({
    mutationFn: async (habitId: string) => {
      const { error } = await supabase
        .from("habits")
        .update({ is_active: false })
        .eq("id", habitId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habits"] });
      toast.success("Привычка архивирована");
    },
    onError: (error) => {
      console.error("Error archiving habit:", error);
      toast.error("Ошибка при архивировании");
    },
  });

  return {
    deleteHabit: deleteHabit.mutate,
    isDeleting: deleteHabit.isPending,
    archiveHabit: archiveHabit.mutate,
    isArchiving: archiveHabit.isPending,
  };
}
