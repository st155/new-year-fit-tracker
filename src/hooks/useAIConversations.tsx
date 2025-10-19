import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AIConversation {
  id: string;
  trainer_id: string;
  title: string | null;
  context_mode: string;
  last_message_at: string;
  created_at: string;
  updated_at: string;
  metadata: any;
}

export interface AIMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: any;
  created_at: string;
}

export const useAIConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  // Use useCallback to avoid recreating toast function
  const showToast = useCallback((options: any) => {
    toast(options);
  }, [toast]);

  // Load conversations
  const loadConversations = async () => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('trainer_id', userId)
        .order('last_message_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
      showToast({
        title: 'Ошибка',
        description: 'Не удалось загрузить историю разговоров',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('id, conversation_id, role, content, metadata, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages((data || []) as AIMessage[]);
    } catch (error) {
      console.error('Error loading messages:', error);
      showToast({
        title: 'Ошибка',
        description: 'Не удалось загрузить сообщения',
        variant: 'destructive'
      });
    }
  };

  // Select conversation
  const selectConversation = async (conversationId: string | null) => {
    if (!conversationId) {
      setCurrentConversation(null);
      setMessages([]);
      return;
    }

    const conversation = conversations.find(c => c.id === conversationId);
    if (conversation) {
      setCurrentConversation(conversation);
      await loadMessages(conversationId);
    }
  };

  // Add optimistic message
  const addOptimisticMessage = (content: string, role: 'user' | 'assistant') => {
    const optimisticMsg: AIMessage = {
      id: `temp-${Date.now()}`,
      conversation_id: currentConversation?.id || 'temp',
      role,
      content,
      metadata: { isOptimistic: true, status: 'sending' },
      created_at: new Date().toISOString()
    };
    
    setOptimisticMessages(prev => [...prev, optimisticMsg]);
    return optimisticMsg.id;
  };

  // Remove optimistic message
  const removeOptimisticMessage = (id: string) => {
    setOptimisticMessages(prev => prev.filter(msg => msg.id !== id));
  };

  // Update optimistic message
  const updateOptimisticMessage = (id: string, updates: Partial<AIMessage>) => {
    setOptimisticMessages(prev => prev.map(msg => 
      msg.id === id ? { ...msg, ...updates } : msg
    ));
  };

  // Send message with streaming support
  const sendMessage = async (
    message: string,
    contextMode: string = 'general',
    mentionedClients: string[] = [],
    mentionedNames: string[] = [],
    contextClientId?: string,
    autoExecute: boolean = true
  ) => {
    if (!userId) return null;

    // Add optimistic user message
    const optimisticId = addOptimisticMessage(message, 'user');

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('trainer-ai-chat', {
        body: {
          conversationId: currentConversation?.id,
          message,
          contextMode,
          mentionedClients,
          mentionedNames,
          contextClientId,
          autoExecute
        }
      });

      if (error) throw error;

      // Mark optimistic message as sent (don't remove yet, wait for realtime)
      updateOptimisticMessage(optimisticId, {
        metadata: { isOptimistic: true, status: 'sent' }
      });

      // Fallback: if realtime doesn't deliver within 30 seconds, force reload
      setTimeout(() => {
        setOptimisticMessages(prev => {
          const stillPending = prev.find(m => m.id === optimisticId);
          if (stillPending && currentConversation) {
            console.warn('⚠️ Real-time delay detected, forcing reload');
            loadMessages(currentConversation.id);
            return prev.filter(m => m.id !== optimisticId);
          }
          return prev;
        });
      }, 30000);

      // Check for disambiguation needed
      if (data?.needsDisambiguation) {
        setSending(false);
        return data; // Return to UI for handling
      }

      // Reload conversations and messages
      await loadConversations();
      if (data.conversationId) {
        // Find or create conversation object
        let conv = conversations.find(c => c.id === data.conversationId);
        
        // If new conversation was created, reload to get it
        if (!conv) {
          await loadConversations();
          const { data: freshData } = await supabase
            .from('ai_conversations')
            .select('*')
            .eq('id', data.conversationId)
            .single();
          conv = freshData as AIConversation;
        }
        
        setCurrentConversation(conv || { 
          id: data.conversationId, 
          trainer_id: userId, 
          context_mode: contextMode 
        } as AIConversation);
        
        // Then load messages
        await loadMessages(data.conversationId);
      }

      return data;
    } catch (error: any) {
      console.error('Error sending message:', error);
      
      // Mark optimistic message as failed
      updateOptimisticMessage(optimisticId, { 
        metadata: { isOptimistic: true, status: 'failed' } 
      });
      
      // Show specific error messages
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        showToast({
          title: 'AI rate limit exceeded',
          description: 'Please wait a few minutes and try again.',
          variant: 'destructive'
        });
      } else if (error.message?.includes('402') || error.message?.includes('credits')) {
        showToast({
          title: 'AI credits exhausted',
          description: 'Please add more credits to your Lovable workspace.',
          variant: 'destructive'
        });
      } else {
        showToast({
          title: 'Ошибка',
          description: 'Не удалось отправить сообщение',
          variant: 'destructive'
        });
      }
      return null;
    } finally {
      setSending(false);
    }
  };

  // Start new conversation
  const startNewConversation = (contextMode: string = 'general') => {
    setCurrentConversation(null);
    setMessages([]);
  };

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      if (currentConversation?.id === conversationId) {
        setCurrentConversation(null);
        setMessages([]);
      }

      await loadConversations();

      showToast({
        title: 'Удалено',
        description: 'Разговор удален'
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showToast({
        title: 'Ошибка',
        description: 'Не удалось удалить разговор',
        variant: 'destructive'
      });
    }
  };

  useEffect(() => {
    loadConversations();
  }, [userId]);

  // Set up realtime subscription for messages
  useEffect(() => {
    if (!currentConversation?.id) return;

    const channel = supabase
      .channel(`ai_messages_${currentConversation.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'ai_messages',
          filter: `conversation_id=eq.${currentConversation.id}`
        },
        (payload) => {
          const newMessage = payload.new as AIMessage;
          
          // Deduplication: check for matching optimistic message
          setOptimisticMessages(prev => {
            const matchingOptimistic = prev.find(
              m => m.role === newMessage.role && 
                   m.content === newMessage.content &&
                   m.conversation_id === newMessage.conversation_id
            );
            
            if (matchingOptimistic) {
              console.log('✅ Real-time message received, removing optimistic:', matchingOptimistic.id);
              return prev.filter(m => m.id !== matchingOptimistic.id);
            }
            
            return prev;
          });
          
          setMessages(prev => [...prev, newMessage]);
          
          // Show toast for auto-executed system messages
          if (newMessage.role === 'system' && newMessage.metadata?.autoExecuted) {
            const successCount = newMessage.metadata.results?.filter((r: any) => r.success).length || 0;
            showToast({
              title: '⚡ Действия выполнены автоматически',
              description: `Успешно: ${successCount} действий`,
              duration: 5000,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ai_messages',
          filter: `conversation_id=eq.${currentConversation.id}`
        },
        (payload) => {
          const updatedMessage = payload.new as AIMessage;
          setMessages(prev => prev.map(msg => 
            msg.id === updatedMessage.id ? updatedMessage : msg
          ));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversation?.id, showToast]);

  return {
    conversations,
    currentConversation,
    messages: [...messages, ...optimisticMessages],
    loading,
    sending,
    selectConversation,
    sendMessage,
    startNewConversation,
    deleteConversation,
    refresh: loadConversations,
    addOptimisticMessage,
    removeOptimisticMessage,
    updateOptimisticMessage
  };
};
