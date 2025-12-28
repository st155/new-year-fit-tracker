import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

interface ChatWindowProps {
  messages: Array<{
    id: string;
    sender_id: string;
    message_text: string;
    created_at: string;
    sender?: {
      username: string;
      full_name: string;
      avatar_url: string | null;
    };
  }>;
  currentUserId: string;
  recipientId: string;
  recipientName: string;
  recipientAvatar: string | null;
  onSendMessage: (text: string) => void;
}

export const ChatWindow = ({
  messages,
  currentUserId,
  recipientId,
  recipientName,
  recipientAvatar,
  onSendMessage
}: ChatWindowProps) => {
  const { t, i18n } = useTranslation('trainer');
  const [newMessage, setNewMessage] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex flex-col h-[600px]">
      {/* Заголовок */}
      <div className="p-4 border-b flex items-center gap-3">
        <Avatar>
          <AvatarImage src={recipientAvatar || undefined} />
          <AvatarFallback>{getInitials(recipientName)}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{recipientName}</p>
          <p className="text-sm text-muted-foreground">{t('chat.online')}</p>
        </div>
      </div>

      {/* Сообщения */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message) => {
            const isOwn = message.sender_id === currentUserId;
            return (
              <div
                key={message.id}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[70%] rounded-lg p-3 ${
                    isOwn
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}
                >
                  <p className="text-sm">{message.message_text}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {formatDistanceToNow(new Date(message.created_at), {
                      addSuffix: true,
                      locale: i18n.language === 'ru' ? ru : enUS
                    })}
                  </p>
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      {/* Ввод */}
      <form onSubmit={handleSubmit} className="p-4 border-t flex gap-2">
        <Input
          placeholder={t('chat.placeholder')}
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <Button type="submit" size="icon" disabled={!newMessage.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
};
