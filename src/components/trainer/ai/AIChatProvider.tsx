import { createContext, useContext, useMemo, ReactNode } from 'react';
import { useAIConversations } from '@/hooks/useAIConversations';
import { useAuth } from '@/hooks/useAuth';
import type { AIConversation, AIMessage } from '@/types/trainer';

interface AIChatContextType {
  // State
  conversations: AIConversation[];
  currentConversation: AIConversation | null;
  messages: AIMessage[];
  loading: boolean;
  sending: boolean;
  sendingState: 'idle' | 'sending' | 'processing' | 'error' | 'timeout';

  // Actions
  selectConversation: (conversationId: string | null) => Promise<void>;
  sendMessage: (
    content: string,
    conversationType?: 'general' | 'client_specific',
    mentionedClients?: string[],
    attachments?: string[],
    clientUserId?: string,
    autoExecute?: boolean
  ) => Promise<void>;
  startNewConversation: () => void;
  deleteConversation: (conversationId: string) => Promise<void>;
  refresh: () => Promise<void>;

  // Optimistic updates
  addOptimisticMessage: (content: string, role: 'user' | 'assistant') => string;
  removeOptimisticMessage: (messageId: string) => void;
  updateOptimisticMessage: (messageId: string, updates: Partial<AIMessage>) => void;
}

const AIChatContext = createContext<AIChatContextType | null>(null);

export function AIChatProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  
  console.log('🔐 [AIChatProvider] User:', user?.id, user?.email);
  
  const aiConversations = useAIConversations(user?.id);

  const value = useMemo(() => ({
    // State
    conversations: aiConversations.conversations,
    currentConversation: aiConversations.currentConversation,
    messages: aiConversations.messages,
    loading: aiConversations.loading,
    sending: aiConversations.sending,
    sendingState: aiConversations.sendingState,

    // Actions
    selectConversation: aiConversations.selectConversation,
    sendMessage: aiConversations.sendMessage,
    startNewConversation: aiConversations.startNewConversation,
    deleteConversation: aiConversations.deleteConversation,
    refresh: aiConversations.refresh,

    // Optimistic updates
    addOptimisticMessage: aiConversations.addOptimisticMessage,
    removeOptimisticMessage: aiConversations.removeOptimisticMessage,
    updateOptimisticMessage: aiConversations.updateOptimisticMessage,
  }), [aiConversations]);

  return (
    <AIChatContext.Provider value={value}>
      {children}
    </AIChatContext.Provider>
  );
}

export function useAIChatContext() {
  const context = useContext(AIChatContext);
  if (!context) {
    throw new Error('useAIChatContext must be used within AIChatProvider');
  }
  return context;
}
