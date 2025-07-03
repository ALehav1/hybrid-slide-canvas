import {
  type Editor,
  type HistoryEntry,
  type TLRecord,
  isShape,
} from 'tldraw'
import { useHistoryStore, type OriginType } from '@/state/useHistoryStore'

/**
 * Minimal wrapper that:
 *  • tags each TLDraw shape / change with createdBy
 *  • groups AI edits into one undo step (mark + squash)
 *  • delegates ordinary undo / redo back to TLDraw
 */
export class HistoryManager {
  private editor: Editor
  private currentOrigin: OriginType = 'user'
  private isApplying = false
  private unsubscribe: () => void

  constructor(editor: Editor) {
    this.editor = editor

    /* listen to every store mutation from TLDraw */
    this.unsubscribe = editor.store.listen(this.onTLChange, {
      scope: 'document',
    })
  }

  /* ---------- public API ---------- */

  setOrigin(origin: OriginType) {
    this.currentOrigin = origin
  }

  /** groups AI edits into a single history entry */
  async withAISquash<T>(fn: () => Promise<T> | T): Promise<T | undefined> {
    const mark = this.editor.markHistoryStoppingPoint(
      `ai-begin-${crypto.randomUUID()}`
    )
    const prevOrigin = this.currentOrigin
    this.currentOrigin = 'ai'

    const res = await fn()

    this.editor.markHistoryStoppingPoint()
    this.editor.squashToMark(mark)

    this.currentOrigin = prevOrigin
    return res
  }

  undo(origin?: OriginType) {
    useHistoryStore.getState().undo(origin) /* external slice */
    this.editor.undo()                      /* TLDraw stack   */
  }

  redo(origin?: OriginType) {
    useHistoryStore.getState().redo(origin)
    this.editor.redo()
  }

  canUndo(origin?: OriginType) {
    return useHistoryStore.getState().canUndo(origin)
  }
  canRedo(origin?: OriginType) {
    return useHistoryStore.getState().canRedo(origin)
  }

  cleanup() {
    this.unsubscribe?.()
  }

  /* ---------- internal change handler ---------- */

  /** fires for every TLDraw mutation */
  private onTLChange = (entry: HistoryEntry<TLRecord>) => {
    if (this.isApplying) return

    // We only care about shape-level changes
    const { added, removed, updated } = entry.changes
    if (
      !Object.keys(added).length &&
      !Object.keys(removed).length &&
      !Object.keys(updated).length
    )
      return

    // Tag new shapes with origin
    Object.values(added).forEach((rec) => {
      if (isShape(rec)) {
        rec.meta = { ...rec.meta, createdBy: this.currentOrigin }
      }
    })

    // create external entry
    useHistoryStore.getState().execute({
      origin: this.currentOrigin,
      action: 'tldraw_change',
      data: { changes: entry.changes },
      canUndo: true,
    })
  }
}
