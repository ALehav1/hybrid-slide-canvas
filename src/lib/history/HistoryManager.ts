/**
 * Multi-Origin History Manager
 * 
 * Core implementation of the history tracking system using Zustand + Immer.
 * Supports origin-based filtering for selective undo/redo operations.
 * 
 * Key Features:
 * - Origin tracking (user, AI, template)
 * - Selective undo/redo by origin type
 * - Memory management with configurable limits
 * - Batched operations with debounce
 * - Performance monitoring and debugging
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import { logger } from '../utils/logging';
import type {
  HistoryStoreState,
  HistoryStore,
  HistoryEntry,
  HistoryOrigin,
  HistoryManagerConfig,
  HistoryBatch
} from './types';

/**
 * Default configuration for the history manager
 */
const DEFAULT_CONFIG: Required<HistoryManagerConfig> = {
  maxEntries: 100,
  initialEnabled: true,
  debounceMs: 100,
  includeMetadata: true,
};

/**
 * Debounce helper for batching rapid changes
 * Prevents history spam during continuous operations (e.g., dragging)
 */
class DebounceManager {
  private timers = new Map<string, NodeJS.Timeout>();
  
  /**
   * Execute a function after debounce delay
   * @param key - Unique key for this debounce operation
   * @param fn - Function to execute
   * @param delay - Delay in milliseconds
   */
  debounce(key: string, fn: () => void, delay: number): void {
    // Clear existing timer for this key
    const existingTimer = this.timers.get(key);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }
    
    // Set new timer
    const timer = setTimeout(() => {
      fn();
      this.timers.delete(key);
    }, delay);
    
    this.timers.set(key, timer);
  }
  
  /**
   * Clear all pending debounced operations
   */
  clearAll(): void {
    this.timers.forEach(timer => clearTimeout(timer));
    this.timers.clear();
  }
}

/**
 * Create the history manager store
 * @param config - Configuration options
 */
