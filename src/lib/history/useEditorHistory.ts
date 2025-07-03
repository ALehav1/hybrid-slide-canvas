/**
 * TLDraw Editor History Integration Hook
 * 
 * Connects the multi-origin history manager with TLDraw's editor.
 * Provides seamless integration between TLDraw operations and our custom history system.
 * 
 * Key Features:
 * - Automatic change detection from TLDraw editor
 * - Origin tagging for user vs AI vs template actions
 * - Keyboard shortcut integration (Ctrl+Z, Ctrl+Y, etc.)
 * - Batched operations support
 * - Performance optimization with debouncing
 */

import { useEffect, useCallback, useRef } from 'react';
import { useEditor, type Editor, type TLRecord } from '@tldraw/tldraw';
import { useHistoryStore } from './HistoryManager';
import { logger } from '../utils/logging';
import type { HistoryOrigin } from './types';

/**
 * Configuration for the editor history integration
 */
export interface EditorHistoryConfig {
  /** Whether to enable keyboard shortcuts (default: true) */
  enableKeyboardShortcuts?: boolean;
  
  /** Debounce delay for batching rapid changes (default: 100ms) */
  debounceMs?: number;
  
  /** Default origin for user actions (default: 'user') */
  defaultOrigin?: HistoryOrigin;
  
  /** Whether to track all editor changes (default: true) */
  trackAllChanges?: boolean;
}

/**
 * Context for tracking the current operation origin
 * Used to tag changes with their source (user, AI, template)
 */
interface OperationContext {
  origin: HistoryOrigin;
  description: string;
  metadata?: Record<string, unknown>;
}

/**
 * Hook to integrate TLDraw editor with the history manager
 * @param config - Configuration options
 */
