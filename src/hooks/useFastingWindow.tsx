import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import i18n from "i18next";

interface FastingWindow {
  id: string;
  user_id: string;
  habit_id: string;
  eating_start: string;
  eating_end: string | null;
  fasting_duration: number | null;
  eating_duration: number | null;
  created_at: string;
  updated_at: string;
}

interface UseFastingWindowReturn {
  windows: FastingWindow[] | undefined;
  currentWindow: FastingWindow | undefined;
  status: {
    isFasting: boolean;
    isEating: boolean;
    duration: number;
    startTime?: Date;
  };
  isLoading: boolean;
  startEating: () => void;
  startFasting: () => void;
  endEating: () => void;
  isStarting: boolean;
  isFastingStarting: boolean;
  isEnding: boolean;
}

export function useFastingWindow(habitId: string, userId?: string): UseFastingWindowReturn {
  const queryClient = useQueryClient();

  const { data: windows, isLoading } = useQuery({
    queryKey: ["fasting-windows", habitId],
    queryFn: async () => {
      if (!userId) return [];

      const { data, error } = await supabase
        .from("fasting_windows")
        .select("*")
        .eq("habit_id", habitId)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      return data as FastingWindow[];
    },
    enabled: !!userId && !!habitId,
  });

  // Get current active window (eating_end is null)
  const currentWindow = windows?.find(w => w.eating_end === null);

  // Start eating window
  const startEating = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      // First, close any open fasting windows by calculating duration
      if (currentWindow) {
        const eatingStart = new Date(currentWindow.eating_start);
        const now = new Date();
        const fastingDuration = Math.floor((eatingStart.getTime() - now.getTime()) / 60000);

        await supabase
          .from("fasting_windows")
          .update({
            eating_end: now.toISOString(),
            eating_duration: 0,
            fasting_duration: Math.abs(fastingDuration)
          })
          .eq("id", currentWindow.id);
      }

      // Create new eating window
      const { data, error } = await supabase
        .from("fasting_windows")
        .insert({
          user_id: userId,
          habit_id: habitId,
          eating_start: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fasting-windows", habitId] });
      toast.success(i18n.t('habits:fasting.eatingStarted'));
    },
    onError: (error) => {
      toast.error(i18n.t('habits:fasting.error', { message: error.message }));
    },
  });

  // End eating window (start fasting)
  const endEating = useMutation({
    mutationFn: async () => {
      if (!currentWindow) throw new Error("No active eating window");

      const eatingStart = new Date(currentWindow.eating_start);
      const now = new Date();
      const eatingDuration = Math.floor((now.getTime() - eatingStart.getTime()) / 60000);

      const { error } = await supabase
        .from("fasting_windows")
        .update({
          eating_end: now.toISOString(),
          eating_duration: eatingDuration,
        })
        .eq("id", currentWindow.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fasting-windows", habitId] });
      toast.success(i18n.t('habits:fasting.fastingStarted'));
    },
    onError: (error) => {
      toast.error(i18n.t('habits:fasting.error', { message: error.message }));
    },
  });

  // Explicitly start fasting from any state (including inactive)
  const startFasting = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("User not authenticated");

      const now = new Date();

      // If currently eating, close the eating window first (same as endEating)
      if (currentWindow) {
        const eatingStart = new Date(currentWindow.eating_start);
        const eatingDuration = Math.floor((now.getTime() - eatingStart.getTime()) / 60000);

        const { error } = await supabase
          .from("fasting_windows")
          .update({
            eating_end: now.toISOString(),
            eating_duration: eatingDuration,
          })
          .eq("id", currentWindow.id);

        if (error) throw error;
        return;
      }

      // If not currently eating, create a zero-duration eating window to anchor fasting start
      const { error } = await supabase
        .from("fasting_windows")
        .insert({
          user_id: userId,
          habit_id: habitId,
          eating_start: now.toISOString(),
          eating_end: now.toISOString(),
          eating_duration: 0,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fasting-windows", habitId] });
      toast.success(i18n.t('habits:fasting.fastingStarted'));
    },
    onError: (error) => {
      toast.error(i18n.t('habits:fasting.error', { message: error.message }));
    },
  });

  // Calculate current status
  const getCurrentStatus = () => {
    if (!currentWindow) {
      // Check last window to see if fasting
      const lastWindow = windows?.[0];
      if (lastWindow?.eating_end) {
        const fastingStart = new Date(lastWindow.eating_end);
        const now = new Date();
        const fastingMinutes = Math.floor((now.getTime() - fastingStart.getTime()) / 60000);
        
        return {
          isFasting: true,
          isEating: false,
          duration: Math.max(0, fastingMinutes),
          startTime: fastingStart,
        };
      }
      
      return {
        isFasting: false,
        isEating: false,
        duration: 0,
      };
    }

    // Currently in eating window
    const eatingStart = new Date(currentWindow.eating_start);
    const now = new Date();
    const eatingMinutes = Math.floor((now.getTime() - eatingStart.getTime()) / 60000);

    return {
      isFasting: false,
      isEating: true,
      duration: Math.max(0, eatingMinutes),
      startTime: eatingStart,
    };
  };

  const status = getCurrentStatus();

  return {
    windows,
    currentWindow,
    status,
    isLoading,
    startEating: () => startEating.mutate(),
    startFasting: () => startFasting.mutate(),
    endEating: () => endEating.mutate(),
    isStarting: startEating.isPending,
    isFastingStarting: startFasting.isPending,
    isEnding: endEating.isPending,
  };
}
