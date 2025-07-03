/**
 * Conversation utility functions
 */
import { nanoid } from 'nanoid'
import { MessageRole, type ConversationMessage } from '@/lib/types'

/**
 * Creates a welcome message with the current timestamp and a unique ID
 * Used when initializing a new slide's conversation
 * 
 * @returns A new ConversationMessage with assistant role
 */
export const createWelcomeMessage = (): ConversationMessage => ({
  id: nanoid(),
  role: MessageRole.ASSISTANT,
  content: 'Welcome to your new slide! Ask me anything 🚀',
  timestamp: new Date(),
})
