import { Sparkles } from 'lucide-react';
import { AIMessageList } from './AIMessageList';
import { AIInput } from './AIInput';
import { AIThreadSidebar } from './AIThreadSidebar';
import { AIChatProvider } from './AIChatProvider';
import { useIsMobile } from '@/hooks/primitive';
import { Card } from '@/components/ui/card';

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

  return (
    <AIChatProvider>
      <Card className="h-full flex overflow-hidden bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-200 dark:border-purple-800">
        {/* Sidebar - only on desktop */}
        {!isMobile && <AIThreadSidebar />}
        
        {/* Main Chat Area */}
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
          
          {/* Messages */}
          <AIMessageList selectedClient={selectedClient} />
          
          {/* Input */}
          <AIInput selectedClient={selectedClient} />
        </div>
      </Card>
    </AIChatProvider>
  );
}
