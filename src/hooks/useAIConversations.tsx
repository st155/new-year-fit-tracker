import { useState, useEffect } from 'react';
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
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

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
      toast({
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

  // Send message
  const sendMessage = async (
    message: string,
    contextMode: string = 'general',
    mentionedClients: string[] = []
  ) => {
    if (!userId) return null;

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke('trainer-ai-chat', {
        body: {
          conversationId: currentConversation?.id,
          message,
          contextMode,
          mentionedClients
        }
      });

      if (error) throw error;

      // Reload conversations and messages
      await loadConversations();
      if (data.conversationId) {
        // Set the current conversation first
        const conv = conversations.find(c => c.id === data.conversationId) || 
                     { id: data.conversationId, trainer_id: userId, context_mode: contextMode } as AIConversation;
        setCurrentConversation(conv);
        
        // Then load messages
        await loadMessages(data.conversationId);
      }

      return data;
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить сообщение',
        variant: 'destructive'
      });
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

      toast({
        title: 'Удалено',
        description: 'Разговор удален'
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
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
          setMessages(prev => [...prev, payload.new as AIMessage]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentConversation?.id]);

  return {
    conversations,
    currentConversation,
    messages,
    loading,
    sending,
    selectConversation,
    sendMessage,
    startNewConversation,
    deleteConversation,
    refresh: loadConversations
  };
};
