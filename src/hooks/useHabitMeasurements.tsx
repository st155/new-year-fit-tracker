import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface HabitMeasurement {
  id: string;
  habit_id: string;
  user_id: string;
  value: number;
  measurement_date: string;
  notes?: string;
  created_at: string;
}

export function useHabitMeasurements(habitId: string, userId?: string) {
  const queryClient = useQueryClient();

  const { data: measurements, isLoading } = useQuery({
    queryKey: ["habit-measurements", habitId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("habit_measurements")
        .select("*")
        .eq("habit_id", habitId)
        .order("measurement_date", { ascending: false });

      if (error) throw error;
      return data as HabitMeasurement[];
    },
    enabled: !!userId && !!habitId,
  });

  const addMeasurement = useMutation({
    mutationFn: async ({ value, notes }: { value: number; notes?: string }) => {
      if (!userId) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("habit_measurements")
        .insert({
          habit_id: habitId,
          user_id: userId,
          value,
          notes,
          measurement_date: new Date().toISOString().split('T')[0],
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-measurements", habitId] });
      queryClient.invalidateQueries({ queryKey: ["habits", userId] });
      toast.success("Measurement added");
    },
    onError: (error) => {
      console.error("Error adding measurement:", error);
      toast.error("Failed to add measurement");
    },
  });

  const updateMeasurement = useMutation({
    mutationFn: async ({ id, value, notes }: { id: string; value: number; notes?: string }) => {
      const { data, error } = await supabase
        .from("habit_measurements")
        .update({ value, notes })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-measurements", habitId] });
      toast.success("Measurement updated");
    },
    onError: (error) => {
      console.error("Error updating measurement:", error);
      toast.error("Failed to update measurement");
    },
  });

  const deleteMeasurement = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("habit_measurements")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["habit-measurements", habitId] });
      queryClient.invalidateQueries({ queryKey: ["habits", userId] });
      toast.success("Measurement deleted");
    },
    onError: (error) => {
      console.error("Error deleting measurement:", error);
      toast.error("Failed to delete measurement");
    },
  });

  // Calculate statistics
  const stats = measurements ? {
    total: measurements.reduce((sum, m) => sum + m.value, 0),
    average: measurements.length > 0 
      ? measurements.reduce((sum, m) => sum + m.value, 0) / measurements.length 
      : 0,
    latest: measurements[0]?.value || 0,
    count: measurements.length,
  } : null;

  return {
    measurements,
    isLoading,
    stats,
    addMeasurement: addMeasurement.mutate,
    updateMeasurement: updateMeasurement.mutate,
    deleteMeasurement: deleteMeasurement.mutate,
    isAdding: addMeasurement.isPending,
  };
}
