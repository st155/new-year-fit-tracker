import { useState } from 'react';
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

export const TrainerAIHub = () => {
  const { user } = useAuth();
  const [contextMode, setContextMode] = useState('general');
  const [activeTab, setActiveTab] = useState('chat');

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

  const {
    pendingActions,
    loading: actionsLoading,
    executing,
    executeActions,
    rejectAction
  } = useAIPendingActions(user?.id);

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
            <Card className="lg:col-span-3 p-0 flex flex-col" style={{ height: 'calc(100vh - 300px)' }}>
              <div className="p-4 border-b">
                <AIContextSelector
                  contextMode={contextMode}
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
                  sending={sending}
                  onSendMessage={sendMessage}
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
