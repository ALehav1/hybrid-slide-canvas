import { useCallback, useEffect, useRef } from 'react';
import conversationStore, { CONVERSATION_STORE_KEY, type ConversationState } from '../lib/storage/conversationStorage';
import type { SlideConversation } from '../context/ConversationContext';
import { logger } from '../lib/utils/logging';

/** milliseconds to debounce */
export const SAVE_DEBOUNCE_MS = 300;

export function useConversationAutosave(
  storageIsLoading: boolean,
  conversationsRef: React.MutableRefObject<Map<string, SlideConversation>>,
  isChatExpanded: boolean,
) {
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const cancelSave = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
  }, []);

  const scheduleSave = useCallback(() => {
    cancelSave();

    if (storageIsLoading) return;

    saveTimeoutRef.current = setTimeout(async () => {
      // Ensure timeout wasn't cancelled while waiting
      if (!saveTimeoutRef.current) return;

      const stateToSave: ConversationState = {
        conversations: Array.from(conversationsRef.current.entries()),
        isChatExpanded,
      };

      try {
        logger.debug('Saving conversation state via debounced hook', { isChatExpanded });
        // Safeguard: conversationStore may be undefined in certain test environments
        if (conversationStore) {
          await conversationStore.setItem(CONVERSATION_STORE_KEY, { state: stateToSave });
        }
      } catch (error) {
        logger.error('Failed to save conversation state', error as Error);
      } finally {
        saveTimeoutRef.current = null;
      }
    }, SAVE_DEBOUNCE_MS);
  }, [storageIsLoading, isChatExpanded, conversationsRef, cancelSave]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelSave();
    };
  }, [cancelSave]);

  return { scheduleSave, cancelSave };
}
