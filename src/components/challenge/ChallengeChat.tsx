import { useEffect, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MessageCircle, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ChatMessage {
  id: string;
  user_id: string;
  message_text: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

interface ChallengeChatProps {
  challengeId: string;
}

export const ChallengeChat = ({ challengeId }: ChallengeChatProps) => {
  const { user } = useAuth();
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
          console.log('New message:', payload);
          const newMsg = payload.new as ChatMessage;
          
          // Загружаем профиль для нового сообщения
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('user_id', newMsg.user_id)
            .single();
          
          setMessages(prev => [...prev, { ...newMsg, profiles: profile || undefined }]);
        }
      )
      .subscribe();

    return () => {
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
        .select('user_id, username, avatar_url')
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
        title: "Ошибка",
        description: "Не удалось загрузить сообщения",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!user || !newMessage.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('challenge_chat_messages')
        .insert({
          challenge_id: challengeId,
          user_id: user.id,
          message_text: newMessage.trim()
        });

      if (error) throw error;

      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Ошибка",
        description: "Не удалось отправить сообщение",
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
            <CardTitle className="text-xl">Чат челленджа</CardTitle>
            <CardDescription>Общайтесь с участниками в реальном времени</CardDescription>
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
                <p>Пока нет сообщений</p>
                <p className="text-sm">Начните общение первым!</p>
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
                            {isCurrentUser ? 'Вы' : message.profiles?.username}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {formatDistanceToNow(new Date(message.created_at), { addSuffix: true, locale: ru })}
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
              placeholder="Напишите сообщение..."
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