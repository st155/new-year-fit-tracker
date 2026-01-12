import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { aiApi } from '@/lib/api/client';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation('trainerDashboard');
  const [pendingActions, setPendingActions] = useState<AIPendingAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [executing, setExecuting] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loadPendingActions = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('ai_pending_actions')
        .select('*')
        .eq('trainer_id', userId)
        .in('status', ['pending'])
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPendingActions((data || []) as AIPendingAction[]);
    } catch (error) {
      console.error('Error loading pending actions:', error);
      toast({
        title: t('pendingActions.error'),
        description: t('pendingActions.loadError'),
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
      
      toast({
        title: t('pendingActions.planCreated'),
        description: t('pendingActions.checkPending')
      });
      
      return data;
    } catch (error) {
      console.error('Error creating pending action:', error);
      toast({
        title: t('pendingActions.error'),
        description: t('pendingActions.createError'),
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
      const { data, error } = await aiApi.executeActions(pendingActionId, conversationId, actions);
      if (error) throw error;

      // Invalidate all related queries to refresh UI
      const clientId = actions[0]?.data?.client_id || actions[0]?.data?.user_id;
      
      if (clientId) {
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['goals', clientId] }),
          queryClient.invalidateQueries({ queryKey: ['goal-progress', clientId] }),
          queryClient.invalidateQueries({ queryKey: ['measurements', clientId] }),
          queryClient.invalidateQueries({ queryKey: ['client-detail', clientId] }),
          queryClient.invalidateQueries({ queryKey: ['unified-metrics', clientId] })
        ]);
        console.log('✅ Invalidated queries for client:', clientId);
      }
      
      // Also invalidate trainer-level queries
      await queryClient.invalidateQueries({ queryKey: ['trainer-clients'] });

      // Reload pending actions
      await loadPendingActions();

      const successCount = data.results.filter((r: any) => r.success).length;
      const failCount = data.results.filter((r: any) => !r.success).length;
      
      // Build detailed toast message
      const failText = failCount > 0 ? t('pendingActions.errorsCount', { fail: failCount }) : '';
      let description = t('pendingActions.executedCount', { success: successCount, failText });
      
      const successMessages = data.results
        .filter((r: any) => r.success && r.message)
        .map((r: any) => r.message);
      
      if (successMessages.length > 0) {
        description += '\n\n' + successMessages.join('\n');
      }

      toast({
        title: t('pendingActions.done'),
        description: description
      });

      return data;
    } catch (error) {
      console.error('Error executing actions:', error);
      // On error, reload to restore correct state
      await loadPendingActions();
      toast({
        title: t('pendingActions.error'),
        description: t('pendingActions.executeError'),
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
        title: t('pendingActions.rejected'),
        description: t('pendingActions.rejectedDesc')
      });
    } catch (error) {
      console.error('Error rejecting action:', error);
      toast({
        title: t('pendingActions.error'),
        description: t('pendingActions.rejectError'),
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    loadPendingActions();
  }, [userId]);

  // Set up realtime subscription with improved handling
  useEffect(() => {
    if (!userId) return;

    let debounceTimer: NodeJS.Timeout;

    const channel = supabase
      .channel('ai_pending_actions')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_pending_actions',
          filter: `trainer_id=eq.${userId}`
        },
        async () => {
          // Immediate reload for new actions
          await loadPendingActions();
          
          toast({
            title: t('pendingActions.newPlanReady'),
            description: t('pendingActions.goToPending'),
            duration: 5000
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_pending_actions',
          filter: `trainer_id=eq.${userId}`
        },
        () => {
          // Debounced reload for updates
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            loadPendingActions();
          }, 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'ai_pending_actions',
          filter: `trainer_id=eq.${userId}`
        },
        () => {
          // Immediate reload for deletes
          loadPendingActions();
        }
      )
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Expose refresh function globally for triggering from other hooks
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__refreshPendingActions = loadPendingActions;
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as any).__refreshPendingActions;
      }
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
