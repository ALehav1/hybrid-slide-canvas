import { Editor, TLRecord, TLStoreSnapshot, createShapeId } from '@tldraw/tldraw';
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { nanoid } from 'nanoid';
import React from 'react';

/**
 * Represents the origin of a history entry
 * This allows for selective undo/redo based on source
 */
export type HistoryOrigin = 'user' | 'ai' | 'template' | 'system';

/**
 * A single entry in the history stack
 */
export interface HistoryEntry {
  id: string;
  origin: HistoryOrigin;
  description: string;
  timestamp: number;
  snapshot: TLStoreSnapshot;
  undo: () => void;
  redo: () => void;
}

/**
 * History state interface for the Zustand store
 */
export interface HistoryState {
  past: Record<HistoryOrigin, HistoryEntry[]>;
  future: Record<HistoryOrigin, HistoryEntry[]>;
  maxEntries: number;
  isEnabled: boolean;
  currentOrigin: HistoryOrigin;
}

/**
 * History store actions interface
 */
export interface HistoryActions {
  pushEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  undo: (origin?: HistoryOrigin) => void;
  redo: (origin?: HistoryOrigin) => void;
  clear: (origin?: HistoryOrigin) => void;
  setOrigin: (origin: HistoryOrigin) => void;
  setEnabled: (enabled: boolean) => void;
  canUndo: (origin?: HistoryOrigin) => boolean;
  canRedo: (origin?: HistoryOrigin) => boolean;
}

/**
 * Create the history store with Immer middleware
 */
export const useHistoryStore = create<HistoryState & HistoryActions>()(
  immer((set, get) => ({
    past: {
      user: [],
      ai: [],
      template: [],
      system: [],
    },
    future: {
      user: [],
      ai: [],
      template: [],
      system: [],
    },
    maxEntries: 100,
    isEnabled: true,
    currentOrigin: 'user',

    pushEntry: (entry) => {
      if (!get().isEnabled) return;

      set((state) => {
        // Create a complete entry with ID and timestamp
        const completeEntry: HistoryEntry = {
          ...entry,
          id: nanoid(),
          timestamp: Date.now(),
        };

        // Add to the past stack for the specific origin
        state.past[entry.origin].push(completeEntry);

        // Enforce max entries limit
        if (state.past[entry.origin].length > state.maxEntries) {
          state.past[entry.origin].shift();
        }

        // Clear future stack for this origin since we're creating a new branch
        state.future[entry.origin] = [];
      });
    },

    undo: (origin) => {
      set((state) => {
        // If origin is specified, undo that specific origin
        // Otherwise, undo the current origin
        const targetOrigin = origin || state.currentOrigin;
        const pastStack = state.past[targetOrigin];
        
        if (pastStack.length === 0) return;

        // Get the last entry from past
        const entry = pastStack.pop()!;
        
        // Execute the undo function
        entry.undo();
        
        // Move to future stack
        state.future[targetOrigin].push(entry);
      });
    },

    redo: (origin) => {
      set((state) => {
        // If origin is specified, redo that specific origin
        // Otherwise, redo the current origin
        const targetOrigin = origin || state.currentOrigin;
        const futureStack = state.future[targetOrigin];
        
        if (futureStack.length === 0) return;

        // Get the last entry from future
        const entry = futureStack.pop()!;
        
        // Execute the redo function
        entry.redo();
        
        // Move to past stack
        state.past[targetOrigin].push(entry);
      });
    },

    clear: (origin) => {
      set((state) => {
        if (origin) {
          // Clear specific origin
          state.past[origin] = [];
          state.future[origin] = [];
        } else {
          // Clear all origins
          state.past = {
            user: [],
            ai: [],
            template: [],
            system: [],
          };
          state.future = {
            user: [],
            ai: [],
            template: [],
            system: [],
          };
        }
      });
    },

    setOrigin: (origin) => {
      set((state) => {
        state.currentOrigin = origin;
      });
    },

    setEnabled: (enabled) => {
      set((state) => {
        state.isEnabled = enabled;
      });
    },

    canUndo: (origin) => {
      const targetOrigin = origin || get().currentOrigin;
      return get().past[targetOrigin].length > 0;
    },

    canRedo: (origin) => {
      const targetOrigin = origin || get().currentOrigin;
      return get().future[targetOrigin].length > 0;
    },
  }))
);

/**
 * History manager class that integrates with tldraw v3
 * Uses public APIs instead of accessing protected properties
 */
export class HistoryManager {
  private editor: Editor;
  private isRecording = true;
  private lastSnapshot: TLStoreSnapshot | null = null;
  private unsubscribeFromStore: (() => void) | null = null;
  private unsubscribeFromEditorEvents: (() => void)[] = [];

  constructor(editor: Editor) {
    this.editor = editor;
    this.setupListeners();
  }

  /**
   * Set up listeners for editor changes
   */
  private setupListeners() {
    // Use the public store.listen API instead of accessing protected history
    this.unsubscribeFromStore = this.editor.store.listen(this.handleStoreChange);
    
    // Listen for undo/redo commands from tldraw itself
    // These events are triggered when tldraw's internal undo/redo is used
    this.unsubscribeFromEditorEvents.push(this.editor.on('undo', this.handleEditorUndo));
    this.unsubscribeFromEditorEvents.push(this.editor.on('redo', this.handleEditorRedo));
  }

