import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAIConversations } from '@/hooks/useAIConversations';
import { useAIPendingActions } from '@/hooks/useAIPendingActions';
import { AIConversationList } from './AIConversationList';
import { AIChatWindow } from './AIChatWindow';
import { AIPendingActionsPanel } from './AIPendingActionsPanel';
import { AIContextSelector } from './AIContextSelector';
import { MessageSquare, Sparkles } from 'lucide-react';
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
  const [contextMode, setContextMode] = useState('general');
  const [activeTab, setActiveTab] = useState('chat');

  // Автоматически переключаться на контекст клиента, если он выбран
  useEffect(() => {
    if (selectedClient && contextMode !== 'goals') {
      setContextMode('goals');
    }
  }, [selectedClient]);

  const {
    conversations,
    currentConversation,
    messages,
    loading: conversationsLoading,
    sending,
    selectConversation,
    sendMessage,
    startNewConversation,
    deleteConversation
  } = useAIConversations(user?.id);

  const handleSendMessage = async (
    message: string,
    mode: string,
    mentionedClients: string[],
    mentionedNames?: string[],
    contextClientId?: string,
    autoExecute: boolean = true
  ) => {
    return await sendMessage(
      message,
      mode,
      mentionedClients,
      mentionedNames || [],
      contextClientId,
      autoExecute
    );
  };

  const {
    pendingActions,
    loading: actionsLoading,
    executing,
    executeActions,
    rejectAction
  } = useAIPendingActions(user?.id);

  // Автоматически выбираем последний разговор при загрузке
  useEffect(() => {
    if (!conversationsLoading && conversations.length > 0 && !currentConversation) {
      console.log('📌 Auto-selecting last conversation:', conversations[0].id);
      selectConversation(conversations[0].id);
    }
  }, [conversationsLoading, conversations, currentConversation, selectConversation]);

  if (conversationsLoading || actionsLoading) {
    return <PageLoader message="Загрузка AI Hub..." />;
  }

  return (
    <div className="container max-w-7xl mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">
              Управляйте клиентами и анализируйте прогресс с помощью AI
            </p>
          </div>
        </div>
        {selectedClient && (
          <div className="mt-4 p-3 bg-muted rounded-lg border">
            <p className="text-sm text-muted-foreground mb-1">Выбранный клиент:</p>
            <p className="font-medium">{selectedClient.full_name || selectedClient.username}</p>
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="chat" className="gap-2">
            <MessageSquare className="h-4 w-4" />
            Чат с AI
          </TabsTrigger>
          <TabsTrigger value="actions" className="gap-2">
            <Sparkles className="h-4 w-4" />
            Действия ({pendingActions.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="chat" className="space-y-0">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Conversations sidebar */}
            <Card className="lg:col-span-1 p-4">
              <AIConversationList
                conversations={conversations}
                currentConversation={currentConversation}
                onSelectConversation={selectConversation}
                onNewConversation={() => startNewConversation(contextMode)}
                onDeleteConversation={deleteConversation}
              />
            </Card>

            {/* Chat window */}
            <Card className="lg:col-span-3 p-0 flex flex-col overflow-hidden" style={{ height: 'calc(100vh - 300px)', minHeight: '500px' }}>
              <div className="p-4 border-b">
                <AIContextSelector
                  contextMode={contextMode}
                  selectedClient={selectedClient}
                  onContextChange={(mode) => {
                    setContextMode(mode);
                    if (!currentConversation) {
                      startNewConversation(mode);
                    }
                  }}
                />
              </div>
              <div className="flex-1 overflow-hidden">
                <AIChatWindow
                  messages={messages}
                  currentConversation={currentConversation}
                  contextMode={contextMode}
                  selectedClient={selectedClient}
                  sending={sending}
                  onSendMessage={handleSendMessage}
                  onSwitchToActionsTab={() => setActiveTab('actions')}
                />
              </div>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="actions">
          <Card className="p-6">
            <AIPendingActionsPanel
              pendingActions={pendingActions}
              executing={executing}
              onExecute={executeActions}
              onReject={rejectAction}
            />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
