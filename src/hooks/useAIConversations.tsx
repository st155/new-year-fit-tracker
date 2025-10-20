import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AIConversation {
  id: string;
  trainer_id: string;
  title: string | null;
  context_mode: string;
  category?: string;
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

  // Load conversations with caching
  const loadConversations = async (skipCache = false) => {
    if (!userId) return;

    // Use cached data if available and not forcing refresh
    if (!skipCache && conversations.length > 0) {
      setLoading(false);
      return;
    }

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

    // Reset sending state first to clear any stuck states
    setSending(false);
    await new Promise(resolve => setTimeout(resolve, 100)); // Ensure state reset

    // Add optimistic user message
    const optimisticId = addOptimisticMessage(message, 'user');

    // 30-second timeout for stuck requests
    const timeoutId = setTimeout(() => {
      setSending(false);
      showToast({
        title: '⏱️ AI не отвечает',
        description: 'Попробуйте еще раз',
        variant: 'destructive'
      });
      if (currentConversation) {
        loadMessages(currentConversation.id);
      }
    }, 30000);

    setSending(true);
    
    let retryAttempt = 0;
    const maxRetries = 1;
    
    try {
      let data, error;
      
      // Retry logic for edge function errors
      while (retryAttempt <= maxRetries) {
        const response = await supabase.functions.invoke('trainer-ai-chat', {
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
        
        data = response.data;
        error = response.error;
        
        // Only retry for isPlan deployment errors
        if (error && error.message?.includes('isPlan') && retryAttempt < maxRetries) {
          console.log(`🔄 Deployment error, retry in 1s (${retryAttempt + 1}/${maxRetries})`);
          await new Promise(resolve => setTimeout(resolve, 1000));
          retryAttempt++;
        } else {
          break;
        }
      }

      if (error) throw error;
      
      // Clear timeout on success
      clearTimeout(timeoutId);

      // Mark optimistic message as sent (don't remove yet, wait for realtime)
      updateOptimisticMessage(optimisticId, {
        metadata: { isOptimistic: true, status: 'sent' }
      });

      // Realtime subscription handles message delivery - no fallback needed

      // Check for disambiguation needed
      if (data?.needsDisambiguation) {
        setSending(false);
        return data; // Return to UI for handling
      }

      // Only reload conversations if this is a NEW conversation
      if (data.conversationId && !currentConversation) {
        const { data: freshData } = await supabase
          .from('ai_conversations')
          .select('*')
          .eq('id', data.conversationId)
          .single();
        
        if (freshData) {
          setCurrentConversation(freshData as AIConversation);
          setConversations(prev => [freshData as AIConversation, ...prev]);
        }
      } else if (currentConversation) {
        // Just update last_message_at via realtime subscription
        setConversations(prev => 
          prev.map(c => 
            c.id === currentConversation.id 
              ? { ...c, last_message_at: new Date().toISOString() }
              : c
          )
        );
      }

      return data;
    } catch (error: any) {
      // Clear timeout on error
      clearTimeout(timeoutId);
      
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
      
      // Fallback: reload conversations to catch any that were created before the error
      await loadConversations();
      
      return null;
    } finally {
      setSending(false);
    }
  };

  // Start new conversation
  const startNewConversation = (contextMode: string = 'general') => {
    setCurrentConversation(null);
    setMessages([]);
    setOptimisticMessages([]);
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
    if (userId) {
      loadConversations(true); // Force refresh on mount
    }
  }, [userId]);

  // Set up realtime subscription for messages
  useEffect(() => {
    if (!currentConversation?.id) return;

    console.log(`🔔 Setting up realtime subscription for conversation: ${currentConversation.id}`);

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
          console.log('📨 Realtime INSERT event received:', payload);
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
          
          // Deduplication: don't add if message already exists by id
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMessage.id);
            if (exists) {
              console.log('⚠️ Message already exists, skipping:', newMessage.id);
              return prev;
            }
            console.log('✅ Adding new message to UI:', newMessage.id);
            return [...prev, newMessage];
          });
          
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
