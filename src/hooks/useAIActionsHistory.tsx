import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AIActionLog {
  id: string;
  trainer_id: string;
  client_id: string | null;
  conversation_id: string;
  action_type: string;
  action_details: any;
  success: boolean;
  error_message: string | null;
  created_at: string;
}

export const useAIActionsHistory = (userId: string | undefined, limit: number = 50) => {
  const [actions, setActions] = useState<AIActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadActions = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('ai_action_logs')
        .select('*')
        .eq('trainer_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      setActions((data || []) as AIActionLog[]);
    } catch (error) {
      console.error('Error loading action history:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить историю действий',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActions();
  }, [userId, limit]);

  // Realtime subscription
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('ai_action_logs')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_action_logs',
          filter: `trainer_id=eq.${userId}`
        },
        () => {
          loadActions();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    actions,
    loading,
    refresh: loadActions
  };
};
