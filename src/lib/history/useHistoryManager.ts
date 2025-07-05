/**
 * Expert-recommended History Manager for tldraw v3
 * 
 * This hook implements the production-proven pattern for multi-origin history management:
 * - Uses tldraw's built-in history as single source of truth
 * - Listens for 'origin-mark' events emitted by withOrigin() helper
 * - Maintains lightweight bookmark store (no functions, no snapshots)
 * - Provides simple undo/redo via editor.bailToMark()
 */

import { useContext, useEffect, useRef } from 'react'
import { EditorContext } from '@/lib/tldraw/EditorContext'
import { HistoryManager, type HistoryStore, type OriginType } from './HistoryManager'

/**
 * Hook that wires the editor to the new expert history store pattern.
 * Returns the history store instance for the current editor.
 */
export function useHistoryManager(): HistoryManager | null {
  const editor = useContext(EditorContext)
  const managerRef = useRef<HistoryManager | null>(null)

  useEffect(() => {
    if (!editor) return

    // Create a bare-minimum in-memory store that satisfies HistoryStore
    const emptyStore: HistoryStore = {
      entries: [],
      currentIndex: -1,
      isUndoing: false,
      isRedoing: false,
      addEntry: () => {},
      undo: () => false,
      redo: () => false,
      clear: () => {},
      clearByOrigin: () => {},
      getEntriesByOrigin: () => [],
      canUndo: () => false,
      canRedo: () => false,
      setEnabled: () => {},
      getRecentEntries: () => [],
      setOrigin: () => {},
      /* new state fields introduced in updated HistoryStore */
      isEnabled: true,
      maxEntries: 100,
      stats: {
        totalEntries: 0,
        undoCount: 0,
        redoCount: 0,
        lastActionTime: null,
      },
    }

    const manager = new HistoryManager(emptyStore)
    manager.setEditor(editor)
    managerRef.current = manager

    // Cleanup on unmount
    return () => {
      manager.dispose()
      managerRef.current = null
    }
  }, [editor])

  return managerRef.current
}

/**
 * Hook that provides the history state and actions from the current editor's history store.
 * This is a convenience hook for components that need to interact with history.
 */
export function useHistoryState() {
  const mgr = useHistoryManager()
  return mgr ? mgr.getState() : null
}

/**
 * Hook that provides access to history actions (undo/redo/clear).
 * This is the primary interface for components that need to trigger history operations.
 */
export function useHistoryActions() {
  const manager = useHistoryManager()
  
  if (!manager) {
    return {
      undo: () => false,
      redo: () => false,
      clear: () => {},
      canUndo: () => false,
      canRedo: () => false,
    }
  }
  
  return {
    undo: (origin?: OriginType) => manager.undo(origin),
    redo: (origin?: OriginType) => manager.redo(origin),
    clear: () => manager.clear(),
    canUndo: (origin?: OriginType) => manager.canUndo(origin),
    canRedo: (origin?: OriginType) => manager.canRedo(origin),
  }
}
