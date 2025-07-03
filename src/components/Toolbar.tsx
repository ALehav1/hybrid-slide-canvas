import React from 'react'
import { useHistoryManager } from '@/lib/history/useHistoryManager'
import { useHistoryStore } from '@/lib/history/useHistoryStore'

export const Toolbar: React.FC = () => {
  // The useHistoryManager hook is responsible for creating and managing the HistoryManager instance.
  // It's tied to the editor's lifecycle via the EditorContext.
  const historyManager = useHistoryManager()

  // We derive the canUndo/canRedo state from the length of the respective stacks.
  // We are only concerned with the 'user' origin for the toolbar buttons.
  const { canUndo, canRedo } = useHistoryStore((state) => ({
    canUndo: state.stacks.user.undo.length > 0,
    canRedo: state.stacks.user.redo.length > 0,
  }))

  const handleUndo = () => {
    historyManager?.undo('user')
  }

  const handleRedo = () => {
    historyManager?.redo('user')
  }

  return (
    <div className="h-11 border-b px-2 flex items-center gap-2 bg-white">
      <button
        data-testid="toolbar-undo-button"
        onClick={handleUndo}
        disabled={!canUndo}
        className="px-2 py-1 border rounded disabled:opacity-50"
      >
        Undo
      </button>
      <button
        data-testid="toolbar-redo-button"
        onClick={handleRedo}
        disabled={!canRedo}
        className="px-2 py-1 border rounded disabled:opacity-50"
      >
        Redo
      </button>
      {/* …other controls… */}
    </div>
  )
}

