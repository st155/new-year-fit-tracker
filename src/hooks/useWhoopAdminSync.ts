import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import i18n from '@/i18n';

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
        title: i18n.t('integrations:whoop.syncComplete'),
        description: i18n.t('integrations:whoop.syncCompleteDesc', { 
          metrics: data.metrics_count, 
          workouts: data.workouts_count 
        }),
      });

      return {
        success: true,
        metrics_count: data.metrics_count || 0,
        workouts_count: data.workouts_count || 0,
      };

    } catch (error: any) {
      console.error('[useWhoopAdminSync] Error:', error);
      
      toast({
        title: i18n.t('integrations:whoop.syncError'),
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
