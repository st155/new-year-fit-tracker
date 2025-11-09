import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useHabits(userId?: string) {
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["habits", userId],
    queryFn: async () => {
      if (!userId) {
        console.log('🚫 [useHabits] No userId provided, returning empty array');
        return [];
      }

      console.log('🔍 [useHabits] Fetching habits for user:', userId);
      const today = new Date().toISOString().split('T')[0];

      const { data: habits, error: habitsError } = await supabase
        .from("habits")
        .select("*")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (habitsError) {
        console.error('❌ [useHabits] Error fetching habits:', habitsError);
        console.log('🔄 [useHabits] Attempting fallback query via profiles...');
        
        // Fallback: try to get habits via profile lookup
        const { data: profile } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("id", userId)
          .single();

        if (profile?.user_id) {
          console.log('🔄 [useHabits] Retrying with profile user_id:', profile.user_id);
          const { data: fallbackHabits, error: fallbackError } = await supabase
            .from("habits")
            .select("*")
            .eq("user_id", profile.user_id)
            .eq("is_active", true)
            .order("created_at", { ascending: false });

          if (fallbackError) {
            console.error('❌ [useHabits] Fallback query failed:', fallbackError);
            throw fallbackError;
          }
          
          console.log('✅ [useHabits] Fallback successful, habits found:', fallbackHabits?.length || 0);
          if (!fallbackHabits || fallbackHabits.length === 0) return [];
          
          // Continue with fallback habits
          const { data: stats } = await supabase
            .from("habit_stats")
            .select("*")
            .eq("user_id", profile.user_id);

          const { data: completions } = await supabase
            .from("habit_completions")
            .select("habit_id, completed_at")
            .eq("user_id", profile.user_id)
            .gte("completed_at", today);

          // Get last 30 days of completions for charts (fallback)
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          const { data: allCompletions } = await supabase
            .from("habit_completions")
            .select("habit_id, completed_at")
            .eq("user_id", profile.user_id)
            .gte("completed_at", thirtyDaysAgo.toISOString());

          const { data: measurements } = await supabase
            .from("habit_measurements")
            .select("*")
            .eq("user_id", profile.user_id);

          const { data: attempts } = await supabase
            .from("habit_attempts")
            .select("*")
            .eq("user_id", profile.user_id);

          return fallbackHabits.map(habit => {
            const habitStats = stats?.find(s => s.habit_id === habit.id);
            const completedToday = completions?.some(
              c => c.habit_id === habit.id && c.completed_at?.startsWith(today)
            );

            let customData = {};
            
            if (habit.habit_type === "numeric_counter" || habit.habit_type === "daily_measurement") {
              const habitMeasurements = measurements?.filter(m => m.habit_id === habit.id) || [];
              customData = {
                measurements: habitMeasurements,
                current_value: habitMeasurements.reduce((sum, m) => sum + m.value, 0),
              };
            }

            if (habit.habit_type === "duration_counter") {
              const habitAttempts = attempts?.filter(a => a.habit_id === habit.id) || [];
              const currentAttempt = habitAttempts.find(a => !a.end_date);
              customData = {
                attempts: habitAttempts,
                current_attempt: currentAttempt,
                start_date: currentAttempt?.start_date,
              };
            }

            return {
              ...habit,
              completed_today: completedToday || false,
              stats: habitStats || null,
              completions: allCompletions?.filter(c => c.habit_id === habit.id) || [],
              ...customData,
            };
          });
        }
        
        throw habitsError;
      }
      
      console.log('✅ [useHabits] Query successful, habits found:', habits?.length || 0);
      if (!habits || habits.length === 0) {
        console.log('⚠️ [useHabits] No habits found for user:', userId);
        return [];
      }

      const { data: stats } = await supabase
        .from("habit_stats")
        .select("*")
        .eq("user_id", userId);

      const { data: completions } = await supabase
        .from("habit_completions")
        .select("habit_id, completed_at")
        .eq("user_id", userId)
        .gte("completed_at", today);

      // Get last 30 days of completions for charts
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data: allCompletions } = await supabase
        .from("habit_completions")
        .select("habit_id, completed_at")
        .eq("user_id", userId)
        .gte("completed_at", thirtyDaysAgo.toISOString());

      // Get measurements for numeric and daily habits
      const { data: measurements } = await supabase
        .from("habit_measurements")
        .select("*")
        .eq("user_id", userId);

      // Get attempts for duration counters
      const { data: attempts } = await supabase
        .from("habit_attempts")
        .select("*")
        .eq("user_id", userId);

      console.log('[useHabits] Fetched habits:', habits?.length || 0);

      return habits.map(habit => {
        const habitStats = stats?.find(s => s.habit_id === habit.id);
        const completedToday = completions?.some(
          c => c.habit_id === habit.id && c.completed_at?.startsWith(today)
        );

        // Add custom data based on habit type
        let customData = {};
        
        if (habit.habit_type === "numeric_counter" || habit.habit_type === "daily_measurement") {
          const habitMeasurements = measurements?.filter(m => m.habit_id === habit.id) || [];
          customData = {
            measurements: habitMeasurements,
            current_value: habitMeasurements.reduce((sum, m) => sum + m.value, 0),
          };
        }

        if (habit.habit_type === "duration_counter") {
          const habitAttempts = attempts?.filter(a => a.habit_id === habit.id) || [];
          const currentAttempt = habitAttempts.find(a => !a.end_date);
          customData = {
            attempts: habitAttempts,
            current_attempt: currentAttempt,
            start_date: currentAttempt?.start_date,
          };
        }

        return {
          ...habit,
          completed_today: completedToday || false,
          stats: habitStats || null,
          completions: allCompletions?.filter(c => c.habit_id === habit.id) || [],
          ...customData,
        };
      });
    },
    enabled: !!userId,
    staleTime: 60 * 1000,
  });

  // Log results for debugging
  console.log('[useHabits] Query result:', { 
    habitsCount: data?.length || 0, 
    isLoading, 
    error: error?.message,
    userId 
  });

  return {
    habits: data,
    isLoading,
    error,
    refetch,
  };
}
