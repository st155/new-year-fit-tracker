import { useRef, useEffect } from 'react';
import { VirtualizedList } from '@/components/ui/virtualized-list';
import { MessageBubble } from './MessageBubble';
import { AIMessage } from '@/types/trainer';
import { AIPendingAction } from '@/hooks/useAIPendingActions';
import { Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ArrowDown } from 'lucide-react';

interface VirtualizedMessageListProps {
  messages: AIMessage[];
  clients: Array<{
    user_id: string;
    username: string;
    full_name: string;
    avatar_url?: string;
  }>;
  pendingActions: AIPendingAction[];
  onNavigateToClient: (clientId: string) => void;
  onExecuteAction: (pendingActionId: string, conversationId: string, actions: any[]) => Promise<any>;
  onRejectAction: (actionId: string) => Promise<void>;
  executing: boolean;
  sending: boolean;
  onApprovePlan: () => void;
  conversationId?: string;
  showScrollButton: boolean;
  onScrollToBottom: () => void;
}

export const VirtualizedMessageList = ({
  messages,
  clients,
  pendingActions,
  onNavigateToClient,
  onExecuteAction,
  onRejectAction,
  executing,
  sending,
  onApprovePlan,
  conversationId,
  showScrollButton,
  onScrollToBottom
}: VirtualizedMessageListProps) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollContainerRef.current) {
      const scrollableElement = scrollContainerRef.current.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement;
      if (scrollableElement) {
        requestAnimationFrame(() => {
          scrollableElement.scrollTop = scrollableElement.scrollHeight;
        });
      }
    }
  }, [messages.length]);

  if (messages.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground p-4">
        <Bot className="h-16 w-16 mb-4 opacity-50" />
        <h3 className="text-lg font-medium mb-2">Начните разговор с AI</h3>
        <p className="text-sm max-w-md">
          Задавайте вопросы, анализируйте клиентов или обсуждайте планы тренировок.
          Используйте @username для упоминания конкретных клиентов.
        </p>
      </div>
    );
  }

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto relative">
      <div className="p-4 space-y-4">
        {messages.map((message) => {
          const pendingAction = pendingActions.find(
            pa => pa.conversation_id === conversationId && 
                  pa.status === 'pending' &&
                  message.metadata?.pendingActionId === pa.id
          );

          return (
            <MessageBubble
              key={message.id}
              message={message}
              clients={clients}
              onNavigateToClient={onNavigateToClient}
              pendingAction={pendingAction}
              onExecuteAction={() => {
                if (pendingAction) {
                  onExecuteAction(
                    pendingAction.id,
                    pendingAction.conversation_id,
                    pendingAction.action_data?.actions || []
                  );
                }
              }}
              onRejectAction={() => {
                if (pendingAction) {
                  onRejectAction(pendingAction.id);
                }
              }}
              executing={executing}
              sending={sending}
              onApprovePlan={onApprovePlan}
              onReconsiderPlan={() => {}}
            />
          );
        })}
      </div>

      {showScrollButton && (
        <Button
          onClick={onScrollToBottom}
          size="icon"
          className="fixed bottom-24 right-8 rounded-full shadow-lg z-50"
          variant="secondary"
        >
          <ArrowDown className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
