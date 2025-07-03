import { type Editor, type HistoryEntry, type TLRecord, isShape } from '@tldraw/tldraw'
import { useHistoryStore } from './useHistoryStore'
import type { HistoryOrigin } from '../types/history'

export class HistoryManager {
  private isApplying = false
  private unsub?: () => void
  currentOrigin: HistoryOrigin = 'user'

  constructor(private editor: Editor) {}

  /* ---------- lifecycle ---------- */
  startTracking = () => {
    this.unsub = this.editor.store.listen(this.onTLChange, { scope: 'document' })
  }
  stopTracking = () => this.unsub?.()

  /* ---------- public API ---------- */
  setOrigin = (o: HistoryOrigin) => {
    this.currentOrigin = o
  }

  async withAISquash<T>(fn: () => Promise<T> | T) {
    const mark = this.editor.markHistoryStoppingPoint()
    const prev = this.currentOrigin
    this.currentOrigin = 'ai'
    try {
      this.isApplying = true
      await fn()
    } finally {
      this.editor.markHistoryStoppingPoint()
      // Note: The method is squashToMark, not store.squash
      this.editor.squashToMark(mark)
      this.isApplying = false
      this.currentOrigin = prev
    }
  }

  undo = (o?: HistoryOrigin) => {
    if (!useHistoryStore.getState().undo(o)) return
    this.isApplying = true
    this.editor.undo()
    this.isApplying = false
  }
  redo = (o?: HistoryOrigin) => {
    if (!useHistoryStore.getState().redo(o)) return
    this.isApplying = true
    this.editor.redo()
    this.isApplying = false
  }

  canUndo = (o?: HistoryOrigin) => useHistoryStore.getState().stacks[o ?? 'all'].undo.length > 0
  canRedo = (o?: HistoryOrigin) => useHistoryStore.getState().stacks[o ?? 'all'].redo.length > 0

  /* ---------- TLDraw listener ---------- */
  private onTLChange = (e: HistoryEntry<TLRecord>) => {
    if (this.isApplying) return

    const newShapes = Object.values(e.changes.added).filter(isShape)
    if (!newShapes.length) return

    // tag without mutating frozen record objects
    const updates = newShapes.map(s => ({
      id: s.id,
      type: s.type,
      meta: { ...s.meta, createdBy: this.currentOrigin },
    }))
    this.editor.updateShapes(updates)

    useHistoryStore.getState().addEntry({
      id: this.editor.markHistoryStoppingPoint(),
      origin: this.currentOrigin,
      timestamp: Date.now(),
    })
  }
}
