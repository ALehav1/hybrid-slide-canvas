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
};

export const useHistoryStore = create<HistoryState>()(
  immer((set, get) => ({
    ...initialHistoryStateData,

    addEntry: (entry: HistoryEntry) => {
      set(draft => {
        // Add to the specific origin's undo stack and the 'all' stack
        draft.stacks[entry.origin].undo.push(entry);
        draft.stacks.all.undo.push(entry);

        // A new action clears the redo stack for the corresponding origins
        draft.stacks[entry.origin].redo = [];
        draft.stacks.all.redo = [];
      });
    },

    undo: (origin: HistoryOrigin | 'all' = 'all'): HistoryEntry | null => {
      const entryToUndo = get().stacks[origin].undo.slice(-1)[0] ?? null;
      if (!entryToUndo) return null;

      set(draft => {
        const entry = draft.stacks[origin].undo.pop();
        if (entry) {
          draft.stacks[origin].redo.push(entry);

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

      return entryToUndo;
    },

    redo: (origin: HistoryOrigin | 'all' = 'all'): HistoryEntry | null => {
      const entryToRedo = get().stacks[origin].redo.slice(-1)[0] ?? null;
      if (!entryToRedo) return null;

      set(draft => {
        const entry = draft.stacks[origin].redo.pop();
        if (entry) {
          draft.stacks[origin].undo.push(entry);

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

      return entryToRedo;
    },

    clear: (origin?: HistoryOrigin) => {
      set(draft => {
        if (origin) {
          const entriesToKeep = draft.stacks.all.undo.filter(e => e.origin !== origin);
          const redoEntriesToKeep = draft.stacks.all.redo.filter(e => e.origin !== origin);
          draft.stacks.all.undo = entriesToKeep;
          draft.stacks.all.redo = redoEntriesToKeep;
          draft.stacks[origin] = { undo: [], redo: [] };
        } else {
          draft.stacks = {
            user: { undo: [], redo: [] },
            ai: { undo: [], redo: [] },
            template: { undo: [], redo: [] },
            all: { undo: [], redo: [] },
          };
        }
      });
    },
  }))
);
