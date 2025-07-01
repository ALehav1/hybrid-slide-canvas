/**
 * Conversation Storage with Dexie
 * 
 * This module provides a Dexie-based storage solution for conversation data.
 * It offers a similar interface to the localStorage API to make migration easier.
 */

import { logger } from '../utils/logging';
import { db, initDatabase } from './dexieStorage';

/**
 * The key used to store conversation data in Dexie
 */
const CONVERSATION_STORE_KEY = 'conversation-state';

/**
 * A class that provides localStorage-like API for storing conversation data
 * but uses Dexie/IndexedDB under the hood for better performance and reliability.
 */
class ConversationStore {
  /**
   * Initialize the database
   * This should be called before any other operations
   */
  async init(): Promise<void> {
    try {
      await initDatabase();
      logger.debug('Conversation storage initialized');
    } catch (error) {
      logger.error('Failed to initialize conversation storage', error);
      throw error;
    }
  }

  /**
   * Get conversation data from storage
   * @returns The stored conversation data or null if not found
   */
  async getItem(key: string): Promise<string | null> {
    try {
      const item = await db.zustandStore.get(key);
      return item?.value ?? null;
    } catch (error) {
      logger.error('Failed to get conversation data', error);
      return null;
    }
  }

  /**
   * Store conversation data
   * @param key The key to store the data under
   * @param value The data to store (as JSON string)
   */
  async setItem(key: string, value: string): Promise<void> {
    try {
      await db.zustandStore.put({
        id: key,
        value
      });
    } catch (error) {
      logger.error('Failed to store conversation data', error);
      throw error;
    }
  }

  /**
   * Remove conversation data from storage
   * @param key The key to remove
   */
  async removeItem(key: string): Promise<void> {
    try {
      await db.zustandStore.delete(key);
    } catch (error) {
      logger.error('Failed to remove conversation data', error);
      throw error;
    }
  }

  /**
   * Clear all conversation data from storage
   */
  async clear(): Promise<void> {
    try {
      // Only clear conversation data, not other data
      await db.zustandStore.delete(CONVERSATION_STORE_KEY);
    } catch (error) {
      logger.error('Failed to clear conversation data', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
const conversationStore = new ConversationStore();
export default conversationStore;

// Also export the key for external use
export { CONVERSATION_STORE_KEY };
