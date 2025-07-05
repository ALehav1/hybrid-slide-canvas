import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { HistoryState, HistoryEntry, HistoryOrigin } from '@/lib/types/history';

// Also export the types for consumers of the store
export type { HistoryState, HistoryEntry, HistoryOrigin };

/**
 * The initial state of the history store's data.
 * Exported for easy resetting in tests.
 */
export const initialHistoryStateData = {
  stacks: {
    user: { undo: [], redo: [] },
    ai: { undo: [], redo: [] },
    template: { undo: [], redo: [] },
    all: { undo: [], redo: [] },
  },
  enabled: true,
  currentIndex: -1,
  entries: [] as HistoryEntry[],
  stats: {
    totalEntries: 0,
    undoCount: 0,
    redoCount: 0,
  },
};

export const useHistoryStore = create<HistoryState>()(
  immer((set, get) => ({
    ...initialHistoryStateData,

    addEntry: (entry: HistoryEntry) => {
      set(draft => {
        // Add to the specific origin's undo stack and the 'all' stack
        draft.stacks[entry.origin].undo.push(entry);
        draft.stacks.all.undo.push(entry);
        
        // Add to flat entries array for easy access
        draft.entries.push(entry);
        
        // Update current index
        draft.currentIndex = draft.entries.length - 1;
        
        // Update stats
        draft.stats.totalEntries++;
        draft.stats.lastActionTime = new Date();

        // A new action clears the redo stack for the corresponding origins
        draft.stacks[entry.origin].redo = [];
        draft.stacks.all.redo = [];
      });
    },

    undo: (origin: HistoryOrigin | 'all' = 'all'): boolean => {
      const entryToUndo = get().stacks[origin].undo.slice(-1)[0] ?? null;
      if (!entryToUndo) return false;

      try {
        // Call the entry's undo function first
        if (typeof entryToUndo.undo === 'function') {
          entryToUndo.undo();
        }

        set(draft => {
          const entry = draft.stacks[origin].undo.pop();
          if (entry) {
            draft.stacks[origin].redo.push(entry);
            
            // Update stats
            draft.stats.undoCount++;
            draft.stats.lastActionTime = new Date();

            if (origin !== 'all') {
              const allUndoIndex = draft.stacks.all.undo.findIndex(e => e.id === entry.id);
              if (allUndoIndex > -1) {
                const [item] = draft.stacks.all.undo.splice(allUndoIndex, 1);
                draft.stacks.all.redo.push(item);
              }
            } else {
              const specificOrigin = entry.origin;
              const specificUndoIndex = draft.stacks[specificOrigin].undo.findIndex(e => e.id === entry.id);
              if (specificUndoIndex > -1) {
                const [item] = draft.stacks[specificOrigin].undo.splice(specificUndoIndex, 1);
                draft.stacks[specificOrigin].redo.push(item);
              }
            }
          }
        });

        return true;
      } catch (error) {
        console.error('Error during undo operation:', error);
        return false;
      }
    },

    redo: (origin: HistoryOrigin | 'all' = 'all'): boolean => {
      const entryToRedo = get().stacks[origin].redo.slice(-1)[0] ?? null;
      if (!entryToRedo) return false;

      try {
        // Call the entry's redo function first
        if (typeof entryToRedo.redo === 'function') {
          entryToRedo.redo();
        }

        set(draft => {
          const entry = draft.stacks[origin].redo.pop();
          if (entry) {
            draft.stacks[origin].undo.push(entry);
            
            // Update stats
            draft.stats.redoCount++;
            draft.stats.lastActionTime = new Date();

            if (origin !== 'all') {
              const allRedoIndex = draft.stacks.all.redo.findIndex(e => e.id === entry.id);
              if (allRedoIndex > -1) {
                const [item] = draft.stacks.all.redo.splice(allRedoIndex, 1);
                draft.stacks.all.undo.push(item);
              }
            } else {
              const specificOrigin = entry.origin;
              const specificRedoIndex = draft.stacks[specificOrigin].redo.findIndex(e => e.id === entry.id);
              if (specificRedoIndex > -1) {
                const [item] = draft.stacks[specificOrigin].redo.splice(specificRedoIndex, 1);
                draft.stacks[specificOrigin].undo.push(item);
              }
            }
          }
        });

        return true;
      } catch (error) {
        console.error('Error during redo operation:', error);
        return false;
      }
    },

    clear: (origin?: HistoryOrigin) => {
      set(draft => {
        if (origin) {
          const entriesToKeep = draft.stacks.all.undo.filter(e => e.origin !== origin);
          const redoEntriesToKeep = draft.stacks.all.redo.filter(e => e.origin !== origin);
          draft.stacks.all.undo = entriesToKeep;
          draft.stacks.all.redo = redoEntriesToKeep;
          draft.stacks[origin] = { undo: [], redo: [] };
          // Update flat entries array
          draft.entries = draft.entries.filter(e => e.origin !== origin);
        } else {
          draft.stacks = {
            user: { undo: [], redo: [] },
            ai: { undo: [], redo: [] },
            template: { undo: [], redo: [] },
            all: { undo: [], redo: [] },
          };
          draft.entries = [];
          draft.currentIndex = -1;
          draft.stats = { totalEntries: 0, undoCount: 0, redoCount: 0 };
        }
      });
    },

    // Additional methods expected by tests
    canUndo: (origin: HistoryOrigin | 'all' = 'all') => {
      const state = get();
      return state.enabled && state.stacks[origin].undo.length > 0;
    },

    canRedo: (origin: HistoryOrigin | 'all' = 'all') => {
      const state = get();
      return state.enabled && state.stacks[origin].redo.length > 0;
    },

    setEnabled: (enabled: boolean) => {
      set(draft => {
        draft.enabled = enabled;
      });
    },

    getEntriesByOrigin: (origin: HistoryOrigin) => {
      const state = get();
      return state.entries.filter(entry => entry.origin === origin);
    },

    clearByOrigin: (origin: HistoryOrigin) => {
      set(draft => {
        // Clear from stacks
        draft.stacks[origin] = { undo: [], redo: [] };
        // Remove from 'all' stacks
        draft.stacks.all.undo = draft.stacks.all.undo.filter(e => e.origin !== origin);
        draft.stacks.all.redo = draft.stacks.all.redo.filter(e => e.origin !== origin);
        // Remove from flat entries array
        draft.entries = draft.entries.filter(e => e.origin !== origin);
      });
    },

    getRecentEntries: (limit: number = 10) => {
      const state = get();
      return state.entries.slice(-limit).reverse();
    },
  }))
);
