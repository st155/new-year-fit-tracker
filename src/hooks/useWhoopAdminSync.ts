import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface SyncResult {
  success: boolean;
  metrics_count: number;
  workouts_count: number;
  error?: string;
}

export function useWhoopAdminSync() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const syncClientData = async (clientId: string, daysBack: number = 28): Promise<SyncResult> => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('whoop-sync-admin', {
        body: { target_user_id: clientId, days_back: daysBack }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data.error) {
        throw new Error(data.error);
      }

      toast({
        title: "Синхронизация завершена",
        description: `Загружено ${data.metrics_count} метрик и ${data.workouts_count} тренировок`,
      });

      return {
        success: true,
        metrics_count: data.metrics_count || 0,
        workouts_count: data.workouts_count || 0,
      };

    } catch (error: any) {
      console.error('[useWhoopAdminSync] Error:', error);
      
      toast({
        title: "Ошибка синхронизации",
        description: error.message,
        variant: "destructive",
      });

      return {
        success: false,
        metrics_count: 0,
        workouts_count: 0,
        error: error.message,
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    syncClientData,
    isLoading,
  };
}
