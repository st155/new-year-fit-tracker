import { Card } from '@/components/ui/card';
import { ChatList } from './ChatList';
import { ChatWindow } from './ChatWindow';
import { useTrainerChat } from '@/hooks/useTrainerChat';
import { useAuth } from '@/hooks/useAuth';
import { MessageCircle } from 'lucide-react';

export const TrainerChat = () => {
  const { user } = useAuth();
  const {
    conversations,
    messages,
    selectedUserId,
    setSelectedUserId,
    sendMessage,
    loading
  } = useTrainerChat(user?.id);

  if (loading) {
    return <div className="text-center py-8">Загрузка...</div>;
  }

  const selectedConversation = conversations.find(c => c.user_id === selectedUserId);

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Список диалогов */}
      <Card className="col-span-1">
        <div className="p-4 border-b">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Сообщения
          </h3>
        </div>
        <ChatList
          conversations={conversations}
          selectedUserId={selectedUserId}
          onSelectConversation={setSelectedUserId}
        />
      </Card>

      {/* Окно чата */}
      <Card className="col-span-2">
        {selectedUserId && selectedConversation ? (
          <ChatWindow
            messages={messages}
            currentUserId={user?.id || ''}
            recipientId={selectedUserId}
            recipientName={selectedConversation.full_name}
            recipientAvatar={selectedConversation.avatar_url}
            onSendMessage={(text) => sendMessage(selectedUserId, text)}
          />
        ) : (
          <div className="flex items-center justify-center h-[600px] text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Выберите диалог для начала общения</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};
