import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ChatMessage {
  id: string;
  sender_id: string;
  recipient_id: string;
  message_text: string;
  is_read: boolean;
  created_at: string;
  sender?: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
  recipient?: {
    username: string;
    full_name: string;
    avatar_url: string | null;
  };
}

export interface ChatConversation {
  user_id: string;
  username: string;
  full_name: string;
  avatar_url: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export const useTrainerChat = (userId: string | undefined) => {
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Загрузка списка диалогов
  const loadConversations = async () => {
    if (!userId) return;

    try {
      const { data: clients, error: clientsError } = await supabase
        .from('trainer_clients')
        .select(`
          client_id,
          profiles!trainer_clients_client_id_fkey (
            user_id,
            username,
            full_name,
            avatar_url
          )
        `)
        .eq('trainer_id', userId)
        .eq('active', true);

      if (clientsError) throw clientsError;

      // Для каждого клиента получаем последнее сообщение и количество непрочитанных
      const conversationsData = await Promise.all(
        clients.map(async (client: any) => {
          const clientId = client.profiles.user_id;

          // Последнее сообщение
          const { data: lastMsg } = await supabase
            .from('trainer_client_messages')
            .select('message_text, created_at')
            .or(`sender_id.eq.${clientId},recipient_id.eq.${clientId}`)
            .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Непрочитанные сообщения
          const { count } = await supabase
            .from('trainer_client_messages')
            .select('*', { count: 'exact', head: true })
            .eq('sender_id', clientId)
            .eq('recipient_id', userId)
            .eq('is_read', false);

          return {
            user_id: clientId,
            username: client.profiles.username,
            full_name: client.profiles.full_name,
            avatar_url: client.profiles.avatar_url,
            last_message: lastMsg?.message_text || 'Нет сообщений',
            last_message_time: lastMsg?.created_at || '',
            unread_count: count || 0
          };
        })
      );

      setConversations(conversationsData.sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      ));
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить диалоги',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  // Загрузка сообщений с конкретным пользователем
  const loadMessages = async (otherUserId: string) => {
    if (!userId) return;

    try {
      const { data, error } = await supabase
        .from('trainer_client_messages')
        .select('*')
        .or(`and(sender_id.eq.${userId},recipient_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},recipient_id.eq.${userId})`)
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Получаем профили отдельно
      const senderIds = [...new Set(data?.map(m => m.sender_id) || [])];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, username, full_name, avatar_url')
        .in('user_id', senderIds);

      const profilesMap = new Map(profiles?.map(p => [p.user_id, p]));

      const messagesWithProfiles = data?.map(msg => ({
        ...msg,
        sender: profilesMap.get(msg.sender_id) || { username: '', full_name: '', avatar_url: null },
        recipient: profilesMap.get(msg.recipient_id) || { username: '', full_name: '', avatar_url: null }
      })) || [];

      setMessages(messagesWithProfiles);

      // Отметить сообщения как прочитанные
      await supabase
        .from('trainer_client_messages')
        .update({ is_read: true })
        .eq('sender_id', otherUserId)
        .eq('recipient_id', userId)
        .eq('is_read', false);

    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось загрузить сообщения',
        variant: 'destructive'
      });
    }
  };

  // Отправка сообщения
  const sendMessage = async (recipientId: string, text: string) => {
    if (!userId || !text.trim()) return;

    try {
      const { error } = await supabase
        .from('trainer_client_messages')
        .insert({
          sender_id: userId,
          recipient_id: recipientId,
          message_text: text.trim(),
          is_read: false
        });

      if (error) throw error;

      toast({
        title: 'Отправлено',
        description: 'Сообщение успешно отправлено'
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: 'Ошибка',
        description: 'Не удалось отправить сообщение',
        variant: 'destructive'
      });
    }
  };

  // Realtime подписка на новые сообщения
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('trainer-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trainer_client_messages',
          filter: `recipient_id=eq.${userId}`
        },
        (payload) => {
          console.log('New message received:', payload);
          loadConversations();
          
          // Если открыт диалог с отправителем, обновить сообщения
          if (selectedUserId === payload.new.sender_id) {
            loadMessages(selectedUserId);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'trainer_client_messages',
          filter: `sender_id=eq.${userId}`
        },
        (payload) => {
          console.log('Message sent:', payload);
          if (selectedUserId === payload.new.recipient_id) {
            loadMessages(selectedUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, selectedUserId]);

  // Начальная загрузка
  useEffect(() => {
    loadConversations();
  }, [userId]);

  // Загрузка сообщений при выборе диалога
  useEffect(() => {
    if (selectedUserId) {
      loadMessages(selectedUserId);
    }
  }, [selectedUserId]);

  return {
    conversations,
    messages,
    selectedUserId,
    setSelectedUserId,
    sendMessage,
    loading,
    refresh: loadConversations
  };
};
