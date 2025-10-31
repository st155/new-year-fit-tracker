import { useAIConversations } from '@/hooks/useAIConversations';
import { useAuth } from '@/hooks/useAuth';

/**
 * Wrapper hook around useAIConversations
 * Provides a simplified interface for the new AI chat components
 */
export function useAIChat() {
  const { user } = useAuth();
  const aiConversations = useAIConversations(user?.id);

  return {
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
  };
}
