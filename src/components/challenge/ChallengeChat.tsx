import { useEffect, useState, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/contexts/ProfileContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { enUS, ru } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  user_id: string;
  message_text: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
    trainer_role?: boolean;
  };
}

interface ChallengeChatProps {
  challengeId: string;
}

export const ChallengeChat = ({ challengeId }: ChallengeChatProps) => {
  const { t, i18n } = useTranslation('challenges');
  const { user } = useAuth();
  const { profile } = useProfile();
  const { toast } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMessages();
    
    // Подписка на realtime обновления
    const channel = supabase
      .channel(`challenge_chat_${challengeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'challenge_chat_messages',
          filter: `challenge_id=eq.${challengeId}`
        },
        async (payload) => {
          console.log('📨 New realtime message:', payload);
          const newMsg = payload.new as ChatMessage;
          
          // Проверяем, не добавили ли мы уже это сообщение (оптимистичное обновление)
          setMessages(prev => {
            const exists = prev.some(m => m.id === newMsg.id);
            if (exists) {
              console.log('Message already exists, skipping');
              return prev;
            }
            
            // Загружаем профиль для нового сообщения асинхронно
            supabase
              .from('profiles')
              .select('username, avatar_url, trainer_role')
              .eq('user_id', newMsg.user_id)
              .single()
              .then(({ data: profile }) => {
                if (profile) {
                  setMessages(current => 
                    current.map(m => 
                      m.id === newMsg.id ? { ...m, profiles: profile } : m
                    )
                  );
                }
              });
            
            console.log('✅ Adding new message to state');
            return [...prev, { ...newMsg, profiles: undefined }];
          });
        }
      )
      .subscribe((status) => {
        console.log('Realtime subscription status:', status);
      });

    return () => {
      console.log('Cleaning up realtime subscription');
      supabase.removeChannel(channel);
    };
  }, [challengeId]);

  // Автоскролл при новых сообщениях
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const fetchMessages = async () => {
    try {
      // Получаем сообщения
      const { data: messagesData, error: messagesError } = await supabase
        .from('challenge_chat_messages')
        .select('*')
        .eq('challenge_id', challengeId)
        .order('created_at', { ascending: true })
        .limit(100);

      if (messagesError) throw messagesError;
      if (!messagesData || messagesData.length === 0) {
        setMessages([]);
        return;
      }

      // Получаем профили пользователей
      const userIds = Array.from(new Set(messagesData.map(m => m.user_id)));
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, username, avatar_url, trainer_role')
        .in('user_id', userIds);

      // Объединяем данные
      const combined = messagesData.map(msg => {
        const profile = profilesData?.find(p => p.user_id === msg.user_id);
        return {
          ...msg,
          profiles: profile || undefined
        };
      });

      setMessages(combined);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast({
        title: t('common:error'),
        description: t('chat.loadFailed'),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!user || !newMessage.trim() || !profile) return;

    const messageText = newMessage.trim();
    const tempId = `temp-${Date.now()}`;
    
    // Оптимистичное обновление UI - сразу показываем сообщение
    const optimisticMessage: ChatMessage = {
      id: tempId,
      user_id: user.id,
      message_text: messageText,
      created_at: new Date().toISOString(),
      profiles: {
        username: profile.username,
        avatar_url: profile.avatar_url || undefined,
        trainer_role: profile.trainer_role || false,
      }
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage("");
    setSending(true);

    try {
      const { data, error } = await supabase
        .from('challenge_chat_messages')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          message_text: messageText
        })
        .select()
        .single();

      if (error) throw error;

      // Заменяем временное сообщение на реальное с правильным ID
      setMessages(prev => 
        prev.map(m => m.id === tempId ? { ...data, profiles: optimisticMessage.profiles } : m)
      );
      
      console.log('✅ Message sent successfully');
    } catch (error) {
      console.error('❌ Error sending message:', error);
      // Удаляем временное сообщение при ошибке
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setNewMessage(messageText); // Восстанавливаем текст
      
      toast({
        title: t('common:error'),
        description: t('chat.sendFailed'),
        variant: "destructive"
      });
    } finally {
      setSending(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/30">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
            <MessageCircle className="h-5 w-5 text-white" />
          </div>
          <div>
            <CardTitle className="text-xl">{t('chat.title')}</CardTitle>
            <CardDescription>{t('chat.description')}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Область сообщений */}
          <ScrollArea className="h-[400px] rounded-lg border border-border/50 bg-background/30 p-4" ref={scrollRef}>
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <MessageCircle className="h-12 w-12 mb-3 opacity-50" />
                <p>{t('chat.noMessages')}</p>
                <p className="text-sm">{t('chat.beFirst')}</p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => {
                  const isCurrentUser = message.user_id === user?.id;
                  
                  return (
                    <div
                      key={message.id}
                      className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={message.profiles?.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-xs">
                          {message.profiles?.username?.[0]?.toUpperCase() || '?'}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className={`flex flex-col gap-1 max-w-[70%] ${isCurrentUser ? 'items-end' : ''}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-foreground">
                            {isCurrentUser ? 'You' : message.profiles?.username}
                          </span>
                          {message.profiles?.trainer_role && (
                            <Badge variant="secondary" className="text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                              Trainer
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: i18n.language === 'ru' ? ru : enUS })}
                          </span>
                        </div>
                        
                        <div
                          className={`px-4 py-2 rounded-2xl ${
                            isCurrentUser
                              ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white'
                              : 'bg-muted/50 text-foreground'
                          }`}
                        >
                          <p className="text-sm whitespace-pre-wrap break-words">{message.message_text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
            )}
          </ScrollArea>

          {/* Форма отправки */}
          <div className="flex gap-2">
            <Input
              placeholder={t('chat.placeholder')}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={sending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={sending || !newMessage.trim()}
              className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:opacity-90 text-white"
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};