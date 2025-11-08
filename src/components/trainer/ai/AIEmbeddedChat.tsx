import { Sparkles } from 'lucide-react';
import { AIMessageList } from './AIMessageList';
import { AIInput } from './AIInput';
import { AIThreadSidebar } from './AIThreadSidebar';
import { AIChatProvider } from './AIChatProvider';
import { AIActionsHistory } from './AIActionsHistory';
import { useIsMobile } from '@/hooks/primitive';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AIPendingActionsPanel } from '@/components/trainer/AIPendingActionsPanel';
import { useAIPendingActions } from '@/hooks/useAIPendingActions';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';

interface AIEmbeddedChatProps {
  selectedClient?: {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
  } | null;
}

export function AIEmbeddedChat({ selectedClient }: AIEmbeddedChatProps) {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'chat' | 'pending' | 'history'>('chat');
  const { pendingActions, executing, executeActions, rejectAction } = useAIPendingActions(user?.id);

  return (
    <AIChatProvider>
      <Card className="h-full flex overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
        {/* Sidebar - only on desktop, only for chat tab */}
        {!isMobile && activeTab === 'chat' && <AIThreadSidebar />}
        
        {/* Main Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <div className="p-4 border-b border-purple-200 dark:border-purple-800 bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/30 dark:to-pink-900/30">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  AI Assistant
                </h2>
                <p className="text-xs text-muted-foreground">
                  Powered by Gemini 2.5 Flash
                </p>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-4 pt-2 border-b border-purple-200 dark:border-purple-800">
              <TabsList className="bg-purple-100/50 dark:bg-purple-900/20">
                <TabsTrigger value="chat" className="data-[state=active]:bg-white dark:data-[state=active]:bg-purple-950">
                  Чат
                </TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-white dark:data-[state=active]:bg-purple-950">
                  <span>Ожидают</span>
                  {pendingActions.length > 0 && (
                    <Badge className="ml-2 bg-purple-500 text-white hover:bg-purple-600 animate-pulse" variant="secondary">
                      {pendingActions.length}
                    </Badge>
                  )}
                </TabsTrigger>
                <TabsTrigger value="history" className="data-[state=active]:bg-white dark:data-[state=active]:bg-purple-950">
                  История
                </TabsTrigger>
              </TabsList>
            </div>
            
            <TabsContent value="chat" className="flex-1 flex flex-col overflow-hidden mt-0">
              {/* Messages */}
              <AIMessageList selectedClient={selectedClient} />
              
              {/* Input */}
              <AIInput selectedClient={selectedClient} />
            </TabsContent>
            
            <TabsContent value="pending" className="flex-1 overflow-hidden mt-0">
              <AIPendingActionsPanel
                pendingActions={pendingActions}
                executing={executing}
                onExecute={executeActions}
                onReject={rejectAction}
              />
            </TabsContent>
            
            <TabsContent value="history" className="flex-1 overflow-hidden mt-0">
              <AIActionsHistory userId={user?.id} />
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </AIChatProvider>
  );
}
