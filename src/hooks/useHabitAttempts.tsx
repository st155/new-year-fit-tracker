import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HabitAttempt {
  id: string;
  habit_id: string;
  user_id: string;
  start_date: string;
  end_date?: string;
  days_lasted?: number;
  reset_reason?: string;
  created_at: string;
}

export function useHabitAttempts(habitId: string, userId?: string) {
  const queryClient = useQueryClient();

  const { data: attempts, isLoading } = useQuery({
    queryKey: ["habit-attempts", habitId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("habit_attempts")
        .select("*")
        .eq("habit_id", habitId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as HabitAttempt[];
    },
    enabled: !!userId && !!habitId,
  });

  const currentAttempt = attempts?.find(a => !a.end_date);
  const longestStreak = attempts?.reduce((max, a) => 
    Math.max(max, a.days_lasted || 0), 0) || 0;

  const resetHabit = useMutation({
    mutationFn: async ({ reason }: { reason?: string }) => {
      if (!userId) throw new Error("User not authenticated");
      if (!currentAttempt) throw new Error("No active attempt");

      const endDate = new Date().toISOString().split('T')[0];
      const daysLasted = Math.floor(
        (new Date(endDate).getTime() - new Date(currentAttempt.start_date).getTime()) 
        / (1000 * 60 * 60 * 24)
      );

      // End current attempt
      const { error: updateError } = await supabase
        .from("habit_attempts")
        .update({
          end_date: endDate,
          days_lasted: daysLasted,
          reset_reason: reason,
        })
        .eq("id", currentAttempt.id);

      if (updateError) throw updateError;

      // Start new attempt
      const { data, error: insertError } = await supabase
        .from("habit_attempts")
        .insert({
          habit_id: habitId,
          user_id: userId,
          start_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (insertError) throw insertError;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-attempts", habitId] });
      queryClient.invalidateQueries({ queryKey: ["habits", userId] });
      toast.info("Habit reset, starting fresh!");
    },
    onError: (error) => {
      console.error("Error resetting habit:", error);
      toast.error("Failed to reset habit");
    },
  });

  return {
    attempts,
    currentAttempt,
    longestStreak,
    isLoading,
    resetHabit: resetHabit.mutate,
    isResetting: resetHabit.isPending,
  };
}
