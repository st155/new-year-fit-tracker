import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AIConversation, AIMessage } from '@/types/trainer';
import i18n from '@/i18n';

export const useAIConversations = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<AIConversation | null>(null);
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [optimisticMessages, setOptimisticMessages] = useState<AIMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [sendingState, setSendingState] = useState<'idle' | 'sending' | 'processing' | 'error' | 'timeout'>('idle');
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
      setConversations((data || []) as AIConversation[]);
    } catch (error) {
      console.error('Error loading conversations:', error);
      showToast({
        title: i18n.t('trainer:aiToast.error'),
        description: i18n.t('trainer:aiToast.errorLoadConversations'),
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Load messages for a conversation
  const loadMessages = async (conversationId: string) => {
    console.log('📥 [loadMessages] Loading for conversation:', conversationId);
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('id, conversation_id, role, content, metadata, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      console.log('📥 [loadMessages] Loaded messages:', data?.length || 0);
      setMessages((data || []) as AIMessage[]);
    } catch (error) {
      console.error('❌ [loadMessages] Error:', error);
      showToast({
        title: i18n.t('trainer:aiToast.error'),
        description: i18n.t('trainer:aiToast.errorLoadMessages'),
        variant: 'destructive'
      });
    }
  };

  // Select conversation
  const selectConversation = async (conversationId: string | null) => {
    console.log('🔄 [selectConversation] Called with ID:', conversationId);
    
    if (!conversationId) {
      console.log('🔄 [selectConversation] Clearing conversation');
      setCurrentConversation(null);
      setMessages([]);
      setOptimisticMessages([]);
      return;
    }

    const conversation = conversations.find(c => c.id === conversationId);
    console.log('🔄 [selectConversation] Found conversation:', conversation?.title || 'NOT FOUND');
    
    if (conversation) {
      console.log('🔄 [selectConversation] Setting currentConversation:', conversation.id);
      
      // КРИТИЧНО: Очистить ВСЕ старые данные перед переключением
      setMessages([]);
      setOptimisticMessages([]);
      setCurrentConversation(conversation);
      
      console.log('🔄 [selectConversation] Loading messages...');
      await loadMessages(conversationId);
      console.log('✅ [selectConversation] Messages loaded');
    }
  };

  // Add optimistic message
  const addOptimisticMessage = (content: string, role: 'user' | 'assistant') => {
    const optimisticId = `temp-${Date.now()}-${Math.random()}`;
    const optimisticMsg: AIMessage = {
      id: optimisticId,
      conversation_id: currentConversation?.id || 'temp',
      role,
      content,
      metadata: { 
        isOptimistic: true, 
        status: 'sending',
        optimisticId // Store for deduplication
      },
      created_at: new Date().toISOString()
    };
    
    setOptimisticMessages(prev => [...prev, optimisticMsg]);
    return optimisticId;
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
    autoExecute: boolean = false
  ) => {
    console.log('🚀 [sendMessage] Called with:', { 
      userId, 
      hasContent: !!message.trim(),
      contextMode,
      conversationId: currentConversation?.id 
    });
    
    if (!userId) {
      console.error('❌ [sendMessage] userId is undefined, aborting');
      showToast({
        title: i18n.t('trainer:aiToast.authError'),
        description: i18n.t('trainer:aiToast.authRequired'),
        variant: 'destructive'
      });
      return null;
    }
    
    if (!message.trim()) {
      console.warn('⚠️ [sendMessage] Empty message, aborting');
      return null;
    }

    // Reset sending state first to clear any stuck states
    setSending(false);
    setSendingState('idle');
    await new Promise(resolve => setTimeout(resolve, 100)); // Ensure state reset

    console.log('[AI Chat] Sending message:', {
      conversationId: currentConversation?.id,
      timestamp: new Date().toISOString()
    });

    // Add optimistic user message
    const optimisticUserId = addOptimisticMessage(message, 'user');

    // Add optimistic assistant "preparing" message
    const optimisticAssistantId = addOptimisticMessage(
      i18n.t('trainer:aiToast.analyzing'), 
      'assistant'
    );
    
    // Mark assistant message as preparing
    updateOptimisticMessage(optimisticAssistantId, {
      metadata: { 
        isOptimistic: true, 
        status: 'preparing',
        preparingPlan: true
      }
    });

    // 30-second timeout for stuck requests
    const timeoutId = setTimeout(() => {
      setSending(false);
      setSendingState('timeout');
      showToast({
        title: i18n.t('trainer:aiToast.timeout'),
        description: i18n.t('trainer:aiToast.timeoutDesc'),
        variant: 'destructive'
      });
      if (currentConversation) {
        loadMessages(currentConversation.id);
      }
    }, 30000);

    setSending(true);
    setSendingState('sending');
    
    let retryAttempt = 0;
    const maxRetries = 1;
    
    try {
      let data, error;
      
      // Update to processing state
      setSendingState('processing');
      
      // Replace supabase.functions.invoke with fetch for streaming
      const authToken = (await supabase.auth.getSession()).data.session?.access_token;
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/trainer-ai-chat`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            conversationId: currentConversation?.id,
            message,
            contextMode,
            mentionedClients,
            mentionedNames,
            contextClientId,
            autoExecute,
            optimisticUserId,
            optimisticAssistantId
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      // Check if streaming
      const contentType = response.headers.get('content-type');
      const isStreaming = contentType?.includes('text/event-stream');

      if (!isStreaming) {
        // Fallback to JSON (existing logic)
        data = await response.json();
      } else {
        console.log('🌊 Processing streaming response');
        
        // Remove "preparing" optimistic message immediately
        removeOptimisticMessage(optimisticAssistantId);
        
        // Process SSE stream
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let streamedContent = '';
        let finalData: any = null;

        try {
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const eventData = line.slice(6);
                
                if (eventData === '[DONE]') continue;

                try {
                  const parsed = JSON.parse(eventData);

                  if (parsed.type === 'content') {
                    // Append content chunk
                    streamedContent += parsed.content;
                    
                    // Update UI immediately - this is where the "typing" effect happens
                    setMessages(prev => {
                      const lastMsg = prev[prev.length - 1];
                      if (lastMsg?.role === 'assistant' && lastMsg.metadata?.isStreaming) {
                        return [
                          ...prev.slice(0, -1),
                          { ...lastMsg, content: streamedContent }
                        ];
                      }
                      // First chunk - create new message
                      return [
                        ...prev,
                        {
                          id: `streaming-${Date.now()}`,
                          conversation_id: currentConversation?.id || '',
                          role: 'assistant',
                          content: streamedContent,
                          metadata: { isStreaming: true },
                          created_at: new Date().toISOString()
                        } as AIMessage
                      ];
                    });
                  } else if (parsed.type === 'done') {
                    // Stream complete
                    finalData = parsed;
                    console.log('✅ Stream complete:', finalData);
                    
                    // Trigger immediate refresh of pending actions
                    if (parsed.pendingActionId) {
                      showToast({
                        title: i18n.t('trainer:aiToast.planReady'),
                        description: i18n.t('trainer:aiToast.planReadyDesc'),
                        duration: 5000
                      });
                      
                      // Trigger pending actions refresh
                      if (typeof window !== 'undefined' && (window as any).__refreshPendingActions) {
                        setTimeout(() => {
                          (window as any).__refreshPendingActions();
                        }, 100);
                      }
                    }
                  } else if (parsed.type === 'error') {
                    throw new Error(parsed.error);
                  }
                } catch (e) {
                  console.warn('Failed to parse SSE event:', e);
                }
              }
            }
          }

          // Clear streaming flag and reload messages
          setTimeout(() => {
            if (currentConversation?.id || finalData?.conversationId) {
              loadMessages(currentConversation?.id || finalData.conversationId);
            }
          }, 100);

          data = finalData;

        } catch (streamError) {
          console.error('❌ Stream processing error:', streamError);
          throw streamError;
        }
      }

      // Clear timeout on success
      clearTimeout(timeoutId);

      // Mark optimistic user message as sent (don't remove yet, wait for realtime)
      updateOptimisticMessage(optimisticUserId, {
        metadata: { isOptimistic: true, status: 'sent' }
      });
      
      // Assistant message will be updated via realtime when backend saves the real response

      // Immediate fallback: Force reload after 500ms to ensure message appears
      const convIdForReload = currentConversation?.id || data.conversationId;
      if (convIdForReload) {
        setTimeout(async () => {
          console.log('⚡ Force reloading messages after 500ms');
          await loadMessages(convIdForReload);
          setOptimisticMessages([]);
        }, 500);
      }

      // Secondary fallback: If message still doesn't arrive, reload again at 1.5s
      const fallbackTimer = setTimeout(async () => {
        console.log('⚠️ Realtime message not received within 1.5s, forcing secondary reload');
        if (currentConversation?.id || data.conversationId) {
          const convId = currentConversation?.id || data.conversationId;
          await loadMessages(convId);
          setOptimisticMessages([]);
        }
      }, 1500);

      // Clear fallback timer if component unmounts or conversation changes
      const clearFallback = () => clearTimeout(fallbackTimer);
      
      // Store cleanup function
      (window as any).__clearAIFallback = clearFallback;

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
      
      // ✅ Логируем ошибку в БД
      try {
        await supabase.from('error_logs').insert({
          user_id: userId,
          error_type: 'ai_request_failed',
          error_message: error.message || 'Unknown AI error',
          source: 'trainer_ai_chat',
          stack_trace: error.stack,
          error_details: {
            conversation_id: currentConversation?.id,
            context_mode: currentConversation?.context_mode,
            timestamp: new Date().toISOString()
          }
        });
      } catch (logError) {
        console.error('Failed to log AI error:', logError);
      }
      
      // Mark optimistic user message as failed
      updateOptimisticMessage(optimisticUserId, { 
        metadata: { isOptimistic: true, status: 'failed' } 
      });
      
      // Also mark assistant preparing message as failed if it exists
      updateOptimisticMessage(optimisticAssistantId, {
        metadata: { isOptimistic: true, status: 'failed', preparingPlan: false }
      });
      
      // Set error state
      if (error.message?.includes('timeout')) {
        setSendingState('timeout');
      } else {
        setSendingState('error');
      }
      
      // Show specific error messages
      if (error.message?.includes('429') || error.message?.includes('rate limit')) {
        showToast({
          title: i18n.t('trainer:aiToast.rateLimitTitle'),
          description: i18n.t('trainer:aiToast.rateLimitDesc'),
          variant: 'destructive'
        });
      } else if (error.message?.includes('402') || error.message?.includes('credits')) {
        showToast({
          title: i18n.t('trainer:aiToast.creditsTitle'),
          description: i18n.t('trainer:aiToast.creditsDesc'),
          variant: 'destructive'
        });
      } else if (error.message?.includes('timeout')) {
        showToast({
          title: i18n.t('trainer:aiToast.timeoutTitle'),
          description: i18n.t('trainer:aiToast.timeoutMessage'),
          variant: 'destructive'
        });
      } else {
        showToast({
          title: i18n.t('trainer:aiToast.error'),
          description: i18n.t('trainer:aiToast.sendError'),
          variant: 'destructive'
        });
      }
      
      // Fallback: reload conversations to catch any that were created before the error
      await loadConversations();
      
      return null;
    } finally {
      setSending(false);
      // Only reset to idle if not already in error/timeout state
      if (sendingState === 'sending' || sendingState === 'processing') {
        setSendingState('idle');
      }
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
        title: i18n.t('trainerDashboard:aiChat.toast.deleted'),
        description: i18n.t('trainerDashboard:aiChat.toast.conversationDeleted')
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      showToast({
        title: i18n.t('trainerDashboard:aiChat.toast.error'),
        description: i18n.t('trainerDashboard:aiChat.toast.deleteError'),
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
    
    // Test RLS policies for realtime subscription
    const testSubscription = async () => {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('id')
        .eq('conversation_id', currentConversation.id)
        .limit(1);
        
      if (error) {
        console.error('❌ [Realtime] Unable to read ai_messages (RLS issue?):', error);
      } else {
        console.log('✅ [Realtime] Can read ai_messages, subscription should work');
      }
    };
    
    testSubscription();
    
    // Clear any pending fallback timers when switching conversations
    if ((window as any).__clearAIFallback) {
      (window as any).__clearAIFallback();
    }

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
          console.log('🔔 [REALTIME] INSERT received:', {
            messageId: payload.new.id,
            role: payload.new.role,
            conversationId: payload.new.conversation_id,
            content: payload.new.content?.substring(0, 50),
            timestamp: new Date().toISOString()
          });
          const newMessage = payload.new as AIMessage;
          
          // Improved deduplication: check by optimisticId first, then by content + time
          setOptimisticMessages(prev => {
            const matchingOptimistic = prev.find(m => {
              // Check by optimisticId in metadata if available
              if (newMessage.metadata?.optimisticId && m.metadata?.optimisticId) {
                return m.metadata.optimisticId === newMessage.metadata.optimisticId;
              }
              
              // Fallback: match by role, first 100 chars of content, and time proximity
              if (m.role !== newMessage.role) return false;
              
              const contentMatch = m.content.substring(0, 100) === newMessage.content.substring(0, 100);
              const timeDiff = Math.abs(
                new Date(m.created_at).getTime() - new Date(newMessage.created_at).getTime()
              );
              const timeMatch = timeDiff < 10000; // Within 10 seconds
              
              return contentMatch && timeMatch && m.conversation_id === newMessage.conversation_id;
            });
            
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
        .subscribe((status, err) => {
          console.log('🔔 [REALTIME] Subscription status:', status);
          if (err) console.error('🔔 [REALTIME] Subscription error:', err);
        });

    return () => {
      console.log('🔔 [REALTIME] Cleaning up subscription');
      supabase.removeChannel(channel);
      // Clear fallback timer on unmount
      if ((window as any).__clearAIFallback) {
        (window as any).__clearAIFallback();
      }
    };
  }, [currentConversation?.id, showToast]);

  // Polling fallback: Poll for new messages while sending
  useEffect(() => {
    if (!currentConversation?.id || !sending) return;
    
    console.log('🔄 Starting polling fallback while sending...');
    const pollInterval = setInterval(async () => {
      console.log('🔄 Polling for new messages...');
      await loadMessages(currentConversation.id);
    }, 800);
    
    return () => {
      console.log('🔄 Stopping polling fallback');
      clearInterval(pollInterval);
    };
  }, [currentConversation?.id, sending, loadMessages]);

  return {
    conversations,
    currentConversation,
    messages: [...messages, ...optimisticMessages],
    loading,
    sending,
    sendingState,
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
