import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { AIConversation, AIMessage } from '@/types/trainer';

export type SendingState = 'idle' | 'sending' | 'processing' | 'error' | 'timeout';

export function useAIConversations(userId: string | undefined) {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingState, setSendingState] = useState<SendingState>('idle');
  const { toast } = useToast();

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('trainer_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations((data || []) as AIConversation[]);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить конверсации',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [userId, toast]);

  // Load messages for a conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as AIMessage[]);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить сообщения',
        variant: 'destructive'
      });
    }
  }, [toast]);

  // Select conversation
  const selectConversation = useCallback(async (conversationId: string | null) => {
    if (!conversationId) {
      setCurrentConversation(null);
      setMessages([]);
      return;
    }

    const conv = conversations.find(c => c.id === conversationId);
    if (conv) {
      setCurrentConversation(conv);
      await loadMessages(conversationId);
    }
  }, [conversations, loadMessages]);

  // Send message
  const sendMessage = useCallback(async (
    content: string,
    conversationType: 'general' | 'client_specific' = 'general',
    mentionedClients?: string[],
    attachments?: string[],
    clientUserId?: string,
    autoExecute: boolean = false
  ) => {
    if (!userId || !content.trim()) return;

    setSending(true);
    setSendingState('sending');

    let conversationId = currentConversation?.id;

    try {
      // Create conversation if needed
      if (!conversationId) {
        const { data: newConv, error: convError } = await supabase
          .from('ai_conversations')
          .insert({
            trainer_id: userId,
            title: content.substring(0, 100),
            conversation_type: conversationType,
            client_user_id: clientUserId
          })
          .select()
          .single();

        if (convError) throw convError;
        conversationId = newConv.id;
        setCurrentConversation(newConv as AIConversation);
        setConversations(prev => [newConv as AIConversation, ...prev]);
      }

      // Add user message optimistically
      const optimisticUserMsg: AIMessage = {
        id: `temp-${Date.now()}`,
        conversation_id: conversationId,
        role: 'user',
        content,
        created_at: new Date().toISOString()
      };
      setMessages(prev => [...prev, optimisticUserMsg]);

      setSendingState('processing');

      // Call edge function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: {
          conversation_id: conversationId,
          message: content,
          conversation_type: conversationType,
          mentioned_clients: mentionedClients,
          attachments,
          client_user_id: clientUserId,
          auto_execute: autoExecute
        }
      });

      if (error) throw error;

      // Remove optimistic message and add real messages
      setMessages(prev => prev.filter(m => m.id !== optimisticUserMsg.id));

      // Messages will be added via real-time subscription
      await loadMessages(conversationId);
      await loadConversations();

      setSendingState('idle');

      if (data?.pending_action_id) {
        toast({
          title: 'Требуется подтверждение',
          description: 'AI предложил действия, требующие вашего одобрения'
        });
      }

      if (data?.results && autoExecute) {
        toast({
          title: 'Действия выполнены',
          description: `Выполнено действий: ${data.results.length}`
        });
      }
    } catch (error: any) {
      console.error('Error sending message:', error);
      setSendingState('error');
      
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => !m.id.startsWith('temp-')));
      
      toast({
        title: 'Ошибка отправки',
        description: error.message || 'Не удалось отправить сообщение',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  }, [userId, currentConversation, toast, loadMessages, loadConversations]);

  // Start new conversation
  const startNewConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
  }, []);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      toast({
        title: 'Успешно',
        description: 'Конверсация удалена'
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось удалить конверсацию',
        variant: 'destructive'
      });
    }
  }, [currentConversation, toast]);

  // Optimistic updates
  const addOptimisticMessage = useCallback((content: string, role: 'user' | 'assistant') => {
    const tempId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMsg: AIMessage = {
      id: tempId,
      conversation_id: currentConversation?.id || '',
      role,
      content,
      created_at: new Date().toISOString()
    };
    setMessages(prev => [...prev, optimisticMsg]);
    return tempId;
  }, [currentConversation]);

  const removeOptimisticMessage = useCallback((messageId: string) => {
    setMessages(prev => prev.filter(m => m.id !== messageId));
  }, []);

  const updateOptimisticMessage = useCallback((messageId: string, updates: Partial<AIMessage>) => {
    setMessages(prev => prev.map(m => m.id === messageId ? { ...m, ...updates } : m));
  }, []);

  // Refresh
  const refresh = useCallback(async () => {
    await loadConversations();
    if (currentConversation?.id) {
      await loadMessages(currentConversation.id);
    }
  }, [loadConversations, loadMessages, currentConversation]);

  // Initial load
  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  // Real-time subscriptions
  useEffect(() => {
    if (!userId) return;

    const conversationsChannel = supabase
      .channel('ai_conversations_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'ai_conversations',
          filter: `trainer_id=eq.${userId}`
        },
        () => {
          loadConversations();
        }
      )
      .subscribe();

    const messagesChannel = currentConversation?.id
      ? supabase
          .channel('ai_messages_changes')
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'ai_messages',
              filter: `conversation_id=eq.${currentConversation.id}`
            },
            () => {
              loadMessages(currentConversation.id);
            }
          )
          .subscribe()
      : null;

    return () => {
      supabase.removeChannel(conversationsChannel);
      if (messagesChannel) {
        supabase.removeChannel(messagesChannel);
      }
    };
  }, [userId, currentConversation, loadConversations, loadMessages]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    sending,
    sendingState,
    selectConversation,
    sendMessage,
    startNewConversation,
    deleteConversation,
    refresh,
    addOptimisticMessage,
    removeOptimisticMessage,
    updateOptimisticMessage
  };
}
