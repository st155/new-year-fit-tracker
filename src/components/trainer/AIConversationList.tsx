import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Plus, MessageSquare, Trash2 } from 'lucide-react';
import { AIConversation } from '@/types/trainer';
import { formatDistanceToNow } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
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
  const { t, i18n } = useTranslation('trainer');
  const dateLocale = i18n.language === 'ru' ? ru : enUS;

  const getContextModeLabel = (mode: string) => {
    const modes: Record<string, string> = {
      goals: t('ai.contextModes.goals'),
      analysis: t('ai.contextModes.analysis'),
      challenge: t('ai.contextModes.challenge'),
      general: t('ai.contextModes.general')
    };
    return modes[mode] || modes.general;
  };

  return (
    <div className="space-y-4">
      <Button onClick={onNewConversation} className="w-full" size="sm">
        <Plus className="h-4 w-4 mr-2" />
        {t('ai.newConversation')}
      </Button>

      <ScrollArea className="h-[calc(100vh-400px)]">
        <div className="space-y-2">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
              {t('ai.noConversations')}
            </div>
          ) : (
            conversations.map((conversation) => {
              const clientData = conversation.metadata as any;
              
              return (
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
                      {clientData?.client_id && (
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={clientData.client_avatar_url} />
                            <AvatarFallback className="text-xs">
                              {clientData.client_full_name?.[0] || 'C'}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs font-medium text-muted-foreground truncate">
                            {clientData.client_full_name}
                          </span>
                        </div>
                      )}
                      
                      <h3 className="font-medium text-sm truncate">
                        {conversation.title || t('ai.untitled')}
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(conversation.last_message_at), {
                          addSuffix: true,
                          locale: dateLocale
                        })}
                      </p>
                      <div className="mt-1">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-muted">
                          {getContextModeLabel(conversation.context_mode)}
                        </span>
                      </div>
                    </div>
                  
                  <AlertDialog>
                    <AlertDialogTrigger asChild onClick={(e) => e.stopPropagation()}>
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
                        <AlertDialogTitle>{t('ai.deleteConversation')}</AlertDialogTitle>
                        <AlertDialogDescription>
                          {t('ai.deleteDescription')}
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>{t('ai.cancel')}</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => onDeleteConversation(conversation.id)}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {t('ai.delete')}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