  /**
   * Handle store changes
   */
  private handleStoreChange = () => {
    if (!this.isRecording) return;
    
    // Get the current state of the editor
    const snapshot = this.editor.store.getSnapshot();
    
    // Skip if this is the first snapshot
    if (!this.lastSnapshot) {
      this.lastSnapshot = snapshot;
      return;
    }

    // Determine the origin of the change
    // tldraw v3 does not expose origin directly in store.listen callback
    // We rely on `withOrigin` or `setOrigin` to set the current origin
    const historyOrigin = useHistoryStore.getState().currentOrigin;
    
    // Capture the state before the change and the current state
    const prevSnapshot = this.lastSnapshot;
    const currentSnapshot = snapshot;

    // Create undo/redo functions that use the public API
    const undoFn = () => {
      this.isRecording = false; // Pause recording to avoid re-triggering
      this.editor.store.loadSnapshot(prevSnapshot);
      this.isRecording = true; // Resume recording
    };
    
    const redoFn = () => {
      this.isRecording = false; // Pause recording to avoid re-triggering
      this.editor.store.loadSnapshot(currentSnapshot);
      this.isRecording = true; // Resume recording
    };
    
    // Push entry to history store
    useHistoryStore.getState().pushEntry({
      origin: historyOrigin,
      description: 'Editor change', // Generic description, can be refined
      snapshot: currentSnapshot,
      undo: undoFn,
      redo: redoFn,
    });
    
    // Update last snapshot
    this.lastSnapshot = currentSnapshot;
  };

  /**
   * Handle undo events from the editor
   * This is triggered when tldraw's internal undo is called (e.g., via UI or shortcut)
   */
  private handleEditorUndo = () => {
    // When the editor performs an undo, we need to update our history state
    // This prevents double-undo issues and keeps our custom history in sync
    const { past, future, currentOrigin } = useHistoryStore.getState();
    
    if (past[currentOrigin].length > 0) {
      // Pop the last entry from our custom history to keep it in sync
      const entry = past[currentOrigin].pop()!;
      future[currentOrigin].push(entry); // Move it to future stack
    }
  };

  /**
   * Handle redo events from the editor
   * This is triggered when tldraw's internal redo is called (e.g., via UI or shortcut)
   */
  private handleEditorRedo = () => {
    // When the editor performs a redo, we need to update our history state
    const { past, future, currentOrigin } = useHistoryStore.getState();
    
    if (future[currentOrigin].length > 0) {
      // Pop the last entry from our custom future to keep it in sync
      const entry = future[currentOrigin].pop()!;
      past[currentOrigin].push(entry); // Move it to past stack
    }
  };

  /**
   * Perform an undo operation for a specific origin
   */
  public undo(origin?: HistoryOrigin) {
    useHistoryStore.getState().undo(origin);
  }

  /**
   * Perform a redo operation for a specific origin
   */
  public redo(origin?: HistoryOrigin) {
    useHistoryStore.getState().redo(origin);
  }

  /**
   * Check if undo is available for a specific origin
   */
  public canUndo(origin?: HistoryOrigin): boolean {
    return useHistoryStore.getState().canUndo(origin);
  }

  /**
   * Check if redo is available for a specific origin
   */
  public canRedo(origin?: HistoryOrigin): boolean {
    return useHistoryStore.getState().canRedo(origin);
  }

  /**
   * Set the current origin for subsequent operations
   */
  public setOrigin(origin: HistoryOrigin) {
    useHistoryStore.getState().setOrigin(origin);
  }

  /**
   * Execute a function with a specific origin
   */
  public withOrigin<T>(origin: HistoryOrigin, fn: () => T): T {
    const previousOrigin = useHistoryStore.getState().currentOrigin;
    this.setOrigin(origin);
    
    try {
      return fn();
    } finally {
      this.setOrigin(previousOrigin);
    }
  }

  /**
   * Temporarily disable history recording
   */
  public pause() {
    this.isRecording = false;
  }

  /**
   * Resume history recording
   */
  public resume() {
    this.isRecording = true;
  }

  /**
   * Execute a function without recording history
   */
  public ignore<T>(fn: () => T): T {
    this.pause();
    try {
      return fn();
    } finally {
      this.resume();
    }
  }

  /**
   * Clean up listeners
   */
  public dispose() {
    if (this.unsubscribeFromStore) {
      this.unsubscribeFromStore();
    }
    this.unsubscribeFromEditorEvents.forEach(unsubscribe => unsubscribe());
    this.unsubscribeFromEditorEvents = [];
  }
}

/**
 * Create a history manager instance
 */
export function createHistoryManager(editor: Editor): HistoryManager {
  return new HistoryManager(editor);
}

/**
 * React hook to use the history manager
 */
export function useHistoryManager(editor?: Editor | null) {
  // If no editor is provided, return the store actions only
  // This allows components that don't directly interact with the editor
  // to still use the history store (e.g., for UI state related to history)
  if (!editor) {
    const store = useHistoryStore();
    return {
      undo: store.undo,
      redo: store.redo,
      canUndo: store.canUndo,
      canRedo: store.canRedo,
      setOrigin: store.setOrigin,
      // Expose other store actions if needed
    };
  }
  
  // Create or get the history manager instance
  const historyManager = React.useMemo(() => {
    return createHistoryManager(editor);
  }, [editor]);
  
  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      historyManager.dispose();
    };
  }, [historyManager]);
  
  return historyManager;
}

// Export everything needed for integration
export default {
  useHistoryStore,
  createHistoryManager,
  useHistoryManager,
};
