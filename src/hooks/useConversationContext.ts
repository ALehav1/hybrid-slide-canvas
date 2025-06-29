import { useContext } from 'react';
import { ConversationContext, type ConversationContextType } from '../components/ConversationProvider';

/**
 * Hook to use enhanced conversation context
 * Provides type-safe access to conversation state, methods, and data
 * 
 * Manages:
 * - UI state (chat expanded, input, loading, errors)
 * - Conversation data (messages per slide, conversation history)
 * - Convenience methods for UI interactions
 * - Conversation data operations
 * 
 * Must be used within ConversationProvider
 */
export const useConversationContext = (): ConversationContextType => {
  const context = useContext(ConversationContext);
  if (!context) {
    throw new Error('useConversationContext must be used within ConversationProvider');
  }
  return context;
};
