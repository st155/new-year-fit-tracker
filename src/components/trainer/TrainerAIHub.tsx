import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sparkles, History, X } from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { AIChatWindow } from './AIChatWindow';
import { AIConversationList } from './AIConversationList';
import { useAIConversations } from '@/hooks/useAIConversations';
import { useAIPendingActions } from '@/hooks/useAIPendingActions';
import { useAuth } from '@/hooks/useAuth';
import { PageLoader } from '@/components/ui/page-loader';

interface TrainerAIHubProps {
  selectedClient?: {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  } | null;
}

export const TrainerAIHub = ({ selectedClient }: TrainerAIHubProps) => {
  const { user } = useAuth();
  const [localSelectedClient, setLocalSelectedClient] = useState(selectedClient);
  const [historyOpen, setHistoryOpen] = useState(false);

  const {
    conversations,
    currentConversation,
    messages,
    loading: conversationsLoading,
    sending,
    selectConversation,
    sendMessage,
    startNewConversation,
    deleteConversation,
  } = useAIConversations(user?.id);

  const {
    pendingActions,
    loading: actionsLoading,
    executing,
    executeActions,
    rejectAction,
  } = useAIPendingActions(user?.id);

  // Update local selected client when prop changes
  useEffect(() => {
    setLocalSelectedClient(selectedClient);
  }, [selectedClient]);

  // Auto-select last conversation if no current conversation
  useEffect(() => {
    if (!currentConversation && conversations.length > 0) {
      selectConversation(conversations[0].id);
    }
  }, [conversations, currentConversation, selectConversation]);

  const handleSendMessage = async (
    message: string,
    contextMode: string,
    mentionedClients: string[],
    mentionedNames?: string[],
    contextClientId?: string,
    autoExecute?: boolean
  ) => {
    // Always auto-execute (simplified), always use 'general' context
    return await sendMessage(message, 'general', mentionedClients, mentionedNames || [], contextClientId, true);
  };

  const handleClearSelectedClient = () => {
    setLocalSelectedClient(null);
  };

  if (conversationsLoading || actionsLoading) {
    return <PageLoader message="Загрузка AI Assistant..." />;
  }

  return (
    <div className="container max-w-7xl mx-auto p-4">
      {/* Compact header */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Assistant</h1>
            <p className="text-xs text-muted-foreground">
              Умный помощник для работы с клиентами
            </p>
          </div>
        </div>
        
        {/* History button with sheet */}
        <div className="flex items-center gap-2">
          {pendingActions.length > 0 && (
            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600">
              {pendingActions.length} {pendingActions.length === 1 ? 'действие' : 'действий'}
            </Badge>
          )}
          
          <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2">
                <History className="h-4 w-4" />
                История
                {conversations.length > 0 && (
                  <Badge variant="secondary" className="ml-1">
                    {conversations.length}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px]">
              <SheetHeader>
                <SheetTitle>История разговоров</SheetTitle>
              </SheetHeader>
              <div className="mt-4">
                <AIConversationList
                  conversations={conversations}
                  currentConversation={currentConversation}
                  onSelectConversation={(id) => {
                    selectConversation(id);
                    setHistoryOpen(false);
                  }}
                  onNewConversation={() => {
                    startNewConversation();
                    setHistoryOpen(false);
                  }}
                  onDeleteConversation={deleteConversation}
                />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Selected client indicator (if any) */}
      {localSelectedClient && (
        <div className="mb-3 p-2 bg-muted rounded-lg border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarImage src={localSelectedClient.avatar_url} />
              <AvatarFallback className="text-xs">
                {localSelectedClient.full_name?.[0] || localSelectedClient.username?.[0]}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">
              {localSelectedClient.full_name || localSelectedClient.username}
            </span>
          </div>
          <Button size="sm" variant="ghost" onClick={handleClearSelectedClient}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Full-width chat */}
      <Card className="p-0 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 200px)', minHeight: '600px' }}>
        <AIChatWindow
          messages={messages}
          currentConversation={currentConversation}
          selectedClient={localSelectedClient}
          sending={sending}
          onSendMessage={handleSendMessage}
          pendingActions={pendingActions}
          onExecuteAction={executeActions}
          onRejectAction={rejectAction}
          executing={executing}
        />
      </Card>
    </div>
  );
};
