import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export function useSupplementLogs(userId: string | undefined) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date();
  todayEnd.setHours(23, 59, 59, 999);

  const { data: todaySchedule, isLoading } = useQuery({
    queryKey: ["today-schedule", userId, todayStart.toISOString()],
    queryFn: async () => {
      if (!userId) return [];
      
      const { data, error } = await supabase
        .from("supplement_logs")
        .select(`
          *,
          protocol_items(
            *,
            supplement_products(*)
          )
        `)
        .eq("user_id", userId)
        .gte("scheduled_time", todayStart.toISOString())
        .lte("scheduled_time", todayEnd.toISOString())
        .order("scheduled_time", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const { data: adherenceStats } = useQuery({
    queryKey: ["adherence-stats", userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const { data, error } = await supabase
        .from("supplement_logs")
        .select("status, scheduled_time")
        .eq("user_id", userId)
        .gte("scheduled_time", thirtyDaysAgo.toISOString());

      if (error) throw error;

      const total = data.length;
      const taken = data.filter(log => log.status === "taken").length;
      const adherenceRate = total > 0 ? (taken / total) * 100 : 0;

      return { total, taken, adherenceRate };
    },
    enabled: !!userId,
  });

  const markAsTaken = useMutation({
    mutationFn: async (logId: string) => {
      const { data, error } = await supabase
        .from("supplement_logs")
        .update({ 
          status: "taken",
          taken_at: new Date().toISOString()
        })
        .eq("id", logId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-schedule"] });
      queryClient.invalidateQueries({ queryKey: ["adherence-stats"] });
      toast({ title: "Marked as taken" });
    },
  });

  const addNote = useMutation({
    mutationFn: async ({ logId, note }: { logId: string; note: string }) => {
      const { data, error } = await supabase
        .from("supplement_logs")
        .update({ notes: note })
        .eq("id", logId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["today-schedule"] });
      toast({ title: "Note added" });
    },
  });

  return {
    todaySchedule,
    adherenceStats,
    isLoading,
    markAsTaken,
    addNote,
  };
}
