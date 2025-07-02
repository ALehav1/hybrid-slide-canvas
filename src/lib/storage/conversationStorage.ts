import { createDexieStorage } from './dexieStorage';
import type { SlideConversation } from '../../context/ConversationContext';

export const CONVERSATION_STORE_KEY = 'conversationState';

export interface ConversationState {
  conversations: [string, SlideConversation][];
  isChatExpanded: boolean;
}

const conversationStore = createDexieStorage<ConversationState>({
  name: 'conversation-store',
  initializeDb: false // Will be initialized manually
});

export default conversationStore;
