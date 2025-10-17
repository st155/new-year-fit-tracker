import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { AIConversation } from '@/hooks/useAIConversations';
import { formatDistanceToNow } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface AIConversationListProps {
  conversations: AIConversation[];
  currentConversation: AIConversation | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
}

export const AIConversationList = ({
  conversations,
  currentConversation,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation
}: AIConversationListProps) => {
  return (
    <div className="space-y-4">
      <Button onClick={onNewConversation} className="w-full" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        Новый разговор
      </Button>

      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Нет разговоров
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative rounded-lg p-3 cursor-pointer transition-all ${
                  currentConversation?.id === conversation.id
                    ? 'bg-primary/10 border-primary'
                    : 'hover:bg-accent border-transparent'
                } border`}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">
                      {conversation.title || 'Без названия'}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(conversation.last_message_at), {
                        addSuffix: true,
                        locale: ru
                      })}
                    </p>
                    <div className="mt-1">
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                        {conversation.context_mode === 'goals' && '🎯 Цели'}
                        {conversation.context_mode === 'analysis' && '📊 Анализ'}
                        {conversation.context_mode === 'challenge' && '🏆 Челлендж'}
                        {conversation.context_mode === 'general' && '💬 Общий'}
                      </span>
                    </div>
                  </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Удалить разговор?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Это действие нельзя отменить. Разговор и все сообщения будут удалены.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Отмена</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteConversation(conversation.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          Удалить
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
