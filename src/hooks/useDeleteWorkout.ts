import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { WorkoutHistoryItem } from "./useWorkoutHistory";
import { startOfDay, endOfDay } from "date-fns";
import i18n from '@/i18n';

export function useDeleteWorkout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workout: WorkoutHistoryItem) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (workout.source === 'manual') {
        // Delete all workout_logs for this workout_name on this date
        const workoutDate = new Date(workout.date);
        const dateStart = startOfDay(workoutDate).toISOString();
        const dateEnd = endOfDay(workoutDate).toISOString();

        const { error } = await supabase
          .from('workout_logs')
          .delete()
          .eq('user_id', user.id)
          .eq('workout_name', workout.name)
          .gte('performed_at', dateStart)
          .lte('performed_at', dateEnd);

        if (error) throw error;
      } else {
        // Delete tracker workout by ID
        const { error } = await supabase
          .from('workouts')
          .delete()
          .eq('id', workout.id)
          .eq('user_id', user.id);

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workout-history'] });
      toast({
        title: i18n.t('workouts:logging.workoutDeleted'),
        description: i18n.t('workouts:logging.workoutDeletedDesc')
      });
    },
    onError: (error) => {
      console.error('Delete workout error:', error);
      toast({
        title: i18n.t('workouts:logging.deleteError'),
        description: i18n.t('workouts:logging.deleteErrorDesc'),
        variant: "destructive"
      });
    }
  });
}
