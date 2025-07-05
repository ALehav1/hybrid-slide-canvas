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
 * - Performance optimization
 */

import { useCallback } from 'react';
import { useEditor } from '@tldraw/tldraw';
import { useHistoryManager } from './useHistoryManager';
import { type OriginType } from './HistoryManager';
import { logger } from '../utils/logging';

/**
 * Configuration for the editor history integration
 */
export interface EditorHistoryConfig {
  /** Whether to enable keyboard shortcuts (default: true) */
  enableKeyboardShortcuts?: boolean;
  
  /** Default origin for user actions (default: 'user') */
  defaultOrigin?: OriginType;
  
  /** Whether to track all editor changes (default: true) */
  trackAllChanges?: boolean;
}

/**
 * Hook to integrate TLDraw editor with the history manager
 * @param config - Configuration options
 */
export function useEditorHistory(config: EditorHistoryConfig = {}) {
  const editor = useEditor();
  const historyManager = useHistoryManager();
  
  // Configuration with defaults
  const {
    enableKeyboardShortcuts = true,
    defaultOrigin = 'user',
    trackAllChanges = true,
  } = config;
  
  /**
   * Execute a function with a specific origin context
   */
  const withOrigin = useCallback(
    (origin: OriginType, fn: () => void) => {
      if (!editor || !historyManager) return;
      historyManager.withOrigin(origin, fn);
    },
    [editor, historyManager]
  );
  
  /**
   * Execute a function without recording history
   */
  const withoutHistory = useCallback(<T,>(fn: () => T): T => {
    if (!editor || !historyManager) return fn();
    return historyManager.ignore(fn);
  }, [editor, historyManager]);
  
  /**
   * Undo with optional origin filtering
   */
  const undo = useCallback((origin?: OriginType) => {
    if (!editor) return false;
    
    if (!historyManager) return false;
    historyManager.undo(origin);
    logger.debug(`Undo${origin ? ` (${origin})` : ''} executed`);
    return true;
  }, [editor, historyManager]);
  
  /**
   * Redo with optional origin filtering
   */
  const redo = useCallback((origin?: OriginType) => {
    if (!editor) return false;
    
    if (!historyManager) return false;
    historyManager.redo(origin);
    logger.debug(`Redo${origin ? ` (${origin})` : ''} executed`);
    return true;
  }, [editor, historyManager]);
  
  /**
   * Check if undo is available
   */
  const canUndo = useCallback(
    (origin?: OriginType) => historyManager?.canUndo(origin) ?? false,
    [historyManager]
  );
  
  /**
   * Check if redo is available
   */
  const canRedo = useCallback(
    (origin?: OriginType) => historyManager?.canRedo(origin) ?? false,
    [historyManager]
  );
  
  /**
   * Set the current origin for subsequent operations
   */
  const setOrigin = useCallback((origin: OriginType) => {
    historyManager?.setOrigin(origin);
  }, [historyManager]);
  
  /**
   * Pause history recording
   */
  const pauseHistory = useCallback(() => {
    historyManager?.pause();
  }, [historyManager]);
  
  /**
   * Resume history recording
   */
  const resumeHistory = useCallback(() => {
    historyManager?.resume();
  }, [historyManager]);
  
  // Return the history interface
  return {
    // History operations
    undo,
    redo,
    canUndo,
    canRedo,
    
    // Origin management
    withOrigin,
    withoutHistory,
    setOrigin,
    
    // History recording control
    pauseHistory,
    resumeHistory,
    
    // History state
    historyManager,
    
    // Utilities
    clear: (origin?: OriginType) => historyManager?.clearByOrigin?.(origin ?? 'user'),
    setEnabled: (enabled: boolean) => historyManager?.setEnabled(enabled),
  };
}

/**
 * Helper hook for AI operations
 * Provides a convenient way to execute AI actions with proper origin tagging
 */
export function useAIHistory() {
  const { withOrigin, undo, canUndo, clear } = useEditorHistory();
  
  const executeAIAction = useCallback(
    (action: () => void) => withOrigin('ai', action),
    [withOrigin]
  );
  
  const undoAIActions = useCallback(() => {
    return undo('ai');
  }, [undo]);
  
  const canUndoAIActions = useCallback(() => {
    return canUndo('ai');
  }, [canUndo]);
  
  const clearAIHistory = useCallback(() => {
    clear('ai');
  }, [clear]);
  
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
  const { withOrigin, undo, canUndo, clear } = useEditorHistory();
  
  const executeTemplateAction = useCallback(
    (action: () => void) => withOrigin('template', action),
    [withOrigin]
  );
  
  const undoTemplateActions = useCallback(() => {
    return undo('template');
  }, [undo]);
  
  const canUndoTemplateActions = useCallback(() => {
    return canUndo('template');
  }, [canUndo]);
  
  const clearTemplateHistory = useCallback(() => {
    clear('template');
  }, [clear]);
  
  return {
    executeTemplateAction,
    undoTemplateActions,
    canUndoTemplateActions,
    clearTemplateHistory,
  };
}