export function useEditorHistory(config: EditorHistoryConfig = {}) {
  const editor = useEditor();
  const historyStore = useHistoryStore();
  
  // Configuration with defaults
  const {
    enableKeyboardShortcuts = true,
    debounceMs = 100,
    defaultOrigin = 'user',
    trackAllChanges = true,
  } = config;
  
  // Track current operation context
  const operationContext = useRef<OperationContext | null>(null);
  
  // Track the previous state for comparison
  const previousState = useRef<TLRecord[]>([]);
  
  // Debounce timer for batching rapid changes
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);
  
  /**
   * Set the origin for the next operation
   * This should be called before making changes that should be attributed to a specific origin
   */
  const setOperationOrigin = useCallback((origin: HistoryOrigin, description: string, metadata?: Record<string, unknown>) => {
    operationContext.current = { origin, description, metadata };
    logger.debug(`Set operation origin: ${origin} - ${description}`);
  }, []);
  
  /**
   * Clear the operation context
   */
  const clearOperationContext = useCallback(() => {
    operationContext.current = null;
  }, []);
  
  /**
   * Execute a function with a specific origin context
   * Automatically sets and clears the operation context
   */
  const executeWithOrigin = useCallback((origin: HistoryOrigin, description: string, operation: () => void, metadata?: Record<string, unknown>) => {
    setOperationOrigin(origin, description, metadata);
    try {
      operation();
    } finally {
      clearOperationContext();
    }
  }, [setOperationOrigin, clearOperationContext]);
  
  /**
   * Create a history entry for the current editor state change
   */
  const createHistoryEntry = useCallback((description: string, origin: HistoryOrigin, beforeState: TLRecord[], afterState: TLRecord[]) => {
    // Create undo/redo functions that restore/apply the state
    const undo = () => {
      if (editor) {
        editor.history.ignore(() => {
          // Restore the previous state
          editor.store.clear();
          editor.store.put(beforeState);
        });
      }
    };
    
    const redo = () => {
      if (editor) {
        editor.history.ignore(() => {
          // Apply the after state
          editor.store.clear();
          editor.store.put(afterState);
        });
      }
    };
    
    // Add to history manager
    historyStore.addEntry({
      origin,
      description,
      undo,
      redo,
      metadata: {
        beforeRecordCount: beforeState.length,
        afterRecordCount: afterState.length,
        editorId: editor?.instanceId,
      },
    });
  }, [editor, historyStore]);
  
  /**
   * Handle editor changes with debouncing
   */
  const handleEditorChange = useCallback(() => {
    if (!editor || !trackAllChanges) return;
    
    // Clear existing debounce timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Set new debounce timer
    debounceTimer.current = setTimeout(() => {
      const currentState = editor.store.allRecords();
      const context = operationContext.current;
      
      // Only create history entry if there are actual changes
      if (JSON.stringify(currentState) !== JSON.stringify(previousState.current)) {
        const origin = context?.origin || defaultOrigin;
        const description = context?.description || 'Editor change';
        
        createHistoryEntry(description, origin, previousState.current, currentState);
        
        // Update previous state
        previousState.current = [...currentState];
      }
      
      // Clear context after use
      clearOperationContext();
    }, debounceMs);
  }, [editor, trackAllChanges, debounceMs, defaultOrigin, createHistoryEntry, clearOperationContext]);
  
  /**
   * Handle keyboard shortcuts for undo/redo
   */
  const handleKeyboardShortcuts = useCallback((event: KeyboardEvent) => {
    if (!enableKeyboardShortcuts) return;
    
    const isCtrlOrCmd = event.ctrlKey || event.metaKey;
    
    if (isCtrlOrCmd && event.key === 'z' && !event.shiftKey) {
      // Ctrl+Z: Undo
      event.preventDefault();
      const success = historyStore.undo();
      if (success) {
        logger.debug('Keyboard shortcut: Undo');
      }
    } else if (isCtrlOrCmd && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
      // Ctrl+Y or Ctrl+Shift+Z: Redo
      event.preventDefault();
      const success = historyStore.redo();
      if (success) {
        logger.debug('Keyboard shortcut: Redo');
      }
    }
  }, [enableKeyboardShortcuts, historyStore]);
  
  /**
   * Undo with optional origin filtering
   */
  const undo = useCallback((origin?: HistoryOrigin) => {
    const success = historyStore.undo(origin);
    if (success) {
      logger.debug(`Undo${origin ? ` (${origin})` : ''} executed`);
    }
    return success;
  }, [historyStore]);
  
  /**
   * Redo with optional origin filtering
   */
  const redo = useCallback((origin?: HistoryOrigin) => {
    const success = historyStore.redo(origin);
    if (success) {
      logger.debug(`Redo${origin ? ` (${origin})` : ''} executed`);
    }
    return success;
  }, [historyStore]);
  
  /**
   * Check if undo is available
   */
  const canUndo = useCallback((origin?: HistoryOrigin) => {
    return historyStore.canUndo(origin);
  }, [historyStore]);
  
  /**
   * Check if redo is available
   */
  const canRedo = useCallback((origin?: HistoryOrigin) => {
    return historyStore.canRedo(origin);
  }, [historyStore]);
  
  // Set up editor change listener
  useEffect(() => {
    if (!editor) return;
    
    // Initialize previous state
    previousState.current = editor.store.allRecords();
    
    // Listen for editor changes
    const unsubscribe = editor.store.listen(handleEditorChange);
    
    return () => {
      unsubscribe();
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [editor, handleEditorChange]);
  
  // Set up keyboard shortcuts
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;
    
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    return () => {
      document.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [enableKeyboardShortcuts, handleKeyboardShortcuts]);
  
  // Return the history interface
  return {
    // History operations
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Origin management
    setOperationOrigin,
    clearOperationContext,
    executeWithOrigin,
    
    // History state
    historyStore,
    
    // Utilities
    clear: historyStore.clear,
    clearByOrigin: historyStore.clearByOrigin,
    setEnabled: historyStore.setEnabled,
    getEntriesByOrigin: historyStore.getEntriesByOrigin,
    getRecentEntries: historyStore.getRecentEntries,
  };
}

/**
 * Helper hook for AI operations
 * Provides a convenient way to execute AI actions with proper origin tagging
 */
export function useAIHistory() {
  const editorHistory = useEditorHistory();
  
  const executeAIAction = useCallback((description: string, action: () => void, metadata?: Record<string, unknown>) => {
    editorHistory.executeWithOrigin('ai', description, action, metadata);
  }, [editorHistory]);
  
  const undoAIActions = useCallback(() => {
    return editorHistory.undo('ai');
  }, [editorHistory]);
  
  const canUndoAIActions = useCallback(() => {
    return editorHistory.canUndo('ai');
  }, [editorHistory]);
  
  const clearAIHistory = useCallback(() => {
    editorHistory.clearByOrigin('ai');
  }, [editorHistory]);
  
  return {
    executeAIAction,
    undoAIActions,
    canUndoAIActions,
    clearAIHistory,
  };
}

/**
 * Helper hook for template operations
 * Provides a convenient way to execute template actions with proper origin tagging
 */
export function useTemplateHistory() {
  const editorHistory = useEditorHistory();
  
  const executeTemplateAction = useCallback((description: string, action: () => void, metadata?: Record<string, unknown>) => {
    editorHistory.executeWithOrigin('template', description, action, metadata);
  }, [editorHistory]);
  
  const undoTemplateActions = useCallback(() => {
    return editorHistory.undo('template');
  }, [editorHistory]);
  
  const canUndoTemplateActions = useCallback(() => {
    return editorHistory.canUndo('template');
  }, [editorHistory]);
  
  const clearTemplateHistory = useCallback(() => {
    editorHistory.clearByOrigin('template');
  }, [editorHistory]);
  
  return {
    executeTemplateAction,
    undoTemplateActions,
    canUndoTemplateActions,
    clearTemplateHistory,
  };
}