export function createHistoryManager(config: HistoryManagerConfig = {}): HistoryStore {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  const debounceManager = new DebounceManager();
  
  return create<HistoryStoreState>()(
    immer((set, get) => ({
      // Initial state
      entries: [],
      currentIndex: -1,
      maxEntries: finalConfig.maxEntries,
      isEnabled: finalConfig.initialEnabled,
      stats: {
        totalEntries: 0,
        undoCount: 0,
        redoCount: 0,
        lastActionTime: null,
      },
      
      // Add a new history entry
      addEntry: (entry) => {
        const state = get();
        
        // Skip if history is disabled
        if (!state.isEnabled) {
          logger.debug('History tracking is disabled, skipping entry');
          return;
        }
        
        // Create full entry with generated ID and timestamp
        const fullEntry: HistoryEntry = {
          ...entry,
          id: nanoid(8),
          timestamp: new Date(),
        };
        
        // Log the entry for debugging
        logger.debug(`Adding history entry: ${fullEntry.description}`, {
          origin: fullEntry.origin,
          id: fullEntry.id,
          hasMetadata: !!fullEntry.metadata,
        });
        
        set((draft) => {
          // If we're not at the end of history, remove entries after current position
          // This happens when user undoes and then makes a new change
          if (draft.currentIndex < draft.entries.length - 1) {
            draft.entries.splice(draft.currentIndex + 1);
          }
          
          // Add the new entry
          draft.entries.push(fullEntry);
          draft.currentIndex = draft.entries.length - 1;
          
          // Enforce maximum entries limit
          if (draft.entries.length > draft.maxEntries) {
            const removeCount = draft.entries.length - draft.maxEntries;
            draft.entries.splice(0, removeCount);
            draft.currentIndex -= removeCount;
          }
          
          // Update statistics
          draft.stats.totalEntries++;
          draft.stats.lastActionTime = new Date();
        });
      },
      
      // Undo the last change (optionally filtered by origin)
      undo: (origin?: HistoryOrigin) => {
        const state = get();
        
        if (!state.isEnabled) {
          logger.debug('History tracking is disabled, cannot undo');
          return false;
        }
        
        // Find the most recent entry to undo
        let targetIndex = -1;
        for (let i = state.currentIndex; i >= 0; i--) {
          const entry = state.entries[i];
          if (!origin || entry.origin === origin) {
            targetIndex = i;
            break;
          }
        }
        
        if (targetIndex === -1) {
          logger.debug(`No undoable entries found${origin ? ` for origin: ${origin}` : ''}`);
          return false;
        }
        
        const entry = state.entries[targetIndex];
        
        try {
          // Execute the undo operation
          entry.undo();
          
          // Update state
          set((draft) => {
            draft.currentIndex = targetIndex - 1;
            draft.stats.undoCount++;
            draft.stats.lastActionTime = new Date();
          });
          
          logger.debug(`Undid entry: ${entry.description}`, {
            origin: entry.origin,
            id: entry.id,
          });
          
          return true;
        } catch (error) {
          logger.error('Failed to undo history entry', {
            entryId: entry.id,
            description: entry.description,
            error,
          });
          return false;
        }
      },
      
      // Redo the next change (optionally filtered by origin)
      redo: (origin?: HistoryOrigin) => {
        const state = get();
        
        if (!state.isEnabled) {
          logger.debug('History tracking is disabled, cannot redo');
          return false;
        }
        
        // Find the next entry to redo
        let targetIndex = -1;
        for (let i = state.currentIndex + 1; i < state.entries.length; i++) {
          const entry = state.entries[i];
          if (!origin || entry.origin === origin) {
            targetIndex = i;
            break;
          }
        }
        
        if (targetIndex === -1) {
          logger.debug(`No redoable entries found${origin ? ` for origin: ${origin}` : ''}`);
          return false;
        }
        
        const entry = state.entries[targetIndex];
        
        try {
          // Execute the redo operation
          entry.redo();
          
          // Update state
          set((draft) => {
            draft.currentIndex = targetIndex;
            draft.stats.redoCount++;
            draft.stats.lastActionTime = new Date();
          });
          
          logger.debug(`Redid entry: ${entry.description}`, {
            origin: entry.origin,
            id: entry.id,
          });
          
          return true;
        } catch (error) {
          logger.error('Failed to redo history entry', {
            entryId: entry.id,
            description: entry.description,
            error,
          });
          return false;
        }
      },
      
      // Check if undo is available (optionally filtered by origin)
      canUndo: (origin?: HistoryOrigin) => {
        const state = get();
        
        if (!state.isEnabled) return false;
        
        // Look for undoable entries
        for (let i = state.currentIndex; i >= 0; i--) {
          const entry = state.entries[i];
          if (!origin || entry.origin === origin) {
            return true;
          }
        }
        
        return false;
      },
      
      // Check if redo is available (optionally filtered by origin)
      canRedo: (origin?: HistoryOrigin) => {
        const state = get();
        
        if (!state.isEnabled) return false;
        
        // Look for redoable entries
        for (let i = state.currentIndex + 1; i < state.entries.length; i++) {
          const entry = state.entries[i];
          if (!origin || entry.origin === origin) {
            return true;
          }
        }
        
        return false;
      },
      
      // Clear all history entries
      clear: () => {
        set((draft) => {
          draft.entries = [];
          draft.currentIndex = -1;
        });
        
        // Clear any pending debounced operations
        debounceManager.clearAll();
        
        logger.debug('History cleared');
      },
      
      // Clear entries from a specific origin
      clearByOrigin: (origin: HistoryOrigin) => {
        set((draft) => {
          const beforeCount = draft.entries.length;
          
          // Remove entries with matching origin
          draft.entries = draft.entries.filter(entry => entry.origin !== origin);
          
          // Adjust current index if needed
          if (draft.currentIndex >= draft.entries.length) {
            draft.currentIndex = draft.entries.length - 1;
          }
          
          const afterCount = draft.entries.length;
          const removedCount = beforeCount - afterCount;
          
          logger.debug(`Cleared ${removedCount} entries with origin: ${origin}`);
        });
      },
      
      // Enable/disable history tracking
      setEnabled: (enabled: boolean) => {
        set((draft) => {
          draft.isEnabled = enabled;
        });
        
        logger.debug(`History tracking ${enabled ? 'enabled' : 'disabled'}`);
      },
      
      // Get entries filtered by origin
      getEntriesByOrigin: (origin: HistoryOrigin) => {
        const state = get();
        return state.entries.filter(entry => entry.origin === origin);
      },
      
      // Get recent entries (for debugging)
      getRecentEntries: (count: number = 10) => {
        const state = get();
        const startIndex = Math.max(0, state.entries.length - count);
        return state.entries.slice(startIndex);
      },
    }))
  );
}

/**
 * Default history manager instance
 * This is the main instance used throughout the application
 */
export const useHistoryStore = createHistoryManager();

/**
 * Helper function to create a batched history entry
 * Groups multiple operations into a single undoable unit
 */
export function createBatchedEntry(batch: HistoryBatch): Omit<HistoryEntry, 'id' | 'timestamp'> {
  return {
    origin: batch.origin,
    description: batch.description,
    undo: () => {
      // Execute all undo operations in reverse order
      for (let i = batch.changes.length - 1; i >= 0; i--) {
        batch.changes[i].undo();
      }
    },
    redo: () => {
      // Execute all redo operations in forward order
      for (const change of batch.changes) {
        change.redo();
      }
    },
    metadata: {
      batchId: batch.id,
      changeCount: batch.changes.length,
      changes: batch.changes.map(change => change.metadata || {}),
    },
  };
}

/**
 * Utility function to safely execute a function with error handling
 * Used internally for undo/redo operations
 */
export function safeExecute(operation: () => void, context: string): boolean {
  try {
    operation();
    return true;
  } catch (error) {
    logger.error(`Failed to execute ${context}`, error);
    return false;
  }
}
