import { Drawer } from 'vaul';
import { motion } from 'framer-motion';
import { Sparkles, X, History, Settings as SettingsIcon, MessageSquare, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { AIMessageList } from './AIMessageList';
import { AIInput } from './AIInput';
import { AIThreadSidebar } from './AIThreadSidebar';
import { AIActionsHistory } from './AIActionsHistory';
import { AIChatProvider } from './AIChatProvider';
import { AIPendingActionsPanel } from '../AIPendingActionsPanel';
import { useAIPendingActions } from '@/hooks/useAIPendingActions';
import { useIsMobile } from '@/hooks/primitive';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';

interface AIDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClient?: {
    id: string;
    user_id: string;
    username: string;
    full_name: string;
  } | null;
}

function AIDrawerContent({ onOpenChange, selectedClient }: Omit<AIDrawerProps, 'open'>) {
  const isMobile = useIsMobile();
  const [userId, setUserId] = useState<string | undefined>();
  const [activeTab, setActiveTab] = useState<'chat' | 'pending' | 'history'>('chat');
  const { pendingActions, executing, executeActions, rejectAction } = useAIPendingActions(userId);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id);
    });
  }, []);

  return (
        <Drawer.Portal>
          {/* Overlay with gradient blur */}
          <Drawer.Overlay className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50" />
          
          {/* Main Drawer */}
          <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mt-24 flex h-full max-h-[95%] flex-col rounded-t-[24px] bg-background border-t-2 border-primary/20 shadow-2xl">
            
            {/* Drag handle */}
            <div className="mx-auto mt-4 h-2 w-[100px] rounded-full bg-muted" />
            
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 blur-lg opacity-50" />
                  <motion.div 
                    className="relative h-10 w-10 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center"
                    animate={{ 
                      boxShadow: [
                        '0 0 20px rgba(168, 85, 247, 0.4)',
                        '0 0 40px rgba(236, 72, 153, 0.6)',
                        '0 0 20px rgba(168, 85, 247, 0.4)',
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="h-5 w-5 text-white" />
                  </motion.div>
                </div>
                <div>
                  <h2 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                    AI Assistant
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Powered by Gemini 2.5 Flash
                  </p>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex items-center gap-2">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => onOpenChange(false)}
                  className="h-9 w-9 rounded-full"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
            </div>
            
            {/* Tabs Navigation */}
            <div className="border-b bg-background/95">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="w-full justify-start rounded-none border-b-0 bg-transparent p-0 px-6">
                  <TabsTrigger 
                    value="chat" 
                    className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Чат
                  </TabsTrigger>
                  <TabsTrigger 
                    value="pending" 
                    className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <Clock className="h-4 w-4 mr-2" />
                    Ожидают
                    {pendingActions.length > 0 && (
                      <Badge variant="destructive" className="ml-2 h-5 w-5 p-0 flex items-center justify-center text-xs animate-pulse">
                        {pendingActions.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger 
                    value="history" 
                    className="relative rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 font-semibold data-[state=active]:border-primary data-[state=active]:bg-transparent"
                  >
                    <History className="h-4 w-4 mr-2" />
                    История
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Content Area */}
            <div className="flex flex-1 overflow-hidden">
              {activeTab === 'chat' && (
                <>
                  {/* Thread Sidebar (hidden on mobile) */}
                  {!isMobile && <AIThreadSidebar />}
                  
                  {/* Main Chat */}
                  <div className="flex-1 flex flex-col overflow-hidden">
                    <AIMessageList selectedClient={selectedClient} />
                    <AIInput selectedClient={selectedClient} />
                  </div>
                </>
              )}

              {activeTab === 'pending' && (
                <div className="flex-1 overflow-hidden p-4">
                  <AIPendingActionsPanel
                    pendingActions={pendingActions}
                    executing={executing}
                    onExecute={executeActions}
                    onReject={rejectAction}
                  />
                </div>
              )}

              {activeTab === 'history' && (
                <div className="flex-1 overflow-hidden">
                  <AIActionsHistory userId={userId} />
                </div>
              )}
            </div>
            
          </Drawer.Content>
        </Drawer.Portal>
  );
}

export function AIDrawer({ open, onOpenChange, selectedClient }: AIDrawerProps) {
  return (
    <AIChatProvider>
      <Drawer.Root open={open} onOpenChange={onOpenChange}>
        <AIDrawerContent onOpenChange={onOpenChange} selectedClient={selectedClient} />
      </Drawer.Root>
    </AIChatProvider>
  );
}
