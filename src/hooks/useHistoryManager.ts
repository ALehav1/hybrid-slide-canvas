import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react'
import { type Editor } from 'tldraw'
import { HistoryManager } from '@/managers/HistoryManager'
import { useHistoryStore, type OriginType } from '@/state/useHistoryStore'

/**
 * React hook that exposes a stable HistoryManager API
 * while keeping the Toolbar reactive to stack changes.
 */
export function useHistoryManager(editor: Editor | null) {
  /** internal HistoryManager instance */
  const historyMgrRef = useRef<HistoryManager | null>(null)

  /* ----- reactive booleans pulled from Zustand ----- */
  const canUndoGlobal   = useHistoryStore(s => s.canUndo())        /* all */
  const canRedoGlobal   = useHistoryStore(s => s.canRedo())
  const canUndoUser     = useHistoryStore(s => s.canUndo('user'))
  const canRedoUser     = useHistoryStore(s => s.canRedo('user'))
  const canUndoAI       = useHistoryStore(s => s.canUndo('ai'))
  const canRedoAI       = useHistoryStore(s => s.canRedo('ai'))
  const canUndoTemplate = useHistoryStore(s => s.canUndo('template'))
  const canRedoTemplate = useHistoryStore(s => s.canRedo('template'))

  /* -------- stable manager instance -------- */
  const historyMgr = useMemo(() => {
    if (!editor) return null
    return new HistoryManager(editor)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]) // new instance only when editor changes

  /* keep ref up-to-date for callbacks */
  useEffect(() => {
    historyMgrRef.current = historyMgr
  }, [historyMgr])

  /* dispose listeners on unmount OR when instance replaced */
  useEffect(() => {
    return () => historyMgr?.cleanup()
  }, [historyMgr])

  /* -------- stable callbacks exposed to UI -------- */
  const setOrigin = useCallback((o: OriginType) => {
    historyMgrRef.current?.setOrigin(o)
  }, [])

  const undo = useCallback((o?: OriginType) => {
    historyMgrRef.current?.undo(o)
  }, [])

  const redo = useCallback((o?: OriginType) => {
    historyMgrRef.current?.redo(o)
  }, [])

  const withAISquash = useCallback(
    async (fn: () => Promise<void> | void) =>
      historyMgrRef.current?.withAISquash(fn),
    []
  )

  return {
    /* high-level actions */
    setOrigin,
    undo,
    redo,
    withAISquash,

    /* fine-grained reactivity for Toolbar */
    canUndo: {
      all: canUndoGlobal,
      user: canUndoUser,
      ai: canUndoAI,
      template: canUndoTemplate,
    },
    canRedo: {
      all: canRedoGlobal,
      user: canRedoUser,
      ai: canRedoAI,
      template: canRedoTemplate,
    },
  }
}
