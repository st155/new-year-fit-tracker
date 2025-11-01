import { useAIChatContext } from './AIChatProvider';

/**
 * Wrapper hook that consumes AI chat context
 * Ensures all components share the same state
 */
export function useAIChat() {
  return useAIChatContext();
}
