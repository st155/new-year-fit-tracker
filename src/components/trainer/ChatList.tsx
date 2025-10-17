import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';

interface ChatListProps {
  conversations: Array<{
    user_id: string;
    username: string;
    full_name: string;
    avatar_url: string | null;
    last_message: string;
    last_message_time: string;
    unread_count: number;
  }>;
  selectedUserId: string | null;
  onSelectConversation: (userId: string) => void;
}

export const ChatList = ({ conversations, selectedUserId, onSelectConversation }: ChatListProps) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <ScrollArea className="h-[600px]">
      <div className="space-y-2 p-4">
        {conversations.map(conv => (
          <div
            key={conv.user_id}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              selectedUserId === conv.user_id
                ? 'bg-primary text-primary-foreground'
                : 'hover:bg-accent'
            }`}
            onClick={() => onSelectConversation(conv.user_id)}
          >
            <div className="flex items-start gap-3">
              <Avatar>
                <AvatarImage src={conv.avatar_url || undefined} />
                <AvatarFallback>{getInitials(conv.full_name)}</AvatarFallback>
              </Avatar>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium truncate">{conv.full_name}</p>
                  {conv.last_message_time && (
                    <span className="text-xs opacity-70">
                      {formatDistanceToNow(new Date(conv.last_message_time), {
                        addSuffix: true,
                        locale: ru
                      })}
                    </span>
                  )}
                </div>

                <p className="text-sm opacity-70 truncate">
                  {conv.last_message}
                </p>
              </div>

              {conv.unread_count > 0 && (
                <Badge variant="destructive" className="ml-2">
                  {conv.unread_count}
                </Badge>
              )}
            </div>
          </div>
        ))}

        {conversations.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            Нет диалогов
          </div>
        )}
      </div>
    </ScrollArea>
  );
};
