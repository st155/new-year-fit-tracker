import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AIPendingAction {
  id: string;
  conversation_id: string;
  trainer_id: string;
  action_type: string;
  action_plan: string;
  action_data: any;
  status: 'pending' | 'approved' | 'rejected' | 'executed';
  executed_at: string | null;
  created_at: string;
}

export const useAIPendingActions = (userId: string | undefined) => {
  const [pendingActions, setPendingActions] = useState<AIPendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const { toast } = useToast();

  const loadPendingActions = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('ai_pending_actions')
        .select('*')
        .eq('trainer_id', userId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingActions((data || []) as AIPendingAction[]);
    } catch (error) {
      console.error('Error loading pending actions:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить действия',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const createPendingAction = async (
    conversationId: string,
    actionType: string,
    actionPlan: string,
    actionData: any
  ) => {
    if (!userId) return null;

    try {
      const { data, error } = await supabase
        .from('ai_pending_actions')
        .insert({
          conversation_id: conversationId,
          trainer_id: userId,
          action_type: actionType,
          action_plan: actionPlan,
          action_data: actionData,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      
      await loadPendingActions();
      return data;
    } catch (error) {
      console.error('Error creating pending action:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось создать действие',
        variant: 'destructive'
      });
      return null;
    }
  };

  const executeActions = async (
    pendingActionId: string,
    conversationId: string,
    actions: any[]
  ) => {
    if (!userId) return null;

    // Optimistic update - remove from UI immediately
    setPendingActions(prev => prev.filter(a => a.id !== pendingActionId));

    setExecuting(true);
    try {
      const { data, error } = await supabase.functions.invoke('trainer-ai-execute', {
        body: {
          pendingActionId,
          conversationId,
          actions
        }
      });

      if (error) throw error;

      // Reload to ensure consistency
      await loadPendingActions();

      const successCount = data.results.filter((r: any) => r.success).length;
      const failCount = data.results.filter((r: any) => !r.success).length;

      toast({
        title: 'Готово',
        description: `Выполнено действий: ${successCount}${failCount > 0 ? `, ошибок: ${failCount}` : ''}`
      });

      return data;
    } catch (error) {
      console.error('Error executing actions:', error);
      // On error, reload to restore correct state
      await loadPendingActions();
      toast({
        title: 'Ошибка',
        description: 'Не удалось выполнить действия',
        variant: 'destructive'
      });
      return null;
    } finally {
      setExecuting(false);
    }
  };

  const rejectAction = async (actionId: string) => {
    try {
      const { error } = await supabase
        .from('ai_pending_actions')
        .update({ status: 'rejected' })
        .eq('id', actionId);

      if (error) throw error;
      
      await loadPendingActions();
      
      toast({
        title: 'Отклонено',
        description: 'Действие отклонено'
      });
    } catch (error) {
      console.error('Error rejecting action:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отклонить действие',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    loadPendingActions();
  }, [userId]);

  // Set up realtime subscription with debounce
  useEffect(() => {
    if (!userId) return;

    let debounceTimer: NodeJS.Timeout;

    const channel = supabase
      .channel('ai_pending_actions')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_pending_actions',
          filter: `trainer_id=eq.${userId}`
        },
        () => {
          // Debounce to avoid rapid reloads
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            loadPendingActions();
          }, 500);
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  return {
    pendingActions,
    loading,
    executing,
    createPendingAction,
    executeActions,
    rejectAction,
    refresh: loadPendingActions
  };
};
